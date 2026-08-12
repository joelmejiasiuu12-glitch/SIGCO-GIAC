import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the AIFA dashboard without persistent local-mode notices", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /SIGCO/i);
  assert.match(html, /Sistema Integral de Gestión Comercial y Operativa/i);
  assert.doesNotMatch(html, /Modo privado local|procesados localmente|No se enviaron ni guardaron/i);
  assert.match(html, /Cargar Excel local/i);
  assert.doesNotMatch(html, /Iniciar sesión|Contraseña|Cerrar sesión/i);
});

test("processes the workbook only in browser memory", async () => {
  const dashboard = await readFile(new URL("../app/DashboardClient.tsx", import.meta.url), "utf8");
  const upload = await readFile(new URL("../app/components/DataUploadModal.tsx", import.meta.url), "utf8");
  const globalSummary = await readFile(new URL("../app/components/GlobalSummary.tsx", import.meta.url), "utf8");
  const hosting = JSON.parse(await readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"));

  assert.match(upload, /read-excel-file\/browser/);
  assert.match(upload, /Object\.fromEntries\(locations\.map/);
  assert.match(upload, /No se enviará ni se guardará en ningún servidor/i);
  assert.match(dashboard, /useState<Dataset>\(emptyDatasets\)/);
  assert.match(dashboard, /beforeunload/);
  assert.match(globalSummary, /datasets: Dataset/);
  assert.doesNotMatch(`${dashboard}\n${upload}\n${globalSummary}`, /fetch\(|localStorage|sessionStorage|indexedDB|\/api\/locales|bundledLocationData/);
  assert.deepEqual(hosting, { project_id: "appgprj_6a60006e3d188191a7a922f9e6b7949b" });
});

test("keeps the seven-sheet mapping and ETP commercial-services filter", async () => {
  const upload = await readFile(new URL("../app/components/DataUploadModal.tsx", import.meta.url), "utf8");
  assert.match(upload, /Pq\. Sta\. Lucía/);
  assert.match(upload, /Cd\. Aeroportuaria/);
  assert.match(upload, /Calz\. Mamuts/);
  assert.match(upload, /isCommercialServicesEtpRecord/);
  assert.match(upload, /"metraje construido": "metrajeConstruido"/);
  assert.match(upload, /"giro aci": "giroOperativo"/);
  assert.match(upload, /empresa: "marca"/);
});

test("supports partial-zone workbooks and the ETP contractual columns", async () => {
  const upload = await readFile(new URL("../app/components/DataUploadModal.tsx", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../app/DashboardClient.tsx", import.meta.url), "utf8");
  const contracts = await readFile(new URL("../app/components/ContractCenter.tsx", import.meta.url), "utf8");

  assert.match(upload, /availableDefinitions/);
  assert.match(upload, /"no contrato": "contractNumber"/);
  assert.match(upload, /"renta mensual iva": "monthlyRent"/);
  assert.match(upload, /"fecha de renovacion": "renewalDate"/);
  assert.match(upload, /"gestor":?\s*"manager"|gestor:\s*"manager"/);
  assert.match(upload, /spanishMonths/);
  assert.match(dashboard, /Módulos de SIGCO/);
  assert.match(dashboard, /<span>02<\/span>Locales/);
  assert.match(dashboard, /<span>03<\/span>Contratos/);
  assert.match(dashboard, /<span>04<\/span>Finanzas/);
  assert.doesNotMatch(dashboard, /<span>04<\/span>Relación/);
  assert.match(contracts, /Resumen de contratos/);
  assert.match(contracts, /Relación Local–Contrato/);
  assert.match(contracts, /Renta mensual/);
  assert.doesNotMatch(contracts, /\+ IVA|IVA incluido/);
});

test("ships no embedded business datasets or data APIs", async () => {
  const forbidden = [
    "../app/data/etp.json",
    "../app/data/parque-santa-lucia.json",
    "../app/data/carga-aduana.json",
    "../app/data/autobuses-plaza.json",
    "../app/data/parque-revolucion.json",
    "../app/data/ciudad-aeroportuaria.json",
    "../app/data/calzada-mamuts.json",
    "../app/api/locales/route.ts",
    "../app/api/session/route.ts",
    "../app/auth.ts",
  ];
  for (const path of forbidden) {
    await assert.rejects(access(new URL(path, import.meta.url)));
  }
});

test("preserves percentage-based chart labels", async () => {
  const summary = await readFile(new URL("../app/components/SummaryDashboard.tsx", import.meta.url), "utf8");
  const directoryAnalytics = await readFile(new URL("../app/components/DirectoryAnalytics.tsx", import.meta.url), "utf8");
  const globalSummary = await readFile(new URL("../app/components/GlobalSummary.tsx", import.meta.url), "utf8");
  assert.match(summary, /percentage/i);
  assert.match(summary, /<LocationIndicators locationId=\{locationId\} records=\{records\}/);
  assert.match(directoryAnalytics, /export function LocationIndicators/);
  assert.match(directoryAnalytics, /Indicadores de superficie ETP/);
  assert.match(directoryAnalytics, /tenantMetrics\(records\)\.map/);
  assert.match(globalSummary, /percentage|value \/ total/i);
  assert.match(globalSummary, /Estatus Comercial Global/);
  assert.match(globalSummary, /Distribución de Espacios Comerciales/);
  assert.doesNotMatch(globalSummary, /title="Giro comercial"/);
  assert.match(globalSummary, /title="Estatus Comercial"/);
  assert.match(globalSummary, /title="Arrendados"/);
  assert.match(globalSummary, /Todas las ubicaciones/);
  assert.match(globalSummary, /Datos representados/);
  assert.doesNotMatch(directoryAnalytics, /pipeline/i);
});

test("shows the two interactive status charts in every location summary", async () => {
  const summary = await readFile(new URL("../app/components/SummaryDashboard.tsx", import.meta.url), "utf8");

  assert.match(summary, /title="Estatus Comercial"/);
  assert.match(summary, /title="Arrendados"/);
  assert.match(summary, /Operando \(En funcionamiento\)/);
  assert.match(summary, /Formalizado \(sin adaptación\)/);
  assert.match(summary, /aria-pressed=\{selectedStatus === label\}/);
  assert.match(summary, /Datos representados/);
  assert.match(summary, /<StatusOverview title=\{statusTitle\} records=\{records\}/);
  assert.doesNotMatch(summary, /locationId === "etp" \|\| locationId === "parque-santa-lucia"/);
});

test("reads and shows the ETP commercial-attention capacity from CAPACIDAD D2", async () => {
  const upload = await readFile(new URL("../app/components/DataUploadModal.tsx", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../app/DashboardClient.tsx", import.meta.url), "utf8");
  const summary = await readFile(new URL("../app/components/SummaryDashboard.tsx", import.meta.url), "utf8");

  assert.match(upload, /normalized\("Capacidad"\)/);
  assert.match(upload, /readEtpCommercialCapacity/);
  assert.match(upload, /toLocaleUpperCase\("es-MX"\) === "D2"/);
  assert.match(upload, /getElementsByTagName\("v"\)/);
  assert.match(upload, /DecompressionStream\("deflate-raw"\)/);
  assert.match(upload, /etpCommercialCapacity/);
  assert.match(dashboard, /etpCommercialCapacity=\{etpCommercialCapacity\}/);
  assert.match(summary, /locationId === "etp"/);
  assert.match(summary, /Capacidad de Atención Comercial/);
  assert.match(summary, /Hoja CAPACIDAD · celda D2/);
});

test("creates a reusable ETP notification center from the two contract dates", async () => {
  const upload = await readFile(new URL("../app/components/DataUploadModal.tsx", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../app/DashboardClient.tsx", import.meta.url), "utf8");
  const alerts = await readFile(new URL("../app/components/CommercialAlerts.tsx", import.meta.url), "utf8");

  assert.match(upload, /"fecha de formalizacion": "fechaFormalizacion"/);
  assert.match(upload, /"fecha de conclusion": "fechaConclusion"/);
  assert.match(upload, /parseExcelDate/);
  assert.match(dashboard, /notification-button/);
  assert.match(dashboard, /setShowCommercialAlerts\(false\)/);
  assert.doesNotMatch(dashboard, /setShowCommercialAlerts\(nextCommercialAlerts\.length > 0\)/);
  assert.match(dashboard, /moduleMenuSentinelRef/);
  assert.match(dashboard, /module-nav-fixed/);
  assert.match(dashboard, /window\.addEventListener\("scroll", updateModuleMenuPosition/);
  assert.match(alerts, /daysRemaining > 30/);
  assert.match(alerts, /Centro de notificaciones/);
  assert.match(alerts, /Vencido|Vence hoy|Crítico|Próximo/);
});

test("shows one download card and builds the portrait SSC Word report", async () => {
  const reports = await readFile(new URL("../app/components/ReportsCenter.tsx", import.meta.url), "utf8");
  const wordReport = await readFile(new URL("../app/lib/sscWordReport.ts", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../app/DashboardClient.tsx", import.meta.url), "utf8");

  assert.match(wordReport, /Distribución y Estatus de Espacios Comerciales por Nivel y Tipo de Área \(SSC\)/);
  assert.match(reports, /buildSscReportMatrix/);
  assert.match(reports, /Packer\.toBlob/);
  assert.match(reports, /aifa-logo-vertical-dark\.png/);
  assert.match(reports, /report-download-card/);
  assert.doesNotMatch(reports, /report-modules|Vista previa modular|Interpretación automática/);
  assert.match(wordReport, /PageOrientation\.PORTRAIT/);
  assert.match(wordReport, /Joel Mejia Guevara/);
  assert.match(wordReport, /Eduardo Arturo Alvarado Espinosa/);
  assert.match(wordReport, /2026, Año de Margarita Maza Parada/);
  assert.match(wordReport, /Dirección Com\. y de Servicios/);
  assert.match(wordReport, /Grupo de Inteligencia y Análisis/);
  assert.match(wordReport, /marketTable\("Nacional"/);
  assert.match(wordReport, /marketTable\("Internacional"/);
  assert.match(wordReport, /Distribución total por nivel/);
  assert.match(wordReport, /Análisis Interpretativo/);
  assert.match(wordReport, /Acciones Recomendadas/);
  assert.match(wordReport, /Foco rojo/);
  assert.match(wordReport, /matriz BCG/);
  assert.match(wordReport, /SCAMPER/);
  assert.match(wordReport, /Gestión Operativa: agilizar la revisión y autorización/);
  assert.doesNotMatch(wordReport, /Gestión Operativa: agilizar con Eduardo|Visualización Tecnológica|AIFA Manager de los Locales Comerciales \(SIGC\)/);
  assert.match(wordReport, /right: 1134, bottom: 1100, left: 1134/);
  assert.doesNotMatch(wordReport, /Archivo fuente:/);
  assert.match(dashboard, /Grupo de Inteligencia y Análisis Comercial/);
  assert.match(dashboard, /SIGCO - Sistema Integral de Gestión Comercial y Operativa/);
  assert.match(dashboard, /activeModule === "reports"/);
  assert.match(dashboard, /<ReportsCenter/);
});

test("organizes navigation into primary modules and contextual views", async () => {
  const dashboard = await readFile(new URL("../app/DashboardClient.tsx", import.meta.url), "utf8");
  const contracts = await readFile(new URL("../app/components/ContractCenter.tsx", import.meta.url), "utf8");

  assert.match(dashboard, /type PrimaryModule = "home" \| "locals" \| "contracts" \| "finances" \| "reports"/);
  assert.match(dashboard, /Resumen global/);
  assert.match(dashboard, /Resumen de zona/);
  assert.match(dashboard, /En preformalización/);
  assert.match(dashboard, /En formalización/);
  assert.match(dashboard, /Formalizados/);
  assert.match(dashboard, /Cancelados/);
  assert.match(dashboard, /Fenecidos/);
  assert.match(dashboard, /Convenios/);
  assert.match(dashboard, /Resumen financiero/);
  assert.match(dashboard, /Zona comercial/);
  assert.match(contracts, /preformalization/);
  assert.match(contracts, /formalization/);
  assert.match(contracts, /cancelled/);
  assert.match(contracts, /expired/);
  assert.match(contracts, /agreements/);
  assert.match(contracts, /mode === "attention"/);
});

test("adds the institutional intelligence module without replacing existing functions", async () => {
  const dashboard = await readFile(new URL("../app/DashboardClient.tsx", import.meta.url), "utf8");
  const intelligence = await readFile(new URL("../app/components/IntelligenceCenter.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(dashboard, /<span>01<\/span>Inicio/);
  assert.match(dashboard, /<span>05<\/span>Reportes/);
  assert.match(dashboard, /<span>06<\/span>Inteligencia/);
  assert.match(dashboard, /Tablero ejecutivo/);
  assert.match(dashboard, /KPIs rectores/);
  assert.match(dashboard, /Reportes ejecutivos/);
  assert.match(dashboard, /Alertas/);
  assert.match(intelligence, /datasets: Dataset/);
  assert.match(intelligence, /Espacios arrendados \/ inventario comercial cargado/);
  assert.match(intelligence, /Fuente pendiente/);
  assert.match(intelligence, /Cargar Excel y generar tablero/);
  assert.match(intelligence, /Imprimir \/ guardar PDF/);
  assert.doesNotMatch(intelligence, /calidad y conciliaci[oó]n/i);
  assert.match(styles, /Inteligencia y Plan Comercial/);
  assert.match(styles, /Montserrat AIFA/);
});

test("adds the first-stage finance dashboard and removes Relation from primary navigation", async () => {
  const dashboard = await readFile(new URL("../app/DashboardClient.tsx", import.meta.url), "utf8");
  const finance = await readFile(new URL("../app/components/FinanceCenter.tsx", import.meta.url), "utf8");

  assert.match(dashboard, /<span>03<\/span>Contratos/);
  assert.match(dashboard, /<span>04<\/span>Finanzas/);
  assert.match(dashboard, /<span>05<\/span>Reportes/);
  assert.doesNotMatch(dashboard, /<span>04<\/span>Relación/);
  assert.match(dashboard, /<FinanceCenter records=\{financeRecords\}/);
  assert.match(dashboard, /financeLocationId === "all" \? Object\.values\(datasets\)\.flat\(\)/);
  assert.match(finance, /isOperating\(record\) && record\.monthlyRent !== null/);
  assert.match(finance, /projectedMonths\(record\.renewalDate\)/);
  assert.match(finance, /Renta mensual contratada/);
  assert.match(finance, /Proyección próximos 12 meses/);
  assert.match(finance, /Costo promedio por m²/);
  assert.match(finance, /Locales con participación/);
  assert.match(finance, /Renta mensual por zona/);
  assert.match(finance, /Distribución de renta mensual/);
  assert.match(finance, /Participación e histórico mensual/);
  assert.match(finance, /Datos de Cobranza pendientes/);
});

test("uses subtle transitions for navigation and Excel processing with reduced-motion support", async () => {
  const dashboard = await readFile(new URL("../app/DashboardClient.tsx", import.meta.url), "utf8");
  const upload = await readFile(new URL("../app/components/DataUploadModal.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(dashboard, /moduleTransitionKey/);
  assert.match(dashboard, /className="module-content-transition"/);
  assert.match(upload, /className="upload-processing-status"/);
  assert.match(upload, /Leyendo hojas, validando zonas y preparando indicadores/);
  assert.match(styles, /@keyframes module-enter/);
  assert.match(styles, /@keyframes card-enter/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test("keeps the SIGCO institutional brand as a non-interactive element", async () => {
  const dashboard = await readFile(new URL("../app/DashboardClient.tsx", import.meta.url), "utf8");

  assert.match(dashboard, /<div className="brand">/);
  assert.doesNotMatch(dashboard, /returnToGeneralHome/);
  assert.doesNotMatch(dashboard, /className="brand" href=|className="brand"[^>]*onClick/);
});
