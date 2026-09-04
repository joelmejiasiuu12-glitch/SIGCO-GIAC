import readXlsxFile from "read-excel-file/node";

const filePath = "C:\\Users\\joelm\\Documents\\AIFA\\LOCALES y CONTRATOS\\RELACION DE LOCALES COMERCIALES PMD (4TA).xlsx";

async function main() {
  const sheets = await readXlsxFile(filePath, { getSheets: true });
  console.log("=== ANÁLISIS DETALLADO DE LOCALES EN EL EXCEL ===");

  for (let i = 0; i < sheets.length; i++) {
    const item = sheets[i];
    const sheetName = item.sheet || item.name;
    const rows = item.data || [];
    
    // Let's filter real rows with a nomenclature
    console.log(`\n======================================================`);
    console.log(`HOJA [${i + 1}]: "${sheetName}" | Total filas raw: ${rows.length}`);
    
    // Look at first 10 rows to see structure
    for (let r = 0; r < Math.min(10, rows.length); r++) {
      const row = rows[r] || [];
      const nonNull = row.map((val, colIdx) => val !== null && val !== "" ? `c${colIdx+1}: ${String(val).slice(0, 30)}` : null).filter(Boolean);
      console.log(`  Fila ${r + 1}: ${nonNull.join(" | ")}`);
    }
  }
}

main().catch(console.error);
