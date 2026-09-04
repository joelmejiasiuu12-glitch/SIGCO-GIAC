"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdvertisingSpaceRecord, LocalRecord } from "../types";
import AdvertisingFormModal from "./AdvertisingFormModal";

interface AdvertisingCenterProps {
  advertisingSpaces: AdvertisingSpaceRecord[];
  contractRecords?: LocalRecord[];
  onSelectContract?: (contractNumber: string) => void;
  initialSearch?: string;
  initialUnitCode?: string | null;
  onClearInitialUnit?: () => void;
  onSaveUnit?: (unit: AdvertisingSpaceRecord) => void;
  onDeleteUnit?: (unit: AdvertisingSpaceRecord) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface ConvenioRecord {
  id: string;
  no: number;
  anio: number;
  convenio: string;
  dependencia: string;
  marca: string;
  vigencia: string;
  renovacion: string;
  bienEspacio: string;
  basesColaboracion: string;
  nomenclatura: string;
  superficieUnidades: string;
  ubicacion: string;
  estatus: string;
  statusTone: string;
}

const currencyFormat = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat("es-MX");

// Iconografía institucional por tipo de medio publicitario
function getMediaIcon(tipo: string): string {
  const t = (tipo || "").toLowerCase();
  if (t.includes("videowall") || t.includes("video wall")) return "📺";
  if (t.includes("totem") || t.includes("tótem")) return "📱";
  if (t.includes("backlight")) return "🖼️";
  if (t.includes("exterior") || t.includes("vialidad") || t.includes("tell") || t.includes("tvp") || t.includes("pac")) return "🛣️";
  if (t.includes("3d") || t.includes("estructura")) return "🏗️";
  if (t.includes("muro") || t.includes("wall graphic") || t.includes("vitral")) return "🧱";
  if (t.includes("sensorial") || t.includes("circular")) return "✨";
  if (t.includes("kiosko") || t.includes("modulo") || t.includes("módulo")) return "🏪";
  if (t.includes("banda")) return "🧳";
  return "📢";
}

// Clasificación macro de formatos para filtros rápidos
function getMediaCategory(tipo: string): string {
  const t = (tipo || "").toLowerCase();
  if (t.includes("videowall") || t.includes("video wall")) return "videowall";
  if (t.includes("totem") || t.includes("tótem")) return "totem";
  if (t.includes("backlight")) return "backlight";
  if (t.includes("exterior") || t.includes("vialidad") || t.includes("tell") || t.includes("tvp") || t.includes("pac")) return "exterior";
  if (t.includes("3d") || t.includes("estructura")) return "estructura";
  if (t.includes("muro") || t.includes("wall graphic") || t.includes("vitral")) return "muro";
  return "otros";
}

export default function AdvertisingCenter({
  advertisingSpaces,
  contractRecords = [],
  onSelectContract,
  initialSearch = "",
  initialUnitCode = null,
  onClearInitialUnit,
  onSaveUnit,
  onDeleteUnit,
  canEdit = true,
  canDelete = true,
}: AdvertisingCenterProps) {
  const [subTab, setSubTab] = useState<"directory" | "formats" | "contracts" | "convenios">("directory");
  const [search, setSearch] = useState<string>(initialSearch || "");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [page, setPage] = useState<number>(1);
  const [selectedUnit, setSelectedUnit] = useState<AdvertisingSpaceRecord | null>(null);
  const [selectedConvenio, setSelectedConvenio] = useState<ConvenioRecord | null>(null);

  // Form modal state (Crear / Editar)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<AdvertisingSpaceRecord | null>(null);

  // Calcular automáticamente el siguiente ID correlativo para evitar que el usuario tenga que buscarlo
  const nextAvailableUnitId = useMemo(() => {
    let maxNum = 0;
    advertisingSpaces.forEach((s) => {
      const id = s.id_unidad || "";
      const match = id.match(/^(?:PUB|EP)-?(\d+)$/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    const nextNum = (maxNum > 0 ? maxNum : advertisingSpaces.length) + 1;
    return `PUB-${String(nextNum).padStart(3, "0")}`;
  }, [advertisingSpaces]);

  const handleOpenAddUnit = () => {
    setEditingUnit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditUnit = (unit: AdvertisingSpaceRecord) => {
    setEditingUnit(unit);
    setIsFormModalOpen(true);
  };

  const handleDeleteUnit = (unit: AdvertisingSpaceRecord) => {
    if (window.confirm(`¿Confirmas la eliminación del soporte publicitario ${unit.id_unidad} (${unit.codigo_nomenclatura})?`)) {
      onDeleteUnit?.(unit);
      if (selectedUnit?.id_unidad === unit.id_unidad) {
        setSelectedUnit(null);
      }
    }
  };

  const handleSaveUnit = (unit: AdvertisingSpaceRecord) => {
    onSaveUnit?.(unit);
    setIsFormModalOpen(false);
  };

  // Sincronizar búsqueda y unidad seleccionada desde navegación externa (ej. contratos GEP)
  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
      setSubTab("directory");
      setSelectedCategory("all");
      setSelectedZone("all");
      setSelectedStatus("all");
      setPage(1);
    }
  }, [initialSearch]);

  useEffect(() => {
    if (initialUnitCode) {
      const match = advertisingSpaces.find(
        (u) =>
          (u.codigo_nomenclatura && u.codigo_nomenclatura.trim().toLowerCase() === initialUnitCode.trim().toLowerCase()) ||
          (u.id_unidad && u.id_unidad.trim().toLowerCase() === initialUnitCode.trim().toLowerCase())
      );
      if (match) {
        setSelectedUnit(match);
        setSubTab("directory");
        setSearch(match.codigo_nomenclatura || match.id_unidad);
      }
    }
  }, [initialUnitCode, advertisingSpaces]);

  const handleCloseUnit = () => {
    setSelectedUnit(null);
    onClearInitialUnit?.();
  };

  const pageSize = viewMode === "grid" ? 18 : 25;

  // 1. Filtrado de unidades publicitarias
  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return advertisingSpaces.filter((u) => {
      // Filtro por categoría de medio
      if (selectedCategory !== "all") {
        const cat = getMediaCategory(u.tipo_medio);
        if (cat !== selectedCategory) return false;
      }

      // Filtro por zona / módulo
      if (selectedZone !== "all") {
        const mod = (u.modulo || "").toLowerCase();
        const ubi = (u.ubicacion_especifica || "").toLowerCase();
        if (selectedZone === "salas" && !mod.includes("g") && !mod.includes("c") && !mod.includes("e") && !mod.includes("f") && !mod.includes("h")) return false;
        if (selectedZone === "ambulatorio" && !mod.includes("a") && !mod.includes("l") && !mod.includes("m") && !mod.includes("i") && !mod.includes("j") && !mod.includes("k")) return false;
        if (selectedZone === "exterior" && !mod.includes("polígono") && !mod.includes("poligono") && !ubi.includes("exterior") && !ubi.includes("vialidad")) return false;
      }

      // Filtro por estatus operativo
      if (selectedStatus !== "all") {
        const s = (u.estatus_operativo || "").toLowerCase();
        if (selectedStatus === "operando" && !s.includes("oper")) return false;
        if (selectedStatus === "sin_operar" && s.includes("oper")) return false;
      }

      // Buscador
      if (q) {
        const idU = (u.id_unidad || "").toLowerCase();
        const cod = (u.codigo_nomenclatura || "").toLowerCase();
        const con = (u.contrato_id || "").toLowerCase();
        const arr = (u.arrendatario || "").toLowerCase();
        const tip = (u.tipo_medio || "").toLowerCase();
        const mod = (u.modulo || "").toLowerCase();
        const ubi = (u.ubicacion_especifica || "").toLowerCase();
        if (
          !idU.includes(q) &&
          !cod.includes(q) &&
          !con.includes(q) &&
          !arr.includes(q) &&
          !tip.includes(q) &&
          !mod.includes(q) &&
          !ubi.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [advertisingSpaces, search, selectedCategory, selectedZone, selectedStatus]);

  // Paginación
  const totalPages = Math.ceil(filteredUnits.length / pageSize) || 1;
  const paginatedUnits = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUnits.slice(start, start + pageSize);
  }, [filteredUnits, page, pageSize]);

  // Indicadores macro del inventario publicitario
  const totalUnitsCount = advertisingSpaces.length;
  const operatingUnitsCount = advertisingSpaces.filter((u) => (u.estatus_operativo || "").toLowerCase().includes("oper")).length;
  const operatingRate = totalUnitsCount > 0 ? (operatingUnitsCount / totalUnitsCount) * 100 : 0;

  // Unidades por tipo de medio
  const mediaDistribution = useMemo(() => {
    const map = new Map<string, number>();
    advertisingSpaces.forEach((u) => {
      const t = u.tipo_medio || "Sin especificar";
      map.set(t, (map.get(t) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([tipo, count]) => ({ tipo, count, icon: getMediaIcon(tipo) }))
      .sort((a, b) => b.count - a.count);
  }, [advertisingSpaces]);

  // Padrón de contratos publicitarios agrupados
  const contractsGrouped = useMemo(() => {
    const map = new Map<
      string,
      {
        contractNumber: string;
        arrendatario: string;
        units: AdvertisingSpaceRecord[];
        monthlyRent: number;
        gestor: string;
      }
    >();

    // Mapeo inicial con unidades
    advertisingSpaces.forEach((u) => {
      const conNum = u.contrato_id || "Sin contrato";
      if (!map.has(conNum)) {
        map.set(conNum, {
          contractNumber: conNum,
          arrendatario: u.arrendatario || "Arrendatario Publicitario",
          units: [],
          monthlyRent: 0,
          gestor: "Heder / Ilse",
        });
      }
      map.get(conNum)!.units.push(u);
    });

    // Enriquecer con rentas y gestor del padrón contractual
    contractRecords.forEach((c) => {
      const num = c.contractNumber;
      if (num && map.has(num)) {
        const item = map.get(num)!;
        if (c.monthlyRent) item.monthlyRent = c.monthlyRent;
        if (c.manager) item.gestor = c.manager;
        if (c.marca) item.arrendatario = `${c.marca} (${c.razonSocial || item.arrendatario})`;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.units.length - a.units.length);
  }, [advertisingSpaces, contractRecords]);

  // 8 CONVENIOS OFICIALES DE COLABORACIÓN INSTITUCIONAL DE GEP (DEL EXCEL OFICIAL)
  const conveniosColaboracion: ConvenioRecord[] = [
    {
      id: "COLAB-01",
      no: 1,
      anio: 2026,
      convenio: "AIFA-DCS-SSC-GEP-COLAB-01-2026",
      dependencia: "Secretaría de Cultura y Turismo del Estado de México",
      marca: "SECTUR Edo. Méx",
      vigencia: "1 May. 2026 al 31 Abr. 2027",
      renovacion: "1 May. 2027",
      bienEspacio: "Stand publicitario",
      basesColaboracion: "Publicidad en redes e invitaciones a eventos culturales a cambio de un espacio para la colocación de un stand publicitario.",
      nomenclatura: "EP-LLANL07",
      superficieUnidades: "1 unidad",
      ubicacion: "Módulo L, nivel 0.00",
      estatus: "La Secretaría se encuentra ajustando el modelo de contrato",
      statusTone: "#39a9db",
    },
    {
      id: "COLAB-04",
      no: 2,
      anio: 2026,
      convenio: "AIFA-DCS-SSC-GEP-COLAB-04-2026",
      dependencia: "Secretaría de Cultura de Gobierno de la Ciudad de México",
      marca: "SECTUR CDMX (Nopales)",
      vigencia: "1 Abr. al 31 Jul. 2026",
      renovacion: "N/A (por el mundial)",
      bienEspacio: "Espacio en plaza mexicana",
      basesColaboracion: "Exhibición de la activación 'Nopalera de Corazón'.",
      nomenclatura: "Plaza Mexicana ETP",
      superficieUnidades: "102 piezas",
      ubicacion: "Plaza mexicana de ETP.",
      estatus: "En revisión de jurídico",
      statusTone: "#f2c94c",
    },
    {
      id: "COLAB-05",
      no: 3,
      anio: 2026,
      convenio: "AIFA-DCS-SSC-GEP-COLAB-05-2026",
      dependencia: "Consejo Nacional de Organizaciones, A.C.",
      marca: "Guelaguetza",
      vigencia: "Pendiente",
      renovacion: "Por definir",
      bienEspacio: "Espacio y difusión cultural",
      basesColaboracion: "Promoción cultural de tradiciones oaxaqueñas y festividad de la Guelaguetza en terminal.",
      nomenclatura: "ETP y Pasillo TITT",
      superficieUnidades: "Muestra cultural",
      ubicacion: "ETP y Pasillo de la TITT",
      estatus: "En espera de los cambios de fecha",
      statusTone: "#8a633f",
    },
    {
      id: "COLAB-06",
      no: 4,
      anio: 2026,
      convenio: "AIFA-DCS-SSC-GEP-COLAB-06-2026",
      dependencia: "Secretaría de Bienestar",
      marca: "Sembrando Vida",
      vigencia: "1 Año (1 May. 2026 al 30 Abr. 2027)",
      renovacion: "1 May. 2027",
      bienEspacio: "Stand publicitario",
      basesColaboracion: "Publicidad en redes e invitaciones a eventos culturales a cambio de un espacio para la colocación de un stand publicitario.",
      nomenclatura: "SANL-28A",
      superficieUnidades: "1 Unidad",
      ubicacion: "Nivel 10.50, módulo L",
      estatus: "Se mandó a Bienestar para subsanar observaciones de Jdco. (Falta cotejo documental legal)",
      statusTone: "#f28c28",
    },
    {
      id: "COLAB-07",
      no: 5,
      anio: 2026,
      convenio: "AIFA-DCS-SSC-GEP-COLAB-07-2026",
      dependencia: "Secretaría de las Mujeres",
      marca: "SEMUJERES",
      vigencia: "1 Jun. al 1 Ago. 2026",
      renovacion: "N/A (por el mundial)",
      bienEspacio: "Campaña de difusión de género",
      basesColaboracion: "Campaña institucional y módulos de difusión para la prevención de violencia y derechos de la mujer.",
      nomenclatura: "Módulos y Pasillos ETP",
      superficieUnidades: "Campaña institucional",
      ubicacion: "Edificio Terminal de Pasajeros",
      estatus: "Falta que manden su documentación legal (En espera de saber quién lo va a gestionar)",
      statusTone: "#f28c28",
    },
    {
      id: "COLAB-09",
      no: 6,
      anio: 2026,
      convenio: "AIFA-DCS-SSC-GEP-COLAB-09-2026",
      dependencia: "Amigos del Desierto de Coahuila, A.C.",
      marca: "Museo del Desierto",
      vigencia: "Pendiente (1 año)",
      renovacion: "Anual",
      bienEspacio: "Exposición temática y patrimonio natural",
      basesColaboracion: "Difusión de patrimonio paleontológico, biodiversidad y exposiciones naturales del desierto mexicano.",
      nomenclatura: "Pasillo Central ETP",
      superficieUnidades: "Exposición temática",
      ubicacion: "Edificio Terminal de Pasajeros",
      estatus: "En trámite de validación jurídica",
      statusTone: "#39a9db",
    },
    {
      id: "COLAB-08",
      no: 7,
      anio: 2026,
      convenio: "AIFA-DCS-SSC-GEP-COLAB-08-2026",
      dependencia: "Promotora Turística Mazatlán",
      marca: "Un mar de historias (Mazatlán)",
      vigencia: "3 meses",
      renovacion: "N/A (por el mundial)",
      bienEspacio: "Cuadros de Mazatlán",
      basesColaboracion: "Intercambio de publicidad para difusión turística y cultural de Sinaloa.",
      nomenclatura: "Corredor turístico Sky Wall",
      superficieUnidades: "Galería fotográfica",
      ubicacion: "Corredor turístico Sky Wall",
      estatus: "Falta que manden su documentación legal",
      statusTone: "#f28c28",
    },
    {
      id: "COLAB-10",
      no: 8,
      anio: 2026,
      convenio: "AIFA-DCS-SSC-GEP-COLAB-10-2026",
      dependencia: "Aeroenlaces Nacionales, S.A. de C.V. y Editorial GEA",
      marca: "VIVA y Revista ARMAS",
      vigencia: "1 Jul. 2026 al 30 Jun. 2027",
      renovacion: "1 Jul. 2027",
      bienEspacio: "Tótems informativos y Revista ARMAS",
      basesColaboracion: "Intercambio de publicidad: 5 tótems informativos en terminal AIFA y 5 páginas editoriales en la revista ARMAS.",
      nomenclatura: "5 tótems y 5 páginas revista",
      superficieUnidades: "5 tótems publicitarios",
      ubicacion: "Edificio Terminal de Pasajeros",
      estatus: "Pendiente de firma de los clientes",
      statusTone: "#00886f",
    },
  ];

  return (
    <div className="advertising-center-root">
      {/* 1. ENCABEZADO DE KPIS INSTITUCIONALES DE PUBLICIDAD */}
      <section className="kpi-grid" aria-label="Indicadores de Publicidad">
        <article className="kpi-card">
          <span className="kpi-eyebrow">Unidades Publicitarias</span>
          <strong className="kpi-value">{numberFormat.format(totalUnitsCount)}</strong>
          <span className="kpi-caption">Elementos y soportes supervisados</span>
        </article>

        <article className="kpi-card">
          <span className="kpi-eyebrow">En Operación Activa</span>
          <strong className="kpi-value" style={{ color: "#00886f" }}>
            {numberFormat.format(operatingUnitsCount)}
          </strong>
          <span className="kpi-caption">{Math.round(operatingRate)}% de activación en terminal</span>
        </article>

        <article className="kpi-card">
          <span className="kpi-eyebrow">Formatos de Medio</span>
          <strong className="kpi-value">{mediaDistribution.length}</strong>
          <span className="kpi-caption">VideoWalls, Tótems, Backlights y Exteriores</span>
        </article>

        <article className="kpi-card">
          <span className="kpi-eyebrow">Facturación Fija Mensual</span>
          <strong className="kpi-value" style={{ color: "#00886f" }}>
            {currencyFormat.format(2487350)}
          </strong>
          <span className="kpi-caption">Contraprestación mensual garantizada (+IVA)</span>
        </article>
      </section>

      {/* 2. BARRA DE SUBPESTAÑAS DEL MÓDULO */}
      <nav className="advertising-subnav" aria-label="Secciones de Publicidad">
        <button
          type="button"
          className={subTab === "directory" ? "active" : ""}
          onClick={() => { setSubTab("directory"); setPage(1); }}
        >
          📱 Directorio de Unidades ({totalUnitsCount})
        </button>
        <button
          type="button"
          className={subTab === "formats" ? "active" : ""}
          onClick={() => setSubTab("formats")}
        >
          📊 Catálogo de Formatos ({mediaDistribution.length})
        </button>
        <button
          type="button"
          className={subTab === "contracts" ? "active" : ""}
          onClick={() => setSubTab("contracts")}
        >
          📑 Contratos Publicitarios ({contractsGrouped.length})
        </button>
        <button
          type="button"
          className={subTab === "convenios" ? "active" : ""}
          onClick={() => setSubTab("convenios")}
        >
          🏛️ Convenios Institucionales ({conveniosColaboracion.length})
        </button>
      </nav>

      {/* =========================================================================
          VISTA 1: DIRECTORIO DE UNIDADES (TARJETAS Y TABLA)
          ========================================================================= */}
      {subTab === "directory" && (
        <section className="advertising-content-panel">
          {/* Barra de Controles y Filtros */}
          <div className="advertising-controls-bar">
            {/* Buscador en tiempo real */}
            <div className="adv-search-wrap">
              <span aria-hidden="true">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Buscar por código (ej. VWEIG1-1, PUB-001), marca (ej. DLPX), tipo o módulo..."
                className="adv-search-input"
              />
              {search && (
                <button type="button" className="adv-clear-btn" onClick={() => setSearch("")}>✕</button>
              )}
            </div>

            <div className="adv-controls-right-group">
              {/* Alternador de vista cuadrícula / tabla */}
              <div className="adv-view-toggles">
                <button
                  type="button"
                  className={viewMode === "grid" ? "active" : ""}
                  onClick={() => setViewMode("grid")}
                  title="Vista de cuadrícula con tarjetas visuales"
                >
                  ▦ Tarjetas
                </button>
                <button
                  type="button"
                  className={viewMode === "table" ? "active" : ""}
                  onClick={() => setViewMode("table")}
                  title="Vista de tabla ejecutiva"
                >
                  ≡ Tabla
                </button>
              </div>

              {canEdit && (
                <button
                  type="button"
                  className="adv-add-space-btn"
                  onClick={handleOpenAddUnit}
                  title="Agregar nuevo soporte publicitario al inventario"
                >
                  <span>➕ Agregar Espacio</span>
                </button>
              )}
            </div>
          </div>

          {/* Filtros Slicers */}
          <div className="adv-slicers-row">
            <div className="adv-slicer-group">
              <span className="adv-slicer-label">Tipo de Soporte:</span>
              <div className="adv-slicer-pills">
                <button
                  type="button"
                  className={selectedCategory === "all" ? "active" : ""}
                  onClick={() => { setSelectedCategory("all"); setPage(1); }}
                >
                  Todos
                </button>
                <button
                  type="button"
                  className={selectedCategory === "videowall" ? "active" : ""}
                  onClick={() => { setSelectedCategory("videowall"); setPage(1); }}
                >
                  📺 VideoWalls (21)
                </button>
                <button
                  type="button"
                  className={selectedCategory === "totem" ? "active" : ""}
                  onClick={() => { setSelectedCategory("totem"); setPage(1); }}
                >
                  📱 Tótems (35)
                </button>
                <button
                  type="button"
                  className={selectedCategory === "backlight" ? "active" : ""}
                  onClick={() => { setSelectedCategory("backlight"); setPage(1); }}
                >
                  🖼️ Backlights (21)
                </button>
                <button
                  type="button"
                  className={selectedCategory === "exterior" ? "active" : ""}
                  onClick={() => { setSelectedCategory("exterior"); setPage(1); }}
                >
                  🛣️ Exteriores (17)
                </button>
                <button
                  type="button"
                  className={selectedCategory === "estructura" ? "active" : ""}
                  onClick={() => { setSelectedCategory("estructura"); setPage(1); }}
                >
                  🏗️ Estructuras (26)
                </button>
                <button
                  type="button"
                  className={selectedCategory === "muro" ? "active" : ""}
                  onClick={() => { setSelectedCategory("muro"); setPage(1); }}
                >
                  🧱 Muros / Vitrales (9)
                </button>
              </div>
            </div>

            <div className="adv-slicer-group">
              <span className="adv-slicer-label">Zona / Terminal:</span>
              <div className="adv-slicer-pills">
                <button
                  type="button"
                  className={selectedZone === "all" ? "active" : ""}
                  onClick={() => { setSelectedZone("all"); setPage(1); }}
                >
                  Todas
                </button>
                <button
                  type="button"
                  className={selectedZone === "salas" ? "active" : ""}
                  onClick={() => { setSelectedZone("salas"); setPage(1); }}
                >
                  Salas de Espera
                </button>
                <button
                  type="button"
                  className={selectedZone === "ambulatorio" ? "active" : ""}
                  onClick={() => { setSelectedZone("ambulatorio"); setPage(1); }}
                >
                  Ambulatorio / Llegadas
                </button>
                <button
                  type="button"
                  className={selectedZone === "exterior" ? "active" : ""}
                  onClick={() => { setSelectedZone("exterior"); setPage(1); }}
                >
                  Polígono Exterior
                </button>
              </div>
            </div>
          </div>

          {/* Barra de metadatos de resultados */}
          <div className="adv-meta-bar">
            <span>
              Mostrando <strong>{filteredUnits.length}</strong> unidades publicitarias
              {selectedCategory !== "all" && ` de tipo ${selectedCategory.toUpperCase()}`}
            </span>
            <span className="adv-meta-operating-tag">
              <i className="status-dot" style={{ background: "#00886f" }} /> {operatingUnitsCount} de {totalUnitsCount} unidades operativas ({operatingRate.toFixed(1)}%)
            </span>
          </div>

          {/* VISTA 1.A: CUADRÍCULA DE TARJETAS VISUALES */}
          {viewMode === "grid" ? (
            <div className="adv-cards-grid">
              {paginatedUnits.map((unit) => {
                const icon = getMediaIcon(unit.tipo_medio);
                const isOperating = (unit.estatus_operativo || "").toLowerCase().includes("oper");

                return (
                  <article
                    key={unit.id_unidad || unit.codigo_nomenclatura}
                    className="adv-unit-card"
                    onClick={() => setSelectedUnit(unit)}
                  >
                    <div className="adv-card-header">
                      <div className="adv-card-icon-wrap">
                        <span className="adv-card-icon" aria-hidden="true">{icon}</span>
                        <div>
                          <span className="adv-unit-id">{unit.id_unidad}</span>
                          <strong className="adv-unit-code">{unit.codigo_nomenclatura}</strong>
                        </div>
                      </div>
                      <span
                        className="status-badge"
                        style={{ "--status": isOperating ? "#00886f" : "#f28c28" } as React.CSSProperties}
                      >
                        {isOperating ? "Operando" : "Sin operar"}
                      </span>
                    </div>

                    <div className="adv-card-body">
                      <div className="adv-card-row">
                        <span className="adv-row-label">Tipo de Soporte:</span>
                        <strong className="adv-row-val">{unit.tipo_medio}</strong>
                      </div>
                      <div className="adv-card-row">
                        <span className="adv-row-label">Módulo / Nivel:</span>
                        <span className="adv-row-val">Módulo {unit.modulo || "General"} · Nivel {unit.nivel || "1"}</span>
                      </div>
                      <div className="adv-card-row">
                        <span className="adv-row-label">Arrendatario:</span>
                        <span className="adv-row-val adv-brand-text">{unit.arrendatario || "Publicidad AIFA"}</span>
                      </div>
                      <div className="adv-card-row">
                        <span className="adv-row-label">Contrato:</span>
                        <span className="adv-contract-badge">{unit.contrato_id || "Sin contrato"}</span>
                      </div>
                    </div>

                    <div className="adv-card-footer">
                      <button
                        type="button"
                        className="adv-detail-btn"
                        onClick={(e) => { e.stopPropagation(); setSelectedUnit(unit); }}
                      >
                        Ver Ficha Técnica →
                      </button>
                      <div className="adv-card-actions">
                        {canEdit && (
                          <button
                            type="button"
                            className="table-action-btn edit-local-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditUnit(unit);
                            }}
                            title="Editar soporte publicitario"
                          >
                            ✏️ Editar
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="delete-local-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUnit(unit);
                            }}
                            title="Eliminar soporte publicitario"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* VISTA 1.B: TABLA EJECUTIVA */
            <div className="gsc-table-responsive-container">
              <table className="gsc-executive-table">
                <thead>
                  <tr>
                    <th>ID Unidad</th>
                    <th>Código / Nomenclatura</th>
                    <th>Tipo de Medio</th>
                    <th>Módulo / Nivel</th>
                    <th>Arrendatario</th>
                    <th>No. Contrato</th>
                    <th>Estatus</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUnits.map((unit) => {
                    const isOperating = (unit.estatus_operativo || "").toLowerCase().includes("oper");
                    return (
                      <tr key={unit.id_unidad || unit.codigo_nomenclatura}>
                        <td className="cell-nomenclatura">
                          <strong>{unit.id_unidad}</strong>
                        </td>
                        <td>
                          <strong>{unit.codigo_nomenclatura}</strong>
                        </td>
                        <td>
                          <span>{getMediaIcon(unit.tipo_medio)} {unit.tipo_medio}</span>
                        </td>
                        <td>
                          <span className="zone-tag">Módulo {unit.modulo || "General"}</span>
                          <small className="level-sub">Nivel {unit.nivel || "1"}</small>
                        </td>
                        <td className="cell-marca">
                          <strong>{unit.arrendatario}</strong>
                        </td>
                        <td>
                          {unit.contrato_id ? (
                            <button
                              type="button"
                              className="contract-link-btn"
                              onClick={() => onSelectContract && onSelectContract(unit.contrato_id)}
                              title="Ver expediente en módulo de contratos"
                            >
                              {unit.contrato_id}
                            </button>
                          ) : (
                            <span className="text-muted">Sin contrato</span>
                          )}
                        </td>
                        <td>
                          <span
                            className="status-badge"
                            style={{ "--status": isOperating ? "#00886f" : "#f28c28" } as React.CSSProperties}
                          >
                            {isOperating ? "Operando" : "Sin operar"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <button
                              type="button"
                              className="table-action-btn"
                              onClick={() => setSelectedUnit(unit)}
                            >
                              Ver Ficha
                            </button>
                            {canEdit && (
                              <button
                                type="button"
                                className="table-action-btn edit-local-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditUnit(unit);
                                }}
                                title="Editar soporte publicitario"
                              >
                                ✏️
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                className="delete-local-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteUnit(unit);
                                }}
                                title="Eliminar soporte publicitario"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="gsc-pagination-bar">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Anterior
              </button>
              <span>Página {page} de {totalPages}</span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente →
              </button>
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          VISTA 2: CATÁLOGO POR TIPO DE SOPORTE
          ========================================================================= */}
      {subTab === "formats" && (
        <section className="advertising-content-panel">
          <div className="adv-formats-intro">
            <h3>Catálogo de Medios y Soportes Publicitarios en AIFA</h3>
            <p>Distribución de los 167 elementos físicos concesionados por tipo de formato publicitario.</p>
          </div>

          <div className="adv-formats-grid">
            {mediaDistribution.map(({ tipo, count, icon }) => {
              const pct = Math.round((count / totalUnitsCount) * 100);
              return (
                <article key={tipo} className="adv-format-card">
                  <div className="format-card-top">
                    <span className="format-big-icon">{icon}</span>
                    <span className="format-count-badge">{count} unidades</span>
                  </div>
                  <h4>{tipo}</h4>
                  <div className="format-track">
                    <div className="format-fill" style={{ width: `${pct}%`, background: "#ac182c" }} />
                  </div>
                  <div className="format-footer">
                    <span>{pct}% del inventario total</span>
                    <button
                      type="button"
                      className="format-filter-link"
                      onClick={() => {
                        setSubTab("directory");
                        setSearch(tipo);
                        setPage(1);
                      }}
                    >
                      Ver unidades →
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* =========================================================================
          VISTA 3: PADRÓN DE CONTRATOS PUBLICITARIOS (17 CONTRATOS GEP)
          ========================================================================= */}
      {subTab === "contracts" && (
        <section className="advertising-content-panel">
          <div className="adv-formats-intro">
            <h3>Cartera de Contratos de Publicidad (GEP)</h3>
            <p>17 expedientes formalizados para la explotación de soportes publicitarios en el AIFA.</p>
          </div>

          <div className="gsc-table-responsive-container">
            <table className="gsc-executive-table">
              <thead>
                <tr>
                  <th>No. Contrato</th>
                  <th>Empresa / Marca</th>
                  <th>Unidades Asignadas</th>
                  <th>Contraprestación Mensual</th>
                  <th>Gestor</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {contractsGrouped.map((c) => (
                  <tr key={c.contractNumber}>
                    <td className="cell-contrato">
                      <strong>{c.contractNumber}</strong>
                    </td>
                    <td className="cell-marca">
                      <strong>{c.arrendatario}</strong>
                    </td>
                    <td>
                      <span className="adv-units-count-chip">
                        {c.units.length} {c.units.length === 1 ? "unidad" : "unidades"}
                      </span>
                    </td>
                    <td className="cell-number">
                      {c.monthlyRent > 0 ? currencyFormat.format(c.monthlyRent) : "Variable / Participación"}
                    </td>
                    <td>
                      <span className="manager-tag">{c.gestor}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => onSelectContract && onSelectContract(c.contractNumber)}
                      >
                        Ver Contrato
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =========================================================================
          VISTA 4: CONVENIOS DE COLABORACIÓN INSTITUCIONAL (8 CONVENIOS DEL EXCEL)
          ========================================================================= */}
      {subTab === "convenios" && (
        <section className="advertising-content-panel">
          <div className="adv-formats-intro">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3>Relación de Convenios de Colaboración y Difusión Cultural (8)</h3>
                <p>Alianzas institucionales, activaciones culturales, acuerdos gubernamentales y convenios de intercambio publicitario en el AIFA.</p>
              </div>
              <span className="adv-meta-operating-tag">
                <i className="status-dot" style={{ background: "#39a9db" }} /> 8 Convenios Registrados (2026)
              </span>
            </div>
          </div>

          <div className="gsc-table-responsive-container">
            <table className="gsc-executive-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>No. Convenio</th>
                  <th>Dependencia / Razón Social</th>
                  <th>Marca / Proyecto</th>
                  <th>Espacio Asignado</th>
                  <th>Ubicación en Terminal</th>
                  <th>Vigencia</th>
                  <th>Estatus Jurídico</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {conveniosColaboracion.map((colab) => (
                  <tr key={colab.id} onClick={() => setSelectedConvenio(colab)} style={{ cursor: "pointer" }}>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "#596975" }}>
                      {colab.no}
                    </td>
                    <td className="cell-contrato">
                      <strong>{colab.convenio}</strong>
                    </td>
                    <td>
                      <strong>{colab.dependencia}</strong>
                    </td>
                    <td>
                      <span className="zone-tag">{colab.marca}</span>
                    </td>
                    <td>
                      <span>{colab.bienEspacio}</span>
                      {colab.nomenclatura && <small className="level-sub">{colab.nomenclatura} ({colab.superficieUnidades})</small>}
                    </td>
                    <td>
                      <span className="level-sub">{colab.ubicacion}</span>
                    </td>
                    <td>
                      <span className="term-text">{colab.vigencia}</span>
                    </td>
                    <td>
                      <span className="status-badge" style={{ "--status": colab.statusTone } as React.CSSProperties}>
                        {colab.estatus}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedConvenio(colab);
                        }}
                      >
                        Ver Ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =========================================================================
          MODAL: FICHA TÉCNICA INSTITUCIONAL DE LA UNIDAD PUBLICITARIA
          ========================================================================= */}
      {selectedUnit && (
        <div className="adv-modal-overlay" onClick={handleCloseUnit}>
          <div className="adv-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <header className="adv-modal-header">
              <div className="adv-modal-title-wrap">
                <span className="adv-modal-big-icon" aria-hidden="true">{getMediaIcon(selectedUnit.tipo_medio)}</span>
                <div>
                  <span className="adv-modal-kicker">Ficha Técnica de Soporte Publicitario</span>
                  <h2>{selectedUnit.id_unidad} · {selectedUnit.codigo_nomenclatura}</h2>
                </div>
              </div>
              <button
                type="button"
                className="adv-modal-close-btn"
                onClick={handleCloseUnit}
                title="Cerrar ventana"
              >
                ✕
              </button>
            </header>

            <div className="adv-modal-body">
              <div className="adv-modal-info-grid">
                <div className="adv-modal-field">
                  <span className="field-label">Tipo de Medio:</span>
                  <strong className="field-val">{selectedUnit.tipo_medio}</strong>
                </div>

                <div className="adv-modal-field">
                  <span className="field-label">Estatus Operativo:</span>
                  <div>
                    <span
                      className="status-badge"
                      style={{
                        "--status": (selectedUnit.estatus_operativo || "").toLowerCase().includes("oper")
                          ? "#00886f"
                          : "#f28c28",
                      } as React.CSSProperties}
                    >
                      {selectedUnit.estatus_operativo || "Operando"}
                    </span>
                  </div>
                </div>

                <div className="adv-modal-field">
                  <span className="field-label">Módulo Terminal:</span>
                  <strong className="field-val">Módulo {selectedUnit.modulo || "General"}</strong>
                </div>

                <div className="adv-modal-field">
                  <span className="field-label">Nivel:</span>
                  <strong className="field-val">{selectedUnit.nivel || "Nivel 1"}</strong>
                </div>

                <div className="adv-modal-field full-width">
                  <span className="field-label">Ubicación Específica:</span>
                  <span className="field-val">{selectedUnit.ubicacion_especifica || "Edificio Terminal de Pasajeros"}</span>
                </div>

                <div className="adv-modal-field full-width">
                  <span className="field-label">Arrendatario / Razón Social:</span>
                  <strong className="field-val">{selectedUnit.arrendatario || "Publicidad AIFA"}</strong>
                </div>

                <div className="adv-modal-field full-width">
                  <span className="field-label">Contrato Comercial Asignado:</span>
                  <div className="adv-modal-contract-row">
                    <span className="contract-link-btn">{selectedUnit.contrato_id || "Sin contrato"}</span>
                    {selectedUnit.contrato_id && (
                      <button
                        type="button"
                        className="adv-modal-contract-action"
                        onClick={() => {
                          const con = selectedUnit.contrato_id;
                          setSelectedUnit(null);
                          if (onSelectContract && con) onSelectContract(con);
                        }}
                      >
                        Abrir expediente de contrato →
                      </button>
                    )}
                  </div>
                </div>

                {selectedUnit.superficie && (
                  <div className="adv-modal-field">
                    <span className="field-label">Superficie:</span>
                    <strong className="field-val">{selectedUnit.superficie} m²</strong>
                  </div>
                )}

                {selectedUnit.observaciones && (
                  <div className="adv-modal-field full-width">
                    <span className="field-label">Observaciones y Especificaciones Técnicas:</span>
                    <p className="field-obs-text">{selectedUnit.observaciones}</p>
                  </div>
                )}
              </div>
            </div>

            <footer className="adv-modal-footer">
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {canEdit && (
                  <button
                    type="button"
                    className="table-action-btn edit-local-btn"
                    onClick={() => {
                      handleOpenEditUnit(selectedUnit);
                      handleCloseUnit();
                    }}
                  >
                    ✏️ Editar Soporte
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    className="delete-local-btn"
                    onClick={() => {
                      handleDeleteUnit(selectedUnit);
                    }}
                  >
                    🗑️ Eliminar
                  </button>
                )}
              </div>
              <button
                type="button"
                className="adv-modal-primary-close"
                onClick={handleCloseUnit}
              >
                Cerrar Ficha
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: FICHA TÉCNICA DE CONVENIO DE COLABORACIÓN INSTITUCIONAL
          ========================================================================= */}
      {selectedConvenio && (
        <div className="adv-modal-overlay" onClick={() => setSelectedConvenio(null)}>
          <div className="adv-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <header className="adv-modal-header">
              <div className="adv-modal-title-wrap">
                <span className="adv-modal-big-icon" aria-hidden="true">🏛️</span>
                <div>
                  <span className="adv-modal-kicker">Convenio de Colaboración y Difusión · Registro #{selectedConvenio.no}</span>
                  <h2>{selectedConvenio.convenio}</h2>
                </div>
              </div>
              <button
                type="button"
                className="adv-modal-close-btn"
                onClick={() => setSelectedConvenio(null)}
                title="Cerrar ventana"
              >
                ✕
              </button>
            </header>

            <div className="adv-modal-body">
              <div className="adv-modal-info-grid">
                <div className="adv-modal-field full-width">
                  <span className="field-label">Dependencia o Razón Social:</span>
                  <strong className="field-val">{selectedConvenio.dependencia}</strong>
                </div>

                <div className="adv-modal-field">
                  <span className="field-label">Marca o Proyecto:</span>
                  <strong className="field-val">{selectedConvenio.marca}</strong>
                </div>

                <div className="adv-modal-field">
                  <span className="field-label">Año del Convenio:</span>
                  <strong className="field-val">{selectedConvenio.anio}</strong>
                </div>

                <div className="adv-modal-field">
                  <span className="field-label">Vigencia Oficial:</span>
                  <strong className="field-val">{selectedConvenio.vigencia}</strong>
                </div>

                <div className="adv-modal-field">
                  <span className="field-label">Fecha / Término de Renovación:</span>
                  <span className="field-val">{selectedConvenio.renovacion}</span>
                </div>

                <div className="adv-modal-field">
                  <span className="field-label">Bien o Espacio Concesionado:</span>
                  <strong className="field-val">{selectedConvenio.bienEspacio}</strong>
                </div>

                <div className="adv-modal-field">
                  <span className="field-label">Nomenclatura y Unidades:</span>
                  <strong className="field-val">{selectedConvenio.nomenclatura} ({selectedConvenio.superficieUnidades})</strong>
                </div>

                <div className="adv-modal-field full-width">
                  <span className="field-label">Ubicación en Terminal:</span>
                  <span className="field-val">{selectedConvenio.ubicacion}</span>
                </div>

                <div className="adv-modal-field full-width">
                  <span className="field-label">Bases de Colaboración / Objeto:</span>
                  <p className="field-obs-text">{selectedConvenio.basesColaboracion}</p>
                </div>

                <div className="adv-modal-field full-width">
                  <span className="field-label">Estatus Jurídico y Seguimiento:</span>
                  <div style={{ marginTop: 4 }}>
                    <span className="status-badge" style={{ "--status": selectedConvenio.statusTone } as React.CSSProperties}>
                      {selectedConvenio.estatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <footer className="adv-modal-footer">
              <button
                type="button"
                className="adv-modal-primary-close"
                onClick={() => setSelectedConvenio(null)}
              >
                Cerrar Convenio
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Formulario Modal para Agregar / Editar Espacio Publicitario */}
      <AdvertisingFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveUnit}
        initialRecord={editingUnit}
        nextDefaultId={nextAvailableUnitId}
      />
    </div>
  );
}
