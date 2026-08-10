"use client";

import type { LocalRecord } from "@/app/types";

export type CommercialAlertLevel = "overdue" | "today" | "critical" | "upcoming";

export type CommercialAlert = {
  record: LocalRecord;
  targetDate: string;
  targetLabel: "Renovación" | "Conclusión";
  daysRemaining: number;
  level: CommercialAlertLevel;
};

const dayMs = 86_400_000;
const dateFormat = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function isoDateToUtc(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

export function buildCommercialAlerts(records: LocalRecord[], today = new Date()): CommercialAlert[] {
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return records.flatMap((record) => {
    const targetDate = record.renewalDate ?? record.fechaConclusion;
    if (!targetDate) return [];
    const conclusionUtc = isoDateToUtc(targetDate);
    if (conclusionUtc === null) return [];
    const daysRemaining = Math.round((conclusionUtc - todayUtc) / dayMs);
    if (daysRemaining > 30) return [];
    const level: CommercialAlertLevel = daysRemaining < 0
      ? "overdue"
      : daysRemaining === 0
        ? "today"
        : daysRemaining <= 7
          ? "critical"
          : "upcoming";
    return [{ record, targetDate, targetLabel: record.renewalDate ? "Renovación" : "Conclusión", daysRemaining, level }];
  }).sort((left, right) => {
    const priority: Record<CommercialAlertLevel, number> = { overdue: 0, today: 1, critical: 2, upcoming: 3 };
    return priority[left.level] - priority[right.level] || left.daysRemaining - right.daysRemaining;
  });
}

function formatDate(value: string | null) {
  if (!value) return "Sin dato";
  const utc = isoDateToUtc(value);
  return utc === null ? "Sin dato" : dateFormat.format(new Date(utc));
}

function alertCopy(alert: CommercialAlert) {
  if (alert.daysRemaining < 0) return `Vencido hace ${Math.abs(alert.daysRemaining)} ${Math.abs(alert.daysRemaining) === 1 ? "día" : "días"}`;
  if (alert.daysRemaining === 0) return "Vence hoy";
  return `${alert.daysRemaining} ${alert.daysRemaining === 1 ? "día restante" : "días restantes"}`;
}

const levelLabels: Record<CommercialAlertLevel, string> = {
  overdue: "Vencido",
  today: "Vence hoy",
  critical: "Crítico",
  upcoming: "Próximo",
};

export default function CommercialAlertsModal({
  open,
  alerts,
  onClose,
}: {
  open: boolean;
  alerts: CommercialAlert[];
  onClose: () => void;
}) {
  if (!open) return null;
  const counts = {
    overdue: alerts.filter((alert) => alert.level === "overdue").length,
    today: alerts.filter((alert) => alert.level === "today").length,
    critical: alerts.filter((alert) => alert.level === "critical").length,
    upcoming: alerts.filter((alert) => alert.level === "upcoming").length,
  };

  return (
    <div className="modal-backdrop commercial-alert-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="commercial-alert-modal" role="dialog" aria-modal="true" aria-labelledby="commercial-alert-title">
        <div className="commercial-alert-heading">
          <div>
            <span className="section-kicker">Seguimiento contractual · ETP</span>
            <h2 id="commercial-alert-title">Centro de notificaciones</h2>
            <p>Renovaciones o fechas de conclusión vencidas y dentro de los próximos 30 días.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar centro de notificaciones">×</button>
        </div>

        <div className="commercial-alert-summary" aria-label="Resumen de alertas">
          <div className="overdue"><strong>{counts.overdue}</strong><span>Vencidos</span></div>
          <div className="today"><strong>{counts.today}</strong><span>Vencen hoy</span></div>
          <div className="critical"><strong>{counts.critical}</strong><span>1–7 días</span></div>
          <div className="upcoming"><strong>{counts.upcoming}</strong><span>8–30 días</span></div>
        </div>

        {alerts.length ? (
          <div className="commercial-alert-table-wrap">
            <table className="commercial-alert-table">
              <thead>
                <tr><th>Local</th><th>Marca</th><th>Contrato</th><th>Fecha objetivo</th><th>Tiempo</th><th>Alerta</th></tr>
              </thead>
              <tbody>
                {alerts.map((alert, index) => (
                  <tr key={`${alert.record.id}-${index}`}>
                    <td><strong>{alert.record.nomenclatura || "Sin dato"}</strong></td>
                    <td>{alert.record.marca || "Sin dato"}</td>
                    <td>{alert.record.contractNumber ?? "Sin número"}</td>
                    <td><strong>{alert.targetLabel}</strong><small>{formatDate(alert.targetDate)}</small></td>
                    <td>{alertCopy(alert)}</td>
                    <td><span className={`commercial-alert-status ${alert.level}`}>{levelLabels[alert.level]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="commercial-alert-empty"><strong>Sin alertas activas</strong><span>No hay renovaciones ni conclusiones dentro de los próximos 30 días.</span></div>
        )}
      </section>
    </div>
  );
}
