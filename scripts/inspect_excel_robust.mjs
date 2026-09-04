import readXlsxFile from "read-excel-file/node";

const filePath = "C:\\Users\\joelm\\Documents\\AIFA\\LOCALES y CONTRATOS\\RELACION DE LOCALES COMERCIALES PMD (4TA).xlsx";

async function run() {
  const sheets = await readXlsxFile(filePath, { getSheets: true });
  console.log("Total hojas encontradas:", sheets.length);
  for (const s of sheets) {
    try {
      const rows = await readXlsxFile(filePath, { sheet: s.name });
      console.log(`\n=============================`);
      console.log(`HOJA: "${s.name}" | Total filas: ${rows.length}`);
      if (Array.isArray(rows) && rows.length > 0) {
        console.log("Fila 1 (Headers):", rows[0]);
        if (rows.length > 1) {
          console.log("Fila 2 (Ejemplo):", rows[1]);
        }
      }
    } catch (e) {
      console.error(`Error en hoja "${s.name}":`, e.message);
    }
  }
}

run();
