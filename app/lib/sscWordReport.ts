import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  ImageRun,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type { LocalRecord } from "@/app/types";

type ZoneKey = "nationalPublic" | "nationalSterile" | "internationalPublic" | "internationalSterile";
type StatusKey = "leased" | "inProcess" | "available";
type StatusCounts = Record<StatusKey, number>;
type ZoneCounts = Record<ZoneKey, StatusCounts>;

export type ReportRow = {
  level: string;
  zones: ZoneCounts;
};

export type ReportMatrix = {
  rows: ReportRow[];
  totals: ZoneCounts;
  sourceTotal: number;
  classifiedTotal: number;
  unclassifiedTotal: number;
};

export const REPORT_TITLE = "Distribución y Estatus de Espacios Comerciales por Nivel y Tipo de Área (SSC)";

const ZONES: ZoneKey[] = ["nationalPublic", "nationalSterile", "internationalPublic", "internationalSterile"];
const ZONE_LABELS: Record<ZoneKey, { zone: "Nacional" | "Internacional"; area: "Pública" | "Estéril" }> = {
  nationalPublic: { zone: "Nacional", area: "Pública" },
  nationalSterile: { zone: "Nacional", area: "Estéril" },
  internationalPublic: { zone: "Internacional", area: "Pública" },
  internationalSterile: { zone: "Internacional", area: "Estéril" },
};
function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX");
}

function emptyStatusCounts(): StatusCounts {
  return { leased: 0, inProcess: 0, available: 0 };
}

function emptyZoneCounts(): ZoneCounts {
  return {
    nationalPublic: emptyStatusCounts(),
    nationalSterile: emptyStatusCounts(),
    internationalPublic: emptyStatusCounts(),
    internationalSterile: emptyStatusCounts(),
  };
}

function classifyZone(record: LocalRecord): ZoneKey | null {
  const searchable = normalize([record.lado, record.area, record.modulo, record.nomenclatura].join(" "));
  const market = searchable.includes("internacional")
    ? "international"
    : searchable.includes("nacional")
      ? "national"
      : null;
  const area = searchable.includes("esteril")
    ? "sterile"
    : searchable.includes("public")
      ? "public"
      : null;
  if (!market || !area) return null;
  if (market === "national") return area === "public" ? "nationalPublic" : "nationalSterile";
  return area === "public" ? "internationalPublic" : "internationalSterile";
}

function classifyStatus(status: string): StatusKey {
  const normalized = normalize(status);
  if (normalized.includes("disponible")) return "available";
  if (normalized.includes("proceso") && normalized.includes("asignacion")) return "inProcess";
  return "leased";
}

function levelLabel(level: LocalRecord["nivel"]) {
  const raw = String(level ?? "Sin nivel").trim();
  if (!raw) return "Sin nivel";
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : raw;
}

function sumStatus(counts: StatusCounts) {
  return counts.leased + counts.inProcess + counts.available;
}

function sumZones(zones: ZoneCounts) {
  return ZONES.reduce((total, zone) => total + sumStatus(zones[zone]), 0);
}

export function buildSscReportMatrix(records: LocalRecord[]): ReportMatrix {
  const rowMap = new Map<string, ZoneCounts>();
  const totals = emptyZoneCounts();
  let classifiedTotal = 0;

  records.forEach((record) => {
    const zone = classifyZone(record);
    if (!zone) return;
    const status = classifyStatus(record.estatus);
    const level = levelLabel(record.nivel);
    const row = rowMap.get(level) ?? emptyZoneCounts();
    row[zone][status] += 1;
    totals[zone][status] += 1;
    rowMap.set(level, row);
    classifiedTotal += 1;
  });

  const rows = [...rowMap.entries()]
    .map(([level, zones]) => ({ level, zones }))
    .sort((left, right) => {
      const leftNumber = Number(left.level);
      const rightNumber = Number(right.level);
      if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber;
      if (Number.isFinite(leftNumber)) return -1;
      if (Number.isFinite(rightNumber)) return 1;
      return left.level.localeCompare(right.level, "es", { numeric: true });
    });

  return {
    rows,
    totals,
    sourceTotal: records.length,
    classifiedTotal,
    unclassifiedTotal: records.length - classifiedTotal,
  };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function percentage(value: number, total: number) {
  return total ? new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 1 }).format(value / total) : "0 %";
}

function joinSpanish(values: string[]) {
  if (values.length < 2) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} y ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} y ${values.at(-1)}`;
}

export function buildReportNarrative(matrix: ReportMatrix) {
  if (!matrix.classifiedTotal) {
    return {
      analysis: ["No fue posible generar la interpretación porque los registros no contienen una combinación reconocible de zona (Nacional o Internacional) y tipo de área (Pública o Estéril)."],
      actions: ["Revisar la clasificación de zona, nivel y tipo de área antes de emitir recomendaciones."],
    };
  }
  const levelTotals = matrix.rows.map((row) => ({ level: row.level, total: sumZones(row.zones) }));
  const dominantLevel = [...levelTotals].sort((a, b) => b.total - a.total)[0];
  const minimumLevelTotal = Math.min(...levelTotals.map(({ total }) => total));
  const minimumLevels = levelTotals.filter(({ total }) => total === minimumLevelTotal);
  const leased = ZONES.reduce((total, zone) => total + matrix.totals[zone].leased, 0);
  const inProcess = ZONES.reduce((total, zone) => total + matrix.totals[zone].inProcess, 0);
  const available = ZONES.reduce((total, zone) => total + matrix.totals[zone].available, 0);
  const national = sumStatus(matrix.totals.nationalPublic) + sumStatus(matrix.totals.nationalSterile);
  const international = sumStatus(matrix.totals.internationalPublic) + sumStatus(matrix.totals.internationalSterile);
  const nationalLeased = matrix.totals.nationalPublic.leased + matrix.totals.nationalSterile.leased;
  const internationalLeased = matrix.totals.internationalPublic.leased + matrix.totals.internationalSterile.leased;
  const nationalInProcess = matrix.totals.nationalPublic.inProcess + matrix.totals.nationalSterile.inProcess;
  const internationalInProcess = matrix.totals.internationalPublic.inProcess + matrix.totals.internationalSterile.inProcess;
  const nationalAvailable = matrix.totals.nationalPublic.available + matrix.totals.nationalSterile.available;
  const internationalAvailable = matrix.totals.internationalPublic.available + matrix.totals.internationalSterile.available;
  const availabilityCells = matrix.rows.flatMap((row) => ZONES.map((zone) => ({
    level: row.level,
    zone,
    available: row.zones[zone].available,
  })));
  const maximumAvailable = Math.max(...availabilityCells.map(({ available: count }) => count));
  const focusCells = availabilityCells.filter(({ available: count }) => count === maximumAvailable);
  const focusLabels = focusCells.map(({ level, zone }) => {
    const label = ZONE_LABELS[zone];
    return `Zona ${label.zone}, nivel ${level}, área ${label.area}`;
  });
  const classificationNote = matrix.unclassifiedTotal
    ? ` ${matrix.unclassifiedTotal} registro(s) sin clasificación completa quedaron fuera de la matriz.`
    : " La matriz incluye todos los registros SSC cargados.";

  const analysis = [
    `Salud general: ${leased} de ${matrix.classifiedTotal} espacios están arrendados; la ocupación global es ${percentage(leased, matrix.classifiedTotal)}. Además, ${inProcess} están en proceso de asignación y ${available} disponibles.${classificationNote}`,
    `Concentración: el nivel ${dominantLevel.level} agrupa ${dominantLevel.total} espacios, equivalentes a ${percentage(dominantLevel.total, matrix.classifiedTotal)} del total general clasificado.`,
    `Comparativa de zonas: la Zona Nacional suma ${national} espacios (${percentage(national, matrix.classifiedTotal)}) y registra ${nationalLeased} arrendados (${percentage(nationalLeased, national)}), ${nationalInProcess} en proceso y ${nationalAvailable} disponibles. La Zona Internacional suma ${international} espacios (${percentage(international, matrix.classifiedTotal)}) y registra ${internationalLeased} arrendados (${percentage(internationalLeased, international)}), ${internationalInProcess} en proceso y ${internationalAvailable} disponibles.`,
    maximumAvailable > 0
      ? `Foco rojo: ${joinSpanish(focusLabels)} ${focusLabels.length === 1 ? "concentra" : "empatan como focos de mayor concentración, con"} ${maximumAvailable} local(es) disponible(s).`
      : "Foco rojo: ninguna combinación de zona, nivel y tipo de área registra locales disponibles.",
  ];

  const actions = [
    ...(inProcess > 0
      ? [`Gestión Operativa: agilizar la revisión y autorización de los ${inProcess} locales en proceso de asignación para destrabar cuellos de botella y elevar la ocupación global.`]
      : []),
    ...(maximumAvailable > 0
      ? [`Estrategia Comercial: aplicar una matriz BCG cruzada con el flujo de pasajeros en ${joinSpanish(focusLabels)} para evaluar ajustes en los giros permitidos, incentivos y rediseño de la oferta sobre los ${maximumAvailable} locales disponibles detectados.`]
      : []),
    `Optimización de Espacios: aplicar el modelo SCAMPER en ${joinSpanish(minimumLevels.map(({ level }) => `el nivel ${level}`))}, ${minimumLevels.length === 1 ? "que concentra" : "que concentran"} la menor cantidad de locales (${minimumLevelTotal} por nivel), para evaluar reestructuración, integración de espacios o una nueva segmentación del layout.`,
  ];

  return { analysis, actions };
}

export function buildSscWordDocument(matrix: ReportMatrix, logoData: Uint8Array, now: Date) {
  const narrative = buildReportNarrative(matrix);
  const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: "A8AFB4" };
  const noBorder = { style: BorderStyle.NIL, size: 0, color: "FFFFFF" };
  const allBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

  const textCell = (text: string | number, options: {
    width: number;
    fill?: string;
    color?: string;
    bold?: boolean;
    size?: number;
    rowSpan?: number;
    columnSpan?: number;
    borders?: typeof allBorders;
  }) => new TableCell({
    width: { size: options.width, type: WidthType.DXA },
    rowSpan: options.rowSpan,
    columnSpan: options.columnSpan,
    shading: options.fill ? { type: ShadingType.CLEAR, color: "auto", fill: options.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 85, bottom: 85, left: 70, right: 70 },
    borders: options.borders ?? allBorders,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0, line: 220 },
      children: [new TextRun({
        text: String(text),
        font: "Arial",
        size: options.size ?? 15,
        bold: options.bold,
        color: options.color ?? "111111",
      })],
    })],
  });

  const matrixColumnWidths = [960, 1050, 1050, 1050, 1050, 1050, 1050, 1050, 1050];
  const statusCells = (counts: StatusCounts, totalBlock = false) => [
    textCell(counts.leased, { width: 1050, fill: totalBlock ? "EFEAE2" : "F8F6F1", size: 14 }),
    textCell(counts.inProcess, { width: 1050, fill: totalBlock ? "EFEAE2" : "F8F6F1", size: 14 }),
    textCell(counts.available, { width: 1050, fill: totalBlock ? "EFEAE2" : "F8F6F1", size: 14 }),
    textCell(sumStatus(counts), { width: 1050, fill: totalBlock ? "DDD4C6" : "F2EEE7", bold: true, size: 14 }),
  ];

  const marketTable = (market: "Nacional" | "Internacional", publicZone: ZoneKey, sterileZone: ZoneKey) => {
    const dataRows = matrix.rows.map((row) => new TableRow({
      cantSplit: true,
      children: [
        textCell(row.level, { width: 960, fill: "F8F6F1", bold: true, size: 14 }),
        ...statusCells(row.zones[publicZone]),
        ...statusCells(row.zones[sterileZone]),
      ],
    }));

    return new Table({
      width: { size: 9360, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: matrixColumnWidths,
      rows: [
        new TableRow({
          tableHeader: true,
          cantSplit: true,
          children: [
            textCell("Nivel", { width: 960, rowSpan: 3, fill: "CDB28D", bold: true, size: 14 }),
            textCell(market, { width: 8400, columnSpan: 8, fill: "CDB28D", bold: true, size: 16 }),
          ],
        }),
        new TableRow({
          tableHeader: true,
          cantSplit: true,
          children: [
            textCell("Pública", { width: 4200, columnSpan: 4, fill: "315B24", color: "FFFFFF", bold: true, size: 14 }),
            textCell("Estéril", { width: 4200, columnSpan: 4, fill: "8C3B09", color: "FFFFFF", bold: true, size: 14 }),
          ],
        }),
        new TableRow({
          tableHeader: true,
          cantSplit: true,
          children: [
            textCell("Arrendados", { width: 1050, fill: "E1ECD8", bold: true, size: 11 }),
            textCell("En proceso de asignación", { width: 1050, fill: "E1ECD8", bold: true, size: 10 }),
            textCell("Disponibles", { width: 1050, fill: "E1ECD8", bold: true, size: 11 }),
            textCell("Total", { width: 1050, fill: "E1ECD8", bold: true, size: 11 }),
            textCell("Arrendados", { width: 1050, fill: "F6CCAF", bold: true, size: 11 }),
            textCell("En proceso de asignación", { width: 1050, fill: "F6CCAF", bold: true, size: 10 }),
            textCell("Disponibles", { width: 1050, fill: "F6CCAF", bold: true, size: 11 }),
            textCell("Total", { width: 1050, fill: "F6CCAF", bold: true, size: 11 }),
          ],
        }),
        ...dataRows,
        new TableRow({
          cantSplit: true,
          children: [
            textCell("Total", { width: 960, fill: "CDB28D", bold: true, size: 14 }),
            ...statusCells(matrix.totals[publicZone], true),
            ...statusCells(matrix.totals[sterileZone], true),
          ],
        }),
      ],
    });
  };

  const levelSummaryRows = matrix.rows.map((row) => {
    const total = sumZones(row.zones);
    return new TableRow({
      cantSplit: true,
      children: [
        textCell(row.level, { width: 1600, fill: "F8F6F1", bold: true, size: 14 }),
        textCell(total, { width: 2200, fill: "F8F6F1", size: 14 }),
        textCell(percentage(total, matrix.classifiedTotal), { width: 1800, fill: "F8F6F1", size: 14 }),
      ],
    });
  });

  const levelSummaryTable = new Table({
    width: { size: 5600, type: WidthType.DXA },
    alignment: AlignmentType.CENTER,
    layout: TableLayoutType.FIXED,
    columnWidths: [1600, 2200, 1800],
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: [
          textCell("Nivel", { width: 1600, fill: "CDB28D", bold: true, size: 14 }),
          textCell("Espacios comerciales", { width: 2200, fill: "CDB28D", bold: true, size: 13 }),
          textCell("Porcentaje", { width: 1800, fill: "CDB28D", bold: true, size: 13 }),
        ],
      }),
      ...levelSummaryRows,
      new TableRow({
        cantSplit: true,
        children: [
          textCell("Total", { width: 1600, fill: "A90000", color: "FFFFFF", bold: true, size: 14 }),
          textCell(matrix.classifiedTotal, { width: 2200, fill: "A90000", color: "FFFFFF", bold: true, size: 14 }),
          textCell(percentage(matrix.classifiedTotal, matrix.classifiedTotal), { width: 1800, fill: "A90000", color: "FFFFFF", bold: true, size: 14 }),
        ],
      }),
    ],
  });

  const header = new Header({
    children: [new Table({
      width: { size: 9360, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [2500, 3500, 3360],
      rows: [new TableRow({
        children: [
          new TableCell({
            width: { size: 2500, type: WidthType.DXA },
            borders: noBorders,
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { after: 0 },
              children: [new ImageRun({ data: logoData, type: "png", transformation: { width: 142, height: 80 }, altText: { title: "AIFA", description: "Logotipo del Aeropuerto Internacional Felipe Ángeles", name: "AIFA" } })],
            })],
          }),
          new TableCell({
            width: { size: 3500, type: WidthType.DXA },
            borders: noBorders,
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 0, line: 210 },
              children: [new TextRun({ text: "“2026, Año de Margarita Maza Parada”", font: "Arial", size: 18, bold: true, color: "111111" })],
            })],
          }),
          new TableCell({
            width: { size: 3360, type: WidthType.DXA },
            borders: noBorders,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              "Dirección Com. y de Servicios",
              "Sub. de Servicios Comerciales",
              "Grupo de Inteligencia y Análisis",
              "Comercial",
            ].map((line) => new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { before: 0, after: 0, line: 190 },
              children: [new TextRun({ text: line, font: "Arial", size: 18, bold: true, color: "111111" })],
            })),
          }),
        ],
      })],
    })],
  });

  const signatureCell = (role: string, name: string, position: string) => new TableCell({
    width: { size: 4680, type: WidthType.DXA },
    borders: noBorders,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 250 }, children: [new TextRun({ text: role, font: "Arial", size: 16, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 30 }, children: [new TextRun({ text: "____________________________", font: "Arial", size: 16 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [new TextRun({ text: name, font: "Arial", size: 15, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: position, font: "Arial", size: 13 })] }),
    ],
  });

  return new Document({
    creator: "SIGCO (Sistema Integral de Gestión Comercial y Operativa)",
    title: REPORT_TITLE,
    description: "Reporte administrativo vertical de distribución y estatus de espacios comerciales SSC.",
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 18, color: "111111" },
          paragraph: { spacing: { after: 120, line: 260 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { orientation: PageOrientation.PORTRAIT, width: 12240, height: 15840 },
          margin: { top: 1600, right: 1134, bottom: 1100, left: 1134, header: 320, footer: 360 },
        },
      },
      headers: { default: header },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 70, after: 150, line: 260 },
          children: [new TextRun({ text: REPORT_TITLE, font: "Arial", size: 21, bold: true, color: "122E3B" })],
        }),
        new Paragraph({
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: "Tabla 1. Distribución de espacios comerciales SSC", font: "Arial", size: 15, bold: true, color: "6F1131" })],
        }),
        marketTable("Nacional", "nationalPublic", "nationalSterile"),
        new Paragraph({ spacing: { before: 0, after: 70 }, children: [] }),
        marketTable("Internacional", "internationalPublic", "internationalSterile"),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 110, after: 55 },
          children: [new TextRun({ text: "Distribución total por nivel", font: "Arial", size: 16, bold: true, color: "6F1131" })],
        }),
        levelSummaryTable,
        new Paragraph({
          spacing: { before: 80, after: 80, line: 220 },
          children: [new TextRun({
            text: "Criterio de consolidación: Arrendados agrupa los estatus En funcionamiento, Formalizado y En adaptación; los estatus Disponible y En proceso de asignación se presentan por separado.",
            font: "Arial",
            size: 13,
            italics: true,
            color: "5E6970",
          })],
        }),
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [new TextRun({ text: "Análisis Interpretativo", font: "Arial", size: 18, bold: true, color: "6F1131" })],
        }),
        ...narrative.analysis.map((text) => new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 75, line: 250 },
          children: [new TextRun({ text, font: "Arial", size: 17 })],
        })),
        new Paragraph({
          spacing: { before: 90, after: 60 },
          children: [new TextRun({ text: "Acciones Recomendadas", font: "Arial", size: 18, bold: true, color: "6F1131" })],
        }),
        ...narrative.actions.map((text) => new Paragraph({
          bullet: { level: 0 },
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 75, line: 250 },
          children: [new TextRun({ text, font: "Arial", size: 17 })],
        })),
        new Paragraph({
          spacing: { before: 70, after: 25 },
          children: [
            new TextRun({ text: "Generado por: ", font: "Arial", size: 16 }),
            new TextRun({ text: "SIGCO", font: "Arial", size: 16, bold: true, color: "6F1131" }),
            new TextRun({ text: " (Sistema Integral de Gestión Comercial y Operativa)", font: "Arial", size: 16 }),
          ],
        }),
        new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: `Fecha de corte: ${formatDate(now)}`, font: "Arial", size: 16 })] }),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          layout: TableLayoutType.FIXED,
          columnWidths: [4680, 4680],
          rows: [new TableRow({
            cantSplit: true,
            children: [
              signatureCell("Emitió:", "Joel Mejia Guevara", "Auxiliar Administrativo"),
              signatureCell("Autorizó:", "Eduardo Arturo Alvarado Espinosa", "Especialista en Atención a Usuarios"),
            ],
          })],
        }),
      ],
    }],
  });
}
