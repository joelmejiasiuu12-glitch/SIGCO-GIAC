"use client";

import { Component, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import DataUploadModal from "./components/DataUploadModal";
import LocalFormModal from "./components/LocalFormModal";

class SafeModuleBoundary extends Component<
  { children: ReactNode; onReset?: () => void; moduleName?: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; onReset?: () => void; moduleName?: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error al renderizar módulo:", error, info);
  }
  componentDidUpdate(prevProps: { moduleName?: string }) {
    if (prevProps.moduleName !== this.props.moduleName && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <section style={{ margin: "32px auto", maxWidth: "650px", textAlign: "center", padding: "36px 24px", background: "#ffffff", borderRadius: "12px", border: "1px solid #dfe4e7", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>⚠️</div>
          <h3 style={{ color: "#ac182c", fontSize: "18px", fontWeight: 800, margin: "0 0 8px 0" }}>
            No se pudo desplegar el módulo {this.props.moduleName || ""}
          </h3>
          <p style={{ color: "#5c6f84", fontSize: "13px", lineHeight: "1.5", margin: "0 0 20px 0" }}>
            {this.state.error?.message || "Ocurrió un error inesperado al procesar la información."}
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onReset) this.props.onReset();
              }}
            >
              Reintentar carga
            </button>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}
import ContractFormModal from "./components/ContractFormModal";
import CommercialAlertsModal, { buildCommercialAlerts } from "./components/CommercialAlerts";
import ContractCenter, { buildContracts, recordMatchesZone } from "./components/ContractCenter";
import DirectoryAnalytics from "./components/DirectoryAnalytics";
import GlobalSummary from "./components/GlobalSummary";
import InstitutionalCenter from "./components/InstitutionalCenter";
import IntelligenceCenter, { type IntelligenceView } from "./components/IntelligenceCenter";
import ReportsCenter from "./components/ReportsCenter";
import SummaryDashboard from "./components/SummaryDashboard";
import LoginScreen from "./components/LoginScreen";
import GscDashboard from "./components/GscDashboard";
import AdvertisingCenter from "./components/AdvertisingCenter";
import CommercialCapacityModal from "./components/CommercialCapacityModal";
import { getSavedSession, saveSession, clearSession, type AuthUser } from "./types/auth";
import { locationOptions, type AdvertisingSpaceRecord, type AnalysisTarget, type EtpCommercialCapacityData, type LocalRecord, type PassengerTrafficRecord } from "./types";

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
type PrimaryModule = "home" | "locals" | "advertising" | "contracts" | "reports" | "intelligence" | "gsc_dashboard";
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
      <span className="empty-location-mark">SIGCO</span>
      <h2>Cargando locales comerciales...</h2>
      <p>Cargando el inventario comercial oficial de la Subdirección.</p>
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
  const [contractLocationId, setContractLocationId] = useState("all");
  const [datasets, setDatasets] = useState<Dataset>(emptyDatasets);
  const [standaloneContractRecords, setStandaloneContractRecords] = useState<LocalRecord[]>([]);
  const records = useMemo(() => datasets[locationId] ?? [], [datasets, locationId]);
  const [etpCommercialCapacity, setEtpCommercialCapacity] = useState<EtpCommercialCapacityData | null>(null);
  const [passengerTraffic, setPassengerTraffic] = useState<PassengerTrafficRecord[]>([]);
  const [advertisingSpaces, setAdvertisingSpaces] = useState<AdvertisingSpaceRecord[]>([]);
  const [advertisingSearch, setAdvertisingSearch] = useState<string>("");
  const [advertisingSelectedUnitCode, setAdvertisingSelectedUnitCode] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState("Sin archivo cargado");
  const [sourceUpdatedAt, setSourceUpdatedAt] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataWarning, setDataWarning] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showCommercialAlerts, setShowCommercialAlerts] = useState(false);
  const [showInstitutional, setShowInstitutional] = useState(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);
  const [editingLocalRecord, setEditingLocalRecord] = useState<LocalRecord | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [editingContractRecord, setEditingContractRecord] = useState<LocalRecord | null>(null);
  const [showCapacityModal, setShowCapacityModal] = useState(false);

  // Control de sesión institucional
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClientMounted(true);
    try {
      const stored = getSavedSession();
      if (stored) {
        setCurrentUser(stored);
        if (stored.role === "gerente_gsc") {
          setActiveModule("gsc_dashboard");
        }
      }
    } catch {
      // Ignorar errores
    }
  }, []);

  // Cierre al hacer clic fuera del menú de usuario
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    saveSession(user);
    if (user.role === "gerente_gsc") {
      setActiveModule("gsc_dashboard");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    clearSession();
    setActiveModule("home");
  };

  // Carga inicial automática de locales desde Cloudflare D1
  useEffect(() => {
    fetch("/api/locales")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && Array.isArray(data.locales) && data.locales.length > 0) {
          const newDatasets: Dataset = emptyDatasets();
          data.locales.forEach((l: any) => {
            const locId = l.zona_id;
            if (!newDatasets[locId]) {
              newDatasets[locId] = [];
            }
            const rec: LocalRecord = {
              id: l.id,
              nomenclatura: l.nomenclatura,
              lado: l.lado || "N/A",
              area: l.area || "N/A",
              modulo: l.modulo || "N/A",
              metraje: l.metraje !== null ? Number(l.metraje) : null,
              metrajeOriginal: l.metraje_original || l.metraje,
              areaComercial: l.tipo_espacio || "Local",
              nivel: l.nivel || "1",
              estatus: l.estatus || "DISPONIBLE",
              situacion: l.situacion || null,
              marca: l.marca || null,
              subdireccion: l.subdireccion || null,
              gerencia: l.gerencia || null,
              giroIata: l.giro_iata || null,
              giroOperativo: l.giro_operativo || null,
              giroIndaabin: l.giro_indaabin || null,
              observaciones: l.observaciones || null,
              fechaFormalizacion: l.fecha_formalizacion || null,
              fechaConclusion: l.fecha_conclusion || null,
              contractNumber: l.contract_number || null,
              contractPending: Boolean(l.contract_pending),
              commercialLine: l.commercial_line || null,
              commercialSubline: l.commercial_subline || null,
              costPerM2: l.cost_per_m2 || null,
              monthlyRent: l.monthly_rent || null,
              participationRate: l.participation_rate || null,
              participationNotes: l.participation_notes || null,
              operationsStartDate: l.operations_start_date || null,
              signatureDate: l.signature_date || null,
              contractTerm: l.contract_term || null,
              renewalDate: l.renewal_date || null,
              guaranteeStatus: l.guarantee_status || null,
              liabilityPolicyStatus: l.liability_policy_status || null,
              projectStatus: l.project_status || null,
              contractStatus: l.contract_status || null,
              operationalStatus: l.operational_status || null,
              contactData: l.contact_data || null,
              manager: l.manager || null,
              contractLocationId: l.zona_id,
            };
            newDatasets[locId].push(rec);
          });

          if (Array.isArray(data.advertisingSpaces) && data.advertisingSpaces.length > 0) {
            setAdvertisingSpaces(data.advertisingSpaces);
          }

          setDatasets(newDatasets);
          setSourceFile(`Padrón Oficial (${data.locales.length} locales)`);
          setSourceUpdatedAt(new Date().toISOString());

          if (Array.isArray(data.contracts) && data.contracts.length > 0) {
            const mappedContracts: LocalRecord[] = data.contracts.map((c: any, idx: number) => ({
              id: 10000 + idx,
              nomenclatura: (c.nomenclatura && c.nomenclatura !== "N/A" && c.nomenclatura !== c.contractNumber) ? c.nomenclatura : "Sin local asignado",
              lado: c.lado || "N/A",
              area: c.area || "N/A",
              modulo: c.modulo || "N/A",
              metraje: c.metraje !== null && c.metraje !== undefined ? Number(c.metraje) : null,
              metrajeOriginal: c.metraje,
              areaComercial: c.areaComercial || "Local",
              nivel: c.nivel || "1",
              estatus: c.contractStatus || "FORMALIZADO",
              situacion: c.contractStatus || null,
              marca: c.marca || null,
              razonSocial: c.razonSocial || null,
              subdireccion: "SVS COM",
              gerencia: c.gerencia || (c.contractNumber && c.contractNumber.includes("GEP") ? "Gerencia de Espacios Publicitarios" : "Gerencia de Servicios Comerciales"),
              giroIata: c.giroIata || null,
              giroOperativo: c.giroOperativo || null,
              giroIndaabin: c.giroIndaabin || null,
              observaciones: c.observaciones || null,
              fechaFormalizacion: c.fechaFormalizacion || c.signatureDate || null,
              fechaConclusion: c.fechaConclusion || null,
              contractNumber: c.contractNumber || null,
              contractPending: false,
              commercialLine: c.commercialLine || null,
              commercialSubline: c.commercialSubline || null,
              costPerM2: c.costPerM2 !== null && c.costPerM2 !== undefined ? Number(c.costPerM2) : null,
              monthlyRent: c.monthlyRent !== null && c.monthlyRent !== undefined ? Number(c.monthlyRent) : null,
              participationRate: c.participationRate !== null && c.participationRate !== undefined ? Number(c.participationRate) : null,
              participationNotes: c.participationNotes || null,
              operationsStartDate: c.operationsStartDate || null,
              signatureDate: c.signatureDate || null,
              contractTerm: c.contractTerm || null,
              renewalDate: c.renewalDate || null,
              guaranteeStatus: c.guaranteeStatus || null,
              liabilityPolicyStatus: c.liabilityPolicyStatus || null,
              projectStatus: c.projectStatus || null,
              contractStatus: c.contractStatus || null,
              operationalStatus: c.contractStatus || null,
              contactData: c.contactData || null,
              manager: c.manager || null,
              contractStage: c.contractStage || "formalized",
              contractSourceSheet: "Padrón Oficial",
              contractLocationId: c.contractLocationId || "etp",
              contractLocationName: c.contractLocationName || "Edificio Terminal de Pasajeros (ETP)",
              zonaComercial: c.zonaComercial || "ETP",
              daysRemaining: c.daysRemaining !== null && c.daysRemaining !== undefined ? Number(c.daysRemaining) : null,
            }));
            setStandaloneContractRecords(mappedContracts);
          }

          if (data.etpCommercialCapacity) {
            setEtpCommercialCapacity(data.etpCommercialCapacity);
          }

          if (Array.isArray(data.passengerTraffic) && data.passengerTraffic.length > 0) {
            setPassengerTraffic(data.passengerTraffic);
          }
        }
      })
      .catch((err) => {
        console.warn("Entorno local sin conexión D1, operando en memoria:", err);
      });

    fetch("/api/espacios-publicitarios")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && Array.isArray(data.advertisingSpaces) && data.advertisingSpaces.length > 0) {
          setAdvertisingSpaces(data.advertisingSpaces);
        }
      })
      .catch(() => {});
  }, []);

  const handleOpenAddLocal = () => {
    setEditingLocalRecord(null);
    setIsLocalModalOpen(true);
  };

  const handleOpenEditLocal = (record: LocalRecord) => {
    setEditingLocalRecord(record);
    setIsLocalModalOpen(true);
  };

  const handleSaveLocal = async (savedRecord: LocalRecord) => {
    const targetLocId = savedRecord.contractLocationId || locationId;
    const isEdit = Boolean(editingLocalRecord);

    // 1. Actualización reactiva inmediata en estado de React
    setDatasets((prev) => {
      const list = prev[targetLocId] ?? [];
      const exists = list.some((r) => r.id === savedRecord.id || r.nomenclatura === savedRecord.nomenclatura);
      let newList: LocalRecord[];
      if (exists) {
        newList = list.map((r) => (r.id === savedRecord.id || r.nomenclatura === savedRecord.nomenclatura ? savedRecord : r));
      } else {
        newList = [savedRecord, ...list];
      }
      return {
        ...prev,
        [targetLocId]: newList,
      };
    });

    // 2. Persistencia remota en Cloudflare D1
    try {
      await fetch("/api/locales", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...savedRecord,
          zona_id: targetLocId,
        }),
      });
    } catch (err) {
      console.warn("Error guardando local en D1:", err);
    }
  };

  const handleDeleteLocal = async (record: LocalRecord) => {
    if (!window.confirm(`¿Confirmas la eliminación del local ${record.nomenclatura}? Esta acción es permanente.`)) {
      return;
    }
    const targetLocId = record.contractLocationId || locationId;

    // 1. Actualización en React
    setDatasets((prev) => {
      const list = prev[targetLocId] ?? [];
      return {
        ...prev,
        [targetLocId]: list.filter((r) => r.id !== record.id && r.nomenclatura !== record.nomenclatura),
      };
    });

    // 2. Eliminación en Cloudflare D1
    try {
      await fetch(`/api/locales?id=${encodeURIComponent(record.id)}&nomenclatura=${encodeURIComponent(record.nomenclatura)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("Error eliminando local en D1:", err);
    }
  };

  const handleSaveAdvertisingSpace = async (savedSpace: AdvertisingSpaceRecord) => {
    const isEdit = advertisingSpaces.some(
      (s) => s.id === savedSpace.id || s.id_unidad === savedSpace.id_unidad
    );

    // 1. Actualización reactiva inmediata
    setAdvertisingSpaces((prev) => {
      const exists = prev.some(
        (s) => s.id === savedSpace.id || s.id_unidad === savedSpace.id_unidad
      );
      if (exists) {
        return prev.map((s) =>
          s.id === savedSpace.id || s.id_unidad === savedSpace.id_unidad ? savedSpace : s
        );
      }
      return [savedSpace, ...prev];
    });

    // 2. Persistencia remota en Cloudflare D1
    try {
      await fetch("/api/espacios-publicitarios", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savedSpace),
      });
    } catch (err) {
      console.warn("Error guardando espacio publicitario en D1:", err);
    }
  };

  const handleDeleteAdvertisingSpace = async (space: AdvertisingSpaceRecord) => {
    // 1. Actualización reactiva inmediata
    setAdvertisingSpaces((prev) =>
      prev.filter((s) => s.id !== space.id && s.id_unidad !== space.id_unidad)
    );

    // 2. Eliminación remota en Cloudflare D1
    try {
      await fetch(
        `/api/espacios-publicitarios?id=${encodeURIComponent(space.id)}&id_unidad=${encodeURIComponent(space.id_unidad)}`,
        { method: "DELETE" }
      );
    } catch (err) {
      console.warn("Error eliminando espacio publicitario en D1:", err);
    }
  };

  const handleOpenAddContract = () => {
    setEditingContractRecord(null);
    setIsContractModalOpen(true);
  };

  const handleOpenEditContract = (contract: any) => {
    const existing = standaloneContractRecords.find(
      (r) => r.contractNumber === contract.contractNumber
    ) || contract.locals?.[0];

    const recordToEdit: LocalRecord = existing ? { ...existing } : {
      id: Date.now(),
      nomenclatura: contract.locals?.[0]?.nomenclatura || contract.contractNumber || "",
      lado: contract.locals?.[0]?.lado || "N/A",
      area: contract.locals?.[0]?.area || "N/A",
      modulo: contract.locals?.[0]?.modulo || "N/A",
      metraje: contract.locals?.[0]?.metraje ?? null,
      metrajeOriginal: contract.locals?.[0]?.metrajeOriginal ?? null,
      areaComercial: contract.locals?.[0]?.areaComercial || "Local",
      nivel: contract.locals?.[0]?.nivel || "1",
      estatus: contract.contractStatus || "FORMALIZADO",
      situacion: contract.contractStatus || null,
      marca: contract.brand || null,
      razonSocial: contract.razonSocial || null,
      subdireccion: "SVS COM",
      gerencia: contract.gerencia || "Gerencia de Servicios Comerciales",
      giroIata: contract.locals?.[0]?.giroIata ?? null,
      giroOperativo: contract.commercialLine ?? null,
      giroIndaabin: contract.locals?.[0]?.giroIndaabin ?? null,
      observaciones: contract.locals?.[0]?.observaciones ?? null,
      fechaFormalizacion: contract.signatureDate || null,
      fechaConclusion: contract.renewalDate || null,
      contractNumber: contract.contractNumber || null,
      contractPending: contract.pending || false,
      commercialLine: contract.commercialLine || null,
      commercialSubline: contract.commercialSubline || null,
      costPerM2: contract.costPerM2 ?? null,
      monthlyRent: contract.monthlyRent ?? null,
      participationRate: contract.participationRate ?? null,
      participationNotes: contract.participationNotes ?? null,
      operationsStartDate: contract.operationsStartDate || null,
      signatureDate: contract.signatureDate || null,
      contractTerm: contract.contractTerm || null,
      renewalDate: contract.renewalDate || null,
      guaranteeStatus: contract.guaranteeStatus || null,
      liabilityPolicyStatus: contract.liabilityPolicyStatus || null,
      projectStatus: contract.projectStatus || null,
      contractStatus: contract.contractStatus || null,
      operationalStatus: contract.operationalStatus || null,
      contactData: contract.locals?.[0]?.contactData ?? null,
      manager: contract.manager || null,
      contractStage: "formalized",
      contractSourceSheet: "Padrón Oficial",
      contractLocationId: contract.locationId || "etp",
      contractLocationName: contract.locationName || "Edificio Terminal de Pasajeros (ETP)",
      zonaComercial: contract.zonaComercial || "ETP",
      daysRemaining: contract.daysRemaining ?? null,
    };

    setEditingContractRecord(recordToEdit);
    setIsContractModalOpen(true);
  };

  const handleSaveContract = async (savedRecord: LocalRecord) => {
    const numContrato = savedRecord.contractNumber;
    if (!numContrato) return;

    // 1. Actualización reactiva en React
    setStandaloneContractRecords((prev) => {
      const exists = prev.some((r) => r.contractNumber === numContrato);
      if (exists) {
        return prev.map((r) => (r.contractNumber === numContrato ? { ...r, ...savedRecord } : r));
      }
      return [savedRecord, ...prev];
    });

    // Si el contrato está vinculado a un local físico, sincronizar también el local
    if (savedRecord.nomenclatura) {
      setDatasets((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((zId) => {
          next[zId] = next[zId].map((loc) => {
            if (loc.nomenclatura === savedRecord.nomenclatura) {
              return {
                ...loc,
                marca: savedRecord.marca ?? loc.marca,
                contractNumber: savedRecord.contractNumber ?? loc.contractNumber,
                monthlyRent: savedRecord.monthlyRent ?? loc.monthlyRent,
                costPerM2: savedRecord.costPerM2 ?? loc.costPerM2,
                participationRate: savedRecord.participationRate ?? loc.participationRate,
                renewalDate: savedRecord.renewalDate ?? loc.renewalDate,
                manager: savedRecord.manager ?? loc.manager,
              };
            }
            return loc;
          });
        });
        return next;
      });
    }

    // 2. Persistencia en Cloudflare D1
    try {
      await fetch("/api/contratos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savedRecord),
      });
    } catch (err) {
      console.warn("Error guardando contrato en D1:", err);
    }
  };

  const handleDeleteContract = async (contract: any) => {
    const numContrato = contract.contractNumber;
    if (!numContrato) return;

    if (!window.confirm(`¿Confirmas la eliminación del contrato ${numContrato} (${contract.brand})? Esta acción es permanente.`)) {
      return;
    }

    // 1. Actualización reactiva en React
    setStandaloneContractRecords((prev) =>
      prev.filter((r) => r.contractNumber !== numContrato)
    );

    // 2. Eliminación en Cloudflare D1
    try {
      await fetch(`/api/contratos?contractNumber=${encodeURIComponent(numContrato)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("Error eliminando contrato en D1:", err);
    }
  };

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("nomenclatura");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [contractSearchQuery, setContractSearchQuery] = useState<string>("");
  const [contractGerenciaFilter, setContractGerenciaFilter] = useState<string>("all");
  const [isModuleMenuFixed, setIsModuleMenuFixed] = useState(false);
  const moduleMenuSentinelRef = useRef<HTMLDivElement>(null);

  const [isBoardroomMode, setIsBoardroomMode] = useState<boolean>(false);

  const toggleBoardroomMode = () => {
    setIsBoardroomMode((prev) => {
      const next = !prev;
      if (typeof document !== "undefined") {
        if (next && !document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else if (!next && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isBoardroomMode) {
        setIsBoardroomMode(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && (e.key === "j" || e.key === "J")) || e.key === "F10") {
        e.preventDefault();
        toggleBoardroomMode();
        return;
      }
      if (e.key === "Escape" && isBoardroomMode) {
        setIsBoardroomMode(false);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isBoardroomMode]);

  const currentLocation = locationOptions.find((location) => location.id === locationId) ?? locationOptions[0];
  const totalSessionRecords = Object.values(datasets).reduce((total, dataset) => total + dataset.length, 0);
  const allContractRecords = useMemo(
    () => {
      if (standaloneContractRecords.length) return standaloneContractRecords;
      return Object.values(datasets).flat().filter((r) => Boolean(r.contractSourceSheet || r.contractStage));
    },
    [datasets, standaloneContractRecords],
  );
  const allAggregatedContracts = useMemo(
    () => buildContracts(allContractRecords),
    [allContractRecords],
  );
  const commercialAlerts = useMemo(() => buildCommercialAlerts(datasets.etp ?? []), [datasets]);
  const contractRecords = useMemo(() => {
    if (contractLocationId === "all") return allContractRecords;
    if (standaloneContractRecords.length) {
      return standaloneContractRecords.filter((r) => recordMatchesZone(r, contractLocationId));
    }
    return datasets[contractLocationId] ?? [];
  }, [allContractRecords, contractLocationId, datasets, standaloneContractRecords]);

  const contractLocation = locationOptions.find((location) => location.id === contractLocationId);
  const contractScopeLabel = contractLocationId === "all" ? "Todas las zonas comerciales" : contractLocation?.name ?? "Zona comercial";
  const primaryFilterKeys = primaryFiltersByLocation[locationId] ?? primaryFiltersByLocation.etp;
  const advancedFilterKeys = advancedFiltersByLocation[locationId] ?? [];
  const availableLocalsList = useMemo(() => Object.values(datasets).flat().map((l) => l.nomenclatura).filter(Boolean), [datasets]);



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
    setContractLocationId(value);
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




  const isGlobalContext = (activeModule === "contracts" && contractLocationId === "all") || activeModule === "reports" || (activeModule === "intelligence" && locationId === "all") || (activeModule === "home" && homeView === "global") || activeModule === "advertising";
  const contextRecordCount = activeModule === "advertising" ? advertisingSpaces.length : activeModule === "contracts" ? contractRecords.length : isGlobalContext ? totalSessionRecords : records.length;
  const heroTitle = activeModule === "gsc_dashboard"
    ? "Tablero Ejecutivo de Servicios Comerciales"
    : activeModule === "advertising"
    ? "Inventario y Gestión de Espacios Publicitarios"
    : activeModule === "home"
    ? homeView === "global" ? "Resumen global" : `Resumen de ${currentLocation.shortName}`
    : activeModule === "locals"
      ? `Directorio de ${currentLocation.shortName}`
      : activeModule === "contracts"
        ? "Instrumentos contractuales"
        : activeModule === "intelligence"
          ? intelligenceView === "locals_occupancy" ? `Análisis de ${currentLocation.shortName}` : intelligenceView === "finance_collections" ? "Análisis Financiero y Cobranza" : "Matriz 7 Zonas"
          : "Centro de Reportes";
  const heroDescription = activeModule === "gsc_dashboard"
    ? "Supervisión directiva de contratos comerciales, ocupación física, calificación de marcas y recaudación en el AIFA."
    : activeModule === "advertising"
    ? "Supervisión de pantallas digitales, tótems, videowalls, backlights y soportes publicitarios concesionados en el AIFA."
    : activeModule === "home"
    ? homeView === "global"
      ? "Una visión consolidada de las 7 zonas comerciales, con indicadores separados de inventario, ocupación y gestión contractual."
      : `Panorama ejecutivo de ${currentLocation.name}, con acceso directo a sus locales, contratos y puntos de atención.`
    : activeModule === "locals"
      ? "Consulta el inventario físico y operativo de los espacios sin mezclarlo con el seguimiento detallado de los contratos."
    : activeModule === "contracts"
        ? "Consulta la cartera completa y da seguimiento a cada etapa contractual, desde la preformalización hasta su conclusión."
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
    if (module === "contracts" && activeModule !== "contracts") {
      setContractLocationId("all");
      setContractGerenciaFilter("all");
      setContractSearchQuery("");
      setContractView("summary");
    }
    if (module === "intelligence" && activeModule !== "intelligence") setIntelligenceView("locals_occupancy");
    setActiveModule(module);
    setExpandedId(null);
    setPage(1);
  };

  const handleOpenLocalFromAnywhere = (nomenclature: string, sourceLocationId: string | null) => {
    const rawNom = (nomenclature || "").trim();
    if (!rawNom) return;

    // A. Detectar si corresponde a un espacio publicitario de GEP
    const isAdv =
      sourceLocationId === "gep" ||
      advertisingSpaces.some(
        (a) =>
          (a.codigo_nomenclatura && a.codigo_nomenclatura.trim().toLowerCase() === rawNom.toLowerCase()) ||
          (a.id_unidad && a.id_unidad.trim().toLowerCase() === rawNom.toLowerCase())
      );

    if (isAdv) {
      setAdvertisingSearch(rawNom);
      setAdvertisingSelectedUnitCode(rawNom);
      setActiveModule("advertising");
      return;
    }

    // B. Si es un local comercial (GSC), redirigir al menú 02 Locales
    let targetZone = sourceLocationId && datasets[sourceLocationId] ? sourceLocationId : null;
    if (!targetZone || targetZone === "all") {
      for (const [zId, list] of Object.entries(datasets)) {
        if (list.some((l) => l.nomenclatura.trim().toLowerCase() === rawNom.toLowerCase())) {
          targetZone = zId;
          break;
        }
      }
    }
    if (!targetZone || targetZone === "all") targetZone = "etp";

    // 2. Limpiar filtros previos para evitar que el local quede oculto
    setFilters(initialFilters);
    setMinArea("");
    setMaxArea("");

    // 3. Fijar la zona comercial correspondiente
    setLocationId(targetZone);
    setContractLocationId(targetZone);

    // 4. Configurar la búsqueda exacta
    setSearch(rawNom);

    // 5. Encontrar el registro y dejarlo expandido (seleccionado)
    const foundLocal = (datasets[targetZone] ?? []).find(
      (l) => l.nomenclatura.trim().toLowerCase() === rawNom.toLowerCase()
    );
    if (foundLocal) {
      setExpandedId(foundLocal.id);
    } else {
      setExpandedId(null);
    }

    // 6. Activar directamente el módulo de locales
    setActiveModule("locals");
    setLocalView("directory");
    setPage(1);

    // 7. Scroll automático hacia el directorio de locales
    setTimeout(() => {
      const el = document.getElementById("directorio");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  const handleScopeChange = (value: string) => {
    if (activeModule === "contracts") {
      setContractLocationId(value);
      return;
    }
    if (activeModule === "intelligence") {
      if (value !== "all") changeLocation(value);
      setLocationId(value);
      setContractLocationId(value);
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
      {(currentUser?.role === "gerente_gsc" || currentUser?.role === "subdirectora") && (
        <button
          tabIndex={fixed ? 0 : isModuleMenuFixed ? -1 : undefined}
          className={`gsc-dashboard-tab-btn ${activeModule === "gsc_dashboard" ? "active" : ""}`}
          type="button"
          onClick={() => openModule("gsc_dashboard")}
        >
          <span>⭐</span>Tablero GSC
        </button>
      )}
      <button tabIndex={fixed ? 0 : isModuleMenuFixed ? -1 : undefined} className={activeModule === "home" ? "active" : ""} type="button" onClick={() => openModule("home")}><span>01</span>Inicio</button>
      <button tabIndex={fixed ? 0 : isModuleMenuFixed ? -1 : undefined} className={activeModule === "locals" ? "active" : ""} type="button" onClick={() => openModule("locals")}><span>02</span>Locales</button>
      <button tabIndex={fixed ? 0 : isModuleMenuFixed ? -1 : undefined} className={activeModule === "advertising" ? "active" : ""} type="button" onClick={() => openModule("advertising")}><span>03</span>Publicidad</button>
      <button tabIndex={fixed ? 0 : isModuleMenuFixed ? -1 : undefined} className={activeModule === "contracts" ? "active" : ""} type="button" onClick={() => openModule("contracts")}><span>04</span>Contratos</button>
      <button tabIndex={fixed ? 0 : isModuleMenuFixed ? -1 : undefined} className={activeModule === "reports" ? "active" : ""} type="button" onClick={() => openModule("reports")}><span>05</span>Reportes</button>
      <button tabIndex={fixed ? 0 : isModuleMenuFixed ? -1 : undefined} className={activeModule === "intelligence" ? "active" : ""} type="button" onClick={() => openModule("intelligence")}><span>06</span>Análisis</button>
    </div>
  );

  if (isClientMounted && !currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <main className={isBoardroomMode ? "boardroom-active-main" : ""}>
      {isBoardroomMode && (
        <button
          type="button"
          onClick={toggleBoardroomMode}
          title="Salir de Sala de Juntas (Esc)"
          style={{
            position: "fixed",
            top: "14px",
            right: "16px",
            zIndex: 999999,
            background: "#ac182c",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            fontSize: "12px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          ✕ Salir de Sala de Juntas (Esc)
        </button>
      )}
      {!isBoardroomMode && (
        <header className={`top-shell ${activeModule === "gsc_dashboard" ? "top-shell-gsc" : ""}`}>
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
              <select value={activeModule === "contracts" ? contractLocationId : activeModule === "intelligence" ? locationId : isGlobalContext ? "all" : locationId} onChange={(event) => handleScopeChange(event.target.value)} aria-label="Zona comercial">
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
            {(!currentUser || currentUser.canEdit) && (
              <>
                <button type="button" className="add-local-header-button" onClick={handleOpenAddLocal} title="Registrar nuevo local comercial">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Local</span>
                </button>
                <button type="button" className="add-contract-header-button" onClick={handleOpenAddContract} title="Registrar nuevo contrato comercial">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <span>Contrato</span>
                </button>
              </>
            )}

            {currentUser && (
              <div className="user-menu-wrapper" ref={userMenuRef}>
                <button
                  type="button"
                  className={`user-menu-trigger ${isUserMenuOpen ? "active" : ""}`}
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-expanded={isUserMenuOpen}
                  title="Ver cuenta y detalles de sesión"
                >
                  <span className="user-menu-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <div className="user-menu-label-col">
                    <span className="user-menu-name">{currentUser.shortRole}</span>
                    <span className="user-menu-role">{currentUser.roleLabel}</span>
                  </div>
                  <svg
                    className={`user-menu-arrow ${isUserMenuOpen ? "open" : ""}`}
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {/* Botón directo de salida rápida */}
                <button
                  type="button"
                  className="quick-logout-btn"
                  onClick={handleLogout}
                  title="Cerrar sesión institucional"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Salir</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div ref={moduleMenuSentinelRef} className="module-nav-sentinel">
          <nav className="module-nav" aria-label="Módulos de SIGCO" aria-hidden={isModuleMenuFixed || undefined}>
            {renderModuleLinks()}
          </nav>
        </div>

        {activeModule !== "gsc_dashboard" && (
          <div className="hero" id="inicio">
            <div>
              <span className="section-kicker">Aeropuerto Internacional Felipe Ángeles</span>
              <span className="module-context">{activeModule === "home" ? "Inicio" : activeModule === "locals" ? "Gestión de locales" : activeModule === "advertising" ? "Espacios publicitarios" : activeModule === "contracts" ? "Gestión contractual" : activeModule === "intelligence" ? "Análisis rector" : "Salidas administrativas"}</span>
              <h1>{heroTitle}</h1>
              <p>{heroDescription}</p>
            </div>
            <div className="hero-scope-card">
              <span>Contexto activo</span>
              <strong>{activeModule === "advertising" ? "Inventario Publicitario (GEP)" : activeModule === "contracts" ? contractScopeLabel : isGlobalContext ? "7 zonas comerciales" : currentLocation.name}</strong>
              <small>{activeModule === "advertising" ? `${numberFormat.format(advertisingSpaces.length)} soportes supervisados` : contextRecordCount ? `${numberFormat.format(contextRecordCount)} locales activos` : "Cargando información comercial..."}</small>
            </div>
          </div>
        )}
      </header>
      )}

      {!isBoardroomMode && isModuleMenuFixed && (
        <nav className="module-nav-fixed" aria-label="Módulos de SIGCO">
          <div className="module-nav">{renderModuleLinks(true)}</div>
        </nav>
      )}

      <div className={`dashboard-shell ${isBoardroomMode ? "boardroom-shell-full" : ""} ${activeModule === "gsc_dashboard" ? "gsc-dashboard-shell" : ""}`}>
        {!isBoardroomMode && activeModule !== "reports" && activeModule !== "gsc_dashboard" && activeModule !== "advertising" && (
          <nav className="context-tabs" aria-label="Vistas del módulo">
            <div>
              <span>{activeModule === "home" ? "Panorama" : activeModule === "locals" ? "Locales" : activeModule === "contracts" ? "Contratos" : "Análisis"}</span>
              {activeModule === "home" && <><button className={homeView === "global" ? "active" : ""} type="button" onClick={() => setHomeView("global")}>Resumen global</button><button className={homeView === "zone" ? "active" : ""} type="button" onClick={() => { if (locationId === "all") changeLocation("etp"); setHomeView("zone"); }}>Resumen de zona</button></>}
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
              {activeModule === "intelligence" && (
                <>
                  <button className={intelligenceView === "locals_occupancy" ? "active" : ""} type="button" onClick={() => setIntelligenceView("locals_occupancy")}>📍 Análisis de Locales</button>
                  <button className={intelligenceView === "finance_collections" ? "active" : ""} type="button" onClick={() => setIntelligenceView("finance_collections")}>💰 Análisis Financiero</button>
                  <button className={intelligenceView === "matrix" ? "active" : ""} type="button" onClick={() => setIntelligenceView("matrix")}>🏢 Matriz 7 Zonas</button>
                </>
              )}
            </div>
            <small>{activeModule === "contracts" ? contractScopeLabel : isGlobalContext ? "Todas las zonas" : currentLocation.shortName}</small>
          </nav>
        )}
        {dataWarning && <div className="data-warning" role="status">{dataWarning}</div>}
        {loadingData && <div className="data-loading" role="status"><i /> Actualizando base…</div>}
        <div key={moduleTransitionKey} className="module-content-transition">
        <SafeModuleBoundary moduleName={activeModule} onReset={() => openModule(activeModule)}>
        {activeModule === "gsc_dashboard" ? (
          <GscDashboard
            contracts={allAggregatedContracts}
            allLocales={Object.values(datasets).flat()}
            isBoardroomMode={isBoardroomMode}
            onToggleBoardroomMode={toggleBoardroomMode}
            onNavigateToModule={(mod) => openModule(mod)}
            onSelectContract={(num) => {
              const target = (num || "").trim();
              setContractLocationId("all");
              setContractSearchQuery(target);
              setContractGerenciaFilter("all");
              setContractView("summary");
              setActiveModule("contracts");
            }}
            onSelectLocal={(nom, locId) => {
              handleOpenLocalFromAnywhere(nom, locId ?? null);
            }}
          />
        ) : activeModule === "home" && homeView === "global" ? (
          <GlobalSummary
            datasets={datasets}
            contractRecords={allContractRecords}
            financeRecords={Object.values(datasets).flat()}
            onSelectLocation={(selectedLocationId) => {
              changeLocation(selectedLocationId);
              setActiveModule("locals");
              setLocalView("directory");
            }}
          />
        ) : activeModule === "intelligence" ? (
          <IntelligenceCenter
            key={`${analysisTarget}-${intelligenceView}-${locationId}`}
            datasets={datasets}
            contractRecords={allContractRecords}
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
            onOpenLocal={handleOpenLocalFromAnywhere}
          />
        ) : activeModule === "reports" ? (
          <ReportsCenter
            datasets={datasets}
            contractRecords={allContractRecords}
            onUpload={() => setShowUpload(true)}
          />


        ) : activeModule === "advertising" ? (
          <AdvertisingCenter
            advertisingSpaces={advertisingSpaces}
            contractRecords={allContractRecords}
            initialSearch={advertisingSearch}
            initialUnitCode={advertisingSelectedUnitCode}
            onClearInitialUnit={() => setAdvertisingSelectedUnitCode(null)}
            onSelectContract={(contractNumber) => {
              setContractLocationId("all");
              setContractSearchQuery(contractNumber);
              setContractGerenciaFilter("gep");
              setContractView("summary");
              setActiveModule("contracts");
            }}
          />
        ) : activeModule === "contracts" ? (
          allContractRecords.length ? (
            <ContractCenter
              records={contractRecords}
              locationName={contractScopeLabel}
              selectedLocationId={contractLocationId}
              onSelectLocationId={setContractLocationId}
              mode={contractView}
              initialSearch={contractSearchQuery}
              initialGerencia={contractGerenciaFilter}
              onOpenLocal={handleOpenLocalFromAnywhere}
              onAddContract={!currentUser || currentUser.canEdit ? handleOpenAddContract : undefined}
              onEditContract={!currentUser || currentUser.canEdit ? handleOpenEditContract : undefined}
              onDeleteContract={!currentUser || currentUser.canDelete ? handleDeleteContract : undefined}
            />
          ) : (
            <EmptyLocationState onUpload={() => setShowUpload(true)} />
          )
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
              onOpenCapacityUpdate={() => setShowCapacityModal(true)}
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
                      <button type="button" onClick={handleOpenAddLocal} className="primary-button add-local-action-btn">
                        ➕ Agregar Local
                      </button>
                      <button type="button" onClick={() => window.print()} className="secondary-button">
                        Imprimir
                      </button>
                      <button type="button" onClick={exportCsv} className="secondary-button">
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
                            onOpenContract={(contractNum) => {
                              const target = (contractNum || record.contractNumber || "").trim();
                              if (target) {
                                setContractLocationId("all");
                                setContractSearchQuery(target);
                                setContractGerenciaFilter("all");
                                setContractView("summary");
                                setActiveModule("contracts");
                              } else {
                                setActiveModule("contracts");
                                setContractView("summary");
                              }
                            }}
                            onEdit={() => handleOpenEditLocal(record)}
                            onDelete={() => handleDeleteLocal(record)}
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
        </SafeModuleBoundary>
        </div>
      </div>

      {!isBoardroomMode && (
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
      )}

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
      <LocalFormModal
        isOpen={isLocalModalOpen}
        onClose={() => setIsLocalModalOpen(false)}
        onSave={handleSaveLocal}
        initialRecord={editingLocalRecord}
        defaultLocationId={locationId}
      />
      <ContractFormModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        onSave={handleSaveContract}
        initialRecord={editingContractRecord}
        defaultLocationId={contractLocationId === "all" ? locationId : contractLocationId}
        availableLocals={availableLocalsList}
      />
      {showCapacityModal && (
        <CommercialCapacityModal
          isOpen={showCapacityModal}
          onClose={() => setShowCapacityModal(false)}
          currentCapacity={etpCommercialCapacity}
          passengerTraffic={passengerTraffic}
          onCapacityUpdated={(newCap) => setEtpCommercialCapacity(newCap)}
          onTrafficUpdated={(newTraffic) => setPassengerTraffic(newTraffic)}
        />
      )}

      {/* Modal Ejecutivo de Cuenta Institucional (Capa Raíz - z-index superior absoluto) */}
      {isUserMenuOpen && currentUser && (
        <div
          className="user-account-modal-overlay"
          onClick={() => setIsUserMenuOpen(false)}
          role="dialog"
          aria-label="Detalles de la cuenta"
        >
          <div
            className="user-account-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-account-header">
              <div className="modal-avatar-circle">
                <img
                  src="/brand/aifa-logo-vertical-dark.png"
                  alt="AIFA"
                  style={{ maxHeight: "28px", objectFit: "contain" }}
                />
              </div>
              <div className="modal-user-headings">
                <span className="modal-institution-tag">AIFA · SERVICIOS COMERCIALES</span>
                <strong className="modal-user-fullname">{currentUser.fullName}</strong>
                <span className="modal-role-pill">{currentUser.roleLabel}</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsUserMenuOpen(false)}
                title="Cerrar ventana"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="modal-account-divider" />

            <div className="modal-account-body">
              <div className="modal-info-item">
                <span className="modal-info-label">Usuario Conectado</span>
                <span className="modal-info-val">{currentUser.username}</span>
              </div>
              <div className="modal-info-item">
                <span className="modal-info-label">Nivel de Privilegios</span>
                <span className="modal-info-val privilege-highlight">
                  {currentUser.role === "subdirectora"
                    ? "Superadministrador (Acceso Total · Edición, Alta y Baja)"
                    : currentUser.role === "auxiliar"
                    ? "Operativo (Edición y Alta de Contratos/Locales)"
                    : "Consulta (Solo Lectura · Sin Modificaciones)"}
                </span>
              </div>
              <div className="modal-info-item">
                <span className="modal-info-label">Área de Adscripción</span>
                <span className="modal-info-val privilege-highlight">
                  Subdirección de Servicios Comerciales · AIFA
                </span>
              </div>
              <div className="modal-info-item">
                <span className="modal-info-label">Herramienta Ejecutiva</span>
                <button
                  type="button"
                  className="modal-boardroom-action-btn"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    toggleBoardroomMode();
                  }}
                  title="Alternar Modo Sala de Juntas / Pantalla Completa (Atajo: Alt + J)"
                >
                  <span>📺 Activar Modo Sala de Juntas</span>
                  <kbd className="modal-kbd">Alt + J</kbd>
                </button>
              </div>
            </div>

            <div className="modal-account-divider" />

            <div className="modal-account-footer">
              <button
                type="button"
                className="modal-logout-action-btn"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  handleLogout();
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Finalizar Sesión Institucional
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botón flotante discreto de Sala de Juntas en esquina inferior */}
      {!isBoardroomMode && (
        <button
          type="button"
          className="floating-boardroom-pill"
          onClick={toggleBoardroomMode}
          title="Activar Modo Sala de Juntas (Atajo: Alt + J)"
          aria-label="Modo Sala de Juntas"
        >
          <span>📺 Sala de Juntas</span>
          <kbd>Alt + J</kbd>
        </button>
      )}
    </main>
  );
}

function RecordRows({
  record,
  expanded,
  onToggle,
  onOpenContract,
  onEdit,
  onDelete,
}: {
  record: LocalRecord;
  expanded: boolean;
  onToggle: () => void;
  onOpenContract: (contractNumber?: string | null) => void;
  onEdit: () => void;
  onDelete: () => void;
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
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <button
              type="button"
              className="table-action-btn edit-local-btn"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="Editar datos del local"
            >
              ✏️ Editar
            </button>
            <button
              type="button"
              className="delete-local-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Eliminar local"
            >
              🗑️
            </button>
            <button
              type="button"
              className="detail-button"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-label={`${expanded ? "Ocultar" : "Mostrar"} detalle de ${record.nomenclatura}`}
            >
              {expanded ? "−" : "+"}
            </button>
          </div>
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
              <div><span>Contrato</span><strong>{record.contractNumber || "Sin número"}</strong>{(record.contractNumber || record.contractPending) && <button type="button" className="inline-module-link" onClick={() => onOpenContract(record.contractNumber)}>Ver en contratos →</button>}</div>
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
