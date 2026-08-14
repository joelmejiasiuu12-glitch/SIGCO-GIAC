"use client";

import { useState } from "react";
import type { EtpCommercialCapacityData, LocalRecord, PassengerTrafficRecord } from "@/app/types";
import { LocationIndicators } from "./DirectoryAnalytics";

const numberFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const passengerFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const currencyFormat = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

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

type VacancyFact = {
  label: string;
  value: string;
  records: LocalRecord[];
};

type VacancyInsight = {
  headline: string;
  narrative: string;
  facts: VacancyFact[];
};

type ModuleOpportunity = {
  moduleName: string;
  available: number;
  availableArea: number;
  vacancyRate: number;
  priority: "Alta" | "Media" | "Puntual";
  records: LocalRecord[];
};

type ModuleInsight = {
  narrative: string;
  opportunities: ModuleOpportunity[];
  performanceNarrative: string;
  matrix: ModulePerformance[];
  medianOccupancy: number;
  medianRentPerM2: number;
  financialCoverage: number;
};

type ModulePerformance = {
  moduleName: string;
  monthlyRent: number;
  occupancy: number;
  rentPerM2: number | null;
  knownRents: number;
  category: "star" | "risk" | "potential" | "attention";
  records: LocalRecord[];
};

type PortfolioField = "giroOperativo" | "lado" | "nivel" | "area";
type PortfolioAnalysisKind = "giro" | "zona" | "nivel" | "area";

type PortfolioInsight = {
  title: string;
  metrics: { label: string; value: string }[];
  narrative: string;
};

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

function DonutFigure({
  data,
  colors = chartPalette,
  center,
  selectedLabel,
  onSelect,
}: {
  data: [string, number][];
  colors?: string[];
  center: string;
  selectedLabel?: string | null;
  onSelect?: (label: string) => void;
}) {
  const total = data.reduce((sum, [, value]) => sum + value, 0);
  const circumference = 2 * Math.PI * 44;
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
              const offset = total
                ? data.slice(0, index).reduce((sum, [, previousValue]) => sum + previousValue, 0) / total
                : 0;
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
        <div className={`executive-legend${onSelect ? " portfolio-selectable-legend" : ""}`}>
          {data.slice(0, 8).map(([label, value], index) => {
            const content = (
              <>
              <i style={{ background: statusPalette[label] ?? colors[index % colors.length] }} />
              <span title={statusLabels[label] ?? label}>{statusLabels[label] ?? label}</span>
              <strong><b>{numberFormat.format(value)}</b><small>{total ? numberFormat.format((value / total) * 100) : 0}%</small></strong>
              {onSelect && <em>Analizar</em>}
              </>
            );
            return onSelect ? (
              <button
                type="button"
                className={selectedLabel === label ? "active" : ""}
                key={label}
                onClick={() => onSelect(label)}
                aria-pressed={selectedLabel === label}
                aria-label={`Analizar ${statusLabels[label] ?? label}`}
              >{content}</button>
            ) : <div key={label}>{content}</div>;
          })}
        </div>
    </div>
  );
}

function AnalysisToggle({ open, label, onClick }: { open: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`chart-analysis-toggle${open ? " active" : ""}`}
      onClick={onClick}
      aria-expanded={open}
      aria-label={`${open ? "Ocultar" : "Mostrar"} análisis de ${label}`}
      title={`${open ? "Ocultar" : "Mostrar"} análisis`}
    >i</button>
  );
}

function DonutChart({
  title,
  kicker,
  data,
  colors = chartPalette,
  center,
  wide = false,
  analysis,
}: {
  title: string;
  kicker: string;
  data: [string, number][];
  colors?: string[];
  center: string;
  wide?: boolean;
  analysis?: { records: LocalRecord[]; field: PortfolioField; kind: PortfolioAnalysisKind };
}) {
  const [selectedLabel, setSelectedLabel] = useState<string | null>(data[0]?.[0] ?? null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const effectiveLabel = selectedLabel && data.some(([label]) => label === selectedLabel)
    ? selectedLabel
    : data[0]?.[0] ?? null;
  const insight = analysis && effectiveLabel
    ? buildPortfolioInsight(analysis.records, analysis.field, effectiveLabel, data, analysis.kind)
    : null;
  return (
    <article className={`executive-card donut-card${wide ? " wide-chart" : ""}`}>
      <div className="executive-heading">
        <div><span>{kicker}</span><h2>{title}</h2></div>
        {analysis && <AnalysisToggle open={analysisOpen} label={title} onClick={() => setAnalysisOpen((current) => !current)} />}
      </div>
      <DonutFigure data={data} colors={colors} center={center} selectedLabel={effectiveLabel} onSelect={analysis && analysisOpen ? setSelectedLabel : undefined} />
      {analysisOpen && insight && <PortfolioAnalysisCard insight={insight} />}
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
            {data.map(([label, value], index) => {
              const share = total ? value / total : 0;
              const offset = total
                ? data.slice(0, index).reduce((sum, [, previousValue]) => sum + previousValue, 0) / total
                : 0;
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
  analysis,
}: {
  title: string;
  kicker: string;
  data: [string, number][];
  color?: string;
  varied?: boolean;
  totalLabel?: string;
  analysis?: { records: LocalRecord[]; field: PortfolioField; kind: PortfolioAnalysisKind };
}) {
  const visible = data.slice(0, 18);
  const max = Math.max(...visible.map(([, value]) => value), 1);
  const total = data.reduce((sum, [, value]) => sum + value, 0);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(visible[0]?.[0] ?? null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const effectiveLabel = selectedLabel && visible.some(([label]) => label === selectedLabel)
    ? selectedLabel
    : visible[0]?.[0] ?? null;
  const insight = analysis && effectiveLabel
    ? buildPortfolioInsight(analysis.records, analysis.field, effectiveLabel, data, analysis.kind)
    : null;
  return (
    <article className="executive-card vertical-card">
      <div className="executive-heading">
        <div><span>{kicker}</span><h2>{title}</h2></div>
        <div className="chart-heading-actions">
          <small>{numberFormat.format(total)} {totalLabel}</small>
          {analysis && <AnalysisToggle open={analysisOpen} label={title} onClick={() => setAnalysisOpen((current) => !current)} />}
        </div>
      </div>
      <div className="vertical-chart" style={{ "--bar-count": visible.length } as React.CSSProperties}>
        {visible.map(([label, value], index) => {
          const percentage = total ? (value / total) * 100 : 0;
          const content = (
            <>
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
            </>
          );
          return analysis && analysisOpen ? (
            <button
              type="button"
              className={`vertical-item selectable${effectiveLabel === label ? " active" : ""}`}
              key={label}
              onClick={() => setSelectedLabel(label)}
              aria-pressed={effectiveLabel === label}
              aria-label={`Analizar nivel ${label}`}
            >{content}</button>
          ) : <div className="vertical-item" key={label}>{content}</div>;
        })}
      </div>
      {analysisOpen && insight && <PortfolioAnalysisCard insight={insight} />}
    </article>
  );
}

function HorizontalBars({
  title,
  kicker,
  data,
  totalLabel = "locales",
  analysis,
}: {
  title: string;
  kicker: string;
  data: [string, number][];
  totalLabel?: string;
  analysis?: ModuleInsight | null;
}) {
  const max = Math.max(...data.map(([, value]) => value), 1);
  const total = data.reduce((sum, [, value]) => sum + value, 0);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const selectedModuleData = analysis
    ? [...analysis.matrix, ...analysis.opportunities].find((item) => item.moduleName === selectedModule) ?? null
    : null;
  const maxModuleRent = Math.max(...(analysis?.matrix.map((item) => item.monthlyRent) ?? []), 1);
  const matrixQuadrants: { category: ModulePerformance["category"]; title: string; note: string }[] = [
    { category: "potential", title: "Potencial de optimización", note: "Alta ocupación · menor $/m²" },
    { category: "star", title: "Módulos estrella", note: "Alta ocupación · alto $/m²" },
    { category: "attention", title: "Atención prioritaria", note: "Baja ocupación · menor $/m²" },
    { category: "risk", title: "Rentables con riesgo", note: "Baja ocupación · alto $/m²" },
  ];
  return (
    <article className="executive-card summary-horizontal-card">
      <div className="executive-heading">
        <div><span>{kicker}</span><h2>{title}</h2></div>
        <div className="chart-heading-actions">
          <small>{numberFormat.format(total)} {totalLabel}</small>
          {analysis && <AnalysisToggle open={analysisOpen} label={title} onClick={() => setAnalysisOpen((current) => !current)} />}
        </div>
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
      {analysisOpen && analysis && (
        <aside className="inventory-analysis module-analysis" aria-label="Análisis comercial por módulo">
          <header>
            <div><span>Análisis automático</span><strong>Análisis integral por módulo</strong></div>
            <small>Renta + ocupación + vacancia</small>
          </header>
          <p>{analysis.performanceNarrative}</p>
          {analysis.matrix.length ? (
            <div className="module-bcg-wrap">
              <div className="module-bcg-y-label"><span>Ocupación alta</span><span>Ocupación baja</span></div>
              <div className="module-bcg-matrix">
                {matrixQuadrants.map((quadrant) => {
                  const quadrantModules = analysis.matrix
                    .filter((item) => item.category === quadrant.category)
                    .sort((a, b) => b.monthlyRent - a.monthlyRent);
                  return (
                    <section data-category={quadrant.category} key={quadrant.category}>
                      <header><div><strong>{quadrant.title}</strong><span>{quadrant.note}</span></div><b>{quadrantModules.length}</b></header>
                      <div className="module-bcg-items">
                        {quadrantModules.slice(0, 5).map((item) => (
                          <button
                            type="button"
                            className={selectedModule === item.moduleName ? "active" : ""}
                            key={`${quadrant.category}-${item.moduleName}`}
                            onClick={() => setSelectedModule((current) => current === item.moduleName ? null : item.moduleName)}
                            aria-expanded={selectedModule === item.moduleName}
                            title={`${item.moduleName}: ${currencyFormat.format(item.monthlyRent)} mensuales, ${numberFormat.format(item.occupancy)}% de ocupación`}
                          >
                            <b style={{ "--module-bubble": `${24 + (item.monthlyRent / maxModuleRent) * 16}px` } as React.CSSProperties}>{item.moduleName}</b>
                            <span><strong>{currencyFormat.format(item.rentPerM2 ?? 0)}/m²</strong><small>{numberFormat.format(item.occupancy)}% ocup.</small></span>
                          </button>
                        ))}
                        {quadrantModules.length > 5 && <small className="module-bcg-more">+{quadrantModules.length - 5} módulos</small>}
                        {!quadrantModules.length && <small className="module-bcg-empty">Sin módulos en este cuadrante</small>}
                      </div>
                    </section>
                  );
                })}
              </div>
              <div className="module-bcg-x-label"><span>Menor renta por m²</span><strong>Renta mensual por m²</strong><span>Mayor renta por m²</span></div>
            </div>
          ) : (
            <p className="module-finance-empty">No hay rentas mensuales válidas de locales en funcionamiento para clasificar el desempeño por módulo.</p>
          )}
          {analysis.opportunities.length > 0 && (
            <section className="module-vacancy-priority">
              <header><span>Inventario disponible</span><strong>Prioridad de comercialización</strong></header>
              <p>{analysis.narrative}</p>
              <div className="module-priority-list">
                {analysis.opportunities.map((item, index) => (
                  <button
                    type="button"
                    className={selectedModule === item.moduleName ? "active" : ""}
                    key={item.moduleName}
                    onClick={() => setSelectedModule((current) => current === item.moduleName ? null : item.moduleName)}
                    aria-expanded={selectedModule === item.moduleName}
                    aria-label={`Consultar espacios vacantes del módulo ${item.moduleName}`}
                  >
                    <b>{index + 1}</b>
                    <div><strong>{item.moduleName}</strong><span>{numberFormat.format(item.available)} vacantes · {numberFormat.format(item.availableArea)} m²</span></div>
                    <em data-priority={item.priority.toLowerCase()}>{item.priority}</em>
                  </button>
                ))}
              </div>
            </section>
          )}
          <small className="module-analysis-method">Cobertura financiera: {numberFormat.format(analysis.financialCoverage)}% de los locales en funcionamiento cuentan con renta mensual registrada. Los cuadrantes se dividen con las medianas del inventario comparable: {currencyFormat.format(analysis.medianRentPerM2)}/m² y {numberFormat.format(analysis.medianOccupancy)}% de ocupación. El tamaño del módulo representa su renta mensual total registrada.</small>
          {selectedModuleData && (
            <SpacePreviewPanel
              title={`Módulo ${selectedModuleData.moduleName}`}
              records={selectedModuleData.records}
              onClose={() => setSelectedModule(null)}
            />
          )}
        </aside>
      )}
    </article>
  );
}

function buildPortfolioInsight(
  records: LocalRecord[],
  field: PortfolioField,
  selectedLabel: string,
  data: [string, number][],
  kind: PortfolioAnalysisKind,
): PortfolioInsight {
  const selectedRecords = records.filter((record) => {
    const label = String(record[field] ?? "Sin dato").trim() || "Sin dato";
    return label === selectedLabel;
  });
  const operating = selectedRecords.filter((record) => record.estatus === "EN FUNCIONAMIENTO");
  const available = selectedRecords.filter((record) => record.estatus === "DISPONIBLE");
  const selectedArea = selectedRecords.reduce((sum, record) => sum + (record.metraje ?? 0), 0);
  const availableArea = available.reduce((sum, record) => sum + (record.metraje ?? 0), 0);
  const totalArea = records.reduce((sum, record) => sum + (record.metraje ?? 0), 0);
  const share = records.length ? (selectedRecords.length / records.length) * 100 : 0;
  const areaShare = totalArea ? (selectedArea / totalArea) * 100 : 0;
  const occupancy = selectedRecords.length ? (operating.length / selectedRecords.length) * 100 : 0;
  const vacancy = selectedRecords.length ? (available.length / selectedRecords.length) * 100 : 0;
  const uniqueGiros = new Set(
    selectedRecords
      .map((record) => String(record.giroOperativo ?? "").trim())
      .filter(Boolean),
  ).size;
  const uniqueBrands = new Set(
    selectedRecords
      .map((record) => String(record.marca ?? "").trim().toLocaleLowerCase("es-MX"))
      .filter(Boolean),
  ).size;
  const topTwoCount = [...data]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .reduce((sum, [, value]) => sum + value, 0);
  const topTwoShare = records.length ? (topTwoCount / records.length) * 100 : 0;

  if (kind === "giro") {
    return {
      title: `Lectura de ${selectedLabel}`,
      metrics: [
        { label: "Concentración Top 2", value: `${numberFormat.format(topTwoShare)}%` },
        { label: "Ocupación del giro", value: `${numberFormat.format(occupancy)}%` },
        { label: "Participación en m²", value: `${numberFormat.format(areaShare)}%` },
      ],
      narrative: `${selectedLabel} representa ${numberFormat.format(share)}% del inventario y ${numberFormat.format(areaShare)}% de la superficie registrada. ${numberFormat.format(operating.length)} de sus ${numberFormat.format(selectedRecords.length)} espacios están en funcionamiento y ${numberFormat.format(available.length)} permanecen disponibles. Los dos giros principales concentran ${numberFormat.format(topTwoShare)}% de los locales, una referencia directa para vigilar el equilibrio del Tenant Mix.`,
    };
  }

  if (kind === "zona") {
    return {
      title: `Lectura de la zona ${selectedLabel}`,
      metrics: [
        { label: "Peso de la zona", value: `${numberFormat.format(share)}%` },
        { label: "Ocupación", value: `${numberFormat.format(occupancy)}%` },
        { label: "Superficie vacante", value: `${numberFormat.format(availableArea)} m²` },
      ],
      narrative: `${selectedLabel} reúne ${numberFormat.format(selectedRecords.length)} espacios y ${numberFormat.format(selectedArea)} m², equivalentes al ${numberFormat.format(share)}% del inventario activo. Registra ${numberFormat.format(available.length)} vacantes con ${numberFormat.format(availableArea)} m² disponibles y una diversidad de ${numberFormat.format(uniqueGiros)} giros; estos datos permiten valorar su equilibrio comercial sin atribuir todavía afluencia de pasajeros.`,
    };
  }

  if (kind === "nivel") {
    return {
      title: `Lectura del nivel ${selectedLabel}`,
      metrics: [
        { label: "Concentración vertical", value: `${numberFormat.format(share)}%` },
        { label: "Vacancia del nivel", value: `${numberFormat.format(vacancy)}%` },
        { label: "Superficie disponible", value: `${numberFormat.format(availableArea)} m²` },
      ],
      narrative: `El nivel ${selectedLabel} concentra ${numberFormat.format(share)}% de los espacios y ${numberFormat.format(areaShare)}% de la superficie registrada. Tiene ${numberFormat.format(available.length)} vacantes de ${numberFormat.format(selectedRecords.length)} locales, equivalentes a una vacancia interna de ${numberFormat.format(vacancy)}%. La combinación de concentración y m² disponibles permite distinguir consolidación de acumulación de inventario pendiente.`,
    };
  }

  return {
    title: `Lectura del área ${selectedLabel}`,
    metrics: [
      { label: "Peso del área", value: `${numberFormat.format(share)}%` },
      { label: "Ocupación", value: `${numberFormat.format(occupancy)}%` },
      { label: "Giros identificados", value: numberFormat.format(uniqueGiros) },
    ],
    narrative: `El área ${selectedLabel} concentra ${numberFormat.format(selectedRecords.length)} espacios, ${numberFormat.format(selectedArea)} m² y ${numberFormat.format(uniqueBrands)} marcas identificadas. Su ocupación es de ${numberFormat.format(occupancy)}%, mientras ${numberFormat.format(available.length)} espacios reúnen ${numberFormat.format(availableArea)} m² disponibles. La diversidad de ${numberFormat.format(uniqueGiros)} giros permite evaluar la amplitud de su oferta comercial actual.`,
  };
}

function PortfolioAnalysisCard({ insight }: { insight: PortfolioInsight }) {
  return (
    <aside className="portfolio-chart-analysis" aria-live="polite">
      <header><div><span>Análisis automático</span><strong>{insight.title}</strong></div><small>Inventario activo</small></header>
      <div className="portfolio-analysis-metrics">
        {insight.metrics.map((metric) => (
          <article key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></article>
        ))}
      </div>
      <p>{insight.narrative}</p>
    </aside>
  );
}

function SpacePreviewPanel({
  title,
  records,
  onClose,
}: {
  title: string;
  records: LocalRecord[];
  onClose: () => void;
}) {
  const visibleRecords = records.slice(0, 6);
  return (
    <section className="space-preview-panel" aria-live="polite" aria-label={`Vista previa de ${title}`}>
      <header>
        <div><span>Vista previa</span><strong>{title}</strong><small>{numberFormat.format(records.length)} {records.length === 1 ? "espacio" : "espacios"}</small></div>
        <button type="button" onClick={onClose} aria-label={`Cerrar vista previa de ${title}`}>×</button>
      </header>
      <div className="space-preview-list">
        {visibleRecords.map((record, index) => (
          <article key={`${record.id}-${record.nomenclatura}-${index}`}>
            <div>
              <strong>{record.nomenclatura || "Sin nomenclatura"}</strong>
              <span>{record.areaComercial || "Tipo sin identificar"}</span>
            </div>
            <dl>
              <div><dt>Superficie</dt><dd>{record.metraje === null ? "Sin dato" : `${numberFormat.format(record.metraje)} m²`}</dd></div>
              <div><dt>Zona</dt><dd>{record.lado || "Sin dato"}</dd></div>
              <div><dt>Nivel</dt><dd>{String(record.nivel ?? "Sin dato")}</dd></div>
              <div><dt>Módulo</dt><dd>{record.modulo || "Sin dato"}</dd></div>
              {record.monthlyRent !== null && <div><dt>Renta mensual</dt><dd>{currencyFormat.format(record.monthlyRent)}</dd></div>}
            </dl>
          </article>
        ))}
      </div>
      {records.length > visibleRecords.length && (
        <p className="space-preview-remaining">Vista previa de 6 espacios · hay {numberFormat.format(records.length - visibleRecords.length)} adicionales en el inventario.</p>
      )}
    </section>
  );
}

function CommercialCapacityAnalysis({
  capacity,
  available,
  passengerTraffic,
}: {
  capacity: EtpCommercialCapacityData | null;
  available: number;
  passengerTraffic: PassengerTrafficRecord[];
}) {
  const years = [...new Set(passengerTraffic.map((record) => record.year))].sort((a, b) => a - b);
  const currentYear = years.at(-1) ?? null;
  const currentRealRecords = currentYear === null
    ? []
    : passengerTraffic.filter((record) => record.year === currentYear && record.status === "real");
  const completeMonths = new Set(currentRealRecords.map((record) => record.month));
  const currentYearToDate = currentRealRecords.reduce((sum, record) => sum + record.passengers, 0);
  const projectedPassengers = currentRealRecords.length
    ? Math.round((currentYearToDate / currentRealRecords.length) * 12)
    : null;
  const comparisonYear = currentYear === null ? null : currentYear - 1;
  const comparisonRecords = comparisonYear === null
    ? []
    : passengerTraffic.filter(
        (record) => record.year === comparisonYear && record.status === "real" && completeMonths.has(record.month),
      );
  const comparisonYearToDate = comparisonRecords.reduce((sum, record) => sum + record.passengers, 0);
  const yearToDateGrowth = comparisonYearToDate > 0
    ? ((currentYearToDate / comparisonYearToDate) - 1) * 100
    : null;
  const lastCompleteMonth = currentRealRecords.reduce((latest, record) => record.month > latest.month ? record : latest, currentRealRecords[0] ?? { month: 0, monthName: "sin meses" } as PassengerTrafficRecord);
  const partialMonths = currentYear === null
    ? []
    : passengerTraffic.filter((record) => record.year === currentYear && record.status === "partial");
  const trafficSeries = years.map((year) => {
    const realRecords = passengerTraffic.filter((record) => record.year === year && record.status === "real");
    const isProjected = year === currentYear && realRecords.length < 12;
    const actualTotal = realRecords.reduce((sum, record) => sum + record.passengers, 0);
    return {
      year: String(year),
      passengers: isProjected && projectedPassengers !== null ? projectedPassengers : actualTotal,
      projected: isProjected,
    };
  });
  const commercialPassengerCapacity = capacity?.commercialPassengerCapacity ?? null;
  const projectedUsage = commercialPassengerCapacity && projectedPassengers !== null ? (projectedPassengers / commercialPassengerCapacity) * 100 : null;
  const comparisonYearTotal = comparisonYear === null
    ? null
    : passengerTraffic
        .filter((record) => record.year === comparisonYear && record.status === "real")
        .reduce((sum, record) => sum + record.passengers, 0);
  const actualUsagePreviousYear = commercialPassengerCapacity && comparisonYearTotal !== null
    ? (comparisonYearTotal / commercialPassengerCapacity) * 100
    : null;
  const capacityGap = commercialPassengerCapacity && projectedPassengers !== null ? Math.max(commercialPassengerCapacity - projectedPassengers, 0) : null;
  const capacityGapPercent = commercialPassengerCapacity && capacityGap !== null ? (capacityGap / commercialPassengerCapacity) * 100 : null;
  const surfaceCoverage = capacity ? (capacity.leasedCommercialArea / capacity.recommendedCommercialArea) * 100 : null;
  const terminalDemand = capacity && projectedPassengers !== null ? (projectedPassengers / capacity.terminalPassengerCapacity) * 100 : null;

  return (
    <section className="commercial-capacity-analysis" aria-label="Utilización de la capacidad comercial estimada">
      {capacity && (
        <div className="commercial-capacity-foundation" aria-label="Datos base del cálculo de capacidad comercial">
          <div><span>Capacidad de diseño ETP</span><strong>{passengerFormat.format(capacity.terminalPassengerCapacity)} Pax</strong><small>CAPACIDAD!A2</small></div>
          <div><span>Coeficiente comercial</span><strong>{capacity.commercialAreaFactor.toFixed(6)}</strong><small>CAPACIDAD!A5</small></div>
          <div><span>Superficie recomendada</span><strong>{numberFormat.format(capacity.recommendedCommercialArea)} m²</strong><small>A2 × A5</small></div>
          <div><span>Superficie arrendada</span><strong>{numberFormat.format(capacity.leasedCommercialArea)} m²</strong><small>CAPACIDAD!C2</small></div>
        </div>
      )}
      <div className="commercial-capacity-kpis">
        <article>
          <span>Cobertura de superficie</span>
          <strong>{surfaceCoverage === null ? "Sin dato" : `${numberFormat.format(surfaceCoverage)}%`}</strong>
          <small>{capacity ? `${numberFormat.format(capacity.leasedCommercialArea)} de ${numberFormat.format(capacity.recommendedCommercialArea)} m²` : "Requiere datos de CAPACIDAD"}</small>
        </article>
        <article>
          <span>Utilización proyectada {currentYear ?? "actual"}</span>
          <strong>{projectedUsage === null ? "Sin dato" : `${numberFormat.format(projectedUsage)}%`}</strong>
          <small>{actualUsagePreviousYear === null || comparisonYear === null || projectedUsage === null ? "Requiere CAPACIDAD y PASAJEROS" : `${numberFormat.format(actualUsagePreviousYear)}% cierre real ${comparisonYear} · ${projectedUsage - actualUsagePreviousYear >= 0 ? "+" : ""}${numberFormat.format(projectedUsage - actualUsagePreviousYear)} pp`}</small>
        </article>
        <article>
          <span>Holgura de capacidad</span>
          <strong>{capacityGap === null ? "Sin dato" : `${passengerFormat.format(capacityGap)} Pax`}</strong>
          <small>{capacityGapPercent === null ? "Requiere capacidad comercial" : `${numberFormat.format(capacityGapPercent)}% de capacidad remanente`}</small>
        </article>
        <article>
          <span>Crecimiento de pasajeros</span>
          <strong>{yearToDateGrowth === null ? "Sin dato" : `${yearToDateGrowth >= 0 ? "+" : ""}${numberFormat.format(yearToDateGrowth)}%`}</strong>
          <small>{currentYear === null || comparisonYear === null || !currentRealRecords.length ? "Requiere meses completos comparables" : `${passengerFormat.format(currentYearToDate)} vs. ${passengerFormat.format(comparisonYearToDate)} Pax · enero–${lastCompleteMonth.monthName.toLocaleLowerCase("es-MX")}`}</small>
        </article>
      </div>

      <div className="commercial-capacity-detail">
        <article className="commercial-capacity-history">
          <header>
            <div><span className="section-kicker">Evolución {years.length ? `${years[0]}–${currentYear}` : "sin datos"}</span><h3>Tráfico frente a capacidad comercial actual</h3></div>
            <small>Base actual</small>
          </header>
          <div className="commercial-capacity-bars">
            {trafficSeries.map((item) => {
              const usage = commercialPassengerCapacity ? (item.passengers / commercialPassengerCapacity) * 100 : null;
              return (
                <div className={item.projected ? "projected" : ""} key={item.year}>
                  <span>{item.year}{item.projected ? "*" : ""}</span>
                  <i aria-label={usage === null ? `${item.year}: sin capacidad de referencia` : `${item.year}: ${numberFormat.format(usage)}% de utilización`}>
                    <em style={{ width: `${Math.min(usage ?? 0, 100)}%` }} />
                  </i>
                  <strong>{usage === null ? "—" : `${numberFormat.format(usage)}%`}</strong>
                  <small>{passengerFormat.format(item.passengers)} Pax</small>
                </div>
              );
            })}
            {!trafficSeries.length && <p className="commercial-capacity-empty">Carga la hoja PASAJEROS para generar la serie histórica.</p>}
          </div>
        </article>

        <aside className="commercial-capacity-insight">
          <span className="section-kicker">Lectura directiva</span>
          <h3>Capacidad suficiente para una estrategia selectiva</h3>
          <p>
            {projectedPassengers === null
              ? "La lectura de demanda está pendiente hasta cargar registros mensuales válidos en la hoja PASAJEROS."
              : `Con una demanda anualizada de ${passengerFormat.format(projectedPassengers)} pasajeros, equivalente al ${terminalDemand === null ? "porcentaje pendiente" : `${numberFormat.format(terminalDemand)}%`} de la capacidad de diseño del ETP, la superficie actualmente arrendada presenta ${projectedUsage === null ? "una utilización pendiente de cálculo" : `una utilización comercial de ${numberFormat.format(projectedUsage)}% y una holgura teórica de ${passengerFormat.format(capacityGap!)} pasajeros`}. La comercialización de los ${passengerFormat.format(available)} locales disponibles puede priorizar calidad del Tenant Mix, diversificación y rentabilidad, validando horas pico y filas antes de concluir que no existen cuellos de botella.`}
          </p>
        </aside>
      </div>

      <p className="commercial-capacity-method">
        * {currentYear === null || projectedPassengers === null ? "Proyección pendiente de la hoja PASAJEROS." : `Proyección ${currentYear} anualizada con ${currentRealRecords.length} meses completos: ${passengerFormat.format(currentYearToDate)} pasajeros acumulados.${partialMonths.length ? ` Se excluye ${partialMonths.map((record) => record.monthName.toLocaleLowerCase("es-MX")).join(", ")} por estar marcado como parcial.` : ""}`} Los años históricos se comparan con la superficie arrendada actual; el indicador no sustituye una evaluación operativa por hora pico.
      </p>
    </section>
  );
}

function medianValue(values: number[]) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

function buildVacancyInsight(records: LocalRecord[], recordLabel: string): VacancyInsight | null {
  const vacantRecords = records.filter((record) => record.estatus === "DISPONIBLE");
  if (!vacantRecords.length) return null;

  const vacantAreas = vacantRecords
    .map((record) => record.metraje)
    .filter((value): value is number => value !== null && value > 0);
  const operatingAreas = records
    .filter((record) => record.estatus === "EN FUNCIONAMIENTO")
    .map((record) => record.metraje)
    .filter((value): value is number => value !== null && value > 0);
  const vacantArea = vacantAreas.reduce((sum, value) => sum + value, 0);
  const vacantMedian = medianValue(vacantAreas);
  const operatingMedian = medianValue(operatingAreas);

  const summarizeBy = (field: "lado" | "nivel") => {
    const groups = new Map<string, { count: number; area: number }>();
    vacantRecords.forEach((record) => {
      const label = String(record[field] ?? "Sin dato").trim() || "Sin dato";
      const current = groups.get(label) ?? { count: 0, area: 0 };
      current.count += 1;
      current.area += record.metraje ?? 0;
      groups.set(label, current);
    });
    return [...groups.entries()]
      .map(([label, values]) => ({ label, ...values }))
      .sort((a, b) => b.area - a.area || b.count - a.count)[0] ?? null;
  };

  const leadingZone = summarizeBy("lado");
  const leadingLevel = summarizeBy("nivel");
  const largestVacancy = [...vacantRecords]
    .filter((record) => record.metraje !== null && record.metraje > 0)
    .sort((a, b) => (b.metraje ?? 0) - (a.metraje ?? 0))[0] ?? null;
  const zoneShare = leadingZone && vacantArea > 0
    ? (leadingZone.area / vacantArea) * 100
    : leadingZone
      ? (leadingZone.count / vacantRecords.length) * 100
      : 0;
  const sizeRatio = vacantMedian !== null && operatingMedian !== null && operatingMedian > 0
    ? vacantMedian / operatingMedian
    : null;
  const medianVacancies = vacantMedian === null
    ? []
    : [...vacantRecords]
        .filter((record) => record.metraje !== null && record.metraje > 0)
        .sort((a, b) => Math.abs((a.metraje ?? 0) - vacantMedian) - Math.abs((b.metraje ?? 0) - vacantMedian))
        .slice(0, 6);
  const leadingZoneVacancies = leadingZone
    ? vacantRecords.filter((record) => (String(record.lado || "Sin dato").trim() || "Sin dato") === leadingZone.label)
    : [];

  const recommendation = sizeRatio === null
    ? "Conviene completar el metraje para comparar el inventario vacante con los formatos que ya operan."
    : sizeRatio > 1.35
      ? "La vacancia se inclina hacia formatos mayores que el local operativo típico; conviene evaluar subdivisión, usos compartidos o prospectos ancla."
      : sizeRatio < 0.7
        ? "La vacancia se concentra en formatos compactos; conviene agrupar la prospección por giro, servicios rápidos o conceptos de baja huella."
        : "El tamaño vacante es comparable con el inventario que ya opera; la prioridad debe centrarse en ubicación, visibilidad y Tenant Mix."

  return {
    headline: "Diagnóstico de colocación",
    narrative: `${numberFormat.format(vacantRecords.length)} ${recordLabel} reúnen ${numberFormat.format(vacantArea)} m² vacantes. ${leadingZone ? `${leadingZone.label} concentra ${numberFormat.format(zoneShare)}% de esta disponibilidad` : "La disponibilidad no tiene una zona identificable"}${leadingLevel ? ` y el nivel ${leadingLevel.label} registra ${numberFormat.format(leadingLevel.count)} espacios` : ""}. ${recommendation}`,
    facts: [
      {
        label: "Tamaño mediano vacante",
        value: vacantMedian === null ? "Sin dato" : `${numberFormat.format(vacantMedian)} m²`,
        records: medianVacancies,
      },
      {
        label: "Zona de concentración",
        value: leadingZone ? `${leadingZone.label} · ${numberFormat.format(zoneShare)}%` : "Sin dato",
        records: leadingZoneVacancies,
      },
      {
        label: "Mayor oportunidad",
        value: largestVacancy
          ? `${largestVacancy.nomenclatura} · ${numberFormat.format(largestVacancy.metraje!)} m²`
          : "Sin dato",
        records: largestVacancy ? [largestVacancy] : [],
      },
    ],
  };
}

function buildModuleInsight(records: LocalRecord[]): ModuleInsight | null {
  const vacantRecords = records.filter((record) => record.estatus === "DISPONIBLE");
  const totalVacantArea = vacantRecords.reduce((sum, record) => sum + (record.metraje ?? 0), 0);
  const modules = new Map<string, LocalRecord[]>();
  records.forEach((record) => {
    const moduleName = String(record.modulo || "Sin dato").trim() || "Sin dato";
    modules.set(moduleName, [...(modules.get(moduleName) ?? []), record]);
  });

  const ranked = [...modules.entries()]
    .map(([moduleName, moduleRecords]) => {
      const availableRecords = moduleRecords.filter((record) => record.estatus === "DISPONIBLE");
      const availableArea = availableRecords.reduce((sum, record) => sum + (record.metraje ?? 0), 0);
      const vacancyRate = moduleRecords.length ? (availableRecords.length / moduleRecords.length) * 100 : 0;
      const areaShare = totalVacantArea > 0 ? (availableArea / totalVacantArea) * 100 : 0;
      const score = vacancyRate * 0.6 + areaShare * 0.4;
      return { moduleName, available: availableRecords.length, availableArea, vacancyRate, score };
    })
    .filter((item) => item.available > 0)
    .sort((a, b) => b.score - a.score || b.availableArea - a.availableArea || b.available - a.available);

  const topScore = ranked[0]?.score || 1;
  const opportunities: ModuleOpportunity[] = ranked.slice(0, 3).map((item) => {
    const relativeScore = item.score / topScore;
    return {
      moduleName: item.moduleName,
      available: item.available,
      availableArea: item.availableArea,
      vacancyRate: item.vacancyRate,
      priority: relativeScore >= 0.75 ? "Alta" : relativeScore >= 0.45 ? "Media" : "Puntual",
      records: modules.get(item.moduleName)?.filter((record) => record.estatus === "DISPONIBLE") ?? [],
    };
  });
  const topThreeVacancies = opportunities.reduce((sum, item) => sum + item.available, 0);
  const topThreeShare = vacantRecords.length ? (topThreeVacancies / vacantRecords.length) * 100 : 0;
  const leader = opportunities[0] ?? null;

  const totalOperating = records.filter((record) => record.estatus === "EN FUNCIONAMIENTO").length;
  const totalOperatingWithRent = records.filter(
    (record) => record.estatus === "EN FUNCIONAMIENTO" && record.monthlyRent !== null,
  ).length;
  const financialCoverage = totalOperating ? (totalOperatingWithRent / totalOperating) * 100 : 0;
  const performanceBase = [...modules.entries()]
    .map(([moduleName, moduleRecords]) => {
      const operatingRecords = moduleRecords.filter((record) => record.estatus === "EN FUNCIONAMIENTO");
      const rentRecords = operatingRecords.filter((record) => record.monthlyRent !== null);
      const monthlyRent = rentRecords.reduce((sum, record) => sum + (record.monthlyRent ?? 0), 0);
      const rentArea = rentRecords.reduce((sum, record) => sum + (record.metraje ?? 0), 0);
      return {
        moduleName,
        monthlyRent,
        occupancy: moduleRecords.length ? (operatingRecords.length / moduleRecords.length) * 100 : 0,
        rentPerM2: rentArea > 0 ? monthlyRent / rentArea : null,
        knownRents: rentRecords.length,
        records: moduleRecords,
      };
    })
    .filter((item) => item.knownRents > 0 && item.rentPerM2 !== null);
  const medianOccupancy = medianValue(performanceBase.map((item) => item.occupancy)) ?? 0;
  const medianRentPerM2 = medianValue(
    performanceBase.map((item) => item.rentPerM2).filter((value): value is number => value !== null),
  ) ?? 0;
  const performance: ModulePerformance[] = performanceBase.map((item) => {
    const highOccupancy = item.occupancy >= medianOccupancy;
    const highRentPerM2 = (item.rentPerM2 ?? 0) >= medianRentPerM2;
    const category: ModulePerformance["category"] = highOccupancy
      ? highRentPerM2 ? "star" : "potential"
      : highRentPerM2 ? "risk" : "attention";
    return { ...item, category };
  });
  const starLeader = [...performance]
    .filter((item) => item.category === "star")
    .sort((a, b) => b.monthlyRent - a.monthlyRent)[0] ?? null;
  const attentionLeader = [...performance]
    .filter((item) => item.category === "attention")
    .sort((a, b) => a.monthlyRent - b.monthlyRent)[0] ?? null;

  if (!opportunities.length && !performance.length) return null;

  return {
    narrative: leader
      ? `El módulo ${leader.moduleName} encabeza la prioridad comercial con ${numberFormat.format(leader.available)} vacantes, ${numberFormat.format(leader.availableArea)} m² disponibles y una tasa interna de vacancia de ${numberFormat.format(leader.vacancyRate)}%. Los tres módulos prioritarios reúnen ${numberFormat.format(topThreeShare)}% de los espacios disponibles, por lo que permiten concentrar recorridos, promoción y seguimiento sin dispersar el esfuerzo comercial.`
      : "No existen espacios disponibles para calcular una prioridad de comercialización por módulo.",
    opportunities,
    performanceNarrative: starLeader && attentionLeader
      ? `El módulo ${starLeader.moduleName} se ubica como Estrella con ${currencyFormat.format(starLeader.monthlyRent)} de renta mensual registrada, ${currencyFormat.format(starLeader.rentPerM2 ?? 0)}/m² y ${numberFormat.format(starLeader.occupancy)}% de ocupación. ${attentionLeader.moduleName} queda en Atención prioritaria con ${currencyFormat.format(attentionLeader.monthlyRent)} mensuales, ${currencyFormat.format(attentionLeader.rentPerM2 ?? 0)}/m² y ${numberFormat.format(attentionLeader.occupancy)}% de ocupación. La matriz compara desempeño interno; no implica menor demanda hasta incorporar tránsito y ventas.`
      : performance.length
        ? `La matriz clasifica ${numberFormat.format(performance.length)} módulos con información comparable usando las medianas de renta por m² y ocupación. Los cuadrantes permiten separar consolidación, optimización, riesgo y atención sin confundir tamaño del módulo con eficiencia.`
        : "La clasificación de desempeño está pendiente porque no hay rentas mensuales válidas asociadas a locales en funcionamiento.",
    matrix: performance,
    medianOccupancy,
    medianRentPerM2,
    financialCoverage,
  };
}

export default function SummaryDashboard({
  records,
  locationId,
  locationName,
  recordLabel,
  etpCommercialCapacity,
  passengerTraffic,
  onOpenDirectory,
  onOpenBrand,
}: {
  records: LocalRecord[];
  locationId: string;
  locationName: string;
  recordLabel: string;
  etpCommercialCapacity: EtpCommercialCapacityData | null;
  passengerTraffic: PassengerTrafficRecord[];
  onOpenDirectory: () => void;
  onOpenBrand: (brand: string) => void;
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
  const vacancyInsight = buildVacancyInsight(records, recordLabel);
  const moduleInsight = showModules ? buildModuleInsight(records) : null;
  const [selectedVacancyFact, setSelectedVacancyFact] = useState<string | null>(null);
  const [vacancyAnalysisOpen, setVacancyAnalysisOpen] = useState(false);
  const [capacityAnalysisOpen, setCapacityAnalysisOpen] = useState(false);
  const selectedVacancyPreview = vacancyInsight?.facts.find((fact) => fact.label === selectedVacancyFact) ?? null;

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
        <>
          <article className="commercial-capacity-card" aria-label="Capacidad de Atención Comercial del ETP">
            <div>
              <div className="commercial-capacity-heading">
                <div><span className="section-kicker">Indicador de atención</span><h2>Capacidad de Atención Comercial</h2></div>
                <AnalysisToggle open={capacityAnalysisOpen} label="Capacidad de Atención Comercial" onClick={() => setCapacityAnalysisOpen((current) => !current)} />
              </div>
              <p>Capacidad equivalente calculada con la superficie arrendada, el coeficiente comercial y la capacidad de diseño registrados en el Excel.</p>
            </div>
            <div className="commercial-capacity-value">
              <strong>{etpCommercialCapacity === null ? "Sin dato" : passengerFormat.format(etpCommercialCapacity.commercialPassengerCapacity)}</strong>
              <span>Pax.</span>
              <small>Hoja CAPACIDAD · A2, C2 y A5 · equivalente a D2</small>
            </div>
          </article>
          {capacityAnalysisOpen && <CommercialCapacityAnalysis capacity={etpCommercialCapacity} available={available} passengerTraffic={passengerTraffic} />}
        </>
      )}

      <LocationIndicators locationId={locationId} records={records} onOpenBrand={onOpenBrand} />

      <div className="executive-grid">
        <StatusOverview title={statusTitle} records={records} recordLabel={recordLabel} />
        <DonutChart title="Giro comercial" kicker="Mezcla de oferta" data={countBy(records, "giroOperativo")} center={recordLabel} analysis={{ records, field: "giroOperativo", kind: "giro" }} />
        {showZone && <DonutChart title="Distribución por zona" kicker="Implantación territorial" data={countBy(records, "lado")} center={recordLabel} colors={["#405364", "#ac182c", "#00886f"]} analysis={{ records, field: "lado", kind: "zona" }} />}
        {showLevels && <VerticalBars title={`${capitalizedLabel} por nivel`} kicker="Implantación vertical" data={levels} color="#09212e" totalLabel={recordLabel} analysis={{ records, field: "nivel", kind: "nivel" }} />}
        {showAreaType && <DonutChart title="Tipo de área" kicker="Ubicación operativa" data={countBy(records, "area")} center={recordLabel} colors={["#00886f", "#405364", "#ac182c"]} analysis={{ records, field: "area", kind: "area" }} />}
        {locationId === "etp" && <DonutChart title="Tipo de local" kicker="Formato comercial" data={countBy(records, "areaComercial")} center={recordLabel} colors={["#ac182c", "#00886f", "#405364", "#b56d16", "#0b957e", "#87929c"]} wide />}
        {showModules && <HorizontalBars title={`${capitalizedLabel} por módulo`} kicker="Distribución física" data={modules} totalLabel={recordLabel} analysis={moduleInsight} />}
      </div>

      <article className="availability-card">
        <div className="availability-heading">
          <div><span className="section-kicker">Disponibilidad por zona</span><h2>Espacios vacantes</h2></div>
          <div className="availability-heading-actions">
            <strong>{numberFormat.format(available)} disponibles</strong>
            {vacancyInsight && <AnalysisToggle open={vacancyAnalysisOpen} label="Espacios vacantes" onClick={() => setVacancyAnalysisOpen((current) => !current)} />}
          </div>
        </div>
        {availability.length ? (
          <div>
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
            {vacancyAnalysisOpen && vacancyInsight && (
              <aside className="inventory-analysis vacancy-analysis" aria-label="Diagnóstico de colocación de espacios vacantes">
                <header>
                  <div><span>Análisis automático</span><strong>{vacancyInsight.headline}</strong></div>
                  <small>Actualizado con los filtros activos</small>
                </header>
                <p>{vacancyInsight.narrative}</p>
                <div className="vacancy-facts">
                  {vacancyInsight.facts.map((fact) => (
                    <button
                      type="button"
                      className={selectedVacancyFact === fact.label ? "active" : ""}
                      key={fact.label}
                      onClick={() => setSelectedVacancyFact((current) => current === fact.label ? null : fact.label)}
                      aria-expanded={selectedVacancyFact === fact.label}
                      disabled={!fact.records.length}
                    >
                      <span>{fact.label}</span><strong>{fact.value}</strong><small>Consultar espacios →</small>
                    </button>
                  ))}
                </div>
                {selectedVacancyPreview && (
                  <SpacePreviewPanel
                    title={selectedVacancyPreview.label}
                    records={selectedVacancyPreview.records}
                    onClose={() => setSelectedVacancyFact(null)}
                  />
                )}
              </aside>
            )}
          </div>
        ) : <p className="availability-empty">No hay {recordLabel} disponibles en la base activa.</p>}
      </article>
    </section>
  );
}
