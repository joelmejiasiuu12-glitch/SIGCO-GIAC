"use client";

import { useState } from "react";
import readXlsxFile, { type CellValue, type SheetData } from "read-excel-file/browser";
import { getSpaceType, locationOptions, type ContractStage, type EtpCommercialCapacityData, type LocalRecord, type PassengerTrafficRecord } from "@/app/types";
import { isCommercialServicesEtpRecord } from "@/app/data/recordVisibility";

export type LocalWorkbookResult = {
  filename: string;
  datasets: Record<string, LocalRecord[]>;
  contractRecords: LocalRecord[];
  totalRecords: number;
  etpCommercialCapacity: EtpCommercialCapacityData | null;
  passengerTraffic: PassengerTrafficRecord[];
};

type ParsedField = keyof LocalRecord | "metrajeConstruido" | "daysRemaining" | "sourceZone" | "razonSocial" | "costPerM2Vigente" | "monthlyRentVigente" | "participationRateVigente" | "zonaComercial";
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
  etpCommercialCapacity: EtpCommercialCapacityData | null;
  capacityMessage: string;
  passengerTraffic: PassengerTrafficRecord[];
  passengerErrors: string[];
  passengerMessage: string;
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

type ContractSheetDefinition = {
  sheetName: string;
  stage: ContractStage | null;
  defaultGerencia: string;
};

const contractSheetDefinitions: ContractSheetDefinition[] = [
  { sheetName: "CONTRATOS GSC", stage: null, defaultGerencia: "Gerencia de Servicios Comerciales" },
  { sheetName: "CONTRATOS GEP", stage: null, defaultGerencia: "Gerencia de Espacios Publicitarios" },
  { sheetName: "CONTRATOS CANCELADOS", stage: "cancelled", defaultGerencia: "Gerencia de Servicios Comerciales" },
  { sheetName: "CONTRATOS FENECIDOS", stage: "expired", defaultGerencia: "Gerencia de Servicios Comerciales" },
  { sheetName: "CANCELADOS", stage: "cancelled", defaultGerencia: "Gerencia de Servicios Comerciales" },
  { sheetName: "FENECIDOS", stage: "expired", defaultGerencia: "Gerencia de Servicios Comerciales" },
  { sheetName: "CANCELADO", stage: "cancelled", defaultGerencia: "Gerencia de Servicios Comerciales" },
  { sheetName: "FENECIDO", stage: "expired", defaultGerencia: "Gerencia de Servicios Comerciales" },
  { sheetName: "CANCELADOS GSC", stage: "cancelled", defaultGerencia: "Gerencia de Servicios Comerciales" },
  { sheetName: "FENECIDOS GSC", stage: "expired", defaultGerencia: "Gerencia de Servicios Comerciales" },
];

const aliases: Record<string, ParsedField> = {
  nomenclatura: "nomenclatura",
  lado: "lado",
  area: "area",
  modulo: "modulo",
  metraje: "metraje",
  m2: "metraje",
  "sup m2": "metraje",
  superficie: "metraje",
  "metraje construido": "metrajeConstruido",
  "tipo de local": "areaComercial",
  "tipo local": "areaComercial",
  "tipo de area": "areaComercial",
  "tipo de área": "areaComercial",
  "tipo de espacio": "areaComercial",
  "tipo espacio": "areaComercial",
  "tipo de inmueble": "areaComercial",
  "area comercial": "areaComercial",
  "área comercial": "areaComercial",
  nivel: "nivel",
  estatus: "estatus",
  situacion: "situacion",
  "marca comercial": "marca",
  marca: "marca",
  empresa: "marca",
  "razon social": "razonSocial",
  "razón social": "razonSocial",
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
  "no expediente": "contractNumber",
  expediente: "contractNumber",
  "numero de contrato": "contractNumber",
  "num contrato": "contractNumber",
  contrato: "contractNumber",
  "nombre comercial": "marca",
  nombre: "marca",
  arrendatario: "razonSocial",
  arrendataria: "razonSocial",
  "descripcion o asunto": "observaciones",
  "razon de conclusion": "observaciones",
  cierre: "contractStatus",
  "giro comercial": "commercialLine",
  "subgiro comercial": "commercialSubline",
  "costo por m2": "costPerM2",
  "costo por m2 vigente": "costPerM2Vigente",
  "costo m2 vigente": "costPerM2Vigente",
  "renta mensual iva": "monthlyRent",
  "renta mensual mas iva": "monthlyRent",
  "renta mensual": "monthlyRent",
  "contraprestacion mensual mas iva": "monthlyRent",
  "contraprestacion mensual iva": "monthlyRent",
  "contraprestacion mensual": "monthlyRent",
  "contraprestacion mas iva": "monthlyRent",
  "contraprestacion": "monthlyRent",
  "renta mensual mas iva vigente": "monthlyRentVigente",
  "renta mensual iva vigente": "monthlyRentVigente",
  "renta mensual vigente": "monthlyRentVigente",
  "contraprestacion mensual mas iva vigente": "monthlyRentVigente",
  "contraprestacion mensual iva vigente": "monthlyRentVigente",
  "contraprestacion mensual vigente": "monthlyRentVigente",
  "contraprestacion mas iva vigente": "monthlyRentVigente",
  "contraprestacion vigente": "monthlyRentVigente",
  "participacion": "participationRate",
  "participaciones": "participationRate",
  "participacion vigente": "participationRateVigente",
  "participaciones vigente": "participationRateVigente",
  "fecha de inicio de operaciones": "operationsStartDate",
  "fecha de firma de contrato": "signatureDate",
  "vigencia del contrato": "contractTerm",
  vigencia: "contractTerm",
  "fecha de renovacion": "renewalDate",
  "fecha de termino": "renewalDate",
  "fecha termino": "renewalDate",
  "fecha de vencimiento": "renewalDate",
  "fecha vencimiento": "renewalDate",
  "vencimiento": "renewalDate",
  "termino": "renewalDate",
  "conclusion": "fechaConclusion",
  "dias restantes": "daysRemaining",
  "días restantes": "daysRemaining",
  "dias por vencer": "daysRemaining",
  "días por vencer": "daysRemaining",
  "dias restante": "daysRemaining",
  "días restante": "daysRemaining",
  "garantia de complimiento": "guaranteeStatus",
  "garantia de cumplimiento": "guaranteeStatus",
  "poliza de r c": "liabilityPolicyStatus",
  "poliza de rc": "liabilityPolicyStatus",
  "poliza rc": "liabilityPolicyStatus",
  "proyecto de obra": "projectStatus",
  "situacion del contrato": "contractStatus",
  "situacion de contrato": "contractStatus",
  "estatus del contrato": "contractStatus",
  "estatus de contrato": "contractStatus",
  "situacion del local": "operationalStatus",
  "situacion de local": "operationalStatus",
  condicion: "situacion",
  "datos de contacto": "contactData",
  gestor: "manager",
  zona: "sourceZone",
  "zona comercial": "zonaComercial",
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
  if (!text || /^#/.test(text) || /unidad/i.test(text)) return null;
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

function buildEtpCommercialCapacity(readNumericCell: (reference: string) => number | null) {
  const terminalPassengerCapacity = readNumericCell("A2");
  const commercialAreaFactor = readNumericCell("A5");
  const leasedCommercialArea = readNumericCell("C2");
  if (
    terminalPassengerCapacity === null || terminalPassengerCapacity <= 0
    || commercialAreaFactor === null || commercialAreaFactor <= 0
    || leasedCommercialArea === null || leasedCommercialArea < 0
  ) return null;

  const recommendedCommercialArea = readNumericCell("B2")
    ?? terminalPassengerCapacity * commercialAreaFactor;
  const commercialPassengerCapacity = readNumericCell("D2")
    ?? (leasedCommercialArea / recommendedCommercialArea) * terminalPassengerCapacity;
  if (recommendedCommercialArea <= 0 || !Number.isFinite(commercialPassengerCapacity) || commercialPassengerCapacity < 0) return null;
  return {
    terminalPassengerCapacity,
    commercialAreaFactor,
    recommendedCommercialArea,
    leasedCommercialArea,
    commercialPassengerCapacity,
  } satisfies EtpCommercialCapacityData;
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
  const cells = [...worksheet.getElementsByTagName("c")];
  const readNumericCell = (reference: string) => {
    const cell = cells.find(
      (candidate) => candidate.getAttribute("r")?.toLocaleUpperCase("es-MX") === reference,
    );
    return parseArea(cell?.getElementsByTagName("v")[0]?.textContent ?? null);
  };
  return buildEtpCommercialCapacity(readNumericCell);
}

function readEtpCommercialCapacityFromSheet(capacitySheet: SheetData | undefined) {
  if (!capacitySheet) return null;
  const references: Record<string, [number, number]> = {
    A2: [1, 0], B2: [1, 1], C2: [1, 2], D2: [1, 3], A5: [4, 0],
  };
  return buildEtpCommercialCapacity((reference) => {
    const position = references[reference];
    return position ? parseArea(capacitySheet[position[0]]?.[position[1]] ?? null) : null;
  });
}

const passengerMonths: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

function parsePassengerTraffic(rows: SheetData | undefined) {
  if (!rows) return { records: [] as PassengerTrafficRecord[], errors: [] as string[] };
  const headerIndex = rows.slice(0, 10).findIndex((row) => {
    const headers = row.map(normalized);
    return ["ano", "mes", "pasajeros", "estado"].every((header) => headers.includes(header));
  });
  if (headerIndex < 0) {
    return {
      records: [] as PassengerTrafficRecord[],
      errors: ["Pasajeros: no se encontraron las columnas Año, Mes, Pasajeros y Estado."],
    };
  }

  const headers = rows[headerIndex].map(normalized);
  const yearColumn = headers.indexOf("ano");
  const monthColumn = headers.indexOf("mes");
  const passengersColumn = headers.indexOf("pasajeros");
  const statusColumn = headers.indexOf("estado");
  const records: PassengerTrafficRecord[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  rows.slice(headerIndex + 1).forEach((row, rowIndex) => {
    if (row.every((cell) => cell === null || cellText(cell) === "")) return;
    const excelRow = headerIndex + rowIndex + 2;
    const year = parseArea(row[yearColumn] ?? null);
    const monthName = cellText(row[monthColumn] ?? null).toLocaleUpperCase("es-MX");
    const month = passengerMonths[normalized(monthName)] ?? null;
    const passengers = parseArea(row[passengersColumn] ?? null);
    const rawStatus = normalized(row[statusColumn] ?? null);
    const status = rawStatus === "real"
      ? "real"
      : rawStatus === "parcial"
        ? "partial"
        : rawStatus === "proyeccion"
          ? "projection"
          : null;
    if (year === null || !Number.isInteger(year) || year < 2000 || year > 2100 || month === null || passengers === null || passengers < 0 || status === null) {
      errors.push(`Pasajeros, fila ${excelRow}: revisa Año, Mes, Pasajeros o Estado.`);
      return;
    }
    const key = `${year}-${month}`;
    if (seen.has(key)) {
      errors.push(`Pasajeros, fila ${excelRow}: el mes ${monthName} de ${year} está duplicado.`);
      return;
    }
    seen.add(key);
    records.push({ year, month, monthName, passengers, status });
  });

  records.sort((a, b) => a.year - b.year || a.month - b.month);
  return { records, errors };
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
  const dummyRecord: LocalRecord = {
    id: 0,
    nomenclatura,
    giroOperativo: giro,
    areaComercial: "",
    lado: "",
    area: "",
    modulo: "",
    metraje: null,
    metrajeOriginal: null,
    nivel: "",
    estatus: "",
    situacion: null,
    marca: null,
    subdireccion: null,
    gerencia: null,
    giroIata: null,
    giroIndaabin: null,
    observaciones: null,
    fechaFormalizacion: null,
    fechaConclusion: null,
    contractNumber: null,
    contractPending: false,
    commercialLine: null,
    commercialSubline: null,
    costPerM2: null,
    monthlyRent: null,
    participationRate: null,
    participationNotes: null,
    operationsStartDate: null,
    signatureDate: null,
    contractTerm: null,
    renewalDate: null,
    guaranteeStatus: null,
    liabilityPolicyStatus: null,
    projectStatus: null,
    contractStatus: null,
    operationalStatus: null,
    contactData: null,
    manager: null,
  };
  return getSpaceType(dummyRecord, locationId);
}

function parseRows(
  rows: SheetData,
  locationId: string,
  sheetName: string,
  contractStage: ContractStage | null = null,
  defaultGerencia: string = ""
) {
  const isContractSheet = contractStage !== null || sheetName.toUpperCase().startsWith("CONTRATOS");
  const headerIndex = rows.slice(0, 15).findIndex((row) => {
    const titles = row.map(normalized);
    return isContractSheet
      ? titles.some((title) => aliases[title] === "nomenclatura" || aliases[title] === "contractNumber" || aliases[title] === "marca" || aliases[title] === "razonSocial")
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
    const rowHasAnyData = row.some((cell) => cell !== null && cellText(cell) !== "");
    if (!rowHasAnyData) return;

    const contractIdentity = optionalText(raw.contractNumber ?? null) || cellText(raw.contractNumber ?? null) || null;
    const brandIdentity = optionalText(raw.marca ?? null) || optionalText(raw.razonSocial ?? null) || cellText(raw.marca ?? null) || cellText(raw.razonSocial ?? null) || null;
    const rawNomenclatura = optionalText(raw.nomenclatura ?? null) || cellText(raw.nomenclatura ?? null) || null;

    const nomenclatura = rawNomenclatura || contractIdentity || brandIdentity || `Renglon ${rowIndex + 1}`;
    if (normalized(nomenclatura).startsWith("total")) return;
    const subdireccion = cellText(raw.subdireccion ?? null) || null;
    if (!isContractSheet && locationId === "etp" && !isCommercialServicesEtpRecord({ subdireccion })) return;
    const excelRow = headerIndex + rowIndex + 2;
    const defaults = structuralDefaults(locationId, raw);
    const estatus = canonicalStatus(raw.estatus ?? null) || canonicalStatus(raw.operationalStatus ?? null) || (contractStage === "cancelled" ? "CANCELADO" : contractStage === "expired" ? "FENECIDO" : contractStage === "agreements" ? "CONVENIO" : "FORMALIZADO");
    if (!estatus && !isContractSheet) {
      errors.push(`${sheetName}, fila ${excelRow}: falta el estatus.`);
      return;
    }
    const key = isContractSheet
      ? `${excelRow}-${nomenclatura}-${contractIdentity || ""}`.toLocaleLowerCase("es-MX")
      : nomenclatura.toLocaleLowerCase("es-MX");
    if (seen.has(key)) {
      if (isContractSheet) return;
      errors.push(`${sheetName}, fila ${excelRow}: nomenclatura duplicada (${nomenclatura}).`);
      return;
    }
    seen.add(key);
    const originalArea = raw.metraje ?? null;
    const giroIata = cellText(raw.giroIata ?? null) || null;
    const giroOperativo = cellText(raw.giroOperativo ?? null) || cellText(raw.commercialLine ?? null) || giroIata;
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
    const participationVigente = parseParticipation(raw.participationRateVigente ?? null);
    const contractNumberRaw = contractIdentity;
    const contractNumber = contractNumberRaw && normalized(contractNumberRaw) !== "sin contrato"
      ? contractNumberRaw
      : null;

    const razonSocial = optionalText(raw.razonSocial ?? null);
    const marca = cellText(raw.marca ?? null) || razonSocial || null;
    const gerencia = cellText(raw.gerencia ?? null) || defaultGerencia || null;
    const zonaComercial = optionalText(raw.zonaComercial ?? null) || optionalText(raw.sourceZone ?? null);
    let rowContractStage = contractStage;
    if (!rowContractStage) {
      const statusStr = normalized([raw.contractStatus, raw.situacion, raw.estatus, raw.operationalStatus].filter(Boolean).join(" "));
      if (statusStr.includes("cancelad")) {
        rowContractStage = "cancelled";
      } else if (statusStr.includes("fenecid") || statusStr.includes("expirad")) {
        rowContractStage = "expired";
      } else if (statusStr.includes("convenio")) {
        rowContractStage = "agreements";
      } else if (
        statusStr.includes("en formalizacion") ||
        statusStr.includes("formalizacion") ||
        statusStr.includes("tramite de formalizacion") ||
        statusStr.includes("proceso de formalizacion") ||
        statusStr.includes("en tramite")
      ) {
        rowContractStage = "formalization";
      } else if (
        statusStr.includes("preformal") ||
        statusStr.includes("pre-formal") ||
        statusStr.includes("pre formal") ||
        statusStr.includes("proceso de asign") ||
        statusStr.includes("en asign")
      ) {
        rowContractStage = "preformalization";
      } else if (isContractSheet || Boolean(contractIdentity)) {
        rowContractStage = "formalized";
      }
    }

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
      estatus: estatus || "FORMALIZADO",
      situacion: cellText(raw.situacion ?? null) || null,
      razonSocial,
      marca,
      subdireccion,
      gerencia,
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
      costPerM2Vigente: parseArea(raw.costPerM2Vigente ?? null),
      monthlyRent: parseArea(raw.monthlyRent ?? null),
      monthlyRentVigente: parseArea(raw.monthlyRentVigente ?? null),
      participationRate: typeof participation === "number" ? participation : participation.rate,
      participationRateVigente: typeof participationVigente === "number" ? participationVigente : participationVigente.rate,
      participationNotes: typeof participation === "number" ? null : participation.notes,
      operationsStartDate: parseExcelDate(raw.operationsStartDate ?? null),
      signatureDate: parseExcelDate(raw.signatureDate ?? null),
      contractTerm: optionalText(raw.contractTerm ?? null),
      renewalDate: parseExcelDate(raw.renewalDate ?? null),
      guaranteeStatus: optionalText(raw.guaranteeStatus ?? null),
      liabilityPolicyStatus: optionalText(raw.liabilityPolicyStatus ?? null),
      projectStatus: optionalText(raw.projectStatus ?? null),
      contractStatus: optionalText(raw.contractStatus ?? raw.situacion ?? null),
      operationalStatus: optionalText(raw.operationalStatus ?? null),
      contactData: optionalText(raw.contactData ?? null),
      manager: optionalText(raw.manager ?? null),
      zonaComercial,
      contractStage: rowContractStage,
      contractSourceSheet: sheetName,
      contractLocationName: isContractSheet
        ? zonaComercial ?? "Zona no indicada"
        : locationOptions.find((location) => location.id === locationId)?.name ?? sheetName,
      contractLocationId: isContractSheet ? null : locationId,
      daysRemaining: parseArea(raw.daysRemaining ?? null),
    };
    records.push(record);
  });
  if (!records.length) throw new Error(`La hoja “${sheetName}” no contiene locales válidos.`);
  if (records.length > 5000) throw new Error(`La hoja “${sheetName}” supera el límite de 5,000 registros.`);
  return { records, errors, notices };
}

async function parseWorkbook(file: File): Promise<ParsedWorkbook> {
  const sheets = await readXlsxFile(file);
  const sheetsByName = new Map(sheets.map((sheet) => [normalized(sheet.sheet), sheet.data]));
  const capacitySheet = sheetsByName.get(normalized("Capacidad"));
  const etpCommercialCapacity = readEtpCommercialCapacityFromSheet(capacitySheet)
    ?? await readEtpCommercialCapacity(file).catch(() => null);
  const passengerSheet = sheetsByName.get(normalized("Pasajeros"));
  const passengerResult = parsePassengerTraffic(passengerSheet);
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
    const locId = `contracts-${normalized(definition.sheetName).replaceAll(" ", "-")}`;
    const result = parseRows(
      sheetsByName.get(normalized(definition.sheetName))!,
      locId,
      definition.sheetName,
      definition.stage,
      definition.defaultGerencia
    );
    return { locationId: locId, locationName: definition.sheetName, sheetName: definition.sheetName, ...result };
  });
  if ([...parsed, ...contractSheets].reduce((sum, location) => sum + location.records.length, 0) > 10000) {
    throw new Error("El libro supera el límite total de 10,000 registros.");
  }
  const capacityMessage = !capacitySheet
    ? "No se encontró la hoja CAPACIDAD; el indicador de ETP se mostrará sin dato."
    : etpCommercialCapacity === null
      ? "La hoja CAPACIDAD requiere valores numéricos válidos en A2, C2 y A5; los indicadores de atención se mostrarán sin dato."
      : "";
  const passengerMessage = !passengerSheet
    ? "No se encontró la hoja PASAJEROS; el análisis de demanda se mostrará sin dato."
    : passengerResult.records.length === 0
      ? "La hoja PASAJEROS no contiene registros mensuales válidos."
      : "";
  return {
    locations: parsed,
    contractSheets,
    etpCommercialCapacity,
    capacityMessage,
    passengerTraffic: passengerResult.records,
    passengerErrors: passengerResult.errors,
    passengerMessage,
  };
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
  const [etpCommercialCapacity, setEtpCommercialCapacity] = useState<EtpCommercialCapacityData | null>(null);
  const [passengerTraffic, setPassengerTraffic] = useState<PassengerTrafficRecord[]>([]);
  const [capacityMessage, setCapacityMessage] = useState("");
  const [passengerMessage, setPassengerMessage] = useState("");
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
    setPassengerTraffic([]);
    setCapacityMessage("");
    setPassengerMessage("");
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
      setPassengerTraffic(parsed.passengerTraffic);
      setCapacityMessage(parsed.capacityMessage);
      setPassengerMessage(parsed.passengerMessage);
      setWarnings([...[...parsed.locations, ...parsed.contractSheets].flatMap((location) => location.errors), ...parsed.passengerErrors].slice(0, 12));
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
      passengerTraffic,
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
          <small>Admite zonas comerciales, hojas contractuales y los modelos CAPACIDAD y PASAJEROS.</small>
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
              <div><strong>{etpCommercialCapacity === null ? "Sin dato" : new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(etpCommercialCapacity.commercialPassengerCapacity)}</strong><span>Capacidad comercial ETP (Pax.)</span></div>
            </div>
            <div className="sheet-summary-list" aria-label="Resultado por hoja">
              {allParsedSheets.map((location) => (
                <div key={location.locationId}><span>{location.sheetName}</span><strong>{location.records.length} registros</strong></div>
              ))}
              {passengerTraffic.length > 0 && <div><span>Pasajeros</span><strong>{passengerTraffic.length} registros mensuales</strong></div>}
            </div>
          </>
        )}
        {capacityMessage && <div className="upload-message capacity-note">{capacityMessage}</div>}
        {passengerMessage && <div className="upload-message capacity-note">{passengerMessage}</div>}
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
