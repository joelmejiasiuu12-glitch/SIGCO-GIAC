import readXlsxFile from "read-excel-file/node";

const filePath = "C:\\Users\\joelm\\Documents\\AIFA\\LOCALES y CONTRATOS\\RELACION DE LOCALES COMERCIALES PMD (4TA).xlsx";

async function main() {
  const data = await readXlsxFile(filePath, { getSheets: true });
  console.log("=== LISTA DE TODAS LAS HOJAS ===");
  data.forEach((item, idx) => {
    console.log(`${idx + 1}. "${item.name}"`);
  });
}

main().catch(console.error);
