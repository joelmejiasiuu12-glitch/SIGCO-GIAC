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
  assert.doesNotMatch(`${dashboard}\n${upload}\n${globalSummary}`, /localStorage|sessionStorage|indexedDB|bundledLocationData/);
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
  assert.match(dashboard, /<span>03<\/span>Publicidad/);
  assert.match(dashboard, /<span>04<\/span>Contratos/);
  assert.doesNotMatch(dashboard, /<span>\d+<\/span>Finanzas/);
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
  assert.match(directoryAnalytics, /tenantMetrics\(records, locationId === "etp"\)/);
  assert.match(globalSummary, /percentage|value \/ total/i);
  assert.match(globalSummary, /Estatus Comercial Global/);
  assert.match(globalSummary, /Distribución de Espacios Comerciales/);
  assert.doesNotMatch(globalSummary, /title="Giro comercial"/);
  assert.match(globalSummary, /title="Estatus Comercial"/);
  assert.match(globalSummary, /title="Arrendados"/);
  assert.match(globalSummary, /Todas las ubicaciones/);
  assert.match(globalSummary, /Datos representados/);
  assert.doesNotMatch(directoryAnalytics, /Avance del pipeline/);
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

test("reads and reflects the ETP commercial-attention model from CAPACIDAD", async () => {
  const upload = await readFile(new URL("../app/components/DataUploadModal.tsx", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../app/DashboardClient.tsx", import.meta.url), "utf8");
  const summary = await readFile(new URL("../app/components/SummaryDashboard.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(upload, /normalized\("Capacidad"\)/);
  assert.match(upload, /readEtpCommercialCapacity/);
  assert.match(upload, /readNumericCell\("A2"\)/);
  assert.match(upload, /readNumericCell\("B2"\)/);
  assert.match(upload, /readNumericCell\("C2"\)/);
  assert.match(upload, /readNumericCell\("D2"\)/);
  assert.match(upload, /readNumericCell\("A5"\)/);
  assert.match(upload, /getElementsByTagName\("v"\)/);
  assert.match(upload, /DecompressionStream\("deflate-raw"\)/);
  assert.match(upload, /terminalPassengerCapacity \* commercialAreaFactor/);
  assert.match(upload, /leasedCommercialArea \/ recommendedCommercialArea/);
  assert.match(upload, /etpCommercialCapacity/);
  assert.match(dashboard, /etpCommercialCapacity=\{etpCommercialCapacity\}/);
  assert.match(summary, /locationId === "etp"/);
  assert.match(summary, /Capacidad de Atención Comercial/);
  assert.doesNotMatch(summary, /capacityAnalysisOpen/);
  assert.match(summary, /commercial-capacity-heading/);
  assert.match(summary, /onOpenAnalysis: \(indicator: AnalysisTarget\) => void/);
  assert.match(summary, /indicator-analysis-link/);
  assert.match(summary, /onOpenAnalysis\("capacity"\)/);
  assert.match(summary, /Lectura ejecutiva y acción recomendada/);
  assert.match(summary, /Hoja CAPACIDAD · A2, C2 y A5 · equivalente a D2/);
  assert.match(summary, /projectedPassengers \/ commercialPassengerCapacity/);
  assert.match(summary, /commercialPassengerCapacity - projectedPassengers/);
  assert.match(summary, /Cobertura de superficie/);
  assert.match(summary, /capacity\.leasedCommercialArea \/ capacity\.recommendedCommercialArea/);
  assert.match(summary, /Capacidad de diseño ETP/);
  assert.match(summary, /Coeficiente comercial/);
  assert.match(summary, /Superficie recomendada/);
  assert.match(summary, /Superficie arrendada/);
  assert.match(summary, /Utilización proyectada \{currentYear/);
  assert.match(summary, /Holgura de capacidad/);
  assert.match(summary, /Crecimiento de pasajeros/);
  assert.match(summary, /Tráfico frente a capacidad comercial actual/);
  assert.match(summary, /La capacidad no es el límite; la oportunidad está en monetizar la demanda creciente/);
  assert.match(summary, /commercial-capacity-executive-metrics/);
  assert.match(summary, /La prioridad es convertir esa holgura en rentabilidad/);
  assert.match(summary, /Decisión recomendada:/);
  assert.match(summary, /mantener una expansión comercial selectiva/);
  assert.match(summary, /Ver sustento del análisis/);
  assert.match(summary, /aria-expanded=\{evidenceOpen\}/);
  assert.match(styles, /\.commercial-capacity-decision/);
  assert.match(styles, /\.commercial-capacity-executive-metrics/);
  assert.match(styles, /\.commercial-capacity-evidence/);
  assert.match(summary, /no sustituye una evaluación operativa por hora pico/);
  assert.doesNotMatch(summary, /14_645_603|14645603/);
  assert.match(styles, /\.commercial-capacity-kpis/);
  assert.match(styles, /\.commercial-capacity-foundation/);
  assert.match(styles, /\.commercial-capacity-history/);
  assert.match(styles, /\.commercial-capacity-heading/);
  assert.match(styles, /\.indicator-analysis-link/);
});

test("reads monthly passenger traffic, marks the annual projection, and excludes partial months", async () => {
  const upload = await readFile(new URL("../app/components/DataUploadModal.tsx", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../app/DashboardClient.tsx", import.meta.url), "utf8");
  const summary = await readFile(new URL("../app/components/SummaryDashboard.tsx", import.meta.url), "utf8");

  assert.match(upload, /normalized\("Pasajeros"\)/);
  assert.match(upload, /\["ano", "mes", "pasajeros", "estado"\]/);
  assert.match(upload, /rawStatus === "parcial"/);
  assert.match(upload, /passengerTraffic: passengerResult\.records/);
  assert.match(dashboard, /passengerTraffic=\{passengerTraffic\}/);
  assert.match(dashboard, /setPassengerTraffic\(result\.passengerTraffic\)/);
  assert.match(summary, /record\.status === "real"/);
  assert.match(summary, /record\.status === "partial"/);
  assert.match(summary, /currentYearToDate \/ currentRealRecords\.length/);
  assert.match(summary, /passengers: isProjected && projectedPassengers/);
  assert.match(summary, /item\.projected \? " \(proyección\)"/);
  assert.match(summary, /item\.projected \? " proyectados"/);
  assert.match(summary, /es una proyección anualizada/);
  assert.match(summary, /Se excluye/);
  assert.doesNotMatch(summary, /912_415|2_631_261|6_318_454|7_058_219|4_324_240/);
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

  assert.match(dashboard, /type PrimaryModule = "home" \| "locals" \| "advertising" \| "contracts" \| "reports"/);
  assert.match(dashboard, /Resumen global/);
  assert.match(dashboard, /Resumen de zona/);
  assert.match(dashboard, /En preformalización/);
  assert.match(dashboard, /En formalización/);
  assert.match(dashboard, /Formalizados/);
  assert.match(dashboard, /Cancelados/);
  assert.match(dashboard, /Fenecidos/);
  assert.match(dashboard, /Convenios/);
  assert.match(dashboard, /Zona comercial/);
  assert.match(contracts, /preformalization/);
  assert.match(contracts, /formalization/);
  assert.match(contracts, /cancelled/);
  assert.match(contracts, /expired/);
  assert.match(contracts, /agreements/);
  assert.match(contracts, /mode === "attention"/);
});

test("adds the analysis center without replacing the institutional intelligence functions", async () => {
  const dashboard = await readFile(new URL("../app/DashboardClient.tsx", import.meta.url), "utf8");
  const intelligence = await readFile(new URL("../app/components/IntelligenceCenter.tsx", import.meta.url), "utf8");
  const summary = await readFile(new URL("../app/components/SummaryDashboard.tsx", import.meta.url), "utf8");
  const directory = await readFile(new URL("../app/components/DirectoryAnalytics.tsx", import.meta.url), "utf8");
  const types = await readFile(new URL("../app/types.ts", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(dashboard, /<span>01<\/span>Inicio/);
  assert.match(dashboard, /<span>0[56]<\/span>Reportes/);
  assert.match(dashboard, /<span>0[67]<\/span>Análisis/);
  assert.match(dashboard, /📍 Análisis de Locales/);
  assert.match(dashboard, /activeModule === "intelligence" &&/);
  assert.doesNotMatch(dashboard, /intelligenceView === "dashboard" \? "active"/);
  assert.doesNotMatch(dashboard, /intelligenceView === "kpis" \? "active"/);
  assert.doesNotMatch(dashboard, /intelligenceView === "reports" \? "active"/);
  assert.doesNotMatch(dashboard, /intelligenceView === "alerts" \? "active"/);
  assert.match(dashboard, /setIntelligenceView\("locals_occupancy"\)/);
  assert.match(dashboard, /etpCommercialCapacity=\{etpCommercialCapacity\}/);
  assert.match(dashboard, /passengerTraffic=\{passengerTraffic\}/);
  assert.match(dashboard, /analysisTarget=\{analysisTarget\}/);
  assert.match(dashboard, /onOpenAnalysis=\{\(indicator\)/);
  assert.match(intelligence, /datasets: Dataset/);
  assert.match(intelligence, /Indicadores clave de/);
  assert.doesNotMatch(intelligence, /Piloto 1 de 4/);
  assert.match(intelligence, /type ZoneAnalysisMetric/);
  assert.match(types, /export type AnalysisTarget/);
  assert.match(types, /\| "modules"/);
  assert.match(types, /\| "levels"/);
  assert.match(types, /\| "area_type"/);
  assert.match(intelligence, /Promedio general/);
  assert.match(intelligence, /Mediana general/);
  assert.match(intelligence, /generalAverage/);
  assert.match(intelligence, /generalMedian/);
  assert.match(intelligence, /averageMedianGap/);
  assert.match(intelligence, /la base no confirma que esos espacios sean contiguos/);
  assert.match(intelligence, /la mitad de los espacios registrados mide hasta ese valor y la otra mitad lo supera/);
  assert.match(intelligence, /Concentración Top 3/);
  assert.match(intelligence, /Ratio multi-ubicación/);
  assert.match(intelligence, /multiLocationLeaders/);
  assert.match(intelligence, /operatingMultiLocationRatio/);
  assert.match(intelligence, /renta, cumplimiento contractual y desempeño operativo/);
  assert.match(intelligence, /expansión multi-ubicación está distribuida/);
  assert.match(intelligence, /Capacidad de Atención Comercial/);
  assert.match(intelligence, /Promedio disponible/);
  assert.match(intelligence, /Locales por módulo/);
  assert.match(intelligence, /Locales por nivel/);
  assert.match(intelligence, /Tipo de área/);
  assert.match(intelligence, /availableToGeneralRatio/);
  assert.match(intelligence, /availableToMedianRatio/);
  assert.match(intelligence, /modulePerformance/);
  assert.match(intelligence, /moduleFinancialCoverage/);
  assert.match(intelligence, /largestVacancy/);
  assert.match(intelligence, /leadingVacancyLevel/);
  assert.match(intelligence, /levelDistribution/);
  assert.match(intelligence, /focusLevelAvailableAverage/);
  assert.match(intelligence, /areaTypeDistribution/);
  assert.match(intelligence, /focusAreaVacancyShare/);
  assert.match(intelligence, /CommercialCapacityAnalysis/);
  assert.match(intelligence, /presentation="full"/);
  assert.match(intelligence, /Acción recomendada/);
  assert.doesNotMatch(summary, /onOpenAnalysis\("occupancy"\)/);
  assert.doesNotMatch(summary, /onOpenAnalysis\("surface"\)/);
  assert.match(intelligence, /analysis-metric-grid/);
  assert.match(intelligence, /analysis-metric-detail/);
  assert.match(intelligence, /analysis-metric-toggle/);
  assert.match(intelligence, /analysis-metric-expanded/);
  assert.match(intelligence, /current === metric\.id \? null : metric\.id/);
  assert.match(intelligence, /Ocultar.*Ver.*análisis de/);
  assert.doesNotMatch(intelligence, /NarrativeAnalysisTabs/);
  assert.doesNotMatch(intelligence, /AnalysisIndicatorCard/);
  assert.doesNotMatch(intelligence, /Análisis diagnóstico/);
  assert.doesNotMatch(intelligence, /Análisis predictivo/);
  assert.match(intelligence, /topThreeArea \/ totalArea/);
  assert.match(intelligence, /brand\.label\} ocupa \$\{numberFormat\.format\(brand\.area\)\} m²/);
  assert.match(intelligence, /topThreeRemainingShare/);
  assert.match(intelligence, /topThreeRentShare/);
  assert.match(intelligence, /con una cobertura de datos/);
  assert.match(styles, /\.analysis-metric-grid/);
  assert.match(styles, /\.analysis-metric-toggle/);
  assert.match(styles, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.analysis-metric-action/);
  assert.match(styles, /\.analysis-metric-expanded/);
  assert.match(summary, /commercial-capacity-history/);
  assert.match(summary, /trafficSeries/);
  assert.match(summary, /\(proyección\)/);
  assert.match(summary, /Lectura ejecutiva/);
  assert.match(summary, /onOpenAnalysis\("mix"\)/);
  assert.match(summary, /onOpenAnalysis\("modules"\)/);
  assert.match(summary, /onOpenAnalysis\("levels"\)/);
  assert.match(summary, /onOpenAnalysis\("area_type"\)/);
  assert.match(summary, /onOpenAnalysis\("vacancy"\)/);
  assert.doesNotMatch(summary, /<ExecutiveKpi label="Operando"[^>]*onOpenAnalysis/);
  assert.match(summary, /chart-analysis-route-link/);
  assert.match(directory, /analysisTarget: "average"/);
  assert.match(directory, /analysisTarget: "median"/);
  assert.match(directory, /analysisTarget: "format"/);
  assert.match(directory, /analysisTarget: "brands"/);
  assert.match(directory, /analysisTarget: "multi_location"/);
  assert.match(directory, /analysisTarget: "top3"/);
  assert.match(directory, /metric-analysis-direct-link/);
  assert.match(styles, /\.chart-analysis-route-link/);
  assert.match(styles, /\.metric-analysis-direct-link/);
  assert.doesNotMatch(intelligence, /id: "traffic"/);
  assert.doesNotMatch(intelligence, /id: "occupancy"/);
  assert.doesNotMatch(intelligence, /id: "surface"/);
  assert.doesNotMatch(intelligence, /id: "pipeline"/);
  assert.doesNotMatch(intelligence, /id: "financial"/);
  assert.match(intelligence, /Espacios arrendados \/ inventario comercial cargado/);
  assert.match(intelligence, /Fuente pendiente/);
  assert.match(intelligence, /Cargar Excel y generar tablero/);
  assert.match(intelligence, /if \(view === "reports"\) \{\s*return null;/);
  assert.doesNotMatch(intelligence, /Imprimir \/ guardar PDF/);
  assert.doesNotMatch(intelligence, /calidad y conciliaci[oó]n/i);
  assert.match(styles, /Inteligencia y Plan Comercial/);
  assert.match(styles, /Montserrat AIFA/);
});

test("adds concise metric-backed information cards to the existing ETP indicators", async () => {
  const directoryAnalytics = await readFile(new URL("../app/components/DirectoryAnalytics.tsx", import.meta.url), "utf8");
  const summaryDashboard = await readFile(new URL("../app/components/SummaryDashboard.tsx", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../app/DashboardClient.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(directoryAnalytics, /Promedio general/);
  assert.match(directoryAnalytics, /Mediana general/);
  assert.match(directoryAnalytics, /Promedio ocupado/);
  assert.match(directoryAnalytics, /Promedio disponible/);
  assert.match(directoryAnalytics, /Rango de superficie/);
  assert.match(directoryAnalytics, /Marcas operando/);
  assert.match(directoryAnalytics, /Ratio multi-ubicación/);
  assert.match(directoryAnalytics, /Concentración Top 3/);
  assert.match(directoryAnalytics, /Las tres marcas con mayor superficie ocupan/);
  assert.match(directoryAnalytics, /metric-analysis-trigger/);
  assert.match(directoryAnalytics, /Por qué importa/);
  assert.match(directoryAnalytics, /topThreeBrands\.map/);
  assert.match(directoryAnalytics, /Marcas principales y locales ocupados/);
  assert.match(directoryAnalytics, /Ver locales →/);
  assert.match(summaryDashboard, /onOpenBrand=\{onOpenBrand\}/);
  assert.match(dashboard, /onOpenBrand=\{\(brand\) => \{ clearFilters\(\); updateSearch\(brand\); setActiveModule\("locals"\)/);
  assert.match(directoryAnalytics, /role="dialog"/);
  assert.match(styles, /\.metric-analysis-popover/);
  assert.match(styles, /\.metric-analysis-links/);
  assert.doesNotMatch(styles, /\.metric-analysis-backdrop/);
  assert.doesNotMatch(styles, /\.metric-analysis-modal/);
});

test("adds dynamic vacancy and module placement analysis to the executive summary", async () => {
  const summaryDashboard = await readFile(new URL("../app/components/SummaryDashboard.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(summaryDashboard, /buildVacancyInsight/);
  assert.match(summaryDashboard, /buildModuleInsight/);
  assert.match(summaryDashboard, /Diagnóstico de colocación/);
  assert.match(summaryDashboard, /Prioridad de comercialización/);
  assert.match(summaryDashboard, /Análisis integral por módulo/);
  assert.match(summaryDashboard, /Módulos estrella/);
  assert.match(summaryDashboard, /Potencial de optimización/);
  assert.match(summaryDashboard, /Rentables con riesgo/);
  assert.match(summaryDashboard, /Atención prioritaria/);
  assert.match(summaryDashboard, /Los cuadrantes se dividen con las medianas del inventario comparable/);
  assert.match(summaryDashboard, /record\.estatus === "EN FUNCIONAMIENTO" && record\.monthlyRent !== null/);
  assert.match(summaryDashboard, /financialCoverage/);
  assert.match(summaryDashboard, /medianRentPerM2/);
  assert.match(summaryDashboard, /medianOccupancy/);
  assert.match(summaryDashboard, /tasa interna de vacancia/);
  assert.match(summaryDashboard, /Tamaño mediano vacante/);
  assert.match(summaryDashboard, /Zona de concentración/);
  assert.match(summaryDashboard, /Mayor oportunidad/);
  assert.match(summaryDashboard, /Actualizado con los filtros activos/);
  assert.match(summaryDashboard, /SpacePreviewPanel/);
  assert.match(summaryDashboard, /vacancyAnalysisOpen && vacancyInsight/);
  assert.match(summaryDashboard, /Consultar espacios →/);
  assert.match(summaryDashboard, /Consultar espacios vacantes del módulo/);
  assert.match(summaryDashboard, /Superficie/);
  assert.match(summaryDashboard, /Módulo/);
  assert.match(styles, /\.inventory-analysis/);
  assert.match(styles, /\.module-priority-list/);
  assert.match(styles, /\.module-bcg-wrap/);
  assert.match(styles, /\.module-bcg-matrix/);
  assert.match(styles, /\.module-bcg-items/);
  assert.match(styles, /\.module-analysis-method/);
  assert.match(styles, /\.vacancy-facts/);
  assert.match(styles, /\.space-preview-panel/);
  assert.match(styles, /\.space-preview-list/);
});

test("adds inventory-backed analysis to the four commercial distribution charts", async () => {
  const summaryDashboard = await readFile(new URL("../app/components/SummaryDashboard.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(summaryDashboard, /buildPortfolioInsight/);
  assert.match(summaryDashboard, /PortfolioAnalysisCard/);
  assert.match(summaryDashboard, /AnalysisToggle/);
  assert.match(summaryDashboard, /analysisOpen && insight/);
  assert.match(summaryDashboard, /analysisOpen && analysis/);
  assert.match(summaryDashboard, /Concentración Top 2/);
  assert.match(summaryDashboard, /Ocupación del giro/);
  assert.match(summaryDashboard, /Superficie vacante/);
  assert.match(summaryDashboard, /Concentración vertical/);
  assert.match(summaryDashboard, /Giros identificados/);
  assert.match(summaryDashboard, /sin atribuir todavía afluencia de pasajeros/);
  assert.match(summaryDashboard, /field: ("giroIata"|"giroOperativo"), kind: "giro"/);
  assert.match(summaryDashboard, /field: "lado", kind: "zona"/);
  assert.match(summaryDashboard, /field: "nivel", kind: "nivel"/);
  assert.match(summaryDashboard, /field: "area", kind: "area"/);
  assert.match(styles, /\.portfolio-chart-analysis/);
  assert.match(styles, /\.portfolio-analysis-metrics/);
  assert.match(styles, /\.portfolio-selectable-legend/);
  assert.match(styles, /\.chart-analysis-toggle/);
});

test("organizes primary navigation cleanly and removes obsolete modules", async () => {
  const dashboard = await readFile(new URL("../app/DashboardClient.tsx", import.meta.url), "utf8");
  const advertising = await readFile(new URL("../app/components/AdvertisingCenter.tsx", import.meta.url), "utf8");

  assert.match(dashboard, /<span>03<\/span>Publicidad/);
  assert.match(dashboard, /<span>04<\/span>Contratos/);
  assert.match(dashboard, /<span>05<\/span>Reportes/);
  assert.match(dashboard, /<span>06<\/span>Análisis/);
  assert.doesNotMatch(dashboard, /<span>04<\/span>Relación/);
  assert.doesNotMatch(dashboard, /<span>\d+<\/span>Finanzas/);
  assert.match(advertising, /AdvertisingFormModal/);
  assert.match(advertising, /nextAvailableUnitId/);
});

test("adds the institutional consultation module for the commercial direction", async () => {
  const dashboard = await readFile(new URL("../app/DashboardClient.tsx", import.meta.url), "utf8");
  const institutional = await readFile(new URL("../app/components/InstitutionalCenter.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.doesNotMatch(dashboard, /<span>\d+<\/span>Institucional/);
  assert.match(dashboard, /institutional-header-button/);
  assert.match(dashboard, /<InstitutionalCenter open=\{showInstitutional\}/);
  assert.match(institutional, /Dirección Comercial y de Servicios/);
  assert.match(institutional, /Misión/);
  assert.match(institutional, /Visión/);
  assert.match(institutional, /Objetivo/);
  assert.match(institutional, /Para el año 2036/);
  assert.match(institutional, /Maximizar el aprovechamiento del Aeropuerto Internacional Felipe Ángeles/);
  assert.doesNotMatch(institutional, /Sujeto a validación institucional/);
  assert.match(institutional, /role="dialog"/);
  assert.match(styles, /\.institutional-modal-backdrop/);
  assert.doesNotMatch(styles, /\.institutional-rail/);
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
