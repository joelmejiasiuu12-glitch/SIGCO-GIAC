"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { ContractStage, LocalRecord } from "@/app/types";

const CONTRACT_PAGE_SIZE = 12;
const RELATION_PAGE_SIZE = 18;

const currencyFormat = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const percentFormat = new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 1 });

type Attention = "Crítico" | "Seguimiento" | "En orden";
type ContractViewMode = "summary" | ContractStage;
type RelationViewMode = "table" | "attention";

type ContractAggregate = {
  key: string;
  contractNumber: string | null;
  pending: boolean;
  locals: LocalRecord[];
  brand: string;
  commercialLine: string | null;
  commercialSubline: string | null;
  monthlyRent: number | null;
  participationRate: number | null;
  participationNotes: string | null;
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

function daysUntil(date: string | null) {
  if (!date) return null;
  const target = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.ceil((target.getTime() - utcToday) / 86_400_000);
}

function documentNeedsAttention(value: string | null) {
  const key = normalized(value);
  return !key || key.includes("falta") || key.includes("correccion") || key === "n/a";
}

function stageForRecord(record: LocalRecord): ContractStage | null {
  if (record.contractStage) return record.contractStage;
  const status = normalized([record.contractStatus, record.estatus, record.situacion, record.operationalStatus].filter(Boolean).join(" "));
  if (status.includes("convenio")) return "agreements";
  if (status.includes("cancel") || status.includes("rescind")) return "cancelled";
  if (status.includes("fenec") || status.includes("vencid") || status.includes("concluid") || status.includes("terminad")) return "expired";
  if (status.includes("preformal")) return "preformalization";
  if (status.includes("formalizacion") && !status.includes("formalizado")) return "formalization";
  if (!record.contractNumber && (record.contractPending || status.includes("proceso de asignacion"))) return "preformalization";
  if (record.contractNumber && (
    documentNeedsAttention(record.guaranteeStatus) ||
    documentNeedsAttention(record.liabilityPolicyStatus) ||
    documentNeedsAttention(record.projectStatus)
  ) && !status.includes("formalizado") && !status.includes("vigente")) return "formalization";
  if (record.contractNumber || status.includes("formalizado") || status.includes("vigente")) return "formalized";
  return null;
}

function stageLabel(stage: ContractStage | null) {
  if (stage === "preformalization") return "En preformalización";
  if (stage === "formalization") return "En formalización";
  if (stage === "formalized") return "Formalizado";
  if (stage === "cancelled") return "Cancelado";
  if (stage === "expired") return "Fenecido";
  if (stage === "agreements") return "Convenio";
  return "Sin clasificación";
}

function attentionFor(contract: Omit<ContractAggregate, "attention">): Attention {
  if (contract.daysRemaining !== null && contract.daysRemaining <= 30) return "Crítico";
  if (
    contract.daysRemaining !== null && contract.daysRemaining <= 90 ||
    documentNeedsAttention(contract.guaranteeStatus) ||
    documentNeedsAttention(contract.liabilityPolicyStatus) ||
    documentNeedsAttention(contract.projectStatus)
  ) return "Seguimiento";
  return "En orden";
}

function buildContracts(records: LocalRecord[]) {
  const groups = new Map<string, LocalRecord[]>();
  records.forEach((record) => {
    const stage = stageForRecord(record);
    const hasContractSection = Boolean(
      stage || record.contractNumber || record.contractPending || record.contractStatus || record.manager || record.monthlyRent !== null || record.renewalDate,
    );
    if (!hasContractSection) return;
    const terminalStage = stage === "cancelled" || stage === "expired" || stage === "agreements" ? stage : "current";
    const key = record.contractNumber
      ? `contract:${terminalStage}:${record.contractNumber}`
      : `pending:${record.contractSourceSheet ?? record.contractLocationName ?? "zone"}:${record.id}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  });

  return [...groups.entries()].map(([key, locals]) => {
    const stage = locals.map(stageForRecord).find((value): value is ContractStage => Boolean(value)) ?? null;
    const contractNumber = firstText(locals, "contractNumber");
    const rents = locals.map((record) => record.monthlyRent).filter((value): value is number => value !== null);
    const participation = locals.map((record) => record.participationRate).find((value) => value !== null) ?? null;
    const renewalDate = firstText(locals, "renewalDate");
    const base = {
      key,
      contractNumber,
      pending: !contractNumber,
      locals,
      brand: firstText(locals, "marca") ?? "Sin marca asignada",
      commercialLine: firstText(locals, "commercialLine"),
      commercialSubline: firstText(locals, "commercialSubline"),
      monthlyRent: rents.length ? rents.reduce((total, value) => total + value, 0) : null,
      participationRate: participation,
      participationNotes: firstText(locals, "participationNotes"),
      operationsStartDate: firstText(locals, "operationsStartDate"),
      signatureDate: firstText(locals, "signatureDate"),
      contractTerm: firstText(locals, "contractTerm"),
      renewalDate,
      guaranteeStatus: firstText(locals, "guaranteeStatus"),
      liabilityPolicyStatus: firstText(locals, "liabilityPolicyStatus"),
      projectStatus: firstText(locals, "projectStatus"),
      contractStatus: firstText(locals, "contractStatus") ?? stageLabel(stage),
      operationalStatus: firstText(locals, "operationalStatus"),
      manager: firstText(locals, "manager") ?? "Sin asignar",
      daysRemaining: daysUntil(renewalDate),
      stage,
      locationName: firstText(locals, "contractLocationName") ?? "Zona no indicada",
      sourceSheet: firstText(locals, "contractSourceSheet"),
      locationId: firstText(locals, "contractLocationId"),
    } satisfies Omit<ContractAggregate, "attention">;
    return { ...base, attention: attentionFor(base) };
  }).sort((a, b) => {
    if (a.pending !== b.pending) return a.pending ? 1 : -1;
    const aDays = a.daysRemaining ?? Number.POSITIVE_INFINITY;
    const bDays = b.daysRemaining ?? Number.POSITIVE_INFINITY;
    return aDays - bDays || (a.contractNumber ?? a.brand).localeCompare(b.contractNumber ?? b.brand, "es", { numeric: true });
  });
}

function formatDate(value: string | null) {
  if (!value) return "Sin dato";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function daysLabel(days: number | null) {
  if (days === null) return "Sin fecha";
  if (days < 0) return `Vencido hace ${Math.abs(days)} días`;
  if (days === 0) return "Vence hoy";
  return `${days} días`;
}

function statusColor(value: string) {
  const key = normalized(value);
  if (key.includes("formalizado") && !key.includes("pre")) return "#00886f";
  if (key.includes("preformalizacion")) return "#8a633f";
  if (key.includes("formalizacion")) return "#39a9db";
  if (key.includes("falta") || key.includes("vencid")) return "#ac182c";
  return "#7b878e";
}

function AttentionBadge({ value }: { value: Attention }) {
  return <span className={`attention-badge attention-${normalized(value).replaceAll(" ", "-")}`}>{value}</span>;
}

function DocumentFact({ label, value }: { label: string; value: string | null }) {
  const display = value ?? "Sin dato";
  return (
    <div className="contract-document-fact">
      <span>{label}</span>
      <strong className={documentNeedsAttention(value) ? "needs-attention" : ""}>{display}</strong>
    </div>
  );
}

export default function ContractCenter({ records, locationName, mode = "summary", onOpenLocal }: { records: LocalRecord[]; locationName: string; mode?: ContractViewMode; onOpenLocal?: (nomenclature: string, locationId: string | null) => void }) {
  const contracts = useMemo(() => buildContracts(records), [records]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [manager, setManager] = useState("");
  const [attention, setAttention] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const modeContracts = useMemo(() => {
    if (mode === "summary") return contracts;
    return contracts.filter((contract) => contract.stage === mode);
  }, [contracts, mode]);
  const statuses = useMemo(() => [...new Set(modeContracts.map((contract) => contract.contractStatus))].sort(), [modeContracts]);
  const managers = useMemo(() => [...new Set(modeContracts.map((contract) => contract.manager))].sort(), [modeContracts]);
  const filtered = useMemo(() => {
    const term = normalized(query.trim());
    return modeContracts.filter((contract) => {
      const haystack = [contract.contractNumber, contract.brand, contract.manager, contract.commercialLine, ...contract.locals.map((local) => local.nomenclatura)].join(" ");
      return (!term || normalized(haystack).includes(term)) &&
        (!status || contract.contractStatus === status) &&
        (!manager || contract.manager === manager) &&
        (!attention || contract.attention === attention);
    });
  }, [attention, manager, modeContracts, query, status]);

  const pageSize = CONTRACT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const preformalization = contracts.filter((contract) => contract.stage === "preformalization").length;
  const formalization = contracts.filter((contract) => contract.stage === "formalization").length;
  const formalized = contracts.filter((contract) => contract.stage === "formalized").length;
  const closed = contracts.filter((contract) => contract.stage === "cancelled" || contract.stage === "expired").length;
  const agreements = contracts.filter((contract) => contract.stage === "agreements").length;

  const resetPage = () => { setPage(1); setExpanded(null); };
  useEffect(() => {
    setPage(1);
    setExpanded(null);
    setQuery("");
    setStatus("");
    setManager("");
    setAttention("");
  }, [mode]);

  const headings: Record<ContractViewMode, { kicker: string; title: string; description: string }> = {
    summary: { kicker: "Control contractual", title: "Resumen de contratos", description: "Cartera completa: vigentes, en preformalización, en formalización, formalizados, cancelados, fenecidos y convenios." },
    preformalization: { kicker: "Integración inicial", title: "En preformalización", description: "Locales próximos a formalizarse que todavía no cuentan con número de contrato." },
    formalization: { kicker: "Integración documental", title: "En formalización", description: "Contratos en proceso que aún requieren garantía de cumplimiento, póliza de R.C. o proyecto de obra." },
    formalized: { kicker: "Cartera vigente", title: "Formalizados", description: "Contratos formalizados con número y documentación contractual integrada." },
    cancelled: { kicker: "Cartera concluida", title: "Contratos cancelados", description: "Registros procedentes de la hoja Contratos Cancelados del libro cargado." },
    expired: { kicker: "Cartera concluida", title: "Contratos fenecidos", description: "Registros procedentes de la hoja Contratos Fenecidos del libro cargado." },
    agreements: { kicker: "Instrumentos relacionados", title: "Convenios", description: "Convenios registrados en la hoja del mismo nombre dentro del libro cargado." },
  };
  const heading = headings[mode];

  if (!contracts.length) return <ContractEmptyState locationName={locationName} />;

  return (
    <section className="contract-center" aria-label={`Contratos de ${locationName}`}>
      <div className="contract-section-heading">
        <div><span className="section-kicker">{heading.kicker}</span><h2>{heading.title}</h2><p>{heading.description}</p></div>
        <span className="contract-zone-pill">{locationName}</span>
      </div>

      <div className="contract-kpi-grid">
        <ContractKpi label="En preformalización" value={preformalization} accent="#8a633f" />
        <ContractKpi label="En formalización" value={formalization} accent="#39a9db" />
        <ContractKpi label="Formalizados" value={formalized} accent="#00886f" />
        <ContractKpi label="Cancelados / fenecidos" value={closed} accent="#ac182c" />
        <ContractKpi label="Convenios" value={agreements} accent="#405364" />
      </div>

      <div className="contract-toolbar">
        <label className="contract-search"><span>Buscar contrato, marca o local</span><input value={query} onChange={(event) => { setQuery(event.target.value); resetPage(); }} placeholder="Ej. AIFA-DCS o LLENA-02" /></label>
        <label><span>Situación</span><select value={status} onChange={(event) => { setStatus(event.target.value); resetPage(); }}><option value="">Todas</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>Gestor</span><select value={manager} onChange={(event) => { setManager(event.target.value); resetPage(); }}><option value="">Todos</option>{managers.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>Atención</span><select value={attention} onChange={(event) => { setAttention(event.target.value); resetPage(); }}><option value="">Todos</option><option>Crítico</option><option>Seguimiento</option><option>En orden</option></select></label>
      </div>

      <div className="contract-result-line"><strong>{filtered.length}</strong> {mode === "summary" ? "contratos e instrumentos en la cartera" : "registros encontrados en esta etapa"}</div>
      {filtered.length ? <div className="contract-table-wrap">
        <table className="contract-table">
          <thead><tr><th>Contrato</th><th>Marca / giro</th><th>Locales</th><th>Renta mensual</th><th>Renovación</th><th>Situación</th><th>Gestor</th><th><span className="sr-only">Detalle</span></th></tr></thead>
          <tbody>
            {pageRows.map((contract) => (
              <ContractRows key={contract.key} contract={contract} expanded={expanded === contract.key} onToggle={() => setExpanded(expanded === contract.key ? null : contract.key)} onOpenLocal={onOpenLocal} />
            ))}
          </tbody>
        </table>
      </div> : <div className="contract-mode-empty"><strong>Sin casos en esta vista</strong><span>No se encontraron expedientes que cumplan con este criterio.</span></div>}
      {filtered.length > 0 && <Pager page={page} totalPages={totalPages} onChange={(next) => { setPage(next); setExpanded(null); }} />}
    </section>
  );
}

function ContractRows({ contract, expanded, onToggle, onOpenLocal }: { contract: ContractAggregate; expanded: boolean; onToggle: () => void; onOpenLocal?: (nomenclature: string, locationId: string | null) => void }) {
  return (
    <>
      <tr className={expanded ? "expanded-row" : ""}>
        <td><strong className="contract-number">{contract.contractNumber ?? "Sin número"}</strong><small>{contract.pending ? "Expediente en trámite" : `${contract.locals.length} ${contract.locals.length === 1 ? "local relacionado" : "locales relacionados"}`}</small></td>
        <td><strong>{contract.brand}</strong><small>{contract.commercialSubline ?? contract.commercialLine ?? "Sin giro contractual"}</small><small>{contract.locationName}</small></td>
        <td><div className="local-chip-list">{contract.locals.slice(0, 3).map((local) => onOpenLocal ? <button type="button" key={`${local.contractSourceSheet}-${local.id}`} onClick={() => onOpenLocal(local.nomenclatura, local.contractLocationId ?? contract.locationId)} aria-label={`Abrir local ${local.nomenclatura}`}>{local.nomenclatura}</button> : <span key={`${local.contractSourceSheet}-${local.id}`}>{local.nomenclatura}</span>)}{contract.locals.length > 3 && <span>+{contract.locals.length - 3}</span>}</div></td>
        <td className="numeric"><strong>{contract.monthlyRent === null ? "—" : currencyFormat.format(contract.monthlyRent)}</strong></td>
        <td><strong>{formatDate(contract.renewalDate)}</strong><small><span className={`days-label ${contract.attention === "Crítico" ? "critical" : contract.attention === "Seguimiento" ? "watch" : ""}`}>{daysLabel(contract.daysRemaining)}</span></small></td>
        <td><span className="status-badge" style={{ "--status": statusColor(contract.contractStatus) } as CSSProperties}>{contract.contractStatus}</span><small><AttentionBadge value={contract.attention} /></small></td>
        <td><strong>{contract.manager}</strong></td>
        <td><button type="button" className="detail-button" onClick={onToggle} aria-expanded={expanded} aria-label={`${expanded ? "Ocultar" : "Mostrar"} contrato ${contract.contractNumber ?? contract.brand}`}>{expanded ? "−" : "+"}</button></td>
      </tr>
      {expanded && (
        <tr className="contract-detail-row"><td colSpan={8}>
          <div className="contract-detail-panel">
            <div className="contract-detail-group"><span>Información contractual</span><dl>
              <div><dt>Giro comercial</dt><dd>{contract.commercialLine ?? "Sin dato"}</dd></div>
              <div><dt>Subgiro</dt><dd>{contract.commercialSubline ?? "Sin dato"}</dd></div>
              <div><dt>Participación</dt><dd>{contract.participationRate === null ? "No aplica / sin dato" : percentFormat.format(contract.participationRate)}{contract.participationNotes ? ` · ${contract.participationNotes}` : ""}</dd></div>
              <div><dt>Vigencia</dt><dd>{contract.contractTerm ?? "Sin dato"}</dd></div>
            </dl></div>
            <div className="contract-detail-group"><span>Fechas</span><dl>
              <div><dt>Firma</dt><dd>{formatDate(contract.signatureDate)}</dd></div>
              <div><dt>Inicio de operaciones</dt><dd>{formatDate(contract.operationsStartDate)}</dd></div>
              <div><dt>Renovación</dt><dd>{formatDate(contract.renewalDate)}</dd></div>
              <div><dt>Días restantes</dt><dd>{daysLabel(contract.daysRemaining)}</dd></div>
            </dl></div>
            <div className="contract-detail-group contract-documents"><span>Cumplimiento documental</span><div>
              <DocumentFact label="Garantía de cumplimiento" value={contract.guaranteeStatus} />
              <DocumentFact label="Póliza de R.C." value={contract.liabilityPolicyStatus} />
              <DocumentFact label="Proyecto de obra" value={contract.projectStatus} />
              <DocumentFact label="Estado operativo" value={contract.operationalStatus} />
            </div></div>
            <div className="contract-detail-group contract-related-locals"><span>Locales incluidos</span><div>{contract.locals.map((local) => <article key={local.id}><strong>{local.nomenclatura}</strong><small>{numberFormat.format(local.metraje ?? 0)} m² · {local.areaComercial}</small><span>{local.monthlyRent === null ? "Renta sin dato" : currencyFormat.format(local.monthlyRent)}</span></article>)}</div></div>
            <div className="contract-detail-group"><span>Origen del registro</span><dl><div><dt>Zona comercial</dt><dd>{contract.locationName}</dd></div><div><dt>Hoja de origen</dt><dd>{contract.sourceSheet ?? "Relación de zona"}</dd></div></dl></div>
          </div>
        </td></tr>
      )}
    </>
  );
}

export function ContractRelations({ records, locationName, mode = "table" }: { records: LocalRecord[]; locationName: string; mode?: RelationViewMode }) {
  const relations = useMemo(() => records.filter((record) => Boolean(record.contractNumber || record.contractPending || record.contractStatus || record.manager || record.renewalDate)), [records]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [manager, setManager] = useState("");
  const [page, setPage] = useState(1);
  const statuses = useMemo(() => [...new Set(relations.map((record) => record.contractStatus).filter((value): value is string => Boolean(value)))].sort(), [relations]);
  const managers = useMemo(() => [...new Set(relations.map((record) => record.manager ?? "Sin asignar"))].sort(), [relations]);
  const scopedRelations = useMemo(() => mode === "attention" ? relations.filter((record) => {
    const days = daysUntil(record.renewalDate);
    return !record.contractNumber || days !== null && days <= 90 || documentNeedsAttention(record.guaranteeStatus) || documentNeedsAttention(record.liabilityPolicyStatus) || documentNeedsAttention(record.projectStatus);
  }) : relations, [mode, relations]);
  const filtered = useMemo(() => {
    const term = normalized(query.trim());
    return scopedRelations.filter((record) => {
      const haystack = [record.nomenclatura, record.marca, record.contractNumber, record.commercialLine, record.commercialSubline, record.manager].join(" ");
      return (!term || normalized(haystack).includes(term)) && (!status || record.contractStatus === status) && (!manager || (record.manager ?? "Sin asignar") === manager);
    });
  }, [manager, query, scopedRelations, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / RELATION_PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * RELATION_PAGE_SIZE, page * RELATION_PAGE_SIZE);
  const distinctContracts = new Set(relations.map((record) => record.contractNumber).filter(Boolean)).size;
  const totalRent = relations.reduce((sum, record) => sum + (record.monthlyRent ?? 0), 0);
  const pending = relations.filter((record) => !record.contractNumber).length;
  const attention = relations.filter((record) => {
    const days = daysUntil(record.renewalDate);
    return days !== null && days <= 90 || documentNeedsAttention(record.guaranteeStatus) || documentNeedsAttention(record.liabilityPolicyStatus);
  }).length;
  const resetPage = () => setPage(1);
  useEffect(() => {
    setPage(1);
    setQuery("");
    setStatus("");
    setManager("");
  }, [mode]);

  if (!relations.length) return <ContractEmptyState locationName={locationName} />;

  return (
    <section className="contract-center relation-center" aria-label={`Relación Local–Contrato de ${locationName}`}>
      <div className="contract-section-heading"><div><span className="section-kicker">{mode === "attention" ? "Seguimiento" : "Cruce operativo"}</span><h2>{mode === "attention" ? "Casos por atender" : "Relación Local–Contrato"}</h2><p>{mode === "attention" ? "Locales sin número de contrato, con renovación próxima o con documentación pendiente." : "Cada fila representa la relación económica y operativa entre un espacio y su expediente contractual."}</p></div><span className="contract-zone-pill">{locationName}</span></div>
      <div className="contract-kpi-grid relation-kpis">
        <ContractKpi label="Relaciones" value={relations.length} accent="#09212e" />
        <ContractKpi label="Contratos distintos" value={distinctContracts} accent="#405364" />
        <ContractKpi label="Sin número" value={pending} accent="#8a633f" />
        <ContractKpi label="Requieren atención" value={attention} accent="#ac182c" />
        <article className="contract-kpi"><i style={{ background: "#00886f" }} /><span>Renta mensual</span><strong className="currency-kpi">{currencyFormat.format(totalRent)}</strong><small>Suma por local</small></article>
      </div>
      <div className="contract-toolbar relation-toolbar">
        <label className="contract-search"><span>Buscar local, marca o contrato</span><input value={query} onChange={(event) => { setQuery(event.target.value); resetPage(); }} placeholder="Ej. SENA-07 o farmacia" /></label>
        <label><span>Situación</span><select value={status} onChange={(event) => { setStatus(event.target.value); resetPage(); }}><option value="">Todas</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>Gestor</span><select value={manager} onChange={(event) => { setManager(event.target.value); resetPage(); }}><option value="">Todos</option>{managers.map((value) => <option key={value}>{value}</option>)}</select></label>
      </div>
      <div className="contract-result-line"><strong>{filtered.length}</strong> {mode === "attention" ? "casos que requieren seguimiento" : "relaciones encontradas"}</div>
      {filtered.length ? <div className="contract-table-wrap"><table className="contract-table relation-table"><thead><tr><th>Local</th><th>Marca / operación</th><th>Contrato</th><th>Costo por m²</th><th>Renta mensual</th><th>Participación</th><th>Renovación</th><th>Cumplimiento</th><th>Gestor</th></tr></thead><tbody>
        {pageRows.map((record) => {
          const days = daysUntil(record.renewalDate);
          const docsAtRisk = documentNeedsAttention(record.guaranteeStatus) || documentNeedsAttention(record.liabilityPolicyStatus) || documentNeedsAttention(record.projectStatus);
          return <tr key={record.id}>
            <td><strong className="nomenclature">{record.nomenclatura}</strong><small>{numberFormat.format(record.metraje ?? 0)} m² · {record.areaComercial}</small></td>
            <td><strong>{record.marca ?? "Sin marca"}</strong><small>{record.operationalStatus ?? record.situacion ?? "Sin estado operativo"}</small></td>
            <td><strong className="contract-number">{record.contractNumber ?? "Sin número"}</strong><small>{record.contractStatus ?? "Sin situación"}</small></td>
            <td className="numeric">{record.costPerM2 === null ? "—" : currencyFormat.format(record.costPerM2)}</td>
            <td className="numeric"><strong>{record.monthlyRent === null ? "—" : currencyFormat.format(record.monthlyRent)}</strong></td>
            <td>{record.participationRate === null ? "—" : percentFormat.format(record.participationRate)}{record.participationNotes && <small title={record.participationNotes}>Condición especial</small>}</td>
            <td><strong>{formatDate(record.renewalDate)}</strong><small className={days !== null && days <= 30 ? "critical-text" : ""}>{daysLabel(days)}</small></td>
            <td><span className={`compliance-badge ${docsAtRisk ? "risk" : "ok"}`}>{docsAtRisk ? "Revisar" : "En orden"}</span><small>{record.projectStatus ?? "Proyecto sin dato"}</small></td>
            <td><strong>{record.manager ?? "Sin asignar"}</strong></td>
          </tr>;
        })}
      </tbody></table></div> : <div className="contract-mode-empty"><strong>Sin casos por atender</strong><span>La zona no presenta relaciones con este criterio.</span></div>}
      {filtered.length > 0 && <Pager page={page} totalPages={totalPages} onChange={setPage} />}
    </section>
  );
}

function ContractKpi({ label, value, accent }: { label: string; value: number; accent: string }) {
  return <article className="contract-kpi"><i style={{ background: accent }} /><span>{label}</span><strong>{numberFormat.format(value)}</strong><small>Expedientes de la zona</small></article>;
}

function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  return <div className="pagination contract-pagination"><span>Página {page} de {totalPages}</span><div><button type="button" disabled={page === 1} onClick={() => onChange(page - 1)}>Anterior</button><button type="button" disabled={page === totalPages} onClick={() => onChange(page + 1)}>Siguiente</button></div></div>;
}

function ContractEmptyState({ locationName }: { locationName: string }) {
  return <section className="empty-location"><span className="empty-location-mark">CTR</span><h2>Sin información contractual</h2><p>La base cargada para {locationName} no contiene todavía columnas o expedientes contractuales.</p></section>;
}
