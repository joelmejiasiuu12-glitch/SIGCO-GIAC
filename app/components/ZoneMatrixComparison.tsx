"use client";

import { useMemo, useState } from "react";
import { locationOptions, type LocalRecord } from "@/app/types";

type Dataset = Record<string, LocalRecord[]>;

type ZoneMetricRow = {
  id: string;
  name: string;
  shortName: string;
  recordLabel: string;
  totalCount: number;
  occupiedCount: number;
  availableCount: number;
  assignmentCount: number;
  occupancyRate: number;
  totalArea: number;
  occupiedArea: number;
  availableArea: number;
  monthlyRent: number;
  costPerM2: number | null;
  medianArea: number | null;
  averageArea: number | null;
  uniqueBrands: number;
  top3BrandShare: number | null;
  top3BrandsText: string;
  maturityStatus: "consolidated" | "maturing" | "priority_push" | "no_data";
  maturityLabel: string;
  strategicAction: string;
};

type SortField =
  | "shortName"
  | "occupancyRate"
  | "monthlyRent"
  | "costPerM2"
  | "totalArea"
  | "availableCount"
  | "medianArea"
  | "top3BrandShare";

const numberFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const integerFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const currencyFormat = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function normalized(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX");
}

function calculateMedian(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  return `"${String(value).replaceAll('"', '""')}"`;
}

export default function ZoneMatrixComparison({
  datasets,
  onSelectZone,
}: {
  datasets: Dataset;
  onSelectZone?: (locationId: string) => void;
}) {
  const [sortField, setSortField] = useState<SortField>("occupancyRate");
  const [sortAscending, setSortAscending] = useState(false);
  const [filterMaturity, setFilterMaturity] = useState<string>("all");
  const [activePopoverZoneId, setActivePopoverZoneId] = useState<string | null>(null);

  const zoneMetrics: ZoneMetricRow[] = useMemo(() => {
    return locationOptions.map((location) => {
      const records = datasets[location.id] ?? [];
      const totalCount = records.length;

      const occupiedRecords = records.filter((r) =>
        ["EN FUNCIONAMIENTO", "EN ADAPTACION", "FORMALIZADO"].includes(r.estatus),
      );
      const availableRecords = records.filter((r) => r.estatus === "DISPONIBLE");
      const assignmentRecords = records.filter((r) => r.estatus === "EN PROCESO DE ASIGNACION");

      const occupiedCount = occupiedRecords.length;
      const availableCount = availableRecords.length;
      const assignmentCount = assignmentRecords.length;
      const occupancyRate = totalCount > 0 ? (occupiedCount / totalCount) * 100 : 0;

      const totalArea = records.reduce((sum, r) => sum + (r.metraje ?? 0), 0);
      const occupiedArea = occupiedRecords.reduce((sum, r) => sum + (r.metraje ?? 0), 0);
      const availableArea = availableRecords.reduce((sum, r) => sum + (r.metraje ?? 0), 0);

      const monthlyRent = records.reduce((sum, r) => sum + (r.monthlyRent ?? 0), 0);

      const rentWithArea = records.filter((r) => (r.monthlyRent ?? 0) > 0 && (r.metraje ?? 0) > 0);
      const totalAreaWithRent = rentWithArea.reduce((sum, r) => sum + (r.metraje ?? 0), 0);
      const totalRentWithArea = rentWithArea.reduce((sum, r) => sum + (r.monthlyRent ?? 0), 0);

      const costPerM2 =
        totalAreaWithRent > 0
          ? totalRentWithArea / totalAreaWithRent
          : rentWithArea.length > 0
            ? rentWithArea.reduce((sum, r) => sum + (r.costPerM2 ?? 0), 0) / rentWithArea.length
            : null;

      const validAreas = records
        .map((r) => r.metraje)
        .filter((m): m is number => m !== null && m > 0);
      const medianArea = calculateMedian(validAreas);
      const averageArea = validAreas.length > 0 ? totalArea / validAreas.length : null;

      // Brand concentration
      const validBrandedRecords = records.filter((r) => {
        const rawBrand = String(r.marca ?? "").trim();
        const norm = normalized(rawBrand);
        return (
          norm &&
          !["n/a", "na", "sin marca", "por definir", "ninguno", "-", "pendiente", "disponible"].includes(norm)
        );
      });

      const brandMap = new Map<string, { label: string; count: number; area: number }>();
      validBrandedRecords.forEach((r) => {
        const rawBrand = String(r.marca ?? "").trim();
        const norm = normalized(rawBrand);
        const current = brandMap.get(norm) ?? { label: rawBrand, count: 0, area: 0 };
        current.count += 1;
        current.area += r.metraje ?? 0;
        brandMap.set(norm, current);
      });

      const uniqueBrands = brandMap.size;
      const sortedBrands = [...brandMap.values()].sort((a, b) => b.area - a.area || b.count - a.count);
      const top3Brands = sortedBrands.slice(0, 3);
      const top3Area = top3Brands.reduce((sum, b) => sum + b.area, 0);
      const top3BrandShare = occupiedArea > 0 && top3Brands.length > 0 ? (top3Area / occupiedArea) * 100 : (totalArea > 0 && top3Brands.length > 0 ? (top3Area / totalArea) * 100 : null);

      const top3BrandsText = top3Brands.map((b) => b.label).join(", ") || "Sin marcas tractoras";



      // Maturity classification
      let maturityStatus: ZoneMetricRow["maturityStatus"] = "no_data";
      let maturityLabel = "Sin datos";
      let strategicAction = "Completar carga de información base en el sistema.";

      if (totalCount > 0) {
        if (occupancyRate >= 80) {
          maturityStatus = "consolidated";
          maturityLabel = "Consolidada";
          strategicAction =
            "Optimizar yield de renta por m², vigilar vencimientos y exigir excelencia en calidad de servicio.";
        } else if (occupancyRate >= 50) {
          maturityStatus = "maturing";
          maturityLabel = "En Maduración";
          strategicAction =
            "Acelerar colocación de giros complementarios faltantes y consolidar marcas ancla en espacios clave.";
        } else {
          maturityStatus = "priority_push";
          maturityLabel = "Impulso Prioritario";
          strategicAction =
            "Implementar paquetes comerciales de incentivos, flexibilizar formatos o subdividir macrolocales.";
        }
      }

      return {
        id: location.id,
        name: location.name,
        shortName: location.shortName,
        recordLabel: location.recordLabel,
        totalCount,
        occupiedCount,
        availableCount,
        assignmentCount,
        occupancyRate,
        totalArea,
        occupiedArea,
        availableArea,
        monthlyRent,
        costPerM2,
        medianArea,
        averageArea,
        uniqueBrands,
        top3BrandShare,
        top3BrandsText,
        maturityStatus,
        maturityLabel,
        strategicAction,
      };
    });
  }, [datasets]);

  // Global KPIs across all 7 zones
  const systemTotals = useMemo(() => {
    const totalSpaces = zoneMetrics.reduce((sum, z) => sum + z.totalCount, 0);
    const totalOccupied = zoneMetrics.reduce((sum, z) => sum + z.occupiedCount, 0);
    const totalAvailable = zoneMetrics.reduce((sum, z) => sum + z.availableCount, 0);
    const totalArea = zoneMetrics.reduce((sum, z) => sum + z.totalArea, 0);
    const totalOccupiedArea = zoneMetrics.reduce((sum, z) => sum + z.occupiedArea, 0);
    const totalMonthlyRent = zoneMetrics.reduce((sum, z) => sum + z.monthlyRent, 0);
    const systemOccupancyRate = totalSpaces > 0 ? (totalOccupied / totalSpaces) * 100 : 0;
    const activeZonesCount = zoneMetrics.filter((z) => z.totalCount > 0).length;

    return {
      totalSpaces,
      totalOccupied,
      totalAvailable,
      totalArea,
      totalOccupiedArea,
      totalMonthlyRent,
      systemOccupancyRate,
      activeZonesCount,
    };
  }, [zoneMetrics]);

  // Sorted and filtered list
  const processedZones = useMemo(() => {
    return zoneMetrics
      .filter((zone) => {
        if (filterMaturity === "all") return true;
        return zone.maturityStatus === filterMaturity;
      })
      .sort((left, right) => {
        let lVal: number | string = left[sortField] ?? 0;
        let rVal: number | string = right[sortField] ?? 0;

        if (typeof lVal === "string" && typeof rVal === "string") {
          return sortAscending ? lVal.localeCompare(rVal, "es-MX") : rVal.localeCompare(lVal, "es-MX");
        }

        const lNum = Number(lVal);
        const rNum = Number(rVal);
        return sortAscending ? lNum - rNum : rNum - lNum;
      });
  }, [zoneMetrics, sortField, sortAscending, filterMaturity]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAscending((curr) => !curr);
    } else {
      setSortField(field);
      setSortAscending(false);
    }
  };

  const downloadMatrixCsv = () => {
    const headers = [
      "Zona Comercial",
      "Espacios Totales",
      "Espacios Ocupados",
      "Espacios Disponibles",
      "Tasa Ocupación (%)",
      "Superficie Total (m²)",
      "Superficie Ocupada (m²)",
      "Renta Mensual Total (MXN)",
      "Costo Promedio m² (MXN/m²)",
      "Formato Mediano (m²)",
      "Formato Promedio (m²)",
      "Marcas Operando",
      "Concentración Top 3 (%)",
      "Marcas Principales",
      "Estado de Madurez",
      "Acción Estratégica Recomendada",
    ];

    const rows = zoneMetrics.map((z) => [
      z.name,
      z.totalCount,
      z.occupiedCount,
      z.availableCount,
      z.occupancyRate ? numberFormat.format(z.occupancyRate) : "0",
      z.totalArea ? numberFormat.format(z.totalArea) : "0",
      z.occupiedArea ? numberFormat.format(z.occupiedArea) : "0",
      z.monthlyRent,
      z.costPerM2 !== null ? numberFormat.format(z.costPerM2) : "",
      z.medianArea !== null ? numberFormat.format(z.medianArea) : "",
      z.averageArea !== null ? numberFormat.format(z.averageArea) : "",
      z.uniqueBrands,
      z.top3BrandShare !== null ? numberFormat.format(z.top3BrandShare) : "",
      z.top3BrandsText,
      z.maturityLabel,
      z.strategicAction,
    ]);

    const csvContent = [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join(
      "\r\n",
    );

    const blob = new Blob(["\uFEFF", csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Matriz_Comparativa_7_Zonas_AIFA_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="zone-matrix-container" aria-label="Matriz Comparativa de las 7 Zonas Comerciales">
      {/* 1. Header Principal */}
      <div className="zone-matrix-header">
        <div>
          <span className="section-kicker">Comparación Matricial Lado a Lado</span>
          <h2>Diagnóstico Comparativo de las 7 Zonas Comerciales</h2>
          <p>
            Evaluación simultánea de ocupación, renta por m², formato espacial y nivel de concentración entre todos los
            polígonos del AIFA.
          </p>
        </div>
        <div className="zone-matrix-header-actions">
          <button type="button" className="zone-matrix-export-btn" onClick={downloadMatrixCsv}>
            <span>📥</span> Exportar Matriz CSV
          </button>
        </div>
      </div>

      {/* 2. KPIs Globales Consolidados */}
      <div className="zone-matrix-kpi-grid">
        <article className="zone-kpi-card tone-navy">
          <span>Ocupación Global</span>
          <strong>{numberFormat.format(systemTotals.systemOccupancyRate)}%</strong>
          <small>
            {integerFormat.format(systemTotals.totalOccupied)} de {integerFormat.format(systemTotals.totalSpaces)}{" "}
            espacios totales
          </small>
        </article>
        <article className="zone-kpi-card tone-green">
          <span>Renta Mensual Total</span>
          <strong>
            {systemTotals.totalMonthlyRent > 0 ? currencyFormat.format(systemTotals.totalMonthlyRent) : "Sin datos"}
          </strong>
          <small>Facturación fija asegurada en el sistema</small>
        </article>
        <article className="zone-kpi-card tone-teal">
          <span>Superficie Comercial</span>
          <strong>{numberFormat.format(systemTotals.totalArea)} m²</strong>
          <small>{numberFormat.format(systemTotals.totalOccupiedArea)} m² en operación efectiva</small>
        </article>
        <article className="zone-kpi-card tone-amber">
          <span>Espacios Disponibles</span>
          <strong>{integerFormat.format(systemTotals.totalAvailable)}</strong>
          <small>Inventario vacante sujeto a comercialización</small>
        </article>
      </div>

      {/* 3. Cuadrantes de Madurez Comercial */}
      <div className="zone-maturity-summary">
        <div className="zone-maturity-heading">
          <h3>Estatus de Madurez y Potencial Comercial</h3>
          <div className="zone-maturity-filters">
            <button
              type="button"
              className={filterMaturity === "all" ? "active" : ""}
              onClick={() => setFilterMaturity("all")}
            >
              Todas ({zoneMetrics.length})
            </button>
            <button
              type="button"
              className={filterMaturity === "consolidated" ? "active" : ""}
              onClick={() => setFilterMaturity("consolidated")}
            >
              🟢 Consolidadas ({zoneMetrics.filter((z) => z.maturityStatus === "consolidated").length})
            </button>
            <button
              type="button"
              className={filterMaturity === "maturing" ? "active" : ""}
              onClick={() => setFilterMaturity("maturing")}
            >
              🟡 En Maduración ({zoneMetrics.filter((z) => z.maturityStatus === "maturing").length})
            </button>
            <button
              type="button"
              className={filterMaturity === "priority_push" ? "active" : ""}
              onClick={() => setFilterMaturity("priority_push")}
            >
              🔴 Impulso Prioritario ({zoneMetrics.filter((z) => z.maturityStatus === "priority_push").length})
            </button>
          </div>
        </div>

        <div className="zone-maturity-grid">
          {zoneMetrics
            .filter((zone) => filterMaturity === "all" || zone.maturityStatus === filterMaturity)
            .map((zone) => {
              const isPopoverOpen = activePopoverZoneId === zone.id;
              return (
                <article
                  key={zone.id}
                  className={`zone-maturity-card status-${zone.maturityStatus} ${isPopoverOpen ? "active-popover" : ""}`}
                  style={{ position: "relative" }}
                  onClick={() => setActivePopoverZoneId((current) => (current === zone.id ? null : zone.id))}
                >
                  <div className="maturity-card-top">
                    <h4>{zone.shortName}</h4>
                    <span className={`maturity-status-tag ${zone.maturityStatus}`}>{zone.maturityLabel}</span>
                  </div>
                  <div className="maturity-card-metrics">
                    <div>
                      <span>Ocupación</span>
                      <strong>{numberFormat.format(zone.occupancyRate)}%</strong>
                    </div>
                    <div>
                      <span>Renta / m²</span>
                      <strong>{zone.costPerM2 !== null ? currencyFormat.format(zone.costPerM2) : "—"}</strong>
                    </div>
                    <div>
                      <span>Mediana</span>
                      <strong>{zone.medianArea !== null ? `${numberFormat.format(zone.medianArea)} m²` : "—"}</strong>
                    </div>
                    <div>
                      <span>Disponibles</span>
                      <strong>{integerFormat.format(zone.availableCount)}</strong>
                    </div>
                  </div>
                  <div className="maturity-card-action">
                    <span>Acción recomendada:</span>
                    <p>{zone.strategicAction}</p>
                  </div>
                  <button
                    type="button"
                    className="maturity-view-zone-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePopoverZoneId((current) => (current === zone.id ? null : zone.id));
                    }}
                  >
                    {isPopoverOpen ? "Ocultar análisis ▴" : "Ver análisis →"}
                  </button>

                  {isPopoverOpen && (
                    <aside
                      className="metric-analysis-popover zone-card-analysis-popover"
                      role="dialog"
                      aria-label={`Análisis de ${zone.shortName}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <header>
                        <span>ANÁLISIS DE LA ZONA</span>
                        <button
                          type="button"
                          onClick={() => setActivePopoverZoneId(null)}
                          aria-label={`Cerrar análisis de ${zone.shortName}`}
                        >
                          ×
                        </button>
                      </header>
                      <p>
                        La zona comercial <strong>{zone.shortName}</strong> presenta un estatus <strong>{zone.maturityLabel}</strong> con una tasa de ocupación del <strong>{numberFormat.format(zone.occupancyRate)}%</strong> y <strong>{integerFormat.format(zone.availableCount)}</strong> locales vacantes.
                      </p>
                      <p style={{ marginTop: "6px" }}>
                        Registra una renta promedio ponderada de <strong>{zone.costPerM2 !== null ? currencyFormat.format(zone.costPerM2) : "Sin datos"}</strong> por m² y un formato mediano de local de <strong>{zone.medianArea !== null ? `${numberFormat.format(zone.medianArea)} m²` : "Sin datos"}</strong>.
                      </p>
                      <div className="zone-popover-action">
                        <span>Acción recomendada</span>
                        <p>{zone.strategicAction}</p>
                      </div>
                    </aside>
                  )}
                </article>
              );
            })}
          {zoneMetrics.filter((zone) => filterMaturity === "all" || zone.maturityStatus === filterMaturity).length === 0 && (
            <div className="zone-matrix-empty-note" style={{ gridColumn: "1 / -1", padding: "24px" }}>
              No se encontraron zonas comerciales en la categoría de madurez seleccionada.
            </div>
          )}
        </div>
      </div>

      {/* 4. Tabla Matricial Lado a Lado Detallada */}
      <article className="zone-matrix-table-card">
        <header className="zone-matrix-table-header">
          <div>
            <h3>Matriz Comparativa Detallada de Parámetros</h3>
            <p>Haz clic en los encabezados para ordenar por cualquier parámetro comercial.</p>
          </div>
        </header>

        <div className="zone-matrix-table-wrap">
          <table className="zone-matrix-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("shortName")} className="sortable">
                  Zona Comercial {sortField === "shortName" ? (sortAscending ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("occupancyRate")} className="sortable numeric">
                  Tasa Ocupación (%) {sortField === "occupancyRate" ? (sortAscending ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("monthlyRent")} className="sortable numeric">
                  Renta Mensual Total {sortField === "monthlyRent" ? (sortAscending ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("costPerM2")} className="sortable numeric">
                  Renta / m² {sortField === "costPerM2" ? (sortAscending ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("medianArea")} className="sortable numeric">
                  Formato Mediano {sortField === "medianArea" ? (sortAscending ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("totalArea")} className="sortable numeric">
                  Superficie Total {sortField === "totalArea" ? (sortAscending ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("availableCount")} className="sortable numeric">
                  Vacantes {sortField === "availableCount" ? (sortAscending ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("top3BrandShare")} className="sortable numeric">
                  Concentración Top 3 {sortField === "top3BrandShare" ? (sortAscending ? "▲" : "▼") : ""}
                </th>
                <th>Estado de Madurez</th>
              </tr>
            </thead>
            <tbody>
              {processedZones.map((zone) => (
                <tr key={zone.id} className={`matrix-row-${zone.maturityStatus}`}>
                  <td>
                    <div className="matrix-zone-name">
                      <strong>{zone.shortName}</strong>
                      <small>{zone.name}</small>
                    </div>
                  </td>
                  <td className="numeric">
                    <div className="matrix-occupancy-cell">
                      <div className="matrix-occupancy-bar-track">
                        <div
                          className={`matrix-occupancy-bar-fill ${zone.maturityStatus}`}
                          style={{ width: `${Math.min(zone.occupancyRate, 100)}%` }}
                        />
                      </div>
                      <strong>{numberFormat.format(zone.occupancyRate)}%</strong>
                    </div>
                  </td>
                  <td className="numeric">
                    <strong>{zone.monthlyRent > 0 ? currencyFormat.format(zone.monthlyRent) : "—"}</strong>
                  </td>
                  <td className="numeric">
                    <strong>{zone.costPerM2 !== null ? currencyFormat.format(zone.costPerM2) : "—"}</strong>
                    {zone.costPerM2 !== null && <small>/ m²</small>}
                  </td>
                  <td className="numeric">
                    <strong>{zone.medianArea !== null ? `${numberFormat.format(zone.medianArea)} m²` : "—"}</strong>
                    {zone.averageArea !== null && (
                      <small>Prom: {numberFormat.format(zone.averageArea)} m²</small>
                    )}
                  </td>
                  <td className="numeric">
                    <strong>{numberFormat.format(zone.totalArea)} m²</strong>
                    <small>{numberFormat.format(zone.occupiedArea)} m² ocup.</small>
                  </td>
                  <td className="numeric">
                    <span className={`matrix-vacancy-tag ${zone.availableCount > 10 ? "high" : "normal"}`}>
                      {integerFormat.format(zone.availableCount)} vacantes
                    </span>
                  </td>
                  <td className="numeric">
                    <strong>{zone.top3BrandShare !== null ? `${numberFormat.format(zone.top3BrandShare)}%` : "—"}</strong>
                    <small title={zone.top3BrandsText}>{zone.top3BrandsText}</small>
                  </td>
                  <td>
                    <span className={`maturity-status-tag ${zone.maturityStatus}`}>{zone.maturityLabel}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {/* 5. Gráficos Comparativos Visuales Multi-Zona */}
      <div className="zone-matrix-charts-grid">
        <article className="zone-matrix-chart-card">
          <header>
            <span className="section-kicker">Comparativa de Colocación</span>
            <h3>Tasa de Ocupación por Zona Comercial (%)</h3>
          </header>
          <div className="zone-matrix-bars-list">
            {zoneMetrics
              .filter((z) => z.totalCount > 0)
              .sort((a, b) => b.occupancyRate - a.occupancyRate)
              .map((zone) => (
                <div key={zone.id} className="zone-matrix-bar-item">
                  <div className="zone-bar-labels">
                    <span>{zone.shortName}</span>
                    <strong>{numberFormat.format(zone.occupancyRate)}%</strong>
                  </div>
                  <div className="zone-bar-track">
                    <div
                      className={`zone-bar-fill ${zone.maturityStatus}`}
                      style={{ width: `${Math.min(zone.occupancyRate, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </article>

        <article className="zone-matrix-chart-card">
          <header>
            <span className="section-kicker">Comparativa de Rentabilidad</span>
            <h3>Renta Ponderada por m² ($/m² mensual)</h3>
          </header>
          <div className="zone-matrix-bars-list">
            {zoneMetrics
              .filter((z) => z.costPerM2 !== null && z.costPerM2 > 0)
              .sort((a, b) => (b.costPerM2 ?? 0) - (a.costPerM2 ?? 0))
              .map((zone) => {
                const maxCost = Math.max(...zoneMetrics.map((z) => z.costPerM2 ?? 0), 1);
                const pct = ((zone.costPerM2 ?? 0) / maxCost) * 100;
                return (
                  <div key={zone.id} className="zone-matrix-bar-item">
                    <div className="zone-bar-labels">
                      <span>{zone.shortName}</span>
                      <strong>{zone.costPerM2 !== null ? currencyFormat.format(zone.costPerM2) : "—"}</strong>
                    </div>
                    <div className="zone-bar-track">
                      <div className="zone-bar-fill cost" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            {!zoneMetrics.some((z) => (z.costPerM2 ?? 0) > 0) && (
              <p className="zone-matrix-empty-note">
                Carga la hoja de Contratos con importes de renta para generar la comparativa de rentabilidad por m².
              </p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
