import readXlsxFile from "read-excel-file/node";
import fs from "fs";
import path from "path";

const filePath = "C:\\Users\\joelm\\Documents\\AIFA\\LOCALES y CONTRATOS\\RELACION DE LOCALES COMERCIALES PMD (4TA).xlsx";

const zoneMapping = [
  { sheetName: "ETP", locationId: "etp", headerRowIndex: 1 },
  { sheetName: "Pq. Sta. Lucía", locationId: "parque-santa-lucia", headerRowIndex: 1 },
  { sheetName: "Pq. Rev.", locationId: "parque-revolucion", headerRowIndex: 1 },
  { sheetName: "Edif. Svs.", locationId: "carga-aduana", headerRowIndex: 2 },
  { sheetName: "TITT", locationId: "autobuses-plaza", headerRowIndex: 1 },
  { sheetName: "Cd. Aeroportuaria", locationId: "ciudad-aeroportuaria", headerRowIndex: 1 },
  { sheetName: "Calz. Mamuts", locationId: "calzada-mamuts", headerRowIndex: 1 },
];

function normalizeStr(val) {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  return str.length > 0 ? str : null;
}

function normalizeNum(val) {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (!val) return null;
  const cleaned = String(val).replace(/,/g, "").replace(/[$]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
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

async function generateSeed() {
  const data = await readXlsxFile(filePath, { getSheets: true });
  const allLocales = [];
  const seenNomenclaturas = new Set();

  for (const mapping of zoneMapping) {
    const item = data.find((d) => (d.sheet || d.name) === mapping.sheetName);
    if (!item || !item.data) continue;

    const rows = item.data;
    const headerRow = rows[mapping.headerRowIndex];
    if (!headerRow) continue;

    const colMap = {};
    headerRow.forEach((colName, idx) => {
      if (colName) {
        const normCol = String(colName).toLowerCase().trim();
        colMap[normCol] = idx;
      }
    });

    const getVal = (row, candidates) => {
      for (const cand of candidates) {
        if (colMap[cand] !== undefined) {
          const v = row[colMap[cand]];
          if (v !== undefined && v !== null && String(v).trim() !== "") return v;
        }
      }
      return null;
    };

    // Process data rows
    for (let r = mapping.headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === "")) continue;

      const nomRaw = getVal(row, ["nomenclatura", "local", "no. local", "no", "clave"]);
      if (!nomRaw) continue;
      const nom = String(nomRaw).trim();
      if (nom.toLowerCase().includes("total") || nom.toLowerCase().includes("locales comerciales")) continue;
      if (seenNomenclaturas.has(nom)) {
        console.warn(`[DUPLICADO OMITIDO] Nomenclatura ya existe: ${nom} en ${mapping.sheetName}`);
        continue;
      }
      seenNomenclaturas.add(nom);

      const lado = normalizeStr(getVal(row, ["lado"]));
      const area = normalizeStr(getVal(row, ["área", "area"]));
      const modulo = normalizeStr(getVal(row, ["modulo", "módulo"]));
      const nivel = normalizeStr(getVal(row, ["nivel"]));
      const metrajeRaw = getVal(row, ["metraje", "m2", "sup m2", "superficie"]);
      const metraje = normalizeNum(metrajeRaw);
      const metrajeOriginal = normalizeStr(metrajeRaw);
      const metrajeConstruido = normalizeNum(getVal(row, ["metraje construido", "metraje_construido"]));
      const tipoEspacioRaw = normalizeStr(getVal(row, ["tipo de local", "tipo local", "tipo de area", "área comercial", "area comercial"]));
      const obs = normalizeStr(getVal(row, ["observaciones"]));
      const tipoEspacio = inferSpaceType(nom, tipoEspacioRaw, obs);
      const estatus = normalizeStr(getVal(row, ["estatus"])) || "DISPONIBLE";
      const situacion = normalizeStr(getVal(row, ["situación", "situacion"]));
      const subdireccion = normalizeStr(getVal(row, ["subdireccion encargada", "subdirección encargada", "subdireccion", "subdirección"]));
      const gerencia = normalizeStr(getVal(row, ["gerencia"]));

      allLocales.push({
        nomenclatura: nom,
        zona_id: mapping.locationId,
        lado,
        area,
        modulo,
        nivel,
        metraje,
        metraje_original: metrajeOriginal,
        metraje_construido: metrajeConstruido,
        tipo_espacio: tipoEspacio,
        estatus: estatus.toUpperCase(),
        situacion,
        subdireccion,
        gerencia,
        observaciones: obs,
      });
    }
  }

  console.log(`\nTotal locales válidos extraídos de las 7 zonas: ${allLocales.length}`);

  // Build SQL
  let sql = `-- MIGRACIÓN Y POBLADO DE TABLA 'LOCALES' EN CLOUDFLARE D1
DROP TABLE IF EXISTS locales;
DROP TABLE IF EXISTS zonas;

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
  activo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zona_id) REFERENCES zonas(id) ON UPDATE CASCADE
);

CREATE INDEX idx_locales_zona ON locales(zona_id);
CREATE INDEX idx_locales_estatus ON locales(estatus);
CREATE INDEX idx_locales_nivel ON locales(nivel);
CREATE INDEX idx_locales_modulo ON locales(modulo);

`;

  // Generate batch inserts
  const batchSize = 50;
  for (let i = 0; i < allLocales.length; i += batchSize) {
    const chunk = allLocales.slice(i, i + batchSize);
    sql += `INSERT INTO locales (nomenclatura, zona_id, lado, area, modulo, nivel, metraje, metraje_original, metraje_construido, tipo_espacio, estatus, situacion, subdireccion, gerencia, observaciones) VALUES\n`;
    const rowsSql = chunk.map((loc) => {
      return `  (${escapeSql(loc.nomenclatura)}, ${escapeSql(loc.zona_id)}, ${escapeSql(loc.lado)}, ${escapeSql(loc.area)}, ${escapeSql(loc.modulo)}, ${escapeSql(loc.nivel)}, ${escapeSql(loc.metraje)}, ${escapeSql(loc.metraje_original)}, ${escapeSql(loc.metraje_construido)}, ${escapeSql(loc.tipo_espacio)}, ${escapeSql(loc.estatus)}, ${escapeSql(loc.situacion)}, ${escapeSql(loc.subdireccion)}, ${escapeSql(loc.gerencia)}, ${escapeSql(loc.observaciones)})`;
    });
    sql += rowsSql.join(",\n") + ";\n\n";
  }

  const outPath = path.join(process.cwd(), "migration_locales.sql");
  fs.writeFileSync(outPath, sql, "utf8");
  console.log(`Archivo SQL generado exitosamente en: ${outPath} (${allLocales.length} locales listos para D1)`);
}

generateSeed().catch(console.error);
