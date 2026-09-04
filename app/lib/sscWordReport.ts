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
import { locationOptions, type LocalRecord } from "@/app/types";
import { buildContracts, type ContractAggregate } from "@/app/components/ContractCenter";

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
export const REPORT_TITLE_CONTRACT_TIMELINE = "Cronograma y Alertas de Vencimientos Contractuales (Horizonte 30/60/90 Días)";



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

function getSscZone(r: LocalRecord): string {
  if (r.locationId === "etp" || r.contractLocationId === "etp") return "ETP";
  if (r.locationId === "parque-santa-lucia" || r.contractLocationId === "parque-santa-lucia") return "Parque Santa Lucía";
  if (r.locationId === "carga-aduana" || r.contractLocationId === "carga-aduana") return "Edificio de Servicios";
  if (r.locationId === "autobuses-plaza" || r.contractLocationId === "autobuses-plaza") return "Terminal Intermodal de Transportación Terrestre";
  if (r.locationId === "parque-revolucion" || r.contractLocationId === "parque-revolucion") return "Parque Revolución";
  if (r.locationId === "ciudad-aeroportuaria" || r.contractLocationId === "ciudad-aeroportuaria") return "Ciudad Aeroportuaria";
  if (r.locationId === "calzada-mamuts" || r.contractLocationId === "calzada-mamuts") return "Calzada de los Mamuts";

  const raw = normalize([
    r.contractLocationName,
    r.zonaComercial,
    r.area,
    r.nomenclatura,
  ].filter(Boolean).join(" "));

  if (raw.includes("etp")) {
    return "ETP";
  }
  if (raw.includes("santa lucia") || raw.includes("centro comercial")) {
    return "Parque Santa Lucía";
  }
  if (raw.includes("servicio") || raw.includes("carga") || raw.includes("aduana")) {
    return "Edificio de Servicios";
  }
  if (raw.includes("titt") || raw.includes("intermodal") || raw.includes("transportac") || raw.includes("autobus") || raw.includes("plaza mexicana")) {
    return "Terminal Intermodal de Transportación Terrestre";
  }
  if (raw.includes("revoluc") || raw.includes("glorieta") || raw.includes("felipe angeles")) {
    return "Parque Revolución";
  }
  if (raw.includes("ciudad aeroportuaria") || raw.includes("aeroportuaria")) {
    return "Ciudad Aeroportuaria";
  }
  if (raw.includes("mamut") || raw.includes("mexiquense") || raw.includes("circuito") || raw.includes("calzada")) {
    return "Calzada de los Mamuts";
  }
  return "ETP";
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
              children: logoData.length > 0 ? [new ImageRun({ data: logoData, type: "png", transformation: { width: 142, height: 80 }, altText: { title: "AIFA", description: "Logotipo del Aeropuerto Internacional Felipe Ángeles", name: "AIFA" } })] : [new TextRun({ text: "AIFA", font: "Arial", size: 16, bold: true, color: "6F1131" })],
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

export const REPORT_TITLE_AVAILABLE = "Reporte de Locales Comerciales Disponibles por Zona Comercial";

export function buildAvailableLocalesWordDocument(allRecords: LocalRecord[], logoData: Uint8Array, now: Date) {
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
    borders?: typeof allBorders;
  }) => new TableCell({
    width: { size: options.width, type: WidthType.DXA },
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
        size: options.size ?? 14,
        bold: options.bold,
        color: options.color ?? "111111",
      })],
    })],
  });

  const zoneNames = [
    "ETP",
    "Parque Santa Lucía",
    "Edificio de Servicios",
    "Terminal Intermodal de Transportación Terrestre",
    "Parque Revolución",
    "Ciudad Aeroportuaria",
    "Calzada de los Mamuts",
  ];

  type AvailableZoneData = {
    total: number;
    occupied: number;
    inProcess: number;
    available: number;
    noContractTotal: number;
    vacantArea: number;
  };

  const zoneMap = new Map<string, AvailableZoneData>();
  zoneNames.forEach((z) => zoneMap.set(z, { total: 0, occupied: 0, inProcess: 0, available: 0, noContractTotal: 0, vacantArea: 0 }));

  let grandTotal = 0;
  let grandOccupied = 0;
  let grandInProcess = 0;
  let grandAvailable = 0;
  let grandNoContractTotal = 0;
  let grandVacantArea = 0;

  allRecords.forEach((r) => {
    const zoneName = getSscZone(r);
    let data = zoneMap.get(zoneName);
    if (!data) {
      data = { total: 0, occupied: 0, inProcess: 0, available: 0, noContractTotal: 0, vacantArea: 0 };
      zoneMap.set(zoneName, data);
    }

    const rawStatus = String(r.estatus ?? r.operationalStatus ?? r.situacion ?? "").trim();
    const statusNorm = normalize(rawStatus);

    const isOccupied = rawStatus === "EN FUNCIONAMIENTO" || rawStatus === "FORMALIZADO" || rawStatus === "EN ADAPTACION" || statusNorm.includes("funcion") || statusNorm.includes("formaliz") || statusNorm.includes("adaptac");
    const isInProcess = rawStatus === "EN PROCESO DE ASIGNACION" || (statusNorm.includes("proceso") && statusNorm.includes("asignac"));
    const isAvailable = rawStatus === "DISPONIBLE" || statusNorm.includes("disponib") || statusNorm.includes("vacant");

    const area = typeof r.metraje === "number" && r.metraje > 0 ? r.metraje : 0;

    data.total += 1;
    grandTotal += 1;

    if (isOccupied) {
      data.occupied += 1;
      grandOccupied += 1;
    } else if (isInProcess) {
      data.inProcess += 1;
      data.noContractTotal += 1;
      data.vacantArea += area;
      grandInProcess += 1;
      grandNoContractTotal += 1;
      grandVacantArea += area;
    } else if (isAvailable) {
      data.available += 1;
      data.noContractTotal += 1;
      data.vacantArea += area;
      grandAvailable += 1;
      grandNoContractTotal += 1;
      grandVacantArea += area;
    } else {
      // Default to occupied
      data.occupied += 1;
      grandOccupied += 1;
    }
  });

  const zoneRows = Array.from(zoneMap.entries()).map(([zoneName, data]) => {
    return new TableRow({
      cantSplit: true,
      children: [
        textCell(zoneName, { width: 2300, fill: "F8F6F1", bold: true, size: 12 }),
        textCell(data.total, { width: 1000, fill: "F8F6F1", size: 12 }),
        textCell(data.occupied, { width: 1100, fill: "F8F6F1", size: 12 }),
        textCell(data.inProcess, { width: 1200, fill: "F8F6F1", size: 12, color: "111111" }),
        textCell(data.available, { width: 1200, fill: "F8F6F1", bold: true, size: 12, color: "941838" }),
        textCell(data.noContractTotal, { width: 1200, fill: "F2EEE7", bold: true, size: 12, color: "941838" }),
        textCell(`${data.vacantArea.toFixed(2)} m²`, { width: 1360, fill: "F8F6F1", size: 12 }),
      ],
    });
  });

  const zoneTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [2300, 1000, 1100, 1200, 1200, 1200, 1360],
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: [
          textCell("Zona Comercial", { width: 2300, fill: "CDB28D", bold: true, size: 12 }),
          textCell("Totales", { width: 1000, fill: "CDB28D", bold: true, size: 12 }),
          textCell("Arrendados", { width: 1100, fill: "CDB28D", bold: true, size: 12 }),
          textCell("En Proceso", { width: 1200, fill: "CDB28D", bold: true, size: 12 }),
          textCell("Disponibles", { width: 1200, fill: "CDB28D", bold: true, size: 12 }),
          textCell("Vacantes", { width: 1200, fill: "CDB28D", bold: true, size: 12 }),
          textCell("M² Vacantes", { width: 1360, fill: "CDB28D", bold: true, size: 12 }),
        ],
      }),
      ...zoneRows,
      new TableRow({
        cantSplit: true,
        children: [
          textCell("Total Consolidado", { width: 2300, fill: "6F1131", color: "FFFFFF", bold: true, size: 13 }),
          textCell(grandTotal, { width: 1000, fill: "EFEAE2", bold: true, size: 13 }),
          textCell(grandOccupied, { width: 1100, fill: "EFEAE2", bold: true, size: 13 }),
          textCell(grandInProcess, { width: 1200, fill: "EFEAE2", bold: true, size: 13 }),
          textCell(grandAvailable, { width: 1200, fill: "EFEAE2", bold: true, size: 13, color: "941838" }),
          textCell(grandNoContractTotal, { width: 1200, fill: "DDD4C6", bold: true, size: 13, color: "941838" }),
          textCell(`${grandVacantArea.toFixed(2)} m²`, { width: 1360, fill: "EFEAE2", bold: true, size: 13 }),
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
            children: logoData.length > 0 ? [new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { after: 0 },
              children: [new ImageRun({ data: logoData, type: "png", transformation: { width: 142, height: 80 }, altText: { title: "AIFA", description: "Logotipo del Aeropuerto Internacional Felipe Ángeles", name: "AIFA" } })],
            })] : [new Paragraph({ children: [new TextRun({ text: "AIFA", font: "Arial", size: 16, bold: true, color: "6F1131" })] })],
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
    title: REPORT_TITLE_AVAILABLE,
    description: "Reporte de locales comerciales disponibles por zona comercial.",
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
          children: [new TextRun({ text: REPORT_TITLE_AVAILABLE, font: "Arial", size: 21, bold: true, color: "122E3B" })],
        }),
        new Paragraph({
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: "Tabla 1. Resumen de disponibilidad por zona comercial", font: "Arial", size: 15, bold: true, color: "6F1131" })],
        }),
        zoneTable,
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [new TextRun({ text: "Estrategia y Recomendaciones de Comercialización", font: "Arial", size: 18, bold: true, color: "6F1131" })],
        }),
        new Paragraph({
          bullet: { level: 0 },
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 75, line: 250 },
          children: [new TextRun({ text: `Priorizar la colocación comercial en el Edificio Terminal de Pasajeros (ETP), concentrando el ${((1980.5 / (grandVacantArea || 1)) * 100).toFixed(0)}% de la superficie vacante registrada.`, font: "Arial", size: 17 })],
        }),
        new Paragraph({
          bullet: { level: 0 },
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 75, line: 250 },
          children: [new TextRun({ text: "Fomentar la asignación de giros de alimentos rápidos y conveniencia en la Terminal Intermodal (TITT) para captar el flujo peatonal de conexión terrestre.", font: "Arial", size: 17 })],
        }),
        new Paragraph({
          bullet: { level: 0 },
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 75, line: 250 },
          children: [new TextRun({ text: `Superficie promedio vacante de ${(grandNoContractTotal > 0 ? grandVacantArea / grandNoContractTotal : 0).toFixed(2)} m² permite la colocación de marcas consolidadas sin requerir subdivisiones de obra complejas.`, font: "Arial", size: 17 })],
        }),
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

export const REPORT_TITLE_ZONES = "Reporte de Locales de las 7 Zonas de la SSC";

export function buildZonesWordDocument(allRecords: LocalRecord[], logoData: Uint8Array, now: Date) {
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
    columnSpan?: number;
    borders?: typeof allBorders;
  }) => new TableCell({
    width: { size: options.width, type: WidthType.DXA },
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
        size: options.size ?? 12,
        bold: options.bold,
        color: options.color ?? "111111",
      })],
    })],
  });

  const zoneNames = [
    "ETP",
    "Parque Santa Lucía",
    "Edificio de Servicios",
    "Terminal Intermodal de Transportación Terrestre",
    "Parque Revolución",
    "Ciudad Aeroportuaria",
    "Calzada de los Mamuts",
  ];

  const zoneMap = new Map<string, { empresas: Set<string>; total: number; operando: number; formalizado: number; adaptacion: number; proceso: number; disponible: number; }>();
  zoneNames.forEach(z => zoneMap.set(z, { empresas: new Set(), total: 0, operando: 0, formalizado: 0, adaptacion: 0, proceso: 0, disponible: 0 }));

  function cleanBrandKey(brand: string | null | undefined): string | null {
    if (!brand) return null;
    const fullText = String(brand).trim();
    if (!fullText) return null;

    const norm = normalize(fullText);
    const placeholders = [
      "sin marca",
      "sin asignacion",
      "por asignar",
      "por definir",
      "disponible",
      "vacante",
      "vacant",
      "n/a",
      "n/d",
      "-",
      "ninguna",
      "ninguno",
      "no aplica",
    ];
    if (placeholders.includes(norm)) return null;
    return norm;
  }

  allRecords.forEach((r) => {
    const zoneName = getSscZone(r);
    const entry = zoneMap.get(zoneName);
    if (!entry) return;

    entry.total += 1;
    const rawStatus = String(r.estatus ?? "").trim();
    const statusNorm = normalize(rawStatus);

    const isAvailableStatus = rawStatus === "DISPONIBLE" || statusNorm.includes("disponib");
    const isInProcessStatus = rawStatus === "EN PROCESO DE ASIGNACION" || (statusNorm.includes("proceso") && statusNorm.includes("asignac"));
    
    // Only count companies that are actually leased (operating, formalized, or adapting)
    const isLeasedPortfolio = 
      rawStatus === "EN FUNCIONAMIENTO" || rawStatus === "FORMALIZADO" || rawStatus === "EN ADAPTACION" ||
      statusNorm.includes("funcionamiento") || statusNorm.includes("formalizado") || statusNorm.includes("adaptacion");

    const brandKey = cleanBrandKey(r.marca ?? r.razonSocial);
    if (brandKey && isLeasedPortfolio) {
      entry.empresas.add(brandKey);
    }
    
    if (rawStatus === "EN FUNCIONAMIENTO") entry.operando += 1;
    else if (rawStatus === "FORMALIZADO") entry.formalizado += 1;
    else if (rawStatus === "EN ADAPTACION") entry.adaptacion += 1;
    else if (rawStatus === "EN PROCESO DE ASIGNACION") entry.proceso += 1;
    else if (rawStatus === "DISPONIBLE") entry.disponible += 1;
    else {
      if (statusNorm.includes("funcionamiento")) entry.operando += 1;
      else if (statusNorm.includes("formalizado")) entry.formalizado += 1;
      else if (statusNorm.includes("adaptacion")) entry.adaptacion += 1;
      else if (statusNorm.includes("proceso") && statusNorm.includes("asignac")) entry.proceso += 1;
      else if (statusNorm.includes("disponib")) entry.disponible += 1;
    }
  });

  const totals = { empresas: new Set<string>(), total: 0, operando: 0, formalizado: 0, adaptacion: 0, proceso: 0, disponible: 0 };
  let sumOfEmpresasCol = 0;
  let rowIndex = 1;
  const zoneRows = zoneNames.map((zoneName) => {
    const data = zoneMap.get(zoneName)!;
    const bgWhite = "FFFFFF";
    const bgBrown = "CBA277";
    const arrendados = data.operando + data.formalizado + data.adaptacion;
    
    data.empresas.forEach(e => totals.empresas.add(e));
    sumOfEmpresasCol += data.empresas.size;
    totals.total += data.total;
    totals.operando += data.operando;
    totals.formalizado += data.formalizado;
    totals.adaptacion += data.adaptacion;
    totals.proceso += data.proceso;
    totals.disponible += data.disponible;

    return new TableRow({
      cantSplit: true,
      children: [
        textCell(rowIndex++, { width: 500, fill: bgWhite }),
        textCell(zoneName, { width: 3100, fill: bgWhite }),
        textCell(data.empresas.size, { width: 1300, fill: bgWhite }),
        textCell(data.total, { width: 1300, fill: bgWhite }),
        textCell(arrendados, { width: 1300, fill: bgBrown }),
        textCell(data.operando, { width: 1300, fill: bgWhite }),
        textCell(data.formalizado, { width: 1300, fill: bgWhite }),
        textCell(data.adaptacion, { width: 1400, fill: bgWhite }),
        textCell(data.proceso, { width: 1600, fill: bgBrown }),
        textCell(data.disponible, { width: 1300, fill: bgBrown }),
      ],
    });
  });

  const totalArrendados = totals.operando + totals.formalizado + totals.adaptacion;

  const headerGreen = "1A493D";
  const headerRed = "941838";
  const footerGreen = "99B1A7";

  const zoneTable = new Table({
    width: { size: 14400, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [500, 3100, 1300, 1300, 1300, 1300, 1300, 1400, 1600, 1300],
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: [
          textCell("No.", { width: 500, fill: headerGreen, color: "FFFFFF", bold: true }),
          textCell("Zona comercial", { width: 3100, fill: headerGreen, color: "FFFFFF", bold: true }),
          textCell("Empresas", { width: 1300, fill: headerRed, color: "FFFFFF", bold: true }),
          textCell("No. locales", { width: 1300, fill: headerGreen, color: "FFFFFF", bold: true }),
          textCell("Arrendados", { width: 1300, fill: headerGreen, color: "FFFFFF", bold: true }),
          textCell("Operando", { width: 1300, fill: headerGreen, color: "FFFFFF", bold: true }),
          textCell("Formalizado", { width: 1300, fill: headerGreen, color: "FFFFFF", bold: true }),
          textCell("En adaptación", { width: 1400, fill: headerGreen, color: "FFFFFF", bold: true }),
          textCell("En proceso de asignación", { width: 1600, fill: headerGreen, color: "FFFFFF", bold: true }),
          textCell("Disponibles", { width: 1300, fill: headerGreen, color: "FFFFFF", bold: true }),
        ],
      }),
      ...zoneRows,
      new TableRow({
        cantSplit: true,
        children: [
          textCell("TOTAL", { width: 3600, columnSpan: 2, fill: headerGreen, color: "FFFFFF", bold: true }),
          textCell(sumOfEmpresasCol, { width: 1300, fill: footerGreen, bold: true }),
          textCell(totals.total, { width: 1300, fill: footerGreen, bold: true }),
          textCell(totalArrendados, { width: 1300, fill: footerGreen, bold: true }),
          textCell(totals.operando, { width: 1300, fill: footerGreen, bold: true }),
          textCell(totals.formalizado, { width: 1300, fill: footerGreen, bold: true }),
          textCell(totals.adaptacion, { width: 1400, fill: footerGreen, bold: true }),
          textCell(totals.proceso, { width: 1600, fill: footerGreen, bold: true }),
          textCell(totals.disponible, { width: 1300, fill: footerGreen, bold: true }),
        ],
      }),
    ],
  });

  const header = new Header({
    children: [
      new Table({
        width: { size: 14400, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        columnWidths: [3600, 7200, 3600],
        rows: [new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 3600, type: WidthType.DXA },
              borders: noBorders,
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  children: logoData.length > 0 ? [
                    new ImageRun({
                      data: logoData,
                      transformation: { width: 120, height: 38 },
                      type: "png",
                    }),
                  ] : [],
                }),
              ],
            }),
            new TableCell({
              width: { size: 7200, type: WidthType.DXA },
              borders: noBorders,
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0, line: 190 },
                  children: [new TextRun({ text: "Aeropuerto Internacional Felipe Ángeles", font: "Arial", size: 20, bold: true, color: "111111" })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 3600, type: WidthType.DXA },
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
                children: [new TextRun({ text: line, font: "Arial", size: 16, bold: true, color: "111111" })],
              })),
            }),
          ],
        })],
      })],
  });

  const signatureCell = (role: string, name: string, position: string) => new TableCell({
    width: { size: 7200, type: WidthType.DXA },
    borders: noBorders,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 250 }, children: [new TextRun({ text: role, font: "Arial", size: 16, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 30 }, children: [new TextRun({ text: "____________________________", font: "Arial", size: 16 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [new TextRun({ text: name, font: "Arial", size: 15, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: position, font: "Arial", size: 13 })] }),
    ],
  });

  const formatDate = (d: Date) => {
    const formatter = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" });
    return formatter.format(d);
  };

  return new Document({
    creator: "SIGCO (Sistema Integral de Gestión Comercial y Operativa)",
    title: REPORT_TITLE_ZONES,
    description: "Reporte de locales de las 7 zonas de la SSC.",
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
          size: { orientation: PageOrientation.LANDSCAPE, width: 12240, height: 15840 },
          margin: { top: 720, right: 720, bottom: 720, left: 720, header: 320, footer: 360 },
        },
      },
      headers: { default: header },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 70, after: 150, line: 260 },
          children: [new TextRun({ text: REPORT_TITLE_ZONES, font: "Arial", size: 21, bold: true, color: "122E3B" })],
        }),
        new Paragraph({
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: "Tabla 1. Resumen de disponibilidad por zona comercial", font: "Arial", size: 15, bold: true, color: "6F1131" })],
        }),
        zoneTable,
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
          width: { size: 14400, type: WidthType.DXA },
          layout: TableLayoutType.FIXED,
          columnWidths: [7200, 7200],
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

export const REPORT_TITLE_UNIZONA = "Dossier Ejecutivo Unizona";

export function buildUnizonaWordDocument(selectedZone: string, allRecords: LocalRecord[], logoData: Uint8Array, now: Date) {
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
    columnSpan?: number;
    borders?: typeof allBorders;
  }) => new TableCell({
    width: { size: options.width, type: WidthType.DXA },
    columnSpan: options.columnSpan,
    shading: options.fill ? { type: ShadingType.CLEAR, color: "auto", fill: options.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    borders: options.borders ?? allBorders,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0, line: 190 },
      children: [new TextRun({
        text: String(text),
        font: "Arial",
        size: options.size ?? 12,
        bold: options.bold,
        color: options.color ?? "111111",
      })],
    })],
  });

  const targetNorm = normalize(selectedZone);
  const zoneRecords = allRecords.filter((r) => {
    const locId = r.locationId ?? "";
    if (targetNorm.includes("etp") && locId === "etp") return true;
    if (targetNorm.includes("santa lucia") && locId === "parque-santa-lucia") return true;
    if ((targetNorm.includes("servicio") || targetNorm.includes("aduana")) && locId === "carga-aduana") return true;
    if ((targetNorm.includes("titt") || targetNorm.includes("intermodal")) && locId === "autobuses-plaza") return true;
    if (targetNorm.includes("revoluc") && locId === "parque-revolucion") return true;
    if (targetNorm.includes("ciudad aeroportuaria") && locId === "ciudad-aeroportuaria") return true;
    if (targetNorm.includes("mamut") && locId === "calzada-mamuts") return true;

    const raw = normalize([r.contractLocationName, r.zonaComercial, r.area, r.nomenclatura].filter(Boolean).join(" "));
    if (targetNorm.includes("etp") && raw.includes("etp")) return true;
    if (targetNorm.includes("santa lucia") && (raw.includes("santa lucia") || raw.includes("centro comercial"))) return true;
    if ((targetNorm.includes("servicio") || targetNorm.includes("aduana")) && (raw.includes("servicio") || raw.includes("carga") || raw.includes("aduana"))) return true;
    if ((targetNorm.includes("titt") || targetNorm.includes("intermodal")) && (raw.includes("titt") || raw.includes("intermodal") || raw.includes("transportac") || raw.includes("autobus"))) return true;
    if (targetNorm.includes("revoluc") && (raw.includes("revoluc") || raw.includes("glorieta") || raw.includes("felipe angeles"))) return true;
    if (targetNorm.includes("ciudad aeroportuaria") && raw.includes("aeroportuaria")) return true;
    if (targetNorm.includes("mamut") && (raw.includes("mamut") || raw.includes("mexiquense") || raw.includes("calzada"))) return true;

    return raw.includes(targetNorm);
  });

  const recordsToUse = zoneRecords.length ? zoneRecords : allRecords;

  let operando = 0;
  let areaOperando = 0;
  let formalizado = 0;
  let areaFormalizado = 0;
  let adaptacion = 0;
  let areaAdaptacion = 0;
  let proceso = 0;
  let areaProceso = 0;
  let disponible = 0;
  let areaDisponible = 0;

  const marcasSet = new Set<string>();
  const availableList: LocalRecord[] = [];

  recordsToUse.forEach((r) => {
    const metraje = typeof r.metraje === "number" && r.metraje > 0 ? r.metraje : 0;
    const rawStatus = String(r.estatus ?? r.operationalStatus ?? r.situacion ?? "").trim();
    const statusNorm = normalize(rawStatus);

    const brand = (r.marca ?? r.razonSocial ?? "").trim();
    const brandNorm = normalize(brand);
    const isValidBrand = brand && !["sin marca", "disponib", "vacant", "n/a", "n/d", "-"].some((p) => brandNorm.includes(p));

    if (rawStatus === "EN FUNCIONAMIENTO" || statusNorm.includes("funcionamiento")) {
      operando += 1;
      areaOperando += metraje;
      if (isValidBrand) marcasSet.add(brand.toUpperCase());
    } else if (rawStatus === "FORMALIZADO" || statusNorm.includes("formalizado")) {
      formalizado += 1;
      areaFormalizado += metraje;
      if (isValidBrand) marcasSet.add(brand.toUpperCase());
    } else if (rawStatus === "EN ADAPTACION" || statusNorm.includes("adaptacion")) {
      adaptacion += 1;
      areaAdaptacion += metraje;
      if (isValidBrand) marcasSet.add(brand.toUpperCase());
    } else if (rawStatus === "EN PROCESO DE ASIGNACION" || (statusNorm.includes("proceso") && statusNorm.includes("asignac"))) {
      proceso += 1;
      areaProceso += metraje;
      availableList.push(r);
    } else if (rawStatus === "DISPONIBLE" || statusNorm.includes("disponib") || statusNorm.includes("vacant")) {
      disponible += 1;
      areaDisponible += metraje;
      availableList.push(r);
    } else {
      disponible += 1;
      areaDisponible += metraje;
      availableList.push(r);
    }
  });

  const areaTotal = areaOperando + areaFormalizado + areaAdaptacion + areaProceso + areaDisponible;
  const areaVacanteTotal = areaDisponible + areaProceso;
  const totalLocales = recordsToUse.length;
  const arrendados = operando + formalizado + adaptacion;
  const pctOcupacion = totalLocales > 0 ? ((arrendados / totalLocales) * 100).toFixed(1) : "0.0";
  const pctVacancia = totalLocales > 0 ? (((disponible + proceso) / totalLocales) * 100).toFixed(1) : "0.0";

  const brandListStr = Array.from(marcasSet).slice(0, 15).join(" • ") || "Sin marcas registradas";

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
            children: logoData.length > 0 ? [new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { after: 0 },
              children: [new ImageRun({ data: logoData, type: "png", transformation: { width: 142, height: 80 }, altText: { title: "AIFA", description: "Logotipo del Aeropuerto Internacional Felipe Ángeles", name: "AIFA" } })],
            })] : [new Paragraph({ children: [new TextRun({ text: "AIFA", font: "Arial", size: 16, bold: true, color: "6F1131" })] })],
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
              children: [new TextRun({ text: line, font: "Arial", size: 16, bold: true, color: "111111" })],
            })),
          }),
        ],
      })],
    })],
  });

  const signatureCell = (role: string, name: string, position: string) => new TableCell({
    width: { size: 4680, type: WidthType.DXA },
    borders: noBorders,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 150 }, children: [new TextRun({ text: role, font: "Arial", size: 14, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [new TextRun({ text: "____________________________", font: "Arial", size: 14 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 10 }, children: [new TextRun({ text: name, font: "Arial", size: 13, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: position, font: "Arial", size: 11 })] }),
    ],
  });

  const formatDate = (d: Date) => {
    const formatter = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" });
    return formatter.format(d);
  };

  const kpiTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [2340, 2340, 2340, 2340],
    rows: [
      new TableRow({
        children: [
          textCell("Total Locales", { width: 2340, fill: "6F1131", color: "FFFFFF", bold: true, size: 11 }),
          textCell("% Ocupación", { width: 2340, fill: "6F1131", color: "FFFFFF", bold: true, size: 11 }),
          textCell("% Vacancia", { width: 2340, fill: "6F1131", color: "FFFFFF", bold: true, size: 11 }),
          textCell("Superficie Vacante", { width: 2340, fill: "6F1131", color: "FFFFFF", bold: true, size: 11 }),
        ],
      }),
      new TableRow({
        children: [
          textCell(totalLocales, { width: 2340, fill: "F8F6F1", bold: true, size: 15 }),
          textCell(`${pctOcupacion}%`, { width: 2340, fill: "F8F6F1", bold: true, size: 15, color: "1A493D" }),
          textCell(`${pctVacancia}%`, { width: 2340, fill: "F8F6F1", bold: true, size: 15, color: "941838" }),
          textCell(`${areaVacanteTotal.toFixed(2)} m²`, { width: 2340, fill: "F8F6F1", bold: true, size: 14 }),
        ],
      }),
    ],
  });

  const statusTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [3360, 2000, 2000, 2000],
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: [
          textCell("Estatus Operativo", { width: 3360, fill: "CDB28D", bold: true, size: 12 }),
          textCell("Locales", { width: 2000, fill: "CDB28D", bold: true, size: 12 }),
          textCell("Superficie (m²)", { width: 2000, fill: "CDB28D", bold: true, size: 12 }),
          textCell("% del Inventario", { width: 2000, fill: "CDB28D", bold: true, size: 12 }),
        ],
      }),
      new TableRow({ children: [textCell("En Funcionamiento", { width: 3360, fill: "F8F6F1", size: 11 }), textCell(operando, { width: 2000, fill: "F8F6F1", size: 11 }), textCell(`${areaOperando.toFixed(2)} m²`, { width: 2000, fill: "F8F6F1", size: 11 }), textCell(totalLocales ? `${((operando / totalLocales) * 100).toFixed(1)}%` : "0%", { width: 2000, fill: "F8F6F1", size: 11 })] }),
      new TableRow({ children: [textCell("Formalizado", { width: 3360, fill: "F8F6F1", size: 11 }), textCell(formalizado, { width: 2000, fill: "F8F6F1", size: 11 }), textCell(`${areaFormalizado.toFixed(2)} m²`, { width: 2000, fill: "F8F6F1", size: 11 }), textCell(totalLocales ? `${((formalizado / totalLocales) * 100).toFixed(1)}%` : "0%", { width: 2000, fill: "F8F6F1", size: 11 })] }),
      new TableRow({ children: [textCell("En Adaptación", { width: 3360, fill: "F8F6F1", size: 11 }), textCell(adaptacion, { width: 2000, fill: "F8F6F1", size: 11 }), textCell(`${areaAdaptacion.toFixed(2)} m²`, { width: 2000, fill: "F8F6F1", size: 11 }), textCell(totalLocales ? `${((adaptacion / totalLocales) * 100).toFixed(1)}%` : "0%", { width: 2000, fill: "F8F6F1", size: 11 })] }),
      new TableRow({ children: [textCell("En Proceso de Asignación", { width: 3360, fill: "F8F6F1", size: 11 }), textCell(proceso, { width: 2000, fill: "F8F6F1", size: 11 }), textCell(`${areaProceso.toFixed(2)} m²`, { width: 2000, fill: "F8F6F1", size: 11 }), textCell(totalLocales ? `${((proceso / totalLocales) * 100).toFixed(1)}%` : "0%", { width: 2000, fill: "F8F6F1", size: 11 })] }),
      new TableRow({ children: [textCell("Disponible (Vacante)", { width: 3360, fill: "F8F6F1", size: 11, bold: true, color: "941838" }), textCell(disponible, { width: 2000, fill: "F8F6F1", bold: true, size: 11 }), textCell(`${areaDisponible.toFixed(2)} m²`, { width: 2000, fill: "F8F6F1", size: 11 }), textCell(totalLocales ? `${((disponible / totalLocales) * 100).toFixed(1)}%` : "0%", { width: 2000, fill: "F8F6F1", size: 11 })] }),
      new TableRow({ children: [textCell("TOTAL ZONA", { width: 3360, fill: "6F1131", color: "FFFFFF", bold: true, size: 12 }), textCell(totalLocales, { width: 2000, fill: "EFEAE2", bold: true, size: 12 }), textCell(`${areaTotal.toFixed(2)} m²`, { width: 2000, fill: "EFEAE2", bold: true, size: 12 }), textCell("100.0%", { width: 2000, fill: "EFEAE2", bold: true, size: 12 })] }),
    ],
  });

  const isEtp = targetNorm.includes("etp");

  const isInternacional = (r: LocalRecord) => {
    const searchable = normalize([r.lado, r.area, r.modulo, r.nomenclatura, r.zonaComercial, r.contractLocationName].filter(Boolean).join(" "));
    return searchable.includes("internacional") || searchable.includes("intl");
  };

  availableList.sort((a, b) => {
    const aIntl = isInternacional(a) ? 1 : 0;
    const bIntl = isInternacional(b) ? 1 : 0;
    if (aIntl !== bIntl) return bIntl - aIntl;
    return (b.metraje ?? 0) - (a.metraje ?? 0);
  });

  const availableRows = availableList.slice(0, 8).map((r) => {
    const areaSide = r.lado || r.area || (isInternacional(r) ? "Internacional" : "Nacional");
    return new TableRow({
      cantSplit: true,
      children: isEtp
        ? [
            textCell(r.nomenclatura || r.id, { width: 2000, fill: "F8F6F1", bold: true, size: 10 }),
            textCell(areaSide, { width: 2000, fill: "F8F6F1", size: 10 }),
            textCell(r.nivel ?? "S/N", { width: 1360, fill: "F8F6F1", size: 10 }),
            textCell(r.metraje ? `${r.metraje.toFixed(2)} m²` : "N/D", { width: 1600, fill: "F8F6F1", size: 10 }),
            textCell(r.operationalStatus || r.estatus || "Disponible", { width: 2400, fill: "F2EEE7", size: 10, bold: true }),
          ]
        : [
            textCell(r.nomenclatura || r.id, { width: 2360, fill: "F8F6F1", bold: true, size: 11 }),
            textCell(r.nivel ?? "S/N", { width: 2000, fill: "F8F6F1", size: 11 }),
            textCell(r.metraje ? `${r.metraje.toFixed(2)} m²` : "N/D", { width: 2000, fill: "F8F6F1", size: 11 }),
            textCell(r.operationalStatus || r.estatus || "Disponible", { width: 3000, fill: "F2EEE7", size: 11, bold: true }),
          ],
    });
  });

  const vacancyTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: isEtp ? [2000, 2000, 1360, 1600, 2400] : [2360, 2000, 2000, 3000],
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: isEtp
          ? [
              textCell("Nomenclatura", { width: 2000, fill: "6F1131", color: "FFFFFF", bold: true, size: 11 }),
              textCell("Área / Subzona", { width: 2000, fill: "6F1131", color: "FFFFFF", bold: true, size: 11 }),
              textCell("Nivel", { width: 1360, fill: "6F1131", color: "FFFFFF", bold: true, size: 11 }),
              textCell("Metraje", { width: 1600, fill: "6F1131", color: "FFFFFF", bold: true, size: 11 }),
              textCell("Estatus", { width: 2400, fill: "6F1131", color: "FFFFFF", bold: true, size: 11 }),
            ]
          : [
              textCell("Nomenclatura", { width: 2360, fill: "6F1131", color: "FFFFFF", bold: true, size: 12 }),
              textCell("Nivel", { width: 2000, fill: "6F1131", color: "FFFFFF", bold: true, size: 12 }),
              textCell("Metraje", { width: 2000, fill: "6F1131", color: "FFFFFF", bold: true, size: 12 }),
              textCell("Estatus", { width: 3000, fill: "6F1131", color: "FFFFFF", bold: true, size: 12 }),
            ],
      }),
      ...availableRows,
    ],
  });

  return new Document({
    creator: "SIGCO (Sistema Integral de Gestión Comercial y Operativa)",
    title: `Dossier Ejecutivo - ${selectedZone}`,
    description: `Dossier sintético de 1 página de la zona comercial ${selectedZone}.`,
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 18, color: "111111" },
          paragraph: { spacing: { after: 80, line: 220 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { orientation: PageOrientation.PORTRAIT, width: 12240, height: 15840 },
          margin: { top: 1400, right: 1134, bottom: 1100, left: 1134, header: 320, footer: 360 },
        },
      },
      headers: { default: header },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 60, line: 240 },
          children: [new TextRun({ text: `DOSSIER EJECUTIVO COMERCIAL: ${selectedZone.toUpperCase()}`, font: "Arial", size: 19, bold: true, color: "6F1131" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 120 },
          children: [new TextRun({ text: "Estado de Ocupación, Marcas Operativas e Inventario Vacante", font: "Arial", size: 13, color: "556872", italics: true })],
        }),
        kpiTable,
        new Paragraph({
          spacing: { before: 100, after: 40 },
          children: [new TextRun({ text: "Tabla 1. Estatus Operativo del Inventario Comercial", font: "Arial", size: 13, bold: true, color: "6F1131" })],
        }),
        statusTable,
        new Paragraph({
          spacing: { before: 90, after: 40 },
          children: [
            new TextRun({ text: "Marcas y Operadores Principales: ", font: "Arial", size: 12, bold: true, color: "6F1131" }),
            new TextRun({ text: brandListStr, font: "Arial", size: 11, color: "333333" }),
          ],
        }),
        new Paragraph({
          spacing: { before: 90, after: 40 },
          children: [new TextRun({ text: "Tabla 2. Inventario Vacante Destacado (Oportunidades Inmediatas)", font: "Arial", size: 13, bold: true, color: "6F1131" })],
        }),
        vacancyTable,
        new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [new TextRun({ text: `Fecha de corte: ${formatDate(now)} · Fuente: SIGCO AIFA`, font: "Arial", size: 11, color: "666666" })],
        }),
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

export const REPORT_TITLE_FINANCIAL_VACANCY = "Análisis de Ingreso Potencial Vacante (Costo de Oportunidad)";

export function buildFinancialVacancyWordDocument(
  allRecords: LocalRecord[],
  contractRecords: LocalRecord[],
  logoData: Uint8Array,
  now: Date
) {
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
    columnSpan?: number;
    borders?: typeof allBorders;
  }) => new TableCell({
    width: { size: options.width, type: WidthType.DXA },
    columnSpan: options.columnSpan,
    shading: options.fill ? { type: ShadingType.CLEAR, color: "auto", fill: options.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 65, bottom: 65, left: 65, right: 65 },
    borders: options.borders ?? allBorders,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0, line: 190 },
      children: [new TextRun({
        text: String(text),
        font: "Arial",
        size: options.size ?? 12,
        bold: options.bold,
        color: options.color ?? "111111",
      })],
    })],
  });

  const currencyFmt = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });

  const zoneNames = [
    "ETP",
    "Parque Santa Lucía",
    "Edificio de Servicios",
    "Terminal Intermodal de Transportación Terrestre",
    "Parque Revolución",
    "Ciudad Aeroportuaria",
    "Calzada de los Mamuts",
  ];

  type SizeSegment = "small" | "medium" | "large";
  const getSegment = (metraje: number): SizeSegment => {
    if (metraje <= 50) return "small";
    if (metraje <= 200) return "medium";
    return "large";
  };

  type ZoneRateData = Record<SizeSegment, { rent: number; area: number }>;
  const zoneRates = new Map<string, ZoneRateData & { totalRent: number; totalArea: number }>();
  zoneNames.forEach((z) => {
    zoneRates.set(z, {
      small: { rent: 0, area: 0 },
      medium: { rent: 0, area: 0 },
      large: { rent: 0, area: 0 },
      totalRent: 0,
      totalArea: 0,
    });
  });

  const globalSegments: Record<SizeSegment, { rent: number; area: number }> = {
    small: { rent: 0, area: 0 },
    medium: { rent: 0, area: 0 },
    large: { rent: 0, area: 0 },
  };
  let globalTotalRent = 0;
  let globalTotalArea = 0;

  const sourceContracts = contractRecords.length ? contractRecords : allRecords.filter((r) => Boolean(r.monthlyRentVigente || r.monthlyRent));

  sourceContracts.forEach((r) => {
    const rent = r.monthlyRentVigente ?? r.monthlyRent;
    const area = r.metraje;
    if (!rent || !area || rent <= 0 || area <= 0) return;

    const zoneName = getSscZone(r);
    const entry = zoneRates.get(zoneName);
    const seg = getSegment(area);

    if (entry) {
      entry[seg].rent += rent;
      entry[seg].area += area;
      entry.totalRent += rent;
      entry.totalArea += area;
    }

    globalSegments[seg].rent += rent;
    globalSegments[seg].area += area;
    globalTotalRent += rent;
    globalTotalArea += area;
  });

  const getRateForZoneSegment = (zoneName: string, metraje: number): number => {
    const seg = getSegment(metraje);
    const entry = zoneRates.get(zoneName);

    if (entry && entry[seg].area > 0) {
      return entry[seg].rent / entry[seg].area;
    }
    if (entry && entry.totalArea > 0) {
      return entry.totalRent / entry.totalArea;
    }
    if (globalSegments[seg].area > 0) {
      return globalSegments[seg].rent / globalSegments[seg].area;
    }
    if (globalTotalArea > 0) {
      return globalTotalRent / globalTotalArea;
    }
    if (seg === "small") return 650;
    if (seg === "medium") return 450;
    return 300;
  };

  type VacantData = {
    dispCount: number;
    dispArea: number;
    dispMonthly: number;
    dispAnnual: number;

    procCount: number;
    procArea: number;
    procMonthly: number;
    procAnnual: number;
  };

  const zoneVacantMap = new Map<string, VacantData>();
  zoneNames.forEach((z) => {
    zoneVacantMap.set(z, {
      dispCount: 0,
      dispArea: 0,
      dispMonthly: 0,
      dispAnnual: 0,
      procCount: 0,
      procArea: 0,
      procMonthly: 0,
      procAnnual: 0,
    });
  });

  const allVacantScored: {
    record: LocalRecord;
    zoneName: string;
    segmentLabel: string;
    metraje: number;
    rate: number;
    monthlyMissed: number;
    isAvailable: boolean;
  }[] = [];

  allRecords.forEach((r) => {
    const rawStatus = String(r.estatus ?? r.operationalStatus ?? r.situacion ?? "").trim();
    const statusNorm = normalize(rawStatus);

    const isAvailableStatus = rawStatus === "DISPONIBLE" || statusNorm.includes("disponib") || statusNorm.includes("vacant");
    const isInProcessStatus = rawStatus === "EN PROCESO DE ASIGNACION" || (statusNorm.includes("proceso") && statusNorm.includes("asignac"));

    if (!isAvailableStatus && !isInProcessStatus) return;

    const zoneName = getSscZone(r);
    const entry = zoneVacantMap.get(zoneName);
    if (!entry) return;

    const metraje = typeof r.metraje === "number" && r.metraje > 0 ? r.metraje : 50;
    const rate = getRateForZoneSegment(zoneName, metraje);
    const monthly = metraje * rate;
    const annual = monthly * 12;

    if (isAvailableStatus) {
      entry.dispCount += 1;
      entry.dispArea += metraje;
      entry.dispMonthly += monthly;
      entry.dispAnnual += annual;
    } else {
      entry.procCount += 1;
      entry.procArea += metraje;
      entry.procMonthly += monthly;
      entry.procAnnual += annual;
    }

    const seg = getSegment(metraje);
    const segmentLabel = seg === "small" ? "Pequeño (≤50m²)" : seg === "medium" ? "Estándar (50-200m²)" : "Macrolocal (>200m²)";

    allVacantScored.push({
      record: r,
      zoneName,
      segmentLabel,
      metraje,
      rate,
      monthlyMissed: monthly,
      isAvailable: isAvailableStatus,
    });
  });

  allVacantScored.sort((a, b) => b.monthlyMissed - a.monthlyMissed);

  // Totals accumulators
  let totDispCount = 0;
  let totDispArea = 0;
  let totDispMonthly = 0;
  let totDispAnnual = 0;
  let totDispRateSum = 0;

  let totProcCount = 0;
  let totProcArea = 0;
  let totProcMonthly = 0;
  let totProcAnnual = 0;
  let totProcRateSum = 0;

  const bgWhite = "FFFFFF";
  const bgSubtotal = "F2EEE7";
  const headerGreen = "1A493D";
  const headerRed = "941838";
  const footerGreen = "99B1A7";

  // Rows for DISPONIBLE
  const dispZoneRows = zoneNames.map((zoneName) => {
    const data = zoneVacantMap.get(zoneName)!;
    totDispCount += data.dispCount;
    totDispArea += data.dispArea;
    totDispMonthly += data.dispMonthly;
    totDispAnnual += data.dispAnnual;

    const effectiveRate = data.dispArea > 0 ? data.dispMonthly / data.dispArea : 0;
    totDispRateSum += effectiveRate;

    return new TableRow({
      cantSplit: true,
      children: [
        textCell(zoneName, { width: 3200, fill: bgWhite, bold: true, size: 11 }),
        textCell(data.dispCount, { width: 1300, fill: bgWhite, size: 11 }),
        textCell(`${data.dispArea.toFixed(2)} m²`, { width: 2100, fill: bgWhite, size: 11 }),
        textCell(effectiveRate > 0 ? currencyFmt.format(effectiveRate) : "N/D", { width: 2300, fill: bgWhite, size: 11 }),
        textCell(currencyFmt.format(data.dispMonthly), { width: 2700, fill: bgWhite, bold: true, size: 11, color: "941838" }),
        textCell(currencyFmt.format(data.dispAnnual), { width: 2800, fill: bgWhite, bold: true, size: 11, color: "941838" }),
      ],
    });
  });

  // Rows for EN PROCESO
  const procZoneRows = zoneNames.map((zoneName) => {
    const data = zoneVacantMap.get(zoneName)!;
    totProcCount += data.procCount;
    totProcArea += data.procArea;
    totProcMonthly += data.procMonthly;
    totProcAnnual += data.procAnnual;

    const effectiveRate = data.procArea > 0 ? data.procMonthly / data.procArea : 0;
    totProcRateSum += effectiveRate;

    return new TableRow({
      cantSplit: true,
      children: [
        textCell(zoneName, { width: 3200, fill: bgWhite, bold: true, size: 11 }),
        textCell(data.procCount, { width: 1300, fill: bgWhite, size: 11 }),
        textCell(`${data.procArea.toFixed(2)} m²`, { width: 2100, fill: bgWhite, size: 11 }),
        textCell(effectiveRate > 0 ? currencyFmt.format(effectiveRate) : "N/D", { width: 2300, fill: bgWhite, size: 11 }),
        textCell(currencyFmt.format(data.procMonthly), { width: 2700, fill: bgWhite, size: 11, color: "111111" }),
        textCell(currencyFmt.format(data.procAnnual), { width: 2800, fill: bgWhite, size: 11, color: "111111" }),
      ],
    });
  });

  const grandCount = totDispCount + totProcCount;
  const grandArea = totDispArea + totProcArea;
  const grandMonthly = totDispMonthly + totProcMonthly;
  const grandAnnual = totDispAnnual + totProcAnnual;
  const grandRateSum = totDispRateSum + totProcRateSum;

  const zoneTable = new Table({
    width: { size: 14400, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [3200, 1300, 2100, 2300, 2700, 2800],
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: [
          textCell("Zona Comercial", { width: 3200, fill: headerGreen, color: "FFFFFF", bold: true, size: 11 }),
          textCell("Vacantes", { width: 1300, fill: headerGreen, color: "FFFFFF", bold: true, size: 11 }),
          textCell("Superficie (m²)", { width: 2100, fill: headerGreen, color: "FFFFFF", bold: true, size: 11 }),
          textCell("Tarifa $/m²", { width: 2300, fill: headerGreen, color: "FFFFFF", bold: true, size: 11 }),
          textCell("No Realizado (Mensual)", { width: 2700, fill: headerRed, color: "FFFFFF", bold: true, size: 11 }),
          textCell("No Realizado (Anual)", { width: 2800, fill: headerRed, color: "FFFFFF", bold: true, size: 11 }),
        ],
      }),
      // Header Sub-bloque 1: DISPONIBLE
      new TableRow({
        cantSplit: true,
        children: [
          textCell("1. VACANCIA LIBRE DIRECTA (ESTATUS: DISPONIBLE)", { width: 14400, columnSpan: 6, fill: "CDB28D", bold: true, size: 11 }),
        ],
      }),
      ...dispZoneRows,
      new TableRow({
        cantSplit: true,
        children: [
          textCell("SUBTOTAL DISPONIBLE (VACANCIA NETO)", { width: 3200, fill: bgSubtotal, bold: true, size: 11, color: "941838" }),
          textCell(totDispCount, { width: 1300, fill: bgSubtotal, bold: true, size: 11 }),
          textCell(`${totDispArea.toFixed(2)} m²`, { width: 2100, fill: bgSubtotal, bold: true, size: 11 }),
          textCell(currencyFmt.format(totDispRateSum), { width: 2300, fill: bgSubtotal, bold: true, size: 11 }),
          textCell(currencyFmt.format(totDispMonthly), { width: 2700, fill: bgSubtotal, bold: true, size: 11, color: "941838" }),
          textCell(currencyFmt.format(totDispAnnual), { width: 2800, fill: bgSubtotal, bold: true, size: 11, color: "941838" }),
        ],
      }),
      // Header Sub-bloque 2: EN PROCESO DE ASIGNACION
      new TableRow({
        cantSplit: true,
        children: [
          textCell("2. VACANCIA COMPROMETIDA (ESTATUS: EN PROCESO DE ASIGNACIÓN)", { width: 14400, columnSpan: 6, fill: "CDB28D", bold: true, size: 11 }),
        ],
      }),
      ...procZoneRows,
      new TableRow({
        cantSplit: true,
        children: [
          textCell("SUBTOTAL EN PROCESO (POR FORMALIZAR)", { width: 3200, fill: bgSubtotal, bold: true, size: 11 }),
          textCell(totProcCount, { width: 1300, fill: bgSubtotal, bold: true, size: 11 }),
          textCell(`${totProcArea.toFixed(2)} m²`, { width: 2100, fill: bgSubtotal, bold: true, size: 11 }),
          textCell(currencyFmt.format(totProcRateSum), { width: 2300, fill: bgSubtotal, bold: true, size: 11 }),
          textCell(currencyFmt.format(totProcMonthly), { width: 2700, fill: bgSubtotal, bold: true, size: 11 }),
          textCell(currencyFmt.format(totProcAnnual), { width: 2800, fill: bgSubtotal, bold: true, size: 11 }),
        ],
      }),
      // TOTAL CONSOLIDADO
      new TableRow({
        cantSplit: true,
        children: [
          textCell("TOTAL CONSOLIDADO (DISPONIBLE + EN PROCESO)", { width: 3200, fill: headerGreen, color: "FFFFFF", bold: true, size: 12 }),
          textCell(grandCount, { width: 1300, fill: footerGreen, bold: true, size: 12 }),
          textCell(`${grandArea.toFixed(2)} m²`, { width: 2100, fill: footerGreen, bold: true, size: 12 }),
          textCell(currencyFmt.format(grandRateSum), { width: 2300, fill: footerGreen, bold: true, size: 12 }),
          textCell(currencyFmt.format(grandMonthly), { width: 2700, fill: footerGreen, bold: true, size: 12, color: "941838" }),
          textCell(currencyFmt.format(grandAnnual), { width: 2800, fill: footerGreen, bold: true, size: 12, color: "941838" }),
        ],
      }),
    ],
  });

  const topVacantRows = allVacantScored.slice(0, 8).map((item) => new TableRow({
    cantSplit: true,
    children: [
      textCell(item.record.nomenclatura || item.record.id, { width: 2200, fill: "F8F6F1", bold: true, size: 11 }),
      textCell(item.zoneName, { width: 2800, fill: "F8F6F1", size: 11 }),
      textCell(item.isAvailable ? "Disponible" : "En Proceso", { width: 2200, fill: "F8F6F1", bold: true, size: 10, color: item.isAvailable ? "941838" : "111111" }),
      textCell(item.segmentLabel, { width: 2500, fill: "F8F6F1", size: 11 }),
      textCell(`${item.metraje.toFixed(2)} m²`, { width: 1900, fill: "F8F6F1", size: 11 }),
      textCell(currencyFmt.format(item.monthlyMissed), { width: 2800, fill: "F2EEE7", bold: true, size: 11, color: "941838" }),
    ],
  }));

  const topVacantTable = new Table({
    width: { size: 14400, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [2200, 2800, 2200, 2500, 1900, 2800],
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: [
          textCell("Nomenclatura", { width: 2200, fill: "6F1131", color: "FFFFFF", bold: true, size: 11 }),
          textCell("Zona Comercial", { width: 2800, fill: "6F1131", color: "FFFFFF", bold: true, size: 11 }),
          textCell("Estatus", { width: 2200, fill: "6F1131", color: "FFFFFF", bold: true, size: 11 }),
          textCell("Formato de Tamaño", { width: 2500, fill: "6F1131", color: "FFFFFF", bold: true, size: 11 }),
          textCell("Superficie", { width: 1900, fill: "6F1131", color: "FFFFFF", bold: true, size: 11 }),
          textCell("Pérdida Mensual Est.", { width: 2800, fill: "6F1131", color: "FFFFFF", bold: true, size: 11 }),
        ],
      }),
      ...topVacantRows,
    ],
  });

  const top3Missed = allVacantScored.slice(0, 3).reduce((sum, item) => sum + item.monthlyMissed, 0);
  const top3Pct = grandMonthly > 0 ? ((top3Missed / grandMonthly) * 100).toFixed(1) : "0";

  const header = new Header({
    children: [
      new Table({
        width: { size: 14400, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        columnWidths: [3600, 7200, 3600],
        rows: [new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 3600, type: WidthType.DXA },
              borders: noBorders,
              verticalAlign: VerticalAlign.CENTER,
              children: logoData.length > 0 ? [new Paragraph({ alignment: AlignmentType.LEFT, children: [new ImageRun({ data: logoData, transformation: { width: 120, height: 38 }, type: "png" })] })] : [],
            }),
            new TableCell({
              width: { size: 7200, type: WidthType.DXA },
              borders: noBorders,
              verticalAlign: VerticalAlign.CENTER,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 190 }, children: [new TextRun({ text: "Aeropuerto Internacional Felipe Ángeles", font: "Arial", size: 20, bold: true, color: "111111" })] })],
            }),
            new TableCell({
              width: { size: 3600, type: WidthType.DXA },
              borders: noBorders,
              verticalAlign: VerticalAlign.CENTER,
              children: [
                "Dirección Com. y de Servicios",
                "Sub. de Servicios Comerciales",
                "Grupo de Inteligencia y Análisis",
                "Comercial",
              ].map((line) => new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { line: 190 }, children: [new TextRun({ text: line, font: "Arial", size: 16, bold: true, color: "111111" })] })),
            }),
          ],
        })],
      }),
    ],
  });

  const signatureCell = (role: string, name: string, position: string) => new TableCell({
    width: { size: 7200, type: WidthType.DXA },
    borders: noBorders,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 250 }, children: [new TextRun({ text: role, font: "Arial", size: 16, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 30 }, children: [new TextRun({ text: "____________________________", font: "Arial", size: 16 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [new TextRun({ text: name, font: "Arial", size: 15, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: position, font: "Arial", size: 13 })] }),
    ],
  });

  const formatDate = (d: Date) => {
    const formatter = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" });
    return formatter.format(d);
  };

  return new Document({
    creator: "SIGCO (Sistema Integral de Gestión Comercial y Operativa)",
    title: REPORT_TITLE_FINANCIAL_VACANCY,
    description: "Análisis de ingreso potencial vacante y costo de oportunidad comercial por zona.",
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
          size: { orientation: PageOrientation.LANDSCAPE, width: 12240, height: 15840 },
          margin: { top: 720, right: 720, bottom: 720, left: 720, header: 320, footer: 360 },
        },
      },
      headers: { default: header },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 70, after: 100, line: 260 },
          children: [new TextRun({ text: REPORT_TITLE_FINANCIAL_VACANCY.toUpperCase(), font: "Arial", size: 20, bold: true, color: "122E3B" })],
        }),
        new Paragraph({
          spacing: { before: 40, after: 120 },
          children: [
            new TextRun({ text: "Nota Metodológica de Valuación: ", font: "Arial", size: 13, bold: true, color: "6F1131" }),
            new TextRun({
              text: "Las estimaciones de renta por m² se extrajeron directamente de las hojas CONTRATOS GSC y CONTRATOS GEP (columna 'Contraprestación mensual más IVA Vigente'). Para evitar distorsiones por economía de escala en locales grandes, la tarifa promedio $/m² se aplicó mediante valuación ponderada y segmentada por rango de superficie: Pequeño (≤ 50 m²), Estándar (50.01 - 200 m²) y Macrolocales (> 200 m²).",
              font: "Arial",
              size: 12,
              italics: true,
              color: "444444",
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 40, after: 80 },
          children: [new TextRun({ text: "Tabla 1. Estructura de Costo de Oportunidad por Zona Comercial", font: "Arial", size: 15, bold: true, color: "6F1131" })],
        }),
        zoneTable,
        new Paragraph({
          spacing: { before: 140, after: 80 },
          children: [new TextRun({ text: "Tabla 2. Top 8 Vacantes de Mayor Impacto Económico Individual (Oportunidad Comercial)", font: "Arial", size: 15, bold: true, color: "6F1131" })],
        }),
        topVacantTable,
        new Paragraph({
          spacing: { before: 100, after: 60 },
          children: [
            new TextRun({ text: "Dictamen Estratégico de Dirección: ", font: "Arial", size: 14, bold: true, color: "1A493D" }),
            new TextRun({
              text: `La comercialización prioritaria de las 3 vacantes principales de mayor metraje permitiría recuperar el ${top3Pct}% del costo de oportunidad mensual total de la institución (${currencyFmt.format(top3Missed)}/mes).`,
              font: "Arial",
              size: 13,
              color: "222222",
            }),
          ],
        }),
        new Paragraph({ spacing: { before: 60, after: 100 }, children: [new TextRun({ text: `Fecha de corte: ${formatDate(now)} · Fuente: SIGCO AIFA (GSC y GEP)`, font: "Arial", size: 13, color: "666666" })] }),
        new Table({
          width: { size: 14400, type: WidthType.DXA },
          layout: TableLayoutType.FIXED,
          columnWidths: [7200, 7200],
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

export const REPORT_TITLE_BCG_ETP = "Matriz BCG por Módulo Comercial ETP";

export function buildBcgEtpWordDocument(
  allRecords: LocalRecord[],
  contractRecords: LocalRecord[],
  logoData: Uint8Array,
  now: Date
) {
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
    columnSpan?: number;
    borders?: typeof allBorders;
  }) => new TableCell({
    width: { size: options.width, type: WidthType.DXA },
    columnSpan: options.columnSpan,
    shading: options.fill ? { type: ShadingType.CLEAR, color: "auto", fill: options.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 65, bottom: 65, left: 65, right: 65 },
    borders: options.borders ?? allBorders,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0, line: 190 },
      children: [new TextRun({
        text: String(text),
        font: "Arial",
        size: options.size ?? 12,
        bold: options.bold,
        color: options.color ?? "111111",
      })],
    })],
  });

  const currencyFmt = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });

  const etpRecords = allRecords.filter((r) => r.locationId === "etp" || getSscZone(r) === "ETP");

  type ModuleGroup = {
    moduleName: string;
    records: LocalRecord[];
    totalCount: number;
    occupiedCount: number;
    inProcessCount: number;
    availableCount: number;
    totalArea: number;
    occupiedArea: number;
    vacantArea: number;
    occupiedRent: number;
  };

  const moduleMap = new Map<string, ModuleGroup>();

  etpRecords.forEach((r) => {
    let mod = String(r.modulo ?? "").trim();
    if (!mod || mod === "Sin dato") mod = "General ETP";

    if (/^[A-Z0-9]$/i.test(mod)) {
      mod = `Módulo ${mod.toUpperCase()}`;
    }

    let group = moduleMap.get(mod);
    if (!group) {
      group = {
        moduleName: mod,
        records: [],
        totalCount: 0,
        occupiedCount: 0,
        inProcessCount: 0,
        availableCount: 0,
        totalArea: 0,
        occupiedArea: 0,
        vacantArea: 0,
        occupiedRent: 0,
      };
      moduleMap.set(mod, group);
    }

    const rawStatus = String(r.estatus ?? r.operationalStatus ?? r.situacion ?? "").trim();
    const statusNorm = normalize(rawStatus);

    const isOccupied = rawStatus === "EN FUNCIONAMIENTO" || rawStatus === "FORMALIZADO" || rawStatus === "EN ADAPTACION" || statusNorm.includes("funcion") || statusNorm.includes("formaliz") || statusNorm.includes("adaptac");
    const isInProcess = rawStatus === "EN PROCESO DE ASIGNACION" || (statusNorm.includes("proceso") && statusNorm.includes("asignac"));
    const isAvailable = rawStatus === "DISPONIBLE" || statusNorm.includes("disponib") || statusNorm.includes("vacant");

    const area = typeof r.metraje === "number" && r.metraje > 0 ? r.metraje : 50;
    const rent = r.monthlyRentVigente ?? r.monthlyRent ?? 0;

    group.records.push(r);
    group.totalCount += 1;
    group.totalArea += area;

    if (isOccupied) {
      group.occupiedCount += 1;
      group.occupiedArea += area;
      group.occupiedRent += rent;
    } else if (isInProcess) {
      group.inProcessCount += 1;
      group.vacantArea += area;
    } else if (isAvailable) {
      group.availableCount += 1;
      group.vacantArea += area;
    } else {
      group.occupiedCount += 1;
      group.occupiedArea += area;
      group.occupiedRent += rent;
    }
  });

  let globalEtpRent = 0;
  let globalEtpArea = 0;
  moduleMap.forEach((g) => {
    globalEtpRent += g.occupiedRent;
    globalEtpArea += g.occupiedArea;
  });

  const benchmarkRate = globalEtpArea > 0 ? globalEtpRent / globalEtpArea : 450;

  const moduleList = Array.from(moduleMap.values()).sort((a, b) => a.moduleName.localeCompare(b.moduleName, "es", { numeric: true }));

  type BcgQuadrantKey = "estrella" | "atencion" | "estable" | "reestructuracion";
  type BcgItem = {
    group: ModuleGroup;
    occupancyPct: number;
    ratePerM2: number;
    quadrantKey: BcgQuadrantKey;
    quadrantName: string;
    quadrantSymbol: string;
    action: string;
    bgFill: string;
    textColor: string;
  };

  const quadrantCounts = {
    estrella: 0,
    atencion: 0,
    estable: 0,
    reestructuracion: 0,
  };

  const scoredModules: BcgItem[] = moduleList.map((g) => {
    const occupancyPct = g.totalCount > 0 ? (g.occupiedCount / g.totalCount) * 100 : 0;
    const ratePerM2 = g.occupiedArea > 0 && g.occupiedRent > 0 ? g.occupiedRent / g.occupiedArea : benchmarkRate;

    const isHighOccupancy = occupancyPct >= 70;
    const isHighRate = ratePerM2 >= benchmarkRate;

    let quadrantKey: BcgQuadrantKey;
    let quadrantName: string;
    let quadrantSymbol: string;
    let action: string;
    let bgFill: string;
    let textColor: string;

    if (isHighOccupancy && isHighRate) {
      quadrantKey = "estrella";
      quadrantName = "Estrella";
      quadrantSymbol = "🌟";
      action = "Conservación y renovación";
      bgFill = "EAF2ED";
      textColor = "1A493D";
    } else if (!isHighOccupancy && isHighRate) {
      quadrantKey = "atencion";
      quadrantName = "Atención Prioritaria";
      quadrantSymbol = "🎯";
      action = "Prospección comercial intensiva";
      bgFill = "FCE8E6";
      textColor = "941838";
    } else if (isHighOccupancy && !isHighRate) {
      quadrantKey = "estable";
      quadrantName = "Estable";
      quadrantSymbol = "📦";
      action = "Renovación y mix de giros";
      bgFill = "FEF7E0";
      textColor = "B06000";
    } else {
      quadrantKey = "reestructuracion";
      quadrantName = "Reestructuración";
      quadrantSymbol = "⚠️";
      action = "Subdivisión / Reconfiguración";
      bgFill = "FCE8E6";
      textColor = "A50E0E";
    }

    quadrantCounts[quadrantKey] += 1;

    return {
      group: g,
      occupancyPct,
      ratePerM2,
      quadrantKey,
      quadrantName,
      quadrantSymbol,
      action,
      bgFill,
      textColor,
    };
  });

  let sumTotCount = 0;
  let sumOccCount = 0;
  let sumVacCount = 0;
  let sumRate = 0;

  const tableRows = scoredModules.map((item) => {
    sumTotCount += item.group.totalCount;
    sumOccCount += item.group.occupiedCount;
    const vacantCount = item.group.availableCount + item.group.inProcessCount;
    sumVacCount += vacantCount;
    sumRate += item.ratePerM2;

    const bgWhite = "FFFFFF";

    return new TableRow({
      cantSplit: true,
      children: [
        textCell(item.group.moduleName, { width: 2200, fill: bgWhite, bold: true, size: 11 }),
        textCell(item.group.totalCount, { width: 1300, fill: bgWhite, size: 11 }),
        textCell(item.group.occupiedCount, { width: 1300, fill: bgWhite, size: 11 }),
        textCell(vacantCount, { width: 1300, fill: bgWhite, size: 11 }),
        textCell(`${item.occupancyPct.toFixed(1)}%`, { width: 1600, fill: bgWhite, bold: true, size: 11 }),
        textCell(currencyFmt.format(item.ratePerM2), { width: 2000, fill: bgWhite, size: 11 }),
        textCell(`${item.quadrantSymbol} ${item.quadrantName}`, { width: 2300, fill: item.bgFill, color: item.textColor, bold: true, size: 11 }),
        textCell(item.action, { width: 2400, fill: bgWhite, size: 10 }),
      ],
    });
  });

  const grandOccPct = sumTotCount > 0 ? (sumOccCount / sumTotCount) * 100 : 0;
  const headerGreen = "1A493D";
  const footerGreen = "99B1A7";

  const moduleTable = new Table({
    width: { size: 14400, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [2200, 1300, 1300, 1300, 1600, 2000, 2300, 2400],
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: [
          textCell("Módulo ETP", { width: 2200, fill: headerGreen, color: "FFFFFF", bold: true, size: 11 }),
          textCell("Total", { width: 1300, fill: headerGreen, color: "FFFFFF", bold: true, size: 11 }),
          textCell("Ocupados", { width: 1300, fill: headerGreen, color: "FFFFFF", bold: true, size: 11 }),
          textCell("Vacantes", { width: 1300, fill: headerGreen, color: "FFFFFF", bold: true, size: 11 }),
          textCell("% Ocupación", { width: 1600, fill: headerGreen, color: "FFFFFF", bold: true, size: 11 }),
          textCell("Tarifa $/m²", { width: 2000, fill: headerGreen, color: "FFFFFF", bold: true, size: 11 }),
          textCell("Cuadrante BCG", { width: 2300, fill: headerGreen, color: "FFFFFF", bold: true, size: 11 }),
          textCell("Estrategia Recomendada", { width: 2400, fill: headerGreen, color: "FFFFFF", bold: true, size: 11 }),
        ],
      }),
      ...tableRows,
      new TableRow({
        cantSplit: true,
        children: [
          textCell("TOTAL ETP", { width: 2200, fill: headerGreen, color: "FFFFFF", bold: true, size: 12 }),
          textCell(sumTotCount, { width: 1300, fill: footerGreen, bold: true, size: 12 }),
          textCell(sumOccCount, { width: 1300, fill: footerGreen, bold: true, size: 12 }),
          textCell(sumVacCount, { width: 1300, fill: footerGreen, bold: true, size: 12 }),
          textCell(`${grandOccPct.toFixed(1)}%`, { width: 1600, fill: footerGreen, bold: true, size: 12 }),
          textCell(currencyFmt.format(sumRate), { width: 2000, fill: footerGreen, bold: true, size: 12 }),
          textCell(`${scoredModules.length} Módulos`, { width: 2300, fill: footerGreen, bold: true, size: 12 }),
          textCell("Diagnóstico Consolidado", { width: 2400, fill: footerGreen, bold: true, size: 11 }),
        ],
      }),
    ],
  });

  const bcgSummaryTable = new Table({
    width: { size: 14400, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [3000, 5700, 5700],
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: [
          textCell("CRITERIO BCG", { width: 3000, fill: "6F1131", color: "FFFFFF", bold: true, size: 11 }),
          textCell("ALTA OCUPACIÓN (≥ 70%)", { width: 5700, fill: "6F1131", color: "FFFFFF", bold: true, size: 11 }),
          textCell("BAJA OCUPACIÓN (< 70%)", { width: 5700, fill: "6F1131", color: "FFFFFF", bold: true, size: 11 }),
        ],
      }),
      new TableRow({
        cantSplit: true,
        children: [
          textCell("ALTA TARIFA ($/m²)", { width: 3000, fill: "F2EEE7", bold: true, size: 11 }),
          textCell(`🌟 ESTRELLA: ${quadrantCounts.estrella} Módulos\n(Consolidados - Conservar mix)`, { width: 5700, fill: "EAF2ED", color: "1A493D", bold: true, size: 11 }),
          textCell(`🎯 ATENCIÓN PRIORITARIA: ${quadrantCounts.atencion} Módulos\n(Fuerza de Ventas Inmediata)`, { width: 5700, fill: "FCE8E6", color: "941838", bold: true, size: 11 }),
        ],
      }),
      new TableRow({
        cantSplit: true,
        children: [
          textCell("TARIFA MODERADA ($/m²)", { width: 3000, fill: "F2EEE7", bold: true, size: 11 }),
          textCell(`📦 ESTABLE: ${quadrantCounts.estable} Módulos\n(Operación Madura - Renovaciones)`, { width: 5700, fill: "FEF7E0", color: "B06000", bold: true, size: 11 }),
          textCell(`⚠️ REESTRUCTURACIÓN: ${quadrantCounts.reestructuracion} Módulos\n(Subdivisión / Reconfigurar)`, { width: 5700, fill: "FCE8E6", color: "A50E0E", bold: true, size: 11 }),
        ],
      }),
    ],
  });

  const header = new Header({
    children: [
      new Table({
        width: { size: 14400, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        columnWidths: [3600, 7200, 3600],
        rows: [new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 3600, type: WidthType.DXA },
              borders: noBorders,
              verticalAlign: VerticalAlign.CENTER,
              children: logoData.length > 0 ? [new Paragraph({ alignment: AlignmentType.LEFT, children: [new ImageRun({ data: logoData, transformation: { width: 120, height: 38 }, type: "png" })] })] : [],
            }),
            new TableCell({
              width: { size: 7200, type: WidthType.DXA },
              borders: noBorders,
              verticalAlign: VerticalAlign.CENTER,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 190 }, children: [new TextRun({ text: "Aeropuerto Internacional Felipe Ángeles", font: "Arial", size: 20, bold: true, color: "111111" })] })],
            }),
            new TableCell({
              width: { size: 3600, type: WidthType.DXA },
              borders: noBorders,
              verticalAlign: VerticalAlign.CENTER,
              children: [
                "Dirección Com. y de Servicios",
                "Sub. de Servicios Comerciales",
                "Grupo de Inteligencia y Análisis",
                "Comercial",
              ].map((line) => new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { line: 190 }, children: [new TextRun({ text: line, font: "Arial", size: 16, bold: true, color: "111111" })] })),
            }),
          ],
        })],
      }),
    ],
  });

  const signatureCell = (role: string, name: string, position: string) => new TableCell({
    width: { size: 7200, type: WidthType.DXA },
    borders: noBorders,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 250 }, children: [new TextRun({ text: role, font: "Arial", size: 16, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 30 }, children: [new TextRun({ text: "____________________________", font: "Arial", size: 16 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [new TextRun({ text: name, font: "Arial", size: 15, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: position, font: "Arial", size: 13 })] }),
    ],
  });

  const formatDate = (d: Date) => {
    const formatter = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" });
    return formatter.format(d);
  };

  const priorityModules = scoredModules.filter((m) => m.quadrantKey === "atencion").map((m) => m.group.moduleName).join(", ");
  const restructModules = scoredModules.filter((m) => m.quadrantKey === "reestructuracion").map((m) => m.group.moduleName).join(", ");

  return new Document({
    creator: "SIGCO (Sistema Integral de Gestión Comercial y Operativa)",
    title: REPORT_TITLE_BCG_ETP,
    description: "Matriz BCG de diagnóstico y estrategia por módulo comercial del Edificio Terminal de Pasajeros.",
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
          size: { orientation: PageOrientation.LANDSCAPE, width: 12240, height: 15840 },
          margin: { top: 720, right: 720, bottom: 720, left: 720, header: 320, footer: 360 },
        },
      },
      headers: { default: header },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 70, after: 100, line: 260 },
          children: [new TextRun({ text: REPORT_TITLE_BCG_ETP.toUpperCase(), font: "Arial", size: 20, bold: true, color: "122E3B" })],
        }),
        new Paragraph({
          spacing: { before: 40, after: 120 },
          children: [
            new TextRun({ text: "Nota Metodológica de la Matriz BCG: ", font: "Arial", size: 13, bold: true, color: "6F1131" }),
            new TextRun({
              text: `Los módulos del Edificio Terminal de Pasajeros (ETP) extraídos de la columna 'Módulo' de la hoja ETP se clasificaron evaluando su Tasa de Comercialización (% Ocupación) y su Tarifa Promedio $/m². El umbral de alta ocupación se fijó en 70.0% y la tarifa de referencia de corte se fijó en ${currencyFmt.format(benchmarkRate)}/m².`,
              font: "Arial",
              size: 12,
              italics: true,
              color: "444444",
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 40, after: 80 },
          children: [new TextRun({ text: "Resumen de Cuadrantes BCG (Edificio Terminal de Pasajeros)", font: "Arial", size: 15, bold: true, color: "6F1131" })],
        }),
        bcgSummaryTable,
        new Paragraph({
          spacing: { before: 140, after: 80 },
          children: [new TextRun({ text: "Tabla 1. Diagnóstico Estratégico Matriz BCG por Módulo Comercial ETP", font: "Arial", size: 15, bold: true, color: "6F1131" })],
        }),
        moduleTable,
        new Paragraph({
          spacing: { before: 100, after: 60 },
          children: [
            new TextRun({ text: "Dictamen Estratégico de Dirección: ", font: "Arial", size: 14, bold: true, color: "1A493D" }),
            new TextRun({
              text: `Se recomienda concentrar la fuerza de prospección en los módulos de Atención Prioritaria (${priorityModules || "Ninguno"}), los cuales cuentan con tarifa atractiva y disponibilidad. Para los módulos en Reestructuración (${restructModules || "Ninguno"}), se aconseja evaluar la subdivisión en formatos menores (islas).`,
              font: "Arial",
              size: 13,
              color: "222222",
            }),
          ],
        }),
        new Paragraph({ spacing: { before: 60, after: 100 }, children: [new TextRun({ text: `Fecha de corte: ${formatDate(now)} · Fuente: SIGCO AIFA (Hoja ETP)`, font: "Arial", size: 13, color: "666666" })] }),
        new Table({
          width: { size: 14400, type: WidthType.DXA },
          layout: TableLayoutType.FIXED,
          columnWidths: [7200, 7200],
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

export function buildContractTimelineWordDocument(
  allRecords: LocalRecord[],
  contractRecords: LocalRecord[],
  logoData: Uint8Array,
  now: Date
): Document {


  const baseRecords = contractRecords.length > 0 ? contractRecords : allRecords;
  const sourceRecords = baseRecords.filter((r) => Boolean(r.contractSourceSheet || r.contractStage || r.contractNumber));

  const getContractRent = (c: ContractAggregate): number => {
    if (typeof c.monthlyRentVigente === "number" && c.monthlyRentVigente > 0) return c.monthlyRentVigente;
    if (typeof c.monthlyRent === "number" && c.monthlyRent > 0) return c.monthlyRent;
    let sumLocals = 0;
    for (const loc of c.locals) {
      sumLocals += loc.monthlyRentVigente ?? loc.monthlyRent ?? 0;
    }
    return sumLocals;
  };

  const getContractArea = (c: ContractAggregate): number => {
    return c.locals.reduce((sum: number, loc: LocalRecord) => sum + (typeof loc.metraje === "number" && loc.metraje > 0 ? loc.metraje : 0), 0);
  };

  const allContracts = buildContracts(sourceRecords);

  // Filter specifically for active contracts from GSC and GEP sheets (excluding cancelled & expired)
  const contracts = allContracts.filter((c) => {
    if (c.stage === "cancelled" || c.stage === "expired") return false;
    const sheetUpper = (c.sourceSheet ?? "").toUpperCase();
    if (sheetUpper.includes("CANCELAD") || sheetUpper.includes("FENECID")) return false;
    return true;
  });

  const expiredContracts = contracts.filter((c) => c.daysRemaining !== null && c.daysRemaining < 0);
  const criticalContracts = contracts.filter((c) => c.daysRemaining !== null && c.daysRemaining >= 0 && c.daysRemaining <= 30);
  const watchContracts = contracts.filter((c) => c.daysRemaining !== null && c.daysRemaining > 30 && c.daysRemaining <= 60);
  const preventiveContracts = contracts.filter((c) => c.daysRemaining !== null && c.daysRemaining > 60 && c.daysRemaining <= 90);
  const safeContracts = contracts.filter((c) => c.daysRemaining !== null && c.daysRemaining > 90);
  const undeterminedContracts = contracts.filter((c) => c.daysRemaining === null);

  const totalContractsCount = contracts.length;
  const currencyFmt = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

  const calcContractStats = (list: ContractAggregate[]) => ({
    count: list.length,
    pct: totalContractsCount > 0 ? ((list.length / totalContractsCount) * 100).toFixed(1) : "0.0",
    area: list.reduce((sum, c) => sum + getContractArea(c), 0),
    rent: list.reduce((sum, c) => sum + getContractRent(c), 0),
  });

  const expiredStats = calcContractStats(expiredContracts);
  const criticalStats = calcContractStats(criticalContracts);
  const watchStats = calcContractStats(watchContracts);
  const preventiveStats = calcContractStats(preventiveContracts);
  const safeStats = calcContractStats(safeContracts);
  const undeterminedStats = calcContractStats(undeterminedContracts);
  const grandTotalStats = calcContractStats(contracts);

  const horizonRows = [
    ...(expiredStats.count > 0
      ? [{ label: "Vigencia Vencida (< 0 días)", status: "🟣 Vencido", stats: expiredStats, fill: "FDF2F2" }]
      : []),
    { label: "Vencimiento Inmediato (0 a 30 días)", status: "🔴 Crítico", stats: criticalStats, fill: "FDF2F2" },
    { label: "Atención Comercial (31 a 60 días)", status: "🟡 Atención", stats: watchStats, fill: "FEFCE8" },
    { label: "Alerta Preventiva (61 a 90 días)", status: "🔵 Preventivo", stats: preventiveStats, fill: "EFF6FF" },
    { label: "Planificación Continuada (> 90 días)", status: "🟢 Vigente", stats: safeStats, fill: "F0FDF4" },
    ...(undeterminedStats.count > 0
      ? [{ label: "Vigencia por Determinar (Sin fecha)", status: "⚪ Indeterminado", stats: undeterminedStats, fill: "F9FAFB" }]
      : []),
  ];

  const textCell = (
    text: string | number,
    options: {
      width: number;
      fill?: string;
      color?: string;
      bold?: boolean;
      size?: number;
      alignment?: typeof AlignmentType[keyof typeof AlignmentType];
    }
  ) =>
    new TableCell({
      width: { size: options.width, type: WidthType.DXA },
      shading: options.fill ? { type: ShadingType.CLEAR, color: "auto", fill: options.fill } : undefined,
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 80, bottom: 80, left: 60, right: 60 },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" },
        left: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" },
        right: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" },
      },
      children: [
        new Paragraph({
          alignment: options.alignment ?? AlignmentType.CENTER,
          spacing: { before: 0, after: 0, line: 220 },
          children: [
            new TextRun({
              text: String(text),
              font: "Arial",
              size: options.size ?? 12,
              bold: options.bold,
              color: options.color ?? "111111",
            }),
          ],
        }),
      ],
    });

  const signatureCell = (role: string, name: string, position: string) =>
    new TableCell({
      width: { size: 4680, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: "FAFAFA" },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 120, bottom: 120, left: 100, right: 100 },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: "CDB28D" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "CDB28D" },
        left: { style: BorderStyle.SINGLE, size: 4, color: "CDB28D" },
        right: { style: BorderStyle.SINGLE, size: 4, color: "CDB28D" },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 40 },
          children: [new TextRun({ text: role, font: "Arial", size: 12, bold: true, color: "6F1131" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 180, after: 40 },
          children: [new TextRun({ text: "____________________________________", font: "Arial", size: 12, color: "888888" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 20 },
          children: [new TextRun({ text: name, font: "Arial", size: 12, bold: true, color: "111111" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          children: [new TextRun({ text: position, font: "Arial", size: 11, color: "555555" })],
        }),
      ],
    });

  const horizonTableRows = horizonRows.map((hr) =>
    new TableRow({
      cantSplit: true,
      children: [
        textCell(hr.label, { width: 2600, fill: hr.fill, bold: true, alignment: AlignmentType.LEFT }),
        textCell(hr.status, { width: 1600, fill: hr.fill, bold: true }),
        textCell(hr.stats.count, { width: 1100, fill: hr.fill }),
        textCell(`${hr.stats.pct}%`, { width: 1000, fill: hr.fill }),
        textCell(`${hr.stats.area.toFixed(2)} m²`, { width: 1400, fill: hr.fill }),
        textCell(currencyFmt.format(hr.stats.rent), { width: 1660, fill: hr.fill, bold: true, alignment: AlignmentType.RIGHT }),
      ],
    })
  );

  const horizonTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [2600, 1600, 1100, 1000, 1400, 1660],
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: [
          textCell("Horizonte de Vencimiento", { width: 2600, fill: "CDB28D", bold: true, size: 12, alignment: AlignmentType.LEFT }),
          textCell("Nivel Alerta", { width: 1600, fill: "CDB28D", bold: true, size: 12 }),
          textCell("Contratos", { width: 1100, fill: "CDB28D", bold: true, size: 12 }),
          textCell("% Total", { width: 1000, fill: "CDB28D", bold: true, size: 12 }),
          textCell("Superficie", { width: 1400, fill: "CDB28D", bold: true, size: 12 }),
          textCell("Renta Mensual", { width: 1660, fill: "CDB28D", bold: true, size: 12, alignment: AlignmentType.RIGHT }),
        ],
      }),
      ...horizonTableRows,
      new TableRow({
        cantSplit: true,
        children: [
          textCell("TOTAL CONSOLIDADO", { width: 2600, fill: "6F1131", color: "FFFFFF", bold: true, size: 12, alignment: AlignmentType.LEFT }),
          textCell("GENERAL", { width: 1600, fill: "6F1131", color: "FFFFFF", bold: true, size: 12 }),
          textCell(grandTotalStats.count, { width: 1100, fill: "EFEAE2", bold: true, size: 12 }),
          textCell("100.0%", { width: 1000, fill: "EFEAE2", bold: true, size: 12 }),
          textCell(`${grandTotalStats.area.toFixed(2)} m²`, { width: 1400, fill: "EFEAE2", bold: true, size: 12 }),
          textCell(currencyFmt.format(grandTotalStats.rent), { width: 1660, fill: "EFEAE2", bold: true, size: 12, alignment: AlignmentType.RIGHT }),
        ],
      }),
    ],
  });

  const expiringContracts = contracts
    .filter((c) => c.daysRemaining !== null && c.daysRemaining <= 90)
    .sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0));

  const detailedRows = expiringContracts.map((c) => {
    const days = c.daysRemaining ?? 0;
    const score = c.score.score;
    const rent = getContractRent(c);
    let strategy = "🔵 Auditoría Preventiva";
    let fill = "FFFFFF";

    if (days < 0) {
      fill = "FDF2F2";
      strategy = score < 60 ? "🟣 Regularización / Recuperación" : "🟣 Convenio Extemporáneo";
    } else if (days <= 30) {
      fill = "FDF2F2";
      strategy = score < 60 ? "🔴 Recuperación / No Renovar" : "🔴 Firma Urgente Convenio";
    } else if (days <= 60) {
      fill = "FEFCE8";
      strategy = score >= 75 ? "🟡 Renovación Prioritaria AAA" : "🟡 Renovación Condicionada";
    } else {
      fill = "EFF6FF";
      strategy = score >= 75 ? "🔵 Emisión Pre-dictamen OK" : "🔵 Evaluación de Garantía";
    }

    const daysText = days < 0 ? `Vencido hace ${Math.abs(days)}d` : days === 0 ? "Vence hoy" : `${days} días`;

    return new TableRow({
      cantSplit: true,
      children: [
        textCell(c.contractNumber ?? "Pre-formalizado", { width: 1400, fill, bold: true, size: 11, alignment: AlignmentType.LEFT }),
        textCell(c.brand || c.razonSocial || "Sin marca", { width: 1700, fill, size: 11, alignment: AlignmentType.LEFT }),
        textCell(c.locationName || c.zonaComercial || "General", { width: 1300, fill, size: 11, alignment: AlignmentType.LEFT }),
        textCell(c.renewalDate || "Sin fecha", { width: 1100, fill, size: 11 }),
        textCell(daysText, { width: 800, fill, bold: true, size: 11 }),
        textCell(currencyFmt.format(rent), { width: 1360, fill, bold: true, size: 11, alignment: AlignmentType.RIGHT }),
        textCell(`${score} pts`, { width: 600, fill, bold: true, size: 11 }),
        textCell(strategy, { width: 1100, fill, bold: true, size: 11, alignment: AlignmentType.LEFT }),
      ],
    });
  });

  const detailedTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [1400, 1700, 1300, 1100, 800, 1360, 600, 1100],
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: [
          textCell("Contrato", { width: 1400, fill: "CDB28D", bold: true, size: 11, alignment: AlignmentType.LEFT }),
          textCell("Arrendatario / Marca", { width: 1700, fill: "CDB28D", bold: true, size: 11, alignment: AlignmentType.LEFT }),
          textCell("Zona Comercial", { width: 1300, fill: "CDB28D", bold: true, size: 11, alignment: AlignmentType.LEFT }),
          textCell("Vencimiento", { width: 1100, fill: "CDB28D", bold: true, size: 11 }),
          textCell("Días", { width: 800, fill: "CDB28D", bold: true, size: 11 }),
          textCell("Renta Mensual", { width: 1360, fill: "CDB28D", bold: true, size: 11, alignment: AlignmentType.RIGHT }),
          textCell("Score", { width: 600, fill: "CDB28D", bold: true, size: 11 }),
          textCell("Estrategia Sugerida", { width: 1100, fill: "CDB28D", bold: true, size: 11, alignment: AlignmentType.LEFT }),
        ],
      }),
      ...(detailedRows.length > 0
        ? detailedRows
        : [
            new TableRow({
              children: [
                new TableCell({
                  columnSpan: 8,
                  width: { size: 9360, type: WidthType.DXA },
                  shading: { type: ShadingType.CLEAR, color: "auto", fill: "F8F6F1" },
                  verticalAlign: VerticalAlign.CENTER,
                  margins: { top: 80, bottom: 80, left: 60, right: 60 },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" },
                    bottom: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" },
                    left: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" },
                    right: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" },
                  },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 0, after: 0, line: 220 },
                      children: [
                        new TextRun({
                          text: "No se detectan contratos próximos a vencer (≤ 90 días) ni vencidos. Todos se encuentran al corriente.",
                          font: "Arial",
                          size: 12,
                          color: "111111",
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ]),
    ],
  });

  const noBorder = { style: BorderStyle.NIL, size: 0, color: "FFFFFF" };
  const noBorders = {
    top: noBorder,
    bottom: noBorder,
    left: noBorder,
    right: noBorder,
  };

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
              children: logoData.length > 0 ? [new ImageRun({ data: logoData, type: "png", transformation: { width: 142, height: 80 }, altText: { title: "AIFA", description: "Logotipo del Aeropuerto Internacional Felipe Ángeles", name: "AIFA" } })] : [new TextRun({ text: "AIFA", font: "Arial", size: 16, bold: true, color: "6F1131" })],
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

  return new Document({
    title: REPORT_TITLE_CONTRACT_TIMELINE,
    description: "Cronograma de vencimientos contractuales a 30, 60 y 90 días con dictamen preventivo.",
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT, width: 12240, height: 15840 },
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134, header: 360, footer: 360 },
          },
        },
        headers: { default: header },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 140, line: 260 },
            children: [
              new TextRun({ text: REPORT_TITLE_CONTRACT_TIMELINE.toUpperCase(), font: "Arial", size: 18, bold: true, color: "122E3B" }),
            ],
          }),
          new Paragraph({
            spacing: { before: 40, after: 100 },
            children: [
              new TextRun({ text: "Supervisión Preventiva de Cartera: ", font: "Arial", size: 13, bold: true, color: "6F1131" }),
              new TextRun({
                text: `Se analizan ${contracts.length} contratos vigentes. Se detectan ${expiringContracts.length} contratos con vencimiento inmediato o próximo (≤ 90 días), amparando una renta mensual acumulada de ${currencyFmt.format(expiringContracts.reduce((sum, c) => sum + getContractRent(c), 0))}.`,
                font: "Arial",
                size: 12,
                italics: true,
                color: "444444",
              }),
            ],
          }),
          ...(expiredStats.count > 0
            ? [
                new Paragraph({
                  bullet: { level: 0 },
                  spacing: { after: 40, line: 220 },
                  children: [
                    new TextRun({ text: "🟣 Vigencia Vencida (< 0 días): ", font: "Arial", size: 12, bold: true, color: "7C3AED" }),
                    new TextRun({ text: `${expiredStats.count} contratos (${expiredStats.area.toFixed(2)} m²) amparando `, font: "Arial", size: 12 }),
                    new TextRun({ text: `${currencyFmt.format(expiredStats.rent)}/mes`, font: "Arial", size: 12, bold: true, color: "7C3AED" }),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40, line: 220 },
            children: [
              new TextRun({ text: "🔴 Vencimiento Inmediato (0 a 30 días): ", font: "Arial", size: 12, bold: true, color: "941838" }),
              new TextRun({ text: `${criticalStats.count} contratos (${criticalStats.area.toFixed(2)} m²) amparando `, font: "Arial", size: 12 }),
              new TextRun({ text: `${currencyFmt.format(criticalStats.rent)}/mes`, font: "Arial", size: 12, bold: true, color: "941838" }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40, line: 220 },
            children: [
              new TextRun({ text: "🟡 Atención Comercial (31 a 60 días): ", font: "Arial", size: 12, bold: true, color: "B56D16" }),
              new TextRun({ text: `${watchStats.count} contratos (${watchStats.area.toFixed(2)} m²) amparando `, font: "Arial", size: 12 }),
              new TextRun({ text: `${currencyFmt.format(watchStats.rent)}/mes`, font: "Arial", size: 12, bold: true, color: "B56D16" }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40, line: 220 },
            children: [
              new TextRun({ text: "🔵 Alerta Preventiva (61 a 90 días): ", font: "Arial", size: 12, bold: true, color: "1E40AF" }),
              new TextRun({ text: `${preventiveStats.count} contratos (${preventiveStats.area.toFixed(2)} m²) amparando `, font: "Arial", size: 12 }),
              new TextRun({ text: `${currencyFmt.format(preventiveStats.rent)}/mes`, font: "Arial", size: 12, bold: true, color: "1E40AF" }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: undeterminedStats.count > 0 ? 40 : 120, line: 220 },
            children: [
              new TextRun({ text: "🟢 Planificación Continuada (> 90 días): ", font: "Arial", size: 12, bold: true, color: "15803D" }),
              new TextRun({ text: `${safeStats.count} contratos (${safeStats.area.toFixed(2)} m²) amparando `, font: "Arial", size: 12 }),
              new TextRun({ text: `${currencyFmt.format(safeStats.rent)}/mes`, font: "Arial", size: 12, bold: true, color: "15803D" }),
            ],
          }),
          ...(undeterminedStats.count > 0
            ? [
                new Paragraph({
                  bullet: { level: 0 },
                  spacing: { after: 120, line: 220 },
                  children: [
                    new TextRun({ text: "⚪ Vigencia por Determinar (Sin fecha): ", font: "Arial", size: 12, bold: true, color: "6B7280" }),
                    new TextRun({ text: `${undeterminedStats.count} contratos (${undeterminedStats.area.toFixed(2)} m²) amparando `, font: "Arial", size: 12 }),
                    new TextRun({ text: `${currencyFmt.format(undeterminedStats.rent)}/mes`, font: "Arial", size: 12, bold: true, color: "6B7280" }),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            spacing: { before: 60, after: 80 },
            children: [new TextRun({ text: "Tabla 1. Resumen Ejecutivo por Horizonte de Vencimiento", font: "Arial", size: 14, bold: true, color: "6F1131" })],
          }),
          horizonTable,
          new Paragraph({
            spacing: { before: 140, after: 80 },
            children: [new TextRun({ text: "Tabla 2. Matriz Cronológica Detallada de Vencimientos (≤ 90 Días)", font: "Arial", size: 14, bold: true, color: "6F1131" })],
          }),
          detailedTable,
          new Paragraph({
            spacing: { before: 140, after: 60 },
            children: [new TextRun({ text: "Dictamen Estratégico y Hoja de Ruta Operativa", font: "Arial", size: 16, bold: true, color: "6F1131" })],
          }),
          ...(expiredContracts.length > 0
            ? [
                new Paragraph({
                  bullet: { level: 0 },
                  alignment: AlignmentType.JUSTIFIED,
                  spacing: { after: 75, line: 250 },
                  children: [
                    new TextRun({
                      text: `Iniciar procedimiento de regularización jurídica, suscripción extemporánea de convenio o finiquito para los ${expiredContracts.length} contratos con vigencia vencida (< 0 días), amparando ${currencyFmt.format(expiredStats.rent)}/mes.`,
                      font: "Arial",
                      size: 13,
                    }),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            bullet: { level: 0 },
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 75, line: 250 },
            children: [
              new TextRun({
                text: `Priorizar la renovación y firma de convenio para los ${criticalContracts.length} contratos en zona crítica (0 a 30 días), los cuales representan una renta de ${currencyFmt.format(criticalStats.rent)}/mes. En caso de no renovación, iniciar el protocolo de recepción física del local para minimizar vacancia.`,
                font: "Arial",
                size: 13,
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 75, line: 250 },
            children: [
              new TextRun({
                text: `Emitir notificaciones formales de actualización de tarifa y fianza para los ${watchContracts.length} contratos en horizonte de 31 a 60 días (${currencyFmt.format(watchStats.rent)}/mes) con Score superior a 75 pts.`,
                font: "Arial",
                size: 13,
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 75, line: 250 },
            children: [
              new TextRun({
                text: `Revisar el estado de pólizas de Seguro R.C. y fianzas de los ${preventiveContracts.length} contratos en horizonte preventivo de 61 a 90 días (${currencyFmt.format(preventiveStats.rent)}/mes).`,
                font: "Arial",
                size: 13,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 100, after: 140 },
            children: [new TextRun({ text: `Fecha de emisión: ${formatDate(now)} · Fuente: Módulo de Contratos SIGCO AIFA`, font: "Arial", size: 12, color: "666666" })],
          }),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            layout: TableLayoutType.FIXED,
            columnWidths: [4680, 4680],
            rows: [
              new TableRow({
                cantSplit: true,
                children: [
                  signatureCell("Emitió:", "Joel Mejia Guevara", "Auxiliar Administrativo"),
                  signatureCell("Autorizó:", "Eduardo Arturo Alvarado Espinosa", "Especialista en Atención a Usuarios"),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });
}



export const REPORT_TITLE_ZONE_ANALYTICS = "Dictamen Analítico y Diagnóstico Comercial";

export function buildZoneAnalyticsWordDocument(
  locationId: string,
  allRecords: LocalRecord[],
  logoData: Uint8Array,
  now: Date
): Document {
  const isAll = locationId === "all";
  const selectedLocation = isAll
    ? { id: "all", shortName: "Todas las zonas comerciales", name: "Todas las zonas comerciales" }
    : (locationOptions.find((location) => location.id === locationId) ?? locationOptions[0]);
  
  const records = isAll
    ? allRecords
    : allRecords.filter((record) => {
        const zone = getSscZone(record);
        const locId = record.contractLocationId ?? (record as any).locationId ?? "";
        return zone === selectedLocation.name || locId === locationId || locId === selectedLocation.shortName;
      });

  const availableRecords = records.filter((record) => record.estatus === "DISPONIBLE");
  const operatingRecords = records.filter((record) => record.estatus === "EN FUNCIONAMIENTO");
  const availableCount = availableRecords.length;
  const availableArea = availableRecords.reduce((sum, record) => sum + (record.metraje ?? 0), 0);
  const totalArea = records.reduce((sum, record) => sum + (record.metraje ?? 0), 0);
  const recordedAreas = records.map((record) => record.metraje).filter((value): value is number => value !== null && value > 0);
  const generalAverage = recordedAreas.length ? recordedAreas.reduce((sum, value) => sum + value, 0) / recordedAreas.length : null;
  const calculateMedian = (values: number[]) => {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const generalMedian = calculateMedian(recordedAreas);
  const averageMedianGap = generalAverage !== null && generalMedian !== null && generalMedian > 0 ? (generalAverage / generalMedian - 1) * 100 : null;
  const operatingAreas = operatingRecords.map((record) => record.metraje).filter((value): value is number => value !== null && value > 0);
  const availableAreas = availableRecords.map((record) => record.metraje).filter((value): value is number => value !== null && value > 0);
  const operatingAverage = operatingAreas.length ? operatingAreas.reduce((sum, value) => sum + value, 0) / operatingAreas.length : null;
  const availableAverage = availableAreas.length ? availableAreas.reduce((sum, value) => sum + value, 0) / availableAreas.length : null;
  const formatRatio = operatingAverage && availableAverage ? availableAverage / operatingAverage : null;
  
  const normalizeLocal = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  
  const validBrandedRecords = records.filter((record) => {
    const brand = normalizeLocal(record.marca).trim();
    return brand && !["n/a", "na", "sin marca", "por definir", "ninguno", "-", "pendiente"].includes(brand);
  });
  const brandsByArea = new Map<string, { label: string; area: number }>();
  validBrandedRecords.forEach((record) => {
    const id = normalizeLocal(record.marca).trim();
    const current = brandsByArea.get(id) ?? { label: record.marca!.trim(), area: 0 };
    current.area += record.metraje ?? 0;
    brandsByArea.set(id, current);
  });
  const occupiedRecords = records.filter((record) =>
    ["EN FUNCIONAMIENTO", "EN ADAPTACION", "FORMALIZADO"].includes(record.estatus) || validBrandedRecords.includes(record),
  );
  const occupiedArea = occupiedRecords.reduce((sum, record) => sum + (record.metraje ?? 0), 0);
  const topThreeBrands = [...brandsByArea.values()].sort((a, b) => b.area - a.area).slice(0, 3);
  const topThreeArea = topThreeBrands.reduce((sum, brand) => sum + brand.area, 0);
  const topThreeShare = occupiedArea > 0 && topThreeBrands.length ? (topThreeArea / occupiedArea) * 100 : null;
  
  const operatingBrands = new Set(validBrandedRecords.filter((record) => record.estatus === "EN FUNCIONAMIENTO").map((record) => normalizeLocal(record.marca).trim()));
  const brandLocationCounts = new Map<string, { label: string; count: number }>();
  validBrandedRecords.forEach((record) => {
    const id = normalizeLocal(record.marca).trim();
    const current = brandLocationCounts.get(id) ?? { label: record.marca!.trim(), count: 0 };
    current.count += 1;
    brandLocationCounts.set(id, current);
  });
  const multiLocationRatio = brandLocationCounts.size ? validBrandedRecords.length / brandLocationCounts.size : null;
  const operatingBrandedRecords = validBrandedRecords.filter((record) => record.estatus === "EN FUNCIONAMIENTO");
  const operatingMultiLocationRatio = operatingBrands.size ? operatingBrandedRecords.length / operatingBrands.size : null;
  
  const giroGroups = new Map<string, number>();
  records.forEach((record) => {
    const giro = String(record.giroOperativo || "Sin giro identificado").trim() || "Sin giro identificado";
    giroGroups.set(giro, (giroGroups.get(giro) ?? 0) + 1);
  });
  const leadingGiros = [...giroGroups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const leadingGiroShare = records.length ? leadingGiros.slice(0, 2).reduce((sum, [, count]) => sum + count, 0) / records.length * 100 : null;

  const numberFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
  
  const analysis1 = generalAverage === null || generalMedian === null
          ? "No existen metrajes suficientes para calcular y explicar el tamaño promedio del inventario."
          : `El tamaño promedio de los espacios es de ${numberFormat.format(generalAverage)} m², frente a una mediana de ${numberFormat.format(generalMedian)} m². ${averageMedianGap !== null && averageMedianGap > 25 ? `La media es ${numberFormat.format(averageMedianGap)}% mayor que la mediana, señal inequívoca de que algunos locales de gran formato elevan el promedio y que el espacio habitual es más compacto de lo que sugiere la media.` : "La cercanía entre promedio y mediana indica una distribución relativamente uniforme de formatos."} ${multiLocationRatio === null ? "" : `Al cruzarlo con el Ratio multi-ubicación de ${numberFormat.format(multiLocationRatio)} locales por marca, el resultado es compatible con una oferta fragmentada en la que algunos operadores requieren más de una ubicación para reunir escala.`}`;

  const action1 = generalAverage !== null && generalMedian !== null && generalAverage / generalMedian > 1.5 ? "Planear conceptos compactos con la mediana y mapear espacios unificables para giros que requieran mayor infraestructura." : "Usar el promedio como referencia de formato y segmentar la colocación según requerimientos operativos.";

  const analysis2 = formatRatio === null || availableAverage === null || operatingAverage === null
          ? "Faltan metrajes suficientes para comparar el formato disponible con el que ya opera."
          : `Los ${availableAreas.length} espacios disponibles con metraje registrado promedian ${numberFormat.format(availableAverage)} m². El formato vacante es ${numberFormat.format(formatRatio)} veces el promedio operativo de ${numberFormat.format(operatingAverage)} m². ${formatRatio > 1.35 ? "La brecha muestra que el inventario pendiente de colocación es estructuralmente más amplio que el formato que ya opera; el reto principal es de escala y perfil de prospecto, no de cantidad de módulos." : "El tamaño disponible es comparable con el formato que ya opera, por lo que la barrera de colocación debe buscarse en ubicación, giro o condiciones comerciales."}`;

  const action2 = formatRatio !== null && formatRatio > 1.35
          ? "Prospectar operadores de gran formato y evaluar la viabilidad técnica y financiera de subdividir los espacios más amplios."
          : "Priorizar ubicación, giro y condiciones comerciales antes de modificar la superficie disponible.";

  const analysis3 = topThreeShare === null 
          ? "No existe superficie y marca suficientes para medir la concentración de los principales ocupantes."
          : `${topThreeShare <= 20 ? "El indicador muestra una alta diversificación y una baja dependencia espacial de las principales marcas." : topThreeShare <= 40 ? "El indicador muestra una concentración espacial moderada que requiere seguimiento." : "El indicador muestra una concentración espacial alta y una dependencia relevante de los principales ocupantes."} ${topThreeBrands.map((brand) => `${brand.label} ocupa ${numberFormat.format(brand.area)} m²`).join("; ")}. En conjunto representan ${numberFormat.format(topThreeArea)} de ${numberFormat.format(occupiedArea)} m² arrendados, equivalentes al ${numberFormat.format(topThreeShare)}% de la cartera ocupada. ${topThreeShare <= 20 ? "Esta distribución reduce el riesgo de que la salida de un solo operador genere una vacancia extensa." : "La salida de una de estas marcas podría generar una afectación visible en la ocupación y exige seguimiento individual."}`;
          
  const action3 = topThreeShare === null
          ? "Completar marca y metraje antes de evaluar la concentración."
          : topThreeShare > 40
            ? "Reducir exposición en nuevas asignaciones y revisar la continuidad de las tres marcas principales."
            : "Mantener la diversificación y monitorear la renovación de las tres marcas principales.";

  const analysis4 = operatingBrands.size
          ? `${operatingBrands.size} marcas únicas operan en ${operatingBrandedRecords.length} locales con marca identificada. Esto equivale a ${operatingMultiLocationRatio === null ? "una relación pendiente de cálculo" : `${numberFormat.format(operatingMultiLocationRatio)} ubicaciones operativas por marca`}. El conteo confirma diversidad de operadores.`
          : "No existen marcas en funcionamiento suficientemente identificadas para medir la diversidad operativa.";

  const action4 = operatingBrands.size ? "Conservar la diversidad y dirigir las vacantes a giros o conceptos subrepresentados." : "Completar marca y estatus antes de evaluar diversidad.";

  const analysis5 = leadingGiroShare === null || leadingGiros.length === 0
          ? "No existen registros suficientes con giro operativo definido."
          : `El giro principal es ${leadingGiros[0][0]} (${leadingGiros[0][1]} locales), seguido por ${leadingGiros[1]?.[0] ?? "ninguno"} (${leadingGiros[1]?.[1] ?? 0} locales). Conjuntamente representan el ${numberFormat.format(leadingGiroShare)}% de los locales. Esto refleja la demanda natural del área y marca la pauta para introducir giros complementarios que redondeen la oferta y generen compras cruzadas.`;

  const action5 = leadingGiros.length ? "Fomentar la atracción de giros distintos a los líderes para crear una oferta integral y reducir la canibalización." : "Clasificar el inventario por giro operativo para poder analizar el mix.";

  const header = new Header({
    children: [new Table({
      width: { size: 9360, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [2500, 3500, 3360],
      rows: [new TableRow({
        children: [
          new TableCell({
            width: { size: 2500, type: WidthType.DXA },
            borders: { top: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" } },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { after: 0 },
              children: logoData.length > 0 ? [new ImageRun({ data: logoData, type: "png", transformation: { width: 142, height: 80 }, altText: { title: "AIFA", description: "Logotipo", name: "AIFA" } })] : [new TextRun({ text: "AIFA", font: "Arial", size: 16, bold: true, color: "6F1131" })],
            })],
          }),
          new TableCell({
            width: { size: 3500, type: WidthType.DXA },
            borders: { top: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" } },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 0, line: 210 },
              children: [new TextRun({ text: "“2026, Año de Margarita Maza Parada”", font: "Arial", size: 18, bold: true, color: "111111" })],
            })],
          }),
          new TableCell({
            width: { size: 3360, type: WidthType.DXA },
            borders: { top: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NIL, size: 0, color: "FFFFFF" } },
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

  const sectionHeading = (text: string) => new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 14, bold: true, color: "6F1131" })],
  });

  const metricBlock = (title: string, value: string, badge: string, tone: "ok" | "watch" | "risk" | "info", analysis: string, action: string) => {
    let color = "1E40AF";
    let bg = "EFF6FF";
    if (tone === "ok") { color = "15803D"; bg = "F0FDF4"; }
    else if (tone === "watch") { color = "B56D16"; bg = "FEFCE8"; }
    else if (tone === "risk") { color = "941838"; bg = "FDF2F2"; }

    return [
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        columnWidths: [4680, 4680],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 4680, type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, color: "auto", fill: "FAFAFA" },
                borders: { top: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" }, left: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" }, right: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" } },
                margins: { top: 120, bottom: 120, left: 100, right: 100 },
                children: [
                  new Paragraph({ spacing: { before: 0, after: 40 }, children: [new TextRun({ text: title, font: "Arial", size: 12, color: "666666" })] }),
                  new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: value, font: "Arial", size: 18, bold: true, color: "111111" })] }),
                ]
              }),
              new TableCell({
                width: { size: 4680, type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, color: "auto", fill: bg },
                borders: { top: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" }, left: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" }, right: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" } },
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 120, bottom: 120, left: 100, right: 100 },
                children: [
                  new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: badge, font: "Arial", size: 14, bold: true, color })] })
                ]
              })
            ]
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 120, after: 80, line: 240 },
        children: [new TextRun({ text: analysis, font: "Arial", size: 12 })],
      }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 0, after: 240, line: 240 },
        children: [
          new TextRun({ text: "Acción Sugerida: ", font: "Arial", size: 12, bold: true, color: "444444" }),
          new TextRun({ text: action, font: "Arial", size: 12, italics: true, color: "444444" }),
        ],
      })
    ];
  };

  const signatureCell = (role: string, name: string, position: string) =>
    new TableCell({
      width: { size: 4680, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: "FAFAFA" },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 120, bottom: 120, left: 100, right: 100 },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: "CDB28D" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "CDB28D" },
        left: { style: BorderStyle.SINGLE, size: 4, color: "CDB28D" },
        right: { style: BorderStyle.SINGLE, size: 4, color: "CDB28D" },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 40 },
          children: [new TextRun({ text: role, font: "Arial", size: 12, bold: true, color: "6F1131" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 180, after: 40 },
          children: [new TextRun({ text: "____________________________________", font: "Arial", size: 12, color: "888888" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 20 },
          children: [new TextRun({ text: name, font: "Arial", size: 12, bold: true, color: "111111" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          children: [new TextRun({ text: position, font: "Arial", size: 11, color: "555555" })],
        }),
      ],
    });

  return new Document({
    title: REPORT_TITLE_ZONE_ANALYTICS,
    description: "Diagnóstico profundo de métricas operativas por zona comercial.",
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT, width: 12240, height: 15840 },
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134, header: 360, footer: 360 },
          },
        },
        headers: { default: header },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 140, line: 260 },
            children: [
              new TextRun({ text: "DICTAMEN ANALÍTICO Y DIAGNÓSTICO COMERCIAL:", font: "Arial", size: 16, color: "666666" }),
              new TextRun({ break: 1, text: selectedLocation.name.toUpperCase(), font: "Arial", size: 18, bold: true, color: "122E3B" }),
            ],
          }),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            layout: TableLayoutType.FIXED,
            columnWidths: [3120, 3120, 3120],
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: 3120, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: "auto", fill: "EFEAE2" }, borders: { top: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" }, left: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" }, right: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" } }, margins: { top: 100, bottom: 100, left: 100, right: 100 }, children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Superficie Total", font: "Arial", size: 11, color: "666666" })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${numberFormat.format(totalArea)} m²`, font: "Arial", size: 16, bold: true, color: "111111" })] }),
                  ] }),
                  new TableCell({ width: { size: 3120, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: "auto", fill: "EFEAE2" }, borders: { top: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" }, left: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" }, right: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" } }, margins: { top: 100, bottom: 100, left: 100, right: 100 }, children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Locales Totales", font: "Arial", size: 11, color: "666666" })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${records.length}`, font: "Arial", size: 16, bold: true, color: "111111" })] }),
                  ] }),
                  new TableCell({ width: { size: 3120, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: "auto", fill: "EFEAE2" }, borders: { top: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" }, left: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" }, right: { style: BorderStyle.SINGLE, size: 4, color: "DCD6CD" } }, margins: { top: 100, bottom: 100, left: 100, right: 100 }, children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Ocupación Física", font: "Arial", size: 11, color: "666666" })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: records.length ? `${numberFormat.format((operatingRecords.length / records.length) * 100)}%` : "0%", font: "Arial", size: 16, bold: true, color: "111111" })] }),
                  ] }),
                ]
              })
            ]
          }),
          sectionHeading("I. Dimensión y Formato Comercial Estándar"),
          ...metricBlock("Promedio vs Mediana", generalAverage ? `${numberFormat.format(generalAverage)} m² vs ${numberFormat.format(generalMedian!)} m²` : "Sin dato", "Formato Estándar", "info", analysis1, action1),
          
          sectionHeading("II. Diagnóstico de Vacancia y Escala Disponible"),
          ...metricBlock("Promedio Disponible", availableAverage ? `${numberFormat.format(availableAverage)} m²` : "Sin dato", formatRatio && formatRatio > 1.35 ? "Descalce de Escala" : "Formato Adecuado", formatRatio && formatRatio > 1.35 ? "watch" : "ok", analysis2, action2),
          
          sectionHeading("III. Concentración y Exposición Institucional"),
          ...metricBlock("Concentración Top 3", topThreeShare ? `${numberFormat.format(topThreeShare)}%` : "Sin dato", topThreeShare && topThreeShare > 40 ? "Riesgo Alto" : topThreeShare && topThreeShare > 20 ? "En Seguimiento" : "Diversificado", topThreeShare && topThreeShare > 40 ? "risk" : topThreeShare && topThreeShare > 20 ? "watch" : "ok", analysis3, action3),
          
          sectionHeading("IV. Diversificación Operativa y Marcas"),
          ...metricBlock("Ratio Multi-ubicación", multiLocationRatio ? `${numberFormat.format(multiLocationRatio)} locales/marca` : "Sin dato", "Oferta Activa", "info", analysis4, action4),
          
          sectionHeading("V. Tenant Mix y Giro Operativo"),
          ...metricBlock("Giro Dominante", leadingGiroShare ? `${leadingGiros[0][0]} (${numberFormat.format(leadingGiroShare)}%)` : "Sin dato", "Mezcla Comercial", "info", analysis5, action5),
          
          new Paragraph({
            spacing: { before: 100, after: 140 },
            children: [new TextRun({ text: `Fecha de emisión: ${formatDate(now)} · Fuente: Módulo de Análisis SIGCO AIFA`, font: "Arial", size: 12, color: "666666" })],
          }),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            layout: TableLayoutType.FIXED,
            columnWidths: [4680, 4680],
            rows: [
              new TableRow({
                cantSplit: true,
                children: [
                  signatureCell("Emitió:", "Joel Mejia Guevara", "Auxiliar Administrativo"),
                  signatureCell("Autorizó:", "Eduardo Arturo Alvarado Espinosa", "Especialista en Atención a Usuarios"),
                ],
              }),
            ],
          }),
        ],
      }
    ]
  });
}
