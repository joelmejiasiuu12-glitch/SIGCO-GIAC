import readXlsxFile from "read-excel-file/node";

const filePath = "C:\\Users\\joelm\\Documents\\AIFA\\LOCALES y CONTRATOS\\RELACION DE LOCALES COMERCIALES PMD (4TA).xlsx";

async function main() {
  const sheets = await readXlsxFile(filePath, { getSheets: true });
  console.log("=== RESUMEN COMPLETO DE HOJAS DEL EXCEL ===");
  console.log(`Total de hojas: ${sheets.length}\n`);

  for (let i = 0; i < 12; i++) {
    const item = sheets[i];
    const name = item.sheet || item.name;
    const rows = item.data || [];
    console.log(`[${i + 1}] HOJA: "${name}" (Total filas: ${rows.length})`);
    
    let headerRow = null;
    let headerIdx = 0;
    for (let r = 0; r < Math.min(6, rows.length); r++) {
      const row = rows[r] || [];
      const nonNull = row.filter(x => x !== null && x !== "");
      if (nonNull.length >= 3) {
        headerRow = row;
        headerIdx = r;
        break;
      }
    }
    
    if (headerRow) {
      const cleanHeaders = headerRow.map((c, idx) => c !== null && c !== "" ? `[col ${idx+1}] ${String(c).replace(/\s+/g, ' ').trim()}` : null).filter(Boolean);
      console.log(`   Fila encabezado (${headerIdx + 1}):`);
      cleanHeaders.forEach(h => console.log(`      - ${h}`));
    } else {
      console.log("   (Sin encabezado estándar)");
      if (rows.length > 0) {
        console.log("   Muestra fila 1:", rows[0].slice(0, 5));
      }
    }
    console.log("--------------------------------------------------");
  }
}

main().catch(console.error);
