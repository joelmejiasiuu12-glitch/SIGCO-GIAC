"use client";

import { useState } from "react";
import type { LocalRecord } from "@/app/types";
import { LocationIndicators } from "./DirectoryAnalytics";

const numberFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const passengerFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

const statusPalette: Record<string, string> = {
  ARRENDADOS: "#ac182c",
  "EN FUNCIONAMIENTO": "#00886f",
  DISPONIBLE: "#f28c28",
  "EN PROCESO DE ASIGNACION": "#39a9db",
  FORMALIZADO: "#8a633f",
  "EN ADAPTACION": "#f2c94c",
};

const statusInkPalette: Record<string, string> = {
  "EN FUNCIONAMIENTO": "#ffffff",
  DISPONIBLE: "#09212e",
  "EN PROCESO DE ASIGNACION": "#09212e",
  FORMALIZADO: "#ffffff",
  "EN ADAPTACION": "#09212e",
};

const statusLabels: Record<string, string> = {
  ARRENDADOS: "Arrendados",
  "EN FUNCIONAMIENTO": "Operando (En funcionamiento)",
  DISPONIBLE: "Disponibles",
  "EN PROCESO DE ASIGNACION": "En proceso de Asignación",
  FORMALIZADO: "Formalizado (sin adaptación)",
  "EN ADAPTACION": "En adaptación",
};

const leasedStatuses = ["EN FUNCIONAMIENTO", "EN ADAPTACION", "FORMALIZADO"];

const chartPalette = ["#ac182c", "#00886f", "#405364", "#0b957e", "#87929c", "#c15252", "#09212e"];

function countBy(records: LocalRecord[], key: keyof LocalRecord) {
  const counts = new Map<string, number>();
  records.forEach((record) => {
    const value = String(record[key] ?? "Sin dato").trim() || "Sin dato";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function ExecutiveKpi({ label, value }: { label: string; value: string }) {
  return (
    <article className="executive-kpi">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function DonutFigure({ data, colors = chartPalette, center }: { data: [string, number][]; colors?: string[]; center: string }) {
  const total = data.reduce((sum, [, value]) => sum + value, 0);
  const circumference = 2 * Math.PI * 44;
  let cursor = 0;
  return (
    <div className="executive-donut-layout">
        <div
          className="executive-donut"
          role="img"
          aria-label={data.map(([label, value]) => `${statusLabels[label] ?? label}, ${value}, ${total ? numberFormat.format((value / total) * 100) : 0}%`).join("; ")}
        >
          <svg viewBox="0 0 100 100" aria-hidden="true">
            {data.map(([label, value], index) => {
              const share = total ? value / total : 0;
              const offset = cursor;
              cursor += share;
              return (
                <circle
                  key={label}
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke={statusPalette[label] ?? colors[index % colors.length]}
                  strokeWidth="12"
                  strokeDasharray={`${share * circumference} ${circumference}`}
                  strokeDashoffset={-offset * circumference}
                  transform="rotate(-90 50 50)"
                  className="donut-segment"
                >
                  <title>{`${statusLabels[label] ?? label}: ${numberFormat.format(value)} (${total ? numberFormat.format(share * 100) : 0}%)`}</title>
                </circle>
              );
            })}
          </svg>
          <div><strong>{numberFormat.format(total)}</strong><span>{center}</span></div>
        </div>
        <div className="executive-legend">
          {data.slice(0, 8).map(([label, value], index) => (
            <div key={label}>
              <i style={{ background: statusPalette[label] ?? colors[index % colors.length] }} />
              <span title={statusLabels[label] ?? label}>{statusLabels[label] ?? label}</span>
              <strong><b>{numberFormat.format(value)}</b><small>{total ? numberFormat.format((value / total) * 100) : 0}%</small></strong>
            </div>
          ))}
        </div>
    </div>
  );
}

function DonutChart({ title, kicker, data, colors = chartPalette, center, wide = false }: { title: string; kicker: string; data: [string, number][]; colors?: string[]; center: string; wide?: boolean }) {
  return (
    <article className={`executive-card donut-card${wide ? " wide-chart" : ""}`}>
      <div className="executive-heading"><div><span>{kicker}</span><h2>{title}</h2></div></div>
      <DonutFigure data={data} colors={colors} center={center} />
    </article>
  );
}

function StatusDonut({
  title,
  note,
  data,
  centerLabel,
  selectedStatus,
  onSelect,
}: {
  title: string;
  note: string;
  data: [string, number][];
  centerLabel: string;
  selectedStatus: string | null;
  onSelect: (status: string) => void;
}) {
  const total = data.reduce((sum, [, value]) => sum + value, 0);
  const circumference = 2 * Math.PI * 44;
  let cursor = 0;

  return (
    <section className="status-donut-group" aria-label={title}>
      <h3>{title}</h3>
      <p className="status-donut-note">{note}</p>
      <div className="executive-donut-layout">
        <div
          className="executive-donut"
          role="img"
          aria-label={`${title}: ${data.map(([label, value]) => `${statusLabels[label]}, ${value}, ${total ? numberFormat.format((value / total) * 100) : 0}%`).join("; ")}`}
        >
          <svg viewBox="0 0 100 100" aria-hidden="true">
            {data.map(([label, value]) => {
              const share = total ? value / total : 0;
              const offset = cursor;
              cursor += share;
              return (
                <circle
                  key={label}
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke={statusPalette[label]}
                  strokeWidth="12"
                  strokeDasharray={`${share * circumference} ${circumference}`}
                  strokeDashoffset={-offset * circumference}
                  transform="rotate(-90 50 50)"
                  className="donut-segment"
                >
                  <title>{`${statusLabels[label]}: ${numberFormat.format(value)} (${total ? numberFormat.format(share * 100) : 0}%)`}</title>
                </circle>
              );
            })}
          </svg>
          <div><strong>{numberFormat.format(total)}</strong><span>{centerLabel}</span></div>
        </div>
        <div className="executive-legend interactive-legend">
          {data.map(([label, value]) => (
            <button
              key={label}
              type="button"
              className={selectedStatus === label ? "active" : ""}
              aria-pressed={selectedStatus === label}
              aria-label={`Mostrar datos de ${statusLabels[label]}`}
              onClick={() => onSelect(label)}
            >
              <i style={{ background: statusPalette[label] }} />
              <span>{statusLabels[label]}</span>
              <strong><b>{numberFormat.format(value)}</b><small>{total ? numberFormat.format((value / total) * 100) : 0}%</small></strong>
              <em>Ver datos</em>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatusOverview({ records, recordLabel, title }: { records: LocalRecord[]; recordLabel: string; title: string }) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const recordsFor = (status: string) => records.filter((record) => (
    status === "ARRENDADOS" ? leasedStatuses.includes(record.estatus) : record.estatus === status
  ));
  const commercialStatus: [string, number][] = [
    ["ARRENDADOS", recordsFor("ARRENDADOS").length],
    ["EN PROCESO DE ASIGNACION", recordsFor("EN PROCESO DE ASIGNACION").length],
    ["DISPONIBLE", recordsFor("DISPONIBLE").length],
  ];
  const leasedBreakdown: [string, number][] = [
    ["EN FUNCIONAMIENTO", recordsFor("EN FUNCIONAMIENTO").length],
    ["EN ADAPTACION", recordsFor("EN ADAPTACION").length],
    ["FORMALIZADO", recordsFor("FORMALIZADO").length],
  ];
  const selectedRecords = selectedStatus ? recordsFor(selectedStatus) : [];

  return (
    <article className="executive-card summary-status-card global-status-card">
      <div className="executive-heading">
        <div><span>Estado comercial</span><h2>{title}</h2></div>
        <small>Selecciona una categoría para consultar sus datos</small>
      </div>
      <div className="global-status-donuts">
        <StatusDonut
          title="Estatus Comercial"
          note="Arrendados, en proceso de asignación y disponibles."
          data={commercialStatus}
          centerLabel={recordLabel}
          selectedStatus={selectedStatus}
          onSelect={setSelectedStatus}
        />
        <StatusDonut
          title="Arrendados"
          note="Operando (En funcionamiento), En adaptación y Formalizado (sin adaptación)."
          data={leasedBreakdown}
          centerLabel="arrendados"
          selectedStatus={selectedStatus}
          onSelect={setSelectedStatus}
        />
      </div>
      {selectedStatus && (
        <section className="status-detail-panel" aria-live="polite">
          <div className="status-detail-heading">
            <div>
              <span className="section-kicker">Datos representados</span>
              <h3>{statusLabels[selectedStatus]}</h3>
              <p>{numberFormat.format(selectedRecords.length)} registros en esta ubicación.</p>
            </div>
            <button type="button" onClick={() => setSelectedStatus(null)} aria-label="Cerrar detalle">Cerrar</button>
          </div>
          {selectedRecords.length ? (
            <div className="status-detail-table-wrap">
              <table className="status-detail-table">
                <thead><tr><th>Nomenclatura</th><th>Marca</th><th>Ubicación</th><th>Estatus</th><th>Metraje</th></tr></thead>
                <tbody>
                  {selectedRecords.map((record, index) => {
                    const recordLocation = [...new Set([record.lado, record.area, record.modulo].filter(Boolean))].join(" · ") || "Sin dato";
                    return (
                      <tr key={`${record.id}-${index}`}>
                        <td>{record.nomenclatura || "Sin dato"}</td>
                        <td>{record.marca || "Sin dato"}</td>
                        <td>{recordLocation}</td>
                        <td>{statusLabels[record.estatus] ?? record.estatus}</td>
                        <td>{record.metraje === null ? "Sin dato" : `${numberFormat.format(record.metraje)} m²`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="status-detail-empty">No hay registros en esta categoría para la ubicación seleccionada.</p>}
        </section>
      )}
    </article>
  );
}

function VerticalBars({
  title,
  kicker,
  data,
  color = "#09212e",
  varied = false,
  totalLabel = "locales",
}: {
  title: string;
  kicker: string;
  data: [string, number][];
  color?: string;
  varied?: boolean;
  totalLabel?: string;
}) {
  const visible = data.slice(0, 18);
  const max = Math.max(...visible.map(([, value]) => value), 1);
  const total = data.reduce((sum, [, value]) => sum + value, 0);
  return (
    <article className="executive-card vertical-card">
      <div className="executive-heading">
        <div><span>{kicker}</span><h2>{title}</h2></div>
        <small>{numberFormat.format(total)} {totalLabel}</small>
      </div>
      <div className="vertical-chart" style={{ "--bar-count": visible.length } as React.CSSProperties}>
        {visible.map(([label, value], index) => {
          const percentage = total ? (value / total) * 100 : 0;
          return (
            <div className="vertical-item" key={label}>
              <div className="vertical-track">
                <span
                  title={`${label}: ${numberFormat.format(value)} ${totalLabel} (${numberFormat.format(percentage)}%)`}
                  aria-label={`${label}: ${numberFormat.format(value)} ${totalLabel}, ${numberFormat.format(percentage)}%`}
                  style={{
                    height: `${Math.max((value / max) * 100, 12)}%`,
                    background: varied ? (statusPalette[label] ?? chartPalette[index % chartPalette.length]) : color,
                    color: varied ? (statusInkPalette[label] ?? "#ffffff") : "#ffffff",
                  }}
                ><b><span>{value}</span><small>{numberFormat.format(percentage)}%</small></b></span>
              </div>
              <small title={label}>{label}</small>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function HorizontalBars({ title, kicker, data, totalLabel = "locales" }: { title: string; kicker: string; data: [string, number][]; totalLabel?: string }) {
  const max = Math.max(...data.map(([, value]) => value), 1);
  const total = data.reduce((sum, [, value]) => sum + value, 0);
  return (
    <article className="executive-card summary-horizontal-card">
      <div className="executive-heading">
        <div><span>{kicker}</span><h2>{title}</h2></div>
        <small>{numberFormat.format(total)} {totalLabel}</small>
      </div>
      <div className="summary-horizontal-bars">
        {data.map(([label, value]) => {
          const percentage = total ? (value / total) * 100 : 0;
          return (
            <div className="summary-horizontal-row" key={label}>
              <span><b title={label}>{label}</b><strong>{numberFormat.format(value)} · {numberFormat.format(percentage)}%</strong></span>
              <i aria-label={`${label}: ${numberFormat.format(value)} ${totalLabel}, ${numberFormat.format(percentage)}%`}>
                <em style={{ width: `${Math.max((value / max) * 100, 3)}%` }} />
              </i>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function SummaryDashboard({
  records,
  locationId,
  locationName,
  recordLabel,
  etpCommercialCapacity,
  onOpenDirectory,
}: {
  records: LocalRecord[];
  locationId: string;
  locationName: string;
  recordLabel: string;
  etpCommercialCapacity: number | null;
  onOpenDirectory: () => void;
}) {
  const capitalizedLabel = `${recordLabel.charAt(0).toUpperCase()}${recordLabel.slice(1)}`;
  const totalArea = records.reduce((sum, record) => sum + (record.metraje ?? 0), 0);
  const available = records.filter((record) => record.estatus === "DISPONIBLE").length;
  const operating = records.filter((record) => record.estatus === "EN FUNCIONAMIENTO").length;
  const occupancy = records.length ? operating / records.length : 0;
  const levels = countBy(records, "nivel").sort((a, b) => a[0].localeCompare(b[0], "es", { numeric: true }));
  const modules = countBy(records, "modulo").sort((a, b) => a[0].localeCompare(b[0], "es", { numeric: true }));
  const showZone = locationId === "etp" || locationId === "autobuses-plaza";
  const showLevels = ["etp", "parque-santa-lucia", "carga-aduana", "autobuses-plaza"].includes(locationId);
  const showAreaType = locationId === "etp";
  const showModules = locationId === "etp";
  const statusTitle = locationId === "calzada-mamuts" ? "Estatus por local" : `${capitalizedLabel} por estatus`;

  const availability = [...new Set(records.map((record) => record.lado || "Sin dato"))]
    .map((lado) => {
      const rows = records.filter((record) => record.lado === lado && record.estatus === "DISPONIBLE");
      return {
        lado,
        count: rows.length,
        area: rows.reduce((sum, record) => sum + (record.metraje ?? 0), 0),
      };
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <section className="executive-summary" id="resumen" aria-label="Resumen ejecutivo">
      <div className="summary-title-row">
        <div>
          <span className="section-kicker">Resumen ejecutivo</span>
          <h2>Panorama comercial</h2>
          <p>{locationName} · información calculada a partir de la base activa.</p>
        </div>
        <button className="secondary-button" type="button" onClick={onOpenDirectory}>Ver directorio</button>
      </div>

      <div className="executive-kpis">
        <ExecutiveKpi label={`Total ${recordLabel}`} value={numberFormat.format(records.length)} />
        <ExecutiveKpi label="Disponibles" value={numberFormat.format(available)} />
        <ExecutiveKpi label="Ocupación" value={`${numberFormat.format(occupancy * 100)}%`} />
        <ExecutiveKpi label="M² registrados" value={numberFormat.format(totalArea)} />
        <ExecutiveKpi label="Operando" value={numberFormat.format(operating)} />
      </div>

      {locationId === "etp" && (
        <article className="commercial-capacity-card" aria-label="Capacidad de Atención Comercial del ETP">
          <div>
            <span className="section-kicker">Indicador de atención</span>
            <h2>Capacidad de Atención Comercial</h2>
            <p>Pasajeros que puede atender la superficie comercial arrendada del ETP conforme al parámetro recomendado por la IATA.</p>
          </div>
          <div className="commercial-capacity-value">
            <strong>{etpCommercialCapacity === null ? "Sin dato" : passengerFormat.format(etpCommercialCapacity)}</strong>
            <span>Pax.</span>
            <small>Hoja CAPACIDAD · celda D2</small>
          </div>
        </article>
      )}

      <LocationIndicators locationId={locationId} records={records} />

      <div className="executive-grid">
        <StatusOverview title={statusTitle} records={records} recordLabel={recordLabel} />
        <DonutChart title="Giro comercial" kicker="Mezcla de oferta" data={countBy(records, "giroOperativo")} center={recordLabel} />
        {showZone && <DonutChart title="Distribución por zona" kicker="Implantación territorial" data={countBy(records, "lado")} center={recordLabel} colors={["#405364", "#ac182c", "#00886f"]} />}
        {showLevels && <VerticalBars title={`${capitalizedLabel} por nivel`} kicker="Implantación vertical" data={levels} color="#09212e" totalLabel={recordLabel} />}
        {showAreaType && <DonutChart title="Tipo de área" kicker="Ubicación operativa" data={countBy(records, "area")} center={recordLabel} colors={["#00886f", "#405364", "#ac182c"]} />}
        {locationId === "etp" && <DonutChart title="Tipo de local" kicker="Formato comercial" data={countBy(records, "areaComercial")} center={recordLabel} colors={["#ac182c", "#00886f", "#405364", "#b56d16", "#0b957e", "#87929c"]} wide />}
        {showModules && <HorizontalBars title={`${capitalizedLabel} por módulo`} kicker="Distribución física" data={modules} totalLabel={recordLabel} />}
      </div>

      <article className="availability-card">
        <div className="availability-heading">
          <div><span className="section-kicker">Disponibilidad por zona</span><h2>Espacios vacantes</h2></div>
          <strong>{numberFormat.format(available)} disponibles</strong>
        </div>
        {availability.length ? (
          <div className="availability-table-wrap">
            <table className="availability-table">
              <thead><tr><th>Zona comercial</th><th>{capitalizedLabel} disponibles</th><th>M² vacantes</th><th>Participación</th></tr></thead>
              <tbody>
                {availability.map((row) => (
                  <tr key={row.lado}>
                    <td><strong>{row.lado}</strong></td>
                    <td>{row.count}</td>
                    <td>{numberFormat.format(row.area)} m²</td>
                    <td>{available ? numberFormat.format((row.count / available) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="availability-empty">No hay {recordLabel} disponibles en la base activa.</p>}
      </article>
    </section>
  );
}
