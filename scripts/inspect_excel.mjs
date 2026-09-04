import readXlsxFile from "read-excel-file/node";
import path from "path";

const filePath = "C:\\Users\\joelm\\Documents\\AIFA\\LOCALES y CONTRATOS\\RELACION DE LOCALES COMERCIALES PMD (4TA).xlsx";

async function inspect() {
  try {
    const sheets = await readXlsxFile(filePath, { getSheets: true });
    console.log("Hojas encontradas en el Excel:");
    console.log(sheets.map((s) => s.name));

    for (const sheet of sheets) {
      const rows = await readXlsxFile(filePath, { sheet: sheet.name });
      console.log(`\n========================================`);
      console.log(`HOJA: ${sheet.name} (Total filas: ${rows.length})`);
      if (rows.length > 0) {
        console.log("Encabezados (Fila 1):", rows[0]);
        if (rows.length > 1) {
          console.log("Ejemplo Fila 2:", rows[1]);
        }
      }
    }
  } catch (err) {
    console.error("Error leyendo Excel:", err);
  }
}

inspect();
