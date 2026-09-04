import readXlsxFile from "read-excel-file/node";

const filePath = "C:\\Users\\joelm\\Documents\\AIFA\\LOCALES y CONTRATOS\\RELACION DE LOCALES COMERCIALES PMD (4TA).xlsx";

async function run() {
  const sheets = await readXlsxFile(filePath, { getSheets: true });
  console.log("Total Hojas:", sheets.length);
  for (const s of sheets) {
    const rows = await readXlsxFile(filePath, { sheet: s.name });
    const headers = rows.length > 0 ? rows[0] : [];
    console.log(`\nHoja: [${s.name}] - Filas: ${rows.length}`);
    console.log("Encabezados:", JSON.stringify(headers));
  }
}

run();
