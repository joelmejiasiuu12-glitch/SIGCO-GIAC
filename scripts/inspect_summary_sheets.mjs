import readXlsxFile from "read-excel-file/node";

const filePath = "C:\\Users\\joelm\\Documents\\AIFA\\LOCALES y CONTRATOS\\RELACION DE LOCALES COMERCIALES PMD (4TA).xlsx";

async function main() {
  const sheets = await readXlsxFile(filePath, { getSheets: true });
  
  // 1. Look at "P. Espacios comerciales"
  const resumenSheet = sheets.find(s => (s.sheet || s.name).includes("Espacios comerciales"));
  if (resumenSheet) {
    console.log("=== HOJA: P. Espacios comerciales ===");
    for (let r = 0; r < resumenSheet.data.length; r++) {
      const row = resumenSheet.data[r];
      const line = row.map((c, i) => c !== null && c !== "" ? `[col ${i+1}] ${c}` : null).filter(Boolean);
      if (line.length > 0) {
        console.log(`Fila ${r+1}:`, line.join(" | "));
      }
    }
  }

  // 2. Look at "Resumen ETP"
  const resumenEtp = sheets.find(s => (s.sheet || s.name).includes("Resumen ETP"));
  if (resumenEtp) {
    console.log("\n=== HOJA: Resumen ETP ===");
    for (let r = 0; r < resumenEtp.data.length; r++) {
      const row = resumenEtp.data[r];
      const line = row.map((c, i) => c !== null && c !== "" ? `[col ${i+1}] ${c}` : null).filter(Boolean);
      if (line.length > 0) {
        console.log(`Fila ${r+1}:`, line.join(" | "));
      }
    }
  }
}

main().catch(console.error);
