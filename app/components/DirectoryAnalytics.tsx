"use client";

import type { LocalRecord } from "@/app/types";

type FilterableField =
  | "estatus"
  | "lado"
  | "area"
  | "nivel"
  | "areaComercial"
  | "giroOperativo"
  | "gerencia";

type Metric = {
  label: string;
  value: string;
  note: string;
};

type ChartDatum = {
  label: string;
  value: number;
};

type ChartSpec = {
  title: string;
  kicker: string;
  data: ChartDatum[];
  unit?: "count" | "area" | "percent";
  field?: FilterableField;
  statusColors?: boolean;
  fullArea?: boolean;
};

const numberFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const compactFormat = new Intl.NumberFormat("es-MX", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const statusColors: Record<string, string> = {
  "EN FUNCIONAMIENTO": "#00886f",
  DISPONIBLE: "#f28c28",
  "EN PROCESO DE ASIGNACION": "#39a9db",
  FORMALIZADO: "#8a633f",
  "EN ADAPTACION": "#f2c94c",
};

const statusLabels: Record<string, string> = {
  "EN FUNCIONAMIENTO": "En funcionamiento",
  DISPONIBLE: "Disponible",
  "EN PROCESO DE ASIGNACION": "En proceso de asignación",
  FORMALIZADO: "Formalizado",
  "EN ADAPTACION": "En adaptación",
};

const locationAccents: Record<string, string> = {
  etp: "#ac182c",
  "parque-santa-lucia": "#00886f",
  "carga-aduana": "#405364",
  "autobuses-plaza": "#b56d16",
  "parque-revolucion": "#8a633f",
  "ciudad-aeroportuaria": "#0b957e",
  "calzada-mamuts": "#ac182c",
};

function cleanLabel(value: unknown) {
  return String(value ?? "").trim() || "Sin dato";
}

function countBy(records: LocalRecord[], field: keyof LocalRecord): ChartDatum[] {
  const counts = new Map<string, number>();
  records.forEach((record) => {
    const label = cleanLabel(record[field]);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function sumAreaBy(records: LocalRecord[], field: keyof LocalRecord): ChartDatum[] {
  const totals = new Map<string, number>();
  records.forEach((record) => {
    const label = cleanLabel(record[field]);
    totals.set(label, (totals.get(label) ?? 0) + (record.metraje ?? 0));
  });
  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

function averageAreaBy(records: LocalRecord[], field: keyof LocalRecord): ChartDatum[] {
  const groups = new Map<string, number[]>();
  records.forEach((record) => {
    if (record.metraje === null || record.metraje <= 0) return;
    const label = cleanLabel(record[field]);
    groups.set(label, [...(groups.get(label) ?? []), record.metraje]);
  });
  return [...groups.entries()]
    .map(([label, values]) => ({
      label,
      value: values.reduce((sum, value) => sum + value, 0) / values.length,
    }))
    .sort((a, b) => b.value - a.value);
}

function combinedZoneArea(records: LocalRecord[]): ChartDatum[] {
  const totals = new Map<string, number>();
  records.forEach((record) => {
    const label = `${cleanLabel(record.lado)} · ${cleanLabel(record.area)}`;
    totals.set(label, (totals.get(label) ?? 0) + (record.metraje ?? 0));
  });
  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

function sizeBands(records: LocalRecord[]): ChartDatum[] {
  const bands = [
    { label: "Hasta 100 m²", min: 0, max: 100 },
    { label: "101–1,000 m²", min: 100, max: 1000 },
    { label: "1,001–5,000 m²", min: 1000, max: 5000 },
    { label: "Más de 5,000 m²", min: 5000, max: Infinity },
  ];
  return bands
    .map((band) => ({
      label: band.label,
      value: records.filter(
        (record) =>
          record.metraje !== null &&
          record.metraje > band.min &&
          record.metraje <= band.max,
      ).length,
    }))
    .filter((item) => item.value > 0);
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function median(values: number[]) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

function formatArea(value: number | null) {
  return value === null ? "Sin dato" : `${numberFormat.format(value)} m²`;
}

function validBrand(value: string | null) {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return Boolean(
    normalized &&
      !["n/a", "na", "sin marca", "por definir", "ninguno", "-", "pendiente"].includes(
        normalized,
      ),
  );
}

function surfaceMetrics(records: LocalRecord[]): Metric[] {
  const areas = records
    .map((record) => record.metraje)
    .filter((value): value is number => value !== null && value > 0);
  const operatingAreas = records
    .filter((record) => record.estatus === "EN FUNCIONAMIENTO")
    .map((record) => record.metraje)
    .filter((value): value is number => value !== null && value > 0);
  const availableAreas = records
    .filter((record) => record.estatus === "DISPONIBLE")
    .map((record) => record.metraje)
    .filter((value): value is number => value !== null && value > 0);

  return [
    {
      label: "Promedio general",
      value: formatArea(average(areas)),
      note: "Tamaño medio de la selección",
    },
    {
      label: "Mediana general",
      value: formatArea(median(areas)),
      note: "Tamaño típico sin sesgo de extremos",
    },
    {
      label: "Promedio ocupado",
      value: formatArea(average(operatingAreas)),
      note: "Espacios en funcionamiento",
    },
    {
      label: "Promedio disponible",
      value: formatArea(average(availableAreas)),
      note: "Espacios actualmente vacantes",
    },
    {
      label: "Rango de superficie",
      value: areas.length
        ? `${numberFormat.format(Math.min(...areas))}–${numberFormat.format(Math.max(...areas))} m²`
        : "Sin dato",
      note: "Menor y mayor espacio registrado",
    },
  ];
}

function tenantMetrics(records: LocalRecord[]): Metric[] {
  const branded = records.filter((record) => validBrand(record.marca));
  const uniqueBrands = new Set(
    branded.map((record) => record.marca!.trim().toLocaleLowerCase("es-MX")),
  );
  const operatingBrands = new Set(
    branded
      .filter((record) => record.estatus === "EN FUNCIONAMIENTO")
      .map((record) => record.marca!.trim().toLocaleLowerCase("es-MX")),
  );
  const brandArea = new Map<string, number>();
  branded.forEach((record) => {
    const brand = record.marca!.trim().toLocaleLowerCase("es-MX");
    brandArea.set(brand, (brandArea.get(brand) ?? 0) + (record.metraje ?? 0));
  });
  const topThreeArea = [...brandArea.values()]
    .sort((a, b) => b - a)
    .slice(0, 3)
    .reduce((sum, value) => sum + value, 0);
  const totalArea = records.reduce((sum, record) => sum + (record.metraje ?? 0), 0);
  return [
    {
      label: "Marcas operando",
      value: numberFormat.format(operatingBrands.size),
      note: "Marcas únicas en funcionamiento",
    },
    {
      label: "Ratio multi-ubicación",
      value: uniqueBrands.size
        ? `${numberFormat.format(branded.length / uniqueBrands.size)} locales`
        : "Sin dato",
      note: "Locales asignados por marca",
    },
    {
      label: "Concentración Top 3",
      value: totalArea ? `${numberFormat.format((topThreeArea / totalArea) * 100)}%` : "Sin dato",
      note: "Participación del área total seleccionada",
    },
  ];
}

function contextualMetrics(locationId: string, records: LocalRecord[]): Metric[] {
  const areas = records
    .map((record) => record.metraje)
    .filter((value): value is number => value !== null && value > 0);
  const totalArea = areas.reduce((sum, value) => sum + value, 0);
  const availableArea = records
    .filter((record) => record.estatus === "DISPONIBLE")
    .reduce((sum, record) => sum + (record.metraje ?? 0), 0);
  const operating = records.filter((record) => record.estatus === "EN FUNCIONAMIENTO").length;
  const brands = new Set(
    records
      .filter((record) => validBrand(record.marca))
      .map((record) => record.marca!.trim().toLocaleLowerCase("es-MX")),
  );
  const recordName =
    locationId === "ciudad-aeroportuaria"
      ? "manzana"
      : locationId === "calzada-mamuts"
        ? "predio"
        : "espacio";

  return [
    {
      label: "Superficie registrada",
      value: formatArea(totalArea),
      note: "Suma de la selección actual",
    },
    {
      label: `Promedio por ${recordName}`,
      value: formatArea(average(areas)),
      note: "Tamaño medio registrado",
    },
    {
      label: "Superficie disponible",
      value: formatArea(availableArea),
      note: "Inventario con estatus disponible",
    },
    {
      label: "Ocupación",
      value: records.length
        ? `${numberFormat.format((operating / records.length) * 100)}%`
        : "0%",
      note: "Registros en funcionamiento",
    },
    {
      label: "Marcas identificadas",
      value: numberFormat.format(brands.size),
      note: "Marcas únicas en la selección",
    },
  ];
}

function chartSpecs(locationId: string, records: LocalRecord[]): ChartSpec[] {
  switch (locationId) {
    case "etp":
      return [
        {
          title: "Giro operativo",
          kicker: "Tenant mix",
          data: countBy(records, "giroOperativo"),
          field: "giroOperativo",
        },
        {
          title: "Promedio por formato comercial",
          kicker: "Superficie estándar",
          data: averageAreaBy(records, "areaComercial"),
          unit: "area",
          field: "areaComercial",
        },
        {
          title: "Superficie por zona",
          kicker: "Lado aire y lado tierra",
          data: combinedZoneArea(records),
          unit: "area",
        },
      ];
    case "parque-santa-lucia":
      return [
        {
          title: "Locales por nivel",
          kicker: "Implantación comercial",
          data: countBy(records, "nivel"),
          field: "nivel",
        },
        {
          title: "Giro comercial",
          kicker: "Mezcla de oferta",
          data: countBy(records, "giroOperativo"),
          field: "giroOperativo",
        },
        {
          title: "Superficie por nivel",
          kicker: "Distribución de m²",
          data: sumAreaBy(records, "nivel"),
          unit: "area",
          field: "nivel",
          fullArea: true,
        },
      ];
    case "carga-aduana":
      return [
        {
          title: "Espacios por nivel",
          kicker: "Edificio de Servicios",
          data: countBy(records, "nivel"),
          field: "nivel",
        },
        {
          title: "Tipo de espacio",
          kicker: "Composición operativa",
          data: countBy(records, "areaComercial"),
          field: "areaComercial",
        },
        {
          title: "Superficie por nivel",
          kicker: "Capacidad instalada",
          data: sumAreaBy(records, "nivel"),
          unit: "area",
          field: "nivel",
        },
      ];
    case "autobuses-plaza":
      return [
        {
          title: "Inventario por zona",
          kicker: "Terminal, plaza y tren",
          data: countBy(records, "lado"),
          field: "lado",
        },
        {
          title: "Giro operativo",
          kicker: "Oferta al pasajero",
          data: countBy(records, "giroOperativo"),
          field: "giroOperativo",
        },
        {
          title: "Superficie por zona",
          kicker: "Distribución territorial",
          data: sumAreaBy(records, "lado"),
          unit: "area",
          field: "lado",
        },
      ];
    case "parque-revolucion":
      return [
        {
          title: "Forma de aprovechamiento",
          kicker: "Hotel y publicidad",
          data: countBy(records, "giroIndaabin").map((item) => ({
            ...item,
            label: item.label === "HOTEL"
              ? "Hotel"
              : item.label === "PUBLICIDAD EXTERIOR"
                ? "Publicidad Exterior"
                : item.label,
          })),
        },
        {
          title: "Vocación del espacio",
          kicker: "Giro operativo",
          data: countBy(records, "giroOperativo"),
          field: "giroOperativo",
        },
        {
          title: "Superficie por formato",
          kicker: "Uso de la glorieta",
          data: sumAreaBy(records, "areaComercial"),
          unit: "area",
          field: "areaComercial",
        },
      ];
    case "ciudad-aeroportuaria":
      return [
        {
          title: "Vocación de las manzanas",
          kicker: "Uso proyectado",
          data: countBy(records, "giroOperativo"),
          field: "giroOperativo",
        },
        {
          title: "Rangos de superficie",
          kicker: "Escala de manzanas",
          data: sizeBands(records),
        },
        {
          title: "Suelo por estatus",
          kicker: "Disponibilidad territorial",
          data: sumAreaBy(records, "estatus"),
          unit: "area",
          field: "estatus",
          statusColors: true,
        },
      ];
    case "calzada-mamuts":
      return [
        {
          title: "Giro previsto",
          kicker: "Giro comercial",
          data: countBy(records, "giroOperativo"),
          field: "giroOperativo",
        },
        {
          title: "Rangos de superficie",
          kicker: "Escala de predios",
          data: sizeBands(records),
        },
        {
          title: "Suelo por giro",
          kicker: "Distribución de m²",
          data: sumAreaBy(records, "giroOperativo"),
          unit: "area",
          field: "giroOperativo",
        },
      ];
    default:
      return [];
  }
}

function donutBackground(data: ChartDatum[], total: number) {
  if (!total) return "#e5ded8";
  let cursor = 0;
  const segments = data.map((item) => {
    const start = cursor;
    cursor += (item.value / total) * 100;
    return `${statusColors[item.label] ?? "#8a817a"} ${start}% ${cursor}%`;
  });
  return `conic-gradient(${segments.join(", ")})`;
}

function AnalyticsMetric({ metric }: { metric: Metric }) {
  return (
    <article className="analytics-metric">
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
      <small>{metric.note}</small>
    </article>
  );
}

export function LocationIndicators({
  locationId,
  records,
}: {
  locationId: string;
  records: LocalRecord[];
}) {
  const metrics =
    locationId === "etp" ? surfaceMetrics(records) : contextualMetrics(locationId, records);

  return (
    <section
      className="summary-location-indicators"
      aria-label="Indicadores de superficie y Tenant Mix"
    >
      <div className="analytics-title-row">
        <div>
          <span className="section-kicker">
            {locationId === "etp" ? "Indicadores de superficie ETP" : "Indicadores de superficie"}
          </span>
          <h2>Superficie y ocupación</h2>
          <p>Indicadores calculados con la información activa de esta ubicación.</p>
        </div>
      </div>

      <div className="analytics-kpi-grid">
        {metrics.map((metric) => (
          <AnalyticsMetric metric={metric} key={metric.label} />
        ))}
      </div>

      <div className="analytics-subheading">
        <div>
          <span className="section-kicker">Tenant Mix</span>
          <h2>Marcas y concentración</h2>
        </div>
      </div>
      <div className="analytics-kpi-grid tenant-kpis">
        {tenantMetrics(records).map((metric) => (
          <AnalyticsMetric metric={metric} key={metric.label} />
        ))}
      </div>
    </section>
  );
}

function AnalyticsBars({
  spec,
  accent,
  activeStatus,
  onFilter,
}: {
  spec: ChartSpec;
  accent: string;
  activeStatus: string;
  onFilter: (field: FilterableField, value: string) => void;
}) {
  const visible = spec.data.slice(0, 8);
  const max = Math.max(...visible.map((item) => item.value), 1);
  const total = spec.data.reduce((sum, item) => sum + item.value, 0);

  return (
    <article className="chart-card analytics-chart-card">
      <div className="card-heading">
        <div>
          <span className="section-kicker">{spec.kicker}</span>
          <h2>{spec.title}</h2>
        </div>
        <span>{spec.unit === "area" ? "m²" : "registros"}</span>
      </div>
      <div className="analytics-bars">
        {visible.map((item) => {
          const percentage = total ? (item.value / total) * 100 : 0;
          const color = spec.statusColors
            ? statusColors[item.label] ?? accent
            : accent;
          const formatted =
            spec.unit === "area"
              ? `${(spec.fullArea ? numberFormat : compactFormat).format(item.value)} m²`
              : spec.unit === "percent"
                ? `${numberFormat.format(item.value)}%`
                : numberFormat.format(item.value);
          const canFilter = Boolean(spec.field && item.label !== "Sin dato");
          const content = (
            <>
              <span className="analytics-bar-label">
                <span title={item.label}>{statusLabels[item.label] ?? item.label}</span>
                <strong><b>{formatted}</b><small>{numberFormat.format(percentage)}%</small></strong>
              </span>
              <span className="analytics-bar-track">
                <i
                  title={`${statusLabels[item.label] ?? item.label}: ${formatted} (${numberFormat.format(percentage)}%)`}
                  style={{
                    width: `${Math.max((item.value / max) * 100, 2)}%`,
                    background: color,
                  }}
                />
              </span>
            </>
          );
          return canFilter ? (
            <button
              type="button"
              className="analytics-bar-row"
              key={item.label}
              onClick={() =>
                onFilter(
                  spec.field!,
                  spec.field === "estatus" && activeStatus === item.label ? "" : item.label,
                )
              }
            >
              {content}
            </button>
          ) : (
            <div className="analytics-bar-row" key={item.label}>
              {content}
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function DirectoryAnalytics({
  locationId,
  records,
  recordLabel,
  activeStatus,
  onFilter,
}: {
  locationId: string;
  records: LocalRecord[];
  recordLabel: string;
  activeStatus: string;
  onFilter: (field: FilterableField, value: string) => void;
}) {
  const statusData = countBy(records, "estatus");
  const singleStatus = activeStatus || (statusData.length === 1 ? statusData[0].label : "");
  const centerLabel = singleStatus ? statusLabels[singleStatus] ?? singleStatus : recordLabel;
  const accent =
    (singleStatus && statusColors[singleStatus]) ||
    locationAccents[locationId] ||
    "#09212e";
  const specs = chartSpecs(locationId, records);

  return (
    <section className="directory-analytics" aria-label="Análisis de la selección filtrada">
      <div className="analytics-title-row">
        <div>
          <span className="section-kicker">Análisis del directorio</span>
          <h2>Gráficas de la selección</h2>
          <p>Las gráficas responden a los filtros activos del directorio.</p>
        </div>
        <span className="analytics-selection-count">
          {numberFormat.format(records.length)} {recordLabel}
        </span>
      </div>

      <div className="charts-grid analytics-charts-grid">
        <article className="chart-card status-card">
          <div className="card-heading">
            <div>
              <span className="section-kicker">Estado comercial</span>
              <h2>Distribución por estatus</h2>
            </div>
            <span>{records.length} {recordLabel}</span>
          </div>
          <div className="donut-layout">
            <div
              className="donut"
              style={{ background: donutBackground(statusData, records.length) }}
              role="img"
              aria-label={`Distribución por estatus: ${statusData
                .map((item) => `${statusLabels[item.label] ?? item.label}, ${item.value}, ${records.length ? numberFormat.format((item.value / records.length) * 100) : 0}%`)
                .join("; ")}`}
            >
              <div>
                <strong>{records.length}</strong>
                <span>{centerLabel}</span>
              </div>
            </div>
            <div className="status-legend">
              {statusData.map((item) => (
                <button
                  type="button"
                  key={item.label}
                  className={activeStatus === item.label ? "active" : ""}
                  onClick={() =>
                    onFilter("estatus", activeStatus === item.label ? "" : item.label)
                  }
                >
                  <i style={{ background: statusColors[item.label] ?? "#8a817a" }} />
                  <span>{statusLabels[item.label] ?? item.label}</span>
                  <strong><b>{item.value}</b><small>{records.length ? numberFormat.format((item.value / records.length) * 100) : 0}%</small></strong>
                </button>
              ))}
            </div>
          </div>
        </article>

        {specs.map((spec) => (
          <AnalyticsBars
            spec={spec}
            accent={accent}
            activeStatus={activeStatus}
            onFilter={onFilter}
            key={`${spec.kicker}-${spec.title}`}
          />
        ))}
      </div>
    </section>
  );
}
