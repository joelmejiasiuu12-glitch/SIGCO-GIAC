"use client";

import { useMemo, useState } from "react";
import type { LocalRecord } from "../types";

const currencyFormat = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
const compactCurrencyFormat = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  notation: "compact",
  maximumFractionDigits: 1,
});
const numberFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const percentFormat = new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 1 });

type ParticipationFilter = "all" | "with" | "without";

type FinancialContract = {
  key: string;
  contractNumber: string | null;
  brand: string;
  locationName: string;
  monthlyRent: number;
  hasMonthlyRent: boolean;
  annualProjection: number;
  missingRenewalDates: number;
  costPerM2: number | null;
  participationRate: number | null;
  participationNotes: string | null;
  area: number;
  locals: LocalRecord[];
};

function normalized(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX");
}

function firstText(records: LocalRecord[], key: keyof LocalRecord) {
  const value = records.map((record) => record[key]).find((candidate) => String(candidate ?? "").trim());
  return value === null || value === undefined ? null : String(value).trim();
}

function isCurrentFinancialRecord(record: LocalRecord) {
  const stage = record.contractStage;
  const status = normalized(record.contractStatus);
  const isTerminal = stage === "cancelled" || stage === "expired" || stage === "agreements"
    || status.includes("cancel") || status.includes("fenec") || status.includes("vencid")
    || status.includes("concluid") || status.includes("terminad") || status.includes("convenio");
  const hasFinancialData = record.monthlyRent !== null || record.costPerM2 !== null || record.participationRate !== null;
  return !isTerminal && hasFinancialData;
}

function isOperating(record: LocalRecord) {
  return normalized(record.estatus) === "en funcionamiento";
}

function projectedMonths(renewalDate: string | null) {
  if (!renewalDate) return null;
  const endDate = new Date(`${renewalDate}T23:59:59`);
  if (Number.isNaN(endDate.getTime())) return null;
  const remainingDays = (endDate.getTime() - Date.now()) / 86_400_000;
  return Math.min(12, Math.max(0, remainingDays / 30.4375));
}

function buildFinancialContracts(records: LocalRecord[]) {
  const groups = new Map<string, LocalRecord[]>();
  records.filter(isCurrentFinancialRecord).forEach((record) => {
    const locationKey = record.contractLocationId ?? record.contractLocationName ?? record.contractSourceSheet ?? "sin-zona";
    const key = record.contractNumber
      ? `contract:${locationKey}:${normalized(record.contractNumber)}`
      : `record:${locationKey}:${record.id}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  });

  return [...groups.entries()].map(([key, locals]) => {
    const rents = locals.map((record) => record.monthlyRent).filter((value): value is number => value !== null);
    const pricedArea = locals.filter((record) => record.costPerM2 !== null);
    const weightedArea = pricedArea.reduce((total, record) => total + (record.metraje ?? 0), 0);
    const costPerM2 = pricedArea.length
      ? weightedArea > 0
        ? pricedArea.reduce((total, record) => total + (record.costPerM2 ?? 0) * (record.metraje ?? 0), 0) / weightedArea
        : pricedArea.reduce((total, record) => total + (record.costPerM2 ?? 0), 0) / pricedArea.length
      : null;
    const monthlyRent = rents.reduce((total, value) => total + value, 0);
    const operatingRentRecords = locals.filter((record) => isOperating(record) && record.monthlyRent !== null);
    const annualProjection = operatingRentRecords.reduce((total, record) => {
      const months = projectedMonths(record.renewalDate);
      return total + (months === null ? 0 : (record.monthlyRent ?? 0) * months);
    }, 0);
    return {
      key,
      contractNumber: firstText(locals, "contractNumber"),
      brand: firstText(locals, "marca") ?? "Sin marca asignada",
      locationName: firstText(locals, "contractLocationName") ?? firstText(locals, "contractSourceSheet") ?? "Zona no indicada",
      monthlyRent,
      hasMonthlyRent: rents.length > 0,
      annualProjection,
      missingRenewalDates: operatingRentRecords.filter((record) => projectedMonths(record.renewalDate) === null).length,
      costPerM2,
      participationRate: locals.map((record) => record.participationRate).find((value) => value !== null) ?? null,
      participationNotes: firstText(locals, "participationNotes"),
      area: locals.reduce((total, record) => total + (record.metraje ?? 0), 0),
      locals,
    } satisfies FinancialContract;
  }).sort((a, b) => b.monthlyRent - a.monthlyRent || a.brand.localeCompare(b.brand, "es-MX"));
}

function FinancialKpi({ label, value, note, tone }: { label: string; value: string; note: string; tone: "wine" | "green" | "navy" | "gold" | "blue" }) {
  return (
    <article className={`finance-kpi finance-kpi-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function HorizontalMoneyChart({ title, kicker, data, emptyText }: { title: string; kicker: string; data: [string, number][]; emptyText: string }) {
  const visible = data.filter(([, value]) => value > 0).slice(0, 7);
  const maximum = Math.max(...visible.map(([, value]) => value), 1);
  return (
    <article className="finance-card finance-chart-card">
      <div className="finance-card-heading"><div><span>{kicker}</span><h3>{title}</h3></div><small>MXN mensuales</small></div>
      {visible.length ? (
        <div className="finance-money-bars">
          {visible.map(([label, value]) => (
            <div className="finance-money-row" key={label}>
              <span title={label}>{label}</span>
              <div><i style={{ width: `${Math.max((value / maximum) * 100, 3)}%` }} /></div>
              <strong>{compactCurrencyFormat.format(value)}</strong>
            </div>
          ))}
        </div>
      ) : <p className="finance-card-empty">{emptyText}</p>}
    </article>
  );
}

export default function FinanceCenter({ records, scopeLabel, onUpload }: { records: LocalRecord[]; scopeLabel: string; onUpload: () => void }) {
  const contracts = useMemo(() => buildFinancialContracts(records), [records]);
  const [search, setSearch] = useState("");
  const [participation, setParticipation] = useState<ParticipationFilter>("all");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const filteredContracts = useMemo(() => {
    const query = normalized(search.trim());
    return contracts.filter((contract) => {
      const matchesSearch = !query || [contract.contractNumber, contract.brand, contract.locationName, ...contract.locals.map((local) => local.nomenclatura)]
        .some((value) => normalized(value).includes(query));
      const matchesParticipation = participation === "all"
        || (participation === "with" ? contract.participationRate !== null : contract.participationRate === null);
      return matchesSearch && matchesParticipation;
    });
  }, [contracts, participation, search]);

  const metrics = useMemo(() => {
    const selectedRecords = filteredContracts.flatMap((contract) => contract.locals);
    const rentRecords = selectedRecords.filter((record) => isOperating(record) && record.monthlyRent !== null);
    const pricedContracts = filteredContracts.filter((contract) => contract.costPerM2 !== null);
    const monthlyRent = rentRecords.reduce((total, record) => total + (record.monthlyRent ?? 0), 0);
    const totalPricedArea = pricedContracts.reduce((total, contract) => total + contract.area, 0);
    const averageCostPerM2 = pricedContracts.length
      ? totalPricedArea > 0
        ? pricedContracts.reduce((total, contract) => total + (contract.costPerM2 ?? 0) * contract.area, 0) / totalPricedArea
        : pricedContracts.reduce((total, contract) => total + (contract.costPerM2 ?? 0), 0) / pricedContracts.length
      : 0;
    return {
      monthlyRent,
      annualProjection: filteredContracts.reduce((total, contract) => total + contract.annualProjection, 0),
      averageRent: rentRecords.length ? monthlyRent / rentRecords.length : 0,
      averageCostPerM2,
      rentRecords: rentRecords.length,
      missingRenewalDates: filteredContracts.reduce((total, contract) => total + contract.missingRenewalDates, 0),
      participationRecords: selectedRecords.filter((record) => record.participationRate !== null).length,
    };
  }, [filteredContracts]);

  const rentByLocation = useMemo(() => {
    const totals = new Map<string, number>();
    filteredContracts.forEach((contract) => {
      const operatingRent = contract.locals.filter((record) => isOperating(record)).reduce((total, record) => total + (record.monthlyRent ?? 0), 0);
      totals.set(contract.locationName, (totals.get(contract.locationName) ?? 0) + operatingRent);
    });
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [filteredContracts]);

  const topContracts = filteredContracts.map((contract) => [
    contract.brand,
    contract.locals.filter((record) => isOperating(record)).reduce((total, record) => total + (record.monthlyRent ?? 0), 0),
  ] as [string, number]).sort((a, b) => b[1] - a[1]).slice(0, 7);

  const costRanking = [...filteredContracts]
    .filter((contract): contract is FinancialContract & { costPerM2: number } => contract.costPerM2 !== null)
    .sort((a, b) => b.costPerM2 - a.costPerM2)
    .slice(0, 7);
  const maxCost = Math.max(...costRanking.map((contract) => contract.costPerM2), 1);

  const rentRanges = [
    { label: "Hasta $25 mil", minimum: 0, maximum: 25_000 },
    { label: "$25–50 mil", minimum: 25_000, maximum: 50_000 },
    { label: "$50–100 mil", minimum: 50_000, maximum: 100_000 },
    { label: "$100–250 mil", minimum: 100_000, maximum: 250_000 },
    { label: "Más de $250 mil", minimum: 250_000, maximum: Number.POSITIVE_INFINITY },
  ].map((range) => ({
    ...range,
    count: filteredContracts.filter((contract) => {
      const operatingRent = contract.locals.filter((record) => isOperating(record)).reduce((total, record) => total + (record.monthlyRent ?? 0), 0);
      return operatingRent > range.minimum && operatingRent <= range.maximum;
    }).length,
  }));
  const maxRangeCount = Math.max(...rentRanges.map((range) => range.count), 1);

  if (!contracts.length) {
    return (
      <section className="finance-center finance-empty-state" aria-label="Finanzas">
        <span className="finance-empty-mark">MXN</span>
        <h2>No hay información financiera disponible</h2>
        <p>Carga el libro consolidado con renta mensual, porcentaje de participación o costo por metro cuadrado para generar el tablero.</p>
        <button type="button" className="primary-button" onClick={onUpload}>Cargar Excel local</button>
      </section>
    );
  }

  return (
    <section className="finance-center" aria-label="Tablero financiero">
      <div className="finance-toolbar">
        <div>
          <span className="section-kicker">Etapa 1 · Condiciones económicas vigentes</span>
          <h2>Resumen financiero</h2>
          <small className="finance-scope-name">{scopeLabel}</small>
        </div>
        <div className="finance-filters">
          <label><span>Buscar contrato o marca</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ej. contrato, local o marca" /></label>
          <label><span>Participación</span><select value={participation} onChange={(event) => setParticipation(event.target.value as ParticipationFilter)}><option value="all">Todos</option><option value="with">Con participación</option><option value="without">Sin participación</option></select></label>
        </div>
      </div>

      <div className="finance-kpi-grid">
        <FinancialKpi tone="wine" label="Renta mensual contratada" value={currencyFormat.format(metrics.monthlyRent)} note={`${numberFormat.format(metrics.rentRecords)} locales en funcionamiento con renta`} />
        <FinancialKpi tone="green" label="Proyección próximos 12 meses" value={compactCurrencyFormat.format(metrics.annualProjection)} note={metrics.missingRenewalDates ? `${metrics.missingRenewalDates} locales sin fecha excluidos` : "Ajustada a la fecha de renovación"} />
        <FinancialKpi tone="navy" label="Renta promedio" value={currencyFormat.format(metrics.averageRent)} note="Promedio por local en funcionamiento" />
        <FinancialKpi tone="gold" label="Costo promedio por m²" value={currencyFormat.format(metrics.averageCostPerM2)} note="Promedio ponderado por superficie" />
        <FinancialKpi tone="blue" label="Locales con participación" value={numberFormat.format(metrics.participationRecords)} note={`${records.length ? percentFormat.format(metrics.participationRecords / records.length) : "0%"} de los registros de la zona`} />
      </div>

      <div className="finance-dashboard-grid">
        <HorizontalMoneyChart title="Renta mensual por zona" kicker="Distribución territorial" data={rentByLocation} emptyText="No hay rentas registradas para esta selección." />
        <HorizontalMoneyChart title="Contratos con mayor renta" kicker="Principales contratos" data={topContracts} emptyText="No hay rentas registradas para esta selección." />
        <article className="finance-card finance-chart-card">
          <div className="finance-card-heading"><div><span>Comparativo contractual</span><h3>Costo por metro cuadrado</h3></div><small>Top 7 · MXN/m²</small></div>
          {costRanking.length ? <div className="finance-cost-bars">{costRanking.map((contract) => <div key={contract.key}><span title={contract.brand}>{contract.brand}</span><i><em style={{ width: `${Math.max((contract.costPerM2 / maxCost) * 100, 3)}%` }} /></i><strong>{currencyFormat.format(contract.costPerM2)}</strong></div>)}</div> : <p className="finance-card-empty">No hay costos por m² para esta selección.</p>}
        </article>
        <article className="finance-card finance-chart-card">
          <div className="finance-card-heading"><div><span>Composición de cartera</span><h3>Distribución de renta mensual</h3></div><small>Contratos con locales operando</small></div>
          <div className="finance-range-chart">{rentRanges.map((range) => <div key={range.label}><strong>{range.count}</strong><i><em style={{ height: `${Math.max((range.count / maxRangeCount) * 100, range.count ? 8 : 0)}%` }} /></i><span>{range.label}</span></div>)}</div>
        </article>
      </div>

      <article className="finance-future-card">
        <div><span>Próxima etapa</span><h3>Participación e histórico mensual</h3><p>El tablero ya identifica los contratos sujetos a participación. Cuando Cobranza aporte el ingreso mensual, aquí se calculará la renta aplicable y se comparará mes contra mes sin alterar los periodos anteriores.</p></div>
        <ul><li>Ingreso reportado por mes</li><li>Renta fija vs. participación</li><li>Variación mensual y anual</li><li>Alertas de datos pendientes</li></ul>
        <strong>Datos de Cobranza pendientes</strong>
      </article>

      <article className="finance-table-card">
        <div className="finance-table-heading"><div><span className="section-kicker">Detalle financiero</span><h3>Contratos financieros</h3><p>{numberFormat.format(filteredContracts.length)} contratos en la selección actual.</p></div></div>
        {filteredContracts.length ? <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Contrato / arrendatario</th><th>Zona</th><th>Renta mensual</th><th>Costo/m²</th><th>Participación</th><th>Proyección a 12 meses</th><th aria-label="Detalle" /></tr></thead><tbody>{filteredContracts.map((contract) => {
          const expanded = expandedKey === contract.key;
          return [
            <tr key={contract.key} className={expanded ? "finance-row-expanded" : ""}>
              <td><strong>{contract.contractNumber ?? "Sin número de contrato"}</strong><small>{contract.brand} · {contract.locals.length} {contract.locals.length === 1 ? "espacio" : "espacios"}</small></td>
              <td>{contract.locationName}</td>
              <td className="finance-numeric"><strong>{contract.hasMonthlyRent ? currencyFormat.format(contract.monthlyRent) : "—"}</strong></td>
              <td className="finance-numeric">{contract.costPerM2 === null ? "—" : currencyFormat.format(contract.costPerM2)}</td>
              <td>{contract.participationRate === null ? <span className="finance-badge muted">No aplica</span> : <span className="finance-badge">{percentFormat.format(contract.participationRate)}</span>}</td>
              <td className="finance-numeric">{contract.annualProjection > 0 ? currencyFormat.format(contract.annualProjection) : "—"}</td>
              <td><button type="button" className="finance-detail-button" aria-expanded={expanded} onClick={() => setExpandedKey(expanded ? null : contract.key)}>{expanded ? "Cerrar" : "Ver detalle"}</button></td>
            </tr>,
            expanded ? <tr key={`${contract.key}-detail`} className="finance-detail-row"><td colSpan={7}><div className="finance-contract-detail"><div><span>Superficie vinculada</span><strong>{numberFormat.format(contract.area)} m²</strong></div><div><span>Proyección próximos 12 meses</span><strong>{contract.annualProjection > 0 ? currencyFormat.format(contract.annualProjection) : "Sin proyección"}</strong></div><div><span>Condición de participación</span><strong>{contract.participationRate === null ? "No aplica / sin dato" : percentFormat.format(contract.participationRate)}</strong><small>{contract.participationNotes}</small></div><div className="finance-linked-locals"><span>Espacios incluidos</span><p>{contract.locals.map((local) => local.nomenclatura || "Sin nomenclatura").join(" · ")}</p></div></div></td></tr> : null,
          ];
        })}</tbody></table></div> : <p className="finance-no-results">No hay contratos que coincidan con los filtros seleccionados.</p>}
      </article>
    </section>
  );
}
