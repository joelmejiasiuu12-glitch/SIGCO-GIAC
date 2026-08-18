"use client";

import { useMemo, useState } from "react";
import type { LocalRecord } from "../types";

export type FinanceSubTab = "billed_vs_recovered" | "overdue_debt";

const currencyFormat = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});
const compactCurrencyFormat = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  notation: "compact",
  maximumFractionDigits: 1,
});
const numberFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const integerFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

type MonthlyBilledRecord = {
  monthId: string;
  monthName: string;
  billed: number;
  recovered: number;
  recoveredLabel: string;
  statusBadge: "superior" | "equivalent" | "superavit" | "abonado";
  statusText: string;
  statusTone: "green" | "amber" | "teal";
  percentage: number;
};

const monthlyBilledData: MonthlyBilledRecord[] = [
  {
    monthId: "enero",
    monthName: "Enero",
    billed: 30800770.52,
    recovered: 30973989.73,
    recoveredLabel: "RECUPERADO",
    statusBadge: "superior",
    statusText: "Recuperación superior a la facturación mensual.",
    statusTone: "green",
    percentage: 100.56,
  },
  {
    monthId: "febrero",
    monthName: "Febrero",
    billed: 31402687.67,
    recovered: 29200972.03,
    recoveredLabel: "RECUPERADO",
    statusBadge: "equivalent",
    statusText: "Recuperación equivalente al 93% de lo facturado.",
    statusTone: "amber",
    percentage: 92.99,
  },
  {
    monthId: "marzo",
    monthName: "Marzo",
    billed: 29545291.9,
    recovered: 30332028.28,
    recoveredLabel: "RECUPERADO",
    statusBadge: "superior",
    statusText: "Recuperación superior a la facturación mensual.",
    statusTone: "green",
    percentage: 102.66,
  },
  {
    monthId: "abril",
    monthName: "Abril",
    billed: 32084407.94,
    recovered: 30179538.59,
    recoveredLabel: "RECUPERADO",
    statusBadge: "equivalent",
    statusText: "Recuperación equivalente al 94% de lo facturado.",
    statusTone: "amber",
    percentage: 94.06,
  },
  {
    monthId: "mayo",
    monthName: "Mayo",
    billed: 28865083.92,
    recovered: 31881600.07,
    recoveredLabel: "RECUPERADO",
    statusBadge: "superavit",
    statusText: "Recuperación superior al 110% respecto a la facturación del mes.",
    statusTone: "teal",
    percentage: 110.45,
  },
  {
    monthId: "junio",
    monthName: "Junio",
    billed: 31760424.05,
    recovered: 31706080.4,
    recoveredLabel: "ABONADO",
    statusBadge: "abonado",
    statusText: "Monto abonado ligeramente inferior a lo facturado.",
    statusTone: "amber",
    percentage: 99.83,
  },
];

type BiweeklyCarteraCut = {
  dateLabel: string;
  totalAmount: number;
  clientCount: number;
};

const biweeklyCuts: BiweeklyCarteraCut[] = [
  { dateLabel: "14 de mayo", totalAmount: 1035878.2, clientCount: 22 },
  { dateLabel: "31 de mayo", totalAmount: 1094872.65, clientCount: 15 },
  { dateLabel: "23 de junio", totalAmount: 1225671.18, clientCount: 11 },
  { dateLabel: "6 de julio", totalAmount: 1106381.24, clientCount: 10 },
  { dateLabel: "20 de julio", totalAmount: 931333.98, clientCount: 11 },
  { dateLabel: "27 de julio", totalAmount: 858286.68, clientCount: 10 },
  { dateLabel: "10 de agosto", totalAmount: 646029.34, clientCount: 12 },
];

type DebtorRecord = {
  id: string;
  name: string;
  brand: string;
  amount: number;
};

const topDebtorsCorteAgosto: DebtorRecord[] = [
  { id: "1", name: "Orlando Hernández Rodríguez", brand: "Churrería Porfirio", amount: 233864.24 },
  { id: "2", name: "Juan Fernando Miranda Martínez", brand: "Tacos de Guisado", amount: 103440.09 },
  { id: "3", name: "Juan Fernando Miranda Martínez", brand: "Local Comercial", amount: 91406.5 },
  { id: "4", name: "María Elena Jurado", brand: "María Elena Jurado", amount: 49971.68 },
  { id: "5", name: "Grupo Aduanal Prida", brand: "Grupo Aduanal Prida", amount: 36085.52 },
  { id: "6", name: "Vacation Travel Advisory", brand: "Vacation Travel Advisory", amount: 31873.17 },
  { id: "7", name: "José Manuel Velázquez", brand: "José Manuel Velázquez", amount: 30183.35 },
  { id: "8", name: "Corpo Substore", brand: "Corpo Substore", amount: 26030.31 },
  { id: "9", name: "Banco Mercantil del Norte", brand: "Banorte", amount: 20265.26 },
  { id: "10", name: "Feroly", brand: "Feroly", amount: 9144.34 },
  { id: "11", name: "Ximena Aguilar", brand: "Ximena Aguilar", amount: 8084.9 },
  { id: "12", name: "BBVA México", brand: "BBVA México", amount: 5679.98 },
];

type UncollectibleAccount = {
  name: string;
  contractCode: string;
  amount: number;
};

const uncollectibleAccounts: UncollectibleAccount[] = [
  { name: "Hugo Ivan Flores Guerrero", contractCode: "AIFA-DCS-SSC-GSC-117-2024", amount: 16469.39 },
  { name: "King Oasis", contractCode: "AIFA-DCS-SSC-GSC-039-2024", amount: 772304.68 },
  { name: "Saoko Food And Drinks", contractCode: "AIFA-DCS-SSC-GSC-084-2024", amount: 30640.24 },
];

export default function FinanceCenter({
  subTab = "billed_vs_recovered",
  onChangeSubTab,
}: {
  records?: LocalRecord[];
  scopeLabel?: string;
  subTab?: FinanceSubTab;
  onUpload?: () => void;
  onChangeSubTab?: (subTab: FinanceSubTab) => void;
}) {
  const [activeSubTab, setActiveSubTab] = useState<FinanceSubTab>(subTab);

  const currentTab = onChangeSubTab ? subTab : activeSubTab;
  const setTab = (tab: FinanceSubTab) => {
    setActiveSubTab(tab);
    if (onChangeSubTab) onChangeSubTab(tab);
  };

  const billedTotals = useMemo(() => {
    const totalBilled = monthlyBilledData.reduce((sum, item) => sum + item.billed, 0);
    const totalRecovered = monthlyBilledData.reduce((sum, item) => sum + item.recovered, 0);
    const netDifference = totalRecovered - totalBilled;
    const globalEfficiency = totalBilled > 0 ? (totalRecovered / totalBilled) * 100 : 0;
    const averageMonthlyBilled = monthlyBilledData.length > 0 ? totalBilled / monthlyBilledData.length : 0;

    return {
      totalBilled,
      totalRecovered,
      netDifference,
      globalEfficiency,
      averageMonthlyBilled,
    };
  }, []);

  const overdueTotals = useMemo(() => {
    const currentCartera = biweeklyCuts[biweeklyCuts.length - 1]?.totalAmount ?? 0;
    const initialCartera = biweeklyCuts[0]?.totalAmount ?? 0;
    const maxCartera = Math.max(...biweeklyCuts.map((c) => c.totalAmount));
    const reductionAmount = initialCartera - currentCartera;
    const reductionPct = initialCartera > 0 ? (reductionAmount / initialCartera) * 100 : 0;
    const totalUncollectible = uncollectibleAccounts.reduce((sum, item) => sum + item.amount, 0);

    return {
      currentCartera,
      initialCartera,
      maxCartera,
      reductionAmount,
      reductionPct,
      totalUncollectible,
    };
  }, []);

  const isPositiveDelta = billedTotals.netDifference >= 0;

  return (
    <section className="finance-center-v2" aria-label="Módulo de Finanzas e Inteligencia de Cobranza">

      {/* VISTA 1: Facturado vs. Recuperado */}
      {currentTab === "billed_vs_recovered" && (
        <div className="finance-tab-content">
          <header className="finance-tab-header">
            <div>
              <span className="section-kicker">Reporte Mensual de Ingresos</span>
              <h2>Reporte de lo Facturado contra lo Recuperado</h2>
              <p>
                Comparativo mensual de los ingresos facturados y los recursos efectivamente recuperados en el AIFA
                (Enero a Junio 2026).
              </p>
            </div>
            <div className="finance-source-tag">
              <span>Actualización oficial</span>
              <strong>14 Jul. 2026</strong>
              <small>GSC y GEP</small>
            </div>
          </header>

          {/* KPIs Globales */}
          <div className="finance-kpi-grid">
            <article className="finance-kpi-card tone-navy">
              <span>Total Facturado (Semestre)</span>
              <strong>{currencyFormat.format(billedTotals.totalBilled)}</strong>
              <small>Promedio mensual: {compactCurrencyFormat.format(billedTotals.averageMonthlyBilled)}</small>
            </article>
            <article className="finance-kpi-card tone-green">
              <span>Total Recursos Recuperados</span>
              <strong>{currencyFormat.format(billedTotals.totalRecovered)}</strong>
              <small>Eficiencia global de cobranza: {numberFormat.format(billedTotals.globalEfficiency)}%</small>
            </article>
            <article className={`finance-kpi-card ${isPositiveDelta ? "tone-teal" : "tone-amber"}`}>
              <span>Diferencia del Semestre (Rec - Fact)</span>
              <strong style={{ color: isPositiveDelta ? "#0b957e" : "#b56d16" }}>
                {currencyFormat.format(billedTotals.netDifference)}
              </strong>
              <small>
                {isPositiveDelta
                  ? "La recuperación supera la facturación acumulada"
                  : "Facturación excede recursos recuperados (99.9% cobrado)"}
              </small>
            </article>
          </div>

          {/* Banner de Diferencia del Semestre */}
          <div className="finance-difference-banner">
            <div className="difference-icon">{isPositiveDelta ? "📈" : "📊"}</div>
            <div className="difference-info">
              <span>Diferencia del Semestre (Enero - Junio)</span>
              <strong style={{ color: isPositiveDelta ? "#00886f" : "#b56d16" }}>
                {currencyFormat.format(billedTotals.netDifference)}
              </strong>
              <p>
                {isPositiveDelta
                  ? "La recuperación acumulada supera el monto facturado en el periodo reportado."
                  : "El monto facturado en el semestre ($184,458,666.00) supera por -$184,456.90 a los recursos efectivamente recuperados en los 6 meses ($184,274,209.10), alcanzando una efectividad de cobro del 99.90% en el periodo."}
              </p>
            </div>
          </div>

          {/* Tarjetas Mensuales (Enero - Junio) */}
          <div className="finance-monthly-grid">
            {monthlyBilledData.map((item) => (
              <article key={item.monthId} className={`monthly-billed-card tone-${item.statusTone}`}>
                <header className="monthly-card-header">
                  <h3>{item.monthName}</h3>
                  <span className={`monthly-status-badge ${item.statusTone}`}>{item.percentage.toFixed(1)}%</span>
                </header>
                <div className="monthly-card-values">
                  <div className="value-block">
                    <span>📄 FACTURADO</span>
                    <strong>{currencyFormat.format(item.billed)}</strong>
                  </div>
                  <div className="value-block">
                    <span>👛 {item.recoveredLabel}</span>
                    <strong className="recovered-val">{currencyFormat.format(item.recovered)}</strong>
                  </div>
                </div>
                <div className="monthly-card-status">
                  <span className={`status-icon ${item.statusTone}`}>
                    {item.statusTone === "green" ? "✓" : item.statusTone === "teal" ? "🚀" : "⚠️"}
                  </span>
                  <p>{item.statusText}</p>
                </div>
              </article>
            ))}
          </div>

          {/* Gráfico Comparativo Mensual de Barras */}
          <article className="finance-chart-card">
            <header>
              <span className="section-kicker">Visualización Comparativa</span>
              <h3>Ingresos Facturados vs. Recursos Recuperados (Enero - Junio 2026)</h3>
            </header>
            <div className="finance-bars-list">
              {monthlyBilledData.map((item) => {
                const maxVal = Math.max(item.billed, item.recovered);
                const billedPct = (item.billed / (maxVal * 1.08)) * 100;
                const recoveredPct = (item.recovered / (maxVal * 1.08)) * 100;
                return (
                  <div key={item.monthId} className="finance-bar-row">
                    <div className="bar-row-heading">
                      <strong>{item.monthName}</strong>
                      <small>
                        Fact: {compactCurrencyFormat.format(item.billed)} | Rec:{" "}
                        {compactCurrencyFormat.format(item.recovered)}
                      </small>
                    </div>
                    <div className="bar-tracks">
                      <div className="bar-track-wrap">
                        <span className="bar-tag">Facturado</span>
                        <div className="bar-track">
                          <div className="bar-fill billed" style={{ width: `${billedPct}%` }} />
                        </div>
                      </div>
                      <div className="bar-track-wrap">
                        <span className="bar-tag">Recuperado</span>
                        <div className="bar-track">
                          <div className="bar-fill recovered" style={{ width: `${recoveredPct}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          {/* Nota aclaratoria oficial */}
          <div className="finance-disclaimer-box">
            <span className="info-icon">ℹ️</span>
            <p>
              <strong>Nota aclaratoria oficial:</strong> Los importes recuperados consideran tanto la facturación del
              periodo reportado como la cobranza acumulada derivada de adeudamientos y saldos pendientes de ejercicios y
              periodos anteriores.
            </p>
          </div>
        </div>
      )}

      {/* VISTA 2: Cartera Vencida */}
      {currentTab === "overdue_debt" && (
        <div className="finance-tab-content">
          <header className="finance-tab-header">
            <div>
              <span className="section-kicker">Seguimiento Quincenal GSC y GEP</span>
              <h2>Cartera Vencida y Cuentas Incobrables</h2>
              <p>Monitoreo quincenal de saldos vencidos, top deudores y expedientes en seguimiento directivo.</p>
            </div>
            <div className="finance-source-tag">
              <span>Corte oficial</span>
              <strong>10 Ago. 2026</strong>
              <small>GSC y GEP</small>
            </div>
          </header>

          {/* KPIs de Cartera Vencida */}
          <div className="finance-kpi-grid">
            <article className="finance-kpi-card tone-wine">
              <span>Cartera Vencida Actual</span>
              <strong>{currencyFormat.format(overdueTotals.currentCartera)}</strong>
              <small>Corte 10 de agosto 2026 · 12 registros deudores</small>
            </article>
            <article className="finance-kpi-card tone-green">
              <span>Reducción Acumulada</span>
              <strong>-47.3%</strong>
              <small>Disminución de $1.22M (junio) a $646k (agosto)</small>
            </article>
            <article className="finance-kpi-card tone-amber">
              <span>Cuentas Incobrables (Separadas)</span>
              <strong>{currencyFormat.format(overdueTotals.totalUncollectible)}</strong>
              <small>3 expedientes en seguimiento directivo especial</small>
            </article>
          </div>

          {/* Línea de tiempo quincenal de Cartera */}
          <article className="cartera-timeline-card">
            <header>
              <span className="section-kicker">Evolución Quincenal</span>
              <h3>Comportamiento de la Cartera Vencida (Mayo - Agosto)</h3>
            </header>
            <div className="cartera-timeline-grid">
              {biweeklyCuts.map((cut, idx) => (
                <div key={cut.dateLabel} className="cartera-timeline-step">
                  <div className="step-date">
                    <span>📅 {cut.dateLabel}</span>
                  </div>
                  <div className="step-amount">
                    <strong>{currencyFormat.format(cut.totalAmount)}</strong>
                  </div>
                  <div className="step-clients">
                    <span>👥 {cut.clientCount} registros</span>
                  </div>
                  {idx > 0 && (
                    <div className="step-delta">
                      <small>
                        {cut.totalAmount < biweeklyCuts[idx - 1].totalAmount
                          ? `▼ ${numberFormat.format(((biweeklyCuts[idx - 1].totalAmount - cut.totalAmount) / biweeklyCuts[idx - 1].totalAmount) * 100)}% recuperado`
                          : `▲ Incremento quincenal`}
                      </small>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </article>

          {/* Tabla de Top Deudores al corte */}
          <article className="debtors-table-card">
            <header className="debtors-table-header">
              <div>
                <h3>Principales Deudores al Corte Oficial (10 de Agosto)</h3>
                <p>12 registros concentran el saldo regular de cartera vencida.</p>
              </div>
              <span className="debtors-total-badge">{currencyFormat.format(overdueTotals.currentCartera)}</span>
            </header>
            <div className="debtors-table-wrap">
              <table className="debtors-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Deudor / Razón Social</th>
                    <th>Marca / Giro Comercial</th>
                    <th className="numeric">Saldo Vencido (MXN)</th>
                    <th className="numeric">% s/ Cartera</th>
                  </tr>
                </thead>
                <tbody>
                  {topDebtorsCorteAgosto.map((d, index) => {
                    const share = overdueTotals.currentCartera > 0 ? (d.amount / overdueTotals.currentCartera) * 100 : 0;
                    return (
                      <tr key={d.id}>
                        <td>
                          <strong>{index + 1}</strong>
                        </td>
                        <td>
                          <div className="debtor-name">
                            <strong>{d.name}</strong>
                          </div>
                        </td>
                        <td>
                          <span className="debtor-brand">{d.brand}</span>
                        </td>
                        <td className="numeric">
                          <strong className="debtor-amount">{currencyFormat.format(d.amount)}</strong>
                        </td>
                        <td className="numeric">
                          <span className="debtor-share-tag">{numberFormat.format(share)}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>

          {/* Bloque Especial: Cuentas Incobrables */}
          <article className="uncollectible-accounts-card">
            <header className="uncollectible-header">
              <div>
                <span className="section-kicker">Seguimiento Directivo Especial</span>
                <h3>Cuentas Incobrables</h3>
                <p>Registros separados de la cartera regular para no sesgar la operación diaria.</p>
              </div>
              <strong className="uncollectible-total-val">{currencyFormat.format(overdueTotals.totalUncollectible)}</strong>
            </header>

            <div className="uncollectible-grid">
              {uncollectibleAccounts.map((account) => (
                <div key={account.contractCode} className="uncollectible-item">
                  <div className="uncollectible-item-top">
                    <strong>{account.name}</strong>
                    <span className="uncollectible-code">{account.contractCode}</span>
                  </div>
                  <div className="uncollectible-item-amount">
                    <span>Monto registrado:</span>
                    <strong>{currencyFormat.format(account.amount)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
