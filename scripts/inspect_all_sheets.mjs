import readXlsxFile from "read-excel-file/node";

const filePath = "C:\\Users\\joelm\\Documents\\AIFA\\LOCALES y CONTRATOS\\RELACION DE LOCALES COMERCIALES PMD (4TA).xlsx";

async function main() {
  const sheets = await readXlsxFile(filePath, { getSheets: true });
  console.log("=== LISTA DE HOJAS ===");
  sheets.forEach((s, i) => console.log(`${i + 1}. "${s.name}"`));

  for (const s of sheets) {
    const rows = await readXlsxFile(filePath, { sheet: s.name });
    console.log(`\n---------------------------------------------`);
    console.log(`Hoja: "${s.name}" | Total filas: ${rows.length}`);
    if (rows.length > 0) {
      console.log(`Encabezados:`, rows[0]);
      if (rows.length > 1) {
        console.log(`Fila 1:`, rows[1]);
      }
    }
  }
}

main().catch(console.error);
