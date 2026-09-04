import readXlsxFile from "read-excel-file/node";

const filePath = "C:\\Users\\joelm\\Documents\\AIFA\\LOCALES y CONTRATOS\\RELACION DE LOCALES COMERCIALES PMD (4TA).xlsx";

async function main() {
  const data = await readXlsxFile(filePath, { getSheets: true });
  console.log("=== HOJAS EN EL EXCEL REAL ===");
  data.forEach((item, idx) => {
    const name = item.sheet || item.name;
    console.log(`${idx + 1}. "${name}" (Filas: ${item.data ? item.data.length : 0})`);
  });
}

main().catch(console.error);
