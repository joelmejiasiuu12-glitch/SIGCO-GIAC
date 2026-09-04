import readXlsxFile from "read-excel-file/node";

const filePath = "C:\\Users\\joelm\\Documents\\AIFA\\LOCALES y CONTRATOS\\RELACION DE LOCALES COMERCIALES PMD (4TA).xlsx";

async function main() {
  const sheets = await readXlsxFile(filePath, { getSheets: true });
  
  const etpSheet = sheets.find(s => (s.sheet || s.name) === "ETP");
  const etp205Sheet = sheets.find(s => (s.sheet || s.name) === "ETP(205)");

  console.log("=== ANÁLISIS DE TIPOS DE ESPACIOS EN HOJA ETP (375) ===");
  const typesCount = {};
  const statusCount = {};
  
  for (let r = 2; r < etpSheet.data.length; r++) {
    const row = etpSheet.data[r] || [];
    const nom = row[1];
    if (!nom) continue;
    
    // col 7: Tipo de Local
    const tipo = String(row[6] || "Sin tipo").trim();
    typesCount[tipo] = (typesCount[tipo] || 0) + 1;

    // col 9: Estatus
    const estatus = String(row[8] || "Sin estatus").trim();
    statusCount[estatus] = (statusCount[estatus] || 0) + 1;
  }
  
  console.log("Tipos de espacio en ETP (375):", typesCount);
  console.log("Estatus en ETP (375):", statusCount);

  console.log("\n=== ANÁLISIS DE HOJA ETP(205) ===");
  const types205 = {};
  const status205 = {};
  for (let r = 2; r < etp205Sheet.data.length; r++) {
    const row = etp205Sheet.data[r] || [];
    const nom = row[1];
    if (!nom) continue;
    const tipo = String(row[6] || row[4] || "Sin tipo").trim();
    types205[tipo] = (types205[tipo] || 0) + 1;
    const estatus = String(row[7] || "Sin estatus").trim();
    status205[estatus] = (status205[estatus] || 0) + 1;
  }
  console.log("Tipos/Campos en ETP(205):", types205);
  console.log("Estatus en ETP(205):", status205);
}

main().catch(console.error);
