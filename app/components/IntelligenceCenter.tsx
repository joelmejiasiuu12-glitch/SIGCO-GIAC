"use client";

import { useMemo } from "react";
import { locationOptions, type LocalRecord } from "@/app/types";

export type IntelligenceView = "dashboard" | "kpis" | "reports" | "alerts";

type Dataset = Record<string, LocalRecord[]>;
type LocatedRecord = LocalRecord & { locationId: string; locationName: string };
type Severity = "critical" | "warning" | "info";

type IntelligenceAlert = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  count: number;
  responsible: string;
  action: string;
};

type KpiDefinition = {
  id: string;
  name: string;
  value: string;
  formula: string;
  source: string;
  periodicity: string;
  target: string;
  status: "ok" | "watch" | "pending";
  note: string;
};

const leasedStatuses = new Set(["EN FUNCIONAMIENTO", "EN ADAPTACION", "FORMALIZADO"]);
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

function isAdvertising(record: LocalRecord) {
  return /publicidad|publicitario|pantalla|muro|columna|activacion/.test(
    normalized(`${record.areaComercial} ${record.giroOperativo} ${record.commercialLine}`),
  );
}

function isCompletedProject(record: LocalRecord) {
  return /concluid|terminad|finaliz|complet|100\s*%/.test(normalized(record.projectStatus));
}

function daysFromToday(value: string | null) {
  if (!value) return null;
  const target = new Date(`${value}T12:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  return Math.ceil((target.getTime() - start.getTime()) / 86_400_000);
}

function escapeCsv(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function kpiStatusLabel(status: KpiDefinition["status"]) {
  if (status === "ok") return "En meta";
  if (status === "watch") return "En seguimiento";
  return "Fuente pendiente";
}

export default function IntelligenceCenter({
  datasets,
  view,
  sourceFile,
  sourceUpdatedAt,
  onUpload,
  onChangeView,
}: {
  datasets: Dataset;
  view: IntelligenceView;
  sourceFile: string;
  sourceUpdatedAt: string | null;
  onUpload: () => void;
  onChangeView: (view: IntelligenceView) => void;
}) {
  const intelligence = useMemo(() => {
    const records: LocatedRecord[] = locationOptions.flatMap((location) =>
      (datasets[location.id] ?? []).map((record) => ({
        ...record,
        locationId: location.id,
        locationName: location.shortName,
      })),
    );
    const occupied = records.filter((record) => leasedStatuses.has(record.estatus));
    const available = records.filter((record) => record.estatus === "DISPONIBLE");
    const inAssignment = records.filter((record) => record.estatus === "EN PROCESO DE ASIGNACION");
    const occupiedArea = occupied.reduce((sum, record) => sum + (record.metraje ?? 0), 0);
    const totalArea = records.reduce((sum, record) => sum + (record.metraje ?? 0), 0);
    const monthlyRent = records.reduce((sum, record) => sum + (record.monthlyRent ?? 0), 0);
    const contracted = occupied.filter((record) => Boolean(record.contractNumber));
    const pendingContract = occupied.filter((record) => !record.contractNumber || record.contractPending);
    const advertising = records.filter(isAdvertising);
    const monetizedAdvertising = advertising.filter(
      (record) => leasedStatuses.has(record.estatus) || Boolean(record.contractNumber),
    );
    const projectRecords = records.filter((record) => Boolean(record.projectStatus));
    const completedProjects = projectRecords.filter(isCompletedProject);
    const upcomingRenewals = records.filter((record) => {
      const days = daysFromToday(record.renewalDate ?? record.fechaConclusion);
      return days !== null && days >= 0 && days <= 30;
    });
    const expiredRenewals = records.filter((record) => {
      const days = daysFromToday(record.renewalDate ?? record.fechaConclusion);
      return days !== null && days < 0;
    });

    const occupationRate = records.length ? occupied.length / records.length : 0;
    const contractCoverage = occupied.length ? contracted.length / occupied.length : 0;
    const advertisingRate = advertising.length ? monetizedAdvertising.length / advertising.length : null;
    const projectRate = projectRecords.length ? completedProjects.length / projectRecords.length : null;

    const alerts: IntelligenceAlert[] = [];
    if (expiredRenewals.length) {
      alerts.push({
        id: "expired-renewals",
        severity: "critical",
        title: "Vigencias contractuales vencidas",
        detail: "Existen registros cuya fecha de renovación o conclusión ya transcurrió.",
        count: expiredRenewals.length,
        responsible: "GSC",
        action: "Revisar vigencia y actualizar el Excel contractual.",
      });
    }
    if (upcomingRenewals.length) {
      alerts.push({
        id: "upcoming-renewals",
        severity: "warning",
        title: "Renovaciones dentro de 30 días",
        detail: "Contratos próximos a su fecha objetivo de renovación o conclusión.",
        count: upcomingRenewals.length,
        responsible: "GSC",
        action: "Programar seguimiento y confirmar el estatus del expediente.",
      });
    }
    if (pendingContract.length) {
      alerts.push({
        id: "pending-contracts",
        severity: "warning",
        title: "Espacios ocupados sin contrato identificado",
        detail: "Registros arrendados sin número de contrato disponible en la carga actual.",
        count: pendingContract.length,
        responsible: "GSC",
        action: "Completar el número de contrato en la fuente Excel.",
      });
    }
    if (records.length && occupationRate < 0.75) {
      alerts.push({
        id: "occupation-target",
        severity: "info",
        title: "Ocupación por debajo de la referencia",
        detail: `El resultado actual es ${numberFormat.format(occupationRate * 100)}% frente a una referencia de 75%.`,
        count: available.length + inAssignment.length,
        responsible: "SSC",
        action: "Revisar espacios disponibles y en proceso de asignación.",
      });
    }
    if (advertisingRate !== null && advertisingRate < 0.7) {
      alerts.push({
        id: "advertising-target",
        severity: "info",
        title: "Monetización publicitaria en seguimiento",
        detail: `El inventario publicitario registra ${numberFormat.format(advertisingRate * 100)}% de aprovechamiento.`,
        count: advertising.length - monetizedAdvertising.length,
        responsible: "GMerc",
        action: "Revisar disponibilidad y activaciones del inventario publicitario.",
      });
    }

    const kpis: KpiDefinition[] = [
      {
        id: "occupation",
        name: "Ocupación comercial validada",
        value: records.length ? `${numberFormat.format(occupationRate * 100)}%` : "Sin datos",
        formula: "Espacios arrendados / inventario comercial cargado",
        source: "Hojas de inventario por zona",
        periodicity: "Mensual",
        target: "75% referencia",
        status: records.length ? occupationRate >= 0.75 ? "ok" : "watch" : "pending",
        note: `${integerFormat.format(occupied.length)} arrendados de ${integerFormat.format(records.length)} espacios.`,
      },
      {
        id: "contract-coverage",
        name: "Cobertura contractual identificada",
        value: occupied.length ? `${numberFormat.format(contractCoverage * 100)}%` : "Sin datos",
        formula: "Arrendados con número de contrato / espacios arrendados",
        source: "Columnas No. Contrato y Estatus",
        periodicity: "Mensual",
        target: "100%",
        status: occupied.length ? contractCoverage >= 1 ? "ok" : "watch" : "pending",
        note: `${integerFormat.format(contracted.length)} expedientes identificados.`,
      },
      {
        id: "rent",
        name: "Renta mensual identificada",
        value: monthlyRent ? currencyFormat.format(monthlyRent) : "Sin datos",
        formula: "Suma de renta mensual registrada",
        source: "Columna Renta mensual",
        periodicity: "Mensual",
        target: "Seguimiento",
        status: monthlyRent ? "ok" : "pending",
        note: "Importe de referencia derivado de la carga contractual.",
      },
      {
        id: "advertising",
        name: "Monetización publicitaria",
        value: advertisingRate === null ? "Sin fuente" : `${numberFormat.format(advertisingRate * 100)}%`,
        formula: "Espacios publicitarios monetizados / inventario publicitario",
        source: "Registros publicitarios del Excel",
        periodicity: "Mensual",
        target: "70% referencia",
        status: advertisingRate === null ? "pending" : advertisingRate >= 0.7 ? "ok" : "watch",
        note: advertising.length ? `${monetizedAdvertising.length} de ${advertising.length} registros.` : "Se activará cuando el Excel incluya inventario publicitario.",
      },
      {
        id: "sales-reporting",
        name: "Cobertura de reporte de ventas",
        value: "Fuente pendiente",
        formula: "Socios que reportan / socios obligados",
        source: "Excel de reporte de ventas",
        periodicity: "Mensual",
        target: "100%",
        status: "pending",
        note: "Preparado para activarse cuando se incorpore la hoja correspondiente.",
      },
      {
        id: "projects",
        name: "Avance de proyectos estratégicos",
        value: projectRate === null ? "Sin fuente" : `${numberFormat.format(projectRate * 100)}%`,
        formula: "Hitos concluidos / hitos programados",
        source: "Columna Proyecto de obra",
        periodicity: "Trimestral",
        target: "Por programa",
        status: projectRate === null ? "pending" : projectRate >= 0.75 ? "ok" : "watch",
        note: projectRecords.length ? `${completedProjects.length} de ${projectRecords.length} registros concluidos.` : "Se activará con información de proyectos e hitos.",
      },
    ];

    return {
      records,
      occupied,
      available,
      inAssignment,
      occupationRate,
      occupiedArea,
      totalArea,
      monthlyRent,
      contractCoverage,
      alerts,
      kpis,
    };
  }, [datasets]);

  const sourceDate = sourceUpdatedAt
    ? new Date(sourceUpdatedAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })
    : "Sin actualización registrada";

  const downloadKpis = () => {
    downloadCsv(
      `SIGCO_KPIs_${new Date().toISOString().slice(0, 10)}.csv`,
      [
        ["Indicador", "Resultado", "Fórmula", "Fuente", "Periodicidad", "Meta", "Estado"],
        ...intelligence.kpis.map((kpi) => [
          kpi.name,
          kpi.value,
          kpi.formula,
          kpi.source,
          kpi.periodicity,
          kpi.target,
          kpiStatusLabel(kpi.status),
        ]),
      ],
    );
  };

  const downloadAlerts = () => {
    downloadCsv(
      `SIGCO_Alertas_${new Date().toISOString().slice(0, 10)}.csv`,
      [
        ["Prioridad", "Alerta", "Registros", "Responsable", "Acción"],
        ...intelligence.alerts.map((alert) => [
          alert.severity === "critical" ? "Alta" : alert.severity === "warning" ? "Media" : "Informativa",
          alert.title,
          alert.count,
          alert.responsible,
          alert.action,
        ]),
      ],
    );
  };

  if (view === "reports") {
    return null;
  }

  if (!intelligence.records.length) {
    return (
      <section className="intelligence-empty" aria-label="Inteligencia y Plan Comercial">
        <span className="intelligence-empty-mark">GIA</span>
        <p className="section-kicker">Módulo institucional</p>
        <h2>Inteligencia y Plan Comercial</h2>
        <p>El tablero, los KPIs, los reportes y las alertas se generarán automáticamente con el libro consolidado de SIGCO.</p>
        <button type="button" className="primary-button" onClick={onUpload}>Cargar Excel y generar tablero</button>
      </section>
    );
  }

  if (view === "dashboard") {
    const visibleKpis = intelligence.kpis.slice(0, 4);
    return (
      <section className="intelligence-center" aria-label="Tablero de Inteligencia y Plan Comercial">
        <div className="intelligence-heading">
          <div><span className="section-kicker">Plan Comercial Rector</span><h2>Tablero ejecutivo de la SSC</h2><p>Lectura consolidada de las siete zonas comerciales a partir del último Excel cargado.</p></div>
          <div className="intelligence-source"><span>Fuente activa</span><strong>{sourceFile}</strong><small>{sourceDate}</small></div>
        </div>

        <div className="intelligence-kpi-grid">
          <article><i className="wine" /><span>Ocupación comercial</span><strong>{numberFormat.format(intelligence.occupationRate * 100)}%</strong><small>{integerFormat.format(intelligence.occupied.length)} de {integerFormat.format(intelligence.records.length)} espacios</small></article>
          <article><i className="green" /><span>Cobertura contractual</span><strong>{numberFormat.format(intelligence.contractCoverage * 100)}%</strong><small>Contratos identificados en espacios arrendados</small></article>
          <article><i className="navy" /><span>Superficie ocupada</span><strong>{numberFormat.format(intelligence.occupiedArea)} m²</strong><small>De {numberFormat.format(intelligence.totalArea)} m² registrados</small></article>
          <article><i className="amber" /><span>Alertas activas</span><strong>{integerFormat.format(intelligence.alerts.length)}</strong><small>{intelligence.alerts.some((alert) => alert.severity === "critical") ? "Existe atención prioritaria" : "Sin alertas críticas"}</small></article>
        </div>

        <div className="intelligence-dashboard-grid">
          <article className="intelligence-panel">
            <div className="intelligence-panel-heading"><div><span>Indicadores rectores</span><h3>Resultado frente a referencia</h3></div><button type="button" onClick={() => onChangeView("kpis")}>Ver catálogo →</button></div>
            <div className="intelligence-progress-list">
              {visibleKpis.map((kpi) => {
                const numericValue = Number(kpi.value.replace(/[^0-9.]/g, ""));
                const progress = Number.isFinite(numericValue) && kpi.value.includes("%") ? Math.min(numericValue, 100) : kpi.status === "ok" ? 100 : 0;
                return <div key={kpi.id}><span><strong>{kpi.name}</strong><b>{kpi.value}</b></span><i><em className={kpi.status} style={{ width: `${progress}%` }} /></i><small>{kpi.note}</small></div>;
              })}
            </div>
          </article>

          <article className="intelligence-panel">
            <div className="intelligence-panel-heading"><div><span>Seguimiento</span><h3>Atención requerida</h3></div><button type="button" onClick={() => onChangeView("alerts")}>Ver todas →</button></div>
            <div className="intelligence-alert-summary">
              {intelligence.alerts.length ? intelligence.alerts.slice(0, 4).map((alert) => (
                <div key={alert.id}><i className={alert.severity} /><span><strong>{alert.title}</strong><small>{alert.count} registros · Responsable: {alert.responsible}</small></span></div>
              )) : <div className="intelligence-all-clear"><strong>Sin alertas activas</strong><small>La carga actual no genera asuntos de atención.</small></div>}
            </div>
          </article>
        </div>

        <div className="intelligence-actions-strip">
          <div><span>Disponibles</span><strong>{integerFormat.format(intelligence.available.length)}</strong></div>
          <div><span>En asignación</span><strong>{integerFormat.format(intelligence.inAssignment.length)}</strong></div>
          <div><span>Renta mensual identificada</span><strong>{intelligence.monthlyRent ? currencyFormat.format(intelligence.monthlyRent) : "Sin datos"}</strong></div>
          <button type="button" className="primary-button" onClick={() => onChangeView("reports")}>Generar informe ejecutivo</button>
        </div>
      </section>
    );
  }

  if (view === "kpis") {
    return (
      <section className="intelligence-center" aria-label="Catálogo rector de KPIs">
        <div className="intelligence-heading compact"><div><span className="section-kicker">Gobierno de indicadores</span><h2>Catálogo rector de KPIs</h2><p>Las fórmulas se aplican directamente a la información cargada en SIGCO.</p></div><button type="button" className="secondary-button" onClick={downloadKpis}>Exportar matriz CSV</button></div>
        <div className="intelligence-table-wrap">
          <table className="intelligence-table">
            <thead><tr><th>Indicador</th><th>Resultado</th><th>Fórmula</th><th>Fuente en SIGCO</th><th>Periodicidad</th><th>Meta</th><th>Estado</th></tr></thead>
            <tbody>{intelligence.kpis.map((kpi) => <tr key={kpi.id}><td><strong>{kpi.name}</strong><small>{kpi.note}</small></td><td className="numeric"><strong>{kpi.value}</strong></td><td>{kpi.formula}</td><td>{kpi.source}</td><td>{kpi.periodicity}</td><td>{kpi.target}</td><td><span className={`intelligence-status ${kpi.status}`}>{kpiStatusLabel(kpi.status)}</span></td></tr>)}</tbody>
          </table>
        </div>
        <div className="intelligence-note"><strong>Integración progresiva:</strong> los indicadores sin fuente quedan preparados y se activarán al añadir las columnas u hojas correspondientes al Excel.</div>
      </section>
    );
  }

  return (
    <section className="intelligence-center" aria-label="Alertas y semaforización">
      <div className="intelligence-heading compact"><div><span className="section-kicker">Control preventivo</span><h2>Alertas y semaforización</h2><p>Reglas automáticas evaluadas después de cada carga de Excel.</p></div><button type="button" className="secondary-button" onClick={downloadAlerts} disabled={!intelligence.alerts.length}>Exportar alertas</button></div>
      <div className="intelligence-alert-layout">
        <div className="intelligence-table-wrap">
          <table className="intelligence-table alerts">
            <thead><tr><th>Prioridad</th><th>Alerta</th><th>Registros</th><th>Responsable</th><th>Acción recomendada</th></tr></thead>
            <tbody>{intelligence.alerts.length ? intelligence.alerts.map((alert) => <tr key={alert.id}><td><span className={`alert-priority ${alert.severity}`}>{alert.severity === "critical" ? "Alta" : alert.severity === "warning" ? "Media" : "Informativa"}</span></td><td><strong>{alert.title}</strong><small>{alert.detail}</small></td><td className="numeric"><strong>{alert.count}</strong></td><td>{alert.responsible}</td><td>{alert.action}</td></tr>) : <tr><td colSpan={5}><div className="intelligence-table-empty"><strong>Sin alertas activas</strong><span>La carga actual no genera asuntos de atención.</span></div></td></tr>}</tbody>
          </table>
        </div>
        <aside className="intelligence-rules">
          <span>Reglas activas</span>
          <h3>Generación automática</h3>
          <div><i /><p><strong>Vigencia vencida o próxima</strong><small>Fechas de renovación y conclusión.</small></p></div>
          <div><i /><p><strong>Contrato no identificado</strong><small>Espacios arrendados sin número de contrato.</small></p></div>
          <div><i /><p><strong>KPI debajo de referencia</strong><small>Ocupación y monetización publicitaria.</small></p></div>
          <div><i /><p><strong>Información incorporada</strong><small>Las reglas se recalculan con cada nuevo Excel.</small></p></div>
        </aside>
      </div>
    </section>
  );
}
