"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DataUploadModal from "./components/DataUploadModal";
import CommercialAlertsModal, { buildCommercialAlerts } from "./components/CommercialAlerts";
import ContractCenter from "./components/ContractCenter";
import DirectoryAnalytics from "./components/DirectoryAnalytics";
import FinanceCenter from "./components/FinanceCenter";
import GlobalSummary from "./components/GlobalSummary";
import InstitutionalCenter from "./components/InstitutionalCenter";
import IntelligenceCenter, { type IntelligenceView } from "./components/IntelligenceCenter";
import ReportsCenter from "./components/ReportsCenter";
import SummaryDashboard from "./components/SummaryDashboard";
import { locationOptions, type AnalysisTarget, type EtpCommercialCapacityData, type LocalRecord, type PassengerTrafficRecord } from "./types";

type FilterKey =
  | "lado"
  | "area"
  | "modulo"
  | "areaComercial"
  | "nivel"
  | "estatus"
  | "situacion"
  | "giroOperativo"
  | "gerencia";

type SortKey = "nomenclatura" | "marca" | "metraje" | "estatus";
type PrimaryModule = "home" | "locals" | "contracts" | "finances" | "reports" | "intelligence";
type HomeView = "global" | "zone";
type LocalView = "summary" | "directory";
type ContractView = "summary" | "preformalization" | "formalization" | "formalized" | "cancelled" | "expired" | "agreements";
// Contract stage views: "En preformalización", "En formalización", "Formalizados", "Cancelados", "Fenecidos", "Convenios" (managed in ContractCenter)

const PAGE_SIZE = 15;
type Dataset = Record<string, LocalRecord[]>;

const emptyDatasets = () => Object.fromEntries(
  locationOptions.map((location) => [location.id, [] as LocalRecord[]]),
) as Dataset;

const statusColors: Record<string, string> = {
  "EN FUNCIONAMIENTO": "#00886f",
  DISPONIBLE: "#f28c28",
  "EN PROCESO DE ASIGNACION": "#39a9db",
  FORMALIZADO: "#8a633f",
  "EN ADAPTACION": "#f2c94c",
};

const statusLabels: Record<string, string> = {
  "EN FUNCIONAMIENTO": "En funcionamiento",
  DISPONIBLE: "Disponible",
  "EN PROCESO DE ASIGNACION": "En proceso de asignación",
  FORMALIZADO: "Formalizado",
  "EN ADAPTACION": "En adaptación",
};

const filterLabels: Record<FilterKey, string> = {
  lado: "Lado",
  area: "Área",
  modulo: "Módulo",
  areaComercial: "Tipo de espacio",
  nivel: "Nivel",
  estatus: "Estatus",
  situacion: "Situación",
  giroOperativo: "Giro operativo",
  gerencia: "Gerencia",
};

const initialFilters: Record<FilterKey, string> = {
  lado: "",
  area: "",
  modulo: "",
  areaComercial: "",
  nivel: "",
  estatus: "",
  situacion: "",
  giroOperativo: "",
  gerencia: "",
};

const primaryFiltersByLocation: Record<string, FilterKey[]> = {
  etp: ["estatus", "lado", "area", "modulo", "areaComercial"],
  "parque-santa-lucia": ["estatus", "nivel", "giroOperativo", "areaComercial", "situacion"],
  "carga-aduana": ["estatus", "nivel", "areaComercial", "giroOperativo", "situacion"],
  "autobuses-plaza": ["estatus", "lado", "giroOperativo", "gerencia", "situacion"],
  "parque-revolucion": ["estatus", "areaComercial", "giroOperativo", "situacion"],
  "ciudad-aeroportuaria": ["estatus", "giroOperativo", "gerencia", "situacion"],
  "calzada-mamuts": ["estatus", "giroOperativo", "situacion"],
};

const advancedFiltersByLocation: Record<string, FilterKey[]> = {
  etp: ["nivel", "situacion", "giroOperativo", "gerencia"],
  "parque-santa-lucia": [],
  "carga-aduana": [],
  "autobuses-plaza": ["areaComercial"],
  "parque-revolucion": [],
  "ciudad-aeroportuaria": [],
  "calzada-mamuts": [],
};

const numberFormat = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 1,
});

const percentFormat = new Intl.NumberFormat("es-MX", {
  style: "percent",
  maximumFractionDigits: 1,
});

function normalized(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function SelectFilter({
  filterKey,
  value,
  options,
  onChange,
}: {
  filterKey: FilterKey;
  value: string;
  options: string[];
  onChange: (key: FilterKey, value: string) => void;
}) {
  return (
    <label className="filter-field">
      <span>{filterLabels[filterKey]}</span>
      <select
        value={value}
        onChange={(event) => onChange(filterKey, event.target.value)}
        aria-label={`Filtrar por ${filterLabels[filterKey]}`}
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {statusLabels[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

function KpiCard({
  eyebrow,
  value,
  caption,
  accent,
  onClick,
}: {
  eyebrow: string;
  value: string;
  caption: string;
  accent: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="kpi-accent" style={{ background: accent }} />
      <span className="kpi-eyebrow">{eyebrow}</span>
      <strong>{value}</strong>
      <small>{caption}</small>
    </>
  );

  return onClick ? (
    <button type="button" className="kpi-card kpi-button" onClick={onClick}>
      {content}
    </button>
  ) : (
    <article className="kpi-card">{content}</article>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <span>0</span>
      <h3>No hay locales con esta combinación</h3>
      <p>Prueba quitando uno o más filtros para ampliar la consulta.</p>
    </div>
  );
}

function EmptyLocationState({ onUpload }: { onUpload: () => void }) {
  return (
    <section className="empty-location">
      <span className="empty-location-mark">XLSX</span>
      <h2>No hay datos cargados en esta sesión</h2>
      <p>Selecciona el libro consolidado de Excel para habilitar el resumen, los filtros y el directorio.</p>
      <button type="button" className="primary-button" onClick={onUpload}>Cargar Excel local</button>
    </section>
  );
}

export default function DashboardClient() {
  const [activeModule, setActiveModule] = useState<PrimaryModule>("home");
  const [homeView, setHomeView] = useState<HomeView>("zone");
  const [, setLocalView] = useState<LocalView>("directory");
  const [contractView, setContractView] = useState<ContractView>("summary");
  const [intelligenceView, setIntelligenceView] = useState<IntelligenceView>("locals_occupancy");
  const [analysisTarget, setAnalysisTarget] = useState<AnalysisTarget>("capacity");
  const [locationId, setLocationId] = useState("etp");
  const [financeLocationId, setFinanceLocationId] = useState("etp");
  const [financeSubTab, setFinanceSubTab] = useState<"billed_vs_recovered" | "overdue_debt">("billed_vs_recovered");
  const [datasets, setDatasets] = useState<Dataset>(emptyDatasets);
  const [standaloneContractRecords, setStandaloneContractRecords] = useState<LocalRecord[]>([]);
  const [records, setRecords] = useState<LocalRecord[]>([]);
  const [etpCommercialCapacity, setEtpCommercialCapacity] = useState<EtpCommercialCapacityData | null>(null);
  const [passengerTraffic, setPassengerTraffic] = useState<PassengerTrafficRecord[]>([]);
  const [sourceFile, setSourceFile] = useState("Sin archivo cargado");
  const [sourceUpdatedAt, setSourceUpdatedAt] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataWarning, setDataWarning] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showCommercialAlerts, setShowCommercialAlerts] = useState(false);
  const [showInstitutional, setShowInstitutional] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("nomenclatura");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [isModuleMenuFixed, setIsModuleMenuFixed] = useState(false);
  const moduleMenuSentinelRef = useRef<HTMLDivElement>(null);

  const currentLocation = locationOptions.find((location) => location.id === locationId) ?? locationOptions[0];
  const totalSessionRecords = Object.values(datasets).reduce((total, dataset) => total + dataset.length, 0);
  const allContractRecords = useMemo(
    () => [...Object.values(datasets).flat(), ...standaloneContractRecords],
    [datasets, standaloneContractRecords],
  );
  const commercialAlerts = useMemo(() => buildCommercialAlerts(datasets.etp ?? []), [datasets]);
  const financeRecords = useMemo(
    () => financeLocationId === "all" ? Object.values(datasets).flat() : datasets[financeLocationId] ?? [],
    [datasets, financeLocationId],
  );
  const financeLocation = locationOptions.find((location) => location.id === financeLocationId);
  const financeScopeLabel = financeLocationId === "all" ? "Todas las zonas comerciales" : financeLocation?.name ?? "Zona comercial";
  const primaryFilterKeys = primaryFiltersByLocation[locationId] ?? primaryFiltersByLocation.etp;
  const advancedFilterKeys = advancedFiltersByLocation[locationId] ?? [];

  useEffect(() => {
    const hasSessionData = Object.values(datasets).some((dataset) => dataset.length > 0);
    if (!hasSessionData) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [datasets]);

  useEffect(() => {
    const updateModuleMenuPosition = () => {
      const sentinelTop = moduleMenuSentinelRef.current?.getBoundingClientRect().top ?? 1;
      setIsModuleMenuFixed(sentinelTop <= 0 && window.scrollY > 0);
    };
    updateModuleMenuPosition();
    window.addEventListener("scroll", updateModuleMenuPosition, { passive: true });
    window.addEventListener("resize", updateModuleMenuPosition);
    return () => {
      window.removeEventListener("scroll", updateModuleMenuPosition);
      window.removeEventListener("resize", updateModuleMenuPosition);
    };
  }, []);

  const options = useMemo(() => {
    const keys = Object.keys(initialFilters) as FilterKey[];
    return Object.fromEntries(
      keys.map((key) => [
        key,
        [...new Set(records.map((record) => String(record[key] ?? "")).filter(Boolean))].sort(
          (a, b) => a.localeCompare(b, "es", { numeric: true }),
        ),
      ]),
    ) as Record<FilterKey, string[]>;
  }, [records]);

  const filtered = useMemo(() => {
    const query = normalized(search.trim());
    const minimum = minArea === "" ? null : Number(minArea);
    const maximum = maxArea === "" ? null : Number(maxArea);

    return records.filter((record) => {
      const matchesQuery =
        !query ||
        [
          record.nomenclatura,
          record.marca,
          record.giroOperativo,
          record.giroIata,
          record.observaciones,
          record.modulo,
        ].some((value) => normalized(value).includes(query));

      const matchesSelects = (Object.keys(filters) as FilterKey[]).every((key) => {
        return !filters[key] || String(record[key] ?? "") === filters[key];
      });

      const matchesMinimum = minimum === null || (record.metraje ?? -Infinity) >= minimum;
      const matchesMaximum = maximum === null || (record.metraje ?? Infinity) <= maximum;
      return matchesQuery && matchesSelects && matchesMinimum && matchesMaximum;
    });
  }, [filters, maxArea, minArea, records, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const left = a[sortKey] ?? "";
      const right = b[sortKey] ?? "";
      const comparison =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), "es", { numeric: true });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filtered, sortDirection, sortKey]);

  const totalPages = Math.max(Math.ceil(sorted.length / PAGE_SIZE), 1);
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const metrics = useMemo(() => {
    const metraje = filtered.reduce((total, record) => total + (record.metraje ?? 0), 0);
    const operating = filtered.filter((record) => record.estatus === "EN FUNCIONAMIENTO").length;
    const available = filtered.filter((record) => record.estatus === "DISPONIBLE").length;
    return { metraje, operating, available };
  }, [filtered]);

  const activeFilterCount =
    Object.values(filters).filter(Boolean).length +
    (search ? 1 : 0) +
    (minArea ? 1 : 0) +
    (maxArea ? 1 : 0);

  const setFilter = (key: FilterKey, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    setExpandedId(null);
  };

  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    setExpandedId(null);
  };

  const updateMinArea = (value: string) => {
    setMinArea(value);
    setPage(1);
    setExpandedId(null);
  };

  const updateMaxArea = (value: string) => {
    setMaxArea(value);
    setPage(1);
    setExpandedId(null);
  };

  const changeLocation = (value: string) => {
    if (value === locationId) return;
    setLocationId(value);
    setRecords([...(datasets[value] ?? [])]);
    setLoadingData(false);
    setDataWarning("");
    setSearch("");
    setFilters(initialFilters);
    setMinArea("");
    setMaxArea("");
    setExpandedId(null);
    setPage(1);
    setShowAllFilters(false);
  };

  const clearFilters = () => {
    setSearch("");
    setFilters(initialFilters);
    setMinArea("");
    setMaxArea("");
    setPage(1);
    setExpandedId(null);
  };

  const changeSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const exportCsv = () => {
    const csvHeaders = [
      "No.",
      "Nomenclatura",
      "Lado",
      "Área",
      "Módulo",
      "Metraje",
      "Área comercial",
      "Nivel",
      "Estatus",
      "Situación",
      "Marca comercial",
      "Gerencia",
      "Giro operativo",
      "Giro IATA",
      "Observaciones",
    ];
    const csvRows = sorted.map((record) => [
      record.id,
      record.nomenclatura,
      record.lado,
      record.area,
      record.modulo,
      record.metrajeOriginal ?? "",
      record.areaComercial,
      record.nivel,
      record.estatus,
      record.situacion ?? "",
      record.marca ?? "",
      record.gerencia ?? "",
      record.giroOperativo ?? "",
      record.giroIata ?? "",
      record.observaciones ?? "",
    ]);
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const csv = [csvHeaders, ...csvRows].map((row) => row.map(escape).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `locales-${locationId}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };




  const isGlobalContext = activeModule === "contracts" || activeModule === "finances" || activeModule === "reports" || (activeModule === "intelligence" && intelligenceView !== "locals_occupancy") || (activeModule === "home" && homeView === "global");
  const contextRecordCount = activeModule === "finances" ? financeRecords.length : isGlobalContext ? totalSessionRecords : records.length;
  const heroTitle = activeModule === "home"
    ? homeView === "global" ? "Resumen global" : `Resumen de ${currentLocation.shortName}`
    : activeModule === "locals"
      ? `Directorio de ${currentLocation.shortName}`
      : activeModule === "contracts"
        ? "Instrumentos contractuales"
        : activeModule === "finances"
          ? "Resumen financiero"
          : activeModule === "intelligence"
            ? intelligenceView === "locals_occupancy" ? `Análisis de ${currentLocation.shortName}` : intelligenceView === "contracts_validity" ? "Análisis de Contratos y Vigencias" : intelligenceView === "finance_collections" ? "Análisis Financiero y Cobranza" : "Matriz 7 Zonas"
            : "Centro de Reportes";
  const heroDescription = activeModule === "home"
    ? homeView === "global"
      ? "Una visión consolidada de las 7 zonas comerciales, con indicadores separados de inventario, ocupación y gestión contractual."
      : `Panorama ejecutivo de ${currentLocation.name}, con acceso directo a sus locales, contratos y puntos de atención.`
    : activeModule === "locals"
      ? "Consulta el inventario físico y operativo de los espacios sin mezclarlo con el seguimiento detallado de los contratos."
    : activeModule === "contracts"
        ? "Consulta la cartera completa y da seguimiento a cada etapa contractual, desde la preformalización hasta su conclusión."
        : activeModule === "finances"
          ? "Analiza la renta contratada, la proyección anual, el costo por metro cuadrado y las condiciones de participación de la cartera vigente."
          : activeModule === "intelligence"
            ? intelligenceView === "locals_occupancy" ? `Convierte los indicadores de ${currentLocation.shortName} en conclusiones ejecutivas, evidencia y rutas de acción.` : "Visualiza el análisis especializado por área comercial, contractual y financiera de las 7 zonas comerciales."
            : "Genera documentos administrativos estandarizados con la información procesada por SIGCO.";
  const moduleTransitionKey = activeModule === "home"
    ? `${activeModule}-${homeView}`
    : activeModule === "contracts"
      ? `${activeModule}-${contractView}`
      : activeModule === "intelligence"
        ? `${activeModule}-${intelligenceView}`
        : activeModule;

  const openModule = (module: PrimaryModule) => {
    if (module === "finances" && activeModule !== "finances") setFinanceLocationId(isGlobalContext ? "all" : locationId);
    if (module === "intelligence" && activeModule !== "intelligence") setIntelligenceView("locals_occupancy");
    setActiveModule(module);
    setExpandedId(null);
    setPage(1);
  };

  const handleScopeChange = (value: string) => {
    if (activeModule === "finances") {
      setFinanceLocationId(value);
      return;
    }
    if (value === "all") {
      setActiveModule("home");
      setHomeView("global");
      return;
    }
    changeLocation(value);
    if (activeModule === "reports") {
      setActiveModule("locals");
      setLocalView("directory");
    }
  };

  const renderModuleLinks = (fixed = false) => (
    <div className="module-links">
      <button tabIndex={fixed ? 0 : isModuleMenuFixed ? -1 : undefined} className={activeModule === "home" ? "active" : ""} type="button" onClick={() => openModule("home")}><span>01</span>Inicio</button>
      <button tabIndex={fixed ? 0 : isModuleMenuFixed ? -1 : undefined} className={activeModule === "locals" ? "active" : ""} type="button" onClick={() => openModule("locals")}><span>02</span>Locales</button>
      <button tabIndex={fixed ? 0 : isModuleMenuFixed ? -1 : undefined} className={activeModule === "contracts" ? "active" : ""} type="button" onClick={() => openModule("contracts")}><span>03</span>Contratos</button>
      <button tabIndex={fixed ? 0 : isModuleMenuFixed ? -1 : undefined} className={activeModule === "finances" ? "active" : ""} type="button" onClick={() => openModule("finances")}><span>04</span>Finanzas</button>
      <button tabIndex={fixed ? 0 : isModuleMenuFixed ? -1 : undefined} className={activeModule === "intelligence" ? "active" : ""} type="button" onClick={() => openModule("intelligence")}><span>05</span>Análisis</button>
      <button tabIndex={fixed ? 0 : isModuleMenuFixed ? -1 : undefined} className={activeModule === "reports" ? "active" : ""} type="button" onClick={() => openModule("reports")}><span>06</span>Reportes</button>
    </div>
  );

  return (
    <main>
      <header className="top-shell">
        <div className="top-nav">
          <div className="brand">
            <img
              className="brand-logo"
              src="/brand/aifa-logo-horizontal-white.png"
              alt="Aeropuerto Internacional Felipe Ángeles"
            />
            <span className="brand-hierarchy">
              <span>Dirección Comercial y de Servicios</span>
              <span>Subdirección Comercial</span>
              <span>Grupo de Inteligencia y Análisis Comercial</span>
              <strong>SIGCO - Sistema Integral de Gestión Comercial y Operativa</strong>
            </span>
          </div>
          <div className="top-context-actions">
            <label className="compact-location-picker">
              <span>Zona comercial</span>
              <select value={activeModule === "finances" ? financeLocationId : isGlobalContext ? "all" : locationId} onChange={(event) => handleScopeChange(event.target.value)} aria-label="Zona comercial">
                <option value="all">Todas las zonas</option>
                {locationOptions.map((location) => <option key={location.id} value={location.id}>{location.shortName}</option>)}
              </select>
            </label>
            <button type="button" className="institutional-header-button" onClick={() => setShowInstitutional(true)} aria-haspopup="dialog" aria-expanded={showInstitutional}>
              <span className="institutional-header-mark" aria-hidden="true"><i /><i /><i /></span>
              Institucional
            </button>
            <button
              type="button"
              className={`notification-button${commercialAlerts.length ? " has-alerts" : ""}`}
              onClick={() => setShowCommercialAlerts(true)}
              disabled={!datasets.etp?.length}
              aria-label={`${commercialAlerts.length} alertas comerciales del ETP`}
            >
              Alertas <span>{commercialAlerts.length}</span>
            </button>
            <button type="button" className="manage-data-button" onClick={() => setShowUpload(true)}>Actualizar base</button>
            <span className="data-pill"><i /> Memoria local · {contextRecordCount} registros</span>
          </div>
        </div>

        <div ref={moduleMenuSentinelRef} className="module-nav-sentinel">
          <nav className="module-nav" aria-label="Módulos de SIGCO" aria-hidden={isModuleMenuFixed || undefined}>
            {renderModuleLinks()}
          </nav>
        </div>

        <div className="hero" id="inicio">
          <div>
            <span className="section-kicker">Aeropuerto Internacional Felipe Ángeles</span>
            <span className="module-context">{activeModule === "home" ? "Inicio" : activeModule === "locals" ? "Gestión de locales" : activeModule === "contracts" ? "Gestión contractual" : activeModule === "finances" ? "Análisis financiero" : activeModule === "intelligence" ? "Análisis rector" : "Salidas administrativas"}</span>
            <h1>{heroTitle}</h1>
            {activeModule !== "finances" && <p>{heroDescription}</p>}
          </div>
          <div className="hero-scope-card">
            <span>Contexto activo</span>
            <strong>{activeModule === "finances" ? financeScopeLabel : isGlobalContext ? "7 zonas comerciales" : currentLocation.name}</strong>
            <small>{contextRecordCount ? `${numberFormat.format(contextRecordCount)} registros en memoria` : "Carga la base para comenzar"}</small>
          </div>
        </div>
      </header>

      {isModuleMenuFixed && (
        <nav className="module-nav-fixed" aria-label="Módulos de SIGCO">
          <div className="module-nav">{renderModuleLinks(true)}</div>
        </nav>
      )}

      <div className="dashboard-shell">
        {activeModule !== "reports" && (
          <nav className="context-tabs" aria-label="Vistas del módulo">
            <div>
              <span>{activeModule === "home" ? "Panorama" : activeModule === "locals" ? "Locales" : activeModule === "contracts" ? "Contratos" : activeModule === "finances" ? "Finanzas" : "Análisis"}</span>
              {activeModule === "home" && <><button className={homeView === "global" ? "active" : ""} type="button" onClick={() => setHomeView("global")}>Resumen global</button><button className={homeView === "zone" ? "active" : ""} type="button" onClick={() => setHomeView("zone")}>Resumen de zona</button></>}
              {activeModule === "locals" && (
                <button className="active" type="button" onClick={() => setLocalView("directory")}>
                  Directorio
                </button>
              )}
              {activeModule === "contracts" && (
                <button className="active" type="button" onClick={() => setContractView("summary")}>
                  Instrumentos
                </button>
              )}
              {activeModule === "finances" && (
                <>
                  <button className={financeSubTab === "billed_vs_recovered" ? "active" : ""} type="button" onClick={() => setFinanceSubTab("billed_vs_recovered")}>Facturado vs. Recuperado</button>
                  <button className={financeSubTab === "overdue_debt" ? "active" : ""} type="button" onClick={() => setFinanceSubTab("overdue_debt")}>Cartera Vencida</button>
                </>
              )}
              {activeModule === "intelligence" && (
                <>
                  <button className={intelligenceView === "locals_occupancy" ? "active" : ""} type="button" onClick={() => setIntelligenceView("locals_occupancy")}>📍 Análisis de Locales</button>
                  <button className={intelligenceView === "contracts_validity" ? "active" : ""} type="button" onClick={() => setIntelligenceView("contracts_validity")}>📄 Análisis de Contratos</button>
                  <button className={intelligenceView === "finance_collections" ? "active" : ""} type="button" onClick={() => setIntelligenceView("finance_collections")}>💰 Análisis Financiero</button>
                  <button className={intelligenceView === "matrix" ? "active" : ""} type="button" onClick={() => setIntelligenceView("matrix")}>🏢 Matriz 7 Zonas</button>
                </>
              )}
            </div>
            <small>{isGlobalContext ? "Todas las zonas" : currentLocation.shortName}</small>
          </nav>
        )}
        {dataWarning && <div className="data-warning" role="status">{dataWarning}</div>}
        {loadingData && <div className="data-loading" role="status"><i /> Actualizando base…</div>}
        <div key={moduleTransitionKey} className="module-content-transition">
        {activeModule === "home" && homeView === "global" ? (
          <GlobalSummary
            datasets={datasets}
            onSelectLocation={(selectedLocationId) => {
              changeLocation(selectedLocationId);
              setActiveModule("locals");
              setLocalView("directory");
            }}
          />
        ) : activeModule === "intelligence" ? (
          <IntelligenceCenter
            key={`${analysisTarget}-${intelligenceView}`}
            datasets={datasets}
            view={intelligenceView}
            sourceFile={sourceFile}
            sourceUpdatedAt={sourceUpdatedAt}
            locationId={locationId}
            etpCommercialCapacity={etpCommercialCapacity}
            passengerTraffic={passengerTraffic}
            analysisTarget={analysisTarget}
            onUpload={() => setShowUpload(true)}
            onChangeView={setIntelligenceView}
            onSelectLocation={(selectedLocId) => changeLocation(selectedLocId)}
            onOpenLocal={(nomenclature, sourceLocationId) => {
              if (sourceLocationId && datasets[sourceLocationId]) changeLocation(sourceLocationId);
              updateSearch(nomenclature);
              setActiveModule("locals");
              setLocalView("directory");
            }}
          />
        ) : activeModule === "finances" ? (
          <FinanceCenter
            records={financeRecords}
            scopeLabel={financeScopeLabel}
            subTab={financeSubTab}
            onChangeSubTab={setFinanceSubTab}
            onUpload={() => setShowUpload(true)}
          />
        ) : activeModule === "reports" ? (
          <ReportsCenter
            datasets={datasets}
            contractRecords={allContractRecords}
            onUpload={() => setShowUpload(true)}
          />
        ) : activeModule === "contracts" ? (
          allContractRecords.length ? <ContractCenter records={allContractRecords} locationName="Todas las zonas comerciales" mode={contractView} onOpenLocal={(nomenclature, sourceLocationId) => { if (sourceLocationId && datasets[sourceLocationId]) changeLocation(sourceLocationId); updateSearch(nomenclature); setActiveModule("locals"); setLocalView("directory"); }} /> : <EmptyLocationState onUpload={() => setShowUpload(true)} />
        ) : activeModule === "home" ? (
          records.length ? (
            <SummaryDashboard
              records={records}
              locationId={locationId}
              locationName={currentLocation.name}
              recordLabel={currentLocation.recordLabel}
              etpCommercialCapacity={etpCommercialCapacity}
              onOpenDirectory={() => { setActiveModule("locals"); setLocalView("directory"); }}
              onOpenBrand={(brand) => { clearFilters(); updateSearch(brand); setActiveModule("locals"); setLocalView("directory"); }}
              onOpenAnalysis={(indicator) => { setAnalysisTarget(indicator); setIntelligenceView("locals_occupancy"); setActiveModule("intelligence"); }}
            />
          ) : (
            <EmptyLocationState onUpload={() => setShowUpload(true)} />
          )
        ) : (
          <>
        <section className="kpi-grid" aria-label="Indicadores principales">
          <KpiCard
            eyebrow={`${currentLocation.recordLabel.charAt(0).toUpperCase()}${currentLocation.recordLabel.slice(1)} visualizados`}
            value={numberFormat.format(filtered.length)}
            caption={records.length ? `${percentFormat.format(filtered.length / records.length)} de ${currentLocation.shortName}` : "Sin registros"}
            accent="#ac182c"
          />
          <KpiCard
            eyebrow="Superficie acumulada"
            value={`${numberFormat.format(metrics.metraje)} m²`}
            caption="Suma de registros con metraje"
            accent="#405364"
          />
          <KpiCard
            eyebrow="En funcionamiento"
            value={numberFormat.format(metrics.operating)}
            caption={filtered.length ? percentFormat.format(metrics.operating / filtered.length) : "0%"}
            accent={statusColors["EN FUNCIONAMIENTO"]}
            onClick={() => setFilter("estatus", "EN FUNCIONAMIENTO")}
          />
          <KpiCard
            eyebrow="Disponibles"
            value={numberFormat.format(metrics.available)}
            caption={filtered.length ? percentFormat.format(metrics.available / filtered.length) : "0%"}
            accent={statusColors.DISPONIBLE}
            onClick={() => setFilter("estatus", "DISPONIBLE")}
          />
        </section>

        <section className="workspace" id="directorio">
          <aside className="filters-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Consulta</span>
                <h2>Filtros</h2>
              </div>
              {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
            </div>

            <label className="search-field">
              <span>Buscar {currentLocation.recordLabel} o marca</span>
              <div>
                <b aria-hidden="true">⌕</b>
                <input
                  value={search}
                  onChange={(event) => updateSearch(event.target.value)}
                  placeholder="Ej. SUBWAY o LLEIH-01"
                />
              </div>
            </label>

            <div className="filter-grid">
              {primaryFilterKeys.map((key) => (
                  <SelectFilter
                    key={key}
                    filterKey={key}
                    value={filters[key]}
                    options={options[key]}
                    onChange={setFilter}
                  />
                ))}
            </div>

            <div className="range-filter">
              <span>Rango de superficie (m²)</span>
              <div>
                <input
                  type="number"
                  min="0"
                  value={minArea}
                  onChange={(event) => updateMinArea(event.target.value)}
                  placeholder="Mín."
                  aria-label="Metraje mínimo"
                />
                <input
                  type="number"
                  min="0"
                  value={maxArea}
                  onChange={(event) => updateMaxArea(event.target.value)}
                  placeholder="Máx."
                  aria-label="Metraje máximo"
                />
              </div>
            </div>

            {advancedFilterKeys.length > 0 && (
              <button
                className="more-filters"
                type="button"
                onClick={() => setShowAllFilters((current) => !current)}
                aria-expanded={showAllFilters}
              >
                {showAllFilters ? "Ocultar filtros avanzados" : "Mostrar filtros avanzados"}
                <span>{showAllFilters ? "−" : "+"}</span>
              </button>
            )}

            {showAllFilters && advancedFilterKeys.length > 0 && (
              <div className="advanced-filters">
                {advancedFilterKeys.map((key) => (
                  <SelectFilter
                    key={key}
                    filterKey={key}
                    value={filters[key]}
                    options={options[key]}
                    onChange={setFilter}
                  />
                ))}
              </div>
            )}

            <button className="clear-button" type="button" onClick={clearFilters} disabled={!activeFilterCount}>
              Limpiar filtros
            </button>
          </aside>

          <div className="content-column">
            {filtered.length ? (
              <>
                <DirectoryAnalytics
                  locationId={locationId}
                  records={filtered}
                  recordLabel={currentLocation.recordLabel}
                  activeStatus={filters.estatus}
                  onFilter={setFilter}
                />

                <section className="directory-card">
                  <div className="directory-heading">
                    <div>
                      <span className="section-kicker">Detalle operativo</span>
                      <h2>Directorio de {currentLocation.recordLabel}</h2>
                      <p>
                        Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, sorted.length)}–
                        {Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length}
                      </p>
                    </div>
                    <div className="directory-actions">
                      <button type="button" onClick={() => window.print()} className="secondary-button">
                        Imprimir
                      </button>
                      <button type="button" onClick={exportCsv} className="primary-button">
                        Exportar CSV
                      </button>
                    </div>
                  </div>

                  {activeFilterCount > 0 && (
                    <div className="active-filters" aria-label="Filtros activos">
                      <span>Filtros activos</span>
                      {search && (
                        <button type="button" onClick={() => updateSearch("")}>
                          Búsqueda: {search} ×
                        </button>
                      )}
                      {(Object.keys(filters) as FilterKey[]).map(
                        (key) =>
                          filters[key] && (
                            <button type="button" key={key} onClick={() => setFilter(key, "")}>
                              {filterLabels[key]}: {statusLabels[filters[key]] ?? filters[key]} ×
                            </button>
                          ),
                      )}
                      {minArea && (
                        <button type="button" onClick={() => updateMinArea("")}>
                          Desde {minArea} m² ×
                        </button>
                      )}
                      {maxArea && (
                        <button type="button" onClick={() => updateMaxArea("")}>
                          Hasta {maxArea} m² ×
                        </button>
                      )}
                    </div>
                  )}

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>
                            <button type="button" onClick={() => changeSort("nomenclatura")}>
                              Local {sortKey === "nomenclatura" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                            </button>
                          </th>
                          <th>
                            <button type="button" onClick={() => changeSort("marca")}>
                              Marca {sortKey === "marca" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                            </button>
                          </th>
                          <th>Ubicación</th>
                          <th>Tipo</th>
                          <th>
                            <button type="button" onClick={() => changeSort("metraje")}>
                              Metraje {sortKey === "metraje" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                            </button>
                          </th>
                          <th>
                            <button type="button" onClick={() => changeSort("estatus")}>
                              Estatus {sortKey === "estatus" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                            </button>
                          </th>
                          <th><span className="sr-only">Detalle</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((record) => (
                          <RecordRows
                            key={record.id}
                            record={record}
                            expanded={expandedId === record.id}
                            onToggle={() => setExpandedId(expandedId === record.id ? null : record.id)}
                            onOpenContract={() => { setActiveModule("contracts"); setContractView("summary"); }}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pagination">
                    <span>Página {page} de {totalPages}</span>
                    <div>
                      <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                        Anterior
                      </button>
                      <button
                        type="button"
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <section className="directory-card"><EmptyState /></section>
            )}
          </div>
        </section>
          </>
        )}
        </div>
      </div>

      <footer>
        <span className="footer-brand">
          <img src="/brand/aifa-logo-horizontal-dark.png" alt="Aeropuerto Internacional Felipe Ángeles" />
          <span>SIGCO - Sistema Integral de Gestión Comercial y Operativa</span>
        </span>
        <span>
          Fuente: {sourceFile} · {records.length} locales
          {sourceUpdatedAt ? ` · actualizada ${new Date(sourceUpdatedAt).toLocaleDateString("es-MX")}` : ""}
        </span>
      </footer>

      {showUpload && (
        <DataUploadModal
          open
          onClose={() => setShowUpload(false)}
          onSuccess={(result) => {
            const nextLocationId = result.datasets[locationId]?.length
              ? locationId
              : Object.keys(result.datasets)[0] ?? locationId;
            setDatasets(result.datasets);
            setStandaloneContractRecords(result.contractRecords);
            setLocationId(nextLocationId);
            setFinanceLocationId(nextLocationId);
            setRecords(result.datasets[nextLocationId] ?? []);
            setEtpCommercialCapacity(result.etpCommercialCapacity);
            setPassengerTraffic(result.passengerTraffic);
            setSourceFile(result.filename);
            setSourceUpdatedAt(new Date().toISOString());
            setDataWarning("");
            setLoadingData(false);
            setSearch("");
            setFilters(initialFilters);
            setMinArea("");
            setMaxArea("");
            setExpandedId(null);
            setPage(1);
            setActiveModule("home");
            setHomeView("zone");
            setShowUpload(false);
            setShowCommercialAlerts(false);
          }}
        />
      )}
      <CommercialAlertsModal
        open={showCommercialAlerts}
        alerts={commercialAlerts}
        onClose={() => setShowCommercialAlerts(false)}
      />
      <InstitutionalCenter open={showInstitutional} onClose={() => setShowInstitutional(false)} />
    </main>
  );
}

function RecordRows({
  record,
  expanded,
  onToggle,
  onOpenContract,
}: {
  record: LocalRecord;
  expanded: boolean;
  onToggle: () => void;
  onOpenContract: () => void;
}) {
  return (
    <>
      <tr className={expanded ? "expanded-row" : ""}>
        <td>
          <strong className="nomenclature">{record.nomenclatura}</strong>
          <small>Módulo {record.modulo} · Nivel {record.nivel}</small>
        </td>
        <td>
          <strong>{record.marca || "Sin marca asignada"}</strong>
          <small>{record.giroOperativo || "Sin giro"}</small>
        </td>
        <td>
          {record.lado}
          <small>{record.area}</small>
        </td>
        <td>{record.areaComercial}</td>
        <td className="numeric">
          {record.metraje === null
            ? record.metrajeOriginal || "—"
            : `${numberFormat.format(record.metraje)} m²`}
        </td>
        <td>
          <span className="status-badge" style={{ "--status": statusColors[record.estatus] ?? "#8a817a" } as React.CSSProperties}>
            {statusLabels[record.estatus] ?? record.estatus}
          </span>
        </td>
        <td>
          <button
            type="button"
            className="detail-button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Ocultar" : "Mostrar"} detalle de ${record.nomenclatura}`}
          >
            {expanded ? "−" : "+"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="detail-row">
          <td colSpan={7}>
            <div className="detail-grid">
              <div><span>Situación</span><strong>{record.situacion || "Sin dato"}</strong></div>
              <div><span>Gerencia</span><strong>{record.gerencia || "Sin dato"}</strong></div>
              <div><span>Subdirección</span><strong>{record.subdireccion || "Sin dato"}</strong></div>
              <div><span>Giro IATA</span><strong>{record.giroIata || "Sin dato"}</strong></div>
              <div><span>Contrato</span><strong>{record.contractNumber || "Sin número"}</strong>{(record.contractNumber || record.contractPending) && <button type="button" className="inline-module-link" onClick={onOpenContract}>Ver en contratos →</button>}</div>
              <div><span>Renta mensual</span><strong>{record.monthlyRent === null ? "Sin dato" : new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(record.monthlyRent)}</strong></div>
              <div><span>Renovación</span><strong>{record.renewalDate || "Sin dato"}</strong></div>
              <div><span>Gestor</span><strong>{record.manager || "Sin asignar"}</strong></div>
              <div className="detail-wide"><span>Giro INDAABIN</span><strong>{record.giroIndaabin || "Sin dato"}</strong></div>
              <div className="detail-wide"><span>Observaciones</span><strong>{record.observaciones || "Sin observaciones"}</strong></div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
