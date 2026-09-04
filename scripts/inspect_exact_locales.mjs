import readXlsxFile from "read-excel-file/node";

const filePath = "C:\\Users\\joelm\\Documents\\AIFA\\LOCALES y CONTRATOS\\RELACION DE LOCALES COMERCIALES PMD (4TA).xlsx";

async function main() {
  const sheets = await readXlsxFile(filePath, { getSheets: true });
  
  const zoneSheets = [
    { key: "etp", name: "ETP" },
    { key: "etp205", name: "ETP(205)" },
    { key: "santa-lucia", name: "Pq. Sta. Lucía" },
    { key: "carga-aduana", name: "Edif. Svs." },
    { key: "titt", name: "TITT" },
    { key: "parque-rev", name: "Pq. Rev." },
    { key: "cd-aero", name: "Cd. Aeroportuaria" },
    { key: "mamuts", name: "Calz. Mamuts" },
    { key: "gasolineras", name: "EST. SERVICIO SON DEL GAFSACOMM" },
    { key: "taxis", name: "EST TAXIS (MOVILIDAD)" }
  ];

  console.log("=== RECUENTO EXACTO DE LOCALES POR HOJA FÍSICA ===");

  for (const z of zoneSheets) {
    const s = sheets.find(item => (item.sheet || item.name) === z.name);
    if (!s) {
      console.log(`Hoja "${z.name}" no encontrada.`);
      continue;
    }

    const rows = s.data || [];
    console.log(`\n-------------------------------------------------------------`);
    console.log(`HOJA: "${z.name}" (Filas raw totales: ${rows.length})`);

    // Let's find real local rows
    const validLocales = [];
    const invalidOrSummaryRows = [];

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r] || [];
      const col1 = row[0]; // No. or null
      const col2 = row[1]; // Nomenclatura or null
      const colStr = row.map(x => String(x ?? "")).join(" ");
      
      // Check if this row is a header
      if (colStr.includes("Nomenclatura") || colStr.includes("NOMENCLATURA") || colStr.includes("Locales Comerciales")) {
        continue;
      }

      // Check if it's a summary or subtotal row
      if (colStr.includes("Total de locales") || colStr.includes("Total general") || colStr.includes("Disponible") && col2 === null) {
        invalidOrSummaryRows.push({ rowIdx: r + 1, reason: "Fila de total/resumen", content: row.filter(Boolean) });
        continue;
      }

      // If nomenclatura exists and is valid
      if (col2 !== null && col2 !== undefined && String(col2).trim() !== "" && !String(col2).includes("Nomenclatura")) {
        validLocales.push({
          rowIdx: r + 1,
          no: col1,
          nomenclatura: String(col2).trim(),
          metraje: row[2] || row[3] || row[5],
          estatus: row[4] || row[7] || row[8]
        });
      } else {
        const nonNull = row.filter(x => x !== null && x !== "");
        if (nonNull.length > 0) {
          invalidOrSummaryRows.push({ rowIdx: r + 1, reason: "Sin nomenclatura", content: nonNull });
        }
      }
    }

    console.log(`✅ LOCALES REALES VÁLIDOS: ${validLocales.length}`);
    console.log(`   Primeros 3:`, validLocales.slice(0, 3).map(x => `${x.nomenclatura} (fila ${x.rowIdx})`));
    console.log(`   Últimos 3:`, validLocales.slice(-3).map(x => `${x.nomenclatura} (fila ${x.rowIdx})`));
    if (invalidOrSummaryRows.length > 0) {
      console.log(`⚠️ Filas excluidas/resumen/notas (${invalidOrSummaryRows.length}):`);
      invalidOrSummaryRows.forEach(inv => console.log(`   - Fila ${inv.rowIdx} [${inv.reason}]:`, inv.content.slice(0, 4)));
    }
  }
}

main().catch(console.error);
