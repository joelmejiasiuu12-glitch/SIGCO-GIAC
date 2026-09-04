"use client";

import { useMemo, useState } from "react";
import type { ContractStage } from "@/app/types";

// Explicit type import matching ContractCenter exports
export type Attention = "Crítico" | "Seguimiento" | "En orden";
export type TenantRating = "A+" | "A" | "B" | "C" | "D";

export type TenantScore = {
  score: number;
  rating: TenantRating;
  label: string;
  tone: "ok" | "info" | "watch" | "risk";
  breakdown: {
    documents: number;
    renewal: number;
    formalized: number;
    operation: number;
  };
  details: string[];
};

export type ContractAggregate = {
  key: string;
  contractNumber: string | null;
  pending: boolean;
  brand: string;
  commercialLine: string | null;
  commercialSubline: string | null;
  monthlyRent: number | null;
  participationRate: number | null;
  operationsStartDate: string | null;
  signatureDate: string | null;
  contractTerm: string | null;
  renewalDate: string | null;
  guaranteeStatus: string | null;
  liabilityPolicyStatus: string | null;
  projectStatus: string | null;
  contractStatus: string;
  operationalStatus: string | null;
  manager: string;
  daysRemaining: number | null;
  attention: Attention;
  stage: ContractStage | null;
  locationName: string;
  sourceSheet: string | null;
  locationId: string | null;
  score: TenantScore;
};

const currencyFormat = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });

function normalized(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX");
}

function documentNeedsAttention(value: string | null) {
  if (!value) return false;
  const key = normalized(value);
  if (!key) return false;

  if (
    key === "n/a" ||
    key.includes("no aplica") ||
    key.includes("no requerid") ||
    key.includes("vigente") ||
    key.includes("entregad") ||
    key.includes("completo") ||
    key.includes("concluid") ||
    key.includes("aprobad") ||
    key.includes("cumplid") ||
    key.includes("en regla") ||
    key.includes("cubiert") ||
    key.includes("pagad") ||
    key.includes("validad") ||
    key === "ok" ||
    key === "si" ||
    key === "sí" ||
    key === "cp" ||
    key === "c.p." ||
    key.includes("sin observacio")
  ) {
    return false;
  }

  return (
    key.includes("falta") ||
    key.includes("pendiente") ||
    key.includes("correccion") ||
    key.includes("vencid") ||
    key.includes("incomplet") ||
    key.includes("sin poliza") ||
    key.includes("sin garantia") ||
    key.includes("rechazad") ||
    key.includes("no entregad") ||
    key.includes("por actualizar") ||
    key.includes("por entregar") ||
    key.includes("observacion") ||
    key.includes("irregular") ||
    key.includes("baja")
  );
}

interface ContractDashboardChartsProps {
  contracts: ContractAggregate[];
  locationName: string;
  onFilterByStage?: (stage: string) => void;
  onFilterByAttention?: (attention: string) => void;
  onFilterByManager?: (manager: string) => void;
}

export default function ContractDashboardCharts({
  contracts,
  locationName,
  onFilterByStage,
  onFilterByAttention,
  onFilterByManager,
}: ContractDashboardChartsProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const activeContracts = useMemo(() => {
    return contracts.filter((c) => c.stage !== "cancelled" && c.stage !== "expired" && c.stage !== "agreements");
  }, [contracts]);

  const totalContracts = activeContracts.length;

  const docCompliance = useMemo(() => {
    let complete = 0;
    let guaranteeOk = 0;
    let policyOk = 0;
    let projectOk = 0;

    activeContracts.forEach((c) => {
      const gOk = !documentNeedsAttention(c.guaranteeStatus);
      const pOk = !documentNeedsAttention(c.liabilityPolicyStatus);
      const prOk = !documentNeedsAttention(c.projectStatus);

      if (gOk) guaranteeOk++;
      if (pOk) policyOk++;
      if (prOk) projectOk++;
      if (gOk && pOk && prOk) complete++;
    });

    const pending = totalContracts - complete;
    const completePct = totalContracts ? (complete / totalContracts) * 100 : 0;
    const pendingPct = totalContracts ? (pending / totalContracts) * 100 : 0;

    return {
      complete,
      pending,
      completePct,
      pendingPct,
      guaranteeOk,
      guaranteePct: totalContracts ? (guaranteeOk / totalContracts) * 100 : 0,
      policyOk,
      policyPct: totalContracts ? (policyOk / totalContracts) * 100 : 0,
      projectOk,
      projectPct: totalContracts ? (projectOk / totalContracts) * 100 : 0,
    };
  }, [activeContracts, totalContracts]);

  // 2. Stage Breakdown
  const stageDistribution = useMemo(() => {
    const counts: Record<string, { label: string; count: number; color: string; rent: number }> = {
      formalized: { label: "Formalizados", count: 0, color: "#00886f", rent: 0 },
      preformalization: { label: "Preformalización", count: 0, color: "#8a633f", rent: 0 },
      formalization: { label: "Formalización", count: 0, color: "#39a9db", rent: 0 },
      agreements: { label: "Convenios", count: 0, color: "#b56d16", rent: 0 },
    };

    activeContracts.forEach((c) => {
      const st = c.stage || "formalized";
      if (counts[st]) {
        counts[st].count++;
        counts[st].rent += c.monthlyRent ?? 0;
      }
    });

    return Object.entries(counts).map(([key, data]) => ({
      key,
      ...data,
      pct: totalContracts ? (data.count / totalContracts) * 100 : 0,
    }));
  }, [activeContracts, totalContracts]);

  // 3. Expiry / Renewal Timeline
  const expiryBuckets = useMemo(() => {
    const buckets = [
      { key: "expired", label: "Vencidos", min: -Infinity, max: -1, color: "#ac182c", count: 0, rent: 0 },
      { key: "urgent", label: "≤ 30 días", min: 0, max: 30, color: "#e65100", count: 0, rent: 0 },
      { key: "warning", label: "31 - 90 días", min: 31, max: 90, color: "#f2a900", count: 0, rent: 0 },
      { key: "ok", label: "> 90 días", min: 91, max: Infinity, color: "#00886f", count: 0, rent: 0 },
      { key: "nodate", label: "Sin fecha", min: null, max: null, color: "#9e9e9e", count: 0, rent: 0 },
    ];

    activeContracts.forEach((c) => {
      const days = c.daysRemaining;
      if (days === null) {
        buckets[4].count++;
        buckets[4].rent += c.monthlyRent ?? 0;
      } else {
        const found = buckets.find((b) => b.min !== null && days >= b.min && days <= (b.max ?? Infinity));
        if (found) {
          found.count++;
          found.rent += c.monthlyRent ?? 0;
        }
      }
    });

    const maxCount = Math.max(...buckets.map((b) => b.count), 1);
    return buckets.map((b) => ({
      ...b,
      pct: totalContracts ? (b.count / totalContracts) * 100 : 0,
      barHeight: (b.count / maxCount) * 100,
    }));
  }, [activeContracts, totalContracts]);

  // 4. Tenant Rating Scores Distribution (A+ to D)
  const ratingDistribution = useMemo(() => {
    const ratings: Record<TenantRating, { label: string; count: number; color: string; desc: string }> = {
      "A+": { label: "A+ Excelencia", count: 0, color: "#00886f", desc: "Expediente completo y operación sólida (≥90 pts)" },
      A: { label: "A Cumplimiento", count: 0, color: "#0b957e", desc: "Satisfactorio con mínima observación (75-89 pts)" },
      B: { label: "B Regular", count: 0, color: "#39a9db", desc: "Seguimiento preventivo (60-74 pts)" },
      C: { label: "C Observaciones", count: 0, color: "#f2a900", desc: "Faltante documental o fecha cercana (40-59 pts)" },
      D: { label: "D Atención Prioritaria", count: 0, color: "#ac182c", desc: "Múltiples faltantes o contrato vencido (<40 pts)" },
    };

    activeContracts.forEach((c) => {
      if (ratings[c.score.rating]) {
        ratings[c.score.rating].count++;
      }
    });

    return Object.entries(ratings).map(([rating, data]) => ({
      rating: rating as TenantRating,
      ...data,
      pct: totalContracts ? (data.count / totalContracts) * 100 : 0,
    }));
  }, [contracts, totalContracts]);

  // 5. Manager Compliance Ranking
  const managerCompliance = useMemo(() => {
    const map = new Map<string, { total: number; complete: number; rent: number }>();
    contracts.forEach((c) => {
      const mgr = c.manager || "Sin Asignar";
      const existing = map.get(mgr) ?? { total: 0, complete: 0, rent: 0 };
      existing.total += 1;
      const gOk = !documentNeedsAttention(c.guaranteeStatus);
      const pOk = !documentNeedsAttention(c.liabilityPolicyStatus);
      const prOk = !documentNeedsAttention(c.projectStatus);
      if (gOk && pOk && prOk) {
        existing.complete += 1;
      }
      existing.rent += c.monthlyRent ?? 0;
      map.set(mgr, existing);
    });

    return [...map.entries()]
      .map(([manager, data]) => ({
        manager,
        total: data.total,
        complete: data.complete,
        pending: data.total - data.complete,
        pct: data.total ? Math.round((data.complete / data.total) * 100) : 0,
        rent: data.rent,
      }))
      .sort((a, b) => b.total - a.total);
  }, [contracts]);

  // 6. SVG Donut Chart Calculation
  const donutRadius = 42;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const completeStrokeDash = (docCompliance.completePct / 100) * donutCircumference;
  const pendingStrokeDash = (docCompliance.pendingPct / 100) * donutCircumference;

  return (
    <div className="contract-dashboard-charts animate-fade-in">
      <div className="dashboard-charts-header">
        <div>
          <h3>📊 Dashboard de Control Documental y Cartera</h3>
          <p className="subtitle">
            Análisis gráfico de expedientes, vencimientos y salud comercial en <strong>{locationName}</strong> ({totalContracts} contratos analizados)
          </p>
        </div>
      </div>

      <div className="contract-charts-grid">
        {/* Chart 1: Donut Document Integration & Compliance Pillars */}
        <div className="contract-chart-card highlight-card">
          <div className="chart-card-header">
            <div>
              <span className="card-badge">Expedientes</span>
              <h4>Salud Documental de Contratos</h4>
            </div>
            <span className="doc-health-score-badge">
              {numberFormat.format(docCompliance.completePct)}% Integrados
            </span>
          </div>

          <div className="donut-and-pillars-wrapper">
            {/* SVG Donut */}
            <div className="donut-chart-container">
              <svg viewBox="0 0 100 100" className="donut-svg" aria-label="Porcentaje de expedientes integrados">
                <circle
                  cx="50"
                  cy="50"
                  r={donutRadius}
                  className="donut-bg"
                  stroke="#e2e8f0"
                  strokeWidth="12"
                  fill="transparent"
                />
                {/* Complete Segment */}
                <circle
                  cx="50"
                  cy="50"
                  r={donutRadius}
                  stroke="#00886f"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={`${completeStrokeDash} ${donutCircumference}`}
                  strokeDashoffset="0"
                  transform="rotate(-90 50 50)"
                  className="donut-segment"
                />
                {/* Pending Segment */}
                <circle
                  cx="50"
                  cy="50"
                  r={donutRadius}
                  stroke="#ac182c"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={`${pendingStrokeDash} ${donutCircumference}`}
                  strokeDashoffset={`-${completeStrokeDash}`}
                  transform="rotate(-90 50 50)"
                  className="donut-segment"
                />
              </svg>
              <div className="donut-center-text">
                <span className="donut-big-val">{docCompliance.complete}</span>
                <span className="donut-sub-text">de {totalContracts} completos</span>
              </div>
            </div>

            {/* Document Pillars */}
            <div className="doc-pillars-list">
              <div className="pillar-item">
                <div className="pillar-label-row">
                  <span>🛡️ Garantía de Cumplimiento</span>
                  <strong>{docCompliance.guaranteeOk} / {totalContracts} ({numberFormat.format(docCompliance.guaranteePct)}%)</strong>
                </div>
                <div className="pillar-progress-bar">
                  <div
                    className="pillar-fill fill-green"
                    style={{ width: `${docCompliance.guaranteePct}%` }}
                  />
                </div>
              </div>

              <div className="pillar-item">
                <div className="pillar-label-row">
                  <span>📄 Póliza R.C. (Resp. Civil)</span>
                  <strong>{docCompliance.policyOk} / {totalContracts} ({numberFormat.format(docCompliance.policyPct)}%)</strong>
                </div>
                <div className="pillar-progress-bar">
                  <div
                    className="pillar-fill fill-navy"
                    style={{ width: `${docCompliance.policyPct}%` }}
                  />
                </div>
              </div>

              <div className="pillar-item">
                <div className="pillar-label-row">
                  <span>🏗️ Proyecto de Obra</span>
                  <strong>{docCompliance.projectOk} / {totalContracts} ({numberFormat.format(docCompliance.projectPct)}%)</strong>
                </div>
                <div className="pillar-progress-bar">
                  <div
                    className="pillar-fill fill-gold"
                    style={{ width: `${docCompliance.projectPct}%` }}
                  />
                </div>
              </div>

              <div className="doc-legend-row">
                <span className="legend-dot green">✓ Expedientes Integrados ({docCompliance.complete})</span>
                <span className="legend-dot red" onClick={() => onFilterByAttention?.("Seguimiento")}>
                  ⚠️ Con Faltantes ({docCompliance.pending})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Expiration Timeline Histogram */}
        <div className="contract-chart-card">
          <div className="chart-card-header">
            <div>
              <span className="card-badge">Vencimientos</span>
              <h4>Calendario de Renovación y Término</h4>
            </div>
          </div>

          <div className="expiry-histogram-container">
            <div className="expiry-bars-row">
              {expiryBuckets.map((bucket) => (
                <div
                  key={bucket.key}
                  className="expiry-bar-column"
                  onMouseEnter={() => setActiveTooltip(`expiry-${bucket.key}`)}
                  onMouseLeave={() => setActiveTooltip(null)}
                >
                  <div className="bar-val-top">{bucket.count}</div>
                  <div className="bar-track">
                    <div
                      className="bar-fill-vertical"
                      style={{
                        height: `${Math.max(bucket.barHeight, 6)}%`,
                        backgroundColor: bucket.color,
                      }}
                    />
                  </div>
                  <span className="bar-x-label">{bucket.label}</span>
                  {activeTooltip === `expiry-${bucket.key}` && (
                    <div className="chart-tooltip">
                      <strong>{bucket.label}</strong>
                      <p>{bucket.count} contratos amparados</p>
                      <p>Renta: {currencyFormat.format(bucket.rent)} / mes</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="chart-footer-note">
              💡 Haz clic en una columna para revisar los expedientes próximos a vencer.
            </p>
          </div>
        </div>

        {/* Chart 3: Contract Stages Breakdown */}
        <div className="contract-chart-card">
          <div className="chart-card-header">
            <div>
              <span className="card-badge">Etapas</span>
              <h4>Distribución por Etapa Contractual</h4>
            </div>
          </div>

          <div className="stage-bars-list">
            {stageDistribution.map((st) => (
              <div
                key={st.key}
                className="stage-bar-item clickable"
                onClick={() => onFilterByStage?.(st.key)}
                title={`Filtrar contratos en etapa ${st.label}`}
              >
                <div className="stage-info-header">
                  <span className="stage-name">
                    <i className="stage-dot" style={{ background: st.color }} />
                    {st.label}
                  </span>
                  <span className="stage-val font-mono">
                    <strong>{st.count}</strong> <small>({numberFormat.format(st.pct)}%)</small>
                  </span>
                </div>
                <div className="stage-progress-track">
                  <div
                    className="stage-progress-fill"
                    style={{ width: `${Math.max(st.pct, 2)}%`, backgroundColor: st.color }}
                  />
                </div>
                <div className="stage-sub-info">
                  <span>Renta total: {currencyFormat.format(st.rent)}/mes</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 4: Tenant Score Ratings A+ to D */}
        <div className="contract-chart-card">
          <div className="chart-card-header">
            <div>
              <span className="card-badge">Calificación</span>
              <h4>Distribución de Salud Comercial (Tenant Ratings)</h4>
            </div>
          </div>

          <div className="ratings-grid">
            {ratingDistribution.map((item) => (
              <div key={item.rating} className="rating-card-item">
                <div className="rating-pill-header">
                  <span className={`tenant-rating-badge tone-${item.rating === "A+" || item.rating === "A" ? "ok" : item.rating === "B" ? "info" : item.rating === "C" ? "watch" : "risk"}`}>
                    {item.rating}
                  </span>
                  <span className="rating-count">{item.count} marcas</span>
                </div>
                <div className="rating-track-sm">
                  <div
                    className="rating-fill-sm"
                    style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                  />
                </div>
                <p className="rating-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 5: Manager Compliance Matrix */}
        <div className="contract-chart-card full-width-card">
          <div className="chart-card-header">
            <div>
              <span className="card-badge">Gerencias</span>
              <h4>Cumplimiento Documental por Gerente Responsable</h4>
            </div>
            <small>Total de {managerCompliance.length} responsables</small>
          </div>

          <div className="manager-compliance-table-wrapper">
            <table className="manager-chart-table">
              <thead>
                <tr>
                  <th>Gerente / Responsable</th>
                  <th>Contratos Totales</th>
                  <th>Expedientes Completos</th>
                  <th>Con Faltantes</th>
                  <th>% Integración</th>
                  <th>Renta Mensual Administrada</th>
                </tr>
              </thead>
              <tbody>
                {managerCompliance.map((mgr) => (
                  <tr
                    key={mgr.manager}
                    className="clickable-row"
                    onClick={() => onFilterByManager?.(mgr.manager)}
                    title={`Filtrar contratos asignados a ${mgr.manager}`}
                  >
                    <td>
                      <span className="manager-name-text">👤 {mgr.manager}</span>
                    </td>
                    <td className="font-mono"><strong>{mgr.total}</strong></td>
                    <td className="font-mono text-green">✓ {mgr.complete}</td>
                    <td className="font-mono text-wine">{mgr.pending > 0 ? `⚠️ ${mgr.pending}` : "0"}</td>
                    <td>
                      <div className="table-progress-cell">
                        <div className="table-bar-track">
                          <div
                            className={`table-bar-fill ${mgr.pct >= 80 ? "fill-green" : mgr.pct >= 50 ? "fill-gold" : "fill-wine"}`}
                            style={{ width: `${mgr.pct}%` }}
                          />
                        </div>
                        <span className="pct-text font-mono">{mgr.pct}%</span>
                      </div>
                    </td>
                    <td className="font-mono text-muted">{currencyFormat.format(mgr.rent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
