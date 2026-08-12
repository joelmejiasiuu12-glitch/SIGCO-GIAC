import {
  AlignmentType,
  BorderStyle,
  Document,
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

const PAGE_WIDTH = 10_490;
const BURGUNDY = "B5162D";
const NAVY = "1D2733";
const SLATE = "425466";
const MUTED = "687583";
const BORDER = "D7DDE3";
const LIGHT_BORDER = "E9EDF0";
const LIGHT = "F4F6F8";
const PALE_GREEN = "E4F3EF";
const GREEN = "008D78";
const ORANGE = "F28520";
const WHITE = "FFFFFF";
const LOGO_WIDTH_PX = 251; // 6.64 cm a 96 ppp
const LOGO_HEIGHT_PX = 43; // 1.15 cm a 96 ppp
const SECTION_GAP = 105;

const noBorder = { style: BorderStyle.NIL, size: 0, color: WHITE };
const thinBorder = { style: BorderStyle.SINGLE, size: 5, color: BORDER };
const lightBorder = { style: BorderStyle.SINGLE, size: 4, color: LIGHT_BORDER };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const cardBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const rowBorders = { top: noBorder, bottom: lightBorder, left: noBorder, right: noBorder };
type CellBorders = NonNullable<ConstructorParameters<typeof TableCell>[0]["borders"]>;

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX");
}

function text(value: unknown, fallback = "Sin dato") {
  const result = String(value ?? "").trim();
  return result || fallback;
}

function formatMoney(value: number | null) {
  if (value === null) return "Sin dato";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number | null) {
  if (value === null) return "Sin dato";
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null) return "No aplica / sin dato";
  return new Intl.NumberFormat("es-MX", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Sin dato";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function daysUntil(value: string | null) {
  if (!value) return null;
  const target = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.ceil((target.getTime() - utcToday) / 86_400_000);
}

function daysLabel(value: number | null) {
  if (value === null) return "Sin fecha de renovación";
  if (value < 0) return `Vencido hace ${Math.abs(value)} días`;
  if (value === 0) return "Vence hoy";
  return `${value} días restantes`;
}

function documentPending(value: string | null) {
  const key = normalize(value);
  return !key || key.includes("falta") || key.includes("pendiente") || key.includes("correccion") || key === "n/a";
}

function contractSituation(record: LocalRecord) {
  if (record.contractStatus) return record.contractStatus;
  if (record.contractNumber) return "Formalizado";
  if (record.contractPending) return "En preformalización";
  return "Sin situación contractual";
}

function documentationStatus(record: LocalRecord) {
  const values = [record.guaranteeStatus, record.liabilityPolicyStatus, record.projectStatus];
  const pending = values.filter(documentPending).length;
  return pending === 0 ? "Completa" : `${pending} pendiente${pending === 1 ? "" : "s"}`;
}

function run(value: string, size = 17, bold = false, color = NAVY) {
  return new TextRun({ text: value, font: "Arial", size, bold, color });
}

function line(value = "", options: {
  size?: number;
  bold?: boolean;
  color?: string;
  align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  before?: number;
  after?: number;
} = {}) {
  return new Paragraph({
    alignment: options.align ?? AlignmentType.LEFT,
    spacing: { before: options.before ?? 0, after: options.after ?? 0, line: 220 },
    children: [run(value, options.size ?? 17, options.bold ?? false, options.color ?? NAVY)],
  });
}

function labelValue(label: string, value: string, color = NAVY, valueSize = 17) {
  return [
    line(label.toLocaleUpperCase("es-MX"), { size: 12, bold: true, color: MUTED }),
    line(value, { size: valueSize, bold: true, color, before: 25 }),
  ];
}

function cell(width: number, children: (Paragraph | Table)[], options: {
  fill?: string;
  borders?: CellBorders;
  margins?: { top: number; bottom: number; left: number; right: number };
  columnSpan?: number;
} = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    columnSpan: options.columnSpan,
    shading: options.fill ? { type: ShadingType.CLEAR, color: "auto", fill: options.fill } : undefined,
    borders: options.borders ?? cardBorders,
    margins: options.margins ?? { top: 130, bottom: 130, left: 145, right: 145 },
    verticalAlign: VerticalAlign.CENTER,
    children,
  });
}

function table(widths: number[], rows: TableRow[]) {
  return new Table({
    width: { size: widths.reduce((total, width) => total + width, 0), type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: widths,
    rows,
  });
}

function spacer(height = 65) {
  return new Paragraph({ spacing: { before: 0, after: height }, children: [] });
}

function sectionHeading(number: string, title: string) {
  return new Paragraph({
    spacing: { before: 0, after: 80, line: 220 },
    children: [
      new TextRun({ text: ` ${number} `, font: "Arial", size: 15, bold: true, color: WHITE, shading: { type: ShadingType.CLEAR, color: "auto", fill: BURGUNDY } }),
      run(`   ${title}`, 18, true, SLATE),
    ],
  });
}

function signal(label: string, value: string, color = GREEN) {
  return table([1_900, 1_430], [new TableRow({
    cantSplit: true,
    children: [
      cell(1_900, [line(`●  ${label}`, { size: 15, bold: true, color })], { fill: PALE_GREEN, borders: noBorders, margins: { top: 110, bottom: 110, left: 120, right: 80 } }),
      cell(1_430, [line(value, { size: 15, bold: true, color, align: AlignmentType.RIGHT })], { fill: PALE_GREEN, borders: noBorders, margins: { top: 110, bottom: 110, left: 80, right: 120 } }),
    ],
  })]);
}

function buildFichaDocument(record: LocalRecord, records: LocalRecord[], logoData: Uint8Array, now: Date) {
  const consolidated = records.length > 1;
  const situation = contractSituation(record);
  const renewalDays = daysUntil(record.renewalDate);
  const docs = documentationStatus(record);
  const situationColor = normalize(situation).includes("formalizado") ? GREEN : ORANGE;
  const docsColor = docs === "Completa" ? GREEN : ORANGE;
  const operation = text(record.estatus, "Sin estatus operativo");
  const totalArea = records.reduce((total, local) => total + (local.metraje ?? 0), 0);
  const rents = records.map((local) => local.monthlyRent).filter((value): value is number => value !== null);
  const totalRent = rents.length ? rents.reduce((total, value) => total + value, 0) : null;
  const locationNames = [...new Set(records.map((local) => text(local.contractLocationName, "Zona no indicada")))];
  const location = locationNames.join(" · ");
  const contact = text(records.map((local) => local.contactData).find((value) => text(value, "") !== ""));
  const nomenclatures = records.map((local) => local.nomenclatura);
  const nomenclatureSummary = nomenclatures.length <= 5
    ? nomenclatures.join(", ")
    : `${nomenclatures.slice(0, 5).join(", ")} y ${nomenclatures.length - 5} más`;
  const mainIdentifier = consolidated ? `${records.length} LOCALES` : text(record.nomenclatura);
  const documentTitle = consolidated ? "FICHA EJECUTIVA DE CONTRATO" : "FICHA EJECUTIVA LOCAL Y CONTRATO";
  const participation = record.participationNotes
    ? `${formatPercent(record.participationRate)} · ${record.participationNotes}`
    : formatPercent(record.participationRate);

  const header = table([4_300, 6_190], [new TableRow({
    cantSplit: true,
    children: [
      cell(4_300, [new Paragraph({
        spacing: { after: 0 },
        children: [new ImageRun({
          data: logoData,
          type: "png",
          transformation: { width: LOGO_WIDTH_PX, height: LOGO_HEIGHT_PX },
          altText: { title: "AIFA", description: "Aeropuerto Internacional Felipe Ángeles", name: "AIFA" },
        })],
      })], { fill: LIGHT, borders: noBorders, margins: { top: 115, bottom: 115, left: 120, right: 120 } }),
      cell(6_190, [
        line("DIRECCIÓN COMERCIAL Y DE SERVICIOS", { size: 14, bold: true, color: SLATE, align: AlignmentType.RIGHT }),
        line("SUBDIRECCIÓN COMERCIAL", { size: 14, bold: true, color: SLATE, align: AlignmentType.RIGHT, before: 10 }),
        line("GRUPO DE INTELIGENCIA Y ANÁLISIS COMERCIAL", { size: 14, bold: true, color: SLATE, align: AlignmentType.RIGHT, before: 10 }),
      ], { fill: LIGHT, borders: noBorders, margins: { top: 115, bottom: 115, left: 120, right: 120 } }),
    ],
  })]);

  const identity = table([2_800, 4_300, 3_390], [new TableRow({
    cantSplit: true,
    children: [
      cell(2_800, labelValue(consolidated ? "Locales consolidados" : "Nomenclatura", mainIdentifier, BURGUNDY, consolidated ? 25 : 30), { margins: { top: 175, bottom: 175, left: 145, right: 145 } }),
      cell(4_300, [
        ...labelValue("Marca / empresa", text(record.marca, "Sin marca asignada"), NAVY, 24),
        line(`${text(record.commercialLine, text(record.giroOperativo, "Giro no registrado"))} · ${text(record.commercialSubline, "Sin subgiro")}`, { size: 14, color: MUTED, before: 20 }),
      ], { margins: { top: 175, bottom: 175, left: 145, right: 145 } }),
      cell(3_390, [
        line(`●  ${situation.toLocaleUpperCase("es-MX")}`, { size: 20, bold: true, color: situationColor, align: AlignmentType.CENTER }),
        line(`Actualización: ${new Intl.DateTimeFormat("es-MX").format(now)}`, { size: 13, color: MUTED, align: AlignmentType.CENTER, before: 35 }),
      ], { fill: situationColor === GREEN ? PALE_GREEN : "FFF0E2", margins: { top: 175, bottom: 175, left: 145, right: 145 } }),
    ],
  })]);

  const kpis = table([3_497, 3_497, 3_496], [new TableRow({
    cantSplit: true,
    children: [
      cell(3_497, [...labelValue(consolidated ? "Locales" : "Superficie", consolidated ? String(records.length) : record.metraje === null ? "Sin dato" : `${formatNumber(record.metraje)} m²`, SLATE, 24), line(consolidated ? "Locales relacionados" : "Metraje registrado", { size: 13, color: MUTED, before: 18 })], { margins: { top: 155, bottom: 155, left: 145, right: 145 } }),
      cell(3_497, [...labelValue(consolidated ? "Superficie total" : "Renta mensual + IVA", consolidated ? `${formatNumber(totalArea)} m²` : formatMoney(record.monthlyRent), GREEN, 24), line(consolidated ? "Suma de los locales" : "Monto contractual", { size: 13, color: MUTED, before: 18 })], { margins: { top: 155, bottom: 155, left: 145, right: 145 } }),
      cell(3_496, [...labelValue(consolidated ? "Renta mensual total" : "Renovación", consolidated ? formatMoney(totalRent) : formatDate(record.renewalDate), BURGUNDY, consolidated ? 21 : 22), line(consolidated ? `Renovación: ${formatDate(record.renewalDate)}` : daysLabel(renewalDays), { size: 13, color: MUTED, before: 18 })], { margins: { top: 155, bottom: 155, left: 145, right: 145 } }),
    ],
  })]);

  const locationFacts = consolidated ? [
    ["Ubicación", location, "Cantidad de locales", String(records.length)],
    ["Nomenclaturas", nomenclatureSummary, "Superficie total", `${formatNumber(totalArea)} m²`],
    ["Giro comercial", text(record.commercialLine), "Subgiro", text(record.commercialSubline)],
    ["Gestor", text(record.manager, "Sin asignar"), "Situación", situation],
  ] : [
    ["Ubicación", location, "Lado", text(record.lado)],
    ["Área", text(record.area), "Módulo", text(record.modulo)],
    ["Nivel", text(record.nivel), "Tipo de área", text(record.areaComercial)],
    ["Giro IATA", text(record.giroIata), "Giro operativo", text(record.giroOperativo)],
  ];
  const locationRows = locationFacts.map(([labelA, valueA, labelB, valueB]) => new TableRow({
    cantSplit: true,
    children: [
      cell(3_050, labelValue(labelA, valueA, NAVY, 15), { borders: rowBorders, margins: { top: 110, bottom: 110, left: 105, right: 105 } }),
      cell(3_050, labelValue(labelB, valueB, NAVY, 15), { borders: rowBorders, margins: { top: 110, bottom: 110, left: 105, right: 105 } }),
    ],
  }));

  const overview = table([6_600, 3_890], [new TableRow({
    cantSplit: true,
    children: [
      cell(6_600, [sectionHeading("1", consolidated ? "LOCALES CONSOLIDADOS" : "UBICACIÓN Y CLASIFICACIÓN"), table([3_050, 3_050], locationRows)], { margins: { top: 165, bottom: 155, left: 150, right: 150 } }),
      cell(3_890, [
        sectionHeading("2", "SEMÁFORO EJECUTIVO"),
        signal("Operación", operation),
        spacer(55),
        signal("Contrato", situation, situationColor),
        spacer(55),
        signal("Documentación", docs, docsColor),
      ], { margins: { top: 165, bottom: 155, left: 150, right: 150 } }),
    ],
  })]);

  const contractFacts = [
    ["No. de contrato", text(record.contractNumber, "Sin número")],
    ["Situación", situation],
    ["Giro comercial", text(record.commercialLine)],
    ["Subgiro comercial", text(record.commercialSubline)],
    ["Costo por m²", formatMoney(record.costPerM2)],
    ["Participación", participation],
    ["Inicio de operaciones", formatDate(record.operationsStartDate)],
    ["Firma de contrato", formatDate(record.signatureDate)],
    ["Vigencia", text(record.contractTerm)],
    ["Fecha de renovación", formatDate(record.renewalDate)],
    ["Días restantes", daysLabel(renewalDays)],
    ["Estatus de renta", record.monthlyRent === null ? "Sin dato" : "Vigente"],
  ];
  const contractRows = Array.from({ length: 3 }, (_, rowIndex) => new TableRow({
    cantSplit: true,
    children: contractFacts.slice(rowIndex * 4, rowIndex * 4 + 4).map(([label, value]) =>
      cell(2_510, labelValue(label, value, label === "Situación" || label === "Estatus de renta" ? GREEN : NAVY, 15), {
        borders: rowBorders,
        margins: { top: 90, bottom: 90, left: 100, right: 100 },
      }),
    ),
  }));
  const contractBlock = table([PAGE_WIDTH], [new TableRow({
    cantSplit: true,
    children: [cell(PAGE_WIDTH, [sectionHeading("3", "INFORMACIÓN CONTRACTUAL"), table([2_510, 2_510, 2_510, 2_510], contractRows)], { margins: { top: 165, bottom: 155, left: 150, right: 150 } })],
  })]);

  const followFacts = [
    ["Garantía de cumplimiento", text(record.guaranteeStatus), documentPending(record.guaranteeStatus) ? ORANGE : GREEN],
    ["Póliza de R.C.", text(record.liabilityPolicyStatus), documentPending(record.liabilityPolicyStatus) ? ORANGE : GREEN],
    ["Proyecto de obra", text(record.projectStatus), documentPending(record.projectStatus) ? ORANGE : GREEN],
    ["Datos de contacto", contact, NAVY],
    ["Gestor", text(record.manager, "Sin asignar"), NAVY],
    ["Próxima acción", docs === "Completa" ? "Seguimiento ordinario" : "Completar expediente", docs === "Completa" ? GREEN : ORANGE],
  ] as const;
  const followRows = Array.from({ length: 2 }, (_, rowIndex) => new TableRow({
    cantSplit: true,
    children: followFacts.slice(rowIndex * 3, rowIndex * 3 + 3).map(([label, value, color]) =>
      cell(3_340, labelValue(label, value, color, 15), { borders: rowBorders, margins: { top: 90, bottom: 90, left: 100, right: 100 } }),
    ),
  }));
  const observation = text(record.observaciones, "Sin observaciones relevantes registradas.");
  const followBlock = table([PAGE_WIDTH], [new TableRow({
    cantSplit: true,
    children: [cell(PAGE_WIDTH, [
      sectionHeading("4", "DOCUMENTACIÓN, RESPONSABLES Y SEGUIMIENTO"),
      table([3_340, 3_340, 3_340], followRows),
      new Paragraph({
        spacing: { before: 85, after: 0, line: 220 },
        children: [run("OBSERVACIONES RELEVANTES  ", 12, true, MUTED), run(observation, 15, false, NAVY)],
      }),
    ], { margins: { top: 165, bottom: 155, left: 150, right: 150 } })],
  })]);

  const footerRule = table([PAGE_WIDTH], [new TableRow({ children: [cell(PAGE_WIDTH, [line("")], { fill: BURGUNDY, borders: noBorders, margins: { top: 10, bottom: 10, left: 0, right: 0 } })] })]);
  const footer = table([7_600, 2_890], [new TableRow({
    cantSplit: true,
    children: [
      cell(7_600, [
        line("SIGCO · Sistema Integral de Gestión Comercial y Operativa", { size: 13, bold: true, color: SLATE }),
        line(`Fuente: ${text(record.contractSourceSheet, "base de datos SIGCO")} · Corte: ${new Intl.DateTimeFormat("es-MX").format(now)}`, { size: 11, color: MUTED, before: 10 }),
      ], { borders: noBorders, margins: { top: 60, bottom: 0, left: 0, right: 0 } }),
      cell(2_890, [
        line(consolidated ? "FICHA OFICIAL · CONTRATO" : "FICHA OFICIAL · LOCAL", { size: 13, bold: true, color: SLATE, align: AlignmentType.RIGHT }),
        line(consolidated ? text(record.contractNumber, "Sin número") : text(record.nomenclatura), { size: 11, color: MUTED, align: AlignmentType.RIGHT, before: 10 }),
      ], { borders: noBorders, margins: { top: 60, bottom: 0, left: 0, right: 0 } }),
    ],
  })]);

  return new Document({
    creator: "SIGCO (Sistema Integral de Gestión Comercial y Operativa)",
    title: consolidated ? `Ficha consolidada ${text(record.contractNumber, "sin número")}` : `Ficha ejecutiva ${text(record.nomenclatura)}`,
    description: consolidated ? "Ficha oficial consolidada del contrato y sus locales relacionados." : "Ficha oficial de consulta rápida del local y su información contractual.",
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 17, color: NAVY },
          paragraph: { spacing: { after: 0, line: 220 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { orientation: PageOrientation.PORTRAIT, width: 11_906, height: 16_838 },
          margin: { top: 500, right: 708, bottom: 500, left: 708, header: 200, footer: 200 },
        },
      },
      children: [
        header,
        spacer(55),
        line(documentTitle, { size: 29, bold: true, color: NAVY, after: 150 }),
        identity,
        spacer(SECTION_GAP),
        kpis,
        spacer(SECTION_GAP),
        overview,
        spacer(SECTION_GAP),
        contractBlock,
        spacer(SECTION_GAP),
        followBlock,
        spacer(75),
        footerRule,
        footer,
      ],
    }],
  });
}

export function buildLocalContractFicha(record: LocalRecord, logoData: Uint8Array, now: Date) {
  return buildFichaDocument(record, [record], logoData, now);
}

export function buildConsolidatedContractFicha(records: LocalRecord[], logoData: Uint8Array, now: Date) {
  if (!records.length) throw new Error("El contrato seleccionado no contiene locales relacionados.");
  return buildFichaDocument(records[0], records, logoData, now);
}
