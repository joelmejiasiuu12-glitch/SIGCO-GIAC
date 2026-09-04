import readXlsxFile from "read-excel-file/node";
import fs from "fs";
import path from "path";

const filePath = "C:\\Users\\joelm\\Documents\\AIFA\\LOCALES y CONTRATOS\\RELACION DE LOCALES COMERCIALES PMD (4TA).xlsx";

const zoneMapping = [
  { sheetName: "ETP", locationId: "etp", headerRowIndex: 1 },
  { sheetName: "Pq. Sta. Lucía", locationId: "parque-santa-lucia", headerRowIndex: 1 },
  { sheetName: "Pq. Rev.", locationId: "parque-revolucion", headerRowIndex: 1, headerRow0Index: 0 },
  { sheetName: "Edif. Svs.", locationId: "carga-aduana", headerRowIndex: 2 },
  { sheetName: "TITT", locationId: "autobuses-plaza", headerRowIndex: 1 },
  { sheetName: "Cd. Aeroportuaria", locationId: "ciudad-aeroportuaria", headerRowIndex: 1 },
  { sheetName: "Calz. Mamuts", locationId: "calzada-mamuts", headerRowIndex: 1 },
];

function normalized(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeStr(val) {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (str === "" || str.toLowerCase() === "n/a" || str.toLowerCase() === "#n/a") return null;
  return str;
}

function normalizeNum(val) {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (!val) return null;
  const cleaned = String(val).replace(/,/g, "").replace(/[$]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function validatedIsoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeDate(val) {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return validatedIsoDate(val.getUTCFullYear(), val.getUTCMonth() + 1, val.getUTCDate());
  }
  if (typeof val === "number" && !isNaN(val) && val > 0) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(val) * 86_400_000);
    return validatedIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }
  const text = String(val).trim();
  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(text);
  if (iso) return validatedIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const local = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (local) return validatedIsoDate(Number(local[3]), Number(local[2]), Number(local[1]));
  
  const spanishMonths = {
    ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4,
    may: 5, mayo: 5, jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8,
    sep: 9, sept: 9, septiembre: 9, oct: 10, octubre: 10, nov: 11, noviembre: 11,
    dic: 12, diciembre: 12,
  };
  const spanish = /^(\d{1,2})\s+([a-záéíóú]+)\.?\s+(\d{4})$/i.exec(text);
  if (spanish) {
    const month = spanishMonths[normalized(spanish[2])];
    if (month) return validatedIsoDate(Number(spanish[3]), month, Number(spanish[1]));
  }
  return null;
}

function parseParticipation(val) {
  if (typeof val === "number" && !isNaN(val)) {
    return { rate: val > 1 && val <= 100 ? val / 100 : val, notes: null };
  }
  const text = normalizeStr(val);
  if (!text) return { rate: null, notes: null };
  const simplePct = /^(\d+(?:[.,]\d+)?)\s*%$/.exec(text);
  if (simplePct) return { rate: Number(simplePct[1].replace(",", ".")) / 100, notes: null };
  const simpleNum = Number(text.replace(",", "."));
  if (!isNaN(simpleNum)) return { rate: simpleNum > 1 && simpleNum <= 100 ? simpleNum / 100 : simpleNum, notes: null };
  const embedded = /(\d+(?:[.,]\d+)?)\s*%/.exec(text);
  return { rate: embedded ? Number(embedded[1].replace(",", ".")) / 100 : null, notes: text };
}

function escapeSql(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return val;
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

function inferSpaceType(nom, rawType, obs) {
  if (rawType && rawType.toLowerCase() !== "sin dato" && rawType.toLowerCase() !== "n/a") {
    return rawType;
  }
  const text = `${nom || ""} ${obs || ""}`.toLowerCase();
  if (/mezzanine|mezz|\bmz\b/.test(text)) return "Mezzanine";
  if (/terraza|balcon|exterior/.test(text)) return "Terraza";
  if (/cajero|atm|banco/.test(text)) return "Cajero";
  if (/isla|kiosco|stand|modulo comercial/.test(text)) return "Isla";
  if (/bodega|almacen|deposito/.test(text)) return "Bodega";
  return "Local";
}

async function main() {
  const workbook = await readXlsxFile(filePath, { getSheets: true });
  console.log("Cargando hojas del libro de Excel...");

  const allLocales = [];
  const seenNomenclaturas = new Set();

  for (const mapping of zoneMapping) {
    const sheet = workbook.find((d) => (d.sheet || d.name) === mapping.sheetName);
    if (!sheet || !sheet.data) continue;

    const rows = sheet.data;
    const headerRow = rows[mapping.headerRowIndex];
    if (!headerRow) continue;

    const colMap = {};
    headerRow.forEach((colName, idx) => {
      if (colName) {
        colMap[normalized(colName)] = idx;
      }
    });

    if (mapping.headerRow0Index !== undefined && rows[mapping.headerRow0Index]) {
      rows[mapping.headerRow0Index].forEach((colName, idx) => {
        if (colName && colMap[normalized(colName)] === undefined) {
          colMap[normalized(colName)] = idx;
        }
      });
    }

    const getVal = (row, candidates) => {
      for (const cand of candidates) {
        const norm = normalized(cand);
        if (colMap[norm] !== undefined) {
          const v = row[colMap[norm]];
          if (v !== undefined && v !== null && String(v).trim() !== "") return v;
        }
      }
      return null;
    };

    for (let r = mapping.headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === "")) continue;

      const nomRaw = getVal(row, ["nomenclatura", "local", "no local", "no", "clave"]);
      if (!nomRaw) continue;
      const nom = String(nomRaw).trim();
      if (nom.toLowerCase().includes("total") || nom.toLowerCase().includes("locales comerciales")) continue;
      if (seenNomenclaturas.has(nom)) {
        continue;
      }
      seenNomenclaturas.add(nom);

      const lado = normalizeStr(getVal(row, ["lado"])) || (
        mapping.locationId === "parque-santa-lucia" ? "Parque Santa Lucía" :
        mapping.locationId === "carga-aduana" ? "Edificio de Servicios" :
        mapping.locationId === "autobuses-plaza" ? "Terminal de Autobuses" :
        mapping.locationId === "parque-revolucion" ? "Parque Revolución" :
        mapping.locationId === "ciudad-aeroportuaria" ? "Ciudad Aeroportuaria" :
        mapping.locationId === "calzada-mamuts" ? "Calzada de los Mamuts" : "Sin dato"
      );

      const area = normalizeStr(getVal(row, ["area", "área"])) || (
        mapping.locationId === "parque-santa-lucia" ? "Centro comercial" :
        mapping.locationId === "carga-aduana" ? "Edificio de Servicios" :
        mapping.locationId === "autobuses-plaza" ? "Zona pública" :
        mapping.locationId === "parque-revolucion" ? "Glorieta Felipe Ángeles" :
        mapping.locationId === "ciudad-aeroportuaria" ? "Primera fase" :
        mapping.locationId === "calzada-mamuts" ? "Corredor comercial" : "Sin dato"
      );

      const nivelRaw = normalizeStr(getVal(row, ["nivel"])) || "1";
      const modulo = normalizeStr(getVal(row, ["modulo", "módulo"])) || (
        mapping.locationId === "parque-santa-lucia" ? nivelRaw :
        mapping.locationId === "carga-aduana" ? nivelRaw :
        mapping.locationId === "autobuses-plaza" ? "Plaza Mexicana" :
        mapping.locationId === "parque-revolucion" ? "Glorieta" :
        mapping.locationId === "ciudad-aeroportuaria" ? "Manzana" :
        mapping.locationId === "calzada-mamuts" ? "CM" : nivelRaw
      );

      const metrajeRaw = getVal(row, ["metraje", "m2", "sup m2", "superficie"]);
      const metraje = normalizeNum(metrajeRaw);
      const metrajeOriginal = normalizeStr(metrajeRaw);
      const metrajeConstruido = normalizeNum(getVal(row, ["metraje construido"]));

      const obs = normalizeStr(getVal(row, ["observaciones", "descripcion o asunto"]));
      const tipoEspacioRaw = normalizeStr(getVal(row, ["tipo de local", "tipo local", "tipo de area", "área comercial", "area comercial", "tipo de espacio", "tipo espacio"]));
      const tipoEspacio = inferSpaceType(nom, tipoEspacioRaw, obs);

      const estatus = normalizeStr(getVal(row, ["estatus", "estatus comercial"])) || "DISPONIBLE";
      const situacion = normalizeStr(getVal(row, ["situacion", "situación", "condicion"]));
      const subdireccion = normalizeStr(getVal(row, ["subdireccion encargada", "subdireccion", "subdirección encargada", "subdirección"])) || "SVS COM";
      const gerencia = normalizeStr(getVal(row, ["gerencia"])) || "GSC";

      const marca = normalizeStr(getVal(row, ["marca comercial", "marca", "empresa", "nombre comercial"]));
      const giroIata = normalizeStr(getVal(row, ["giro iata"]));
      const giroOperativo = normalizeStr(getVal(row, ["giro operativo", "giro aci", "giro"]));
      const giroIndaabin = normalizeStr(getVal(row, ["giro indaabin"]));

      const fechaFormalizacion = normalizeDate(getVal(row, ["fecha de formalizacion", "fecha formalizacion"]));
      const fechaConclusion = normalizeDate(getVal(row, ["fecha de conclusion", "fecha conclusion"]));

      const contractNumber = normalizeStr(getVal(row, ["no contrato", "numero de contrato", "contrato", "no expediente", "expediente"]));
      const contractPending = contractNumber && normalized(contractNumber).includes("sin contrato") ? 1 : 0;

      const commercialLine = normalizeStr(getVal(row, ["giro comercial"]));
      const commercialSubline = normalizeStr(getVal(row, ["subgiro comercial"]));

      const costPerM2 = normalizeNum(getVal(row, ["costo por m2", "costo m2"]));
      const monthlyRent = normalizeNum(getVal(row, ["renta mensual mas iva", "renta mensual iva", "renta mensual", "contraprestacion mensual mas iva", "contraprestacion mensual"]));

      const partParsed = parseParticipation(getVal(row, ["participacion", "participaciones", "porcentaje participacion"]));
      const participationRate = partParsed.rate;
      const participationNotes = partParsed.notes;

      const operationsStartDate = normalizeDate(getVal(row, ["fecha de inicio de operaciones", "fecha inicio operaciones"]));
      const signatureDate = normalizeDate(getVal(row, ["fecha de firma de contrato", "fecha firma contrato"]));
      const contractTerm = normalizeStr(getVal(row, ["vigencia del contrato", "vigencia"]));
      const renewalDate = normalizeDate(getVal(row, ["fecha de renovacion", "fecha de termino", "fecha termino", "fecha de vencimiento", "fecha vencimiento", "vencimiento", "termino"]));

      const daysRemaining = normalizeNum(getVal(row, ["dias restantes", "dias por vencer"]));
      const guaranteeStatus = normalizeStr(getVal(row, ["garantia de complimiento", "garantia de cumplimiento", "garantía"]));
      const liabilityPolicyStatus = normalizeStr(getVal(row, ["poliza de r c", "poliza de rc", "poliza rc"]));
      const projectStatus = normalizeStr(getVal(row, ["proyecto de obra"]));
      const contractStatus = normalizeStr(getVal(row, ["situacion del contrato", "situacion de contrato", "estatus del contrato"]));
      const operationalStatus = normalizeStr(getVal(row, ["situacion del local", "situacion de local"]));
      const contactData = normalizeStr(getVal(row, ["datos de contacto", "contacto"]));
      const manager = normalizeStr(getVal(row, ["gestor"]));

      let contractStage = null;
      if (contractNumber || marca || estatus === "EN FUNCIONAMIENTO" || estatus === "FORMALIZADO") {
        contractStage = "formalized";
      }

      allLocales.push({
        nomenclatura: nom,
        zona_id: mapping.locationId,
        lado,
        area,
        modulo,
        nivel: nivelRaw,
        metraje,
        metraje_original: metrajeOriginal,
        metraje_construido: metrajeConstruido,
        tipo_espacio: tipoEspacio,
        estatus: estatus.toUpperCase(),
        situacion,
        subdireccion,
        gerencia,
        observaciones: obs,
        marca,
        giro_iata: giroIata,
        giro_operativo: giroOperativo,
        giro_indaabin: giroIndaabin,
        fecha_formalizacion: fechaFormalizacion,
        fecha_conclusion: fechaConclusion,
        contract_number: contractNumber,
        contract_pending: contractPending,
        commercial_line: commercialLine,
        commercial_subline: commercialSubline,
        cost_per_m2: costPerM2,
        monthly_rent: monthlyRent,
        participation_rate: participationRate,
        participation_notes: participationNotes,
        operations_start_date: operationsStartDate,
        signature_date: signatureDate,
        contract_term: contractTerm,
        renewal_date: renewalDate,
        days_remaining: daysRemaining,
        guarantee_status: guaranteeStatus,
        liability_policy_status: liabilityPolicyStatus,
        project_status: projectStatus,
        contract_status: contractStatus,
        operational_status: operationalStatus,
        contact_data: contactData,
        manager,
        contract_stage: contractStage,
      });
    }
  }

  console.log(`Total locales extraídos de las 7 zonas: ${allLocales.length}`);

  // 2. Extraer pasajeros
  const passengerRecords = [];
  const passengerSheet = workbook.find((d) => (d.sheet || d.name) === "Pasajeros");
  if (passengerSheet && passengerSheet.data) {
    const rows = passengerSheet.data;
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row[0]) continue;
      const year = normalizeNum(row[0]);
      const monthName = normalizeStr(row[1]);
      const pax = normalizeNum(row[2]);
      const st = normalizeStr(row[3]) || "Real";
      if (year && monthName && pax !== null) {
        const monthNum = {
          enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
          julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
        }[normalized(monthName)] || 1;
        passengerRecords.push({
          year,
          month: monthNum,
          month_name: monthName.toUpperCase(),
          passengers: pax,
          status: st.toLowerCase() === "real" ? "real" : st.toLowerCase() === "parcial" ? "partial" : "projection"
        });
      }
    }
  }
  console.log(`Total registros mensuales de pasajeros extraídos: ${passengerRecords.length}`);

  // 3. Extraer capacidad
  let capacityRecord = {
    terminal_passenger_capacity: 20000000,
    commercial_area_factor: 0.000821,
    recommended_commercial_area: 16420,
    leased_commercial_area: 11850.32,
    commercial_passenger_capacity: 14434007
  };
  const capSheet = workbook.find((d) => (d.sheet || d.name) === "Capacidad");
  if (capSheet && capSheet.data && capSheet.data[1]) {
    const r = capSheet.data[1];
    capacityRecord = {
      terminal_passenger_capacity: normalizeNum(r[0]) || 20000000,
      commercial_area_factor: normalizeNum(capSheet.data[4] ? capSheet.data[4][0] : null) || 0.000821,
      recommended_commercial_area: normalizeNum(r[1]) || 16420,
      leased_commercial_area: normalizeNum(r[2]) || 11850.32,
      commercial_passenger_capacity: normalizeNum(r[3]) || 14434007
    };
  }
  console.log("Capacidad ETP extraída:", capacityRecord);

  // 4. Extraer contratos independientes de las hojas contractuales
  const contractSheets = [
    { name: "CONTRATOS GSC ", stage: "formalized", defaultGerencia: "Gerencia de Servicios Comerciales" },
    { name: "GEP Contratos", stage: "formalized", defaultGerencia: "Gerencia de Espacios Publicitarios" },
    { name: "Contratos Cancelados", stage: "cancelled", defaultGerencia: "Gerencia de Servicios Comerciales" },
    { name: "Contratos Fenecidos ", stage: "expired", defaultGerencia: "Gerencia de Servicios Comerciales" },
  ];
  const allContracts = [];
  for (const cs of contractSheets) {
    const s = workbook.find((d) => (d.sheet || d.name) === cs.name);
    if (!s || !s.data || s.data.length < 2) continue;
    const rows = s.data;
    const headerRow = rows[0];
    const colMap = {};
    headerRow.forEach((colName, idx) => {
      if (colName) colMap[normalized(colName)] = idx;
    });

    const getVal = (row, candidates) => {
      for (const cand of candidates) {
        const norm = normalized(cand);
        if (colMap[norm] !== undefined) {
          const v = row[colMap[norm]];
          if (v !== undefined && v !== null && String(v).trim() !== "") return v;
        }
      }
      return null;
    };

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === "")) continue;

      const contractNumber = normalizeStr(getVal(row, ["no contrato", "contrato", "numero de contrato"]));
      const razonSocial = normalizeStr(getVal(row, ["razon social", "arrendatario", "empresa"]));
      const marca = normalizeStr(getVal(row, ["marca comercial", "marca"])) || razonSocial;
      const nom = normalizeStr(getVal(row, ["nomenclatura", "local"]));
      const zonaStr = normalizeStr(getVal(row, ["zona comercial", "zona"]));
      const metraje = normalizeNum(getVal(row, ["sup m2", "metraje", "m2"]));
      const costPerM2 = normalizeNum(getVal(row, ["costo por m2 vigente", "costo por m2"]));
      const monthlyRent = normalizeNum(getVal(row, ["renta mensual mas iva vigente", "renta mensual mas iva", "contraprestacion mensual mas iva", "contraprestacion"]));
      const part = parseParticipation(getVal(row, ["participaciones vigente", "participacion vigente", "participacion"]));
      const renewalDate = normalizeDate(getVal(row, ["fecha de renovacion", "fecha renovacion", "fecha termino"]));
      const gestor = normalizeStr(getVal(row, ["gestor"]));
      const status = normalizeStr(getVal(row, ["situacion de contrato", "situacion del contrato", "situacion del local"])) || cs.stage.toUpperCase();

      if (contractNumber || marca || nom) {
        allContracts.push({
          source_sheet: cs.name.trim(),
          contract_stage: cs.stage,
          contract_number: contractNumber,
          razon_social: razonSocial,
          marca,
          nomenclatura: nom,
          zona_comercial: zonaStr,
          metraje,
          cost_per_m2: costPerM2,
          monthly_rent: monthlyRent,
          participation_rate: part.rate,
          participation_notes: part.notes,
          renewal_date: renewalDate,
          manager: gestor,
          contract_status: status,
          gerencia: cs.defaultGerencia
        });
      }
    }
  }
  console.log(`Total contratos independientes extraídos: ${allContracts.length}`);

  // Construir SQL
  let sql = `-- MIGRACIÓN COMPLETA Y POBLADO DE CLOUDFLARE D1 (SIGCO GIAC)
DROP TABLE IF EXISTS locales;
DROP TABLE IF EXISTS zonas;
DROP TABLE IF EXISTS pasajeros;
DROP TABLE IF EXISTS capacidad;
DROP TABLE IF EXISTS contratos;

CREATE TABLE zonas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  nombre_corto TEXT NOT NULL,
  tipo_espacio_etiqueta TEXT DEFAULT 'locales'
);

INSERT INTO zonas (id, nombre, nombre_corto, tipo_espacio_etiqueta) VALUES
  ('etp', 'Edificio Terminal de Pasajeros (ETP)', 'ETP', 'locales'),
  ('parque-santa-lucia', 'Parque Santa Lucía', 'Parque Santa Lucía', 'locales'),
  ('carga-aduana', 'Edificio de Servicios', 'Edificio de Servicios', 'espacios'),
  ('autobuses-plaza', 'Terminal Intermodal de Transportación Terrestre (TITT)', 'TITT', 'locales'),
  ('parque-revolucion', 'Glorieta Felipe Ángeles (Parque Revolución)', 'Parque Revolución', 'espacios'),
  ('ciudad-aeroportuaria', 'Ciudad Aeroportuaria', 'Ciudad Aeroportuaria', 'manzanas'),
  ('calzada-mamuts', 'Calzada de los Mamuts', 'Calzada de los Mamuts', 'predios');

CREATE TABLE locales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nomenclatura TEXT NOT NULL UNIQUE,
  zona_id TEXT NOT NULL,
  lado TEXT,
  area TEXT,
  modulo TEXT,
  nivel TEXT,
  metraje REAL,
  metraje_original TEXT,
  metraje_construido REAL,
  tipo_espacio TEXT,
  estatus TEXT NOT NULL DEFAULT 'DISPONIBLE',
  situacion TEXT,
  subdireccion TEXT,
  gerencia TEXT,
  observaciones TEXT,
  marca TEXT,
  giro_iata TEXT,
  giro_operativo TEXT,
  giro_indaabin TEXT,
  fecha_formalizacion TEXT,
  fecha_conclusion TEXT,
  contract_number TEXT,
  contract_pending INTEGER DEFAULT 0,
  commercial_line TEXT,
  commercial_subline TEXT,
  cost_per_m2 REAL,
  monthly_rent REAL,
  participation_rate REAL,
  participation_notes TEXT,
  operations_start_date TEXT,
  signature_date TEXT,
  contract_term TEXT,
  renewal_date TEXT,
  days_remaining REAL,
  guarantee_status TEXT,
  liability_policy_status TEXT,
  project_status TEXT,
  contract_status TEXT,
  operational_status TEXT,
  contact_data TEXT,
  manager TEXT,
  contract_stage TEXT,
  activo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zona_id) REFERENCES zonas(id) ON UPDATE CASCADE
);

CREATE INDEX idx_locales_zona ON locales(zona_id);
CREATE INDEX idx_locales_estatus ON locales(estatus);
CREATE INDEX idx_locales_nivel ON locales(nivel);
CREATE INDEX idx_locales_marca ON locales(marca);

CREATE TABLE pasajeros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  month_name TEXT NOT NULL,
  passengers INTEGER NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE capacidad (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  terminal_passenger_capacity REAL NOT NULL,
  commercial_area_factor REAL NOT NULL,
  recommended_commercial_area REAL NOT NULL,
  leased_commercial_area REAL NOT NULL,
  commercial_passenger_capacity REAL NOT NULL
);

INSERT INTO capacidad (terminal_passenger_capacity, commercial_area_factor, recommended_commercial_area, leased_commercial_area, commercial_passenger_capacity)
VALUES (${capacityRecord.terminal_passenger_capacity}, ${capacityRecord.commercial_area_factor}, ${capacityRecord.recommended_commercial_area}, ${capacityRecord.leased_commercial_area}, ${capacityRecord.commercial_passenger_capacity});

CREATE TABLE contratos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_sheet TEXT,
  contract_stage TEXT,
  contract_number TEXT,
  razon_social TEXT,
  marca TEXT,
  nomenclatura TEXT,
  zona_comercial TEXT,
  metraje REAL,
  cost_per_m2 REAL,
  monthly_rent REAL,
  participation_rate REAL,
  participation_notes TEXT,
  renewal_date TEXT,
  manager TEXT,
  contract_status TEXT,
  gerencia TEXT
);

`;

  // Inserts de pasajeros
  if (passengerRecords.length > 0) {
    sql += `INSERT INTO pasajeros (year, month, month_name, passengers, status) VALUES\n`;
    const pRows = passengerRecords.map((p) => {
      return `  (${p.year}, ${p.month}, ${escapeSql(p.month_name)}, ${p.passengers}, ${escapeSql(p.status)})`;
    });
    sql += pRows.join(",\n") + ";\n\n";
  }

  // Inserts de contratos
  if (allContracts.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < allContracts.length; i += batchSize) {
      const chunk = allContracts.slice(i, i + batchSize);
      sql += `INSERT INTO contratos (source_sheet, contract_stage, contract_number, razon_social, marca, nomenclatura, zona_comercial, metraje, cost_per_m2, monthly_rent, participation_rate, participation_notes, renewal_date, manager, contract_status, gerencia) VALUES\n`;
      const cRows = chunk.map((c) => {
        return `  (${escapeSql(c.source_sheet)}, ${escapeSql(c.contract_stage)}, ${escapeSql(c.contract_number)}, ${escapeSql(c.razon_social)}, ${escapeSql(c.marca)}, ${escapeSql(c.nomenclatura)}, ${escapeSql(c.zona_comercial)}, ${escapeSql(c.metraje)}, ${escapeSql(c.cost_per_m2)}, ${escapeSql(c.monthly_rent)}, ${escapeSql(c.participation_rate)}, ${escapeSql(c.participation_notes)}, ${escapeSql(c.renewal_date)}, ${escapeSql(c.manager)}, ${escapeSql(c.contract_status)}, ${escapeSql(c.gerencia)})`;
      });
      sql += cRows.join(",\n") + ";\n\n";
    }
  }

  // Inserts de locales por lotes
  const batchSize = 50;
  for (let i = 0; i < allLocales.length; i += batchSize) {
    const chunk = allLocales.slice(i, i + batchSize);
    sql += `INSERT INTO locales (
      nomenclatura, zona_id, lado, area, modulo, nivel, metraje, metraje_original, metraje_construido,
      tipo_espacio, estatus, situacion, subdireccion, gerencia, observaciones, marca, giro_iata,
      giro_operativo, giro_indaabin, fecha_formalizacion, fecha_conclusion, contract_number, contract_pending,
      commercial_line, commercial_subline, cost_per_m2, monthly_rent, participation_rate, participation_notes,
      operations_start_date, signature_date, contract_term, renewal_date, days_remaining, guarantee_status,
      liability_policy_status, project_status, contract_status, operational_status, contact_data, manager, contract_stage
    ) VALUES\n`;

    const rowsSql = chunk.map((loc) => {
      return `  (${escapeSql(loc.nomenclatura)}, ${escapeSql(loc.zona_id)}, ${escapeSql(loc.lado)}, ${escapeSql(loc.area)}, ${escapeSql(loc.modulo)}, ${escapeSql(loc.nivel)}, ${escapeSql(loc.metraje)}, ${escapeSql(loc.metraje_original)}, ${escapeSql(loc.metraje_construido)}, ${escapeSql(loc.tipo_espacio)}, ${escapeSql(loc.estatus)}, ${escapeSql(loc.situacion)}, ${escapeSql(loc.subdireccion)}, ${escapeSql(loc.gerencia)}, ${escapeSql(loc.observaciones)}, ${escapeSql(loc.marca)}, ${escapeSql(loc.giro_iata)}, ${escapeSql(loc.giro_operativo)}, ${escapeSql(loc.giro_indaabin)}, ${escapeSql(loc.fecha_formalizacion)}, ${escapeSql(loc.fecha_conclusion)}, ${escapeSql(loc.contract_number)}, ${loc.contract_pending}, ${escapeSql(loc.commercial_line)}, ${escapeSql(loc.commercial_subline)}, ${escapeSql(loc.cost_per_m2)}, ${escapeSql(loc.monthly_rent)}, ${escapeSql(loc.participation_rate)}, ${escapeSql(loc.participation_notes)}, ${escapeSql(loc.operations_start_date)}, ${escapeSql(loc.signature_date)}, ${escapeSql(loc.contract_term)}, ${escapeSql(loc.renewal_date)}, ${escapeSql(loc.days_remaining)}, ${escapeSql(loc.guarantee_status)}, ${escapeSql(loc.liability_policy_status)}, ${escapeSql(loc.project_status)}, ${escapeSql(loc.contract_status)}, ${escapeSql(loc.operational_status)}, ${escapeSql(loc.contact_data)}, ${escapeSql(loc.manager)}, ${escapeSql(loc.contract_stage)})`;
    });
    sql += rowsSql.join(",\n") + ";\n\n";
  }

  const outPath = path.join(process.cwd(), "migration_locales.sql");
  fs.writeFileSync(outPath, sql, "utf8");
  console.log(`Archivo SQL generado exitosamente en: ${outPath}`);
}

main().catch(console.error);
