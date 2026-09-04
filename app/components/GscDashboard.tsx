"use client";

import { useEffect, useMemo, useState } from "react";
import { locationOptions, type LocalRecord } from "../types";
import {
  calculateTenantScore,
  recordMatchesZone,
  TenantScorecardDashboard,
  type TenantScore,
  type ContractAggregate,
} from "./ContractCenter";

interface GscDashboardProps {
  contracts: ContractAggregate[];
  allLocales: LocalRecord[];
  isBoardroomMode?: boolean;
  onToggleBoardroomMode?: () => void;
  onNavigateToModule?: (module: "home" | "locals" | "contracts" | "finances" | "reports" | "intelligence") => void;
  onSelectContract?: (contractNumber: string) => void;
  onSelectLocal?: (nomenclatura: string, locationId?: string) => void;
}

const currencyFormat = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat("es-MX");

// Colores institucionales oficiales de estatus (idénticos a los menús de SIGCO)
const statusColors: Record<string, string> = {
  "EN FUNCIONAMIENTO": "#00886f",        // Verde esmeralda institucional
  DISPONIBLE: "#f28c28",                  // Naranja institucional
  "EN PROCESO DE ASIGNACION": "#39a9db",  // Azul institucional
  FORMALIZADO: "#8a633f",                 // Marrón / café institucional
  "EN ADAPTACION": "#f2c94c",             // Amarillo dorado institucional
};

function getStatusColor(status: string | null | undefined): string {
  if (!status) return statusColors.DISPONIBLE;
  const upper = status.trim().toUpperCase();
  if (statusColors[upper]) return statusColors[upper];
  if (upper.includes("FUNCION") || upper.includes("OPER")) return statusColors["EN FUNCIONAMIENTO"];
  if (upper.includes("ADAPT") || upper.includes("OBRA")) return statusColors["EN ADAPTACION"];
  if (upper.includes("ASIGNAC") || upper.includes("PROCESO")) return statusColors["EN PROCESO DE ASIGNACION"];
  if (upper.includes("FORMALIZ")) return statusColors["FORMALIZADO"];
  if (upper.includes("DISP")) return statusColors["DISPONIBLE"];
  return "#596975";
}

function CircularGauge({
  percentage,
  color = "#ac182c",
  trackColor = "#dfe4e7",
  size = 72,
  strokeWidth = 7,
}: {
  percentage: number;
  color?: string;
  trackColor?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="gsc-gauge-svg" aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="gsc-gauge-text"
        fill="#09212e"
        fontSize="13px"
        fontWeight="700"
      >
        {Math.round(percentage)}%
      </text>
    </svg>
  );
}

export default function GscDashboard({
  contracts,
  allLocales,
  isBoardroomMode: propBoardroomMode,
  onToggleBoardroomMode,
  onNavigateToModule,
  onSelectContract,
  onSelectLocal,
}: GscDashboardProps) {
  // Pestaña activa dentro del tablero: Resumen general, Directorio de Locales, Padrón Contractual o Scoring de Marcas
  const [dashboardTab, setDashboardTab] = useState<"summary" | "locals" | "contracts" | "scoring">("summary");

  // Filtros de segmentación ejecutiva
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedTier, setSelectedTier] = useState<string>("all");

  // Búsqueda y paginación en vistas de detalle
  const [localSearch, setLocalSearch] = useState<string>("");
  const [localStatusFilter, setLocalStatusFilter] = useState<string>("all");
  const [localPage, setLocalPage] = useState<number>(1);
  const [contractSearch, setContractSearch] = useState<string>("");
  const [contractPage, setContractPage] = useState<number>(1);

  // Modal / Drawer para inspeccionar detalle del gestor
  const [selectedGestorModal, setSelectedGestorModal] = useState<any | null>(null);
  const [gestorSearch, setGestorSearch] = useState<string>("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedGestorModal) {
        setSelectedGestorModal(null);
        setGestorSearch("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedGestorModal]);

  const [internalBoardroom, setInternalBoardroom] = useState<boolean>(false);
  const isBoardroom = propBoardroomMode !== undefined ? propBoardroomMode : internalBoardroom;

  const handleToggleBoardroom = () => {
    if (onToggleBoardroomMode) {
      onToggleBoardroomMode();
    } else {
      setInternalBoardroom(!internalBoardroom);
    }
  };

  // 1. Filtrar contratos de GSC: Estrictamente los contratos comerciales (excluye GEP / Publicitarios)
  const gscContracts = useMemo(() => {
    return contracts.filter((c) => {
      const g = (c.gerencia || "").toUpperCase();
      const s = (c.sourceSheet || "").toUpperCase();
      const n = (c.contractNumber || "").toUpperCase();
      if (g.includes("GEP") || g.includes("PUBLICIT") || s.includes("GEP") || s.includes("PUBLICIT") || n.includes("GEP")) {
        return false;
      }
      return true;
    });
  }, [contracts]);

  // 2. Calificación y Score de cada contrato GSC
  const scoredContracts = useMemo(() => {
    return gscContracts.map((contract) => {
      const scoreData: TenantScore = calculateTenantScore(contract);
      return {
        ...contract,
        calculatedScore: {
          ...scoreData,
          tier: (scoreData.rating || "B") as "A+" | "A" | "B" | "C" | "D",
          points: scoreData.score || 0,
        },
      };
    });
  }, [gscContracts]);

  // 3. Filtrado por segmentadores (Slicers ejecutivos)
  const filteredContracts = useMemo(() => {
    return scoredContracts.filter((c) => {
      if (selectedZone !== "all") {
        const zoneMatch = (c.locationId || "").toLowerCase() === selectedZone.toLowerCase();
        const locMatch = c.locals.some((loc) => recordMatchesZone(loc, selectedZone));
        if (!zoneMatch && !locMatch) return false;
      }
      if (selectedStatus !== "all") {
        const statusNorm = (c.operationalStatus || c.contractStatus || "").toLowerCase();
        if (selectedStatus === "operando" && !statusNorm.includes("oper") && !statusNorm.includes("func")) return false;
        if (selectedStatus === "obra" && !statusNorm.includes("adapt") && !statusNorm.includes("obra")) return false;
        if (selectedStatus === "formalizacion" && !statusNorm.includes("form") && !statusNorm.includes("asig") && !statusNorm.includes("proceso")) return false;
        if (selectedStatus === "disponible" && !statusNorm.includes("disp")) return false;
      }
      if (selectedTier !== "all") {
        if (c.calculatedScore.tier !== selectedTier) return false;
      }
      return true;
    });
  }, [scoredContracts, selectedZone, selectedStatus, selectedTier]);

  // 4. Locales Físicos Comerciales (excluye GEP / Publicitarios)
  const commercialLocales = useMemo(() => {
    return allLocales.filter((l) => {
      const g = (l.gerencia || "").toUpperCase();
      const n = (l.nomenclatura || "").toUpperCase();
      if (g.includes("GEP") || g.includes("PUBLICIT") || n.startsWith("EP-")) return false;
      return true;
    });
  }, [allLocales]);

  // Locales dinámicos según la zona comercial elegida en los slicers
  const zoneLocales = useMemo(() => {
    if (selectedZone === "all") return commercialLocales;
    return commercialLocales.filter((l) => recordMatchesZone(l, selectedZone));
  }, [commercialLocales, selectedZone]);

  // 5. Mapeo de Nomenclatura -> Contrato Comercial
  const localContractMap = useMemo(() => {
    const map = new Map<string, { contract: ContractAggregate; brand: string }>();
    gscContracts.forEach((contract) => {
      contract.locals.forEach((loc) => {
        if (loc.nomenclatura && loc.nomenclatura !== "Sin local asignado") {
          const key = loc.nomenclatura.trim().toUpperCase();
          if (!map.has(key)) {
            map.set(key, {
              contract,
              brand: contract.brand || contract.razonSocial || "Arrendatario Comercial",
            });
          }
        }
      });
    });
    return map;
  }, [gscContracts]);

  // Nomenclaturas únicas con contrato vigente
  const rentedNomenclatures = useMemo(() => {
    return new Set(localContractMap.keys());
  }, [localContractMap]);

  // 6. Indicadores Macro de Locales dinámicos según la zona seleccionada
  const operatingLocalsCount = useMemo(() => {
    return zoneLocales.filter((l) => {
      const s = (l.estatus || "").toUpperCase();
      return s.includes("FUNCION") || s.includes("OPER");
    }).length;
  }, [zoneLocales]);

  const obraLocalsList = useMemo(() => {
    return zoneLocales.filter((l) => {
      const s = (l.estatus || "").toUpperCase();
      return s.includes("ADAPT") || s.includes("OBRA");
    });
  }, [zoneLocales]);

  const formalizacionLocalsList = useMemo(() => {
    return zoneLocales.filter((l) => {
      const s = (l.estatus || "").toUpperCase();
      return s.includes("ASIGNAC") || s.includes("FORMALIZ") || s.includes("PROCESO");
    });
  }, [zoneLocales]);

  const availableLocalsCount = useMemo(() => {
    return zoneLocales.filter((l) => {
      const s = (l.estatus || "").toUpperCase();
      return s.includes("DISP");
    }).length;
  }, [zoneLocales]);

  const rentedLocalesCount = useMemo(() => {
    return zoneLocales.filter((l) => {
      const isMapped = rentedNomenclatures.has(l.nomenclatura.trim().toUpperCase());
      const s = (l.estatus || "").toUpperCase();
      return isMapped || s.includes("FUNCION") || s.includes("OPER") || s.includes("ADAPT") || s.includes("FORMALIZ");
    }).length;
  }, [zoneLocales, rentedNomenclatures]);

  // Metraje comercial total arrendado
  const totalRentedAreaM2 = useMemo(() => {
    return zoneLocales
      .filter((l) => {
        const s = (l.estatus || "").toUpperCase();
        return rentedNomenclatures.has(l.nomenclatura.trim().toUpperCase()) || s.includes("FUNCION") || s.includes("OPER");
      })
      .reduce((sum, l) => sum + (Number(l.metraje) || 0), 0);
  }, [zoneLocales, rentedNomenclatures]);

  const totalCommercialAreaM2 = useMemo(() => {
    return zoneLocales.reduce((sum, l) => sum + (Number(l.metraje) || 0), 0);
  }, [zoneLocales]);

  // Tasa de ocupación comercial física de la zona elegida
  const occupancyRate = zoneLocales.length > 0
    ? (rentedLocalesCount / zoneLocales.length) * 100
    : 0;

  // 7. Cálculos de KPIs Macro de Contratos
  const totalContracts = filteredContracts.length;
  const totalMonthlyRevenue = filteredContracts.reduce((sum, c) => sum + (c.monthlyRent || 0), 0);

  // Calificación de Marcas (Scores)
  const averageScore =
    filteredContracts.length > 0
      ? Math.round(filteredContracts.reduce((acc, c) => acc + c.calculatedScore.points, 0) / filteredContracts.length)
      : 0;

  const tierCounts = useMemo(() => {
    const counts = { "A+": 0, A: 0, B: 0, C: 0 };
    filteredContracts.forEach((c) => {
      const t = c.calculatedScore.tier;
      if (t === "A+") counts["A+"]++;
      else if (t === "A") counts.A++;
      else if (t === "B") counts.B++;
      else counts.C++;
    });
    return counts;
  }, [filteredContracts]);

  // Salud Documental
  const withValidGuarantee = filteredContracts.filter((c) => (c.guaranteeStatus || "").toUpperCase().includes("VIGENTE")).length;
  const withValidPolicy = filteredContracts.filter((c) => (c.liabilityPolicyStatus || "").toUpperCase().includes("VIGENTE")).length;
  const withApprovedProject = filteredContracts.filter((c) => (c.projectStatus || "").toUpperCase().includes("APROB")).length;
  const regulatoryHealthPct = totalContracts > 0 ? (withValidGuarantee / totalContracts) * 100 : 0;
  const policyHealthPct = totalContracts > 0 ? (withValidPolicy / totalContracts) * 100 : 0;
  const projectHealthPct = totalContracts > 0 ? (withApprovedProject / totalContracts) * 100 : 0;

  // Vencimientos Críticos (< 90 días)
  const criticalExpirations = useMemo(() => {
    return filteredContracts.filter((c) => c.daysRemaining !== null && c.daysRemaining <= 90);
  }, [filteredContracts]);

  // Top 6 Marcas Comerciales por Ingreso
  const topBrands = useMemo(() => {
    const sorted = [...filteredContracts]
      .filter((c) => (c.monthlyRent || 0) > 0)
      .sort((a, b) => (b.monthlyRent || 0) - (a.monthlyRent || 0))
      .slice(0, 6);
    return sorted;
  }, [filteredContracts]);

  // Distribución de Locales por Nivel o Tipo de Espacio (Dinámica con la zona elegida)
  const zoneDistribution = useMemo(() => {
    const isEtpOrAll = selectedZone === "all" || selectedZone === "etp";

    if (isEtpOrAll) {
      const niveles: Record<string, { total: number; operando: number; obra: number; formalizacion: number; disponible: number }> = {
        "Nivel 1 (Salidas 10.50)": { total: 0, operando: 0, obra: 0, formalizacion: 0, disponible: 0 },
        "Nivel 0 (Llegadas 4.50)": { total: 0, operando: 0, obra: 0, formalizacion: 0, disponible: 0 },
        "Mezzanine / Otros": { total: 0, operando: 0, obra: 0, formalizacion: 0, disponible: 0 },
      };

      const baseLocales = selectedZone === "etp" ? zoneLocales : commercialLocales.filter((l) => recordMatchesZone(l, "etp"));

      baseLocales.forEach((l) => {
        const nivStr = String(l.nivel || "").toLowerCase();
        let cat = "Mezzanine / Otros";
        if (nivStr.includes("1") || nivStr.includes("salida") || nivStr.includes("10")) {
          cat = "Nivel 1 (Salidas 10.50)";
        } else if (nivStr.includes("0") || nivStr.includes("llegada") || nivStr.includes("4")) {
          cat = "Nivel 0 (Llegadas 4.50)";
        }

        niveles[cat].total++;
        const s = (l.estatus || "").toUpperCase();
        if (s.includes("FUNCION") || s.includes("OPER")) niveles[cat].operando++;
        else if (s.includes("ADAPT") || s.includes("OBRA")) niveles[cat].obra++;
        else if (s.includes("ASIGNAC") || s.includes("FORMALIZ") || s.includes("PROCESO")) niveles[cat].formalizacion++;
        else if (s.includes("DISP")) niveles[cat].disponible++;
        else niveles[cat].operando++;
      });

      return { isEtp: true, data: niveles };
    }

    const groups: Record<string, { total: number; operando: number; obra: number; formalizacion: number; disponible: number }> = {};
    zoneLocales.forEach((l) => {
      const key = (l.areaComercial || l.area || "Espacio Comercial").trim() || "Espacio Comercial";
      if (!groups[key]) {
        groups[key] = { total: 0, operando: 0, obra: 0, formalizacion: 0, disponible: 0 };
      }
      groups[key].total++;
      const s = (l.estatus || "").toUpperCase();
      if (s.includes("FUNCION") || s.includes("OPER")) groups[key].operando++;
      else if (s.includes("ADAPT") || s.includes("OBRA")) groups[key].obra++;
      else if (s.includes("ASIGNAC") || s.includes("FORMALIZ") || s.includes("PROCESO")) groups[key].formalizacion++;
      else if (s.includes("DISP")) groups[key].disponible++;
      else groups[key].operando++;
    });

    return { isEtp: false, data: groups };
  }, [selectedZone, zoneLocales, commercialLocales]);

  // Modalidad de Renta (Fija vs Variable con %)
  const rentModalities = useMemo(() => {
    let soloFija = 0;
    let fijaMasVariable = 0;
    filteredContracts.forEach((c) => {
      if (c.participationRate && c.participationRate > 0) {
        fijaMasVariable++;
      } else {
        soloFija++;
      }
    });
    return { soloFija, fijaMasVariable };
  }, [filteredContracts]);

  // Gestores Responsables y su Carga con Métricas Profundas de Supervisión
  const detailedManagers = useMemo(() => {
    const map = new Map<string, {
      manager: string;
      totalContracts: number;
      totalMonthlyRent: number;
      fianzasVigentes: number;
      fianzasFaltantes: number;
      polizasVigentes: number;
      polizasFaltantes: number;
      criticalExpirations: number;
      avgScore: number;
      tierCounts: Record<string, number>;
      brands: string[];
      contracts: typeof filteredContracts;
    }>();

    filteredContracts.forEach((c) => {
      let m = (c.manager || "").trim();
      if (!m || m === "#ERROR_#N/A" || m === "Sin Asignar") m = "Sin Asignar";
      else m = m.toUpperCase();

      let stat = map.get(m);
      if (!stat) {
        stat = {
          manager: m,
          totalContracts: 0,
          totalMonthlyRent: 0,
          fianzasVigentes: 0,
          fianzasFaltantes: 0,
          polizasVigentes: 0,
          polizasFaltantes: 0,
          criticalExpirations: 0,
          avgScore: 0,
          tierCounts: { "A+": 0, A: 0, B: 0, C: 0 },
          brands: [],
          contracts: [],
        };
        map.set(m, stat);
      }

      stat.totalContracts++;
      stat.totalMonthlyRent += c.monthlyRent || 0;
      stat.contracts.push(c);

      const fianzaNorm = (c.guaranteeStatus || "").toUpperCase();
      if (fianzaNorm.includes("VIGENT")) stat.fianzasVigentes++;
      else stat.fianzasFaltantes++;

      const polizaNorm = (c.liabilityPolicyStatus || "").toUpperCase();
      if (polizaNorm.includes("VIGENT")) stat.polizasVigentes++;
      else stat.polizasFaltantes++;

      if (c.daysRemaining !== null && c.daysRemaining !== undefined && c.daysRemaining <= 90 && c.daysRemaining >= 0) {
        stat.criticalExpirations++;
      }

      const score = c.calculatedScore?.points || 0;
      stat.avgScore += score;
      const tier = c.calculatedScore?.tier || "B";
      if (stat.tierCounts[tier] !== undefined) stat.tierCounts[tier]++;

      const bName = c.brand || c.razonSocial || c.contractNumber;
      if (bName && !stat.brands.includes(bName)) stat.brands.push(bName);
    });

    return Array.from(map.values())
      .map((st) => ({
        ...st,
        avgScore: st.totalContracts > 0 ? Math.round(st.avgScore / st.totalContracts) : 0,
        fianzasPct: st.totalContracts > 0 ? Math.round((st.fianzasVigentes / st.totalContracts) * 100) : 0,
        polizasPct: st.totalContracts > 0 ? Math.round((st.polizasVigentes / st.totalContracts) * 100) : 0,
      }))
      .sort((a, b) => b.totalContracts - a.totalContracts);
  }, [filteredContracts]);

  // 8. Filtrado de la vista detallada de Locales
  const filteredLocalsList = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    return zoneLocales.filter((local) => {
      const isRented = rentedNomenclatures.has(local.nomenclatura.trim().toUpperCase());
      const s = (local.estatus || "").toUpperCase();

      // Filtro por estatus de local
      if (localStatusFilter === "rented" && !isRented) return false;
      if (localStatusFilter === "operating" && !s.includes("FUNCION") && !s.includes("OPER")) return false;
      if (localStatusFilter === "available" && !s.includes("DISP")) return false;
      if (localStatusFilter === "obra" && !s.includes("ADAPT") && !s.includes("OBRA")) return false;
      if (localStatusFilter === "formalizacion" && !s.includes("FORMALIZ") && !s.includes("ASIGNAC") && !s.includes("PROCESO")) return false;

      // Buscador
      if (q) {
        const nom = (local.nomenclatura || "").toLowerCase();
        const mar = (local.marca || "").toLowerCase();
        const contractInfo = localContractMap.get(local.nomenclatura.trim().toUpperCase());
        const conNum = (contractInfo?.contract.contractNumber || local.contractNumber || "").toLowerCase();
        const conBrand = (contractInfo?.brand || "").toLowerCase();
        if (!nom.includes(q) && !mar.includes(q) && !conNum.includes(q) && !conBrand.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [zoneLocales, localSearch, localStatusFilter, rentedNomenclatures, localContractMap]);

  // 9. Filtrado de la vista detallada de Contratos
  const filteredDetailedContracts = useMemo(() => {
    const q = contractSearch.trim().toLowerCase();
    return filteredContracts.filter((c) => {
      if (!q) return true;
      const num = (c.contractNumber || "").toLowerCase();
      const mar = (c.brand || "").toLowerCase();
      const raz = (c.razonSocial || "").toLowerCase();
      const loc = c.locals.map((l) => l.nomenclatura.toLowerCase()).join(" ");
      return num.includes(q) || mar.includes(q) || raz.includes(q) || loc.includes(q);
    });
  }, [filteredContracts, contractSearch]);

  const itemsPerPage = 25;
  const paginatedLocals = useMemo(() => {
    const start = (localPage - 1) * itemsPerPage;
    return filteredLocalsList.slice(start, start + itemsPerPage);
  }, [filteredLocalsList, localPage]);

  const totalLocalPages = Math.ceil(filteredLocalsList.length / itemsPerPage) || 1;

  return (
    <div className={`gsc-dashboard-root ${isBoardroom ? "boardroom-fullscreen" : ""}`}>
      {/* 1. BARRA SUPERIOR DE CONTROL Y TÍTULO INSTITUCIONAL */}
      <header className="gsc-dash-header" aria-label="Cabecera del Tablero GSC">
        <div className="gsc-dash-title-group">
          <span className="gsc-dash-badge">
            <span className="badge-dot" /> DIRECCIÓN COMERCIAL Y DE SERVICIOS · AIFA
          </span>
          <h1>Tablero Directivo de Servicios Comerciales (GSC)</h1>
          <p>
            Monitoreo en tiempo real de ocupación de locales en las 7 zonas comerciales, cartera contractual de 246 marcas, salud documental y facturación.
          </p>
        </div>

      </header>

      {/* 2. PESTAÑAS PRINCIPALES DEL TABLERO */}
      <nav className="gsc-tabs-selector" aria-label="Vistas del Tablero">
        <button
          type="button"
          className={`gsc-tab-btn ${dashboardTab === "summary" ? "active" : ""}`}
          onClick={() => setDashboardTab("summary")}
        >
          📊 Resumen Ejecutivo
        </button>
        <button
          type="button"
          className={`gsc-tab-btn ${dashboardTab === "locals" ? "active" : ""}`}
          onClick={() => setDashboardTab("locals")}
        >
          🏢 Locales Físicos ({zoneLocales.length})
        </button>
        <button
          type="button"
          className={`gsc-tab-btn ${dashboardTab === "contracts" ? "active" : ""}`}
          onClick={() => setDashboardTab("contracts")}
        >
          📑 Cartera Contractual GSC ({gscContracts.length})
        </button>
        <button
          type="button"
          className={`gsc-tab-btn ${dashboardTab === "scoring" ? "active" : ""}`}
          onClick={() => setDashboardTab("scoring")}
        >
          ⭐ Scoring y Cumplimiento de Marcas ({gscContracts.length})
        </button>
      </nav>

      {/* 3. SLICERS / SEGMENTADORES RÁPIDOS DE FILTRO (TODAS LAS 7 ZONAS Y 4 ESTATUS) */}
      <nav className="gsc-slicers-bar" aria-label="Filtros del Tablero">
        {/* SLICER 1: ZONAS COMERCIALES (LAS 7 OFICIALES + TODAS) */}
        <div className="slicer-group">
          <span className="slicer-label">Zona Comercial:</span>
          <div className="slicer-pills">
            <button
              type="button"
              className={selectedZone === "all" ? "active" : ""}
              onClick={() => { setSelectedZone("all"); setLocalPage(1); }}
            >
              Todas ({gscContracts.length} contratos)
            </button>
            {locationOptions.map((zone) => {
              const count = gscContracts.filter((c) => {
                const zMatch = (c.locationId || "").toLowerCase() === zone.id.toLowerCase();
                const locMatch = c.locals.some((loc) => recordMatchesZone(loc, zone.id));
                return zMatch || locMatch;
              }).length;
              return (
                <button
                  key={zone.id}
                  type="button"
                  className={selectedZone === zone.id ? "active" : ""}
                  onClick={() => { setSelectedZone(zone.id); setLocalPage(1); }}
                >
                  {zone.shortName} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* SLICER 2: LOS 4 ESTATUS OFICIALES */}
        <div className="slicer-group">
          <span className="slicer-label">Estatus de Locales:</span>
          <div className="slicer-pills">
            <button
              type="button"
              className={selectedStatus === "all" ? "active" : ""}
              onClick={() => setSelectedStatus("all")}
            >
              Todos ({zoneLocales.length})
            </button>
            <button
              type="button"
              className={selectedStatus === "operando" ? "active" : ""}
              onClick={() => setSelectedStatus("operando")}
            >
              <i className="status-dot" style={{ background: statusColors["EN FUNCIONAMIENTO"] }} /> En Funcionamiento ({operatingLocalsCount})
            </button>
            <button
              type="button"
              className={selectedStatus === "obra" ? "active" : ""}
              onClick={() => setSelectedStatus("obra")}
            >
              <i className="status-dot" style={{ background: statusColors["EN ADAPTACION"] }} /> En Adaptación ({obraLocalsList.length})
            </button>
            <button
              type="button"
              className={selectedStatus === "formalizacion" ? "active" : ""}
              onClick={() => setSelectedStatus("formalizacion")}
            >
              <i className="status-dot" style={{ background: statusColors["EN PROCESO DE ASIGNACION"] }} /> En Formalización ({formalizacionLocalsList.length})
            </button>
            <button
              type="button"
              className={selectedStatus === "disponible" ? "active" : ""}
              onClick={() => setSelectedStatus("disponible")}
            >
              <i className="status-dot" style={{ background: statusColors.DISPONIBLE }} /> Disponibles ({availableLocalsCount})
            </button>
          </div>
        </div>

        {/* SLICER 3: CALIFICACIÓN / SCORE */}
        <div className="slicer-group">
          <span className="slicer-label">Calificación de Marcas:</span>
          <div className="slicer-pills tier-pills">
            <button
              type="button"
              className={selectedTier === "all" ? "active" : ""}
              onClick={() => setSelectedTier("all")}
            >
              Todos ({filteredContracts.length})
            </button>
            <button
              type="button"
              className={`tier-pill-a-plus ${selectedTier === "A+" ? "active" : ""}`}
              onClick={() => setSelectedTier("A+")}
            >
              A+ ({tierCounts["A+"]})
            </button>
            <button
              type="button"
              className={`tier-pill-a ${selectedTier === "A" ? "active" : ""}`}
              onClick={() => setSelectedTier("A")}
            >
              A ({tierCounts.A})
            </button>
            <button
              type="button"
              className={`tier-pill-b ${selectedTier === "B" ? "active" : ""}`}
              onClick={() => setSelectedTier("B")}
            >
              B ({tierCounts.B})
            </button>
            <button
              type="button"
              className={`tier-pill-c ${selectedTier === "C" ? "active" : ""}`}
              onClick={() => setSelectedTier("C")}
            >
              C ({tierCounts.C})
            </button>
          </div>
        </div>
      </nav>

      {/* 4. ENCABEZADO DE TARJETAS KPI CON MICRO-ANILLOS CIRCULARES INSTITUCIONALES */}
      <section className="gsc-kpi-grid" aria-label="Indicadores Macro">
        {/* KPI 1: Contratos Comerciales GSC */}
        <article className="gsc-kpi-card hero-kpi" onClick={() => setDashboardTab("contracts")} style={{ cursor: "pointer" }} title="Ver cartera de contratos">
          <div className="kpi-content">
            <span className="kpi-tag">Portafolio GSC</span>
            <strong className="kpi-main-number">{numberFormat.format(totalContracts)}</strong>
            <span className="kpi-subtext">Contratos Comerciales en {selectedZone === "all" ? "Consolidado" : (locationOptions.find(z => z.id === selectedZone)?.shortName || "Zona")}</span>
          </div>
          <div className="kpi-icon-bubble" aria-hidden="true">
            📂
          </div>
        </article>

        {/* KPI 2: Locales Comerciales Arrendados vs Inventario (Dinámico según la Zona elegida) */}
        <article className="gsc-kpi-card" onClick={() => setDashboardTab("locals")} style={{ cursor: "pointer" }} title="Ver directorio de locales comerciales">
          <div className="kpi-gauge-wrap">
            <CircularGauge percentage={occupancyRate} color={statusColors["EN FUNCIONAMIENTO"]} trackColor="#e6f4f1" size={74} />
          </div>
          <div className="kpi-content">
            <span className="kpi-tag">Locales Arrendados {selectedZone !== "all" ? `· ${locationOptions.find(z => z.id === selectedZone)?.shortName || ""}` : ""}</span>
            <strong className="kpi-main-number">
              {numberFormat.format(rentedLocalesCount)} <small className="kpi-denom">/ {zoneLocales.length} espacios</small>
            </strong>
            <span className="kpi-subtext">
              {operatingLocalsCount} en operación · {obraLocalsList.length} en obra · {availableLocalsCount} disponibles
            </span>
          </div>
        </article>

        {/* KPI 3: Calificación Promedio de Marcas */}
        <article className="gsc-kpi-card" onClick={() => setDashboardTab("scoring")} style={{ cursor: "pointer" }} title="Ver Dashboard de Scoring de Marcas">
          <div className="kpi-gauge-wrap">
            <CircularGauge percentage={averageScore} color="#ac182c" trackColor="#fdf2f4" size={74} />
          </div>
          <div className="kpi-content">
            <span className="kpi-tag">Calificación Promedio</span>
            <strong className="kpi-main-number">{averageScore} / 100</strong>
            <span className="kpi-subtext">
              Tier {averageScore >= 85 ? "A+ (Excelente)" : averageScore >= 70 ? "A (Bueno)" : "B (Alerta)"} · Ver Scoring →
            </span>
          </div>
        </article>

        {/* KPI 4: Facturación Mensual Consolidada */}
        <article className="gsc-kpi-card highlight-revenue">
          <div className="kpi-content">
            <span className="kpi-tag">Facturación Mensual</span>
            <strong className="kpi-main-number">{currencyFormat.format(totalMonthlyRevenue)}</strong>
            <span className="kpi-subtext">
              Contraprestación fija contratada + variable
            </span>
          </div>
          <div className="kpi-icon-bubble" aria-hidden="true">
            💵
          </div>
        </article>
      </section>

      {/* =========================================================================
          CONTENIDO SEGÚN LA PESTAÑA SELECCIONADA
          ========================================================================= */}

      {/* VISTA 1: RESUMEN GENERAL, ALERTAS, GRÁFICAS Y SUPERVISIÓN DE GESTORES */}
      {dashboardTab === "summary" && (
        <div className="gsc-summary-tab-wrapper" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="gsc-dash-body-layout">
          {/* COLUMNA LATERAL: TARJETAS DE ALERTA Y DIAGNÓSTICO RÁPIDO */}
          <aside className="gsc-side-alerts-col" aria-label="Alertas Operativas">
            {/* Tarjeta Guinda: Vencimientos Críticos */}
            <div className="side-alert-card card-guinda">
              <div className="side-alert-header">
                <span className="alert-badge">Vigencia Crítica</span>
                <span className="alert-count">{criticalExpirations.length}</span>
              </div>
              <h3>Vencimientos &lt; 90 Días</h3>
              <p>Contratos próximos a concluir que requieren prórroga, renegociación o entrega de local.</p>
              <div className="alert-items-list">
                {criticalExpirations.slice(0, 4).map((c) => (
                  <div
                    key={c.contractNumber}
                    className="alert-item-mini"
                    onClick={() => onSelectContract && c.contractNumber && onSelectContract(c.contractNumber)}
                  >
                    <strong>{c.brand || c.contractNumber}</strong>
                    <span>{c.daysRemaining !== null && c.daysRemaining !== undefined ? `${c.daysRemaining}d` : "Vence pronto"}</span>
                  </div>
                ))}
                {criticalExpirations.length > 4 && (
                  <small className="more-indicator">+{criticalExpirations.length - 4} contratos adicionales</small>
                )}
              </div>
              <button
                type="button"
                className="side-card-action-btn"
                onClick={() => setDashboardTab("contracts")}
              >
                Ver todos en contratos →
              </button>
            </div>

            {/* Tarjeta Ámbar: Locales en Obra / Adaptación */}
            <div className="side-alert-card card-amber">
              <div className="side-alert-header">
                <span className="alert-badge">Adecuación Física</span>
                <span className="alert-count">{obraLocalsList.length}</span>
              </div>
              <h3>Locales en Adaptación</h3>
              <p>Espacios comerciales en adaptación física para inspección de apertura en la zona.</p>
              <div className="alert-items-list">
                {obraLocalsList.slice(0, 4).map((l) => (
                  <div
                    key={l.nomenclatura}
                    className="alert-item-mini"
                    onClick={() => onSelectLocal && onSelectLocal(l.nomenclatura, l.contractLocationId || undefined)}
                  >
                    <strong>{l.nomenclatura}</strong>
                    <span>{l.marca || "En Adaptación"}</span>
                  </div>
                ))}
                {obraLocalsList.length > 4 && (
                  <small className="more-indicator">+{obraLocalsList.length - 4} locales en obra</small>
                )}
              </div>
              <button
                type="button"
                className="side-card-action-btn"
                onClick={() => { setDashboardTab("locals"); setLocalStatusFilter("obra"); }}
              >
                Ver locales en adaptación →
              </button>
            </div>

            {/* Tarjeta Azul: Gestores y Supervisión Rápida */}
            <div className="side-alert-card card-slate">
              <div className="side-alert-header">
                <span className="alert-badge">Equipo Directivo</span>
                <span className="alert-count">{detailedManagers.length}</span>
              </div>
              <h3>Gestores de Contrato</h3>
              <p>Distribución de expedientes comerciales en la gerencia.</p>
              <ul className="manager-load-list">
                {detailedManagers.slice(0, 5).map((m) => (
                  <li key={m.manager} onClick={() => setSelectedGestorModal(m)} style={{ cursor: "pointer" }} title="Click para supervisar gestor">
                    <span>{m.manager}</span>
                    <strong>{m.totalContracts} contratos · {m.avgScore} pts</strong>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="side-card-action-btn"
                onClick={() => {
                  const el = document.getElementById("seccion-gestores");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                Ver supervisión de gestores ↓
              </button>
            </div>
          </aside>

          {/* ÁREA CENTRAL: CUADRÍCULA DE 4 GRÁFICAS DE DECISIÓN + ANÁLISIS */}
          <main className="gsc-main-grid-area">
            <section className="gsc-charts-quad-grid" aria-label="Gráficas de Análisis">
              {/* Gráfica 1: Top Marcas Comerciales */}
              <article className="gsc-chart-card">
                <div className="chart-card-header">
                  <h4>Top Marcas Comerciales por Ingreso</h4>
                  <small>Mayor contraprestación mensual contratada</small>
                </div>
                <div className="horizontal-bars-container">
                  {topBrands.map((b) => {
                    const maxRent = topBrands[0]?.monthlyRent || 1;
                    const pct = Math.min(100, Math.round(((b.monthlyRent || 0) / maxRent) * 100));
                    return (
                      <div key={b.contractNumber} className="h-bar-row">
                        <div className="h-bar-labels">
                          <strong>{b.brand || b.contractNumber}</strong>
                          <span className="h-bar-val">{currencyFormat.format(b.monthlyRent || 0)}/mes</span>
                        </div>
                        <div className="h-bar-track">
                          <div className="h-bar-fill" style={{ width: `${pct}%`, background: "#ac182c" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              {/* Gráfica 2: Distribución de Locales por Nivel o Tipo (Dinámica con los 4 Estatus y Zona) */}
              <article className="gsc-chart-card">
                <div className="chart-card-header">
                  <h4>
                    {zoneDistribution.isEtp
                      ? "Locales por Nivel en ETP"
                      : `Locales en ${locationOptions.find(z => z.id === selectedZone)?.shortName || "Zona"}`}
                  </h4>
                  <small>Distribución por los 4 estatus oficiales</small>
                </div>
                <div className="v-bars-comparison-grid">
                  {Object.entries(zoneDistribution.data).map(([groupKey, stats]) => {
                    const maxTot = Math.max(...Object.values(zoneDistribution.data).map((v) => v.total), 1);
                    const hPct = Math.round((stats.total / maxTot) * 100);
                    return (
                      <div key={groupKey} className="v-bar-col">
                        <div className="v-bar-stack" style={{ height: `${hPct}%` }}>
                          <div
                            className="v-bar-segment seg-op"
                            style={{ height: `${(stats.operando / (stats.total || 1)) * 100}%`, background: statusColors["EN FUNCIONAMIENTO"] }}
                            title={`En Funcionamiento: ${stats.operando}`}
                          />
                          <div
                            className="v-bar-segment seg-obra"
                            style={{ height: `${(stats.obra / (stats.total || 1)) * 100}%`, background: statusColors["EN ADAPTACION"] }}
                            title={`En Adaptación: ${stats.obra}`}
                          />
                          <div
                            className="v-bar-segment seg-form"
                            style={{ height: `${(stats.formalizacion / (stats.total || 1)) * 100}%`, background: statusColors["EN PROCESO DE ASIGNACION"] }}
                            title={`En Formalización: ${stats.formalizacion}`}
                          />
                          <div
                            className="v-bar-segment seg-disp"
                            style={{ height: `${(stats.disponible / (stats.total || 1)) * 100}%`, background: statusColors.DISPONIBLE }}
                            title={`Disponible: ${stats.disponible}`}
                          />
                        </div>
                        <span className="v-bar-label">{groupKey.split("(")[0]}</span>
                        <span className="v-bar-legend">{stats.operando} op / {stats.disponible} disp</span>
                      </div>
                    );
                  })}
                </div>
                <div className="chart-micro-legend">
                  <span><i className="legend-box" style={{ background: statusColors["EN FUNCIONAMIENTO"] }} /> En Funcionamiento</span>
                  <span><i className="legend-box" style={{ background: statusColors["EN ADAPTACION"] }} /> En Adaptación</span>
                  <span><i className="legend-box" style={{ background: statusColors["EN PROCESO DE ASIGNACION"] }} /> En Formalización</span>
                  <span><i className="legend-box" style={{ background: statusColors.DISPONIBLE }} /> Disponible</span>
                </div>
              </article>

              {/* Gráfica 3: Salud Documental y Cumplimiento Regulatorio */}
              <article className="gsc-chart-card">
                <div className="chart-card-header">
                  <h4>Salud Regulatoria de Contratos</h4>
                  <small>Garantías, pólizas de R.C. y proyectos aprobados</small>
                </div>
                <div className="regulatory-compliance-panel">
                  <div className="compliance-row">
                    <div className="comp-info">
                      <strong>Fianzas / Garantías Vigentes</strong>
                      <span>{withValidGuarantee} de {totalContracts} ({Math.round(regulatoryHealthPct)}%)</span>
                    </div>
                    <div className="comp-bar-wrap">
                      <div className="comp-bar-fill" style={{ width: `${regulatoryHealthPct}%`, background: statusColors["EN FUNCIONAMIENTO"] }} />
                    </div>
                  </div>

                  <div className="compliance-row">
                    <div className="comp-info">
                      <strong>Pólizas de Responsabilidad Civil</strong>
                      <span>{withValidPolicy} de {totalContracts} ({Math.round(policyHealthPct)}%)</span>
                    </div>
                    <div className="comp-bar-wrap">
                      <div className="comp-bar-fill" style={{ width: `${policyHealthPct}%`, background: "#09212e" }} />
                    </div>
                  </div>

                  <div className="compliance-row">
                    <div className="comp-info">
                      <strong>Proyectos de Obra Aprobados</strong>
                      <span>{withApprovedProject} de {totalContracts} ({Math.round(projectHealthPct)}%)</span>
                    </div>
                    <div className="comp-bar-wrap">
                      <div className="comp-bar-fill" style={{ width: `${projectHealthPct}%`, background: "#ac182c" }} />
                    </div>
                  </div>
                </div>
              </article>

              {/* Gráfica 4: Modalidad de Renta */}
              <article className="gsc-chart-card">
                <div className="chart-card-header">
                  <h4>Esquema de Contraprestación</h4>
                  <small>Estructura de Renta Fija vs Renta con Participación</small>
                </div>
                <div className="rent-modalities-donut-layout">
                  <div className="donut-center-graphic">
                    <CircularGauge
                      percentage={totalContracts > 0 ? (rentModalities.fijaMasVariable / totalContracts) * 100 : 0}
                      color="#09212e"
                      trackColor="#dfe4e7"
                      size={100}
                      strokeWidth={10}
                    />
                  </div>
                  <div className="donut-legend-col">
                    <div className="legend-item">
                      <span className="legend-dot dot-fixed" style={{ background: "#09212e" }} />
                      <div>
                        <strong>Renta Fija Mensual: {rentModalities.soloFija} contratos</strong>
                        <p>Tarifa por metro cuadrado establecida sin porcentaje de ventas</p>
                      </div>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot dot-variable" style={{ background: "#ac182c" }} />
                      <div>
                        <strong>Renta con Participación: {rentModalities.fijaMasVariable} contratos</strong>
                        <p>Renta base más porcentaje (%) variable sobre facturación</p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </section>
          </main>
        </div>

        {/* SECCIÓN EXPANDIDA: SUPERVISIÓN Y CUMPLIMIENTO POR GESTOR DE CONTRATOS */}
        <section id="seccion-gestores" className="gsc-gestores-management-card" aria-label="Gestores de Contrato GSC">
              <div className="gestores-card-header">
                <div>
                  <span className="section-kicker">Gestión de Equipo · GSC</span>
                  <h3>Supervisión y Cumplimiento por Gestor de Contratos</h3>
                  <p>Métricas de distribución de cartera, cumplimiento de garantías/pólizas y calificación promedio de marcas para la Gerente de Servicios Comerciales.</p>
                </div>
                <div className="gestores-chips-wrap">
                  <span className="gestor-kpi-chip"><strong>{detailedManagers.length}</strong> Gestores</span>
                  <span className="gestor-kpi-chip"><strong>{Math.round(regulatoryHealthPct)}%</strong> Cumplimiento Fianzas</span>
                  <span className="gestor-kpi-chip"><strong>{Math.round(policyHealthPct)}%</strong> Cumplimiento Pólizas</span>
                </div>
              </div>

              <div className="gsc-table-responsive-container" style={{ marginTop: "14px" }}>
                <table className="gsc-executive-table">
                  <thead>
                    <tr>
                      <th>Gestor Responsable</th>
                      <th>Contratos</th>
                      <th>Facturación Mensual</th>
                      <th>Fianzas Vigentes</th>
                      <th>Pólizas R.C.</th>
                      <th>Score Promedio</th>
                      <th>Vencimientos &lt; 90d</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailedManagers.map((gm) => (
                      <tr key={gm.manager}>
                        <td className="cell-marca">
                          <strong>{gm.manager}</strong>
                        </td>
                        <td>
                          <strong>{gm.totalContracts}</strong>
                          <small style={{ display: "block", color: "#71828d" }}>
                            {totalContracts > 0 ? `${Math.round((gm.totalContracts / totalContracts) * 100)}% de cartera` : ""}
                          </small>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {currencyFormat.format(gm.totalMonthlyRent)}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div style={{ flex: 1, height: "6px", background: "#e1e6ea", borderRadius: "3px", overflow: "hidden", minWidth: "45px" }}>
                              <div style={{ width: `${gm.fianzasPct}%`, height: "100%", background: gm.fianzasPct >= 70 ? "#00886f" : gm.fianzasPct >= 40 ? "#f28c28" : "#ac182c" }} />
                            </div>
                            <strong style={{ fontSize: "12px" }}>{gm.fianzasPct}%</strong>
                          </div>
                          <small style={{ color: "#71828d" }}>{gm.fianzasVigentes} de {gm.totalContracts}</small>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div style={{ flex: 1, height: "6px", background: "#e1e6ea", borderRadius: "3px", overflow: "hidden", minWidth: "45px" }}>
                              <div style={{ width: `${gm.polizasPct}%`, height: "100%", background: gm.polizasPct >= 70 ? "#00886f" : gm.polizasPct >= 40 ? "#f28c28" : "#ac182c" }} />
                            </div>
                            <strong style={{ fontSize: "12px" }}>{gm.polizasPct}%</strong>
                          </div>
                          <small style={{ color: "#71828d" }}>{gm.polizasVigentes} de {gm.totalContracts}</small>
                        </td>
                        <td>
                          <span className={`tier-badge tier-${gm.avgScore >= 85 ? "a-plus" : gm.avgScore >= 70 ? "a" : gm.avgScore >= 55 ? "b" : "c"}`}>
                            {gm.avgScore >= 85 ? "A+" : gm.avgScore >= 70 ? "A" : gm.avgScore >= 55 ? "B" : "C"} · {gm.avgScore} pts
                          </span>
                        </td>
                        <td>
                          {gm.criticalExpirations > 0 ? (
                            <span style={{ color: "#ac182c", fontWeight: 700, fontSize: "12px" }}>
                              ⚠️ {gm.criticalExpirations} por vencer
                            </span>
                          ) : (
                            <span style={{ color: "#00886f", fontWeight: 600, fontSize: "12px" }}>Al corriente</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="table-action-btn"
                            onClick={() => setSelectedGestorModal(gm)}
                          >
                            Ver marcas ({gm.brands.length}) →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* MÓDULO DE ANÁLISIS DESCRIPTIVO E INTELIGENCIA DIRECTIVA */}
            <section className="gsc-narrative-analysis-box" aria-label="Diagnóstico Ejecutivo">
              <div className="narrative-box-header">
                <div className="box-title-wrap">
                  <span className="sparkle-icon" aria-hidden="true">✦</span>
                  <h3>Diagnóstico Directivo · Gerencia de Servicios Comerciales</h3>
                </div>
                <span className="analysis-tag">Conclusiones Oficiales SIGCO</span>
              </div>

              <div className="narrative-content-grid">
                <div className="narrative-column">
                  <h4>1. Capacidad Física y Ocupación</h4>
                  <p>
                    La gerencia gestiona <strong>{zoneLocales.length} locales comerciales</strong> en {selectedZone === "all" ? "todas las zonas" : (locationOptions.find(z => z.id === selectedZone)?.name || "la zona seleccionada")}, de los cuales{" "}
                    <strong>{rentedLocalesCount} se encuentran arrendados / ocupados</strong> ({Math.round(occupancyRate)}% de ocupación física). Existen actualmente{" "}
                    <strong>{operatingLocalsCount} espacios en funcionamiento</strong>, <strong>{obraLocalsList.length} locales en adaptación</strong> y{" "}
                    <strong>{formalizacionLocalsList.length} locales en formalización</strong>. Se mantiene una disponibilidad de{" "}
                    <strong>{availableLocalsCount} locales listos para colocación comercial</strong>.
                  </p>
                </div>

                <div className="narrative-column">
                  <h4>2. Salud Contractual y Garantías</h4>
                  <p>
                    El cumplimiento de garantías financieras alcanza el <strong>{Math.round(regulatoryHealthPct)}%</strong> ({withValidGuarantee} de {totalContracts} contratos con fianza vigente).
                    Las pólizas de responsabilidad civil cubren el <strong>{Math.round(policyHealthPct)}%</strong> del padrón comercial activo.
                  </p>
                </div>

                <div className="narrative-column">
                  <h4>3. Acciones Inmediatas de Supervisión</h4>
                  <p>
                    1. Requerir renovación de pólizas de responsabilidad civil pendientes en el <strong>{Math.round(100 - policyHealthPct)}%</strong> de la cartera.
                    <br />
                    2. Programar inspección a los <strong>{obraLocalsList.length} locales en adaptación</strong> para validar fecha de apertura formal.
                    <br />
                    3. Priorizar colocación comercial en los <strong>{availableLocalsCount} locales disponibles</strong>.
                  </p>
                </div>
              </div>
            </section>
        </div>
      )}

      {/* VISTA 2: DIRECTORIO DE LOCALES COMERCIALES */}
      {dashboardTab === "locals" && (
        <section className="gsc-tab-content-panel" aria-label="Directorio de Locales Comerciales">
          <div className="gsc-table-controls-bar">
            {/* Buscador de locales */}
            <div className="gsc-search-input-wrap">
              <span aria-hidden="true">🔍</span>
              <input
                type="text"
                value={localSearch}
                onChange={(e) => { setLocalSearch(e.target.value); setLocalPage(1); }}
                placeholder="Buscar por nomenclatura (ej. LLEIH-01), marca (ej. STARBUCKS) o contrato..."
                className="gsc-search-field"
              />
              {localSearch && (
                <button type="button" className="clear-search-btn" onClick={() => setLocalSearch("")}>✕</button>
              )}
            </div>

            {/* Filtros de estatus de local con los 4 colores oficiales */}
            <div className="gsc-subfilter-pills">
              <button
                type="button"
                className={localStatusFilter === "all" ? "active" : ""}
                onClick={() => { setLocalStatusFilter("all"); setLocalPage(1); }}
              >
                Todos ({zoneLocales.length})
              </button>
              <button
                type="button"
                className={localStatusFilter === "rented" ? "active" : ""}
                onClick={() => { setLocalStatusFilter("rented"); setLocalPage(1); }}
              >
                Con Contrato ({rentedLocalesCount})
              </button>
              <button
                type="button"
                className={localStatusFilter === "operating" ? "active" : ""}
                onClick={() => { setLocalStatusFilter("operating"); setLocalPage(1); }}
              >
                <i className="status-dot" style={{ background: statusColors["EN FUNCIONAMIENTO"] }} /> En Funcionamiento ({operatingLocalsCount})
              </button>
              <button
                type="button"
                className={localStatusFilter === "obra" ? "active" : ""}
                onClick={() => { setLocalStatusFilter("obra"); setLocalPage(1); }}
              >
                <i className="status-dot" style={{ background: statusColors["EN ADAPTACION"] }} /> En Adaptación ({obraLocalsList.length})
              </button>
              <button
                type="button"
                className={localStatusFilter === "formalizacion" ? "active" : ""}
                onClick={() => { setLocalStatusFilter("formalizacion"); setLocalPage(1); }}
              >
                <i className="status-dot" style={{ background: statusColors["EN PROCESO DE ASIGNACION"] }} /> En Formalización ({formalizacionLocalsList.length})
              </button>
              <button
                type="button"
                className={localStatusFilter === "available" ? "active" : ""}
                onClick={() => { setLocalStatusFilter("available"); setLocalPage(1); }}
              >
                <i className="status-dot" style={{ background: statusColors.DISPONIBLE }} /> Disponibles ({availableLocalsCount})
              </button>
            </div>
          </div>

          {/* Resumen de conteo */}
          <div className="gsc-table-meta-bar">
            <span>
              Mostrando <strong>{filteredLocalsList.length}</strong> locales comerciales encontrados
              {selectedZone !== "all" && ` en ${locationOptions.find(z => z.id === selectedZone)?.name || selectedZone.toUpperCase()}`}
            </span>
            <span className="gsc-surface-stat">
              Superficie Arrendada: <strong>{numberFormat.format(totalRentedAreaM2)} m²</strong> de {numberFormat.format(totalCommercialAreaM2)} m² totales
            </span>
          </div>

          {/* Tabla interactiva de locales con badges institucionales */}
          <div className="gsc-table-responsive-container">
            <table className="gsc-executive-table">
              <thead>
                <tr>
                  <th>Local</th>
                  <th>Marca Comercial</th>
                  <th>No. Contrato</th>
                  <th>Zona / Nivel</th>
                  <th>Superficie</th>
                  <th>Estatus</th>
                  <th>Giro Comercial</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLocals.map((local) => {
                  const contractInfo = localContractMap.get(local.nomenclatura.trim().toUpperCase());
                  const isDisp = (local.estatus || "").toUpperCase().includes("DISP");
                  const badgeColor = getStatusColor(local.estatus);

                  return (
                    <tr key={local.id || local.nomenclatura}>
                      <td className="cell-nomenclatura">
                        <strong>{local.nomenclatura}</strong>
                      </td>
                      <td className="cell-marca">
                        {contractInfo?.brand || local.marca || (
                          <span className="text-muted">{isDisp ? "Espacio Disponible" : "Sin asignar"}</span>
                        )}
                      </td>
                      <td className="cell-contrato">
                        {contractInfo ? (
                          <button
                            type="button"
                            className="contract-link-btn"
                            onClick={() => onSelectContract && contractInfo.contract.contractNumber && onSelectContract(contractInfo.contract.contractNumber)}
                            title="Ver detalle del contrato"
                          >
                            {contractInfo.contract.contractNumber}
                          </button>
                        ) : local.contractNumber ? (
                          <span className="contract-tag">{local.contractNumber}</span>
                        ) : (
                          <span className="text-muted">Sin contrato</span>
                        )}
                      </td>
                      <td>
                        <span className="zone-tag">{local.contractLocationName || local.zonaComercial || "ETP"}</span>
                        <small className="level-sub">Nivel {local.nivel || "1"}</small>
                      </td>
                      <td className="cell-number">
                        {local.metraje ? `${Number(local.metraje).toFixed(2)} m²` : "—"}
                      </td>
                      <td>
                        <span
                          className="status-badge"
                          style={{ "--status": badgeColor } as React.CSSProperties}
                        >
                          {local.estatus || "DISPONIBLE"}
                        </span>
                      </td>
                      <td>
                        <span className="giro-text">{local.giroIata || local.giroOperativo || "Comercial"}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="table-action-btn"
                          onClick={() => onSelectLocal && onSelectLocal(local.nomenclatura, local.contractLocationId || undefined)}
                        >
                          Ver ficha
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalLocalPages > 1 && (
            <div className="gsc-pagination-bar">
              <button
                type="button"
                disabled={localPage === 1}
                onClick={() => setLocalPage((p) => Math.max(1, p - 1))}
              >
                ← Anterior
              </button>
              <span>Página {localPage} de {totalLocalPages}</span>
              <button
                type="button"
                disabled={localPage === totalLocalPages}
                onClick={() => setLocalPage((p) => Math.min(totalLocalPages, p + 1))}
              >
                Siguiente →
              </button>
            </div>
          )}
        </section>
      )}

      {/* VISTA 3: CARTERA DE CONTRATOS GSC */}
      {dashboardTab === "contracts" && (
        <section className="gsc-tab-content-panel" aria-label="Cartera de Contratos GSC">
          <div className="gsc-table-controls-bar">
            {/* Buscador de contratos */}
            <div className="gsc-search-input-wrap">
              <span aria-hidden="true">🔍</span>
              <input
                type="text"
                value={contractSearch}
                onChange={(e) => { setContractSearch(e.target.value); setContractPage(1); }}
                placeholder="Buscar por número de contrato, marca o razón social..."
                className="gsc-search-field"
              />
              {contractSearch && (
                <button type="button" className="clear-search-btn" onClick={() => setContractSearch("")}>✕</button>
              )}
            </div>

            <div className="gsc-subfilter-pills">
              <button
                type="button"
                className={selectedTier === "all" ? "active" : ""}
                onClick={() => setSelectedTier("all")}
              >
                Todos ({gscContracts.length})
              </button>
              <button
                type="button"
                className={selectedTier === "A+" ? "active" : ""}
                onClick={() => setSelectedTier("A+")}
              >
                Tier A+ ({tierCounts["A+"]})
              </button>
              <button
                type="button"
                className={selectedTier === "A" ? "active" : ""}
                onClick={() => setSelectedTier("A")}
              >
                Tier A ({tierCounts.A})
              </button>
              <button
                type="button"
                className={selectedTier === "B" ? "active" : ""}
                onClick={() => setSelectedTier("B")}
              >
                Tier B ({tierCounts.B})
              </button>
              <button
                type="button"
                className={selectedTier === "C" ? "active" : ""}
                onClick={() => setSelectedTier("C")}
              >
                Tier C ({tierCounts.C})
              </button>
            </div>
          </div>

          <div className="gsc-table-meta-bar">
            <span>Mostrando <strong>{filteredDetailedContracts.length}</strong> contratos de Servicios Comerciales</span>
            <span className="gsc-surface-stat">
              Facturación Mensual Total: <strong>{currencyFormat.format(totalMonthlyRevenue)}</strong>
            </span>
          </div>

          {/* Tabla de Contratos */}
          <div className="gsc-table-responsive-container">
            <table className="gsc-executive-table">
              <thead>
                <tr>
                  <th>No. Contrato</th>
                  <th>Marca / Razón Social</th>
                  <th>Locales Arrendados</th>
                  <th>Vigencia</th>
                  <th>Días Restantes</th>
                  <th>Score / Tier</th>
                  <th>Renta Mensual</th>
                  <th>Gestor</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredDetailedContracts.slice((contractPage - 1) * itemsPerPage, contractPage * itemsPerPage).map((c) => {
                  const days = c.daysRemaining;
                  const isExpiringSoon = days !== null && days !== undefined && days <= 90;
                  const tier = c.calculatedScore?.tier || "B";
                  const points = c.calculatedScore?.points ?? 0;
                  const localsList = Array.isArray(c.locals) ? c.locals : [];

                  return (
                    <tr key={c.contractNumber}>
                      <td className="cell-contrato">
                        <strong>{c.contractNumber}</strong>
                      </td>
                      <td className="cell-marca">
                        <strong>{c.brand || "Sin marca"}</strong>
                        {c.razonSocial && c.razonSocial !== c.brand && (
                          <small className="razon-sub">{c.razonSocial}</small>
                        )}
                      </td>
                      <td>
                        <div className="locals-chips-cluster">
                          {localsList.length > 0 ? (
                            localsList.map((loc, idx) => (
                              <span key={`${loc.nomenclatura || idx}-${idx}`} className="local-badge-mini">
                                {loc.nomenclatura || "Local"}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted">Sin local</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="term-text">{c.renewalDate || c.contractTerm || "Vigente"}</span>
                      </td>
                      <td>
                        {days !== null && days !== undefined ? (
                          <span className={`days-pill ${isExpiringSoon ? "days-urgent" : days <= 180 ? "days-warning" : "days-ok"}`}>
                            {days} días
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`tier-badge tier-${(tier || "b").toLowerCase().replace("+", "-plus")}`}>
                          {tier} ({points} pts)
                        </span>
                      </td>
                      <td className="cell-number">
                        {c.monthlyRent ? currencyFormat.format(c.monthlyRent) : "—"}
                      </td>
                      <td>
                        <span className="manager-tag">{c.manager || "Sin asignar"}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="table-action-btn"
                          onClick={() => onSelectContract && c.contractNumber && onSelectContract(c.contractNumber)}
                        >
                          Ver contrato
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación de contratos */}
          {Math.ceil(filteredDetailedContracts.length / itemsPerPage) > 1 && (
            <div className="gsc-pagination-bar">
              <button
                type="button"
                disabled={contractPage === 1}
                onClick={() => setContractPage((p) => Math.max(1, p - 1))}
              >
                ← Anterior
              </button>
              <span>Página {contractPage} de {Math.ceil(filteredDetailedContracts.length / itemsPerPage)}</span>
              <button
                type="button"
                disabled={contractPage === Math.ceil(filteredDetailedContracts.length / itemsPerPage)}
                onClick={() => setContractPage((p) => Math.min(Math.ceil(filteredDetailedContracts.length / itemsPerPage), p + 1))}
              >
                Siguiente →
              </button>
            </div>
          )}
        </section>
      )}

      {/* VISTA 4: DASHBOARD DE SCORING Y CUMPLIMIENTO POR MARCA (INTEGRADO DIRECTAMENTE EN GSC) */}
      {dashboardTab === "scoring" && (
        <section className="gsc-tab-content-panel gsc-scoring-panel" aria-label="Scoring y Cumplimiento por Marca">
          <TenantScorecardDashboard
            contracts={scoredContracts}
            ratingCounts={tierCounts}
            averageScore={averageScore}
            docHealth={Math.round(regulatoryHealthPct)}
            locationName={selectedZone === "all" ? "Todas las zonas comerciales" : (locationOptions.find((z) => z.id === selectedZone)?.name ?? "Zona Comercial")}
            selectedLocationId={selectedZone}
            onSelectLocationId={setSelectedZone}
            onOpenLocal={onSelectLocal ? (nom, loc) => onSelectLocal(nom, loc ?? undefined) : undefined}
          />
        </section>
      )}

      {/* PANEL LATERAL DESLIZABLE (DRAWER) DE SUPERVISIÓN DE GESTOR */}
      {selectedGestorModal && (() => {
        const gestorFilteredContracts = (selectedGestorModal.contracts || []).filter((c: any) => {
          if (!gestorSearch.trim()) return true;
          const q = gestorSearch.toLowerCase();
          const cNum = (c.contractNumber || "").toLowerCase();
          const brand = (c.brand || "").toLowerCase();
          const razon = (c.razonSocial || "").toLowerCase();
          const loc = (c.location || "").toLowerCase();
          return cNum.includes(q) || brand.includes(q) || razon.includes(q) || loc.includes(q);
        });

        return (
          <>
            <style>{`
              @keyframes slideInFromRight {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
              @keyframes fadeInBackdrop {
                from { opacity: 0; }
                to { opacity: 1; }
              }
            `}</style>
            {/* Telón sutil y transparente (no invasivo, sin blur que tape el resto de la pantalla) */}
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(9, 33, 46, 0.28)",
                zIndex: 99990,
                animation: "fadeInBackdrop 0.2s ease-out",
              }}
              onClick={() => {
                setSelectedGestorModal(null);
                setGestorSearch("");
              }}
              aria-hidden="true"
            />

            {/* Panel Lateral Deslizable */}
            <aside
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: 0,
                width: "min(680px, 94vw)",
                background: "#ffffff",
                color: "#09212e",
                boxShadow: "-10px 0 45px rgba(9, 33, 46, 0.25)",
                borderLeft: "1px solid #dfe4e7",
                zIndex: 99999,
                display: "flex",
                flexDirection: "column",
                animation: "slideInFromRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                overflow: "hidden",
              }}
              aria-label={`Expediente de Supervisión del Gestor ${selectedGestorModal.manager}`}
            >
              {/* Encabezado del Panel */}
              <div
                style={{
                  background: "linear-gradient(135deg, #09212e 0%, #153a50 100%)",
                  color: "#ffffff",
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "3px solid #ac182c",
                  flexShrink: 0,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span
                      style={{
                        background: "#ac182c",
                        color: "#ffffff",
                        fontSize: "10px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        padding: "2px 7px",
                        borderRadius: "4px",
                      }}
                    >
                      Supervisión GSC
                    </span>
                    <span style={{ fontSize: "11px", color: "#a8c0d2" }}>Cartera de Gestor</span>
                  </div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
                    👤 {selectedGestorModal.manager}
                  </h2>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "11px", color: "#a8c0d2" }}>ESC para cerrar</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGestorModal(null);
                      setGestorSearch("");
                    }}
                    aria-label="Cerrar panel"
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      color: "#ffffff",
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)")}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Resumen de Métricas del Gestor */}
              <div
                style={{
                  padding: "14px 20px",
                  background: "#f8fafb",
                  borderBottom: "1px solid #dfe4e7",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                  <div style={{ background: "#ffffff", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e1e6ea", borderLeft: "3px solid #09212e" }}>
                    <small style={{ color: "#71828d", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Contratos</small>
                    <strong style={{ display: "block", fontSize: "18px", color: "#09212e", lineHeight: 1.2 }}>{selectedGestorModal.totalContracts}</strong>
                    <small style={{ color: "#8b9aa5", fontSize: "10px" }}>{selectedGestorModal.brands.length} marcas</small>
                  </div>

                  <div style={{ background: "#ffffff", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e1e6ea", borderLeft: `3px solid ${selectedGestorModal.fianzasPct >= 70 ? "#00886f" : "#ac182c"}` }}>
                    <small style={{ color: "#71828d", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Fianzas</small>
                    <strong style={{ display: "block", fontSize: "18px", color: selectedGestorModal.fianzasPct >= 70 ? "#00886f" : "#ac182c", lineHeight: 1.2 }}>
                      {selectedGestorModal.fianzasPct}%
                    </strong>
                    <small style={{ color: "#8b9aa5", fontSize: "10px" }}>{selectedGestorModal.fianzasVigentes}/{selectedGestorModal.totalContracts} vigentes</small>
                  </div>

                  <div style={{ background: "#ffffff", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e1e6ea", borderLeft: `3px solid ${selectedGestorModal.polizasPct >= 70 ? "#00886f" : "#ac182c"}` }}>
                    <small style={{ color: "#71828d", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Pólizas RC</small>
                    <strong style={{ display: "block", fontSize: "18px", color: selectedGestorModal.polizasPct >= 70 ? "#00886f" : "#ac182c", lineHeight: 1.2 }}>
                      {selectedGestorModal.polizasPct}%
                    </strong>
                    <small style={{ color: "#8b9aa5", fontSize: "10px" }}>{selectedGestorModal.polizasVigentes}/{selectedGestorModal.totalContracts} vigentes</small>
                  </div>

                  <div style={{ background: "#ffffff", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e1e6ea", borderLeft: "3px solid #8a633f" }}>
                    <small style={{ color: "#71828d", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Score Prom.</small>
                    <strong style={{ display: "block", fontSize: "18px", color: "#8a633f", lineHeight: 1.2 }}>{selectedGestorModal.avgScore} pts</strong>
                    <span className={`tier-badge tier-${selectedGestorModal.avgScore >= 85 ? "a-plus" : selectedGestorModal.avgScore >= 70 ? "a" : selectedGestorModal.avgScore >= 55 ? "b" : "c"}`} style={{ fontSize: "9px", padding: "1px 5px", display: "inline-block" }}>
                      Tier {selectedGestorModal.avgScore >= 85 ? "A+" : selectedGestorModal.avgScore >= 70 ? "A" : selectedGestorModal.avgScore >= 55 ? "B" : "C"}
                    </span>
                  </div>
                </div>

                {/* Buscador dentro del Panel */}
                <div style={{ position: "relative", marginTop: "12px" }}>
                  <input
                    type="text"
                    placeholder="Filtrar por marca, contrato o local..."
                    value={gestorSearch}
                    onChange={(e) => setGestorSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 34px",
                      borderRadius: "6px",
                      border: "1px solid #c2cbd1",
                      fontSize: "12px",
                      outline: "none",
                      background: "#ffffff",
                      color: "#09212e",
                    }}
                  />
                  <span style={{ position: "absolute", left: "10px", top: "8px", fontSize: "13px", color: "#71828d" }}>🔍</span>
                  {gestorSearch && (
                    <button
                      type="button"
                      onClick={() => setGestorSearch("")}
                      style={{
                        position: "absolute",
                        right: "8px",
                        top: "7px",
                        background: "none",
                        border: "none",
                        fontSize: "12px",
                        color: "#71828d",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Lista Desplazable de Contratos y Marcas (Tarjetas Estructuradas) */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  background: "#f4f7f9",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#09212e", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Marcas y Contratos Supervisados ({gestorFilteredContracts.length})
                  </span>
                  {gestorSearch && (
                    <span style={{ fontSize: "11px", color: "#71828d" }}>
                      Filtrado de {selectedGestorModal.contracts.length}
                    </span>
                  )}
                </div>

                {gestorFilteredContracts.length === 0 ? (
                  <div style={{ background: "#ffffff", borderRadius: "10px", padding: "30px", textAlign: "center", border: "1px solid #dfe4e7", color: "#71828d" }}>
                    <p style={{ margin: 0, fontSize: "13px" }}>No se encontraron marcas ni contratos que coincidan con la búsqueda.</p>
                  </div>
                ) : (
                  gestorFilteredContracts.map((c: any) => {
                    const isFianzaOk = (c.guaranteeStatus || "").toUpperCase().includes("VIGENT");
                    const isPolizaOk = (c.liabilityPolicyStatus || "").toUpperCase().includes("VIGENT");
                    const scoreVal = c.calculatedScore?.points ?? 0;
                    const tierVal = c.calculatedScore?.tier || "B";
                    const isCriticalDays = c.daysRemaining !== null && c.daysRemaining !== undefined && c.daysRemaining <= 90 && c.daysRemaining >= 0;
                    const isExpired = c.daysRemaining !== null && c.daysRemaining !== undefined && c.daysRemaining < 0;

                    return (
                      <div
                        key={c.contractNumber}
                        style={{
                          background: "#ffffff",
                          borderRadius: "10px",
                          border: "1px solid #dfe4e7",
                          padding: "12px 14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          transition: "all 0.15s ease",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#ac182c";
                          e.currentTarget.style.boxShadow = "0 3px 8px rgba(172, 24, 44, 0.12)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#dfe4e7";
                          e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                        }}
                      >
                        {/* Fila 1: Contrato, Score y Vigencia */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                          <span style={{ fontWeight: 800, fontSize: "13px", color: "#09212e", fontFamily: "monospace" }}>
                            {c.contractNumber}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span className={`tier-badge tier-${tierVal === "A+" ? "a-plus" : tierVal === "A" ? "a" : tierVal === "B" ? "b" : "c"}`} style={{ fontSize: "10px", padding: "2px 6px" }}>
                              Tier {tierVal} · {scoreVal} pts
                            </span>
                            {isExpired ? (
                              <span style={{ background: "#fdf2f4", color: "#ac182c", border: "1px solid #f7ccd4", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 700 }}>
                                Vencido
                              </span>
                            ) : isCriticalDays ? (
                              <span style={{ background: "#fff8ec", color: "#c05621", border: "1px solid #feebc8", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 700 }}>
                                ⚠️ Vence en {c.daysRemaining}d
                              </span>
                            ) : c.daysRemaining !== null && c.daysRemaining !== undefined ? (
                              <span style={{ background: "#f0f4f8", color: "#596975", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 600 }}>
                                {c.daysRemaining}d vigentes
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Fila 2: Marca y Razón Social */}
                        <div>
                          <strong style={{ fontSize: "14px", color: "#09212e", display: "block" }}>
                            {c.brand || c.razonSocial || "—"}
                          </strong>
                          {c.brand && c.razonSocial && c.brand !== c.razonSocial && (
                            <small style={{ color: "#71828d", display: "block", fontSize: "11px", marginTop: "1px" }}>
                              {c.razonSocial}
                            </small>
                          )}
                          {c.location && (
                            <small style={{ color: "#8a633f", fontSize: "11px", fontWeight: 600, display: "inline-block", marginTop: "2px" }}>
                              📍 {c.location}
                            </small>
                          )}
                        </div>

                        {/* Fila 3: Badges de Cumplimiento y Acción */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f0f4f7", paddingTop: "8px", marginTop: "2px", flexWrap: "wrap", gap: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                padding: "3px 7px",
                                borderRadius: "4px",
                                fontSize: "10px",
                                fontWeight: 700,
                                background: isFianzaOk ? "#e6f4f1" : "#fdf2f4",
                                color: isFianzaOk ? "#00886f" : "#ac182c",
                                border: `1px solid ${isFianzaOk ? "#b2ded6" : "#f7ccd4"}`,
                              }}
                            >
                              {isFianzaOk ? "✓ Fianza Vigente" : "✗ Sin Fianza"}
                            </span>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                padding: "3px 7px",
                                borderRadius: "4px",
                                fontSize: "10px",
                                fontWeight: 700,
                                background: isPolizaOk ? "#e6f4f1" : "#fdf2f4",
                                color: isPolizaOk ? "#00886f" : "#ac182c",
                                border: `1px solid ${isPolizaOk ? "#b2ded6" : "#f7ccd4"}`,
                              }}
                            >
                              {isPolizaOk ? "✓ Póliza RC" : "✗ Sin Póliza RC"}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedGestorModal(null);
                              setGestorSearch("");
                              if (onSelectContract) onSelectContract(c.contractNumber);
                            }}
                            style={{
                              background: "#ffffff",
                              border: "1px solid #ac182c",
                              color: "#ac182c",
                              padding: "4px 12px",
                              borderRadius: "5px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              whiteSpace: "nowrap",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#ac182c";
                              e.currentTarget.style.color = "#ffffff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#ffffff";
                              e.currentTarget.style.color = "#ac182c";
                            }}
                          >
                            Ver expediente →
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pie del Panel */}
              <div
                style={{
                  padding: "12px 20px",
                  background: "#ffffff",
                  borderTop: "1px solid #dfe4e7",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: "12px", color: "#596975" }}>
                  <strong>{gestorFilteredContracts.length}</strong> marcas supervisadas
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGestorModal(null);
                    setGestorSearch("");
                  }}
                  style={{
                    padding: "7px 18px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#09212e",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "12px",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#ac182c")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#09212e")}
                >
                  Cerrar Panel
                </button>
              </div>
            </aside>
          </>
        );
      })()}
    </div>
  );
}
