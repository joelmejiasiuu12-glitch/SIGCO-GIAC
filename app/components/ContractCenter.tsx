"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { locationOptions, type ContractStage, type LocalRecord } from "@/app/types";

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
  locals: LocalRecord[];
  brand: string;
  razonSocial: string | null;
  commercialLine: string | null;
  commercialSubline: string | null;
  monthlyRent: number | null;
  monthlyRentVigente: number | null;
  costPerM2: number | null;
  costPerM2Vigente: number | null;
  participationRate: number | null;
  participationRateVigente: number | null;
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
  gerencia: string;
  zonaComercial: string | null;
  daysRemaining: number | null;
  attention: Attention;
  stage: ContractStage | null;
  locationName: string;
  sourceSheet: string | null;
  locationId: string | null;
  score: TenantScore;
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
  if (!Number.isNaN(target.getTime())) {
    const today = new Date();
    const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    return Math.ceil((target.getTime() - utcToday) / 86_400_000);
  }
  const parts = String(date).trim().split(/[-/]/);
  if (parts.length === 3 && parts[2].length === 4) {
    const d = new Date(Date.UTC(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])));
    if (!Number.isNaN(d.getTime())) {
      const today = new Date();
      const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
      return Math.ceil((d.getTime() - utcToday) / 86_400_000);
    }
  }
  return null;
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

function stageForRecord(record: LocalRecord): ContractStage | null {
  if (record.contractStage) {
    const s = normalized(record.contractStage);
    if (s.includes("cancelad")) return "cancelled";
    if (s.includes("fenecid") || s.includes("expirad")) return "expired";
    if (s.includes("convenio")) return "agreements";
    if (s.includes("preformal")) return "preformalization";
    if (s.includes("formalizac") || s.includes("en formal")) return "formalization";
    if (s.includes("formaliz")) return "formalized";
    return record.contractStage as ContractStage;
  }

  const sheetUpper = (record.contractSourceSheet ?? "").toUpperCase();
  if (sheetUpper.includes("CANCELAD")) return "cancelled";
  if (sheetUpper.includes("FENECID")) return "expired";
  if (sheetUpper.includes("CONVENIO")) return "agreements";

  const isGscOrGepSheet =
    sheetUpper.includes("GSC") ||
    sheetUpper.includes("GEP") ||
    sheetUpper.includes("PUBLICITARIO") ||
    sheetUpper.includes("SERVICIOS COMERCIALES");

  const status = normalized([record.contractStatus, record.situacion, record.estatus, record.operationalStatus].filter(Boolean).join(" "));

  if (!isGscOrGepSheet) {
    if (status.includes("cancelad")) return "cancelled";
    if (status.includes("fenecido") || status.includes("expirad")) return "expired";
  }

  if (status.includes("convenio")) return "agreements";

  if (
    status.includes("en formalizacion") ||
    status.includes("formalizacion") ||
    status.includes("tramite de formalizacion") ||
    status.includes("proceso de formalizacion") ||
    status.includes("en tramite")
  ) {
    return "formalization";
  }

  if (
    status.includes("preformal") ||
    status.includes("pre-formal") ||
    status.includes("pre formal") ||
    status.includes("proceso de asign") ||
    status.includes("en asign")
  ) {
    return "preformalization";
  }

  return "formalized";
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

function attentionFor(contract: Omit<ContractAggregate, "attention" | "score">): Attention {
  if (contract.daysRemaining !== null && contract.daysRemaining <= 30) return "Crítico";
  if (
    contract.daysRemaining !== null && contract.daysRemaining <= 90 ||
    documentNeedsAttention(contract.guaranteeStatus) ||
    documentNeedsAttention(contract.liabilityPolicyStatus) ||
    documentNeedsAttention(contract.projectStatus)
  ) return "Seguimiento";
  return "En orden";
}

export function calculateTenantScore(contract: Omit<ContractAggregate, "attention" | "score">): TenantScore {
  let documents = 0;
  let renewal = 0;
  let formalized = 0;
  let operation = 0;
  const details: string[] = [];

  // 1. Documents (30 pts max)
  if (!documentNeedsAttention(contract.guaranteeStatus)) {
    documents += 10;
  } else {
    details.push("Garantía de cumplimiento pendiente o por revisar");
  }
  if (!documentNeedsAttention(contract.liabilityPolicyStatus)) {
    documents += 10;
  } else {
    details.push("Póliza de R.C. pendiente o por actualizar");
  }
  if (!documentNeedsAttention(contract.projectStatus)) {
    documents += 10;
  } else {
    details.push("Proyecto de obra con observaciones o pendiente");
  }

  // 2. Renewal & Expiry (15 pts max)
  const isExpired = contract.stage === "expired" || normalized(contract.contractStatus).includes("fenecido") || normalized(contract.contractStatus).includes("vencido");
  if (isExpired) {
    renewal += 0;
    details.push(contract.daysRemaining !== null && contract.daysRemaining < 0 ? `Contrato vencido hace ${Math.abs(contract.daysRemaining)} días` : "Contrato fenecido o vencido");
  } else if (contract.daysRemaining === null || contract.daysRemaining > 90) {
    renewal += 15;
  } else if (contract.daysRemaining >= 30) {
    renewal += 8;
    details.push(`Renovación cercana (${contract.daysRemaining} días restantes)`);
  } else if (contract.daysRemaining >= 0) {
    renewal += 3;
    details.push(`Renovación urgente (${contract.daysRemaining} días restantes)`);
  } else {
    renewal += 0;
    details.push(`Contrato vencido hace ${Math.abs(contract.daysRemaining)} días`);
  }

  // 3. Formalization Stage (20 pts max)
  if (contract.stage === "formalized" || contract.stage === "agreements" || (contract.contractNumber && !contract.pending)) {
    formalized += 20;
  } else if (contract.stage === "formalization") {
    formalized += 10;
    details.push("Expediente en proceso de formalización");
  } else if (contract.stage === "preformalization") {
    formalized += 5;
    details.push("Etapa inicial de preformalización");
  } else {
    formalized += 0;
    details.push("Sin número de contrato formal asignado");
  }

  // 4. Operational Status (35 pts max)
  const operationalText = normalized([
    contract.operationalStatus,
    contract.contractStatus,
    ...contract.locals.map((l) => `${l.estatus} ${l.operationalStatus ?? ""} ${l.situacion ?? ""}`)
  ].filter(Boolean).join(" "));

  const isOperating =
    contract.locals.some((l) => {
      const st = normalized(l.estatus);
      return st === "en funcionamiento" || st === "formalizado" || st === "en operacion" || st === "operando" || st === "operativo" || st === "vigente";
    }) ||
    operationalText.includes("funcionamiento") ||
    operationalText.includes("operacio") ||
    operationalText.includes("operando") ||
    operationalText.includes("operativo") ||
    operationalText.includes("formalizado") ||
    operationalText.includes("vigente") ||
    ((contract.stage === "formalized" || contract.stage === "agreements") && !contract.locals.some((l) => normalized(l.estatus).includes("adaptacion") || normalized(l.estatus).includes("disponible")));

  const isAdapting =
    contract.locals.some((l) => normalized(l.estatus).includes("adaptacion")) ||
    operationalText.includes("adaptacion") ||
    operationalText.includes("remodelacion") ||
    operationalText.includes("obra");

  if (isOperating) {
    operation += 35;
  } else if (isAdapting) {
    operation += 20;
    details.push("Local en proceso de adaptación");
  } else {
    operation += 5;
    details.push("Local en asignación o pendiente de operar");
  }

  const score = documents + renewal + formalized + operation;

  let rating: TenantRating = "D";
  let label = "Atención Prioritaria";
  let tone: "ok" | "info" | "watch" | "risk" = "risk";

  if (score >= 90) {
    rating = "A+";
    label = "Excelencia Comercial";
    tone = "ok";
  } else if (score >= 75) {
    rating = "A";
    label = "Satisfactorio";
    tone = "ok";
  } else if (score >= 60) {
    rating = "B";
    label = "En Seguimiento";
    tone = "info";
  } else if (score >= 40) {
    rating = "C";
    label = "Riesgo Moderado";
    tone = "watch";
  } else {
    rating = "D";
    label = "Atención Prioritaria";
    tone = "risk";
  }

  return {
    score,
    rating,
    label,
    tone,
    breakdown: { documents, renewal, formalized, operation },
    details,
  };
}

export function recordMatchesZone(record: LocalRecord, locationId: string): boolean {
  if (locationId === "all") return true;
  if (record.contractLocationId === locationId) return true;
  const raw = record.zonaComercial ?? record.contractLocationName;
  if (!raw) return false;
  const norm = normalized(raw);
  
  if (locationId === "etp" && (norm.includes("etp") || norm.includes("terminal de pasajeros") || norm.includes("terminal pasajeros"))) return true;
  if (locationId === "parque-santa-lucia" && (norm.includes("santa lucia") || norm === "psl")) return true;
  if (locationId === "carga-aduana" && (norm.includes("aduana") || norm.includes("edificio de servicios") || norm === "carga")) return true;
  if (locationId === "autobuses-plaza" && (norm.includes("autobuses") || norm.includes("transportacion terrestre") || norm.includes("intermodal") || norm.includes("plaza mexicana") || norm === "titt")) return true;
  if (locationId === "parque-revolucion" && (norm.includes("revolucion") || norm.includes("glorieta felipe angeles"))) return true;
  if (locationId === "ciudad-aeroportuaria" && norm.includes("ciudad aeroportuaria")) return true;
  if (locationId === "calzada-mamuts" && norm.includes("mamut")) return true;

  const locOpt = locationOptions.find((l) => l.id === locationId);
  const locShort = normalized(locOpt?.shortName ?? locationId);
  return norm.includes(locShort);
}

export function normalizeContractNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const norm = normalized(trimmed);
  if (
    norm === "sin contrato" ||
    norm === "n/a" ||
    norm === "sin dato" ||
    norm === "por definir" ||
    norm === "null" ||
    norm === "s/n" ||
    norm === "sn" ||
    norm.includes("tramite") ||
    norm.includes("revision") ||
    norm.includes("formalizacion") ||
    norm.includes("proceso")
  ) {
    return null;
  }
  return trimmed;
}

export function buildContracts(records: LocalRecord[]): ContractAggregate[] {
  const groups = new Map<string, LocalRecord[]>();

  records.forEach((record) => {
    const stage = stageForRecord(record);
    if (!stage) return;

    const contractNumberRaw = normalizeContractNumber(record.contractNumber);

    let groupKey: string;
    if (stage === "cancelled") {
      const idKey = normalized(record.nomenclatura || String(record.id));
      if (contractNumberRaw) {
        groupKey = `cancelled:${normalized(contractNumberRaw)}:${idKey}`;
      } else {
        const brandKey = normalized(record.razonSocial || record.marca || "sin-marca");
        groupKey = `cancelled:pending:${brandKey}:${idKey}`;
      }
    } else if (contractNumberRaw) {
      groupKey = `contract:${normalized(contractNumberRaw)}`;
    } else {
      const brandKey = normalized(record.razonSocial || record.marca || "sin-marca");
      const localKey = normalized(record.nomenclatura || record.id);
      groupKey = `pending:${brandKey}:${localKey}`;
    }

    groups.set(groupKey, [...(groups.get(groupKey) ?? []), record]);
  });

  const list: ContractAggregate[] = [];
  groups.forEach((locals, groupKey) => {
    const stage = locals.map(stageForRecord).find((value): value is ContractStage => Boolean(value)) ?? "formalized";
    const contractNumber = firstText(locals, "contractNumber");
    const rentValues = locals.map((record) => record.monthlyRent).filter((value): value is number => value !== null);
    const monthlyRent = rentValues.length ? rentValues.reduce((total, val) => total + val, 0) : null;
    const participation = locals.map((record) => record.participationRate).find((value) => value !== null) ?? null;
    const numericDays = locals.map((record) => record.daysRemaining).find((value): value is number => typeof value === "number" && !Number.isNaN(value));
    const renewalDate = firstText(locals, "renewalDate") ?? firstText(locals, "fechaConclusion") ?? firstText(locals, "contractTerm");
    const contractStatus = firstText(locals, "contractStatus") ?? firstText(locals, "situacion") ?? stageLabel(stage);

    const razonSocial = firstText(locals, "razonSocial");
    const brand = firstText(locals, "marca") ?? razonSocial ?? "Sin marca asignada";
    const sourceSheet = firstText(locals, "contractSourceSheet") ?? "";
    let gerencia = firstText(locals, "gerencia");
    const rawNum = contractNumber ? contractNumber.toUpperCase() : "";
    const rawGer = gerencia ? gerencia.toUpperCase() : "";
    if (sourceSheet.toUpperCase().includes("GEP") || sourceSheet.toUpperCase().includes("PUBLICITARIO") || rawNum.includes("GEP") || rawGer.includes("GEP") || rawGer.includes("PUBLICIT")) {
      gerencia = "Gerencia de Espacios Publicitarios";
    } else if (sourceSheet.toUpperCase().includes("GSC") || rawNum.includes("GSC") || !gerencia) {
      gerencia = "Gerencia de Servicios Comerciales";
    }
    const zonaComercial = firstText(locals, "zonaComercial") ?? firstText(locals, "contractLocationName");

    const costPerM2 = locals.map((record) => record.costPerM2).find((value) => value !== null) ?? null;
    const costPerM2Vigente = locals.map((record) => record.costPerM2Vigente ?? record.costPerM2).find((value) => value !== null) ?? costPerM2;
    const rentVigenteValues = locals.map((record) => record.monthlyRentVigente ?? record.monthlyRent).filter((value): value is number => value !== null);
    const monthlyRentVigente = rentVigenteValues.length ? rentVigenteValues.reduce((total, val) => total + val, 0) : monthlyRent;
    const participationRateVigente = locals.map((record) => record.participationRateVigente ?? record.participationRate).find((value) => value !== null) ?? participation;

    const base = {
      key: groupKey,
      contractNumber,
      pending: !contractNumber,
      locals,
      brand,
      razonSocial,
      commercialLine: firstText(locals, "commercialLine"),
      commercialSubline: firstText(locals, "commercialSubline"),
      monthlyRent,
      monthlyRentVigente,
      costPerM2,
      costPerM2Vigente,
      participationRate: participation,
      participationRateVigente,
      participationNotes: firstText(locals, "participationNotes"),
      operationsStartDate: firstText(locals, "operationsStartDate"),
      signatureDate: firstText(locals, "signatureDate") ?? firstText(locals, "fechaFormalizacion"),
      contractTerm: firstText(locals, "contractTerm"),
      renewalDate,
      guaranteeStatus: firstText(locals, "guaranteeStatus"),
      liabilityPolicyStatus: firstText(locals, "liabilityPolicyStatus"),
      projectStatus: firstText(locals, "projectStatus"),
      contractStatus,
      operationalStatus: firstText(locals, "operationalStatus") ?? firstText(locals, "estatus") ?? null,
      manager: firstText(locals, "manager") ?? "Sin asignar",
      gerencia,
      zonaComercial,
      daysRemaining: daysUntil(renewalDate) ?? numericDays ?? null,
      stage,
      locationName: zonaComercial ?? firstText(locals, "contractLocationName") ?? "Zona no indicada",
      sourceSheet: firstText(locals, "contractSourceSheet"),
      locationId: firstText(locals, "contractLocationId"),
    };

    const attention = attentionFor(base);
    const score = calculateTenantScore(base);

    if ((stage === "expired" || stage === "cancelled") && !contractNumber && (brand === "Sin marca asignada" || brand === "Sin marca" || !brand)) {
      return;
    }

    list.push({ ...base, attention, score });
  });

  return list.sort((a, b) => {
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

function TenantRatingBadge({ score }: { score: TenantScore }) {
  return (
    <span className={`tenant-rating-badge tone-${score.tone}`} title={`Score: ${score.score}/100 - ${score.label}`}>
      <b>{score.rating}</b>
      <small>{score.score} pts</small>
    </span>
  );
}

function DocumentIconsBadge({ contract }: { contract: ContractAggregate }) {
  const guaranteeOk = !documentNeedsAttention(contract.guaranteeStatus);
  const policyOk = !documentNeedsAttention(contract.liabilityPolicyStatus);
  const projectOk = !documentNeedsAttention(contract.projectStatus);

  return (
    <div className="doc-icons-group">
      <span className={`doc-icon ${guaranteeOk ? "ok" : "risk"}`} title={`Garantía: ${contract.guaranteeStatus || "Falta"}`}>
        🛡️
      </span>
      <span className={`doc-icon ${policyOk ? "ok" : "risk"}`} title={`Póliza RC: ${contract.liabilityPolicyStatus || "Falta"}`}>
        📄
      </span>
      <span className={`doc-icon ${projectOk ? "ok" : "risk"}`} title={`Proyecto: ${contract.projectStatus || "Falta"}`}>
        🏗️
      </span>
    </div>
  );
}

function DocumentFact({ label, value }: { label: string; value: string | null }) {
  const display = value ?? "Sin dato";
  const needsAtt = documentNeedsAttention(value);
  return (
    <div className="contract-document-fact">
      <span>{label}</span>
      <strong className={needsAtt ? "needs-attention" : "doc-ok"}>
        {needsAtt ? "⚠️ " : "✓ "}{display}
      </strong>
    </div>
  );
}

function ContractExecutiveDonut({
  title,
  kicker,
  data,
  colors = ["#00886f", "#39a9db", "#b56d16", "#ac182c", "#8a633f"],
  center = "contratos",
}: {
  title: string;
  kicker: string;
  data: [string, number][];
  colors?: string[];
  center?: string;
}) {
  const total = data.reduce((sum, [, value]) => sum + value, 0);
  const circumference = 2 * Math.PI * 44;

  return (
    <article className="executive-card">
      <div className="executive-heading">
        <div>
          <span className="section-kicker">{kicker}</span>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="executive-donut-layout">
        <div className="executive-donut" role="img" aria-label={title}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            {data.map(([label, value], index) => {
              const share = total ? value / total : 0;
              const offset = total
                ? data.slice(0, index).reduce((sum, [, prev]) => sum + prev, 0) / total
                : 0;
              return (
                <circle
                  key={label}
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke={colors[index % colors.length]}
                  strokeWidth="12"
                  strokeDasharray={`${share * circumference} ${circumference}`}
                  strokeDashoffset={-offset * circumference}
                  transform="rotate(-90 50 50)"
                  className="donut-segment"
                >
                  <title>{`${label}: ${numberFormat.format(value)} (${total ? numberFormat.format(share * 100) : 0}%)`}</title>
                </circle>
              );
            })}
          </svg>
          <div>
            <strong>{numberFormat.format(total)}</strong>
            <span>{center}</span>
          </div>
        </div>
        <div className="executive-legend">
          {data.map(([label, value], index) => (
            <div key={label}>
              <i style={{ background: colors[index % colors.length] }} />
              <span title={label}>{label}</span>
              <strong>
                <b>{numberFormat.format(value)}</b>
                <small>{total ? numberFormat.format((value / total) * 100) : 0}%</small>
              </strong>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function ContractExecutiveBars({
  title,
  kicker,
  data,
  color = "#00886f",
  isCurrency = false,
}: {
  title: string;
  kicker: string;
  data: [string, number][];
  color?: string;
  isCurrency?: boolean;
}) {
  const max = Math.max(...data.map(([, val]) => val), 1);
  const total = data.reduce((sum, [, val]) => sum + val, 0);

  return (
    <article className="executive-card summary-horizontal-card">
      <div className="executive-heading">
        <div>
          <span className="section-kicker">{kicker}</span>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="summary-horizontal-bars">
        {data.map(([label, value]) => {
          const percentage = total ? (value / total) * 100 : 0;
          return (
            <div className="summary-horizontal-row" key={label}>
              <span>
                <b title={label}>{label}</b>
                <strong>
                  {isCurrency ? currencyFormat.format(value) : numberFormat.format(value)}
                  {!isCurrency && total > 0 ? ` · ${numberFormat.format(percentage)}%` : ""}
                </strong>
              </span>
              <i aria-label={`${label}: ${value}`}>
                <em style={{ width: `${Math.max((value / max) * 100, 3)}%`, background: color }} />
              </i>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function ContractCenter({
  records,
  locationName,
  selectedLocationId,
  onSelectLocationId,
  mode = "summary",
  onOpenLocal,
  onAddContract,
  onEditContract,
  onDeleteContract,
  initialSearch,
  initialGerencia,
}: {
  records: LocalRecord[];
  locationName: string;
  selectedLocationId?: string;
  onSelectLocationId?: (locationId: string) => void;
  mode?: ContractViewMode;
  onOpenLocal?: (nomenclature: string, locationId: string | null) => void;
  onAddContract?: () => void;
  onEditContract?: (contract: ContractAggregate) => void;
  onDeleteContract?: (contract: ContractAggregate) => void;
  initialSearch?: string;
  initialGerencia?: string;
}) {
  const [selectedGerencia, setSelectedGerencia] = useState<string>(initialGerencia || "all");
  const [query, setQuery] = useState(initialSearch || "");
  const [status, setStatus] = useState("");
  const [manager, setManager] = useState("");
  const [attention, setAttention] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Sincronizar gerencia y búsqueda si se envían desde afuera (ej. al abrir desde Publicidad)
  useEffect(() => {
    if (initialGerencia) {
      setSelectedGerencia(initialGerencia);
    }
  }, [initialGerencia]);

  useEffect(() => {
    if (initialSearch !== undefined && initialSearch !== "") {
      setQuery(initialSearch);
      setSelectedStage("all");
      setPage(1);
      setTimeout(() => {
        const el = document.querySelector(".contract-toolbar");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, [initialSearch]);

  const gerenciaFilteredRecords = useMemo(() => {
    if (selectedGerencia === "all") return records;
    if (selectedGerencia === "gsc") {
      return records.filter((r) => {
        const sheet = normalized(r.contractSourceSheet ?? "");
        const ger = normalized(r.gerencia ?? "");
        const num = normalized(r.contractNumber ?? "");
        if (sheet.includes("gep") || ger.includes("espacios publicitarios") || ger === "gep" || num.includes("gep")) return false;
        return true;
      });
    }
    if (selectedGerencia === "gep") {
      return records.filter((r) => {
        const sheet = normalized(r.contractSourceSheet ?? "");
        const ger = normalized(r.gerencia ?? "");
        const num = normalized(r.contractNumber ?? "");
        return sheet.includes("gep") || ger.includes("gep") || ger.includes("espacios publicitarios") || num.includes("gep");
      });
    }
    return records;
  }, [records, selectedGerencia]);

  const contracts = useMemo(() => buildContracts(gerenciaFilteredRecords), [gerenciaFilteredRecords]);
  const gerenciaFilteredContracts = contracts;

  // Auto-expandir contrato si coincide con la búsqueda inicial
  useEffect(() => {
    if (initialSearch && contracts.length > 0) {
      const term = normalized(initialSearch.trim());
      const match = contracts.find((c) =>
        normalized(c.contractNumber || "").includes(term)
      );
      if (match) {
        setExpanded(match.key);
      }
    }
  }, [initialSearch, contracts]);

  const activeContracts = useMemo(() => {
    return gerenciaFilteredContracts.filter(
      (c) => c.stage === "formalized" || c.stage === "preformalization" || c.stage === "formalization"
    );
  }, [gerenciaFilteredContracts]);

  const modeContracts = useMemo(() => {
    if (mode !== "summary") return gerenciaFilteredContracts.filter((c) => c.stage === mode);
    if (selectedStage === "all") return gerenciaFilteredContracts;
    if (selectedStage === "pending_docs") return activeContracts.filter((c) => c.attention !== "En orden");
    if (selectedStage === "renewing_soon") return activeContracts.filter((c) => c.daysRemaining !== null && c.daysRemaining <= 90);
    return gerenciaFilteredContracts.filter((c) => c.stage === selectedStage);
  }, [activeContracts, gerenciaFilteredContracts, mode, selectedStage]);

  const statuses = useMemo(() => [...new Set(modeContracts.map((c) => c.contractStatus))].sort(), [modeContracts]);
  const managers = useMemo(() => [...new Set(modeContracts.map((c) => c.manager))].sort(), [modeContracts]);

  const filtered = useMemo(() => {
    const term = normalized(query.trim());
    return modeContracts.filter((contract) => {
      const haystack = [contract.contractNumber, contract.brand, contract.razonSocial, contract.manager, contract.commercialLine, ...contract.locals.map((l) => l.nomenclatura)].join(" ");
      return (
        (!term || normalized(haystack).includes(term)) &&
        (!status || contract.contractStatus === status) &&
        (!manager || contract.manager === manager) &&
        (!attention || contract.attention === attention)
      );
    });
  }, [attention, manager, modeContracts, query, status]);

  const pageSize = CONTRACT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const preformalization = activeContracts.filter((c) => c.stage === "preformalization").length;
  const formalization = activeContracts.filter((c) => c.stage === "formalization").length;
  const formalized = activeContracts.filter((c) => c.stage === "formalized").length;
  const closed = gerenciaFilteredContracts.filter((c) => c.stage === "cancelled" || c.stage === "expired").length;
  const expired = gerenciaFilteredContracts.filter((c) => c.stage === "expired").length;
  const cancelled = gerenciaFilteredContracts.filter((c) => c.stage === "cancelled").length;
  const agreements = activeContracts.filter((c) => c.stage === "agreements").length;
  const totalRentGuaranteed = activeContracts.reduce((sum, c) => sum + (c.monthlyRent ?? 0), 0);
  const totalRentVigente = activeContracts.reduce((sum, c) => sum + (c.monthlyRentVigente ?? c.monthlyRent ?? 0), 0);

  const totalScore = activeContracts.reduce((sum, c) => sum + c.score.score, 0);
  const averageScore = activeContracts.length ? Math.round(totalScore / activeContracts.length) : 0;
  const docHealth = activeContracts.length
    ? (activeContracts.filter((c) => c.score.breakdown.documents === 30).length / activeContracts.length) * 100
    : 0;

  const renewalsDueCount = activeContracts.filter((c) => c.daysRemaining !== null && c.daysRemaining <= 90).length;

  const ratingCounts = useMemo(() => {
    const counts: Record<string, number> = { "A+": 0, A: 0, B: 0, C: 0, D: 0 };
    activeContracts.forEach((c) => {
      counts[c.score.rating] = (counts[c.score.rating] ?? 0) + 1;
    });
    return counts;
  }, [activeContracts]);

  const resetPage = () => {
    setPage(1);
    setExpanded(null);
  };

  useEffect(() => {
    setPage(1);
    setExpanded(null);
    if (!initialSearch) {
      setQuery("");
    }
    setStatus("");
    setManager("");
    setAttention("");
  }, [mode, selectedGerencia, initialSearch]);

  const headings: Record<ContractViewMode, { kicker: string; title: string; description: string }> = {
    summary: {
      kicker: "Control contractual por gerencia",
      title: "Resumen de contratos",
      description: "Cartera dividida por Gerencia (GSC y GEP): contratada, vigente, formalizados, cancelados y convenios.",
    },
    preformalization: {
      kicker: "Integración inicial",
      title: "En preformalización",
      description: "Locales próximos a formalizarse que todavía no cuentan con número de contrato.",
    },
    formalization: {
      kicker: "Integración documental",
      title: "En formalización",
      description: "Contratos en proceso que aún requieren garantía de cumplimiento, póliza de R.C. o proyecto de obra.",
    },
    formalized: {
      kicker: "Cartera vigente",
      title: "Formalizados",
      description: "Contratos formalizados con número y documentación contractual integrada.",
    },
    cancelled: {
      kicker: "Cartera concluida",
      title: "Contratos cancelados",
      description: "Registros procedentes de la hoja Contratos Cancelados del libro cargado.",
    },
    expired: {
      kicker: "Cartera concluida",
      title: "Contratos fenecidos",
      description: "Registros procedentes de la hoja Contratos Fenecidos del libro cargado.",
    },
    agreements: {
      kicker: "Instrumentos relacionados",
      title: "Convenios",
      description: "Convenios registrados en la hoja del mismo nombre dentro del libro cargado.",
    },
  };

  const heading = headings[mode];

  if (!contracts.length) {
    return (
      <ContractEmptyState
        locationName={locationName}
        selectedLocationId={selectedLocationId}
        onSelectLocationId={onSelectLocationId}
        onResetFilters={() => {
          setSelectedGerencia("all");
          setQuery("");
          setSelectedStage("all");
          if (onSelectLocationId) onSelectLocationId("all");
        }}
      />
    );
  }

  return (
    <section className="contract-center" aria-label={`Contratos de ${locationName}`}>
      <div className="contract-section-heading">
        <div>
          <span className="section-kicker">{heading.kicker}</span>
          <h2>{heading.title}</h2>
          <p>{heading.description}</p>
        </div>
        <div className="heading-actions">
          <label className="contract-zone-picker">
            <span>Gerencia</span>
            <select
              value={selectedGerencia}
              onChange={(e) => {
                setSelectedGerencia(e.target.value);
                resetPage();
              }}
              aria-label="Filtrar por Gerencia"
            >
              <option value="all">Todas las Gerencias (Consolidado)</option>
              <option value="gsc">Gerencia de Servicios Comerciales (GSC)</option>
              <option value="gep">Gerencia de Espacios Publicitarios (GEP)</option>
            </select>
          </label>
          {onSelectLocationId ? (
            <label className="contract-zone-picker">
              <span>Zona comercial</span>
              <select
                value={selectedLocationId ?? "all"}
                onChange={(event) => onSelectLocationId(event.target.value)}
                aria-label="Filtrar contratos por zona comercial"
              >
                <option value="all">Todas las zonas comerciales</option>
                {locationOptions.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.shortName}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span className="contract-zone-pill">{locationName}</span>
          )}
        </div>
      </div>

      {mode === "summary" && (
        <div className="contract-kpi-grid">
          <article className="contract-kpi main-rent-kpi">
            <i style={{ background: "#00886f" }} />
            <span>Renta bajo contrato</span>
            <strong className="currency-kpi">{currencyFormat.format(totalRentGuaranteed)}</strong>
            <small>Renta mensual total amparada</small>
          </article>
          <article className="contract-kpi">
            <i style={{ background: averageScore >= 75 ? "#00886f" : "#f28c28" }} />
            <span>Score Promedio Marcas</span>
            <strong>{averageScore} / 100</strong>
            <small>Salud comercial de arrendatarios</small>
          </article>
          <article className="contract-kpi">
            <i style={{ background: docHealth >= 80 ? "#00886f" : "#ac182c" }} />
            <span>Salud Documental</span>
            <strong>{numberFormat.format(docHealth)}%</strong>
            <small>Expedientes 100% integrados</small>
          </article>
          <article className="contract-kpi">
            <i style={{ background: renewalsDueCount > 0 ? "#f28c28" : "#00886f" }} />
            <span>Vencimientos ≤ 90 días</span>
            <strong>{renewalsDueCount}</strong>
            <small>Contratos próximos a renovar</small>
          </article>
        </div>
      )}

      {mode === "summary" && (
        <div className="executive-grid contract-executive-charts" style={{ marginTop: "20px", marginBottom: "24px" }}>
          <ContractExecutiveDonut
            title="Estatus de los contratos"
            kicker="Cartera Comercial Activa"
            data={([
              ["Formalizados", formalized],
              ["En formalización", formalization],
              ["Preformalización", preformalization],
            ] as [string, number][]).filter(([, count]) => count > 0)}
            colors={["#00886f", "#39a9db", "#b56d16"]}
          />
          <ContractExecutiveDonut
            title="Salud Comercial (Score Marcas)"
            kicker="Evaluación de arrendatarios"
            data={[
              ["Excelente A+ (90-100)", ratingCounts["A+"]],
              ["Bueno A (80-89)", ratingCounts["A"]],
              ["Aceptable B (70-79)", ratingCounts["B"]],
              ["Atención C (60-69)", ratingCounts["C"]],
              ["Riesgo D (<60)", ratingCounts["D"]],
            ]}
            colors={["#00886f", "#0b957e", "#39a9db", "#b56d16", "#ac182c"]}
          />
          <ContractExecutiveBars
            title="Vencimientos por Horizonte"
            kicker="Calendario de renovación"
            data={[
              ["Vencidos (< 0 días)", activeContracts.filter((c) => c.daysRemaining !== null && c.daysRemaining < 0).length],
              ["Próximos (1 - 90 días)", activeContracts.filter((c) => c.daysRemaining !== null && c.daysRemaining >= 1 && c.daysRemaining <= 90).length],
              ["Mediano Plazo (91 - 365 días)", activeContracts.filter((c) => c.daysRemaining !== null && c.daysRemaining > 90 && c.daysRemaining <= 365).length],
              ["Largo Plazo (> 365 días)", activeContracts.filter((c) => c.daysRemaining !== null && c.daysRemaining > 365).length],
            ]}
            color="#405364"
          />
        </div>
      )}

      {/* Action Header bar below Vencimientos por Horizonte */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 0 12px 0", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--navy)", fontFamily: '"Montserrat AIFA", Montserrat, sans-serif' }}>
            Directorio de Instrumentos Contractuales
          </span>
          <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
            Expedientes jurídicos, garantías y condiciones financieras ({gerenciaFilteredContracts.length} registros)
          </div>
        </div>
        {onAddContract && (
          <button
            type="button"
            className="btn-add-contract-section"
            onClick={onAddContract}
            title="Registrar nuevo contrato comercial"
          >
            ➕ Registrar Nuevo Contrato
          </button>
        )}
      </div>

      {/* Compact Stage Filter Pills */}
      {mode === "summary" && (
        <div className="contract-compact-tabs" aria-label="Filtro por etapas de contrato">
          <button
            type="button"
            className={selectedStage === "all" ? "active" : ""}
            onClick={() => {
              setSelectedStage("all");
              resetPage();
            }}
          >
            Todos <b>({contracts.length})</b>
          </button>
          <button
            type="button"
            className={selectedStage === "formalized" ? "active" : ""}
            onClick={() => {
              setSelectedStage("formalized");
              resetPage();
            }}
          >
            Formalizados <b>({formalized})</b>
          </button>
          <button
            type="button"
            className={selectedStage === "formalization" ? "active" : ""}
            onClick={() => {
              setSelectedStage("formalization");
              resetPage();
            }}
          >
            En formalización <b>({formalization})</b>
          </button>
          <button
            type="button"
            className={selectedStage === "preformalization" ? "active" : ""}
            onClick={() => {
              setSelectedStage("preformalization");
              resetPage();
            }}
          >
            Preformalización <b>({preformalization})</b>
          </button>
          <button
            type="button"
            className={selectedStage === "renewing_soon" ? "active" : ""}
            onClick={() => {
              setSelectedStage("renewing_soon");
              resetPage();
            }}
          >
            Por Vencer ≤90d <b>({renewalsDueCount})</b>
          </button>
          <button
            type="button"
            className={selectedStage === "pending_docs" ? "active" : ""}
            onClick={() => {
              setSelectedStage("pending_docs");
              resetPage();
            }}
          >
            Falta Documento <b>({contracts.filter((c) => c.attention !== "En orden").length})</b>
          </button>
          <button
            type="button"
            className={selectedStage === "agreements" ? "active" : ""}
            onClick={() => {
              setSelectedStage("agreements");
              resetPage();
            }}
          >
            Convenios <b>({agreements})</b>
          </button>
          <button
            type="button"
            className={selectedStage === "expired" ? "active" : ""}
            onClick={() => {
              setSelectedStage("expired");
              resetPage();
            }}
          >
            Fenecidos <b>({expired})</b>
          </button>
          <button
            type="button"
            className={selectedStage === "cancelled" ? "active" : ""}
            onClick={() => {
              setSelectedStage("cancelled");
              resetPage();
            }}
          >
            Cancelados <b>({cancelled})</b>
          </button>
        </div>
      )}

      <div className="contract-toolbar">
        <label className="contract-search">
          <span>Buscar contrato, marca o local</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetPage();
            }}
            placeholder="Ej. AIFA-DCS o LLENA-02"
          />
        </label>
        <label>
          <span>Situación</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              resetPage();
            }}
          >
            <option value="">Todas</option>
            {statuses.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Gestor</span>
          <select
            value={manager}
            onChange={(event) => {
              setManager(event.target.value);
              resetPage();
            }}
          >
            <option value="">Todos</option>
            {managers.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Atención</span>
          <select
            value={attention}
            onChange={(event) => {
              setAttention(event.target.value);
              resetPage();
            }}
          >
            <option value="">Todos</option>
            <option>Crítico</option>
            <option>Seguimiento</option>
            <option>En orden</option>
          </select>
        </label>
      </div>

      <div className="contract-result-line">
        <strong>{filtered.length}</strong>{" "}
        {mode === "summary" ? "contratos e instrumentos en la cartera" : "registros encontrados en esta etapa"}
      </div>

      {filtered.length ? (
        <div className="contract-table-wrap">
          <table className="contract-table">
            <thead>
              <tr>
                <th>Contrato</th>
                <th>Marca / Rating</th>
                <th>Locales</th>
                <th>Renta mensual</th>
                <th>Renovación</th>
                <th>Documentación</th>
                <th>Situación</th>
                <th>Gestor</th>
                <th>
                  <span className="sr-only">Detalle</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((contract) => (
                <ContractRows
                  key={contract.key}
                  contract={contract}
                  expanded={expanded === contract.key}
                  onToggle={() => setExpanded(expanded === contract.key ? null : contract.key)}
                  onOpenLocal={onOpenLocal}
                  onEdit={onEditContract}
                  onDelete={onDeleteContract}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="contract-mode-empty">
          <strong>Sin casos en esta vista</strong>
          <span>No se encontraron expedientes que cumplan con este criterio.</span>
        </div>
      )}

      {filtered.length > 0 && (
        <Pager
          page={page}
          totalPages={totalPages}
          onChange={(next) => {
            setPage(next);
            setExpanded(null);
          }}
        />
      )}
    </section>
  );
}

const ratingColors: Record<string, string> = {
  "A+": "#00886f",
  A: "#2ba584",
  B: "#39a9db",
  C: "#f28c28",
  D: "#ac182c",
};

export function TenantScorecardWrapper({
  records,
  locationName,
  selectedLocationId,
  onSelectLocationId,
  onOpenLocal,
}: {
  records: LocalRecord[];
  locationName?: string;
  selectedLocationId?: string;
  onSelectLocationId?: (locationId: string) => void;
  onOpenLocal?: (nomenclature: string, locationId: string | null) => void;
}) {
  const [selectedGerencia, setSelectedGerencia] = useState<string>("gsc");

  const gerenciaFilteredRecords = useMemo(() => {
    const gscSheetRecords = records.filter((r) => {
      const sheet = normalized(r.contractSourceSheet ?? "");
      const ger = normalized(r.gerencia ?? "");
      return sheet.includes("gsc") || ger.includes("gsc") || ger.includes("servicios comerciales") || (!sheet && !ger);
    });

    const gepSheetRecords = records.filter((r) => {
      const sheet = normalized(r.contractSourceSheet ?? "");
      const ger = normalized(r.gerencia ?? "");
      return sheet.includes("gep") || ger.includes("gep") || ger.includes("espacios publicitarios");
    });

    if (selectedGerencia === "gsc") {
      return gscSheetRecords;
    }

    if (selectedGerencia === "gep") {
      return gepSheetRecords;
    }

    return [...gscSheetRecords, ...gepSheetRecords];
  }, [records, selectedGerencia]);

  const contracts = useMemo(() => {
    const all = buildContracts(gerenciaFilteredRecords);
    return all.filter(
      (c) => c.stage === "formalized" || c.stage === "preformalization" || c.stage === "formalization"
    );
  }, [gerenciaFilteredRecords]);

  const totalScore = contracts.reduce((sum, c) => sum + c.score.score, 0);
  const averageScore = contracts.length ? Math.round(totalScore / contracts.length) : 0;
  const docHealth = contracts.length
    ? (contracts.filter((c) => c.score.breakdown.documents === 30).length / contracts.length) * 100
    : 0;

  const ratingCounts = useMemo(() => {
    const counts: Record<string, number> = { "A+": 0, A: 0, B: 0, C: 0, D: 0 };
    contracts.forEach((c) => {
      counts[c.score.rating] = (counts[c.score.rating] ?? 0) + 1;
    });
    return counts;
  }, [contracts]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <label className="contract-zone-picker">
          <span>Gerencia</span>
          <select
            value={selectedGerencia}
            onChange={(e) => setSelectedGerencia(e.target.value)}
            aria-label="Filtrar análisis por Gerencia"
          >
            <option value="all">Todas las Gerencias (Consolidado)</option>
            <option value="gsc">Gerencia de Servicios Comerciales (GSC)</option>
            <option value="gep">Gerencia de Espacios Publicitarios (GEP)</option>
          </select>
        </label>
      </div>
      <TenantScorecardDashboard
        contracts={contracts}
        ratingCounts={ratingCounts}
        averageScore={averageScore}
        docHealth={docHealth}
        locationName={locationName}
        selectedLocationId={selectedLocationId}
        onSelectLocationId={onSelectLocationId}
        onOpenLocal={onOpenLocal}
      />
    </div>
  );
}

const RATING_CRITERIA_DESCRIPTIONS: Record<
  string,
  { label: string; range: string; summary: string; description: string; badgeTone: string }
> = {
  "A+": {
    label: "Excelente (Puntaje 90 – 100)",
    range: "90 – 100 pts",
    summary: "Excelencia operativa, contractual y documental 100% integrada.",
    description:
      "Arrendatarios con salud comercial óptima: contrato formalizado y vigente, expediente 100% completo (garantía, póliza de R.C. y proyecto aprobados) y sin alertas de mora o vencimiento en los próximos 90 días.",
    badgeTone: "tone-ok",
  },
  A: {
    label: "Sólido (Puntaje 75 – 89)",
    range: "75 – 89 pts",
    summary: "Operación regular sólida con cumplimiento documental alto.",
    description:
      "Arrendatarios en funcionamiento con alto nivel de cumplimiento documental y buen estatus legal. Presentan trámite administrativo menor o vigencia contractual holgada.",
    badgeTone: "tone-ok",
  },
  B: {
    label: "Aceptable (Puntaje 60 – 74)",
    range: "60 – 74 pts",
    summary: "Operación estándar con trámites preventivos o renovación intermedia.",
    description:
      "Arrendatarios en operación regular que requieren seguimiento de rutina en alguna renovación cercana (30–90 días) o actualización de póliza de seguro.",
    badgeTone: "tone-info",
  },
  C: {
    label: "Atención Requerida (Puntaje 40 – 59)",
    range: "40 – 59 pts",
    summary: "Falta de expediente o contrato por vencer en ≤ 30 días.",
    description:
      "Arrendatarios que requieren atención comercial inmediata debido a vencimiento próximo (≤ 30 días), preformalización pendiente o falta de entregables obligatorios.",
    badgeTone: "tone-watch",
  },
  D: {
    label: "Riesgo Contractual (Puntaje < 40)",
    range: "< 40 pts",
    summary: "Contrato vencido o incumplimiento de garantías y documentos clave.",
    description:
      "Cuentas clasificadas en rango crítico: contratos vencidos sin convenio de renovación, ausencia de garantía de cumplimiento o falta de póliza de responsabilidad civil vigente.",
    badgeTone: "tone-risk",
  },
};

export function TenantScorecardDashboard({
  contracts,
  ratingCounts,
  averageScore,
  docHealth,
  locationName,
  selectedLocationId,
  onSelectLocationId,
  onOpenLocal,
}: {
  contracts: ContractAggregate[];
  ratingCounts: Record<string, number>;
  averageScore: number;
  docHealth: number;
  locationName?: string;
  selectedLocationId?: string;
  onSelectLocationId?: (locationId: string) => void;
  onOpenLocal?: (nomenclature: string, locationId: string | null) => void;
}) {
  const [hoveredRating, setHoveredRating] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<string | null>(null);
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);

  const totalContracts = contracts.length;
  const circumference = 2 * Math.PI * 44;

  // Donut data
  const donutData: [string, number, string][] = [
    ["A+", ratingCounts["A+"], ratingColors["A+"]],
    ["A", ratingCounts.A, ratingColors.A],
    ["B", ratingCounts.B, ratingColors.B],
    ["C", ratingCounts.C, ratingColors.C],
    ["D", ratingCounts.D, ratingColors.D],
  ].filter(([, count]) => (count as number) > 0) as [string, number, string][];

  // Document pillar compliance
  const guaranteeOk = contracts.filter((c) => !documentNeedsAttention(c.guaranteeStatus)).length;
  const policyOk = contracts.filter((c) => !documentNeedsAttention(c.liabilityPolicyStatus)).length;
  const projectOk = contracts.filter((c) => !documentNeedsAttention(c.projectStatus)).length;
  const formalizedCount = contracts.filter((c) => c.stage === "formalized").length;

  const docBars = [
    { label: "Garantía de cumplimiento", icon: "🛡️", count: guaranteeOk, color: "#00886f" },
    { label: "Póliza de R.C.", icon: "📄", count: policyOk, color: "#2ba584" },
    { label: "Proyecto de obra", icon: "🏗️", count: projectOk, color: "#39a9db" },
    { label: "Contratos formalizados", icon: "📋", count: formalizedCount, color: "#405364" },
  ];

  // Top 5 and Bottom 5
  const sorted = contracts.slice().sort((a, b) => b.score.score - a.score.score);
  const top5 = sorted.slice(0, 5);
  const bottom5 = sorted.slice(-5).reverse();
  const maxScore = 100;

  // Timeline: contracts with daysRemaining between -30 and 90
  const timelineContracts = contracts
    .filter((c) => c.daysRemaining !== null && c.daysRemaining >= -30 && c.daysRemaining <= 90)
    .sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0));

  // Rent by rating
  const rentByRating = useMemo(() => {
    const map: Record<string, number> = { "A+": 0, A: 0, B: 0, C: 0, D: 0 };
    contracts.forEach((c) => {
      map[c.score.rating] += c.monthlyRent ?? 0;
    });
    return map;
  }, [contracts]);

  return (
    <section className="tenant-scorecard-section" aria-label="Scorecard de Arrendatarios">
      <header className="scorecard-header">
        <div>
          <span className="section-kicker">Dashboard de Scoring · {locationName ?? "Zona seleccionada"}</span>
          <h3>Calificación y Cumplimiento por Marca ({totalContracts} contratos)</h3>
        </div>
        <div className="scorecard-header-actions">
          <div className="rating-summary-pills">
            <span className="rating-pill tone-ok">A+ / A: {ratingCounts["A+"] + ratingCounts.A}</span>
            <span className="rating-pill tone-info">B: {ratingCounts.B}</span>
            <span className="rating-pill tone-watch">C: {ratingCounts.C}</span>
            <span className="rating-pill tone-risk">D: {ratingCounts.D}</span>
          </div>
          <div className="criteria-popover-wrapper">
            <button
              type="button"
              className={`scorecard-criteria-btn ${showCriteriaModal ? "active" : ""}`}
              onClick={() => setShowCriteriaModal((curr) => !curr)}
              title="Ver tabla y reglas de ponderación del Scorecard (100 pts)"
              aria-expanded={showCriteriaModal}
            >
              <span className="criteria-icon">ℹ️</span> Criterios de Evaluación
            </button>
            {showCriteriaModal && (
              <aside
                className="metric-analysis-popover criteria-analysis-popover"
                data-side="left"
                role="dialog"
                aria-label="Criterios de evaluación"
              >
                <header>
                  <span>CRITERIOS DE EVALUACIÓN</span>
                  <button
                    type="button"
                    onClick={() => setShowCriteriaModal(false)}
                    aria-label="Cerrar criterios"
                  >
                    ×
                  </button>
                </header>
                <p>
                  El <b>Score Institucional (100 pts)</b> califica la solidez operativa y documental de cada marca para priorizar renovaciones preventivas y mitigar riesgos contractuales.
                </p>
                <div className="criteria-popover-pillar-list">
                  <div className="criteria-popover-pillar">
                    <strong>🏢 Estatus Operativo (35 pts)</strong>
                    <small>En Funcionamiento (+35), En Adaptación (+20), En Asignación (+5)</small>
                  </div>
                  <div className="criteria-popover-pillar">
                    <strong>📋 Documentos (30 pts)</strong>
                    <small>Garantía (+10), Póliza R.C. (+10), Proyecto (+10)</small>
                  </div>
                  <div className="criteria-popover-pillar">
                    <strong>⚖️ Formalización (20 pts)</strong>
                    <small>Formalizado (+20), En trámite (+10), Preformalizado (+5)</small>
                  </div>
                  <div className="criteria-popover-pillar">
                    <strong>⏳ Vigencia (15 pts)</strong>
                    <small>&gt; 90d (+15), 30–90d (+8), ≤ 30d (+3), Vencido (0)</small>
                  </div>
                </div>
                <div className="criteria-popover-scale-pills">
                  <span className="scale-mini-pill tone-ok"><b>A+</b> 90–100</span>
                  <span className="scale-mini-pill tone-ok"><b>A</b> 75–89</span>
                  <span className="scale-mini-pill tone-info"><b>B</b> 60–74</span>
                  <span className="scale-mini-pill tone-watch"><b>C</b> 40–59</span>
                  <span className="scale-mini-pill tone-risk"><b>D</b> &lt;40</span>
                </div>
              </aside>
            )}
          </div>
        </div>
      </header>

      {/* Row 1: Donut + Score Gauge + Doc Compliance Bars */}
      <div className="scorecard-charts-row">

        {/* 1. Rating Distribution Donut */}
        <article className="scorecard-chart-card" aria-label="Distribución de calificaciones">
          <header>
            <span className="section-kicker">Distribución</span>
            <strong>Ratings de Arrendatarios</strong>
          </header>
          <div className="rating-donut-layout">
            <div className="rating-donut" role="img" aria-label="Gráfica de dona de calificaciones">
              <svg viewBox="0 0 100 100" aria-hidden="true">
                {donutData.map(([rating, count, color], index) => {
                  const share = totalContracts ? (count as number) / totalContracts : 0;
                  const offset = totalContracts
                    ? (donutData.slice(0, index).reduce((sum, [, v]) => sum + (v as number), 0) / totalContracts)
                    : 0;
                  const isHovered = hoveredRating === rating;
                  return (
                    <circle
                      key={rating}
                      cx="50"
                      cy="50"
                      r="44"
                      fill="none"
                      stroke={color as string}
                      strokeWidth={isHovered ? "14" : "11"}
                      strokeDasharray={`${share * circumference} ${circumference}`}
                      strokeDashoffset={-offset * circumference}
                      transform="rotate(-90 50 50)"
                      style={{ transition: "stroke-width 0.2s ease", cursor: "pointer" }}
                      onMouseEnter={() => setHoveredRating(rating)}
                      onMouseLeave={() => setHoveredRating(null)}
                    >
                      <title>{`${rating}: ${count} arrendatarios (${totalContracts ? numberFormat.format(((count as number) / totalContracts) * 100) : 0}%)`}</title>
                    </circle>
                  );
                })}
              </svg>
              <div className="rating-donut-center">
                <strong>{totalContracts}</strong>
                <span>contratos</span>
              </div>
            </div>
            <div className="rating-donut-legend interactive-legend">
              {donutData.map(([rating, count, color]) => {
                const pct = totalContracts ? numberFormat.format(((count as number) / totalContracts) * 100) : "0";
                const rent = rentByRating[rating] ?? 0;
                const isHovered = hoveredRating === rating;
                const isSelected = selectedRating === rating;
                const descInfo = RATING_CRITERIA_DESCRIPTIONS[rating];
                return (
                  <button
                    key={rating}
                    type="button"
                    className={`rating-legend-item ${isHovered ? "hovered" : ""} ${isSelected ? "active" : ""}`}
                    onMouseEnter={() => setHoveredRating(rating)}
                    onMouseLeave={() => setHoveredRating(null)}
                    onClick={() => setSelectedRating(isSelected ? null : rating)}
                    aria-pressed={isSelected}
                    aria-label={`Ver criterio y registros de Rating ${rating}`}
                  >
                    <i style={{ background: color as string }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)" }}>
                          Rating {rating} <small style={{ fontWeight: 600, color: "#68777f" }}>({descInfo?.range})</small>
                        </strong>
                        <strong style={{ fontSize: "12px", fontWeight: 700, color: "var(--navy)" }}>{count} ({pct}%)</strong>
                      </div>
                      <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#556872", textAlign: "left", lineHeight: 1.3 }}>
                        {descInfo?.summary}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </article>

        {/* 2. Institutional Score Gauge */}
        <article className="scorecard-chart-card gauge-card" aria-label="Score promedio institucional">
          <header>
            <span className="section-kicker">Indicador institucional</span>
            <strong>Score Promedio</strong>
          </header>
          <div className="gauge-container">
            <svg viewBox="0 0 120 70" className="gauge-svg" aria-hidden="true">
              <path
                d="M 10 65 A 50 50 0 0 1 110 65"
                fill="none"
                stroke="#e4ece9"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M 10 65 A 50 50 0 0 1 110 65"
                fill="none"
                stroke={averageScore >= 75 ? "#00886f" : averageScore >= 60 ? "#39a9db" : averageScore >= 40 ? "#f28c28" : "#ac182c"}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(averageScore / 100) * 157} 157`}
                style={{ transition: "stroke-dasharray 0.5s ease" }}
              />
              <text x="60" y="55" textAnchor="middle" fill="var(--ink)" fontSize="22" fontWeight="800" fontFamily="Montserrat, sans-serif">{averageScore}</text>
              <text x="60" y="67" textAnchor="middle" fill="#6b7f7a" fontSize="8" fontWeight="600">de 100 puntos</text>
            </svg>
            <div className="gauge-labels">
              <span>0</span>
              <span className="gauge-target">Meta: 75</span>
              <span>100</span>
            </div>
          </div>
          <div className="gauge-detail-row">
            <div><span>Salud documental</span><strong>{numberFormat.format(docHealth)}%</strong></div>
            <div><span>Contratos evaluados</span><strong>{totalContracts}</strong></div>
          </div>
        </article>

        {/* 3. Document Compliance Horizontal Bars */}
        <article className="scorecard-chart-card" aria-label="Cumplimiento documental">
          <header>
            <span className="section-kicker">Por pilar</span>
            <strong>Cumplimiento Documental</strong>
          </header>
          <div className="compliance-bars">
            {docBars.map((bar) => {
              const pct = totalContracts ? (bar.count / totalContracts) * 100 : 0;
              return (
                <div className="compliance-bar-row" key={bar.label}>
                  <div className="compliance-bar-label">
                    <span>{bar.icon}</span>
                    <span>{bar.label}</span>
                  </div>
                  <div className="compliance-bar-track">
                    <div
                      className="compliance-bar-fill"
                      style={{ width: `${pct}%`, background: bar.color, transition: "width 0.4s ease" }}
                    />
                  </div>
                  <strong>{numberFormat.format(pct)}%</strong>
                </div>
              );
            })}
          </div>
        </article>
      </div>

      {selectedRating && (() => {
        const ratingInfo = RATING_CRITERIA_DESCRIPTIONS[selectedRating];
        const ratingContracts = contracts.filter((c) => c.score.rating === selectedRating);
        const ratingRent = rentByRating[selectedRating] ?? 0;
        const totalRent = contracts.reduce((sum, c) => sum + (c.monthlyRent ?? 0), 0);
        const ratingRentPct = totalRent > 0 ? (ratingRent / totalRent) * 100 : 0;
        const ratingDocOk = ratingContracts.filter((c) => c.score.breakdown.documents === 30).length;
        const ratingDocPct = ratingContracts.length ? (ratingDocOk / ratingContracts.length) * 100 : 0;

        return (
          <section className="status-detail-panel rating-criteria-detail-panel" style={{ marginTop: "16px", marginBottom: "20px" }} aria-live="polite">
            <div className="status-detail-heading">
              <div>
                <span className="section-kicker">Criterio Representado</span>
                <h3>Rating {selectedRating} · {ratingInfo?.label}</h3>
                <p>{ratingInfo?.description}</p>
              </div>
              <button type="button" onClick={() => setSelectedRating(null)} aria-label="Cerrar detalle de criterio">Cerrar ✕</button>
            </div>

            <div className="rating-criteria-kpi-row" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", margin: "14px 0" }}>
              <div className="criteria-kpi-box" style={{ background: "#f8fafb", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8eb" }}>
                <span style={{ fontSize: "10.5px", fontWeight: 800, textTransform: "uppercase", color: "#68777f" }}>Marcas en la categoría</span>
                <strong style={{ display: "block", fontSize: "18px", color: "var(--navy)", fontFamily: "Montserrat, sans-serif", marginTop: "2px" }}>
                  {ratingContracts.length} <small style={{ fontSize: "12px", color: "#68777f", fontWeight: 500 }}>({totalContracts ? numberFormat.format((ratingContracts.length / totalContracts) * 100) : 0}% de cartera)</small>
                </strong>
              </div>
              <div className="criteria-kpi-box" style={{ background: "#f8fafb", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8eb" }}>
                <span style={{ fontSize: "10.5px", fontWeight: 800, textTransform: "uppercase", color: "#68777f" }}>Renta Mensual Aportada</span>
                <strong style={{ display: "block", fontSize: "18px", color: "#00886f", fontFamily: "Montserrat, sans-serif", marginTop: "2px" }}>
                  {currencyFormat.format(ratingRent)} <small style={{ fontSize: "12px", color: "#68777f", fontWeight: 500 }}>({numberFormat.format(ratingRentPct)}% total)</small>
                </strong>
              </div>
              <div className="criteria-kpi-box" style={{ background: "#f8fafb", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8eb" }}>
                <span style={{ fontSize: "10.5px", fontWeight: 800, textTransform: "uppercase", color: "#68777f" }}>Salud Documental</span>
                <strong style={{ display: "block", fontSize: "18px", color: ratingDocPct >= 80 ? "#00886f" : "#ac182c", fontFamily: "Montserrat, sans-serif", marginTop: "2px" }}>
                  {numberFormat.format(ratingDocPct)}% <small style={{ fontSize: "12px", color: "#68777f", fontWeight: 500 }}>({ratingDocOk} de {ratingContracts.length} al 100%)</small>
                </strong>
              </div>
            </div>

            {ratingContracts.length > 0 ? (
              <div className="status-detail-table-wrap">
                <table className="status-detail-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Marca / Inquilino</th>
                      <th>Ubicación / Local</th>
                      <th>Score Total</th>
                      <th>Desglose de Puntos</th>
                      <th>Etapa Contractual</th>
                      <th className="numeric">Renta Mensual</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ratingContracts.map((c, index) => (
                      <tr key={c.key}>
                        <td><strong>{index + 1}</strong></td>
                        <td><strong>{c.brand}</strong></td>
                        <td>{c.locationName} · {c.locals.map((l) => l.nomenclatura).join(", ") || "Sin local"}</td>
                        <td><strong className={`rating-pill ${ratingInfo?.badgeTone}`}>{c.score.score} pts ({c.score.rating})</strong></td>
                        <td style={{ minWidth: "160px" }}>
                          <div className="doc-tags-mini" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                            <span className={`doc-tag ${c.score.breakdown.documents === 30 ? "ok" : "risk"}`} title="Salud Documental (Max 30)">
                              Doc: {c.score.breakdown.documents}/30
                            </span>
                            <span className={`doc-tag ${c.score.breakdown.renewal >= 8 ? "ok" : "risk"}`} title="Vigencia (Max 15)">
                              Vig: {c.score.breakdown.renewal}/15
                            </span>
                            <span className={`doc-tag ${c.score.breakdown.formalized === 20 ? "ok" : "risk"}`} title="Formalización (Max 20)">
                              Form: {c.score.breakdown.formalized}/20
                            </span>
                            <span className={`doc-tag ${c.score.breakdown.operation === 35 ? "ok" : "risk"}`} title="Operación (Max 35)">
                              Oper: {c.score.breakdown.operation}/35
                            </span>
                          </div>
                          {c.score.details.length > 0 && (
                            <div style={{ marginTop: "6px", fontSize: "10px", color: "#ac182c", lineHeight: "1.2", paddingLeft: "2px" }}>
                              {c.score.details.map((d, i) => <div key={i}>• {d}</div>)}
                            </div>
                          )}
                        </td>
                        <td>{c.contractStatus}</td>
                        <td className="numeric"><strong>{currencyFormat.format(c.monthlyRent ?? 0)}</strong></td>
                        <td>
                          {onOpenLocal && c.locals[0] ? (
                            <button
                              type="button"
                              className="table-action-btn"
                              onClick={() => {
                                const isGep = c.gerencia?.toLowerCase().includes("publicit") || c.contractNumber?.includes("GEP") || c.sourceSheet?.includes("GEP");
                                onOpenLocal(c.locals[0].nomenclatura, isGep ? "gep" : c.locationId);
                              }}
                            >
                              {(c.gerencia?.toLowerCase().includes("publicit") || c.contractNumber?.includes("GEP")) ? "Ver espacio →" : "Ver local →"}
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
            ) : (
              <p className="status-detail-empty">No hay registros clasificados en el Rating {selectedRating}.</p>
            )}
          </section>
        );
      })()}

      {/* Dynamic Narrative Section: Diagnóstico Rector & Dictamen Jurídico-Contractual */}
      <article className="scorecard-chart-card scorecard-narrative-card" aria-label="Diagnóstico y dictamen contractual">
        <header>
          <span className="section-kicker">Evaluación de Criterios</span>
          <strong>Diagnóstico Rector & Dictamen Jurídico-Contractual</strong>
        </header>

        <div className="scorecard-narrative-content">
          <div className="scorecard-narrative-paragraphs">
            <div className="narrative-paragraph-block">
              <span className="paragraph-badge">1. Salud Global de Cartera</span>
              <p>
                A partir del análisis de los <b>{totalContracts} contratos</b> evaluados en las zonas comerciales del AIFA, la cartera registra un <b>Score Promedio Institucional de {averageScore}/100 pts</b> ({averageScore >= 75 ? "Solidez Alta" : averageScore >= 60 ? "Aceptable con Seguimiento" : "Atención Requerida"}). El <b>{totalContracts ? Math.round((((ratingCounts["A+"] ?? 0) + (ratingCounts.A ?? 0)) / totalContracts) * 100) : 0}% de los contratos</b> ({(ratingCounts["A+"] ?? 0) + (ratingCounts.A ?? 0)} instrumentos) se clasifican en categorías de excelencia (<b>A+ y A</b>), mientras que el <b>{totalContracts ? Math.round((((ratingCounts.C ?? 0) + (ratingCounts.D ?? 0)) / totalContracts) * 100) : 0}%</b> ({(ratingCounts.C ?? 0) + (ratingCounts.D ?? 0)} contratos) requiere monitoreo de riesgo.
              </p>
            </div>

            <div className="narrative-paragraph-block">
              <span className="paragraph-badge">2. Auditoría Operativa & Documental</span>
              <p>
                En la vertiente operativa y de formalización, el <b>{totalContracts ? Math.round((contracts.filter((c) => c.locals.some((l) => l.estatus === "EN FUNCIONAMIENTO")).length / totalContracts) * 100) : 0}% de los espacios</b> opera en <b>Funcionamiento activo (+35 pts)</b> y el <b>{totalContracts ? Math.round((contracts.filter((c) => c.locals.some((l) => l.estatus === "EN ADAPTACION")).length / totalContracts) * 100) : 0}%</b> se encuentra en etapa de <b>Adaptación (+20 pts)</b>. La <b>Salud Documental global alcanza un {numberFormat.format(docHealth)}%</b>, identificándose <b>{contracts.filter((c) => c.score.breakdown.documents < 30).length} contratos</b> con faltantes o pendientes de actualización en sus pólizas de R.C., garantías o proyectos de obra.
              </p>
            </div>

            <div className="narrative-paragraph-block">
              <span className="paragraph-badge">3. Dictamen de Vencimientos & Hoja de Ruta</span>
              <p>
                Se detectan <b>{contracts.filter((c) => c.daysRemaining !== null && c.daysRemaining <= 90).length} instrumentos contractuales</b> con vencimiento cercano (≤ 90 días), amparando una renta de <b>{currencyFormat.format(contracts.filter((c) => c.daysRemaining !== null && c.daysRemaining <= 90).reduce((sum, c) => sum + (c.monthlyRent ?? 0), 0))}/mes</b>. Se dictamina a la Subdirección Comercial priorizar la renovación preventiva de los <b>{contracts.filter((c) => c.score.score < 60).length} contratos con Score inferior a 60 pts</b> para asegurar la continuidad de ingresos y la actualización de fianzas.
              </p>
            </div>
          </div>

          <div className="scorecard-narrative-actions">
            <span className="actions-header-label">Puntos Clave del Dictamen</span>
            <div className="narrative-action-item priority-alta">
              <div className="action-tag">Prioridad Alta</div>
              <p>Renovación urgente de contratos en categoría C/D con vencimiento menor o igual a 90 días.</p>
            </div>
            <div className="narrative-action-item priority-media">
              <div className="action-tag">Prioridad Media</div>
              <p>Requerimiento formal de actualización de Pólizas de R.C. y Garantías faltantes ({contracts.filter((c) => c.score.breakdown.documents < 30).length} expedientes).</p>
            </div>
            <div className="narrative-action-item priority-baja">
              <div className="action-tag">Prioridad Preventiva</div>
              <p>Seguimiento al pase de expedientes de Preformalización a Formalizado en cartera vigente.</p>
            </div>
          </div>
        </div>
      </article>

      {/* Row 2: Top 5 vs Bottom 5 Ranking (Full Width) */}
      <div className="scorecard-charts-row scorecard-row-ranking">
        <article className="scorecard-chart-card ranking-card" aria-label="Ranking de arrendatarios">
          <header>
            <span className="section-kicker">Comparativo</span>
            <strong>Top 5 vs Últimos 5 por Score</strong>
          </header>
          <div className="ranking-columns">
            <div className="ranking-column top-column">
              <h4>🏆 Mejores Arrendatarios</h4>
              {top5.map((c) => (
                <div className="ranking-bar-row" key={c.key}>
                  <div className="ranking-bar-info">
                    <strong>{c.brand}</strong>
                    <TenantRatingBadge score={c.score} />
                  </div>
                  <div className="ranking-bar-track">
                    <div
                      className="ranking-bar-fill tone-ok"
                      style={{ width: `${(c.score.score / maxScore) * 100}%` }}
                    />
                    <span className="ranking-bar-value">{c.score.score}</span>
                  </div>
                  <small>{c.monthlyRent === null ? "—" : currencyFormat.format(c.monthlyRent)}/mes</small>
                </div>
              ))}
            </div>
            <div className="ranking-column bottom-column">
              <h4>⚠️ Requieren Atención</h4>
              {bottom5.map((c) => (
                <div className="ranking-bar-row" key={c.key}>
                  <div className="ranking-bar-info">
                    <strong>{c.brand}</strong>
                    <TenantRatingBadge score={c.score} />
                  </div>
                  <div className="ranking-bar-track">
                    <div
                      className={`ranking-bar-fill tone-${c.score.tone}`}
                      style={{ width: `${(c.score.score / maxScore) * 100}%` }}
                    />
                    <span className="ranking-bar-value">{c.score.score}</span>
                  </div>
                  <small>{c.score.details[0] ?? "Sin observaciones"}</small>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>

      {/* Row 3: Visual Timeline Line (Full Width) */}
      <div className="scorecard-charts-row scorecard-row-timeline">
        <article className="scorecard-chart-card timeline-card" aria-label="Timeline de renovaciones">
          <header className="timeline-section-header">
            <div>
              <span className="section-kicker">Línea de tiempo operativa (Próximos 90 días)</span>
              <strong>Timeline Visual de Vencimientos y Renovaciones</strong>
            </div>
            <p className="timeline-section-hint">Haz clic en cualquier contrato sobre la línea de tiempo para ver su ventana de diagnóstico detallado.</p>
          </header>
          <RenewalTimeline contracts={timelineContracts} onOpenLocal={onOpenLocal} />
        </article>
      </div>
    </section>
  );
}



function buildTimelineReason(c: ContractAggregate): string[] {
  const reasons: string[] = [];
  const days = c.daysRemaining ?? 0;

  if (days <= 0) {
    reasons.push(`El contrato venció hace ${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"} (${formatDate(c.renewalDate)}). Requiere acción legal y operativa inmediata para formalizar prórroga o finiquito.`);
  } else if (days <= 30) {
    reasons.push(`Faltan únicamente ${days} día${days === 1 ? "" : "s"} para la fecha de vencimiento (${formatDate(c.renewalDate)}). Se encuentra en zona de riesgo crítico.`);
  } else if (days <= 60) {
    reasons.push(`La renovación está programada en ${days} días (${formatDate(c.renewalDate)}). Ventana óptima para iniciar negociaciones de términos y revisar expediente.`);
  } else {
    reasons.push(`Renovación programada en ${days} días (${formatDate(c.renewalDate)}). Tiempo suficiente de planeación preventiva para asegurar continuidad operativa.`);
  }

  if (documentNeedsAttention(c.guaranteeStatus)) {
    reasons.push("Garantía de cumplimiento con estatus pendiente u observaciones — indispensable regularizar antes de firmar la renovación.");
  }
  if (documentNeedsAttention(c.liabilityPolicyStatus)) {
    reasons.push("Póliza de Responsabilidad Civil (R.C.) vencida o no integrada — la operación comercial carece de cobertura de seguro vigente.");
  }
  if (documentNeedsAttention(c.projectStatus)) {
    reasons.push("Proyecto de obra con observaciones técnicas o pendiente de visto bueno de la administración.");
  }
  if (!c.contractNumber) {
    reasons.push("Expediente en etapa de preformalización / trámite sin número de contrato definitivo asignado.");
  }
  if (c.score.score < 60) {
    reasons.push(`Calificación baja de cumplimiento comercial (${c.score.score}/100 pts) — amerita revisión integral de expediente.`);
  }

  return reasons;
}

function getTimelineRecommendation(c: ContractAggregate): string {
  const days = c.daysRemaining ?? 0;
  if (days <= 0) {
    return "URGENTE: Notificar al área jurídica para emitir convenio modificatorio de prórroga o acta de entrega-recepción de local.";
  }
  if (days <= 30) {
    return "PRIORIDAD ALTA: Solicitar actualización de póliza de seguro y garantía, y presentar propuesta de renovación económica a la marca.";
  }
  if (days <= 60) {
    return "SEGUIMIENTO: Iniciar mesas de trabajo con el gestor asignado y validar condiciones comerciales de continuidad.";
  }
  return "PLANEACIÓN: Integrar expediente preventivo y verificar vigencia de fianzas para anticipar el proceso de renovación.";
}

function RenewalTimeline({
  contracts,
  onOpenLocal,
}: {
  contracts: ContractAggregate[];
  onOpenLocal?: (nomenclature: string, locationId: string | null) => void;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [filterZone, setFilterZone] = useState<"all" | "critical" | "watch" | "ok">("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!contracts.length) {
    return (
      <div className="timeline-empty">
        <strong>Sin vencimientos próximos</strong>
        <span>No hay contratos con renovación en la ventana de los próximos 90 días.</span>
      </div>
    );
  }

  const critical = contracts.filter((c) => (c.daysRemaining ?? 0) <= 30);
  const watch = contracts.filter((c) => (c.daysRemaining ?? 0) > 30 && (c.daysRemaining ?? 0) <= 60);
  const ok = contracts.filter((c) => (c.daysRemaining ?? 0) > 60);

  const displayedContracts = contracts.filter((c) => {
    const days = c.daysRemaining ?? 0;
    if (filterZone === "critical") return days <= 30;
    if (filterZone === "watch") return days > 30 && days <= 60;
    if (filterZone === "ok") return days > 60;
    return true;
  });

  const selectedContract = selectedKey ? contracts.find((c) => c.key === selectedKey) : null;

  // Rent calculations
  const rentCritical = critical.reduce((sum, c) => sum + (c.monthlyRent ?? 0), 0);
  const rentWatch = watch.reduce((sum, c) => sum + (c.monthlyRent ?? 0), 0);
  const rentOk = ok.reduce((sum, c) => sum + (c.monthlyRent ?? 0), 0);

  // Dynamic canvas width: if single zone, width adjusts smoothly to its count
  const canvasMinWidth =
    filterZone === "all"
      ? Math.max(1600, displayedContracts.length * 150)
      : Math.max(1100, displayedContracts.length * 180);

  const handleScroll = (amount: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  const handleScrollToPercent = (pct: number) => {
    if (scrollRef.current) {
      const maxScroll = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
      scrollRef.current.scrollTo({ left: (pct / 100) * maxScroll, behavior: "smooth" });
    }
  };

  const setZoneAndReset = (zone: "all" | "critical" | "watch" | "ok") => {
    setFilterZone(zone);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  };

  // Compute position along the track according to active filter
  const getPinPosition = (days: number): number => {
    if (filterZone === "critical") {
      const clamped = Math.max(-15, Math.min(30, days));
      return 6 + ((clamped + 15) / 45) * 88;
    }
    if (filterZone === "watch") {
      const clamped = Math.max(31, Math.min(60, days));
      return 6 + ((clamped - 31) / 29) * 88;
    }
    if (filterZone === "ok") {
      const clamped = Math.max(61, Math.min(90, days));
      return 6 + ((clamped - 61) / 29) * 88;
    }
    // "all"
    const clamped = Math.max(-15, Math.min(90, days));
    return 4 + ((clamped + 15) / 105) * 92;
  };

  return (
    <div className="timeline-visual-container">
      {/* 1. Zone filter pills & Scroll Navigation Controls */}
      <div className="timeline-top-toolbar">
        <div className="timeline-zone-filters" role="tablist" aria-label="Filtro de zonas de vencimiento">
          <button
            type="button"
            role="tab"
            className={`timeline-filter-btn ${filterZone === "all" ? "active" : ""}`}
            aria-selected={filterZone === "all"}
            onClick={() => setZoneAndReset("all")}
          >
            <span>Todos los vencimientos</span>
            <b>{contracts.length}</b>
          </button>
          <button
            type="button"
            role="tab"
            className={`timeline-filter-btn tone-critical ${filterZone === "critical" ? "active" : ""}`}
            aria-selected={filterZone === "critical"}
            onClick={() => setZoneAndReset("critical")}
          >
            <i />
            <span>Crítico (≤ 30 días)</span>
            <b>{critical.length}</b>
          </button>
          <button
            type="button"
            role="tab"
            className={`timeline-filter-btn tone-watch ${filterZone === "watch" ? "active" : ""}`}
            aria-selected={filterZone === "watch"}
            onClick={() => setZoneAndReset("watch")}
          >
            <i />
            <span>En Seguimiento (31–60 días)</span>
            <b>{watch.length}</b>
          </button>
          <button
            type="button"
            role="tab"
            className={`timeline-filter-btn tone-ok ${filterZone === "ok" ? "active" : ""}`}
            aria-selected={filterZone === "ok"}
            onClick={() => setZoneAndReset("ok")}
          >
            <i />
            <span>Planeación (61–90 días)</span>
            <b>{ok.length}</b>
          </button>
        </div>

        {/* Scroll navigation shortcuts */}
        <div className="timeline-scroll-controls" aria-label="Controles de desplazamiento de la línea">
          <span className="scroll-controls-label">Desplazar:</span>
          <button
            type="button"
            className="timeline-nav-btn"
            onClick={() => handleScroll(-350)}
            aria-label="Desplazar a la izquierda"
            title="Desplazar a la izquierda"
          >
            ◀ Izquierda
          </button>
          {filterZone === "all" ? (
            <>
              <button
                type="button"
                className="timeline-jump-btn tone-critical"
                onClick={() => handleScrollToPercent(0)}
                title="Ir a Zona Crítica (0–30 días)"
              >
                🚨 0–30d
              </button>
              <button
                type="button"
                className="timeline-jump-btn tone-watch"
                onClick={() => handleScrollToPercent(33.3)}
                title="Ir a Zona de Seguimiento (31–60 días)"
              >
                ⚠️ 31–60d
              </button>
              <button
                type="button"
                className="timeline-jump-btn tone-ok"
                onClick={() => handleScrollToPercent(66.6)}
                title="Ir a Zona Preventiva (61–90 días)"
              >
                📅 61–90d
              </button>
            </>
          ) : (
            <span className="active-filter-indicator">
              Mostrando: <b>{filterZone === "critical" ? "Zona Crítica" : filterZone === "watch" ? "Seguimiento" : "Planeación"}</b>
            </span>
          )}
          <button
            type="button"
            className="timeline-nav-btn"
            onClick={() => handleScroll(350)}
            aria-label="Desplazar a la derecha"
            title="Desplazar a la derecha"
          >
            Derecha ▶
          </button>
        </div>
      </div>

      {/* 2. Horizontally Scrollable Timeline Line Track */}
      <div className="timeline-scroll-outer" ref={scrollRef}>
        <div className="timeline-line-canvas" style={{ minWidth: `${canvasMinWidth}px` }}>
          {/* Background Color Zones */}
          <div className="timeline-zones-bg" aria-hidden="true">
            {filterZone === "all" ? (
              <>
                <div className="tl-bg-zone zone-critical" style={{ width: "33.33%" }}>
                  <span className="zone-bg-title">🚨 Zona Crítica (0–30 días)</span>
                  <span className="zone-bg-rent">{currencyFormat.format(rentCritical)}/mes</span>
                </div>
                <div className="tl-bg-zone zone-watch" style={{ width: "33.33%" }}>
                  <span className="zone-bg-title">⚠️ Zona Seguimiento (31–60 días)</span>
                  <span className="zone-bg-rent">{currencyFormat.format(rentWatch)}/mes</span>
                </div>
                <div className="tl-bg-zone zone-ok" style={{ width: "33.34%" }}>
                  <span className="zone-bg-title">📅 Zona Preventiva (61–90 días)</span>
                  <span className="zone-bg-rent">{currencyFormat.format(rentOk)}/mes</span>
                </div>
              </>
            ) : filterZone === "critical" ? (
              <div className="tl-bg-zone zone-critical active-single-zone" style={{ width: "100%" }}>
                <div className="zone-bg-header">
                  <span className="zone-bg-title">🚨 Zona Crítica — Vencidos y Renovaciones en ≤ 30 días ({critical.length} contratos)</span>
                  <span className="zone-bg-rent">Renta en riesgo: {currencyFormat.format(rentCritical)}/mes</span>
                </div>
                <span className="zone-bg-footer-hint">Plazo legal inmediato: requiere emisión de prórroga o entrega de local</span>
              </div>
            ) : filterZone === "watch" ? (
              <div className="tl-bg-zone zone-watch active-single-zone" style={{ width: "100%" }}>
                <div className="zone-bg-header">
                  <span className="zone-bg-title">⚠️ Zona de Seguimiento — Renovaciones en 31 a 60 días ({watch.length} contratos)</span>
                  <span className="zone-bg-rent">Renta en seguimiento: {currencyFormat.format(rentWatch)}/mes</span>
                </div>
                <span className="zone-bg-footer-hint">Ventana de negociación activa y regularización de pólizas/fianzas</span>
              </div>
            ) : (
              <div className="tl-bg-zone zone-ok active-single-zone" style={{ width: "100%" }}>
                <div className="zone-bg-header">
                  <span className="zone-bg-title">📅 Zona Preventiva — Renovaciones en 61 a 90 días ({ok.length} contratos)</span>
                  <span className="zone-bg-rent">Renta proyectada: {currencyFormat.format(rentOk)}/mes</span>
                </div>
                <span className="zone-bg-footer-hint">Planeación estratégica anticipada y revisión de condiciones comerciales</span>
              </div>
            )}
          </div>

          {/* Timeline Axis Line & Nodes */}
          <div className="timeline-axis-area">
            <div className={`timeline-main-axis axis-${filterZone}`} aria-hidden="true">
              <div className={`timeline-axis-gradient gradient-${filterZone}`} />
            </div>

            {/* Markers / Pins on the Line */}
            <div className="timeline-pins-layer">
              {displayedContracts.length === 0 ? (
                <div className="timeline-zone-empty">
                  <span className="empty-icon">✓</span>
                  <strong>Sin contratos en este rango</strong>
                  <p>No se encontraron expedientes con vencimiento en esta zona.</p>
                </div>
              ) : (
                displayedContracts.map((c, index) => {
                  const days = c.daysRemaining ?? 0;
                  const pct = getPinPosition(days);
                  const tone = days <= 0 ? "expired" : days <= 30 ? "critical" : days <= 60 ? "watch" : "ok";
                  const isSelected = selectedKey === c.key;
                  // 4 distinct vertical tiers to ensure zero overlap:
                  // 0: top-high, 1: bottom-high, 2: top-low, 3: bottom-low
                  const tierIndex = index % 4;
                  const tierClass =
                    tierIndex === 0
                      ? "tier-top-high"
                      : tierIndex === 1
                      ? "tier-bottom-high"
                      : tierIndex === 2
                      ? "tier-top-low"
                      : "tier-bottom-low";

                  return (
                    <div
                      key={c.key}
                      className={`timeline-pin-node ${tierClass} tone-${tone} ${isSelected ? "selected" : ""}`}
                      style={{ left: `${pct}%` }}
                    >
                      {/* Stem connecting tag to center axis */}
                      <div className={`pin-stem tone-${tone}`} />

                      {/* Node point on the line */}
                      <div className={`pin-axis-dot tone-${tone}`} />

                      {/* Interactive Pin Tag Card */}
                      <button
                        type="button"
                        className={`timeline-pin-tag tone-${tone} ${isSelected ? "active-tag" : ""}`}
                        onClick={() => setSelectedKey(isSelected ? null : c.key)}
                        aria-label={`Ver diagnóstico de ${c.brand}, ${daysLabel(c.daysRemaining)}`}
                        aria-expanded={isSelected}
                      >
                        <div className="pin-tag-top">
                          <strong className="pin-brand-title">{c.brand}</strong>
                          <TenantRatingBadge score={c.score} />
                        </div>
                        <div className="pin-tag-meta">
                          <span className={`pin-days-tag tone-${tone}`}>{daysLabel(c.daysRemaining)}</span>
                          {c.monthlyRent !== null && (
                            <span className="pin-rent-tag">{currencyFormat.format(c.monthlyRent)}/m</span>
                          )}
                        </div>
                      </button>

                      {/* Popover window attached directly to the pin, exactly like LocationIndicators */}
                      {isSelected && (
                        <aside
                          className="metric-analysis-popover timeline-pin-popover"
                          data-side={pct > 55 ? "left" : "right"}
                          role="dialog"
                          aria-label={`Diagnóstico de ${c.brand}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <header>
                            <span>Por qué importa</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedKey(null);
                              }}
                              aria-label={`Cerrar información de ${c.brand}`}
                            >
                              ×
                            </button>
                          </header>
                          <div className="tl-popover-brand-row">
                            <strong>{c.brand}</strong>
                            <TenantRatingBadge score={c.score} />
                          </div>
                          <p>
                            {buildTimelineReason(c)[0]}
                          </p>
                          <div className="tl-popover-metrics">
                            <div><span>Vencimiento:</span> <b>{formatDate(c.renewalDate)} ({daysLabel(c.daysRemaining)})</b></div>
                            <div><span>Renta mensual:</span> <b>{c.monthlyRent === null ? "Sin dato" : `${currencyFormat.format(c.monthlyRent)}/m`}</b></div>
                            <div><span>Score:</span> <b>{c.score.score}/100 pts ({c.score.label})</b></div>
                          </div>
                          <div className="tl-popover-docs">
                            <span className={`doc-tag ${!documentNeedsAttention(c.guaranteeStatus) ? "ok" : "risk"}`}>
                              Garantía {!documentNeedsAttention(c.guaranteeStatus) ? "✓" : "✗"}
                            </span>
                            <span className={`doc-tag ${!documentNeedsAttention(c.liabilityPolicyStatus) ? "ok" : "risk"}`}>
                              Póliza R.C. {!documentNeedsAttention(c.liabilityPolicyStatus) ? "✓" : "✗"}
                            </span>
                            <span className={`doc-tag ${!documentNeedsAttention(c.projectStatus) ? "ok" : "risk"}`}>
                              Proyecto {!documentNeedsAttention(c.projectStatus) ? "✓" : "✗"}
                            </span>
                          </div>
                          {onOpenLocal && c.locals.length > 0 && c.locals[0].nomenclatura && (
                            <div className="metric-analysis-links">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const first = c.locals[0];
                                  const isGep = c.gerencia?.toLowerCase().includes("publicit") || c.contractNumber?.includes("GEP") || c.sourceSheet?.includes("GEP");
                                  const targetLocId = isGep ? "gep" : (first.contractLocationId ?? (first as any).locationId ?? null);
                                  if (first.nomenclatura) {
                                    onOpenLocal(first.nomenclatura, targetLocId);
                                    setSelectedKey(null);
                                  }
                                }}
                              >
                                <span>
                                  <b>1</b>
                                  <strong>
                                    {(c.gerencia?.toLowerCase().includes("publicit") || c.contractNumber?.includes("GEP")) ? `Ver espacio ${c.locals[0].nomenclatura}` : `Ver local ${c.locals[0].nomenclatura}`}
                                  </strong>
                                  <em>
                                    {(c.gerencia?.toLowerCase().includes("publicit") || c.contractNumber?.includes("GEP")) ? "Ir a Publicidad →" : "Ir al local →"}
                                  </em>
                                </span>
                                <small>{c.contractNumber ? `Contrato: ${c.contractNumber}` : "Expediente en trámite"}</small>
                              </button>
                            </div>
                          )}
                        </aside>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Time axis milestones */}
            {filterZone === "critical" ? (
              <div className="timeline-milestones" aria-hidden="true">
                <div className="milestone-mark" style={{ left: "6%" }}>
                  <span className="milestone-dot" />
                  <span className="milestone-label">Vencidos / Hoy (0d)</span>
                </div>
                <div className="milestone-mark" style={{ left: "35.3%" }}>
                  <span className="milestone-dot" />
                  <span className="milestone-label">10 días</span>
                </div>
                <div className="milestone-mark" style={{ left: "64.6%" }}>
                  <span className="milestone-dot" />
                  <span className="milestone-label">20 días</span>
                </div>
                <div className="milestone-mark" style={{ left: "94%" }}>
                  <span className="milestone-dot" />
                  <span className="milestone-label">30 días (Límite Crítico)</span>
                </div>
              </div>
            ) : filterZone === "watch" ? (
              <div className="timeline-milestones" aria-hidden="true">
                <div className="milestone-mark" style={{ left: "6%" }}>
                  <span className="milestone-dot" />
                  <span className="milestone-label">31 días</span>
                </div>
                <div className="milestone-mark" style={{ left: "35.3%" }}>
                  <span className="milestone-dot" />
                  <span className="milestone-label">40 días</span>
                </div>
                <div className="milestone-mark" style={{ left: "64.6%" }}>
                  <span className="milestone-dot" />
                  <span className="milestone-label">50 días</span>
                </div>
                <div className="milestone-mark" style={{ left: "94%" }}>
                  <span className="milestone-dot" />
                  <span className="milestone-label">60 días</span>
                </div>
              </div>
            ) : filterZone === "ok" ? (
              <div className="timeline-milestones" aria-hidden="true">
                <div className="milestone-mark" style={{ left: "6%" }}>
                  <span className="milestone-dot" />
                  <span className="milestone-label">61 días</span>
                </div>
                <div className="milestone-mark" style={{ left: "35.3%" }}>
                  <span className="milestone-dot" />
                  <span className="milestone-label">70 días</span>
                </div>
                <div className="milestone-mark" style={{ left: "64.6%" }}>
                  <span className="milestone-dot" />
                  <span className="milestone-label">80 días</span>
                </div>
                <div className="milestone-mark" style={{ left: "94%" }}>
                  <span className="milestone-dot" />
                  <span className="milestone-label">90 días</span>
                </div>
              </div>
            ) : (
              <div className="timeline-milestones" aria-hidden="true">
                <div className="milestone-mark" style={{ left: "4%" }}>
                  <span className="milestone-dot" />
                  <span className="milestone-label">Hoy / Vencidos</span>
                </div>
                <div className="milestone-mark" style={{ left: "34.6%" }}>
                  <span className="milestone-dot" />
                  <span className="milestone-label">30 días</span>
                </div>
                <div className="milestone-mark" style={{ left: "65.3%" }}>
                  <span className="milestone-dot" />
                  <span className="milestone-label">60 días</span>
                </div>
                <div className="milestone-mark" style={{ left: "96%" }}>
                  <span className="milestone-dot" />
                  <span className="milestone-label">90 días</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContractRows({
  contract,
  expanded,
  onToggle,
  onOpenLocal,
  onEdit,
  onDelete,
}: {
  contract: ContractAggregate;
  expanded: boolean;
  onToggle: () => void;
  onOpenLocal?: (nomenclature: string, locationId: string | null) => void;
  onEdit?: (contract: ContractAggregate) => void;
  onDelete?: (contract: ContractAggregate) => void;
}) {
  const safeScore: TenantScore = contract.score ?? {
    score: 0,
    rating: "D",
    label: "Sin evaluar",
    tone: "risk",
    breakdown: { documents: 0, renewal: 0, formalized: 0, operation: 0 },
    details: [],
  };
  const localsList = contract.locals ?? [];

  return (
    <>
      <tr className={expanded ? "expanded-row" : ""}>
        <td>
          <strong className="contract-number">{contract.contractNumber ?? "Sin número"}</strong>
          <small>
            {contract.pending
              ? "Expediente en trámite"
              : `${localsList.length} ${localsList.length === 1 ? "local relacionado" : "locales relacionados"}`}
          </small>
        </td>
        <td>
          <div className="brand-rating-cell">
            <strong>{contract.brand || "Sin marca"}</strong>
            <TenantRatingBadge score={safeScore} />
          </div>
          <small>{contract.commercialSubline ?? contract.commercialLine ?? "Sin giro contractual"}</small>
        </td>
        <td>
          <div className="local-chip-list">
            {localsList.map((local, idx) => {
              const rawNom = String(local.nomenclatura || "").trim();
              const isNonLocal =
                !rawNom ||
                rawNom.toUpperCase() === "N/A" ||
                rawNom.toUpperCase().includes("SIN LOCAL") ||
                rawNom === contract.contractNumber;

              const chipKey = `chip-${local.id ?? idx}-${local.nomenclatura ?? idx}`;

              if (isNonLocal) {
                return (
                  <span
                    key={chipKey}
                    className="local-chip-na"
                    title="Contrato de servicio, aplicación de encuestas o sin local comercial físico"
                  >
                    Sin local asignado
                  </span>
                );
              }

              const isGepContract = contract.gerencia?.toLowerCase().includes("publicit") || contract.contractNumber?.includes("GEP") || contract.sourceSheet?.includes("GEP");
              return onOpenLocal ? (
                <button
                  type="button"
                  key={chipKey}
                  onClick={() => onOpenLocal(local.nomenclatura, isGepContract ? "gep" : (local.contractLocationId ?? contract.locationId))}
                  aria-label={isGepContract ? `Abrir espacio publicitario ${local.nomenclatura} en Publicidad` : `Abrir local ${local.nomenclatura}`}
                  title={isGepContract ? `Ver ${local.nomenclatura} en Publicidad` : `Ver ${local.nomenclatura} en Locales`}
                >
                  {local.nomenclatura}
                </button>
              ) : (
                <span key={chipKey}>{local.nomenclatura}</span>
              );
            })}
          </div>
        </td>
        <td className="numeric">
          <strong>{contract.monthlyRent === null ? "—" : currencyFormat.format(contract.monthlyRent)}</strong>
        </td>
        <td>
          <strong>{formatDate(contract.renewalDate)}</strong>
          <small>
            <span
              className={`days-label ${
                contract.attention === "Crítico" ? "critical" : contract.attention === "Seguimiento" ? "watch" : ""
              }`}
            >
              {daysLabel(contract.daysRemaining)}
            </span>
          </small>
        </td>
        <td>
          <DocumentIconsBadge contract={contract} />
        </td>
        <td>
          <span className="status-badge" style={{ "--status": statusColor(contract.contractStatus) } as CSSProperties}>
            {contract.contractStatus}
          </span>
          <small>
            <AttentionBadge value={contract.attention} />
          </small>
        </td>
        <td>
          <strong>{contract.manager}</strong>
        </td>
        <td>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              className="detail-button"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-label={`${expanded ? "Ocultar" : "Mostrar"} contrato ${contract.contractNumber ?? contract.brand}`}
            >
              {expanded ? "−" : "+"}
            </button>
            {onEdit && (
              <button
                type="button"
                className="btn-contract-edit"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(contract);
                }}
                title="Editar este contrato"
              >
                ✏️
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="btn-contract-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(contract);
                }}
                title="Eliminar este contrato"
              >
                🗑️
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="contract-detail-row">
          <td colSpan={9}>
            <div className="contract-detail-panel">
              {/* Tenant Score & Rating Summary Card */}
              <div className="contract-tenant-rating-card">
                <div className="rating-card-header">
                  <div>
                    <span className="section-kicker">Evaluación Institucional de Arrendatario</span>
                    <h4>{contract.brand}</h4>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <TenantRatingBadge score={safeScore} />
                    {onEdit && (
                      <button
                        type="button"
                        className="btn-contract-edit"
                        onClick={() => onEdit(contract)}
                        title="Editar expediente del contrato"
                      >
                        ✏️ Editar
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        className="btn-contract-delete"
                        onClick={() => onDelete(contract)}
                        title="Eliminar expediente del contrato"
                      >
                        🗑️ Eliminar
                      </button>
                    )}
                  </div>
                </div>
                <div className="rating-score-bar-wrap">
                  <div className="rating-score-bar">
                    <div
                      className={`rating-score-fill tone-${safeScore.tone ?? "risk"}`}
                      style={{ width: `${Math.min(100, Math.max(0, safeScore.score ?? 0))}%` }}
                    />
                  </div>
                  <span>{safeScore.score ?? 0} / 100 Puntos ({safeScore.label ?? "Sin evaluar"})</span>
                </div>
                {(safeScore.details ?? []).length > 0 ? (
                  <div className="rating-observations">
                    <strong>Puntos de atención identificados:</strong>
                    <ul>
                      {(safeScore.details ?? []).map((obs, idx) => (
                        <li key={idx}>⚠️ {obs}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="rating-ok-text">✓ Arrendatario con expediente al 100% integrado y excelente historial operativo.</p>
                )}
              </div>

              <div className="contract-detail-group">
                <span>Información contractual y de gestión</span>
                <dl>
                  {contract.razonSocial && (
                    <div>
                      <dt>Razón social</dt>
                      <dd>{contract.razonSocial}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Marca comercial</dt>
                    <dd>{contract.brand}</dd>
                  </div>
                  <div>
                    <dt>Gerencia</dt>
                    <dd>{contract.gerencia}</dd>
                  </div>
                  <div>
                    <dt>Gestor asignado</dt>
                    <dd>{contract.manager}</dd>
                  </div>
                  <div>
                    <dt>Zona comercial</dt>
                    <dd>{contract.locationName}</dd>
                  </div>
                  <div>
                    <dt>Giro / Subgiro</dt>
                    <dd>{[contract.commercialLine, contract.commercialSubline].filter(Boolean).join(" · ") || "Sin dato"}</dd>
                  </div>
                </dl>
              </div>

              <div className="contract-detail-group">
                <span>Condiciones Económicas (Pactado vs. Vigente)</span>
                <dl>
                  <div>
                    <dt>Costo / m² Pactado</dt>
                    <dd>{contract.costPerM2 === null ? "Sin dato" : currencyFormat.format(contract.costPerM2)}</dd>
                  </div>
                  <div>
                    <dt>Costo / m² Vigente</dt>
                    <dd><strong>{contract.costPerM2Vigente === null ? "Sin dato" : currencyFormat.format(contract.costPerM2Vigente)}</strong></dd>
                  </div>
                  <div>
                    <dt>Renta Mensual Pactada</dt>
                    <dd>{contract.monthlyRent === null ? "Sin dato" : currencyFormat.format(contract.monthlyRent)}</dd>
                  </div>
                  <div>
                    <dt>Renta Mensual Vigente</dt>
                    <dd><strong style={{ color: "#00886f" }}>{contract.monthlyRentVigente === null ? "Sin dato" : currencyFormat.format(contract.monthlyRentVigente)}</strong></dd>
                  </div>
                  <div>
                    <dt>% Participación Pactada</dt>
                    <dd>
                      {contract.participationRate === null
                        ? "Sin dato"
                        : percentFormat.format(contract.participationRate)}
                      {contract.participationNotes ? ` · ${contract.participationNotes}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>% Participación Vigente</dt>
                    <dd><strong>{contract.participationRateVigente === null ? "Sin dato" : percentFormat.format(contract.participationRateVigente)}</strong></dd>
                  </div>
                  <div>
                    <dt>Vigencia</dt>
                    <dd>{contract.contractTerm ?? "Sin dato"}</dd>
                  </div>
                </dl>
              </div>

              <div className="contract-detail-group">
                <span>Fechas clave</span>
                <dl>
                  <div>
                    <dt>Firma</dt>
                    <dd>{formatDate(contract.signatureDate)}</dd>
                  </div>
                  <div>
                    <dt>Inicio de operaciones</dt>
                    <dd>{formatDate(contract.operationsStartDate)}</dd>
                  </div>
                  <div>
                    <dt>Renovación</dt>
                    <dd>{formatDate(contract.renewalDate)}</dd>
                  </div>
                  <div>
                    <dt>Días restantes</dt>
                    <dd>{daysLabel(contract.daysRemaining)}</dd>
                  </div>
                </dl>
              </div>

              <div className="contract-detail-group contract-documents">
                <span>Cumplimiento documental</span>
                <div>
                  <DocumentFact label="Garantía de cumplimiento" value={contract.guaranteeStatus} />
                  <DocumentFact label="Póliza de R.C." value={contract.liabilityPolicyStatus} />
                  <DocumentFact label="Proyecto de obra" value={contract.projectStatus} />
                  <DocumentFact label="Estado operativo" value={contract.operationalStatus} />
                </div>
              </div>

              <div className="contract-detail-group contract-related-locals">
                <span>Locales incluidos</span>
                <div>
                  {localsList.map((local, idx) => {
                    const rawNom = String(local.nomenclatura || "").trim();
                    const isNonLocal =
                      !rawNom ||
                      rawNom.toUpperCase() === "N/A" ||
                      rawNom.toUpperCase().includes("SIN LOCAL") ||
                      rawNom === contract.contractNumber;

                    const cardKey = `card-${local.id ?? idx}-${local.nomenclatura ?? idx}`;
                    const isGepContract = contract.gerencia?.toLowerCase().includes("publicit") || contract.contractNumber?.includes("GEP") || contract.sourceSheet?.includes("GEP");
                    return (
                      <article
                        key={cardKey}
                        className={!isNonLocal && onOpenLocal ? "contract-local-clickable-card" : ""}
                        onClick={() => {
                          if (!isNonLocal && onOpenLocal) {
                            onOpenLocal(local.nomenclatura, isGepContract ? "gep" : (local.contractLocationId ?? contract.locationId));
                          }
                        }}
                        style={!isNonLocal && onOpenLocal ? { cursor: "pointer" } : undefined}
                        title={!isNonLocal ? (isGepContract ? `Ver ${local.nomenclatura} en el menú de Publicidad` : `Ver ${local.nomenclatura} en el directorio de locales`) : undefined}
                      >
                        <strong>
                          {isNonLocal ? "Sin local físico asignado" : local.nomenclatura}
                          {!isNonLocal && onOpenLocal && (
                            <span style={{ fontSize: "11px", color: isGepContract ? "#00886f" : "#ac182c", marginLeft: "6px", fontWeight: 600 }}>
                              {isGepContract ? "Ver en Publicidad →" : "Ir a local →"}
                            </span>
                          )}
                        </strong>
                        <small>
                          {local.metraje ? `${numberFormat.format(local.metraje)} m² · ` : ""}
                          {local.areaComercial && local.areaComercial !== "N/A"
                            ? local.areaComercial
                            : (contract.commercialLine || "Servicio comercial")}
                        </small>
                        <span>
                          {local.monthlyRent === null ? "Renta sin dato" : currencyFormat.format(local.monthlyRent)}
                        </span>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="contract-detail-group">
                <span>Origen del registro</span>
                <dl>
                  <div>
                    <dt>Zona comercial</dt>
                    <dd>{contract.locationName}</dd>
                  </div>
                  <div>
                    <dt>Hoja de origen</dt>
                    <dd>{contract.sourceSheet ?? "Relación de zona"}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function ContractRelations({
  records,
  locationName,
  mode = "table",
}: {
  records: LocalRecord[];
  locationName: string;
  mode?: RelationViewMode;
}) {
  const relations = useMemo(
    () =>
      records.filter((record) =>
        Boolean(
          record.contractNumber ||
            record.contractPending ||
            record.contractStatus ||
            record.manager ||
            record.renewalDate,
        ),
      ),
    [records],
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [manager, setManager] = useState("");
  const [page, setPage] = useState(1);
  const statuses = useMemo(
    () => [...new Set(relations.map((record) => record.contractStatus).filter((value): value is string => Boolean(value)))].sort(),
    [relations],
  );
  const managers = useMemo(
    () => [...new Set(relations.map((record) => record.manager ?? "Sin asignar"))].sort(),
    [relations],
  );
  const scopedRelations = useMemo(
    () =>
      mode === "attention"
        ? relations.filter((record) => {
            const days = daysUntil(record.renewalDate);
            return (
              !record.contractNumber ||
              (days !== null && days <= 90) ||
              documentNeedsAttention(record.guaranteeStatus) ||
              documentNeedsAttention(record.liabilityPolicyStatus) ||
              documentNeedsAttention(record.projectStatus)
            );
          })
        : relations,
    [mode, relations],
  );
  const filtered = useMemo(() => {
    const term = normalized(query.trim());
    return scopedRelations.filter((record) => {
      const haystack = [
        record.nomenclatura,
        record.marca,
        record.contractNumber,
        record.commercialLine,
        record.commercialSubline,
        record.manager,
      ].join(" ");
      return (
        (!term || normalized(haystack).includes(term)) &&
        (!status || record.contractStatus === status) &&
        (!manager || (record.manager ?? "Sin asignar") === manager)
      );
    });
  }, [manager, query, scopedRelations, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / RELATION_PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * RELATION_PAGE_SIZE, page * RELATION_PAGE_SIZE);
  const distinctContracts = new Set(relations.map((record) => record.contractNumber).filter(Boolean)).size;
  const totalRent = relations.reduce((sum, record) => sum + (record.monthlyRent ?? 0), 0);
  const pending = relations.filter((record) => !record.contractNumber).length;
  const attention = relations.filter((record) => {
    const days = daysUntil(record.renewalDate);
    return (
      (days !== null && days <= 90) ||
      documentNeedsAttention(record.guaranteeStatus) ||
      documentNeedsAttention(record.liabilityPolicyStatus)
    );
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
      <div className="contract-section-heading">
        <div>
          <span className="section-kicker">{mode === "attention" ? "Seguimiento" : "Cruce operativo"}</span>
          <h2>{mode === "attention" ? "Casos por atender" : "Relación Local–Contrato"}</h2>
          <p>
            {mode === "attention"
              ? "Locales sin número de contrato, con renovación próxima o con documentación pendiente."
              : "Cada fila representa la relación económica y operativa entre un espacio y su expediente contractual."}
          </p>
        </div>
        <span className="contract-zone-pill">{locationName}</span>
      </div>
      <div className="contract-kpi-grid relation-kpis">
        <ContractKpi label="Relaciones" value={relations.length} accent="#09212e" />
        <ContractKpi label="Contratos distintos" value={distinctContracts} accent="#405364" />
        <ContractKpi label="Sin número" value={pending} accent="#8a633f" />
        <ContractKpi label="Requieren atención" value={attention} accent="#ac182c" />
        <article className="contract-kpi">
          <i style={{ background: "#00886f" }} />
          <span>Renta mensual</span>
          <strong className="currency-kpi">{currencyFormat.format(totalRent)}</strong>
          <small>Suma por local</small>
        </article>
      </div>
      <div className="contract-toolbar relation-toolbar">
        <label className="contract-search">
          <span>Buscar local, marca o contrato</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetPage();
            }}
            placeholder="Ej. SENA-07 o farmacia"
          />
        </label>
        <label>
          <span>Situación</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              resetPage();
            }}
          >
            <option value="">Todas</option>
            {statuses.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Gestor</span>
          <select
            value={manager}
            onChange={(event) => {
              setManager(event.target.value);
              resetPage();
            }}
          >
            <option value="">Todos</option>
            {managers.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="contract-result-line">
        <strong>{filtered.length}</strong> {mode === "attention" ? "casos que requieren seguimiento" : "relaciones encontradas"}
      </div>
      {filtered.length ? (
        <div className="contract-table-wrap">
          <table className="contract-table relation-table">
            <thead>
              <tr>
                <th>Local</th>
                <th>Marca / operación</th>
                <th>Contrato</th>
                <th>Costo por m²</th>
                <th>Renta mensual</th>
                <th>Participación</th>
                <th>Renovación</th>
                <th>Cumplimiento</th>
                <th>Gestor</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((record) => {
                const days = daysUntil(record.renewalDate);
                const docsAtRisk =
                  documentNeedsAttention(record.guaranteeStatus) ||
                  documentNeedsAttention(record.liabilityPolicyStatus) ||
                  documentNeedsAttention(record.projectStatus);
                return (
                  <tr key={record.id}>
                    <td>
                      <strong className="nomenclature">{record.nomenclatura}</strong>
                      <small>
                        {numberFormat.format(record.metraje ?? 0)} m² · {record.areaComercial}
                      </small>
                    </td>
                    <td>
                      <strong>{record.marca ?? "Sin marca"}</strong>
                      <small>{record.operationalStatus ?? record.situacion ?? "Sin estado operativo"}</small>
                    </td>
                    <td>
                      <strong className="contract-number">{record.contractNumber ?? "Sin número"}</strong>
                      <small>{record.contractStatus ?? "Sin situación"}</small>
                    </td>
                    <td className="numeric">{record.costPerM2 === null ? "—" : currencyFormat.format(record.costPerM2)}</td>
                    <td className="numeric">
                      <strong>{record.monthlyRent === null ? "—" : currencyFormat.format(record.monthlyRent)}</strong>
                    </td>
                    <td>
                      {record.participationRate === null ? "—" : percentFormat.format(record.participationRate)}
                      {record.participationNotes && <small title={record.participationNotes}>Condición especial</small>}
                    </td>
                    <td>
                      <strong>{formatDate(record.renewalDate)}</strong>
                      <small className={days !== null && days <= 30 ? "critical-text" : ""}>{daysLabel(days)}</small>
                    </td>
                    <td>
                      <span className={`compliance-badge ${docsAtRisk ? "risk" : "ok"}`}>
                        {docsAtRisk ? "Revisar" : "En orden"}
                      </span>
                      <small>{record.projectStatus ?? "Proyecto sin dato"}</small>
                    </td>
                    <td>
                      <strong>{record.manager ?? "Sin asignar"}</strong>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="contract-mode-empty">
          <strong>Sin casos por atender</strong>
          <span>La zona no presenta relaciones con este criterio.</span>
        </div>
      )}
      {filtered.length > 0 && <Pager page={page} totalPages={totalPages} onChange={setPage} />}
    </section>
  );
}

function ContractKpi({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <article className="contract-kpi">
      <i style={{ background: accent }} />
      <span>{label}</span>
      <strong>{numberFormat.format(value)}</strong>
      <small>Expedientes de la zona</small>
    </article>
  );
}

function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  return (
    <div className="pagination contract-pagination">
      <span>
        Página {page} de {totalPages}
      </span>
      <div>
        <button type="button" disabled={page === 1} onClick={() => onChange(page - 1)}>
          Anterior
        </button>
        <button type="button" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
          Siguiente
        </button>
      </div>
    </div>
  );
}

function ContractEmptyState({
  locationName,
  selectedLocationId,
  onSelectLocationId,
  onResetFilters,
}: {
  locationName: string;
  selectedLocationId?: string;
  onSelectLocationId?: (locationId: string) => void;
  onResetFilters?: () => void;
}) {
  return (
    <section className="empty-location contract-zone-empty" style={{ margin: "24px auto", maxWidth: "600px", textAlign: "center", padding: "32px 24px", background: "#ffffff", borderRadius: "12px", border: "1px solid #dfe4e7" }}>
      <span className="empty-location-mark">CTR</span>
      <h2>Sin contratos registrados para esta selección</h2>
      <p>No se encontraron expedientes en {locationName} con los filtros actuales.</p>
      <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "16px", flexWrap: "wrap" }}>
        {onSelectLocationId && selectedLocationId !== "all" && (
          <button
            type="button"
            className="primary-button"
            onClick={() => onSelectLocationId("all")}
          >
            Ver todas las zonas comerciales
          </button>
        )}
        {onResetFilters && (
          <button
            type="button"
            className="secondary-button"
            onClick={onResetFilters}
          >
            Restablecer todos los filtros
          </button>
        )}
      </div>
    </section>
  );
}
