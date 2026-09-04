import readXlsxFile from "read-excel-file/node";

const filePath = "C:\\Users\\joelm\\Documents\\AIFA\\LOCALES y CONTRATOS\\RELACION DE LOCALES COMERCIALES PMD (4TA).xlsx";

async function main() {
  const data = await readXlsxFile(filePath, { getSheets: true });
  const edif = data.find((d) => (d.sheet || d.name) === "Edif. Svs.");
  if (edif) {
    for (let i = 0; i < Math.min(6, edif.data.length); i++) {
      console.log(`Fila ${i}:`, edif.data[i]);
    }
  }
}

main().catch(console.error);
