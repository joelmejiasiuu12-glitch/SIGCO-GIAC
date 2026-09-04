import readXlsxFile from "read-excel-file/node";

const filePath = "C:\\Users\\joelm\\Documents\\AIFA\\LOCALES y CONTRATOS\\RELACION DE LOCALES COMERCIALES PMD (4TA).xlsx";

const zoneSheets = [
  "ETP",
  "Pq. Sta. Lucía",
  "Pq. Rev.",
  "Edif. Svs.",
  "TITT",
  "Cd. Aeroportuaria",
  "Calz. Mamuts",
];

async function main() {
  const data = await readXlsxFile(filePath, { getSheets: true });
  for (const sheetName of zoneSheets) {
    const item = data.find((d) => (d.sheet || d.name) === sheetName);
    if (item && item.data) {
      console.log(`\n========================================`);
      console.log(`ZONA: "${sheetName}" | Filas: ${item.data.length}`);
      console.log("Headers (Fila 0):", item.data[0]);
      console.log("Fila 1 (Ejemplo):", item.data[1]);
    }
  }
}

main().catch(console.error);
