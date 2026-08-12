"use client";

import { useState } from "react";
import readXlsxFile, { type CellValue, type SheetData } from "read-excel-file/browser";
import { locationOptions, type ContractStage, type LocalRecord } from "@/app/types";
import { isCommercialServicesEtpRecord } from "@/app/data/recordVisibility";

export type LocalWorkbookResult = {
  filename: string;
  datasets: Record<string, LocalRecord[]>;
  contractRecords: LocalRecord[];
  totalRecords: number;
  etpCommercialCapacity: number | null;
};

type ParsedField = keyof LocalRecord | "metrajeConstruido" | "daysRemaining" | "sourceZone";
type ParsedRow = Partial<Record<ParsedField, CellValue | null>>;
type ParsedLocation = {
  locationId: string;
  locationName: string;
  sheetName: string;
  records: LocalRecord[];
  errors: string[];
  notices: string[];
};

type ParsedWorkbook = {
  locations: ParsedLocation[];
  contractSheets: ParsedLocation[];
  etpCommercialCapacity: number | null;
  capacityMessage: string;
};

const sheetDefinitions = [
  { sheetName: "ETP", locationId: "etp" },
  { sheetName: "Pq. Sta. Lucía", locationId: "parque-santa-lucia" },
  { sheetName: "Edif. Svs.", locationId: "carga-aduana" },
  { sheetName: "TITT", locationId: "autobuses-plaza" },
  { sheetName: "Pq. Rev.", locationId: "parque-revolucion" },
  { sheetName: "Cd. Aeroportuaria", locationId: "ciudad-aeroportuaria" },
  { sheetName: "Calz. Mamuts", locationId: "calzada-mamuts" },
] as const;

const contractSheetDefinitions: { sheetName: string; stage: ContractStage }[] = [
  { sheetName: "Contratos Cancelados", stage: "cancelled" },
  { sheetName: "Contratos Fenecidos", stage: "expired" },
  { sheetName: "Convenios", stage: "agreements" },
];

const aliases: Record<string, ParsedField> = {
  nomenclatura: "nomenclatura",
  lado: "lado",
  area: "area",
  modulo: "modulo",
  metraje: "metraje",
  m2: "metraje",
  "metraje construido": "metrajeConstruido",
  "area comercial": "areaComercial",
  nivel: "nivel",
  estatus: "estatus",
  situacion: "situacion",
  "marca comercial": "marca",
  marca: "marca",
  empresa: "marca",
  "subdireccion encargada": "subdireccion",
  subdireccion: "subdireccion",
  gerencia: "gerencia",
  "giro iata": "giroIata",
  "giro operativo": "giroOperativo",
  "giro aci": "giroOperativo",
  giro: "giroOperativo",
  "giro indaabin": "giroIndaabin",
  observaciones: "observaciones",
  "fecha de formalizacion": "fechaFormalizacion",
  "fecha de conclusion": "fechaConclusion",
  "no contrato": "contractNumber",
  contrato: "contractNumber",
  "razon social": "marca",
  nombre: "marca",
  "giro comercial": "commercialLine",
  "subgiro comercial": "commercialSubline",
  "costo por m2": "costPerM2",
  "renta mensual iva": "monthlyRent",
  "renta mensual": "monthlyRent",
  "participacion": "participationRate",
  "fecha de inicio de operaciones": "operationsStartDate",
  "fecha de firma de contrato": "signatureDate",
  "vigencia del contrato": "contractTerm",
  vigencia: "contractTerm",
  "fecha de renovacion": "renewalDate",
  "dias restantes": "daysRemaining",
  "garantia de complimiento": "guaranteeStatus",
  "garantia de cumplimiento": "guaranteeStatus",
  "poliza de r c": "liabilityPolicyStatus",
  "proyecto de obra": "projectStatus",
  "situacion del contrato": "contractStatus",
  "datos de contacto": "contactData",
  gestor: "manager",
  zona: "sourceZone",
  "zona comercial": "sourceZone",
  ubicacion: "sourceZone",
};

function normalized(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function cellText(value: CellValue | null) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").trim();
}

function optionalText(value: CellValue | null) {
  const text = cellText(value);
  return !text
    || /^#?n\/?a\.?$/i.test(text)
    || /^#(?:error_#.*|value!|ref!|div\/0!|name\?|num!|null!|spill!|calc!)$/i.test(text)
    ? null
    : text;
}

function parseArea(value: CellValue | null) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = cellText(value);
  if (!text || /unidad/i.test(text)) return null;
  const normalizedNumber = text.includes(",") && !text.includes(".")
    ? text.replace(",", ".")
    : text.replaceAll(",", "");
  const number = Number(normalizedNumber.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function validatedIsoDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseExcelDate(value: CellValue | null) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return validatedIsoDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86_400_000);
    return validatedIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }
  const text = cellText(value);
  if (!text) return null;
  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(text);
  if (iso) return validatedIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const local = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (local) return validatedIsoDate(Number(local[3]), Number(local[2]), Number(local[1]));
  const spanishMonths: Record<string, number> = {
    ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4,
    may: 5, mayo: 5, jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8,
    sep: 9, sept: 9, septiembre: 9, oct: 10, octubre: 10, nov: 11, noviembre: 11,
    dic: 12, diciembre: 12,
  };
  const spanish = /^(\d{1,2})\s+([a-záéíóú]+)\.?\s+(\d{4})$/i.exec(text);
  if (!spanish) return null;
  const month = spanishMonths[normalized(spanish[2])];
  return month ? validatedIsoDate(Number(spanish[3]), month, Number(spanish[1])) : null;
}

function parseParticipation(value: CellValue | null) {
  if (typeof value === "number" && Number.isFinite(value)) return value > 1 && value <= 100 ? value / 100 : value;
  const text = optionalText(value);
  if (!text) return { rate: null, notes: null };
  const simplePercentage = /^(\d+(?:[.,]\d+)?)\s*%$/.exec(text);
  if (simplePercentage) return { rate: Number(simplePercentage[1].replace(",", ".")) / 100, notes: null };
  const simpleNumber = Number(text.replace(",", "."));
  if (Number.isFinite(simpleNumber)) return { rate: simpleNumber > 1 && simpleNumber <= 100 ? simpleNumber / 100 : simpleNumber, notes: null };
  const embedded = /(\d+(?:[.,]\d+)?)\s*%/.exec(text);
  return { rate: embedded ? Number(embedded[1].replace(",", ".")) / 100 : null, notes: text };
}

type ZipEntry = {
  compressionMethod: number;
  compressedSize: number;
  localHeaderOffset: number;
};

function findZipEntry(contents: ArrayBuffer, requestedPath: string): ZipEntry | null {
  const view = new DataView(contents);
  const bytes = new Uint8Array(contents);
  const minimumEocdOffset = Math.max(0, contents.byteLength - 65_557);
  let eocdOffset = -1;
  for (let offset = contents.byteLength - 22; offset >= minimumEocdOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("El archivo XLSX no contiene un directorio ZIP válido.");

  const entryCount = view.getUint16(eocdOffset + 10, true);
  let directoryOffset = view.getUint32(eocdOffset + 16, true);
  const decoder = new TextDecoder("utf-8");
  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(directoryOffset, true) !== 0x02014b50) {
      throw new Error("El directorio interno del XLSX no es válido.");
    }
    const compressionMethod = view.getUint16(directoryOffset + 10, true);
    const compressedSize = view.getUint32(directoryOffset + 20, true);
    const fileNameLength = view.getUint16(directoryOffset + 28, true);
    const extraLength = view.getUint16(directoryOffset + 30, true);
    const commentLength = view.getUint16(directoryOffset + 32, true);
    const localHeaderOffset = view.getUint32(directoryOffset + 42, true);
    const filename = decoder.decode(bytes.subarray(directoryOffset + 46, directoryOffset + 46 + fileNameLength));
    if (filename === requestedPath) return { compressionMethod, compressedSize, localHeaderOffset };
    directoryOffset += 46 + fileNameLength + extraLength + commentLength;
  }
  return null;
}

async function readZipText(contents: ArrayBuffer, requestedPath: string) {
  const entry = findZipEntry(contents, requestedPath);
  if (!entry) throw new Error(`No se encontró ${requestedPath} dentro del XLSX.`);
  const view = new DataView(contents);
  if (view.getUint32(entry.localHeaderOffset, true) !== 0x04034b50) {
    throw new Error("La entrada interna del XLSX no es válida.");
  }
  const fileNameLength = view.getUint16(entry.localHeaderOffset + 26, true);
  const extraLength = view.getUint16(entry.localHeaderOffset + 28, true);
  const dataOffset = entry.localHeaderOffset + 30 + fileNameLength + extraLength;
  const compressed = new Uint8Array(contents, dataOffset, entry.compressedSize);
  let output: Uint8Array;
  if (entry.compressionMethod === 0) {
    output = compressed;
  } else if (entry.compressionMethod === 8) {
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    output = new Uint8Array(await new Response(stream).arrayBuffer());
  } else {
    throw new Error("El XLSX usa un método de compresión no compatible.");
  }
  return new TextDecoder("utf-8").decode(output);
}

function resolveWorkbookTarget(target: string) {
  const parts = (target.startsWith("/") ? target.slice(1) : `xl/${target}`).split("/");
  const resolved: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") resolved.pop();
    else resolved.push(part);
  }
  return resolved.join("/");
}

async function readEtpCommercialCapacity(file: File) {
  const contents = await file.arrayBuffer();
  const workbook = new DOMParser().parseFromString(await readZipText(contents, "xl/workbook.xml"), "application/xml");
  const capacitySheet = [...workbook.getElementsByTagName("sheet")].find(
    (sheet) => normalized(sheet.getAttribute("name")) === normalized("Capacidad"),
  );
  if (!capacitySheet) return null;
  const relationshipId = capacitySheet.getAttribute("r:id")
    ?? capacitySheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
  if (!relationshipId) return null;

  const relationships = new DOMParser().parseFromString(
    await readZipText(contents, "xl/_rels/workbook.xml.rels"),
    "application/xml",
  );
  const relationship = [...relationships.getElementsByTagName("Relationship")].find(
    (item) => item.getAttribute("Id") === relationshipId,
  );
  const target = relationship?.getAttribute("Target");
  if (!target) return null;

  const worksheet = new DOMParser().parseFromString(
    await readZipText(contents, resolveWorkbookTarget(target)),
    "application/xml",
  );
  const cellD2 = [...worksheet.getElementsByTagName("c")].find(
    (cell) => cell.getAttribute("r")?.toLocaleUpperCase("es-MX") === "D2",
  );
  const cachedValue = cellD2?.getElementsByTagName("v")[0]?.textContent ?? null;
  return parseArea(cachedValue);
}

function parseLevel(value: CellValue | null, fallback: string) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = cellText(value);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && /^-?\d+(?:\.\d+)?$/.test(raw) ? parsed : raw;
}

function canonicalStatus(value: CellValue | null) {
  const key = normalized(value);
  const statuses: Record<string, string> = {
    disponible: "DISPONIBLE",
    "en funcionamiento": "EN FUNCIONAMIENTO",
    "en proceso de asignacion": "EN PROCESO DE ASIGNACION",
    formalizado: "FORMALIZADO",
    "en adaptacion": "EN ADAPTACION",
  };
  return statuses[key] ?? cellText(value).toLocaleUpperCase("es-MX");
}

function structuralDefaults(locationId: string, raw: ParsedRow) {
  const level = cellText(raw.nivel ?? null);
  if (locationId === "parque-santa-lucia") {
    return { lado: "Parque Santa Lucía", area: "Centro comercial", modulo: level || "Centro comercial", nivel: parseLevel(raw.nivel ?? null, "Sin nivel") };
  }
  if (locationId === "carga-aduana") {
    return { lado: "Edificio de Servicios", area: "Edificio de Servicios", modulo: level || "Edificio de Servicios", nivel: parseLevel(raw.nivel ?? null, "Sin nivel") };
  }
  if (locationId === "autobuses-plaza") {
    const lado = /plaza mexicana/i.test(level)
      ? "Plaza Mexicana"
      : /tren suburbano/i.test(level)
        ? "Tren Suburbano"
        : "Terminal de Autobuses";
    return { lado, area: "Zona pública", modulo: lado, nivel: parseLevel(raw.nivel ?? null, "Sin nivel") };
  }
  if (locationId === "parque-revolucion") {
    return { lado: "Parque Revolución", area: "Glorieta Felipe Ángeles", modulo: "Glorieta", nivel: "Sin nivel" };
  }
  if (locationId === "ciudad-aeroportuaria") {
    return { lado: "Ciudad Aeroportuaria", area: "Primera fase", modulo: "Manzana", nivel: "Terreno" };
  }
  if (locationId === "calzada-mamuts") {
    return { lado: "Calzada de los Mamuts", area: "Corredor comercial", modulo: "CM", nivel: "Terreno" };
  }
  return { lado: "Sin dato", area: "Sin dato", modulo: "Sin dato", nivel: parseLevel(raw.nivel ?? null, "Sin nivel") };
}

function inferSpaceType(locationId: string, nomenclatura: string, giro: string) {
  const searchable = `${normalized(nomenclatura)} ${normalized(giro)}`;
  if (/cajero|atm/.test(searchable)) return "Cajero";
  if (/bodega/.test(searchable)) return "Bodega";
  if (/oficina/.test(searchable)) return "Oficina";
  if (/publicidad|publicitario/.test(searchable)) return "Espacio publicitario";
  if (/hotel/.test(searchable)) return "Hotel";
  if (/maquina|vending/.test(searchable)) return "Máquina de autoservicio";
  if (locationId === "ciudad-aeroportuaria") return "Manzana";
  if (locationId === "calzada-mamuts") return "Predio";
  return "Local";
}

function parseRows(rows: SheetData, locationId: string, sheetName: string, contractStage: ContractStage | null = null) {
  const isContractSheet = contractStage !== null;
  const headerIndex = rows.slice(0, 15).findIndex((row) => {
    const titles = row.map(normalized);
    return isContractSheet
      ? titles.some((title) => aliases[title] === "nomenclatura" || aliases[title] === "contractNumber" || aliases[title] === "marca")
      : titles.includes("nomenclatura") && titles.includes("estatus");
  });
  if (headerIndex < 0) throw new Error(`La hoja “${sheetName}” no contiene encabezados contractuales reconocibles.`);

  const headers = rows[headerIndex].map((cell) => aliases[normalized(cell)] ?? null);
  const required: ParsedField[] = isContractSheet
    ? []
    : locationId === "etp"
    ? ["nomenclatura", "estatus", "subdireccion"]
    : ["nomenclatura", "estatus"];
  const missing = required.filter((field) => !headers.includes(field));
  if (missing.length) throw new Error(`La hoja “${sheetName}” no contiene: ${missing.join(", ")}.`);

  const records: LocalRecord[] = [];
  const seen = new Set<string>();
  const errors: string[] = [];
  const notices: string[] = [];
  rows.slice(headerIndex + 1).forEach((row, rowIndex) => {
    const raw: ParsedRow = {};
    headers.forEach((field, columnIndex) => { if (field) raw[field] = row[columnIndex] ?? null; });
    const contractIdentity = optionalText(raw.contractNumber ?? null);
    const brandIdentity = optionalText(raw.marca ?? null);
    if (isContractSheet && contractStage !== "agreements" && (!contractIdentity || /^\d{4}$/.test(contractIdentity))) return;
    const nomenclatura = cellText(raw.nomenclatura ?? null) || contractIdentity || brandIdentity || "";
    if (!nomenclatura || normalized(nomenclatura).startsWith("total")) return;
    const subdireccion = cellText(raw.subdireccion ?? null) || null;
    if (!isContractSheet && locationId === "etp" && !isCommercialServicesEtpRecord({ subdireccion })) return;
    const excelRow = headerIndex + rowIndex + 2;
    const defaults = structuralDefaults(locationId, raw);
    const estatus = canonicalStatus(raw.estatus ?? null) || (contractStage === "cancelled" ? "CANCELADO" : contractStage === "expired" ? "FENECIDO" : contractStage === "agreements" ? "CONVENIO" : "");
    if (!estatus) {
      errors.push(`${sheetName}, fila ${excelRow}: falta el estatus.`);
      return;
    }
    const key = nomenclatura.toLocaleLowerCase("es-MX");
    if (seen.has(key)) {
      if (isContractSheet) return;
      errors.push(`${sheetName}, fila ${excelRow}: nomenclatura duplicada (${nomenclatura}).`);
      return;
    }
    seen.add(key);
    const originalArea = raw.metraje ?? null;
    const giroIata = cellText(raw.giroIata ?? null) || null;
    const giroOperativo = cellText(raw.giroOperativo ?? null) || giroIata;
    const builtArea = parseArea(raw.metrajeConstruido ?? null);
    const builtAreaNote = builtArea === null
      ? ""
      : `Metraje construido: ${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(builtArea)} m²`;
    const formalizationSource = raw.fechaFormalizacion ?? null;
    const conclusionSource = raw.fechaConclusion ?? null;
    const fechaFormalizacion = parseExcelDate(formalizationSource);
    let fechaConclusion = parseExcelDate(conclusionSource);
    if (cellText(formalizationSource) && !fechaFormalizacion) notices.push(`${sheetName}, fila ${excelRow}: Fecha de Formalización no válida (${nomenclatura}).`);
    if (cellText(conclusionSource) && !fechaConclusion) notices.push(`${sheetName}, fila ${excelRow}: Fecha de Conclusión no válida (${nomenclatura}).`);
    if (fechaFormalizacion && fechaConclusion && fechaConclusion < fechaFormalizacion) {
      notices.push(`${sheetName}, fila ${excelRow}: la Fecha de Conclusión es anterior a la Formalización (${nomenclatura}).`);
      fechaConclusion = null;
    }
    const participation = parseParticipation(raw.participationRate ?? null);
    const contractNumberRaw = contractIdentity;
    const contractNumber = contractNumberRaw && normalized(contractNumberRaw) !== "sin contrato"
      ? contractNumberRaw
      : null;
    const record: LocalRecord = {
      id: records.length + 1,
      nomenclatura,
      lado: cellText(raw.lado ?? null) || defaults.lado,
      area: cellText(raw.area ?? null) || defaults.area,
      modulo: cellText(raw.modulo ?? null) || defaults.modulo,
      metraje: parseArea(originalArea),
      metrajeOriginal: originalArea === null ? null : typeof originalArea === "number" ? originalArea : cellText(originalArea),
      areaComercial: cellText(raw.areaComercial ?? null) || inferSpaceType(locationId, nomenclatura, giroOperativo || cellText(raw.giroIndaabin ?? null)),
      nivel: cellText(raw.nivel ?? null) ? parseLevel(raw.nivel ?? null, "Sin nivel") : defaults.nivel,
      estatus,
      situacion: cellText(raw.situacion ?? null) || null,
      marca: cellText(raw.marca ?? null) || null,
      subdireccion,
      gerencia: cellText(raw.gerencia ?? null) || null,
      giroIata,
      giroOperativo,
      giroIndaabin: cellText(raw.giroIndaabin ?? null) || null,
      observaciones: [cellText(raw.observaciones ?? null), builtAreaNote].filter(Boolean).join(" · ") || null,
      fechaFormalizacion,
      fechaConclusion,
      contractNumber,
      contractPending: Boolean(contractNumberRaw && normalized(contractNumberRaw) === "sin contrato"),
      commercialLine: optionalText(raw.commercialLine ?? null),
      commercialSubline: optionalText(raw.commercialSubline ?? null),
      costPerM2: parseArea(raw.costPerM2 ?? null),
      monthlyRent: parseArea(raw.monthlyRent ?? null),
      participationRate: typeof participation === "number" ? participation : participation.rate,
      participationNotes: typeof participation === "number" ? null : participation.notes,
      operationsStartDate: parseExcelDate(raw.operationsStartDate ?? null),
      signatureDate: parseExcelDate(raw.signatureDate ?? null),
      contractTerm: optionalText(raw.contractTerm ?? null),
      renewalDate: parseExcelDate(raw.renewalDate ?? null),
      guaranteeStatus: optionalText(raw.guaranteeStatus ?? null),
      liabilityPolicyStatus: optionalText(raw.liabilityPolicyStatus ?? null),
      projectStatus: optionalText(raw.projectStatus ?? null),
      contractStatus: optionalText(raw.contractStatus ?? null)
        ?? (contractStage === "agreements" ? optionalText(raw.situacion ?? null) : null),
        operationalStatus: optionalText(raw.operationalStatus ?? null),
      contactData: optionalText(raw.contactData ?? null),
      manager: optionalText(raw.manager ?? null),
      contractStage,
      contractSourceSheet: sheetName,
      contractLocationName: isContractSheet
        ? optionalText(raw.sourceZone ?? null) ?? "Zona no indicada"
        : locationOptions.find((location) => location.id === locationId)?.name ?? sheetName,
      contractLocationId: isContractSheet ? null : locationId,
    };
    records.push(record);
  });
  if (!records.length) throw new Error(`La hoja “${sheetName}” no contiene locales válidos.`);
  if (records.length > 5000) throw new Error(`La hoja “${sheetName}” supera el límite de 5,000 registros.`);
  return { records, errors, notices };
}

async function parseWorkbook(file: File): Promise<ParsedWorkbook> {
  const [sheets, etpCommercialCapacity] = await Promise.all([
    readXlsxFile(file),
    readEtpCommercialCapacity(file).catch(() => null),
  ]);
  const sheetsByName = new Map(sheets.map((sheet) => [normalized(sheet.sheet), sheet.data]));
  const availableDefinitions = sheetDefinitions.filter((definition) => sheetsByName.has(normalized(definition.sheetName)));
  const availableContractDefinitions = contractSheetDefinitions.filter((definition) => sheetsByName.has(normalized(definition.sheetName)));
  if (!availableDefinitions.length && !availableContractDefinitions.length) {
    throw new Error(`El libro no contiene zonas ni hojas contractuales reconocidas.`);
  }
  const parsed = availableDefinitions.map((definition) => {
    const location = locationOptions.find((option) => option.id === definition.locationId)!;
    const result = parseRows(sheetsByName.get(normalized(definition.sheetName))!, definition.locationId, definition.sheetName);
    return { ...definition, locationName: location.name, ...result };
  });
  const contractSheets = availableContractDefinitions.map((definition) => {
    const result = parseRows(sheetsByName.get(normalized(definition.sheetName))!, `contracts-${definition.stage}`, definition.sheetName, definition.stage);
    return { locationId: `contracts-${definition.stage}`, locationName: definition.sheetName, sheetName: definition.sheetName, ...result };
  });
  if ([...parsed, ...contractSheets].reduce((sum, location) => sum + location.records.length, 0) > 10000) {
    throw new Error("El libro supera el límite total de 10,000 registros.");
  }
  const capacitySheet = sheetsByName.get(normalized("Capacidad"));
  const capacityMessage = !capacitySheet
    ? "No se encontró la hoja CAPACIDAD; el indicador de ETP se mostrará sin dato."
    : etpCommercialCapacity === null
      ? "La celda D2 de la hoja CAPACIDAD no contiene un valor numérico; el indicador de ETP se mostrará sin dato."
      : "";
  return { locations: parsed, contractSheets, etpCommercialCapacity, capacityMessage };
}

export default function DataUploadModal({ open, onClose, onSuccess }: {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: LocalWorkbookResult) => void;
}) {
  const [filename, setFilename] = useState("");
  const [locations, setLocations] = useState<ParsedLocation[]>([]);
  const [contractSheets, setContractSheets] = useState<ParsedLocation[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [notices, setNotices] = useState<string[]>([]);
  const [etpCommercialCapacity, setEtpCommercialCapacity] = useState<number | null>(null);
  const [capacityMessage, setCapacityMessage] = useState("");
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);

  if (!open) return null;
  const allParsedSheets = [...locations, ...contractSheets];
  const totalRecords = allParsedSheets.reduce((sum, location) => sum + location.records.length, 0);
  const totalArea = locations.reduce((sum, location) => sum + location.records.reduce((area, record) => area + (record.metraje ?? 0), 0), 0);

  const selectFile = async (file: File | undefined) => {
    setError("");
    setWarnings([]);
    setNotices([]);
    setLocations([]);
    setContractSheets([]);
    setEtpCommercialCapacity(null);
    setCapacityMessage("");
    if (!file) return;
    if (!file.name.toLocaleLowerCase().endsWith(".xlsx")) {
      setError("Selecciona un archivo de Excel con extensión .xlsx.");
      return;
    }
    setFilename(file.name);
    setParsing(true);
    try {
      const parsed = await parseWorkbook(file);
      setLocations(parsed.locations);
      setContractSheets(parsed.contractSheets);
      setEtpCommercialCapacity(parsed.etpCommercialCapacity);
      setCapacityMessage(parsed.capacityMessage);
      setWarnings([...parsed.locations, ...parsed.contractSheets].flatMap((location) => location.errors).slice(0, 12));
      setNotices([...parsed.locations, ...parsed.contractSheets].flatMap((location) => location.notices).slice(0, 12));
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "No se pudo leer el archivo.");
    } finally {
      setParsing(false);
    }
  };

  const useLocally = () => {
    if (!allParsedSheets.length || warnings.length) return;
    setError("");
    onSuccess({
      filename,
      datasets: Object.fromEntries(locations.map(({ locationId, records }) => [locationId, records])),
      contractRecords: contractSheets.flatMap((sheet) => sheet.records),
      totalRecords,
      etpCommercialCapacity,
    });
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="upload-modal upload-modal-wide" role="dialog" aria-modal="true" aria-labelledby="upload-title">
        <div className="upload-modal-heading">
          <div><span className="section-kicker">Procesamiento privado local</span><h2 id="upload-title">Cargar base de zonas comerciales</h2></div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <p className="upload-intro">Selecciona un solo archivo de Excel. Se leerá únicamente en este navegador y permanecerá en memoria durante la sesión. No se enviará ni se guardará en ningún servidor.</p>

        <label className={`file-drop ${allParsedSheets.length ? "file-ready" : ""}${parsing ? " is-parsing" : ""}`}>
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => selectFile(event.target.files?.[0])} />
          <span className="file-icon">XLSX</span>
          <strong>{parsing ? "Leyendo las zonas disponibles…" : filename || "Selecciona el libro consolidado"}</strong>
          <small>Admite zonas comerciales y las hojas Contratos Cancelados · Contratos Fenecidos · Convenios · Indicador ETP opcional: CAPACIDAD (D2)</small>
          {parsing && <span className="file-reading-progress" aria-hidden="true"><i /><i /><i /></span>}
        </label>

        {parsing && (
          <div className="upload-processing-status" role="status" aria-live="polite">
            <i aria-hidden="true" />
            <div><strong>Procesando el libro</strong><span>Leyendo hojas, validando zonas y preparando indicadores.</span></div>
          </div>
        )}

        {allParsedSheets.length > 0 && (
          <>
            <div className="upload-preview">
              <div><strong>{totalRecords}</strong><span>Registros válidos</span></div>
              <div><strong>{new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(totalArea)} m²</strong><span>Superficie detectada</span></div>
              <div><strong>{locations.length}/7</strong><span>Zonas reconocidas</span></div>
              <div><strong>{etpCommercialCapacity === null ? "Sin dato" : new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(etpCommercialCapacity)}</strong><span>Capacidad comercial ETP (Pax.)</span></div>
            </div>
            <div className="sheet-summary-list" aria-label="Resultado por hoja">
              {allParsedSheets.map((location) => (
                <div key={location.locationId}><span>{location.sheetName}</span><strong>{location.records.length} registros</strong></div>
              ))}
            </div>
          </>
        )}
        {capacityMessage && <div className="upload-message capacity-note">{capacityMessage}</div>}
        {notices.length > 0 && <div className="upload-message capacity-note"><strong>Fechas omitidas por revisión:</strong>{notices.map((notice, index) => <span key={`${notice}-${index}`}>{notice}</span>)}</div>}
        {warnings.length > 0 && <div className="upload-message warning"><strong>Corrige el archivo antes de guardar:</strong>{warnings.map((warning) => <span key={warning}>{warning}</span>)}</div>}
        {error && <div className="upload-message error" role="alert">{error}</div>}

        <div className="upload-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
          <button type="button" className="primary-button" disabled={!allParsedSheets.length || warnings.length > 0 || parsing} onClick={useLocally}>Usar datos en esta sesión</button>
        </div>
      </section>
    </div>
  );
}
