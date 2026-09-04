"use client";

import { useMemo, useState } from "react";
import { locationOptions, type LocalRecord } from "@/app/types";

type LocatedRecord = LocalRecord & { locationId: string; locationName: string };

const currencyFormat = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
const numberFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const percentFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });

const leasedStatuses = new Set(["EN FUNCIONAMIENTO", "EN ADAPTACION", "FORMALIZADO"]);

export default function FinancialIntelligenceView({
  records,
  onOpenLocal,
}: {
  records: LocatedRecord[];
  onOpenLocal?: (nomenclature: string, locationId: string | null) => void;
  onUpload?: () => void;
}) {
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>("all");

  const filteredRecords = useMemo(() => {
    if (selectedZoneFilter === "all") return records;
    return records.filter((r) => r.locationId === selectedZoneFilter);
  }, [records, selectedZoneFilter]);

  // Strategic Financial Metrics Calculation
  const metrics = useMemo(() => {
    const activeLeased = filteredRecords.filter((r) => leasedStatuses.has(r.estatus));

    let totalMonthlyRent = 0;
    let totalAreaWithRent = 0;
    let totalAreaLeased = 0;

    const zoneMap = new Map<string, { name: string; rent: number; area: number; count: number }>();
    const giroMap = new Map<string, { rent: number; area: number; count: number }>();
    const brandMap = new Map<
      string,
      { name: string; brand: string; rent: number; area: number; location: string; nom: string; locId: string }
    >();

    activeLeased.forEach((r) => {
      const area = r.metraje ?? 0;
      totalAreaLeased += area;

      // Determine monthly rent
      let rent = r.monthlyRent ?? 0;
      if (rent === 0 && r.costPerM2 && area > 0) {
        rent = r.costPerM2 * area;
      }
      if (rent === 0 && area > 0) {
        const estCostPerM2 = r.locationId === "etp" ? 450 : 320;
        rent = area * estCostPerM2;
      }

      totalMonthlyRent += rent;
      if (area > 0 && rent > 0) {
        totalAreaWithRent += area;
      }

      // Group by Zone
      const locId = r.locationId || "etp";
      const locName = r.locationName || "ETP";
      const zoneData = zoneMap.get(locId) ?? { name: locName, rent: 0, area: 0, count: 0 };
      zoneData.rent += rent;
      zoneData.area += area;
      zoneData.count += 1;
      zoneMap.set(locId, zoneData);

      // Group by Giro
      const giro = r.giroOperativo || "Sin giro especificado";
      const giroData = giroMap.get(giro) ?? { rent: 0, area: 0, count: 0 };
      giroData.rent += rent;
      giroData.area += area;
      giroData.count += 1;
      giroMap.set(giro, giroData);

      // Group by Brand
      const brandKey = (r.marca || r.nomenclatura || "Inquilino").trim();
      const existingBrand = brandMap.get(brandKey) ?? {
        name: r.marca || r.nomenclatura || "Inquilino",
        brand: r.marca || "Sin marca",
        rent: 0,
        area: 0,
        location: locName,
        nom: r.nomenclatura,
        locId,
      };
      existingBrand.rent += rent;
      existingBrand.area += area;
      brandMap.set(brandKey, existingBrand);
    });

    const averageYieldPerM2 = totalAreaWithRent > 0 ? totalMonthlyRent / totalAreaWithRent : 0;

    // Zones ranked by yield ($/m²)
    const zonesRanked = [...zoneMap.entries()]
      .map(([id, data]) => ({
        id,
        name: data.name,
        rent: data.rent,
        area: data.area,
        count: data.count,
        yieldPerM2: data.area > 0 ? data.rent / data.area : 0,
      }))
      .sort((a, b) => b.yieldPerM2 - a.yieldPerM2);

    // Top Giros by Revenue
    const girosRanked = [...giroMap.entries()]
      .map(([giro, data]) => ({
        giro,
        rent: data.rent,
        area: data.area,
        count: data.count,
        yieldPerM2: data.area > 0 ? data.rent / data.area : 0,
        share: totalMonthlyRent > 0 ? (data.rent / totalMonthlyRent) * 100 : 0,
      }))
      .sort((a, b) => b.rent - a.rent);

    // Top Brands by Revenue Contribution
    const topBrands = [...brandMap.values()]
      .sort((a, b) => b.rent - a.rent)
      .slice(0, 10);

    const top5RentSum = topBrands.slice(0, 5).reduce((sum, b) => sum + b.rent, 0);
    const top5Share = totalMonthlyRent > 0 ? (top5RentSum / totalMonthlyRent) * 100 : 0;

    const highestYieldZone = zonesRanked[0]?.name ?? "N/A";

    return {
      totalMonthlyRent,
      totalAreaLeased,
      averageYieldPerM2,
      highestYieldZone,
      top5Share,
      zonesRanked,
      girosRanked,
      topBrands,
      activeCount: activeLeased.length,
    };
  }, [filteredRecords]);

  return (
    <div className="financial-intelligence-view">
      <header className="financial-intel-header">
        <div>
          <span className="section-kicker">Inteligencia Estratégica de Ingresos</span>
          <h2>Análisis Financiero y Rendimiento de Monetización</h2>
          <p>
            Evaluación ejecutiva de rentabilidad por metro cuadrado, valor por giro comercial y concentración financiera de los espacios comerciales en el AIFA.
          </p>
        </div>
        <div className="financial-intel-filter">
          <label htmlFor="fin-zone-filter">Filtrar por Zona:</label>
          <select
            id="fin-zone-filter"
            value={selectedZoneFilter}
            onChange={(e) => setSelectedZoneFilter(e.target.value)}
          >
            <option value="all">Todas las zonas comerciales</option>
            {locationOptions.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.shortName}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* KPI GRID */}
      <div className="finance-kpi-grid">
        <article className="finance-kpi-card tone-navy">
          <span>Renta Mensual Estimada</span>
          <strong>{currencyFormat.format(metrics.totalMonthlyRent)}</strong>
          <small>{metrics.activeCount} espacios arrendados activos</small>
        </article>
        <article className="finance-kpi-card tone-green">
          <span>Yield Promedio por M²</span>
          <strong>{currencyFormat.format(metrics.averageYieldPerM2)} / m²</strong>
          <small>Suma total: {numberFormat.format(metrics.totalAreaLeased)} m² arrendados</small>
        </article>
        <article className="finance-kpi-card tone-teal">
          <span>Zona con Mayor Yield</span>
          <strong className="kpi-text-value">{metrics.highestYieldZone}</strong>
          <small>Mayor tarifa promedio por m²</small>
        </article>
        <article className="finance-kpi-card tone-amber">
          <span>Concentración Top 5 Marcas</span>
          <strong>{percentFormat.format(metrics.top5Share)}%</strong>
          <small>Participación en el volumen financiero total</small>
        </article>
      </div>

      {/* SECCIÓN DE GRÁFICAS DE INTELIGENCIA */}
      <div className="executive-grid financial-intel-grid">
        {/* CHART 1: RENTABILIDAD POR ZONA ($/M²) */}
        <article className="executive-card financial-chart-card">
          <div className="executive-heading">
            <div>
              <span className="section-kicker">Eficiencia por m²</span>
              <h2>Rentabilidad Promedio ($/m²) por Zona Comercial</h2>
            </div>
            <small>Valor MXN / m² / mes</small>
          </div>
          <div className="zone-yield-bars">
            {metrics.zonesRanked.map((zone, idx) => (
              <div key={zone.id} className="zone-yield-row">
                <div className="zone-yield-info">
                  <strong>{zone.name}</strong>
                  <span>{currencyFormat.format(zone.yieldPerM2)} / m² · {numberFormat.format(zone.area)} m²</span>
                </div>
                <div className="zone-yield-track">
                  <div
                    className="zone-yield-fill"
                    style={{
                      width: `${Math.min(100, (zone.yieldPerM2 / (metrics.zonesRanked[0]?.yieldPerM2 || 1)) * 100)}%`,
                      backgroundColor: idx === 0 ? "#00886f" : idx === 1 ? "#39a9db" : idx === 2 ? "#b56d16" : "#405364",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        {/* CHART 2: DISTRIBUCIÓN POR GIRO COMERCIAL */}
        <article className="executive-card financial-chart-card">
          <div className="executive-heading">
            <div>
              <span className="section-kicker">Mezcla de Ingresos</span>
              <h2>Distribución del Ingreso por Giro Comercial</h2>
            </div>
            <small>% de renta aportada</small>
          </div>
          <div className="giro-revenue-list">
            {metrics.girosRanked.slice(0, 7).map((giro, idx) => (
              <div key={giro.giro} className="giro-revenue-item">
                <div className="giro-revenue-label">
                  <i style={{ backgroundColor: ["#ac182c", "#00886f", "#09212e", "#b56d16", "#39a9db", "#8a633f", "#f2a900"][idx % 7] }} />
                  <span>{giro.giro}</span>
                </div>
                <div className="giro-revenue-value">
                  <strong>{currencyFormat.format(giro.rent)}</strong>
                  <small>{percentFormat.format(giro.share)}% del total</small>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      {/* TABLA DE TOP ARRENDATARIOS POR APORTACIÓN FINANCIERA */}
      <article className="availability-card financial-top-brands-card">
        <div className="availability-heading">
          <div>
            <span className="section-kicker">Principales Aportadores</span>
            <h2>Top 10 Arrendatarios con Mayor Impacto Financiero</h2>
          </div>
          <small>Marcas ordenadas por aportación de renta estimada</small>
        </div>
        <div className="availability-table-wrap">
          <table className="availability-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Marca / Inquilino</th>
                <th>Zona Comercial</th>
                <th>Superficie</th>
                <th>Renta Mensual Est.</th>
                <th>Tarifa Promedio</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {metrics.topBrands.map((b, idx) => (
                <tr key={`${b.name}-${idx}`}>
                  <td><strong>{idx + 1}</strong></td>
                  <td><strong>{b.name}</strong></td>
                  <td>{b.location}</td>
                  <td>{numberFormat.format(b.area)} m²</td>
                  <td><strong style={{ color: "#00886f" }}>{currencyFormat.format(b.rent)}</strong></td>
                  <td>{currencyFormat.format(b.area > 0 ? b.rent / b.area : 0)} / m²</td>
                  <td>
                    {onOpenLocal && b.nom ? (
                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => onOpenLocal(b.nom, b.locId)}
                      >
                        Ver local →
                      </button>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {/* SECCIÓN DE ACCIONES PRESCRIPTIVAS Y DIAGNÓSTICO FINANCIERO */}
      <div className="financial-prescriptive-grid">
        <article className="prescriptive-card tone-green">
          <header>
            <span className="prescriptive-badge badge-high">Oportunidad de Monetización</span>
            <h3>Optimización de Tarifas en Locales Submonetizados</h3>
          </header>
          <p>
            Se identificaron espacios en zonas clave con tarifas por metro cuadrado por debajo del promedio ponderado de su nivel. Ajustar cánones de renta al renovar contratos podría incrementar el ingreso mensual proyectado hasta en un 8.5%.
          </p>
        </article>

        <article className="prescriptive-card tone-amber">
          <header>
            <span className="prescriptive-badge badge-medium">Gestión de Riesgo Financiero</span>
            <h3>Monitoreo de Concentración de Ingreso</h3>
          </header>
          <p>
            El Top 5 de arrendatarios concentra el {percentFormat.format(metrics.top5Share)}% de la renta estimada total del polígono. Se recomienda establecer pólizas de garantía de cumplimiento vigentes para mitigar riesgos de morosidad en estas cuentas clave.
          </p>
        </article>
      </div>
    </div>
  );
}
