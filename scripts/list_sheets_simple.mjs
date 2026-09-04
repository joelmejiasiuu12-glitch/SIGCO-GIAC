import readXlsxFile from "read-excel-file/node";

const filePath = "C:\\Users\\joelm\\Documents\\AIFA\\LOCALES y CONTRATOS\\RELACION DE LOCALES COMERCIALES PMD (4TA).xlsx";

async function run() {
  const sheets = await readXlsxFile(filePath, { getSheets: true });
  for (const s of sheets) {
    const rows = await readXlsxFile(filePath, { sheet: s.name });
    console.log(`HOJA: [${s.name}] - Filas: ${rows.length}`);
    if (rows.length > 0) {
      console.log("  Headers:", rows[0].filter(Boolean));
    }
  }
}

run();
