"use client";

import { useMemo, useState, type ReactNode } from "react";
import { locationOptions, type AnalysisTarget, type EtpCommercialCapacityData, type LocalRecord, type PassengerTrafficRecord } from "@/app/types";
import { CommercialCapacityAnalysis, ModuleBcgAnalysisCard } from "./SummaryDashboard";
import ZoneMatrixComparison from "./ZoneMatrixComparison";
import FinanceCenter from "./FinanceCenter";
import { TenantScorecardWrapper } from "./ContractCenter";

export type IntelligenceView =
  | "locals_occupancy"
  | "contracts_validity"
  | "finance_collections"
  | "matrix";

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

function median(values: number[]) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

type MetricHighlight = {
  label: string;
  text: string;
};

type ComparisonBarSpec = {
  leftLabel: string;
  leftValue: number;
  leftFormatted: string;
  rightLabel: string;
  rightValue: number;
  rightFormatted: string;
  gapText?: string;
};

type ZoneAnalysisMetric = {
  id: AnalysisTarget;
  name: string;
  value: string;
  statusBadge?: string;
  statusTone?: "ok" | "watch" | "risk" | "info";
  analysis: string;
  action: string;
  actionPriority?: "Alta" | "Media" | "Baja";
  highlights?: MetricHighlight[];
  comparisonBar?: ComparisonBarSpec;
  detail?: ReactNode;
};

export default function IntelligenceCenter({
  datasets,
  view,
  sourceFile,
  sourceUpdatedAt,
  locationId,
  etpCommercialCapacity,
  passengerTraffic,
  analysisTarget,
  onUpload,
  onChangeView,
  onSelectLocation,
  onOpenLocal,
}: {
  datasets: Dataset;
  view: IntelligenceView;
  sourceFile: string;
  sourceUpdatedAt: string | null;
  locationId: string;
  etpCommercialCapacity: EtpCommercialCapacityData | null;
  passengerTraffic: PassengerTrafficRecord[];
  analysisTarget: AnalysisTarget;
  onUpload: () => void;
  onChangeView: (view: IntelligenceView) => void;
  onSelectLocation?: (locationId: string) => void;
  onOpenLocal?: (nomenclature: string, locationId: string | null) => void;
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
      contracted,
      pendingContract,
      upcomingRenewals,
      expiredRenewals,
      alerts,
      kpis,
    };
  }, [datasets]);
  const [selectedMetricId, setSelectedMetricId] = useState<AnalysisTarget | null>(analysisTarget);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

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

  if (view === "matrix") {
    return (
      <ZoneMatrixComparison
        datasets={datasets}
        onSelectZone={(selectedId) => {
          if (onSelectLocation) onSelectLocation(selectedId);
          onChangeView("locals_occupancy");
        }}
      />
    );
  }

  if (view === "locals_occupancy") {
    const selectedLocation = locationOptions.find((location) => location.id === locationId) ?? locationOptions[0];
    const selectedRecords = datasets[selectedLocation.id] ?? [];
    const availableRecords = selectedRecords.filter((record) => record.estatus === "DISPONIBLE");
    const operatingRecords = selectedRecords.filter((record) => record.estatus === "EN FUNCIONAMIENTO");
    const availableCount = availableRecords.length;
    const availableArea = availableRecords.reduce((sum, record) => sum + (record.metraje ?? 0), 0);
    const totalArea = selectedRecords.reduce((sum, record) => sum + (record.metraje ?? 0), 0);
    const recordedAreas = selectedRecords.map((record) => record.metraje).filter((value): value is number => value !== null && value > 0);
    const generalAverage = recordedAreas.length ? recordedAreas.reduce((sum, value) => sum + value, 0) / recordedAreas.length : null;
    const generalMedian = median(recordedAreas);
    const averageMedianGap = generalAverage !== null && generalMedian !== null && generalMedian > 0 ? (generalAverage / generalMedian - 1) * 100 : null;
    const operatingAreas = operatingRecords.map((record) => record.metraje).filter((value): value is number => value !== null && value > 0);
    const availableAreas = availableRecords.map((record) => record.metraje).filter((value): value is number => value !== null && value > 0);
    const operatingAverage = operatingAreas.length ? operatingAreas.reduce((sum, value) => sum + value, 0) / operatingAreas.length : null;
    const availableAverage = availableAreas.length ? availableAreas.reduce((sum, value) => sum + value, 0) / availableAreas.length : null;
    const availableMedian = median(availableAreas);
    const formatRatio = operatingAverage && availableAverage ? availableAverage / operatingAverage : null;
    const availableToGeneralRatio = generalAverage && availableAverage ? availableAverage / generalAverage : null;
    const availableToMedianRatio = generalMedian && availableAverage ? availableAverage / generalMedian : null;
    const validBrandedRecords = selectedRecords.filter((record) => {
      const brand = normalized(record.marca).trim();
      return brand && !["n/a", "na", "sin marca", "por definir", "ninguno", "-", "pendiente"].includes(brand);
    });
    const brandsByArea = new Map<string, { label: string; area: number }>();
    validBrandedRecords.forEach((record) => {
      const id = normalized(record.marca).trim();
      const current = brandsByArea.get(id) ?? { label: record.marca!.trim(), area: 0 };
      current.area += record.metraje ?? 0;
      brandsByArea.set(id, current);
    });
    const topThreeBrands = [...brandsByArea.values()].sort((a, b) => b.area - a.area).slice(0, 3);
    const topThreeArea = topThreeBrands.reduce((sum, brand) => sum + brand.area, 0);
    const topThreeShare = totalArea > 0 && topThreeBrands.length ? topThreeArea / totalArea * 100 : null;
    const topThreeRemainingShare = topThreeShare === null ? null : Math.max(100 - topThreeShare, 0);
    const averageTopThreeShare = topThreeShare === null || !topThreeBrands.length ? null : topThreeShare / topThreeBrands.length;
    const topThreeBrandIds = new Set(topThreeBrands.map((brand) => normalized(brand.label).trim()));
    const operatingRecordsWithRent = operatingRecords.filter((record) => record.monthlyRent !== null && record.monthlyRent > 0);
    const knownOperatingRent = operatingRecordsWithRent.reduce((sum, record) => sum + record.monthlyRent!, 0);
    const topThreeKnownRent = operatingRecordsWithRent.filter((record) => topThreeBrandIds.has(normalized(record.marca).trim())).reduce((sum, record) => sum + record.monthlyRent!, 0);
    const topThreeRentShare = knownOperatingRent > 0 ? topThreeKnownRent / knownOperatingRent * 100 : null;
    const knownRentCoverage = operatingRecords.length ? operatingRecordsWithRent.length / operatingRecords.length * 100 : null;
    const operatingBrands = new Set(validBrandedRecords.filter((record) => record.estatus === "EN FUNCIONAMIENTO").map((record) => normalized(record.marca).trim()));
    const brandLocationCounts = new Map<string, { label: string; count: number }>();
    validBrandedRecords.forEach((record) => {
      const id = normalized(record.marca).trim();
      const current = brandLocationCounts.get(id) ?? { label: record.marca!.trim(), count: 0 };
      current.count += 1;
      brandLocationCounts.set(id, current);
    });
    const multiLocationRatio = brandLocationCounts.size ? validBrandedRecords.length / brandLocationCounts.size : null;
    const multiLocationLeaders = [...brandLocationCounts.values()].filter((brand) => brand.count > 1).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es-MX")).slice(0, 3);
    const operatingBrandedRecords = validBrandedRecords.filter((record) => record.estatus === "EN FUNCIONAMIENTO");
    const operatingMultiLocationRatio = operatingBrands.size ? operatingBrandedRecords.length / operatingBrands.size : null;
    const giroGroups = new Map<string, number>();
    selectedRecords.forEach((record) => {
      const giro = String(record.giroOperativo || "Sin giro identificado").trim() || "Sin giro identificado";
      giroGroups.set(giro, (giroGroups.get(giro) ?? 0) + 1);
    });
    const leadingGiros = [...giroGroups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const leadingGiroShare = selectedRecords.length ? leadingGiros.slice(0, 2).reduce((sum, [, count]) => sum + count, 0) / selectedRecords.length * 100 : null;
    const vacancyZones = new Map<string, { count: number; area: number }>();
    availableRecords.forEach((record) => {
      const zone = record.lado || record.area || record.modulo || "Sin zona";
      const current = vacancyZones.get(zone) ?? { count: 0, area: 0 };
      current.count += 1;
      current.area += record.metraje ?? 0;
      vacancyZones.set(zone, current);
    });
    const rankedVacancyZones = [...vacancyZones.entries()].sort((a, b) => b[1].area - a[1].area || b[1].count - a[1].count);
    const leadingVacancyZone = rankedVacancyZones[0] ?? null;
    const leadingVacancyShare = leadingVacancyZone && availableArea > 0 ? leadingVacancyZone[1].area / availableArea * 100 : null;
    const vacancyLevels = new Map<string, number>();
    availableRecords.forEach((record) => {
      const level = String(record.nivel ?? "Sin nivel").trim() || "Sin nivel";
      vacancyLevels.set(level, (vacancyLevels.get(level) ?? 0) + 1);
    });
    const leadingVacancyLevel = [...vacancyLevels.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
    const largestVacancy = [...availableRecords]
      .filter((record) => record.metraje !== null && record.metraje > 0)
      .sort((a, b) => (b.metraje ?? 0) - (a.metraje ?? 0))[0] ?? null;

    const recordsByModule = new Map<string, LocalRecord[]>();
    selectedRecords.forEach((record) => {
      const moduleName = String(record.modulo || "Sin dato").trim() || "Sin dato";
      recordsByModule.set(moduleName, [...(recordsByModule.get(moduleName) ?? []), record]);
    });
    const moduleDistribution = [...recordsByModule.entries()]
      .filter(([moduleName]) => moduleName !== "Sin dato")
      .map(([moduleName, moduleRecords]) => ({ moduleName, count: moduleRecords.length, records: moduleRecords }))
      .sort((a, b) => b.count - a.count || a.moduleName.localeCompare(b.moduleName, "es-MX", { numeric: true }));
    const leadingModule = moduleDistribution[0] ?? null;
    const topModuleShare = leadingModule && selectedRecords.length ? leadingModule.count / selectedRecords.length * 100 : null;
    const topThreeModuleShare = selectedRecords.length
      ? moduleDistribution.slice(0, 3).reduce((sum, item) => sum + item.count, 0) / selectedRecords.length * 100
      : null;
    const modulePerformanceBase = moduleDistribution.map((module) => {
      const operatingModuleRecords = module.records.filter((record) => record.estatus === "EN FUNCIONAMIENTO");
      const rentRecords = operatingModuleRecords.filter((record) => record.monthlyRent !== null && record.monthlyRent > 0 && record.metraje !== null && record.metraje > 0);
      const monthlyRent = rentRecords.reduce((sum, record) => sum + (record.monthlyRent ?? 0), 0);
      const rentArea = rentRecords.reduce((sum, record) => sum + (record.metraje ?? 0), 0);
      return {
        ...module,
        monthlyRent,
        occupancy: module.count ? operatingModuleRecords.length / module.count * 100 : 0,
        rentPerM2: rentArea > 0 ? monthlyRent / rentArea : null,
        knownRents: rentRecords.length,
      };
    }).filter((module) => module.knownRents > 0 && module.rentPerM2 !== null);
    const moduleMedianOccupancy = median(modulePerformanceBase.map((module) => module.occupancy));
    const moduleMedianRentPerM2 = median(modulePerformanceBase.map((module) => module.rentPerM2).filter((value): value is number => value !== null));
    const modulePerformance = modulePerformanceBase.map((module) => {
      const highOccupancy = moduleMedianOccupancy !== null && module.occupancy >= moduleMedianOccupancy;
      const highRent = moduleMedianRentPerM2 !== null && (module.rentPerM2 ?? 0) >= moduleMedianRentPerM2;
      return { ...module, category: highOccupancy ? highRent ? "star" : "potential" : highRent ? "risk" : "attention" };
    });
    const starModule = [...modulePerformance].filter((module) => module.category === "star").sort((a, b) => b.monthlyRent - a.monthlyRent)[0] ?? null;
    const attentionModule = [...modulePerformance].filter((module) => module.category === "attention").sort((a, b) => a.occupancy - b.occupancy || a.monthlyRent - b.monthlyRent)[0] ?? null;
    const vacancyPriorityModule = moduleDistribution.map((module) => {
      const vacancies = module.records.filter((record) => record.estatus === "DISPONIBLE");
      return { moduleName: module.moduleName, count: vacancies.length, area: vacancies.reduce((sum, record) => sum + (record.metraje ?? 0), 0) };
    }).filter((module) => module.count > 0).sort((a, b) => b.area - a.area || b.count - a.count)[0] ?? null;
    const moduleFinancialCoverage = operatingRecords.length ? operatingRecordsWithRent.length / operatingRecords.length * 100 : null;

    const recordsByLevel = new Map<string, LocalRecord[]>();
    selectedRecords.forEach((record) => {
      const level = String(record.nivel ?? "Sin dato").trim() || "Sin dato";
      recordsByLevel.set(level, [...(recordsByLevel.get(level) ?? []), record]);
    });
    const levelDistribution = [...recordsByLevel.entries()]
      .filter(([level]) => level !== "Sin dato")
      .map(([level, levelRecords]) => ({ level, count: levelRecords.length, records: levelRecords }))
      .sort((a, b) => b.count - a.count || a.level.localeCompare(b.level, "es-MX", { numeric: true }));
    const leadingLevel = levelDistribution[0] ?? null;
    const focusLevel = levelDistribution.find((item) => Number(item.level) === 0) ?? leadingLevel;
    const focusLevelArea = focusLevel?.records.reduce((sum, record) => sum + (record.metraje ?? 0), 0) ?? 0;
    const focusLevelAvailable = focusLevel?.records.filter((record) => record.estatus === "DISPONIBLE") ?? [];
    const focusLevelAvailableArea = focusLevelAvailable.reduce((sum, record) => sum + (record.metraje ?? 0), 0);
    const focusLevelOperating = focusLevel?.records.filter((record) => record.estatus === "EN FUNCIONAMIENTO").length ?? 0;
    const focusLevelShare = focusLevel && selectedRecords.length ? focusLevel.count / selectedRecords.length * 100 : null;
    const focusLevelAreaShare = focusLevel && totalArea > 0 ? focusLevelArea / totalArea * 100 : null;
    const focusLevelVacancyRate = focusLevel?.count ? focusLevelAvailable.length / focusLevel.count * 100 : null;
    const focusLevelOperatingRate = focusLevel?.count ? focusLevelOperating / focusLevel.count * 100 : null;
    const focusLevelAvailableAverage = focusLevelAvailable.length ? focusLevelAvailableArea / focusLevelAvailable.length : null;

    const recordsByAreaType = new Map<string, LocalRecord[]>();
    selectedRecords.forEach((record) => {
      const areaType = String(record.area || "Sin dato").trim() || "Sin dato";
      recordsByAreaType.set(areaType, [...(recordsByAreaType.get(areaType) ?? []), record]);
    });
    const areaTypeDistribution = [...recordsByAreaType.entries()]
      .filter(([areaType]) => areaType !== "Sin dato")
      .map(([areaType, areaRecords]) => ({ areaType, count: areaRecords.length, records: areaRecords }))
      .sort((a, b) => b.count - a.count || a.areaType.localeCompare(b.areaType, "es-MX"));
    const leadingAreaType = areaTypeDistribution[0] ?? null;
    const focusAreaType = areaTypeDistribution.find((item) => normalized(item.areaType).includes("esteril")) ?? leadingAreaType;
    const focusAreaTotalArea = focusAreaType?.records.reduce((sum, record) => sum + (record.metraje ?? 0), 0) ?? 0;
    const focusAreaAvailable = focusAreaType?.records.filter((record) => record.estatus === "DISPONIBLE") ?? [];
    const focusAreaAvailableArea = focusAreaAvailable.reduce((sum, record) => sum + (record.metraje ?? 0), 0);
    const focusAreaOperating = focusAreaType?.records.filter((record) => record.estatus === "EN FUNCIONAMIENTO") ?? [];
    const focusAreaShare = focusAreaType && selectedRecords.length ? focusAreaType.count / selectedRecords.length * 100 : null;
    const focusAreaOccupancy = focusAreaType?.count ? focusAreaOperating.length / focusAreaType.count * 100 : null;
    const focusAreaVacancyRate = focusAreaType?.count ? focusAreaAvailable.length / focusAreaType.count * 100 : null;
    const focusAreaVacancyShare = availableArea > 0 ? focusAreaAvailableArea / availableArea * 100 : null;
    const focusAreaBrands = new Set(focusAreaOperating.map((record) => normalized(record.marca).trim()).filter((brand) => brand && !["n/a", "na", "sin marca", "por definir", "ninguno", "-", "pendiente"].includes(brand)));
    const focusAreaGiros = new Set(focusAreaOperating.map((record) => String(record.giroOperativo ?? "").trim()).filter(Boolean));
    const years = [...new Set(passengerTraffic.map((record) => record.year))].sort((a, b) => a - b);
    const currentTrafficYear = years.at(-1) ?? null;
    const currentTrafficRecords = currentTrafficYear === null ? [] : passengerTraffic.filter((record) => record.year === currentTrafficYear && record.status === "real");
    const currentTrafficTotal = currentTrafficRecords.reduce((sum, record) => sum + record.passengers, 0);
    const projectedPassengers = currentTrafficRecords.length ? Math.round(currentTrafficTotal / currentTrafficRecords.length * 12) : null;
    const capacityUsage = etpCommercialCapacity?.commercialPassengerCapacity && projectedPassengers !== null ? projectedPassengers / etpCommercialCapacity.commercialPassengerCapacity * 100 : null;

    const metrics: ZoneAnalysisMetric[] = [
      {
        id: "average",
        name: "Promedio general",
        value: generalAverage === null ? "Sin dato" : `${numberFormat.format(generalAverage)} m²`,
        statusBadge: "Dimensión Global",
        statusTone: "info",
        analysis: generalAverage === null || generalMedian === null
          ? "No existen metrajes suficientes para calcular y explicar el tamaño promedio del inventario."
          : `El tamaño promedio de los espacios es de ${numberFormat.format(generalAverage)} m², frente a una mediana de ${numberFormat.format(generalMedian)} m². ${averageMedianGap !== null && averageMedianGap > 25 ? `La media es ${numberFormat.format(averageMedianGap)}% mayor que la mediana, señal de que algunos locales de gran formato elevan el promedio y que el espacio habitual es más compacto de lo que sugiere la media.` : "La cercanía entre promedio y mediana indica una distribución relativamente uniforme de formatos."} ${multiLocationRatio === null ? "No fue posible cruzarlo con el Ratio multi-ubicación." : `Al cruzarlo con el Ratio multi-ubicación de ${numberFormat.format(multiLocationRatio)} locales por marca, el resultado es compatible con una oferta fragmentada en la que algunos operadores requieren más de una ubicación para reunir escala; la base no confirma que esos espacios sean contiguos.`} ${topThreeShare === null ? "No fue posible cruzarlo con la concentración por superficie." : `La Concentración Top 3 de ${numberFormat.format(topThreeShare)}% confirma que la superficie no está dominada por pocos ocupantes.`}`,
        action: generalAverage !== null && generalMedian !== null && generalAverage / generalMedian > 1.5 ? "Planear conceptos compactos con la mediana y mapear espacios unificables para giros que requieran mayor infraestructura." : "Usar el promedio como referencia de formato y segmentar la colocación según requerimientos operativos.",
        actionPriority: "Media",
      },
      {
        id: "median",
        name: "Mediana general",
        value: generalMedian === null ? "Sin dato" : `${numberFormat.format(generalMedian)} m²`,
        statusBadge: "Formato Estándar",
        statusTone: "ok",
        comparisonBar: {
          leftLabel: "Mediana General (Punto Medio)",
          leftValue: generalMedian ?? 0,
          leftFormatted: generalMedian === null ? "Sin dato" : `${numberFormat.format(generalMedian)} m²`,
          rightLabel: "Promedio General (Con Macrolocales)",
          rightValue: generalAverage ?? 0,
          rightFormatted: generalAverage === null ? "Sin dato" : `${numberFormat.format(generalAverage)} m²`,
          gapText: averageMedianGap !== null && averageMedianGap > 0
            ? `El promedio supera a la mediana por +${numberFormat.format(averageMedianGap)}% debido al peso de los macrolocales.`
            : "El promedio y la mediana se mantienen en niveles equivalentes.",
        },
        highlights: [
          {
            label: "🎯 Formato Base del Layout",
            text: `La mediana (${generalMedian === null ? "N/D" : `${numberFormat.format(generalMedian)} m²`}) divide exactamente el inventario en dos mitades y constituye la referencia más confiable y libre de distorsión para definir el local típico.`,
          },
          {
            label: "⚖️ Sesgo por Macrolocales",
            text: `El promedio (${generalAverage === null ? "N/D" : `${numberFormat.format(generalAverage)} m²`}) está inflado por macrolocales atípicos de gran escala, los cuales no reflejan el tamaño cotidiano al que aspiran la mayoría de los giros.`,
          },
          {
            label: "💡 Recomendación de Asignación",
            text: "Diseñar la prospección comercial basándose en el tamaño mediano y reservar la oferta de múltiples módulos unidos solo para operadores de alta escala.",
          },
        ],
        analysis: generalMedian === null || generalAverage === null
          ? "No existen metrajes suficientes para identificar el tamaño típico del inventario."
          : `La mediana es de ${numberFormat.format(generalMedian)} m²: la mitad de los espacios registrados mide hasta ese valor y la otra mitad lo supera. El promedio de ${numberFormat.format(generalAverage)} m²${averageMedianGap === null ? "" : ` es ${numberFormat.format(Math.abs(averageMedianGap))}% mayor`}, por lo que los macrolocales elevan la media y no representan el formato cotidiano del layout. ${multiLocationRatio === null ? "No fue posible medir la relación con las ubicaciones por marca." : `El Ratio multi-ubicación de ${numberFormat.format(multiLocationRatio)} es coherente con que marcas de mayor requerimiento utilicen más de un espacio para alcanzar escala operativa, aunque la base no demuestra unificación física.`} ${topThreeShare === null ? "" : `Aun con espacios grandes, el Top 3 concentra solo ${numberFormat.format(topThreeShare)}% de la superficie, por lo que esos formatos no generan dependencia de pocas marcas.`}`,
        action: "Usar la mediana como formato base para prospección y detectar espacios adyacentes que puedan ofrecerse juntos a giros de mayor escala.",
        actionPriority: "Media",
      },
      {
        id: "format",
        name: "Promedio disponible",
        value: availableAverage === null ? "Sin dato" : `${numberFormat.format(availableAverage)} m²`,
        statusBadge: formatRatio && formatRatio > 1.35 ? "Descalce de Escala" : "Formato Adecuado",
        statusTone: formatRatio && formatRatio > 1.35 ? "watch" : "ok",
        analysis: formatRatio === null || availableAverage === null || operatingAverage === null
          ? "Faltan metrajes suficientes para comparar el formato disponible con el que ya opera."
          : `Los ${integerFormat.format(availableAreas.length)} espacios disponibles con metraje registrado promedian ${numberFormat.format(availableAverage)} m²${availableMedian === null ? "" : ` y tienen una mediana de ${numberFormat.format(availableMedian)} m²`}. El formato vacante es ${numberFormat.format(formatRatio)} veces el promedio operativo de ${numberFormat.format(operatingAverage)} m²${availableToGeneralRatio === null || availableToMedianRatio === null ? "" : `, ${numberFormat.format(availableToGeneralRatio)} veces el promedio general y ${numberFormat.format(availableToMedianRatio)} veces la mediana general`}. ${formatRatio > 1.35 ? "La brecha muestra que el inventario pendiente de colocación es estructuralmente más amplio que el formato que ya opera; el reto principal es de escala y perfil de prospecto, no de cantidad de módulos compactos." : "El tamaño disponible es comparable con el formato que ya opera, por lo que la barrera de colocación debe buscarse en ubicación, giro, condiciones comerciales o adecuaciones."}`,
        action: formatRatio !== null && formatRatio > 1.35
          ? "Prospectar operadores de gran formato y evaluar la viabilidad técnica y financiera de subdividir los espacios más amplios."
          : "Priorizar ubicación, giro y condiciones comerciales antes de modificar la superficie disponible.",
        actionPriority: formatRatio && formatRatio > 1.35 ? "Alta" : "Baja",
      },
      {
        id: "top3",
        name: "Concentración Top 3",
        value: topThreeShare === null ? "Sin dato" : `${numberFormat.format(topThreeShare)}%`,
        statusBadge: topThreeShare && topThreeShare > 40 ? "Riesgo Alto" : topThreeShare && topThreeShare > 20 ? "En Seguimiento" : "Diversificado",
        statusTone: topThreeShare && topThreeShare > 40 ? "risk" : topThreeShare && topThreeShare > 20 ? "watch" : "ok",
        analysis: topThreeShare === null || topThreeRemainingShare === null || averageTopThreeShare === null
          ? "No existe superficie y marca suficientes para medir la concentración de los principales ocupantes."
          : `${topThreeShare <= 20 ? "El indicador muestra una alta diversificación y una baja dependencia espacial de las principales marcas." : topThreeShare <= 40 ? "El indicador muestra una concentración espacial moderada que requiere seguimiento." : "El indicador muestra una concentración espacial alta y una dependencia relevante de los principales ocupantes."} ${topThreeBrands.map((brand) => `${brand.label} ocupa ${numberFormat.format(brand.area)} m²`).join("; ")}. En conjunto representan ${numberFormat.format(topThreeArea)} de ${numberFormat.format(totalArea)} m², equivalentes al ${numberFormat.format(topThreeShare)}%; el ${numberFormat.format(topThreeRemainingShare)}% restante se distribuye entre las demás marcas y espacios. La exposición promedio del Top 3 equivale al ${numberFormat.format(averageTopThreeShare)}% por marca, aunque la participación individual varía. ${topThreeShare <= 20 ? "Esta distribución reduce el riesgo de que la salida de un solo operador genere una vacancia extensa y conserva flexibilidad para reconfigurar locales o incorporar nuevos conceptos." : "La salida de una de estas marcas podría generar una afectación visible en la ocupación y exige seguimiento individual."} ${topThreeRentShare === null || knownRentCoverage === null ? "El resultado mide concentración por superficie; la base todavía no permite confirmar la concentración financiera." : `Al cruzarlo con la renta mensual registrada, estas marcas aportan ${numberFormat.format(topThreeRentShare)}% de la renta operativa identificada, con una cobertura de datos de ${numberFormat.format(knownRentCoverage)}%. ${topThreeRentShare > 40 ? "La diversificación espacial no elimina una posible dependencia financiera." : "El cruce no muestra una dependencia financiera alta en la información disponible."}`}`,
        action: topThreeShare === null
          ? "Completar marca y metraje antes de evaluar la concentración."
          : topThreeRentShare !== null && topThreeRentShare > 40
            ? "Mantener la diversificación espacial y revisar vigencia, renta y renovación de las tres marcas principales."
            : topThreeShare > 40
              ? "Reducir exposición en nuevas asignaciones y revisar la continuidad de las tres marcas principales."
              : "Mantener la diversificación y monitorear la renovación de las tres marcas principales.",
        actionPriority: topThreeShare && topThreeShare > 40 ? "Alta" : "Media",
      },
      {
        id: "brands",
        name: "Marcas operando",
        value: integerFormat.format(operatingBrands.size),
        statusBadge: "Oferta Activa",
        statusTone: "ok",
        analysis: operatingBrands.size
          ? `${integerFormat.format(operatingBrands.size)} marcas únicas operan en ${integerFormat.format(operatingBrandedRecords.length)} locales con marca identificada. Esto equivale a ${operatingMultiLocationRatio === null ? "una relación pendiente de cálculo" : `${numberFormat.format(operatingMultiLocationRatio)} ubicaciones operativas por marca`}, por lo que la amplitud de oferta convive con operadores de presencia múltiple. ${topThreeShare === null ? "No fue posible medir la exposición por superficie." : `La Concentración Top 3 de ${numberFormat.format(topThreeShare)}% ${topThreeShare <= 20 ? "mantiene baja la dependencia espacial de los principales ocupantes" : topThreeShare <= 40 ? "muestra una dependencia espacial moderada" : "señala una dependencia espacial alta"}.`} El conteo confirma diversidad de operadores, pero no demuestra por sí solo variedad suficiente de giros ni diversificación de ingresos; esas conclusiones requieren cruzar Tenant Mix y renta registrada.`
          : "No existen marcas en funcionamiento suficientemente identificadas para medir la diversidad operativa.",
        action: operatingBrands.size ? "Conservar la diversidad y dirigir las vacantes a giros o conceptos subrepresentados, vigilando la exposición acumulada por grupo comercial." : "Completar marca y estatus antes de evaluar diversidad.",
        actionPriority: "Baja",
      },
      {
        id: "multi_location",
        name: "Ratio multi-ubicación",
        value: multiLocationRatio === null ? "Sin dato" : `${numberFormat.format(multiLocationRatio)} locales`,
        statusBadge: multiLocationRatio && multiLocationRatio >= 1.5 ? "Expansión Alta" : "Ubicación Única",
        statusTone: "info",
        analysis: multiLocationRatio === null
          ? "No existen marcas suficientes para calcular cuántos locales concentra cada operador."
          : `El inventario registra ${integerFormat.format(validBrandedRecords.length)} locales asociados con ${integerFormat.format(brandLocationCounts.size)} marcas, equivalentes a ${numberFormat.format(multiLocationRatio)} locales por marca. ${multiLocationLeaders.length ? `Las mayores presencias corresponden a ${multiLocationLeaders.map((brand) => `${brand.label}, con ${integerFormat.format(brand.count)} locales`).join("; ")}.` : "La presencia se mantiene principalmente en una ubicación por marca."} ${operatingMultiLocationRatio === null ? "La base no permite separar todavía la expansión registrada de la operación efectiva." : `Considerando únicamente locales en funcionamiento, el ratio es de ${numberFormat.format(operatingMultiLocationRatio)} por marca operativa.`} ${multiLocationRatio >= 1.5 ? "El resultado es una señal de continuidad y expansión de socios comerciales, aunque por sí solo no demuestra rentabilidad: debe validarse con renta, cumplimiento contractual y desempeño operativo." : "El resultado muestra una estrategia predominantemente de ubicación única, con espacio para expansiones selectivas de operadores probados."} ${topThreeShare === null ? "No fue posible cruzar el resultado con la concentración por superficie." : `Al cruzarlo con Concentración Top 3 de ${numberFormat.format(topThreeShare)}%, ${topThreeShare <= 20 ? "la expansión multi-ubicación está distribuida y no genera dependencia espacial de pocas marcas" : topThreeShare <= 40 ? "la expansión mantiene una concentración moderada que debe vigilarse" : "la expansión se combina con una concentración alta y aumenta la dependencia de los principales ocupantes"}.`} La relación con menos interlocutores puede simplificar el seguimiento comercial y la cobranza, pero exige controles consolidados por marca para no ocultar exposición acumulada.`,
        action: multiLocationRatio === null
          ? "Completar marcas y ubicaciones antes de evaluar expansión comercial."
          : topThreeShare !== null && topThreeShare > 40
            ? "Condicionar nuevas expansiones a que no aumenten la concentración de las marcas principales."
            : multiLocationRatio >= 1.5
              ? "Priorizar expansiones de marcas con renta, cumplimiento y operación comprobados, manteniendo baja la Concentración Top 3."
              : "Identificar marcas de buen desempeño para una segunda ubicación controlada.",
        actionPriority: "Media",
      },
      {
        id: "mix",
        name: "Giro comercial",
        value: leadingGiroShare === null ? "Sin dato" : `${numberFormat.format(leadingGiroShare)}%`,
        statusBadge: leadingGiroShare && leadingGiroShare >= 70 ? "Concentrado" : "Equilibrado",
        statusTone: leadingGiroShare && leadingGiroShare >= 70 ? "watch" : "ok",
        analysis: leadingGiroShare === null
          ? "No hay giros suficientes para evaluar la mezcla comercial."
          : `La selección reúne ${integerFormat.format(selectedRecords.length)} espacios y sus giros principales son ${leadingGiros.map(([label, count]) => `${label}, con ${integerFormat.format(count)} locales (${numberFormat.format(selectedRecords.length ? count / selectedRecords.length * 100 : 0)}%)`).join("; ")}. Los dos giros de mayor presencia concentran ${numberFormat.format(leadingGiroShare)}% del inventario. ${leadingGiroShare >= 70 ? "La mezcla está fuertemente orientada a sus categorías principales: asegura profundidad de oferta, pero aumenta el riesgo de repetición y hace más valiosas las próximas asignaciones en servicios o conceptos faltantes." : leadingGiroShare >= 50 ? "La mezcla tiene un núcleo comercial claro sin absorber por completo el inventario, lo que deja margen para fortalecer categorías subrepresentadas." : "La distribución es amplia y no muestra dependencia excesiva de dos categorías."} Esta métrica describe el diseño del Tenant Mix; ventas y gasto por pasajero son necesarios para confirmar qué giros generan mayor impacto económico.`,
        action: leadingGiroShare !== null && leadingGiroShare >= 70 ? "Reservar las próximas asignaciones para giros faltantes o conceptos diferenciados y controlar duplicidades en las categorías dominantes." : "Conservar el equilibrio y validar cada nuevo giro contra la oferta existente y las necesidades del pasajero.",
        actionPriority: "Media",
      },
      {
        id: "levels",
        name: "Locales por nivel",
        value: focusLevel && focusLevelShare !== null ? `Nivel ${focusLevel.level} · ${numberFormat.format(focusLevelShare)}%` : "Sin dato",
        statusBadge: "Zonificación Vertical",
        statusTone: "info",
        analysis: !levelDistribution.length || !focusLevel
          ? "No hay niveles identificados para construir la distribución vertical del inventario."
          : `La implantación vertical se distribuye en ${levelDistribution.map((item) => `nivel ${item.level}: ${integerFormat.format(item.count)} locales (${numberFormat.format(selectedRecords.length ? item.count / selectedRecords.length * 100 : 0)}%)`).join("; ")}. ${leadingLevel ? `El nivel ${leadingLevel.level} es el principal polo por volumen, con ${integerFormat.format(leadingLevel.count)} espacios.` : ""} Al profundizar en el nivel ${focusLevel.level}, este reúne ${integerFormat.format(focusLevel.count)} locales (${numberFormat.format(focusLevelShare ?? 0)}% del inventario) y ${numberFormat.format(focusLevelArea)} m² (${numberFormat.format(focusLevelAreaShare ?? 0)}% de la superficie). Registra ${integerFormat.format(focusLevelOperating)} locales en funcionamiento (${numberFormat.format(focusLevelOperatingRate ?? 0)}%) y ${integerFormat.format(focusLevelAvailable.length)} disponibles (${numberFormat.format(focusLevelVacancyRate ?? 0)}%), que suman ${numberFormat.format(focusLevelAvailableArea)} m²${focusLevelAvailableAverage === null ? "" : ` con un promedio de ${numberFormat.format(focusLevelAvailableAverage)} m² por vacante`}. ${focusLevelAvailableAverage !== null && generalMedian !== null ? focusLevelAvailableAverage <= generalMedian * 1.35 ? `El formato disponible es cercano a la mediana general de ${numberFormat.format(generalMedian)} m², por lo que no presenta una barrera evidente de escala.` : `El formato disponible supera claramente la mediana general de ${numberFormat.format(generalMedian)} m² y requiere prospectos de mayor escala o evaluación de subdivisión.` : ""} La base permite medir inventario y estatus, pero no confirma el flujo de pasajeros ni la velocidad de colocación de este nivel.`,
        action: !focusLevelAvailable.length
          ? `Conservar la mezcla y vigilar renovaciones en el nivel ${focusLevel.level}; no requiere una campaña de colocación inmediata.`
          : focusLevelAvailableAverage !== null && generalMedian !== null && focusLevelAvailableAverage <= generalMedian * 1.35
            ? `Concentrar la prospección de formatos compactos en el nivel ${focusLevel.level} y validar los giros contra su flujo real, accesibilidad y oferta existente.`
            : `Buscar operadores de mayor formato para el nivel ${focusLevel.level} y evaluar técnicamente la subdivisión de sus vacantes más amplias.`,
        actionPriority: "Baja",
      },
      {
        id: "area_type",
        name: "Tipo de área",
        value: focusAreaType && focusAreaShare !== null ? `${focusAreaType.areaType} · ${numberFormat.format(focusAreaShare)}%` : "Sin dato",
        statusBadge: "Distribución Operativa",
        statusTone: "info",
        analysis: !areaTypeDistribution.length || !focusAreaType
          ? "No existen tipos de área identificados para comparar la implantación operativa."
          : `La distribución operativa registra ${areaTypeDistribution.map((item) => `${item.areaType}: ${integerFormat.format(item.count)} locales (${numberFormat.format(selectedRecords.length ? item.count / selectedRecords.length * 100 : 0)}%)`).join("; ")}. ${focusAreaType.areaType} concentra ${integerFormat.format(focusAreaType.count)} espacios, ${numberFormat.format(focusAreaTotalArea)} m² y ${integerFormat.format(focusAreaBrands.size)} marcas en funcionamiento. Su ocupación operativa es de ${numberFormat.format(focusAreaOccupancy ?? 0)}% y su tasa de vacancia es de ${numberFormat.format(focusAreaVacancyRate ?? 0)}%; ${integerFormat.format(focusAreaAvailable.length)} vacantes suman ${numberFormat.format(focusAreaAvailableArea)} m² y representan ${numberFormat.format(focusAreaVacancyShare ?? 0)}% de toda la superficie disponible. La oferta operativa identificada abarca ${integerFormat.format(focusAreaGiros.size)} giros. ${focusAreaVacancyShare !== null && focusAreaVacancyShare >= 50 ? "La mayor parte de la oportunidad espacial está concentrada en esta área, por lo que una intervención focalizada tendría el mayor alcance sobre la vacancia total." : "La vacancia no depende mayoritariamente de esta área y requiere una estrategia distribuida."} Estar en un área de acceso controlado o público no demuestra por sí solo mayor tráfico, ticket ni rentabilidad; esos supuestos deben validarse con aforo y ventas.`,
        action: focusAreaVacancyShare !== null && focusAreaVacancyShare >= 50
          ? `Priorizar la colocación en ${focusAreaType.areaType}, segmentando las vacantes por tamaño y giro, y validar la estrategia con aforo, permanencia y ventas antes de fijar metas de retorno.`
          : "Distribuir la prospección entre los tipos de área según vacancia, tamaño y giros faltantes, sin concentrar todo el esfuerzo en una sola zona operativa.",
        actionPriority: "Media",
      },
      {
        id: "modules",
        name: "Locales por módulo",
        value: leadingModule && topModuleShare !== null ? `${leadingModule.moduleName} · ${numberFormat.format(topModuleShare)}%` : "Sin dato",
        statusBadge: "Matriz Física",
        statusTone: "info",
        analysis: !moduleDistribution.length
          ? "No hay módulos identificados para construir la distribución física y su matriz de desempeño."
          : `La selección contiene ${integerFormat.format(moduleDistribution.length)} módulos identificados. ${leadingModule === null || topThreeModuleShare === null ? "No fue posible identificar los bloques con mayor inventario." : `${leadingModule.moduleName} encabeza la distribución con ${integerFormat.format(leadingModule.count)} locales (${numberFormat.format(topModuleShare ?? 0)}%); los tres módulos más densos —${moduleDistribution.slice(0, 3).map((module) => `${module.moduleName} (${integerFormat.format(module.count)})`).join(", ")}— reúnen ${numberFormat.format(topThreeModuleShare)}% del inventario.`} ${starModule ? `${starModule.moduleName} lidera el cuadrante Estrella con ${numberFormat.format(starModule.occupancy)}% de ocupación, ${currencyFormat.format(starModule.rentPerM2 ?? 0)}/m² y ${currencyFormat.format(starModule.monthlyRent)} de renta mensual identificada.` : "No existe todavía un módulo Estrella con información financiera comparable."} ${attentionModule ? `${attentionModule.moduleName} requiere atención por combinar ${numberFormat.format(attentionModule.occupancy)}% de ocupación con ${currencyFormat.format(attentionModule.rentPerM2 ?? 0)}/m².` : "La matriz no identifica un módulo en Atención prioritaria."} ${vacancyPriorityModule ? `${vacancyPriorityModule.moduleName} concentra la mayor oportunidad de colocación por módulo: ${integerFormat.format(vacancyPriorityModule.count)} vacantes y ${numberFormat.format(vacancyPriorityModule.area)} m².` : "No hay vacantes que priorizar por módulo."} ${moduleFinancialCoverage === null ? "No fue posible medir la cobertura financiera." : `La clasificación financiera cubre ${numberFormat.format(moduleFinancialCoverage)}% de los locales operativos; debe leerse con esa cobertura y no como rentabilidad total.`}`,
        action: attentionModule
          ? `Concentrar prospección y revisión comercial en ${attentionModule.moduleName}${vacancyPriorityModule && vacancyPriorityModule.moduleName !== attentionModule.moduleName ? ` y atender la vacancia de ${vacancyPriorityModule.moduleName}` : ""}; proteger servicio y renovaciones en ${starModule?.moduleName ?? "los módulos Estrella"}.`
          : vacancyPriorityModule
            ? `Concentrar la prospección inmediata en ${vacancyPriorityModule.moduleName} y mantener seguimiento a los módulos de mejor desempeño.`
            : "Mantener los módulos consolidados y completar renta y metraje para fortalecer la matriz de desempeño.",
        actionPriority: "Media",
        detail: (
          <div className="module-analysis-expanded-container">
            <header className="module-bcg-header" style={{ marginBottom: "1rem" }}>
              <div><span className="section-kicker">Análisis integral por módulo</span><h4>Matriz de Desempeño Comercial (Renta/m² vs Ocupación)</h4></div>
            </header>
            <ModuleBcgAnalysisCard records={selectedRecords} selectedModule={selectedModule} onSelectModule={setSelectedModule} />
          </div>
        ),
      },
      {
        id: "vacancy",
        name: "Espacios vacantes",
        value: integerFormat.format(availableCount),
        statusBadge: availableCount > 10 ? "Atención Prioritaria" : "Moderada",
        statusTone: availableCount > 10 ? "watch" : "ok",
        analysis: !availableCount
          ? "La selección no registra espacios con estatus Disponible."
          : `El inventario disponible suma ${integerFormat.format(availableCount)} espacios y ${numberFormat.format(availableArea)} m². ${availableMedian === null ? "No hay metraje suficiente para calcular el tamaño mediano vacante." : `La mediana vacante es de ${numberFormat.format(availableMedian)} m²${operatingAverage === null ? "" : ` frente a un promedio operativo de ${numberFormat.format(operatingAverage)} m²`}, por lo que ${availableMedian > (operatingAverage ?? availableMedian) * 1.35 ? "el formato típico disponible es mayor que el que ya opera" : "una parte importante del inventario conserva un tamaño comparable con el formato operativo"}.`} ${leadingVacancyZone && leadingVacancyShare !== null ? `${leadingVacancyZone[0]} concentra ${numberFormat.format(leadingVacancyZone[1].area)} m² y ${integerFormat.format(leadingVacancyZone[1].count)} vacantes, equivalentes al ${numberFormat.format(leadingVacancyShare)}% de la superficie disponible.` : "No fue posible localizar territorialmente la vacancia."} ${leadingVacancyLevel ? `El nivel ${leadingVacancyLevel[0]} registra la mayor cantidad, con ${integerFormat.format(leadingVacancyLevel[1])} espacios.` : ""} ${largestVacancy ? `${largestVacancy.nomenclatura || "El espacio de mayor tamaño"} representa la mayor oportunidad individual con ${numberFormat.format(largestVacancy.metraje ?? 0)} m²${availableMedian !== null && (largestVacancy.metraje ?? 0) >= availableMedian * 3 ? ", un macrolocal que explica parte relevante de la superficie vacante sin representar el tamaño típico" : ""}.` : ""}`,
        action: leadingVacancyZone
          ? `${largestVacancy && availableMedian !== null && (largestVacancy.metraje ?? 0) >= availableMedian * 3 ? `Buscar un operador ancla o evaluar subdivisión técnica para ${largestVacancy.nomenclatura || "el macrolocal principal"}; ` : ""}concentrar prospección y recorridos en ${leadingVacancyZone[0]}${leadingVacancyLevel ? `, especialmente en el nivel ${leadingVacancyLevel[0]}` : ""}.`
          : "Completar zona, nivel y metraje de los espacios disponibles antes de definir la prioridad comercial.",
        actionPriority: availableCount > 10 ? "Alta" : "Media",
      },
    ];

    if (selectedLocation.id === "etp") {
      metrics.unshift(
        {
          id: "capacity",
          name: "Capacidad de Atención Comercial",
          value: etpCommercialCapacity === null ? "Sin dato" : `${integerFormat.format(etpCommercialCapacity.commercialPassengerCapacity)} Pax`,
          statusBadge: "En Meta",
          statusTone: "ok",
          analysis: capacityUsage === null || projectedPassengers === null || etpCommercialCapacity === null ? "Se requieren datos válidos de CAPACIDAD y meses completos de PASAJEROS para construir la lectura ejecutiva." : `La superficie arrendada equivale a una capacidad comercial anual de ${integerFormat.format(etpCommercialCapacity.commercialPassengerCapacity)} pasajeros. Con ${integerFormat.format(projectedPassengers)} pasajeros proyectados para ${currentTrafficYear}, la utilización sería de ${numberFormat.format(capacityUsage)}% y permanecería una holgura aproximada de ${integerFormat.format(Math.max(etpCommercialCapacity.commercialPassengerCapacity - projectedPassengers, 0))} pasajeros. El crecimiento de tráfico está integrado en la serie histórica inferior; la prioridad es convertir la capacidad y los espacios existentes en actividad e ingreso antes de ampliar superficie de forma general.`,
          action: capacityUsage !== null && capacityUsage < 80 ? "Ocupar y rentabilizar la capacidad existente antes de ampliar superficie de forma general." : "Revisar presión por hora pico antes de autorizar expansión adicional.",
          actionPriority: "Baja",
          detail: <CommercialCapacityAnalysis capacity={etpCommercialCapacity} available={availableCount} passengerTraffic={passengerTraffic} presentation="full" />,
        },
      );
    }

    const selectedMetric = selectedMetricId === null ? null : metrics.find((metric) => metric.id === selectedMetricId) ?? metrics[0];

    return (
      <section className="intelligence-center analysis-zone-center" aria-label={`Análisis comercial de ${selectedLocation.shortName}`}>
        <div className="intelligence-heading">
          <div><span className="section-kicker">Análisis por zona</span><h2>Indicadores clave de {selectedLocation.shortName}</h2><p>Selecciona una métrica para consultar una lectura ejecutiva estructurada y su acción recomendada.</p></div>
          <div className="intelligence-source"><span>Fuente activa</span><strong>{sourceFile}</strong><small>{sourceDate}</small></div>
        </div>

        <div className="analysis-metric-grid" aria-label="Indicadores disponibles">
          {metrics.map((metric) => (
            <article
              key={metric.id}
              className={`analysis-metric-card-rich ${selectedMetric?.id === metric.id ? "active" : ""}`}
              onClick={() => setSelectedMetricId((current) => current === metric.id ? null : metric.id)}
            >
              <div className="metric-card-header">
                <span className="metric-card-title">{metric.name}</span>
                {metric.statusBadge && (
                  <span className={`metric-status-badge tone-${metric.statusTone ?? "info"}`}>
                    {metric.statusBadge}
                  </span>
                )}
              </div>
              <div className="metric-card-body">
                <strong className="metric-card-value">{metric.value}</strong>
                <button
                  className="analysis-metric-toggle"
                  type="button"
                  aria-expanded={selectedMetric?.id === metric.id}
                  aria-controls={`analysis-detail-${metric.id}`}
                  aria-label={`${selectedMetric?.id === metric.id ? "Ocultar" : "Ver"} análisis de ${metric.name}`}
                  title={`${selectedMetric?.id === metric.id ? "Ocultar" : "Ver"} análisis`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMetricId((current) => current === metric.id ? null : metric.id);
                  }}
                >
                  <b aria-hidden="true">i</b>
                </button>
              </div>
            </article>
          ))}
        </div>

        {selectedMetric && (
          <article className="analysis-metric-detail" id={`analysis-detail-${selectedMetric.id}`} aria-live="polite">
            {selectedMetric.id !== "capacity" && (
              <header>
                <div>
                  <span>Indicador seleccionado</span>
                  <h3>{selectedMetric.name}</h3>
                </div>
                <div className="detail-header-value-group">
                  {selectedMetric.statusBadge && (
                    <span className={`metric-status-badge tone-${selectedMetric.statusTone ?? "info"}`}>
                      {selectedMetric.statusBadge}
                    </span>
                  )}
                  <strong>{selectedMetric.value}</strong>
                </div>
              </header>
            )}

            {selectedMetric.comparisonBar && (
              <div className="analysis-comparison-card">
                <div className="comparison-header">
                  <span>Comparativa Visual de Formato</span>
                  <small>{selectedMetric.comparisonBar.gapText}</small>
                </div>
                <div className="comparison-tracks">
                  <div className="comparison-item">
                    <div className="comparison-labels">
                      <strong>{selectedMetric.comparisonBar.leftLabel}</strong>
                      <span className="comp-val primary">{selectedMetric.comparisonBar.leftFormatted}</span>
                    </div>
                    <div className="comparison-bar-track">
                      <div
                        className="comparison-bar-fill primary"
                        style={{
                          width: `${Math.min(
                            100,
                            (selectedMetric.comparisonBar.leftValue /
                              Math.max(selectedMetric.comparisonBar.leftValue, selectedMetric.comparisonBar.rightValue, 1)) *
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="comparison-item">
                    <div className="comparison-labels">
                      <strong>{selectedMetric.comparisonBar.rightLabel}</strong>
                      <span className="comp-val secondary">{selectedMetric.comparisonBar.rightFormatted}</span>
                    </div>
                    <div className="comparison-bar-track">
                      <div
                        className="comparison-bar-fill secondary"
                        style={{
                          width: `${Math.min(
                            100,
                            (selectedMetric.comparisonBar.rightValue /
                              Math.max(selectedMetric.comparisonBar.leftValue, selectedMetric.comparisonBar.rightValue, 1)) *
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedMetric.id === "capacity" ? (
              selectedMetric.detail
            ) : (
              <>
                {selectedMetric.highlights && selectedMetric.highlights.length > 0 ? (
                  <div className="analysis-highlights-container">
                    <span className="section-label">Puntos Clave del Análisis</span>
                    <div className="analysis-highlights-grid">
                      {selectedMetric.highlights.map((item, idx) => (
                        <div key={idx} className="analysis-highlight-card">
                          <div className="highlight-tag">{item.label}</div>
                          <p>{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="analysis-metric-reading">
                    <span>Análisis</span>
                    <p>{selectedMetric.analysis}</p>
                  </div>
                )}

                <div className="analysis-metric-action">
                  <div className="action-header">
                    <span>Acción recomendada</span>
                    {selectedMetric.actionPriority && (
                      <span className={`action-priority-badge priority-${selectedMetric.actionPriority.toLowerCase()}`}>
                        Prioridad {selectedMetric.actionPriority}
                      </span>
                    )}
                  </div>
                  <p>{selectedMetric.action}</p>
                </div>

                {selectedMetric.detail && <div className="analysis-metric-expanded">{selectedMetric.detail}</div>}
              </>
            )}
          </article>
        )}
      </section>
    );
  }

  if (view === "contracts_validity") {
    return (
      <TenantScorecardWrapper
        records={intelligence.records}
        onOpenLocal={onOpenLocal}
      />
    );
  }

  if (view === "finance_collections") {
    const activeLoc = locationOptions.find((loc) => loc.id === locationId);
    return (
      <FinanceCenter
        records={intelligence.records}
        scopeLabel={activeLoc?.name ?? "Todas las zonas comerciales"}
        subTab="billed_vs_recovered"
      />
    );
  }

  return (
    <section className="intelligence-center" aria-label="Análisis por Zona">
      <div className="intelligence-heading compact">
        <div>
          <span className="section-kicker">Módulo de Análisis</span>
          <h2>Análisis Especializado</h2>
          <p>Seleccione una dimensión en el menú superior para desplegar la inteligencia correspondiente.</p>
        </div>
      </div>
    </section>
  );
}
