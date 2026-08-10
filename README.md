# SIGCO

Sistema Integral de Gestión Comercial y Operativa: directorio, analítica y reportes administrativos de las siete zonas comerciales del AIFA.

## Privacidad de los datos

- El sitio publicado contiene únicamente HTML, CSS y JavaScript de la aplicación.
- El archivo `.xlsx` se lee en el navegador con `read-excel-file/browser`.
- Los registros se conservan solo en estado de React, dentro de la memoria de la pestaña.
- No existen endpoints para cargar o consultar registros.
- No se usa D1, R2, `localStorage`, `sessionStorage` ni IndexedDB.
- Al recargar o cerrar la pestaña se pierden los datos y es necesario cargar el Excel de nuevo.

La hoja ETP conserva el filtro de Servicios Comerciales y excluye los registros cuya subdirección encargada no corresponde a esa unidad.

## Desarrollo

```bash
npm run dev
npm run build
npm test
```
