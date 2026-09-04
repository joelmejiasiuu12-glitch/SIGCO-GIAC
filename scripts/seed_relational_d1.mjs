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
  console.log("=== INICIANDO EXTRACCIÓN RELACIONAL NORMALIZADA ===");

  const localesList = [];
  const seenNomenclaturas = new Set();
  
  // Maps to deduplicate and assign IDs
  const marcasMap = new Map(); // key: nombre_comercial -> { id, nombre_comercial, giro_operativo, giro_iata, giro_indaabin, linea_comercial, sublinea_comercial }
  const razonesMap = new Map(); // key: razon_social -> { id, razon_social, rfc, representante_legal, datos_contacto, administrador_gerente_responsable }
  const contratosMap = new Map(); // key: numero_contrato -> contratoObj
  const contratoLocalesList = []; // { contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2, renta_vigente_actualizada, porcentaje_participacion, notas_participacion }

  let nextMarcaId = 1;
  let nextRazonId = 1;

  function getOrCreateMarca(name, giroOp, giroIat, giroInda, line, subline) {
    const cleanName = normalizeStr(name);
    if (!cleanName) return null;
    const key = cleanName.toUpperCase();
    if (!marcasMap.has(key)) {
      marcasMap.set(key, {
        id: nextMarcaId++,
        nombre_comercial: cleanName,
        giro_operativo: normalizeStr(giroOp),
        giro_iata: normalizeStr(giroIat),
        giro_indaabin: normalizeStr(giroInda),
        linea_comercial: normalizeStr(line),
        sublinea_comercial: normalizeStr(subline),
      });
    } else {
      const existing = marcasMap.get(key);
      if (!existing.giro_operativo && giroOp) existing.giro_operativo = normalizeStr(giroOp);
      if (!existing.giro_iata && giroIat) existing.giro_iata = normalizeStr(giroIat);
      if (!existing.giro_indaabin && giroInda) existing.giro_indaabin = normalizeStr(giroInda);
      if (!existing.linea_comercial && line) existing.linea_comercial = normalizeStr(line);
      if (!existing.sublinea_comercial && subline) existing.sublinea_comercial = normalizeStr(subline);
    }
    return marcasMap.get(key).id;
  }

  function getOrCreateRazonSocial(name, rfc, repLegal, contacto, admin) {
    const cleanName = normalizeStr(name);
    if (!cleanName) return null;
    const key = cleanName.toUpperCase();
    if (!razonesMap.has(key)) {
      razonesMap.set(key, {
        id: nextRazonId++,
        razon_social: cleanName,
        rfc: normalizeStr(rfc),
        representante_legal: normalizeStr(repLegal),
        datos_contacto: normalizeStr(contacto),
        administrador_gerente_responsable: normalizeStr(admin),
      });
    } else {
      const existing = razonesMap.get(key);
      if (!existing.datos_contacto && contacto) existing.datos_contacto = normalizeStr(contacto);
      if (!existing.representante_legal && repLegal) existing.representante_legal = normalizeStr(repLegal);
    }
    return razonesMap.get(key).id;
  }

  // 1. PROCESAR LAS 7 ZONAS COMERCIALES (Excluyendo explícitamente ETP(205))
  for (const mapping of zoneMapping) {
    const sheet = workbook.find((d) => (d.sheet || d.name) === mapping.sheetName);
    if (!sheet || !sheet.data) continue;

    const rows = sheet.data;
    const headerRow = rows[mapping.headerRowIndex];
    if (!headerRow) continue;

    const colMap = {};
    headerRow.forEach((colName, idx) => {
      if (colName) colMap[normalized(colName)] = idx;
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

      // REGLA CRÍTICA INSTITUCIONAL: En ETP excluir los 28 locales de Movilidad / Taxis para mantener exactamente el inventario comercial de Servicios Comerciales (347 de ETP -> 573 total)
      const subdireccionRaw = normalizeStr(getVal(row, ["subdireccion encargada", "subdireccion", "subdirección encargada", "subdirección"])) || "SVS COM";
      if (mapping.locationId === "etp") {
        const normSub = normalized(subdireccionRaw);
        if (normSub.includes("movilidad") || normSub.includes("taxi")) {
          continue;
        }
      }

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

      const estatusFisico = normalizeStr(getVal(row, ["estatus", "estatus comercial"])) || "DISPONIBLE";
      const situacion = normalizeStr(getVal(row, ["situacion", "situación", "condicion"]));
      const gerencia = normalizeStr(getVal(row, ["gerencia"])) || "GSC";

      localesList.push({
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
        estatus_fisico: estatusFisico.toUpperCase(),
        situacion,
        subdireccion_responsable: subdireccionRaw,
        gerencia,
        observaciones: obs,
      });

      // Información comercial / contractual si este local tiene contrato asignado
      const marcaRaw = normalizeStr(getVal(row, ["marca comercial", "marca", "empresa", "nombre comercial"]));
      const giroIata = normalizeStr(getVal(row, ["giro iata"]));
      const giroOperativo = normalizeStr(getVal(row, ["giro operativo", "giro aci", "giro"]));
      const giroIndaabin = normalizeStr(getVal(row, ["giro indaabin"]));
      const commLine = normalizeStr(getVal(row, ["giro comercial"]));
      const commSubline = normalizeStr(getVal(row, ["subgiro comercial"]));

      let marcaId = null;
      if (marcaRaw) {
        marcaId = getOrCreateMarca(marcaRaw, giroOperativo, giroIata, giroIndaabin, commLine, commSubline);
      }

      const contractNumber = normalizeStr(getVal(row, ["no contrato", "numero de contrato", "contrato", "no expediente", "expediente"]));
      const costPerM2 = normalizeNum(getVal(row, ["costo por m2", "costo m2"]));
      const monthlyRent = normalizeNum(getVal(row, ["renta mensual mas iva", "renta mensual iva", "renta mensual", "contraprestacion mensual mas iva", "contraprestacion mensual"]));
      const partParsed = parseParticipation(getVal(row, ["participacion", "participaciones", "porcentaje participacion"]));
      
      const fechaFormalizacion = normalizeDate(getVal(row, ["fecha de formalizacion", "fecha formalizacion"]));
      const fechaConclusion = normalizeDate(getVal(row, ["fecha de conclusion", "fecha conclusion"]));
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

      // El inventario de locales físicos solo registra espacios (localesList).
      // Los contratos provienen estrictamente de las hojas CONTRATOS GSC y GEP Contratos.
    }
  }

  console.log(`✅ Total de locales físicos reales extraídos: ${localesList.length}`);

  // 2. PROCESAR HOJAS DE CONTRATOS ESTRICTAMENTE OFICIALES: CONTRATOS GSC (246) Y GEP Contratos (18)
  const contractSheets = [
    { name: "CONTRATOS GSC ", stage: "Formalizado", defaultGerencia: "GSC" },
    { name: "GEP Contratos", stage: "Formalizado", defaultGerencia: "GEP" },
  ];

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

      const numContrato = normalizeStr(getVal(row, ["no contrato", "contrato", "numero de contrato"]));
      if (!numContrato) continue; // Solo filas con número de contrato formal

      const razonSocialStr = normalizeStr(getVal(row, ["razon social", "arrendatario", "empresa"]));
      const marcaStr = normalizeStr(getVal(row, ["marca comercial", "marca"])) || razonSocialStr;
      const nom = normalizeStr(getVal(row, ["nomenclatura", "local", "bien arrendado"]));
      const costPerM2 = normalizeNum(getVal(row, ["costo por m2 vigente", "costo por m2", "costo por m2 unidad"]));
      const monthlyRent = normalizeNum(getVal(row, ["renta mensual mas iva vigente", "renta mensual mas iva", "contraprestacion mensual mas iva", "contraprestacion"]));
      const part = parseParticipation(getVal(row, ["participaciones vigente", "participacion vigente", "participacion", "participaciones"]));
      const renewalDate = normalizeDate(getVal(row, ["fecha de renovacion", "fecha renovacion", "fecha termino"]));
      const sigDate = normalizeDate(getVal(row, ["fecha firma contrato", "fecha de firma"]));
      const opDate = normalizeDate(getVal(row, ["fecha inicio operaciones"]));
      const term = normalizeStr(getVal(row, ["vigencia del contrato", "vigencia"]));
      const dias = normalizeNum(getVal(row, ["dias restantes", "dias resatantes", "dias por vencer"]));
      const fianza = normalizeStr(getVal(row, ["garantia de cumplimiento"]));
      const poliza = normalizeStr(getVal(row, ["poliza de r c"]));
      const obra = normalizeStr(getVal(row, ["proyecto de obra"]));
      const contacto = normalizeStr(getVal(row, ["datos de contacto"]));
      const gestor = normalizeStr(getVal(row, ["gestor"]));
      const status = normalizeStr(getVal(row, ["situacion de contrato", "situacion del contrato"])) || cs.stage;
      const commLine = normalizeStr(getVal(row, ["giro comercial"]));
      const commSub = normalizeStr(getVal(row, ["subgiro comercial"]));

      let marcaId = null;
      if (marcaStr) {
        marcaId = getOrCreateMarca(marcaStr, commLine, null, null, commLine, commSub);
      }

      let razonId = null;
      if (razonSocialStr) {
        razonId = getOrCreateRazonSocial(razonSocialStr, null, null, contacto, gestor);
      }

      const keyContrato = numContrato;
      if (!contratosMap.has(keyContrato)) {
        contratosMap.set(keyContrato, {
          numero_contrato: keyContrato,
          razon_social_id: razonId,
          marca_id: marcaId,
          gerencia: cs.defaultGerencia,
          etapa_contractual: cs.stage,
          estatus_operativo: status,
          fecha_firma: sigDate,
          fecha_inicio_operaciones: opDate,
          fecha_conclusion: null,
          fecha_renovacion: renewalDate,
          plazo_vigencia: term,
          dias_restantes: dias,
          estatus_fianza: fianza,
          estatus_poliza_rc: poliza,
          estatus_proyecto_obra: obra,
          gestor_responsable: gestor,
          observaciones_expediente: `Hoja origen: ${cs.name.trim()}`,
          monto_renta_mensual: monthlyRent,
          costo_por_m2: costPerM2,
          porcentaje_participacion: part.rate,
          local_referencia: nom,
        });
      } else {
        const existing = contratosMap.get(keyContrato);
        if (!existing.razon_social_id && razonId) existing.razon_social_id = razonId;
        if (!existing.marca_id && marcaId) existing.marca_id = marcaId;
        if (!existing.fecha_renovacion && renewalDate) existing.fecha_renovacion = renewalDate;
        if (!existing.monto_renta_mensual && monthlyRent) existing.monto_renta_mensual = monthlyRent;
        if (!existing.local_referencia && nom) existing.local_referencia = nom;
      }

      // Si tiene local asociado, vincular en contrato_locales
      if (nom) {
        const alreadyLinked = contratoLocalesList.some(cl => cl.contrato_id === keyContrato && cl.local_nomenclatura === nom);
        if (!alreadyLinked) {
          contratoLocalesList.push({
            contrato_id: keyContrato,
            local_nomenclatura: nom,
            renta_mensual_fija: monthlyRent,
            costo_por_m2: costPerM2,
            renta_vigente_actualizada: monthlyRent,
            porcentaje_participacion: part.rate,
            notas_participacion: part.notes,
          });
        }
      }
    }
  }

  console.log(`✅ Total de marcas registradas: ${marcasMap.size}`);
  console.log(`✅ Total de razones sociales registradas: ${razonesMap.size}`);
  console.log(`✅ Total de contratos registrados: ${contratosMap.size}`);
  console.log(`✅ Total de vínculos contrato-locales: ${contratoLocalesList.length}`);

  // 3. CAPACIDAD COMERCIAL
  let capacityRecord = {
    terminal_passenger_capacity: 20000000,
    commercial_area_factor: 0.000821,
    recommended_commercial_area: 16420,
    leased_commercial_area: 11850.32,
    commercial_passenger_capacity: 14434007.3
  };
  const capSheet = workbook.find((d) => (d.sheet || d.name) === "Capacidad");
  if (capSheet && capSheet.data && capSheet.data[1]) {
    const r = capSheet.data[1];
    capacityRecord = {
      terminal_passenger_capacity: normalizeNum(r[0]) || 20000000,
      commercial_area_factor: normalizeNum(capSheet.data[4] ? capSheet.data[4][0] : null) || 0.000821,
      recommended_commercial_area: normalizeNum(r[1]) || 16420,
      leased_commercial_area: normalizeNum(r[2]) || 11850.32,
      commercial_passenger_capacity: normalizeNum(r[3]) || 14434007.3
    };
  }

  // 4. TRÁFICO DE PASAJEROS
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

  // 5. GENERACIÓN DEL SCRIPT SQL COMPLETO PARA CLOUDFLARE D1
  let sql = `-- =====================================================================
-- SCHEMA NORMALIZADO SIGCO GIAC - CLOUDFLARE D1
-- =====================================================================

DROP VIEW IF EXISTS v_locales_completo;
DROP TABLE IF EXISTS contrato_locales;
DROP TABLE IF EXISTS contratos;
DROP TABLE IF EXISTS razones_sociales;
DROP TABLE IF EXISTS marcas;
DROP TABLE IF EXISTS locales;
DROP TABLE IF EXISTS zonas;
DROP TABLE IF EXISTS capacidad_comercial;
DROP TABLE IF EXISTS trafico_pasajeros;

-- 1. ZONAS COMERCIALES
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

-- 2. LOCALES (EL ESPACIO FÍSICO)
CREATE TABLE locales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nomenclatura TEXT NOT NULL UNIQUE,
  zona_id TEXT NOT NULL,
  lado TEXT,
  area TEXT,
  modulo TEXT,
  nivel TEXT,
  tipo_espacio TEXT NOT NULL,
  metraje REAL,
  metraje_original TEXT,
  metraje_construido REAL,
  estatus_fisico TEXT NOT NULL DEFAULT 'DISPONIBLE',
  situacion TEXT,
  subdireccion_responsable TEXT DEFAULT 'SVS COM',
  gerencia TEXT DEFAULT 'GSC',
  observaciones TEXT,
  activo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zona_id) REFERENCES zonas(id) ON UPDATE CASCADE
);

CREATE INDEX idx_locales_zona ON locales(zona_id);
CREATE INDEX idx_locales_estatus ON locales(estatus_fisico);
CREATE INDEX idx_locales_nivel ON locales(nivel);

-- 3. MARCAS (IDENTIDAD COMERCIAL Y GIROS)
CREATE TABLE marcas (
  id INTEGER PRIMARY KEY,
  nombre_comercial TEXT NOT NULL UNIQUE,
  giro_operativo TEXT,
  giro_iata TEXT,
  giro_indaabin TEXT,
  linea_comercial TEXT,
  sublinea_comercial TEXT
);

CREATE INDEX idx_marcas_nombre ON marcas(nombre_comercial);

-- 4. RAZONES SOCIALES (ENTIDAD JURÍDICA / ARRENDATARIO)
CREATE TABLE razones_sociales (
  id INTEGER PRIMARY KEY,
  razon_social TEXT NOT NULL UNIQUE,
  rfc TEXT,
  representante_legal TEXT,
  datos_contacto TEXT,
  administrador_gerente_responsable TEXT
);

-- 5. CONTRATOS (EXPEDIENTE JURÍDICO Y ADMINISTRATIVO)
CREATE TABLE contratos (
  numero_contrato TEXT PRIMARY KEY,
  razon_social_id INTEGER,
  marca_id INTEGER,
  gerencia TEXT,
  etapa_contractual TEXT,
  estatus_operativo TEXT,
  fecha_firma TEXT,
  fecha_inicio_operaciones TEXT,
  fecha_conclusion TEXT,
  fecha_renovacion TEXT,
  plazo_vigencia TEXT,
  dias_restantes INTEGER,
  estatus_fianza TEXT,
  estatus_poliza_rc TEXT,
  estatus_proyecto_obra TEXT,
  gestor_responsable TEXT,
  observaciones_expediente TEXT,
  monto_renta_mensual REAL,
  costo_por_m2 REAL,
  porcentaje_participacion REAL,
  local_referencia TEXT,
  FOREIGN KEY (razon_social_id) REFERENCES razones_sociales(id),
  FOREIGN KEY (marca_id) REFERENCES marcas(id)
);

CREATE INDEX idx_contratos_marca ON contratos(marca_id);
CREATE INDEX idx_contratos_etapa ON contratos(etapa_contractual);

-- 6. CONTRATO_LOCALES (RELACIÓN 1 CONTRATO A N LOCALES)
CREATE TABLE contrato_locales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contrato_id TEXT NOT NULL,
  local_nomenclatura TEXT NOT NULL,
  renta_mensual_fija REAL,
  costo_por_m2 REAL,
  renta_vigente_actualizada REAL,
  porcentaje_participacion REAL,
  notas_participacion TEXT,
  FOREIGN KEY (contrato_id) REFERENCES contratos(numero_contrato) ON DELETE CASCADE,
  UNIQUE(contrato_id, local_nomenclatura)
);

CREATE INDEX idx_contrato_locales_local ON contrato_locales(local_nomenclatura);

-- 7. CAPACIDAD COMERCIAL
CREATE TABLE capacidad_comercial (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  terminal_passenger_capacity REAL NOT NULL,
  commercial_area_factor REAL NOT NULL,
  recommended_commercial_area REAL NOT NULL,
  leased_commercial_area REAL NOT NULL,
  commercial_passenger_capacity REAL NOT NULL
);

INSERT INTO capacidad_comercial (terminal_passenger_capacity, commercial_area_factor, recommended_commercial_area, leased_commercial_area, commercial_passenger_capacity)
VALUES (${capacityRecord.terminal_passenger_capacity}, ${capacityRecord.commercial_area_factor}, ${capacityRecord.recommended_commercial_area}, ${capacityRecord.leased_commercial_area}, ${capacityRecord.commercial_passenger_capacity});

-- 8. TRÁFICO DE PASAJEROS
CREATE TABLE trafico_pasajeros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  month_name TEXT NOT NULL,
  passengers INTEGER NOT NULL,
  status TEXT NOT NULL
);

-- VISTA COMPLETA DE FUSIÓN PARA EL FRONTEND Y APIS
CREATE VIEW v_locales_completo AS
SELECT 
  l.id,
  l.nomenclatura,
  l.zona_id,
  l.lado,
  l.area,
  l.modulo,
  l.nivel,
  l.tipo_espacio,
  l.metraje,
  l.metraje_original,
  l.metraje_construido,
  l.estatus_fisico AS estatus,
  l.situacion,
  l.subdireccion_responsable AS subdireccion,
  COALESCE(c.gerencia, l.gerencia) AS gerencia,
  l.observaciones,
  l.activo,
  m.nombre_comercial AS marca,
  m.giro_operativo,
  m.giro_iata,
  m.giro_indaabin,
  m.linea_comercial AS commercial_line,
  m.sublinea_comercial AS commercial_subline,
  c.numero_contrato AS contract_number,
  c.fecha_firma AS fecha_formalizacion,
  c.fecha_conclusion,
  c.fecha_inicio_operaciones AS operations_start_date,
  c.fecha_firma AS signature_date,
  c.fecha_renovacion AS renewal_date,
  c.plazo_vigencia AS contract_term,
  c.dias_restantes AS days_remaining,
  c.estatus_fianza AS guarantee_status,
  c.estatus_poliza_rc AS liability_policy_status,
  c.estatus_proyecto_obra AS project_status,
  c.etapa_contractual AS contract_stage,
  c.estatus_operativo AS contract_status,
  c.gestor_responsable AS manager,
  cl.renta_mensual_fija AS monthly_rent,
  cl.costo_por_m2,
  cl.porcentaje_participacion AS participation_rate,
  cl.notas_participacion AS participation_notes,
  rs.razon_social,
  rs.datos_contacto AS contact_data
FROM locales l
LEFT JOIN (
  SELECT * FROM (
    SELECT *, ROW_NUMBER() OVER (
      PARTITION BY local_nomenclatura 
      ORDER BY 
        CASE WHEN renta_mensual_fija > 0 THEN 1 ELSE 2 END,
        id DESC
    ) AS rn
    FROM contrato_locales
  ) WHERE rn = 1
) cl ON l.nomenclatura = cl.local_nomenclatura
LEFT JOIN contratos c ON cl.contrato_id = c.numero_contrato
LEFT JOIN marcas m ON c.marca_id = m.id
LEFT JOIN razones_sociales rs ON c.razon_social_id = rs.id;

`;

  // Insertar Marcas
  if (marcasMap.size > 0) {
    const arr = Array.from(marcasMap.values());
    const batchSize = 15;
    for (let i = 0; i < arr.length; i += batchSize) {
      const chunk = arr.slice(i, i + batchSize);
      sql += `INSERT INTO marcas (id, nombre_comercial, giro_operativo, giro_iata, giro_indaabin, linea_comercial, sublinea_comercial) VALUES\n`;
      const rowsSql = chunk.map(m => `  (${m.id}, ${escapeSql(m.nombre_comercial)}, ${escapeSql(m.giro_operativo)}, ${escapeSql(m.giro_iata)}, ${escapeSql(m.giro_indaabin)}, ${escapeSql(m.linea_comercial)}, ${escapeSql(m.sublinea_comercial)})`);
      sql += rowsSql.join(",\n") + ";\n\n";
    }
  }

  // Insertar Razones Sociales
  if (razonesMap.size > 0) {
    const arr = Array.from(razonesMap.values());
    const batchSize = 15;
    for (let i = 0; i < arr.length; i += batchSize) {
      const chunk = arr.slice(i, i + batchSize);
      sql += `INSERT INTO razones_sociales (id, razon_social, rfc, representante_legal, datos_contacto, administrador_gerente_responsable) VALUES\n`;
      const rowsSql = chunk.map(r => `  (${r.id}, ${escapeSql(r.razon_social)}, ${escapeSql(r.rfc)}, ${escapeSql(r.representante_legal)}, ${escapeSql(r.datos_contacto)}, ${escapeSql(r.administrador_gerente_responsable)})`);
      sql += rowsSql.join(",\n") + ";\n\n";
    }
  }

  // Insertar Locales (573)
  const batchSizeLoc = 15;
  for (let i = 0; i < localesList.length; i += batchSizeLoc) {
    const chunk = localesList.slice(i, i + batchSizeLoc);
    sql += `INSERT INTO locales (nomenclatura, zona_id, lado, area, modulo, nivel, tipo_espacio, metraje, metraje_original, metraje_construido, estatus_fisico, situacion, subdireccion_responsable, gerencia, observaciones) VALUES\n`;
    const rowsSql = chunk.map(l => `  (${escapeSql(l.nomenclatura)}, ${escapeSql(l.zona_id)}, ${escapeSql(l.lado)}, ${escapeSql(l.area)}, ${escapeSql(l.modulo)}, ${escapeSql(l.nivel)}, ${escapeSql(l.tipo_espacio)}, ${escapeSql(l.metraje)}, ${escapeSql(l.metraje_original)}, ${escapeSql(l.metraje_construido)}, ${escapeSql(l.estatus_fisico)}, ${escapeSql(l.situacion)}, ${escapeSql(l.subdireccion_responsable)}, ${escapeSql(l.gerencia)}, ${escapeSql(l.observaciones)})`);
    sql += rowsSql.join(",\n") + ";\n\n";
  }

  // Insertar Contratos
  if (contratosMap.size > 0) {
    const arr = Array.from(contratosMap.values());
    const batchSize = 15;
    for (let i = 0; i < arr.length; i += batchSize) {
      const chunk = arr.slice(i, i + batchSize);
      sql += `INSERT INTO contratos (numero_contrato, razon_social_id, marca_id, gerencia, etapa_contractual, estatus_operativo, fecha_firma, fecha_inicio_operaciones, fecha_conclusion, fecha_renovacion, plazo_vigencia, dias_restantes, estatus_fianza, estatus_poliza_rc, estatus_proyecto_obra, gestor_responsable, observaciones_expediente, monto_renta_mensual, costo_por_m2, porcentaje_participacion, local_referencia) VALUES\n`;
      const rowsSql = chunk.map(c => `  (${escapeSql(c.numero_contrato)}, ${c.razon_social_id || "NULL"}, ${c.marca_id || "NULL"}, ${escapeSql(c.gerencia)}, ${escapeSql(c.etapa_contractual)}, ${escapeSql(c.estatus_operativo)}, ${escapeSql(c.fecha_firma)}, ${escapeSql(c.fecha_inicio_operaciones)}, ${escapeSql(c.fecha_conclusion)}, ${escapeSql(c.fecha_renovacion)}, ${escapeSql(c.plazo_vigencia)}, ${c.dias_restantes !== null && c.dias_restantes !== undefined ? c.dias_restantes : "NULL"}, ${escapeSql(c.estatus_fianza)}, ${escapeSql(c.estatus_poliza_rc)}, ${escapeSql(c.estatus_proyecto_obra)}, ${escapeSql(c.gestor_responsable)}, ${escapeSql(c.observaciones_expediente)}, ${escapeSql(c.monto_renta_mensual)}, ${escapeSql(c.costo_por_m2)}, ${escapeSql(c.porcentaje_participacion)}, ${escapeSql(c.local_referencia)})`);
      sql += rowsSql.join(",\n") + ";\n\n";
    }
  }

  // Insertar Contrato-Locales
  if (contratoLocalesList.length > 0) {
    const batchSize = 15;
    for (let i = 0; i < contratoLocalesList.length; i += batchSize) {
      const chunk = contratoLocalesList.slice(i, i + batchSize);
      sql += `INSERT INTO contrato_locales (contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2, renta_vigente_actualizada, porcentaje_participacion, notas_participacion) VALUES\n`;
      const rowsSql = chunk.map(cl => `  (${escapeSql(cl.contrato_id)}, ${escapeSql(cl.local_nomenclatura)}, ${escapeSql(cl.renta_mensual_fija)}, ${escapeSql(cl.costo_por_m2)}, ${escapeSql(cl.renta_vigente_actualizada)}, ${escapeSql(cl.porcentaje_participacion)}, ${escapeSql(cl.notas_participacion)})`);
      sql += rowsSql.join(",\n") + ";\n\n";
    }
  }

  // Insertar Pasajeros
  if (passengerRecords.length > 0) {
    sql += `INSERT INTO trafico_pasajeros (year, month, month_name, passengers, status) VALUES\n`;
    const rowsSql = passengerRecords.map(p => `  (${p.year}, ${p.month}, ${escapeSql(p.month_name)}, ${p.passengers}, ${escapeSql(p.status)})`);
    sql += rowsSql.join(",\n") + ";\n\n";
  }

  const outPath = path.join(process.cwd(), "migration_locales.sql");
  fs.writeFileSync(outPath, sql, "utf8");
  console.log(`\n🎉 Script SQL relacional normalizado generado exitosamente en: ${outPath}`);
  console.log(`- Locales físicos: ${localesList.length}`);
  console.log(`- Marcas: ${marcasMap.size}`);
  console.log(`- Razones sociales: ${razonesMap.size}`);
  console.log(`- Contratos: ${contratosMap.size}`);
  console.log(`- Vínculos Contrato-Locales: ${contratoLocalesList.length}`);
  console.log(`- Registros de Pasajeros: ${passengerRecords.length}`);
}

main().catch(console.error);
