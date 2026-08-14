"use client";

import { useEffect, useRef, useState } from "react";
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
  analysis?: string;
  links?: MetricLink[];
};

type MetricLink = {
  label: string;
  value: string;
  detail: string;
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
  const generalAverage = average(areas);
  const generalMedian = median(areas);
  const operatingAverage = average(operatingAreas);
  const availableAverage = average(availableAreas);
  const minimumArea = areas.length ? Math.min(...areas) : null;
  const maximumArea = areas.length ? Math.max(...areas) : null;
  const averageMedianDifference = generalAverage !== null && generalMedian !== null
    ? ((generalAverage - generalMedian) / generalMedian) * 100
    : null;
  const availableOperatingRatio = availableAverage !== null && operatingAverage !== null
    ? availableAverage / operatingAverage
    : null;
  const rangeRatio = minimumArea !== null && maximumArea !== null
    ? maximumArea / minimumArea
    : null;

  return [
    {
      label: "Promedio general",
      value: formatArea(generalAverage),
      note: "Tamaño medio de la selección",
      analysis: generalAverage === null
        ? "Aún no hay superficies válidas para calcular este indicador; contar con ellas es indispensable para dimensionar el inventario y definir formatos comerciales comparables."
        : `El local promedio mide ${formatArea(generalAverage)}${generalMedian !== null ? `, frente a una mediana de ${formatArea(generalMedian)}` : ""}. Esta comparación permite saber si los espacios grandes elevan la media y evita usar un tamaño poco representativo al planear rentas, adecuaciones o nuevas asignaciones.`,
    },
    {
      label: "Mediana general",
      value: formatArea(generalMedian),
      note: "Tamaño típico sin sesgo de extremos",
      analysis: generalMedian === null
        ? "Aún no hay superficies válidas para identificar el tamaño típico del inventario; este dato es necesario para evitar que los espacios extremos distorsionen la planeación."
        : `La mitad de los locales mide hasta ${formatArea(generalMedian)} y la otra mitad supera ese valor${averageMedianDifference !== null ? `; el promedio es ${Math.abs(averageMedianDifference).toFixed(0)}% ${averageMedianDifference >= 0 ? "mayor" : "menor"}` : ""}. Es la referencia más estable para definir el formato comercial habitual sin el sesgo de locales excepcionalmente grandes o pequeños.`,
    },
    {
      label: "Promedio ocupado",
      value: formatArea(operatingAverage),
      note: "Espacios en funcionamiento",
      analysis: operatingAverage === null
        ? "No hay superficies válidas de locales en funcionamiento; este indicador permite reconocer qué tamaño ha logrado una ocupación y operación efectivas."
        : `Los ${numberFormat.format(operatingAreas.length)} locales en funcionamiento tienen una superficie promedio de ${formatArea(operatingAverage)}. Este valor muestra el tamaño que el mercado ya absorbió y sirve como referencia objetiva para orientar futuras asignaciones y adecuaciones.`,
    },
    {
      label: "Promedio disponible",
      value: formatArea(availableAverage),
      note: "Espacios actualmente vacantes",
      analysis: availableAverage === null
        ? "No hay superficies válidas de espacios disponibles; medirlas permite anticipar si el tamaño del inventario vacante facilita o dificulta su colocación."
        : `Los ${numberFormat.format(availableAreas.length)} espacios disponibles promedian ${formatArea(availableAverage)}${availableOperatingRatio !== null ? `, equivalente a ${numberFormat.format(availableOperatingRatio)} veces el promedio ocupado` : ""}. Esta brecha revela si la vacancia se concentra en formatos difíciles de colocar y sustenta decisiones de subdivisión, fusión o adecuación.`,
    },
    {
      label: "Rango de superficie",
      value: areas.length
        ? `${numberFormat.format(minimumArea!)}–${numberFormat.format(maximumArea!)} m²`
        : "Sin dato",
      note: "Menor y mayor espacio registrado",
      analysis: minimumArea === null || maximumArea === null
        ? "No existen superficies válidas para establecer el rango; conocer sus extremos permite segmentar el inventario y evitar una estrategia comercial única para espacios distintos."
        : `La superficie va de ${numberFormat.format(minimumArea)} a ${numberFormat.format(maximumArea)} m²${rangeRatio !== null ? `, una amplitud de ${numberFormat.format(rangeRatio)} veces` : ""}. Esta variación confirma que módulos pequeños y macrolocales requieren estrategias de precio, giro y colocación diferenciadas.`,
    },
  ];
}

function tenantMetrics(records: LocalRecord[], includeEtpAnalysis = false): Metric[] {
  const branded = records.filter((record) => validBrand(record.marca));
  const uniqueBrands = new Set(
    branded.map((record) => record.marca!.trim().toLocaleLowerCase("es-MX")),
  );
  const operatingBrands = new Set(
    branded
      .filter((record) => record.estatus === "EN FUNCIONAMIENTO")
      .map((record) => record.marca!.trim().toLocaleLowerCase("es-MX")),
  );
  const brandDetails = new Map<string, { label: string; area: number; locations: Set<string> }>();
  branded.forEach((record) => {
    const label = record.marca!.trim();
    const brand = label.toLocaleLowerCase("es-MX");
    const current = brandDetails.get(brand) ?? { label, area: 0, locations: new Set<string>() };
    current.area += record.metraje ?? 0;
    if (record.nomenclatura) current.locations.add(record.nomenclatura);
    brandDetails.set(brand, current);
  });
  const topThreeBrands = [...brandDetails.values()]
    .sort((a, b) => b.area - a.area)
    .slice(0, 3);
  const topThreeArea = topThreeBrands.reduce((sum, brand) => sum + brand.area, 0);
  const totalArea = records.reduce((sum, record) => sum + (record.metraje ?? 0), 0);
  const multiLocationRatio = uniqueBrands.size ? branded.length / uniqueBrands.size : null;
  const concentration = totalArea ? (topThreeArea / totalArea) * 100 : null;
  const operatingLocations = branded.filter((record) => record.estatus === "EN FUNCIONAMIENTO").length;
  const metrics: Metric[] = [
    {
      label: "Marcas operando",
      value: numberFormat.format(operatingBrands.size),
      note: "Marcas únicas en funcionamiento",
      analysis: includeEtpAnalysis
        ? `${numberFormat.format(operatingBrands.size)} marcas únicas operan en ${numberFormat.format(operatingLocations)} locales de la selección actual. Esta métrica permite evaluar la diversidad real de la oferta: una base amplia reduce la dependencia de pocos operadores, siempre que también exista equilibrio entre los distintos giros comerciales.`
        : undefined,
    },
    {
      label: "Ratio multi-ubicación",
      value: multiLocationRatio !== null
        ? `${numberFormat.format(multiLocationRatio)} locales`
        : "Sin dato",
      note: "Locales asignados por marca",
      analysis: includeEtpAnalysis
        ? multiLocationRatio === null
          ? "No existen marcas suficientes para calcular cuántos locales concentra cada operador; este dato es clave para distinguir expansión comercial de dependencia operativa."
          : `${numberFormat.format(uniqueBrands.size)} marcas reúnen ${numberFormat.format(branded.length)} locales, equivalentes a ${numberFormat.format(multiLocationRatio)} locales por marca. El ratio muestra el nivel de expansión y concentración operativa, por lo que ayuda a detectar dependencia de operadores con múltiples ubicaciones.`
        : undefined,
    },
    {
      label: "Concentración Top 3",
      value: concentration !== null ? `${numberFormat.format(concentration)}%` : "Sin dato",
      note: "Participación del área total seleccionada",
      analysis: includeEtpAnalysis
        ? concentration === null
          ? "No existe superficie suficiente para medir la concentración; esta métrica es necesaria para estimar cuánto afectaría la salida de los principales ocupantes."
          : `Las tres marcas con mayor superficie ocupan ${numberFormat.format(topThreeArea)} de ${numberFormat.format(totalArea)} m², es decir, ${numberFormat.format(concentration)}% del área seleccionada. ${concentration <= 20 ? "La baja concentración confirma una cartera diversificada y limita el impacto de la salida de un solo ocupante." : concentration <= 40 ? "La concentración es moderada y justifica vigilar la exposición a los principales ocupantes." : "La concentración es elevada y señala un riesgo relevante de ocupación ante la salida de alguno de los principales actores."}`
        : undefined,
      links: includeEtpAnalysis
        ? topThreeBrands.map((brand) => {
            const locations = [...brand.locations];
            const visibleLocations = locations.slice(0, 3).join(", ");
            const remainingLocations = Math.max(locations.length - 3, 0);
            return {
              label: brand.label,
              value: brand.label,
              detail: `${locations.length === 1 ? "Local" : "Locales"} ${visibleLocations || "sin nomenclatura"}${remainingLocations ? ` y ${remainingLocations} más` : ""} · ${numberFormat.format(brand.area)} m²`,
            };
          })
        : undefined,
    },
  ];
  return metrics;
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

function AnalyticsMetric({
  metric,
  analysisOpen = false,
  onToggleAnalysis,
  onOpenMetricLink,
}: {
  metric: Metric;
  analysisOpen?: boolean;
  onToggleAnalysis?: (metric: Metric) => void;
  onOpenMetricLink?: (value: string) => void;
}) {
  const metricRef = useRef<HTMLElement>(null);
  const [popoverSide, setPopoverSide] = useState<"left" | "right">("right");
  const analysisId = `metric-analysis-${metric.label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase()}`;

  useEffect(() => {
    if (!analysisOpen || !onToggleAnalysis) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!metricRef.current?.contains(event.target as Node)) onToggleAnalysis(metric);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onToggleAnalysis(metric);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [analysisOpen, metric, onToggleAnalysis]);

  const toggleAnalysis = () => {
    if (!analysisOpen && metricRef.current) {
      const bounds = metricRef.current.getBoundingClientRect();
      setPopoverSide(window.innerWidth - bounds.right >= 330 ? "right" : "left");
    }
    onToggleAnalysis?.(metric);
  };

  return (
    <article className="analytics-metric" ref={metricRef}>
      {metric.analysis && onToggleAnalysis && (
        <button
          type="button"
          className="metric-analysis-trigger"
          onClick={toggleAnalysis}
          aria-label={`Ver importancia de ${metric.label}`}
          aria-expanded={analysisOpen}
          aria-controls={analysisId}
          title={`Ver importancia de ${metric.label}`}
        >i</button>
      )}
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
      <small>{metric.note}</small>
      {analysisOpen && metric.analysis && (
        <aside
          id={analysisId}
          className="metric-analysis-popover"
          data-side={popoverSide}
          role="dialog"
          aria-label={`Importancia de ${metric.label}`}
        >
          <header>
            <span>Por qué importa</span>
            <button type="button" onClick={toggleAnalysis} aria-label={`Cerrar información de ${metric.label}`}>×</button>
          </header>
          <p>{metric.analysis}</p>
          {metric.links && metric.links.length > 0 && onOpenMetricLink && (
            <div className="metric-analysis-links" aria-label="Marcas principales y locales ocupados">
              {metric.links.map((link, index) => (
                <button type="button" key={link.value} onClick={() => onOpenMetricLink(link.value)}>
                  <span><b>{index + 1}</b><strong>{link.label}</strong><em>Ver locales →</em></span>
                  <small>{link.detail}</small>
                </button>
              ))}
            </div>
          )}
        </aside>
      )}
    </article>
  );
}

export function LocationIndicators({
  locationId,
  records,
  onOpenBrand,
}: {
  locationId: string;
  records: LocalRecord[];
  onOpenBrand?: (brand: string) => void;
}) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const metrics =
    locationId === "etp" ? surfaceMetrics(records) : contextualMetrics(locationId, records);
  const tenantMetricList = tenantMetrics(records, locationId === "etp");

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
          <AnalyticsMetric
            metric={metric}
            key={metric.label}
            analysisOpen={selectedMetric === metric.label}
            onToggleAnalysis={locationId === "etp" ? () => setSelectedMetric((current) => current === metric.label ? null : metric.label) : undefined}
            onOpenMetricLink={onOpenBrand}
          />
        ))}
      </div>

      <div className="analytics-subheading">
        <div>
          <span className="section-kicker">Tenant Mix</span>
          <h2>Marcas y concentración</h2>
        </div>
      </div>
      <div className="analytics-kpi-grid tenant-kpis">
        {tenantMetricList.map((metric) => (
          <AnalyticsMetric
            metric={metric}
            key={metric.label}
            analysisOpen={selectedMetric === metric.label}
            onToggleAnalysis={locationId === "etp" ? () => setSelectedMetric((current) => current === metric.label ? null : metric.label) : undefined}
            onOpenMetricLink={onOpenBrand}
          />
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
