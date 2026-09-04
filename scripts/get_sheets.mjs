import readXlsxFile from "read-excel-file/node";

const filePath = "C:\\Users\\joelm\\Documents\\AIFA\\LOCALES y CONTRATOS\\RELACION DE LOCALES COMERCIALES PMD (4TA).xlsx";

async function main() {
  const sheets = await readXlsxFile(filePath, { getSheets: true });
  console.log("=== HOJAS EN EL EXCEL ===");
  console.log(JSON.stringify(sheets, null, 2));
}

main().catch(console.error);
