import readXlsxFile from "read-excel-file/node";

const filePath = "C:\\Users\\joelm\\Documents\\AIFA\\LOCALES y CONTRATOS\\RELACION DE LOCALES COMERCIALES PMD (4TA).xlsx";

async function main() {
  const sheets = await readXlsxFile(filePath, { getSheets: true });
  
  const zoneSheets = [
    { key: "etp", name: "ETP" },
    { key: "santa-lucia", name: "Pq. Sta. Lucía" },
    { key: "carga-aduana", name: "Edif. Svs." },
    { key: "titt", name: "TITT" },
    { key: "parque-rev", name: "Pq. Rev." },
    { key: "cd-aero", name: "Cd. Aeroportuaria" },
    { key: "mamuts", name: "Calz. Mamuts" },
  ];

  console.log("=== DESGLOSE DE ESPACIOS POR ZONA Y TIPO ===");
  
  let totalGeneral = 0;
  let totalLocalesStrict = 0;
  let totalIslas = 0;
  let totalOtros = 0;

  for (const z of zoneSheets) {
    const s = sheets.find(item => (item.sheet || item.name) === z.name);
    if (!s) continue;
    
    const rows = s.data || [];
    let count = 0;
    const typeBreakdown = {};

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r] || [];
      const col2 = row[1];
      const colStr = row.map(x => String(x ?? "")).join(" ");
      if (colStr.includes("Nomenclatura") || colStr.includes("NOMENCLATURA") || colStr.includes("Total") || colStr.includes("Locales Comerciales")) continue;
      
      if (col2 !== null && col2 !== undefined && String(col2).trim() !== "" && !String(col2).includes("Nomenclatura")) {
        count++;
        // Check if there is a type column
        const tipo = String(row[6] || row[4] || "Local").trim();
        typeBreakdown[tipo] = (typeBreakdown[tipo] || 0) + 1;
      }
    }
    totalGeneral += count;
    console.log(`\n📍 ${z.name}: ${count} espacios registrados`);
    console.log(`   Desglose:`, typeBreakdown);
  }

  console.log(`\n==============================================`);
  console.log(`TOTAL GENERAL REGISTRADO EN EL EXCEL: ${totalGeneral} espacios físicos.`);
}

main().catch(console.error);
