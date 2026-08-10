"use client";

import { useMemo, useState } from "react";
import { locationOptions, type LocalRecord } from "@/app/types";

const numberFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const colors = ["#ac182c", "#00886f", "#405364", "#b56d16", "#8a633f", "#0b957e", "#87929c"];
const leasedStatuses = ["EN FUNCIONAMIENTO", "EN ADAPTACION", "FORMALIZADO"];
const statusColors: Record<string, string> = {
  ARRENDADOS: "#ac182c",
  "EN FUNCIONAMIENTO": "#00886f",
  DISPONIBLE: "#f28c28",
  "EN PROCESO DE ASIGNACION": "#39a9db",
  FORMALIZADO: "#8a633f",
  "EN ADAPTACION": "#f2c94c",
};
const statusLabels: Record<string, string> = {
  ARRENDADOS: "Arrendados",
  "EN FUNCIONAMIENTO": "Operando (En funcionamiento)",
  DISPONIBLE: "Disponibles",
  "EN PROCESO DE ASIGNACION": "En proceso de Asignación",
  FORMALIZADO: "Formalizado (sin adaptación)",
  "EN ADAPTACION": "En adaptación",
};
const matrixNames: Record<string, string> = {
  etp: "Edificio Terminal de Pasajeros",
  "carga-aduana": "Edificio de Servicios",
  "ciudad-aeroportuaria": "Ciudad Aeroportuaria",
  "parque-santa-lucia": "Parque Santa Lucía",
  "autobuses-plaza": "Terminal Intermodal de Transportación Terrestre",
  "calzada-mamuts": "Calzada de los Mamuts",
  "parque-revolucion": "Parque Revolución",
};

type Dataset = Record<string, LocalRecord[]>;
type Datum = [string, number];
type LocatedRecord = { locationId: string; locationName: string; record: LocalRecord };
type DetailSelection = { title: string; records: LocatedRecord[] };

function GlobalDonut({ title, kicker, data, center }: { title: string; kicker: string; data: Datum[]; center: string }) {
  const total = data.reduce((sum, [, value]) => sum + value, 0);
  const circumference = 2 * Math.PI * 44;
  let cursor = 0;
  return (
    <article className="executive-card global-chart-card">
      <div className="executive-heading"><div><span>{kicker}</span><h2>{title}</h2></div></div>
      <div className="executive-donut-layout">
        <div className="executive-donut" role="img" aria-label={`${title}: ${data.map(([label, value]) => `${label}, ${value}, ${total ? numberFormat.format((value / total) * 100) : 0}%`).join("; ")}`}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            {data.map(([label, value], index) => {
              const share = total ? value / total : 0;
              const offset = cursor;
              cursor += share;
              return (
                <circle key={label} cx="50" cy="50" r="44" fill="none" stroke={colors[index % colors.length]} strokeWidth="12"
                  strokeDasharray={`${share * circumference} ${circumference}`} strokeDashoffset={-offset * circumference}
                  transform="rotate(-90 50 50)" className="donut-segment">
                  <title>{`${label}: ${numberFormat.format(value)} (${total ? numberFormat.format((value / total) * 100) : 0}%)`}</title>
                </circle>
              );
            })}
          </svg>
          <div><strong>{numberFormat.format(total)}</strong><span>{center}</span></div>
        </div>
        <div className="executive-legend">
          {data.slice(0, 8).map(([label, value], index) => (
            <div key={label} title={`${label}: ${numberFormat.format(value)} (${total ? numberFormat.format((value / total) * 100) : 0}%)`}>
              <i style={{ background: colors[index % colors.length] }} />
              <span>{label}</span>
              <strong><b>{numberFormat.format(value)}</b><small>{total ? numberFormat.format((value / total) * 100) : 0}%</small></strong>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function GlobalSurfaceBars({ data }: { data: Datum[] }) {
  const max = Math.max(...data.map(([, value]) => value), 1);
  const total = data.reduce((sum, [, value]) => sum + value, 0);
  return (
    <article className="executive-card global-chart-card">
      <div className="executive-heading"><div><span>Escala comercial</span><h2>Superficie por Zona Comercial</h2></div><small>m²</small></div>
      <div className="global-horizontal-bars">
        {data.map(([label, value], index) => {
          const percentage = total ? (value / total) * 100 : 0;
          return (
            <div className="global-horizontal-row" key={label} title={`${label}: ${numberFormat.format(value)} m² (${numberFormat.format(percentage)}%)`}>
              <span><b>{label}</b><strong>{numberFormat.format(value)} m² · {numberFormat.format(percentage)}%</strong></span>
              <i><em style={{ width: `${Math.max((value / max) * 100, 1)}%`, background: colors[index % colors.length] }} /></i>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function StatusDonut({ title, data, centerLabel = "espacios", note, onSelect }: {
  title: string;
  data: Datum[];
  centerLabel?: string;
  note?: string;
  onSelect: (label: string) => void;
}) {
  const total = data.reduce((sum, [, value]) => sum + value, 0);
  const circumference = 2 * Math.PI * 44;
  let cursor = 0;
  return (
    <section className="status-donut-group" aria-label={title}>
      <h3>{title}</h3>
      {note && <p className="status-donut-note">{note}</p>}
      <div className="executive-donut-layout">
        <div className="executive-donut" role="img" aria-label={`${title}: ${data.map(([label, value]) => `${statusLabels[label]}, ${value}, ${total ? numberFormat.format((value / total) * 100) : 0}%`).join("; ")}`}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            {data.map(([label, value]) => {
              const share = total ? value / total : 0;
              const offset = cursor;
              cursor += share;
              return (
                <circle key={label} cx="50" cy="50" r="44" fill="none" stroke={statusColors[label]} strokeWidth="12"
                  strokeDasharray={`${share * circumference} ${circumference}`} strokeDashoffset={-offset * circumference}
                  transform="rotate(-90 50 50)" className="donut-segment">
                  <title>{`${statusLabels[label]}: ${numberFormat.format(value)} (${total ? numberFormat.format(share * 100) : 0}%)`}</title>
                </circle>
              );
            })}
          </svg>
          <div><strong>{numberFormat.format(total)}</strong><span>{centerLabel}</span></div>
        </div>
        <div className="executive-legend interactive-legend">
          {data.map(([label, value]) => (
            <button key={label} type="button" onClick={() => onSelect(label)} aria-label={`Mostrar registros de ${statusLabels[label]}`}>
              <i style={{ background: statusColors[label] }} />
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

function GlobalStatusDonuts({ records }: { records: LocatedRecord[] }) {
  const [selection, setSelection] = useState<DetailSelection | null>(null);
  const recordsFor = (label: string) => records.filter(({ record }) => label === "ARRENDADOS" ? leasedStatuses.includes(record.estatus) : record.estatus === label);
  const commercialStatus: Datum[] = [
    ["ARRENDADOS", recordsFor("ARRENDADOS").length],
    ["EN PROCESO DE ASIGNACION", recordsFor("EN PROCESO DE ASIGNACION").length],
    ["DISPONIBLE", recordsFor("DISPONIBLE").length],
  ];
  const leasedBreakdown: Datum[] = [
    ["EN FUNCIONAMIENTO", recordsFor("EN FUNCIONAMIENTO").length],
    ["EN ADAPTACION", recordsFor("EN ADAPTACION").length],
    ["FORMALIZADO", recordsFor("FORMALIZADO").length],
  ];
  const showRecords = (label: string) => setSelection({ title: statusLabels[label], records: recordsFor(label) });

  return (
    <article className="executive-card global-chart-card global-status-card">
      <div className="executive-heading"><div><span>Situación global</span><h2>Estatus Comercial Global</h2></div><small>Selecciona una categoría para consultar sus registros</small></div>
      <div className="global-status-donuts">
        <StatusDonut title="Estatus Comercial" note="Arrendados, en proceso de asignación y disponibles." data={commercialStatus} onSelect={showRecords} />
        <StatusDonut title="Arrendados" note="Desglose de los espacios arrendados por su etapa operativa y de adaptación." centerLabel="arrendados" data={leasedBreakdown} onSelect={showRecords} />
      </div>
      {selection && (
        <section className="status-detail-panel" aria-live="polite">
          <div className="status-detail-heading">
            <div><span className="section-kicker">Datos representados</span><h3>{selection.title}</h3><p>{numberFormat.format(selection.records.length)} registros en la selección actual.</p></div>
            <button type="button" onClick={() => setSelection(null)} aria-label="Cerrar detalle">Cerrar</button>
          </div>
          {selection.records.length ? (
            <div className="status-detail-table-wrap">
              <table className="status-detail-table">
                <thead><tr><th>Zona comercial</th><th>Nomenclatura</th><th>Marca</th><th>Estatus</th><th>Metraje</th></tr></thead>
                <tbody>
                  {selection.records.map(({ locationId, locationName, record }, index) => (
                    <tr key={`${locationId}-${record.id}-${index}`}>
                      <td>{locationName}</td><td>{record.nomenclatura || "Sin dato"}</td><td>{record.marca || "Sin dato"}</td>
                      <td>{statusLabels[record.estatus] ?? record.estatus}</td><td>{record.metraje === null ? "Sin dato" : `${numberFormat.format(record.metraje)} m²`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="status-detail-empty">No hay registros en esta categoría para la zona seleccionada.</p>}
        </section>
      )}
    </article>
  );
}

export default function GlobalSummary({ datasets, onSelectLocation }: { datasets: Dataset; onSelectLocation: (locationId: string) => void }) {
  const [selectedLocationId, setSelectedLocationId] = useState("all");
  const rows = useMemo(() => locationOptions.map((location) => {
    const records = datasets[location.id] ?? [];
    const operating = records.filter((record) => record.estatus === "EN FUNCIONAMIENTO").length;
    const available = records.filter((record) => record.estatus === "DISPONIBLE").length;
    const leased = records.filter((record) => leasedStatuses.includes(record.estatus)).length;
    const formalization = records.filter((record) => record.estatus === "EN PROCESO DE ASIGNACION").length;
    const area = records.reduce((sum, record) => sum + (record.metraje ?? 0), 0);
    return { id: location.id, name: matrixNames[location.id] ?? location.name, records, operating, available, leased, formalization, area };
  }), [datasets]);
  const visibleRows = selectedLocationId === "all" ? rows : rows.filter((row) => row.id === selectedLocationId);
  const locatedRecords = useMemo(() => visibleRows.flatMap((row) => row.records.map((record) => ({ locationId: row.id, locationName: row.name, record }))), [visibleRows]);
  const allRecords = locatedRecords.map(({ record }) => record);
  const operating = visibleRows.reduce((sum, row) => sum + row.operating, 0);
  const available = visibleRows.reduce((sum, row) => sum + row.available, 0);
  const totalArea = visibleRows.reduce((sum, row) => sum + row.area, 0);
  const inventory = visibleRows.map((row) => [row.name, row.records.length] as Datum);
  const surface = visibleRows.map((row) => [row.name, row.area] as Datum).sort((a, b) => b[1] - a[1]);

  return (
    <section className="executive-summary global-summary" id="resumen-global" aria-label="Resumen global">
      <div className="summary-title-row global-summary-title">
        <div><span className="section-kicker">Resumen global</span><h2>Panorama de las 7 zonas comerciales en SSC</h2><p>Indicadores consolidados de todo el polígono comercial del aeropuerto.</p></div>
        <label className="global-location-filter">
          <span>Zona comercial</span>
          <select value={selectedLocationId} onChange={(event) => setSelectedLocationId(event.target.value)} aria-label="Filtrar Resumen Global por zona comercial">
            <option value="all">Todas las ubicaciones</option>
            {locationOptions.map((location) => <option key={location.id} value={location.id}>{matrixNames[location.id] ?? location.name}</option>)}
          </select>
        </label>
      </div>
      <div className="executive-kpis">
        <article className="executive-kpi"><strong>{numberFormat.format(allRecords.length)}</strong><span>Total de espacios</span></article>
        <article className="executive-kpi"><strong>{numberFormat.format(operating)}</strong><span>Operando</span></article>
        <article className="executive-kpi"><strong>{numberFormat.format(available)}</strong><span>Disponibles</span></article>
        <article className="executive-kpi"><strong>{allRecords.length ? numberFormat.format((operating / allRecords.length) * 100) : 0}%</strong><span>Ocupación global</span></article>
        <article className="executive-kpi"><strong>{numberFormat.format(totalArea)}</strong><span>M² registrados</span></article>
      </div>
      <div className="executive-grid">
        <GlobalDonut title="Distribución de Espacios Comerciales" kicker="Participación por Zona" data={inventory} center="espacios" />
        <GlobalSurfaceBars data={surface} />
        <GlobalStatusDonuts key={selectedLocationId} records={locatedRecords} />
      </div>
      <article className="availability-card global-matrix-card">
        <div className="availability-heading"><div><span className="section-kicker">Matriz operativa</span><h2>Consulta rápida por zona</h2></div><strong>{visibleRows.length === 1 ? "1 zona comercial" : "7 zonas comerciales"}</strong></div>
        <div className="availability-table-wrap">
          <table className="availability-table global-matrix">
            <thead><tr><th>Zona comercial</th><th>Arrendados</th><th>En proceso de asignación</th><th>Disponibles</th><th>Total de espacios</th><th>Metraje total</th><th>Ocupación</th></tr></thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id} role="button" tabIndex={0} title={`Abrir la vista interactiva de ${row.name}`}
                  onClick={() => onSelectLocation(row.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelectLocation(row.id); }}>
                  <td><strong>{row.name}</strong><small>Abrir vista interactiva →</small></td>
                  <td>{numberFormat.format(row.leased)}</td><td>{numberFormat.format(row.formalization)}</td><td>{numberFormat.format(row.available)}</td>
                  <td>{numberFormat.format(row.records.length)}</td><td>{numberFormat.format(row.area)} m²</td>
                  <td>{row.records.length ? numberFormat.format((row.operating / row.records.length) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
