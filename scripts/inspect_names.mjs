import readXlsxFile from "read-excel-file/node";

const filePath = "C:\\Users\\joelm\\Documents\\AIFA\\LOCALES y CONTRATOS\\RELACION DE LOCALES COMERCIALES PMD (4TA).xlsx";

async function main() {
  const sheets = await readXlsxFile(filePath, { getSheets: true });
  console.log("=== HOJAS ===");
  for (const s of sheets) {
    const sheetName = typeof s === "string" ? s : s.name;
    const rows = await readXlsxFile(filePath, { sheet: sheetName });
    console.log(`HOJA: [${sheetName}] - Filas: ${rows.length}`);
    if (rows.length > 0) {
      console.log("  Headers:", rows[0]);
    }
  }
}

main().catch(console.error);
