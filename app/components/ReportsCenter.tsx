"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Packer } from "docx";
import { locationOptions, type LocalRecord } from "@/app/types";
import {
  buildConsolidatedContractFicha,
  buildLocalContractFicha,
} from "@/app/lib/localContractFicha";
import {
  buildSscReportMatrix,
  buildSscWordDocument,
  buildAvailableLocalesWordDocument,
  buildZonesWordDocument,
  buildUnizonaWordDocument,
  buildFinancialVacancyWordDocument,
  buildBcgEtpWordDocument,
  buildContractTimelineWordDocument,
  REPORT_TITLE,
  REPORT_TITLE_AVAILABLE,
  REPORT_TITLE_ZONES,
  REPORT_TITLE_UNIZONA,
  REPORT_TITLE_FINANCIAL_VACANCY,
  REPORT_TITLE_BCG_ETP,
  REPORT_TITLE_CONTRACT_TIMELINE,
  REPORT_TITLE_ZONE_ANALYTICS,
  buildZoneAnalyticsWordDocument,
} from "@/app/lib/sscWordReport";


import { buildContracts } from "./ContractCenter";

type Dataset = Record<string, LocalRecord[]>;
type FichaMode = "local" | "contract";

const UNIZONA_OPTIONS = [
  { id: "etp", name: "ETP", label: "ETP (Edificio Terminal de Pasajeros)" },
  { id: "parque-santa-lucia", name: "Parque Santa Lucía", label: "Parque Santa Lucía" },
  { id: "carga-aduana", name: "Edificio de Servicios", label: "Edificio de Servicios / Aduana" },
  { id: "autobuses-plaza", name: "Terminal Intermodal de Transportación Terrestre", label: "Terminal Intermodal (TITT)" },
  { id: "parque-revolucion", name: "Parque Revolución", label: "Parque Revolución" },
  { id: "ciudad-aeroportuaria", name: "Ciudad Aeroportuaria", label: "Ciudad Aeroportuaria" },
  { id: "calzada-mamuts", name: "Calzada de los Mamuts", label: "Calzada de los Mamuts" },
];

type PreparedPreview = {
  title: string;
  blob: Blob;
  wordFilename: string;
  pdfFilename: string;
};


type FichaOption = {
  key: string;
  identifier: string;
  records: LocalRecord[];
  primary: LocalRecord;
  zone: string;
  label: string;
};

function normalized(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX");
}

function normalizeContractNumber(value: string | null | undefined): string | null {
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

function getRecordZone(record?: LocalRecord | null): string {
  if (!record) return "Zona no indicada";
  
  const raw = record.zonaComercial ?? record.contractLocationName;
  if (raw) {
    const norm = normalized(raw);
    const matched = locationOptions.find(
      (l) =>
        normalized(l.id) === norm ||
        normalized(l.shortName) === norm ||
        normalized(l.name) === norm ||
        (l.id === "etp" && (norm.includes("etp") || norm.includes("terminal de pasajeros") || norm.includes("terminal pasajeros"))) ||
        (l.id === "parque-santa-lucia" && (norm.includes("santa lucia") || norm === "psl")) ||
        (l.id === "carga-aduana" && (norm.includes("aduana") || norm.includes("edificio de servicios") || norm === "carga")) ||
        (l.id === "autobuses-plaza" && (norm.includes("autobuses") || norm.includes("transportacion terrestre") || norm.includes("intermodal") || norm.includes("plaza mexicana") || norm === "titt")) ||
        (l.id === "parque-revolucion" && (norm.includes("revolucion") || norm.includes("glorieta felipe angeles"))) ||
        (l.id === "ciudad-aeroportuaria" && norm.includes("ciudad aeroportuaria")) ||
        (l.id === "calzada-mamuts" && norm.includes("mamut")),
    );
    if (matched) return matched.name;
    return raw.trim();
  }

  if (record.contractLocationId) {
    const loc = locationOptions.find((l) => l.id === record.contractLocationId);
    if (loc) return loc.name;
  }
  
  return "Zona no indicada";
}

function recordKey(record: LocalRecord) {
  return [
    record.contractLocationId ?? record.contractLocationName ?? "zona",
    record.contractSourceSheet ?? "hoja",
    record.nomenclatura ?? "sin-nomenclatura",
    record.contractNumber ?? "sin-contrato",
    record.id,
  ].join("::");
}

function contractSituation(record?: LocalRecord | null) {
  if (!record) return "Sin situación contractual";
  if (record.contractStatus) return record.contractStatus;
  if (record.contractNumber) return "Formalizado";
  if (record.contractPending) return "En preformalización";
  return "Sin situación contractual";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g, "_");
}

function isHistoricalExcluded(record: LocalRecord) {
  if (record.contractStage === "cancelled" || record.contractStage === "expired") return true;
  const status = normalized([record.contractStatus, record.estatus, record.situacion].filter(Boolean).join(" "));
  return status.includes("cancel") || status.includes("fenec");
}

function isAgreementRecord(record: LocalRecord) {
  if (record.contractStage === "agreements") return true;
  const status = normalized([record.contractStatus, record.estatus, record.situacion].filter(Boolean).join(" "));
  return status.includes("convenio");
}

function nextFrame() {
  return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

function DocumentPreviewModal({ preview, onClose }: {
  preview: PreparedPreview;
  onClose: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.8);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [rendering, setRendering] = useState(true);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [renderError, setRenderError] = useState("");

  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pdfGenerating) onClose();
    };
    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, [onClose, pdfGenerating]);

  useEffect(() => {
    let cancelled = false;
    const renderDocument = async () => {
      const container = documentRef.current;
      if (!container) return;
      setRendering(true);
      setRenderError("");
      setPageCount(0);
      setCurrentPage(0);
      container.replaceChildren();
      try {
        const { renderAsync } = await import("docx-preview");
        await renderAsync(preview.blob, container, container, {
          inWrapper: true,
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: false,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          useBase64URL: true,
        });
        if (cancelled) return;
        const pageElements = container.querySelectorAll<HTMLElement>("section.docx, .docx-wrapper > section, .docx-wrapper > div, .docx");
        const pages = pageElements.length ? Array.from(pageElements) : Array.from(container.querySelectorAll<HTMLElement>(".docx-wrapper > *"));
        setPageCount(pages.length || 1);
      } catch (error) {
        if (!cancelled) {
          setRenderError(error instanceof Error ? error.message : "No fue posible mostrar el documento.");
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    };
    void renderDocument();
    return () => { cancelled = true; };
  }, [preview.blob]);

  useEffect(() => {
    const container = documentRef.current;
    if (!container) return;
    const pageElements = container.querySelectorAll<HTMLElement>("section.docx, .docx-wrapper > section, .docx-wrapper > div, .docx");
    const pages = pageElements.length ? Array.from(pageElements) : Array.from(container.querySelectorAll<HTMLElement>(".docx-wrapper > *"));
    if (pages.length > 1) {
      pages.forEach((page, index) => {
        page.style.display = index === currentPage ? "block" : "none";
      });
    } else if (pages.length === 1) {
      pages[0].style.display = "block";
    }
  }, [currentPage, pageCount]);

  const downloadPdf = async () => {
    const container = documentRef.current;
    const viewport = viewportRef.current;
    if (!container || !viewport || !pageCount) return;

    const pages = [...container.querySelectorAll<HTMLElement>("section.docx")];
    const previousDisplays = pages.map((page) => page.style.display);
    const previousZoom = viewport.style.getPropertyValue("--document-preview-zoom");
    setPdfGenerating(true);
    setRenderError("");

    try {
      viewport.style.setProperty("--document-preview-zoom", "1");
      pages.forEach((page) => { page.style.display = "block"; });
      await nextFrame();
      await nextFrame();

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const firstPageRect = pages[0].getBoundingClientRect();
      const pdfWidth = firstPageRect.width * 25.4 / 96;
      const pdfHeight = firstPageRect.height * 25.4 / 96;
      const orientation = pdfWidth > pdfHeight ? "landscape" : "portrait";
      const pdf = new jsPDF({ orientation, unit: "mm", format: [pdfWidth, pdfHeight], compress: true });

      for (let index = 0; index < pages.length; index += 1) {
        const canvas = await html2canvas(pages[index], {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });
        if (index > 0) pdf.addPage([pdfWidth, pdfHeight], orientation);
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.96), "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      }

      pdf.save(preview.pdfFilename);
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : "No fue posible generar el archivo PDF.");
    } finally {
      pages.forEach((page, index) => { page.style.display = previousDisplays[index]; });
      if (previousZoom) viewport.style.setProperty("--document-preview-zoom", previousZoom);
      else viewport.style.removeProperty("--document-preview-zoom");
      setPdfGenerating(false);
    }
  };

  const zoomStyle = { "--document-preview-zoom": String(zoom) } as CSSProperties;

  return (
    <div className="report-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pdfGenerating) onClose(); }}>
      <section className="report-preview-dialog" role="dialog" aria-modal="true" aria-label={preview.title}>
        <header className="report-preview-toolbar">
          <div className="report-preview-title">
            <span>Vista previa del archivo</span>
            <strong>{preview.title}</strong>
          </div>
          <div className="report-preview-toolbar-actions">
            <button type="button" className="secondary-button" disabled={pdfGenerating} onClick={onClose}>Cerrar</button>
            <button type="button" className="secondary-button" disabled={rendering || pdfGenerating} onClick={() => downloadBlob(preview.blob, preview.wordFilename)}>Descargar Word</button>
            <button type="button" className="primary-button" disabled={rendering || pdfGenerating || !pageCount} onClick={() => void downloadPdf()}>
              {pdfGenerating ? "Generando PDF…" : "Descargar PDF"}
            </button>
          </div>
        </header>

        <nav className="report-preview-controls" aria-label="Controles de vista previa">
          <div className="report-preview-zoom-controls">
            <button type="button" aria-label="Reducir zoom" disabled={zoom <= 0.5} onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.1).toFixed(1))))}>−</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" aria-label="Aumentar zoom" disabled={zoom >= 1.4} onClick={() => setZoom((value) => Math.min(1.4, Number((value + 0.1).toFixed(1))))}>+</button>
            <button type="button" className="report-preview-fit" onClick={() => setZoom(0.8)}>Ajustar</button>
          </div>
          <div className="report-preview-page-controls">
            <button type="button" aria-label="Página anterior" disabled={currentPage <= 0} onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}>‹</button>
            <span>Página {pageCount ? currentPage + 1 : 0} de {pageCount}</span>
            <button type="button" aria-label="Página siguiente" disabled={!pageCount || currentPage >= pageCount - 1} onClick={() => setCurrentPage((page) => Math.min(pageCount - 1, page + 1))}>›</button>
          </div>
        </nav>

        <div className="report-preview-stage">
          {rendering && <div className="report-preview-message" role="status">Preparando la vista previa…</div>}
          {renderError && <div className="report-preview-message report-preview-message-error" role="alert">{renderError}</div>}
          <div ref={viewportRef} className="docx-preview-viewport" style={zoomStyle}>
            <div ref={documentRef} className="docx-preview-render" />
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ReportsCenter({
  datasets,
  contractRecords,
  onUpload,
}: {
  datasets: Dataset;
  contractRecords: LocalRecord[];
  onUpload: () => void;
}) {
  const [generatingGeneral, setGeneratingGeneral] = useState(false);
  const [generatingAvailable, setGeneratingAvailable] = useState(false);
  const [generatingZones, setGeneratingZones] = useState(false);
  const [generatingUnizona, setGeneratingUnizona] = useState(false);
  const [generatingFinancialVacancy, setGeneratingFinancialVacancy] = useState(false);
  const [generatingBcgEtp, setGeneratingBcgEtp] = useState(false);
  const [generatingContractTimeline, setGeneratingContractTimeline] = useState(false);
  const [generatingZoneAnalytics, setGeneratingZoneAnalytics] = useState(false);
  const [selectedUnizona, setSelectedUnizona] = useState("etp");
  const [selectedZoneAnalytics, setSelectedZoneAnalytics] = useState("etp");
  const [generatingFicha, setGeneratingFicha] = useState(false);
  const [preparingPreview, setPreparingPreview] = useState<string | null>(null);
  const [preparedPreview, setPreparedPreview] = useState<PreparedPreview | null>(null);
  const [error, setError] = useState("");
  const [fichaMode, setFichaMode] = useState<FichaMode>("local");
  const [zone, setZone] = useState("");
  const [situation, setSituation] = useState("");
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState("");



  const matrix = useMemo(() => buildSscReportMatrix(datasets.etp ?? []), [datasets]);
  const hasData = matrix.sourceTotal > 0;
  const canGenerateGeneral = matrix.classifiedTotal > 0;
  const hasSessionData = useMemo(
    () => Object.values(datasets).flat().length > 0 || contractRecords.length > 0,
    [datasets, contractRecords],
  );

  const allAvailableRecords = useMemo(() => {
    const list: LocalRecord[] = [];
    const datasetList = Object.values(datasets).flat();

    const matchedContractRowIds = new Set<string>();
    
    const nomMap = new Map<string, LocalRecord>();
    const contractMap = new Map<string, LocalRecord>();
    for (const c of contractRecords) {
      if (c.nomenclatura) {
        nomMap.set(normalized(c.nomenclatura), c);
      }
      const cNorm = normalizeContractNumber(c.contractNumber);
      if (cNorm) {
        contractMap.set(cNorm, c);
      }
    }

    for (const rec of datasetList) {
      let contractMatch: LocalRecord | undefined = undefined;
      if (rec.nomenclatura) {
        contractMatch = nomMap.get(normalized(rec.nomenclatura));
      }
      if (!contractMatch && rec.contractNumber) {
        const rNorm = normalizeContractNumber(rec.contractNumber);
        if (rNorm) {
          contractMatch = contractMap.get(rNorm);
        }
      }

      if (contractMatch) {
        matchedContractRowIds.add(String(contractMatch.id));
      }
      list.push(contractMatch ? { 
        ...contractMatch, 
        ...rec, 
        contractLocationId: rec.contractLocationId, 
        contractLocationName: rec.contractLocationName,
        zonaComercial: contractMatch.zonaComercial ?? rec.zonaComercial,
        contractNumber: contractMatch.contractNumber,
        contractStage: contractMatch.contractStage,
        _fromGSC: true,
      } as LocalRecord & { _fromGSC?: boolean } : rec);
    }

    for (const rec of contractRecords) {
      if (rec.id && matchedContractRowIds.has(String(rec.id))) {
        continue;
      }
      const recContractNorm = normalizeContractNumber(rec.contractNumber);
      const isAlreadyCovered = list.some(l => {
        const lContractNorm = normalizeContractNumber(l.contractNumber);
        return lContractNorm && recContractNorm && lContractNorm === recContractNorm;
      });
      if (!isAlreadyCovered && rec.contractNumber) {
        list.push({
          ...rec,
          contractLocationId: rec.contractLocationId ?? "etp",
          contractLocationName: rec.contractLocationName ?? rec.zonaComercial ?? "Zona no indicada",
          _fromGSC: true,
        } as LocalRecord & { _fromGSC?: boolean });
      }
    }

    return list;
  }, [datasets, contractRecords]);

  const reportableRecords = useMemo(
    () => allAvailableRecords.filter((record) => Boolean(record.nomenclatura) || Boolean(record.contractNumber)),
    [allAvailableRecords],
  );

  const modeRecords = useMemo(
    () => (fichaMode === "local"
      ? reportableRecords
      : (contractRecords.length ? contractRecords : reportableRecords).filter((record) => Boolean(record.contractNumber) && !isHistoricalExcluded(record))),
    [fichaMode, reportableRecords, contractRecords],
  );

  const fichaOptions = useMemo<FichaOption[]>(() => {
    if (fichaMode === "local") {
      return modeRecords.map((record) => {
        let zoneName = "Zona no indicada";
        if (record.contractLocationId) {
          const loc = locationOptions.find((l) => l.id === record.contractLocationId);
          if (loc) zoneName = loc.name;
        }
        if (zoneName === "Zona no indicada") {
          zoneName = getRecordZone(record);
        }
        const contractInfo = record.contractNumber
          ? `Contrato: ${record.contractNumber}`
          : (record.contractPending ? "En preformalización" : "Sin contrato");
        return {
          key: recordKey(record),
          identifier: record.nomenclatura,
          records: [record],
          primary: record,
          zone: zoneName,
          label: `${record.nomenclatura} · ${record.marca ?? record.razonSocial ?? "Sin marca"} · ${zoneName} · ${contractInfo}`,
        };
      });
    }

    const sourceRecords = contractRecords.length > 0 ? contractRecords : allAvailableRecords;
    const contractEligible = sourceRecords.filter((r) => Boolean(r.contractNumber));
    const aggregates = buildContracts(contractEligible).filter(
      (contract) => Boolean(contract.contractNumber) &&
        contract.stage !== "cancelled" && contract.stage !== "expired"
    );

    return aggregates.map((contract) => {
      const identifier = contract.contractNumber ?? contract.brand ?? "Sin número";
      const count = contract.locals.length;
      const zoneName = contract.locals[0]
        ? getRecordZone(contract.locals[0])
        : getRecordZone({
            contractLocationName: contract.locationName,
            zonaComercial: contract.zonaComercial,
            contractLocationId: contract.locationId,
          } as LocalRecord);
      const contractLabel = contract.contractNumber ? contract.contractNumber : `Preformalizado (${contract.brand})`;
      const primaryRecord = contract.locals[0] ?? ({
        id: contract.key,
        nomenclatura: identifier,
        marca: contract.brand,
        razonSocial: contract.razonSocial,
        contractNumber: contract.contractNumber,
        contractLocationName: zoneName,
        zonaComercial: zoneName,
        contractStatus: contract.contractStatus,
      } as unknown as LocalRecord);

      return {
        key: `contract::${contract.key}`,
        identifier,
        records: contract.locals.length ? contract.locals : [primaryRecord],
        primary: primaryRecord,
        zone: zoneName,
        label: `${contractLabel} · ${contract.brand} · ${zoneName} · ${count} ${count === 1 ? "local" : "locales"}`,
      };
    });
  }, [fichaMode, modeRecords, allAvailableRecords]);

  const zones = useMemo(() => {
    const list = fichaOptions
      .map((option) => option.zone)
      .filter((z): z is string => Boolean(z) && z !== "Zona no indicada");
    return [...new Set(list)].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  }, [fichaOptions]);

  const situations = useMemo(() => {
    const list = fichaOptions.map((option) => contractSituation(option.primary)).filter(Boolean);
    return [...new Set(list)].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  }, [fichaOptions]);

  const filteredOptions = useMemo(() => {
    const terms = normalized(query.trim()).split(/\s+/).filter(Boolean);
    const selectedZoneNorm = normalized(zone.trim());
    const selectedSitNorm = normalized(situation.trim());

    return fichaOptions
      .filter((option) => {
        const optionZoneNorm = normalized(option.zone);

        const optionSituations = [
          ...option.records.map(contractSituation),
          contractSituation(option.primary),
          option.primary?.contractStatus,
          option.primary?.situacion,
        ].filter(Boolean);

        const haystack = [
          ...option.records.flatMap((record) => [
            record.nomenclatura,
            record.marca,
            record.razonSocial,
            record.contractNumber,
            record.commercialLine,
            record.commercialSubline,
            record.giroOperativo,
            record.giroIata,
            record.manager,
            record.contractLocationName,
            record.zonaComercial,
            record.modulo,
            record.area,
            record.lado,
          ]),
          option.identifier,
          option.label,
        ]
          .filter(Boolean)
          .join(" ");

        const matchesZone =
          !selectedZoneNorm ||
          optionZoneNorm === selectedZoneNorm ||
          (fichaMode === "contract" && option.records.some((r) => normalized(getRecordZone(r)) === selectedZoneNorm));

        const matchesSituation =
          !selectedSitNorm ||
          optionSituations.some((s) => normalized(s) === selectedSitNorm);

        const matchesQuery =
          terms.length === 0 ||
          terms.every((term) => normalized(haystack).includes(term));

        return matchesZone && matchesSituation && matchesQuery;
      })
      .sort((a, b) => a.label.localeCompare(b.label, "es", { numeric: true }));
  }, [fichaOptions, query, situation, zone]);

  useEffect(() => {
    setSelectedKey("");
    setZone("");
    setSituation("");
    setQuery("");
  }, [fichaMode]);

  useEffect(() => {
    setSelectedKey("");
  }, [zone, situation]);

  const selectedOption = useMemo(() => {
    if (selectedKey) {
      const match =
        filteredOptions.find((option) => option.key === selectedKey) ??
        filteredOptions.find(
          (option) =>
            normalized(option.identifier) === normalized(selectedKey) ||
            option.records.some(
              (r) =>
                recordKey(r) === selectedKey ||
                (r.contractNumber && normalizeContractNumber(r.contractNumber) === normalizeContractNumber(selectedKey)) ||
                (r.nomenclatura && normalized(r.nomenclatura) === normalized(selectedKey)),
            ),
        );
      if (match) return match;
    }
    if (query.trim() && filteredOptions.length === 1) {
      return filteredOptions[0];
    }
    return null;
  }, [filteredOptions, selectedKey, query]);

  const safeFetchLogo = async (url = "/brand/aifa-logo-horizontal-dark.png"): Promise<Uint8Array> => {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return new Uint8Array(await response.arrayBuffer());
      }
    } catch {
      // Return empty array on fetch failure
    }
    return new Uint8Array();
  };

  const buildGeneralPreview = async (): Promise<PreparedPreview> => {
    const logoData = await safeFetchLogo("/brand/aifa-logo-vertical-dark.png");
    const now = new Date();
    const document = buildSscWordDocument(matrix, logoData, now);
    const filenameBase = `SIGCO_Distribucion_Estatus_SSC_${now.toISOString().slice(0, 10)}`;
    return {
      title: REPORT_TITLE,
      blob: await Packer.toBlob(document),
      wordFilename: `${filenameBase}.docx`,
      pdfFilename: `${filenameBase}.pdf`,
    };
  };

  const buildFichaPreview = async (): Promise<PreparedPreview> => {
    if (!selectedOption) throw new Error("Selecciona primero el local o contrato.");
    const logoData = await safeFetchLogo("/brand/aifa-logo-horizontal-dark.png");
    const now = new Date();
    const records = selectedOption.records.length ? selectedOption.records : [selectedOption.primary];
    const primary = selectedOption.primary ?? records[0];
    const document = fichaMode === "contract"
      ? buildConsolidatedContractFicha(records, logoData, now)
      : buildLocalContractFicha(primary, logoData, now);
    const identifier = fichaMode === "contract" ? selectedOption.identifier : (primary.nomenclatura ?? selectedOption.identifier);
    const filenameBase = `Ficha_SIGCO_${fichaMode === "contract" ? "Contrato" : "Local"}_${safeFilename(identifier)}_${now.toISOString().slice(0, 10)}`;
    return {
      title: fichaMode === "contract" ? "Ficha consolidada por contrato" : "Ficha ejecutiva del local",
      blob: await Packer.toBlob(document),
      wordFilename: `${filenameBase}.docx`,
      pdfFilename: `${filenameBase}.pdf`,
    };
  };

  const generateGeneralReport = async () => {
    setError("");
    setGeneratingGeneral(true);
    try {
      const generated = await buildGeneralPreview();
      downloadBlob(generated.blob, generated.wordFilename);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible generar el documento Word.");
    } finally {
      setGeneratingGeneral(false);
    }
  };

  const generateFicha = async () => {
    if (!selectedOption) return;
    setError("");
    setGeneratingFicha(true);
    try {
      const generated = await buildFichaPreview();
      downloadBlob(generated.blob, generated.wordFilename);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible generar la ficha del local.");
    } finally {
      setGeneratingFicha(false);
    }
  };

  const openGeneralPreview = async () => {
    setError("");
    setPreparingPreview("general");
    try {
      setPreparedPreview(await buildGeneralPreview());
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible preparar la vista previa.");
    } finally {
      setPreparingPreview(null);
    }
  };

  const openFichaPreview = async () => {
    if (!selectedOption) return;
    setError("");
    setPreparingPreview("ficha");
    try {
      setPreparedPreview(await buildFichaPreview());
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible preparar la vista previa.");
    } finally {
      setPreparingPreview(null);
    }
  };

  const buildAvailablePreview = async (): Promise<PreparedPreview> => {
    const logoData = await safeFetchLogo("/brand/aifa-logo-vertical-dark.png");
    const now = new Date();
    const allSessionRecords = Object.values(datasets).flat().length
      ? Object.values(datasets).flat()
      : contractRecords;
    const document = buildAvailableLocalesWordDocument(allSessionRecords, logoData, now);
    const filenameBase = `SIGCO_Locales_Disponibles_SSC_${now.toISOString().slice(0, 10)}`;
    return {
      title: REPORT_TITLE_AVAILABLE,
      blob: await Packer.toBlob(document),
      wordFilename: `${filenameBase}.docx`,
      pdfFilename: `${filenameBase}.pdf`,
    };
  };

  const generateAvailableReport = async () => {
    setError("");
    setGeneratingAvailable(true);
    try {
      const generated = await buildAvailablePreview();
      downloadBlob(generated.blob, generated.wordFilename);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible generar el reporte de locales disponibles.");
    } finally {
      setGeneratingAvailable(false);
    }
  };

  const openAvailablePreview = async () => {
    setError("");
    setPreparingPreview("available");
    try {
      setPreparedPreview(await buildAvailablePreview());
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible preparar la vista previa.");
    } finally {
      setPreparingPreview(null);
    }
  };

  const buildZonesPreview = async (): Promise<PreparedPreview> => {
    const logoData = await safeFetchLogo("/brand/aifa-logo-vertical-dark.png");
    const now = new Date();
    const allSessionRecords = Object.values(datasets).flat().length
      ? Object.values(datasets).flat()
      : contractRecords;
    const document = buildZonesWordDocument(allSessionRecords, logoData, now);
    const filenameBase = `SIGCO_Locales_7_Zonas_SSC_${now.toISOString().slice(0, 10)}`;
    return {
      title: REPORT_TITLE_ZONES,
      blob: await Packer.toBlob(document),
      wordFilename: `${filenameBase}.docx`,
      pdfFilename: `${filenameBase}.pdf`,
    };
  };

  const generateZonesReport = async () => {
    setError("");
    setGeneratingZones(true);
    try {
      const generated = await buildZonesPreview();
      downloadBlob(generated.blob, generated.wordFilename);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible generar el reporte de locales por zona.");
    } finally {
      setGeneratingZones(false);
    }
  };

  const openZonesPreview = async () => {
    setError("");
    setPreparingPreview("zones");
    try {
      setPreparedPreview(await buildZonesPreview());
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible preparar la vista previa.");
    } finally {
      setPreparingPreview(null);
    }
  };

  const buildUnizonaPreview = async (): Promise<PreparedPreview> => {
    const logoData = await safeFetchLogo("/brand/aifa-logo-vertical-dark.png");
    const now = new Date();
    const allSessionRecords = Object.values(datasets).flat().length
      ? Object.values(datasets).flat()
      : contractRecords;
    const selectedLocation = locationOptions.find((l) => l.id === selectedUnizona);
    const unizonaName = selectedLocation?.shortName ?? selectedUnizona;
    const document = buildUnizonaWordDocument(unizonaName, allSessionRecords, logoData, now);
    const filenameBase = `SIGCO_Dossier_Unizona_${safeFilename(unizonaName)}_${now.toISOString().slice(0, 10)}`;
    return {
      title: `${REPORT_TITLE_UNIZONA}: ${unizonaName}`,
      blob: await Packer.toBlob(document),
      wordFilename: `${filenameBase}.docx`,
      pdfFilename: `${filenameBase}.pdf`,
    };
  };

  const generateUnizonaReport = async () => {
    setError("");
    setGeneratingUnizona(true);
    try {
      const generated = await buildUnizonaPreview();
      downloadBlob(generated.blob, generated.wordFilename);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible generar el dossier unizona.");
    } finally {
      setGeneratingUnizona(false);
    }
  };

  const openUnizonaPreview = async () => {
    setError("");
    setPreparingPreview("unizona");
    try {
      setPreparedPreview(await buildUnizonaPreview());
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible preparar la vista previa.");
    } finally {
      setPreparingPreview(null);
    }
  };

  const buildFinancialVacancyPreview = async (): Promise<PreparedPreview> => {
    const logoData = await safeFetchLogo("/brand/aifa-logo-vertical-dark.png");
    const now = new Date();
    const allSessionRecords = Object.values(datasets).flat().length
      ? Object.values(datasets).flat()
      : contractRecords;
    const document = buildFinancialVacancyWordDocument(allSessionRecords, contractRecords, logoData, now);
    const filenameBase = `SIGCO_Ingreso_Potencial_Vacante_${now.toISOString().slice(0, 10)}`;
    return {
      title: REPORT_TITLE_FINANCIAL_VACANCY,
      blob: await Packer.toBlob(document),
      wordFilename: `${filenameBase}.docx`,
      pdfFilename: `${filenameBase}.pdf`,
    };
  };

  const generateFinancialVacancyReport = async () => {
    setError("");
    setGeneratingFinancialVacancy(true);
    try {
      const generated = await buildFinancialVacancyPreview();
      downloadBlob(generated.blob, generated.wordFilename);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible generar el informe de ingreso potencial vacante.");
    } finally {
      setGeneratingFinancialVacancy(false);
    }
  };

  const openFinancialVacancyPreview = async () => {
    setError("");
    setPreparingPreview("financialVacancy");
    try {
      setPreparedPreview(await buildFinancialVacancyPreview());
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible preparar la vista previa.");
    } finally {
      setPreparingPreview(null);
    }
  };

  const buildBcgEtpPreview = async (): Promise<PreparedPreview> => {
    const logoData = await safeFetchLogo("/brand/aifa-logo-vertical-dark.png");
    const now = new Date();
    const allSessionRecords = Object.values(datasets).flat().length
      ? Object.values(datasets).flat()
      : contractRecords;
    const document = buildBcgEtpWordDocument(allSessionRecords, contractRecords, logoData, now);
    const filenameBase = `SIGCO_Matriz_BCG_ETP_${now.toISOString().slice(0, 10)}`;
    return {
      title: REPORT_TITLE_BCG_ETP,
      blob: await Packer.toBlob(document),
      wordFilename: `${filenameBase}.docx`,
      pdfFilename: `${filenameBase}.pdf`,
    };
  };

  const generateBcgEtpReport = async () => {
    setError("");
    setGeneratingBcgEtp(true);
    try {
      const generated = await buildBcgEtpPreview();
      downloadBlob(generated.blob, generated.wordFilename);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible generar la matriz BCG del ETP.");
    } finally {
      setGeneratingBcgEtp(false);
    }
  };

  const openBcgEtpPreview = async () => {
    setError("");
    setPreparingPreview("bcgEtp");
    try {
      setPreparedPreview(await buildBcgEtpPreview());
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible preparar la vista previa.");
    } finally {
      setPreparingPreview(null);
    }
  };

  const buildContractTimelinePreview = async (): Promise<PreparedPreview> => {
    const logoData = await safeFetchLogo("/brand/aifa-logo-vertical-dark.png");
    const now = new Date();
    const allSessionRecords = Object.values(datasets).flat().length
      ? Object.values(datasets).flat()
      : contractRecords;
    const document = buildContractTimelineWordDocument(allSessionRecords, contractRecords, logoData, now);
    const filenameBase = `SIGCO_Vencimientos_Contractuales_${now.toISOString().slice(0, 10)}`;
    return {
      title: REPORT_TITLE_CONTRACT_TIMELINE,
      blob: await Packer.toBlob(document),
      wordFilename: `${filenameBase}.docx`,
      pdfFilename: `${filenameBase}.pdf`,
    };
  };

  const generateContractTimelineReport = async () => {
    setError("");
    setGeneratingContractTimeline(true);
    try {
      const generated = await buildContractTimelinePreview();
      downloadBlob(generated.blob, generated.wordFilename);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible generar el reporte de vencimientos.");
    } finally {
      setGeneratingContractTimeline(false);
    }
  };

  const openContractTimelinePreview = async () => {
    setError("");
    setPreparingPreview("contractTimeline");
    try {
      setPreparedPreview(await buildContractTimelinePreview());
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible preparar la vista previa.");
    } finally {
      setPreparingPreview(null);
    }
  };

  const buildZoneAnalyticsPreview = async (): Promise<PreparedPreview> => {
    const logoData = await safeFetchLogo("/brand/aifa-logo-vertical-dark.png");
    const now = new Date();
    const allSessionRecords = Object.values(datasets).flat().length
      ? Object.values(datasets).flat()
      : contractRecords;
    const document = buildZoneAnalyticsWordDocument(selectedZoneAnalytics, allSessionRecords, logoData, now);
    const filenameBase = `SIGCO_Analitica_Zona_${safeFilename(selectedZoneAnalytics)}_${now.toISOString().slice(0, 10)}`;
    return {
      title: `${REPORT_TITLE_ZONE_ANALYTICS}: ${locationOptions.find((l) => l.id === selectedZoneAnalytics)?.shortName ?? selectedZoneAnalytics}`,
      blob: await Packer.toBlob(document),
      wordFilename: `${filenameBase}.docx`,
      pdfFilename: `${filenameBase}.pdf`,
    };
  };

  const generateZoneAnalyticsReport = async () => {
    setError("");
    setGeneratingZoneAnalytics(true);
    try {
      const generated = await buildZoneAnalyticsPreview();
      downloadBlob(generated.blob, generated.wordFilename);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible generar el dictamen.");
    } finally {
      setGeneratingZoneAnalytics(false);
    }
  };

  const openZoneAnalyticsPreview = async () => {
    setError("");
    setPreparingPreview("zoneAnalytics");
    try {
      setPreparedPreview(await buildZoneAnalyticsPreview());
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible preparar la vista previa.");
    } finally {
      setPreparingPreview(null);
    }
  };

  return (
    <section className="reports-center reports-center-simple" id="reportes" aria-label="Centro de Reportes">
      <article className="report-download-card">
        <div className="report-download-identification">
          <span className="report-word-mark" aria-hidden="true">DOCX</span>
          <div>
            <span className="report-card-eyebrow">Reporte general</span>
            <h2>{REPORT_TITLE}</h2>
          </div>
        </div>
        <div className="report-download-actions">
          <button type="button" className="secondary-button" disabled={!canGenerateGeneral || preparingPreview === "general"} onClick={() => void openGeneralPreview()}>
            {preparingPreview === "general" ? "Preparando…" : "Revisar y descargar"}
          </button>
          <button type="button" className="primary-button" disabled={!canGenerateGeneral || generatingGeneral} onClick={() => void generateGeneralReport()}>
            {generatingGeneral ? "Generando Word…" : "Descargar Word"}
          </button>
        </div>
      </article>

      <article className="report-download-card">
        <div className="report-download-identification">
          <span className="report-word-mark" aria-hidden="true">DOCX</span>
          <div>
            <span className="report-card-eyebrow">Reporte especializado de disponibilidad</span>
            <h2>{REPORT_TITLE_AVAILABLE}</h2>
          </div>
        </div>
        <div className="report-download-actions">
          <button type="button" className="secondary-button" disabled={preparingPreview === "available"} onClick={() => void openAvailablePreview()}>
            {preparingPreview === "available" ? "Preparando…" : "Revisar y descargar"}
          </button>
          <button type="button" className="primary-button" disabled={generatingAvailable} onClick={() => void generateAvailableReport()}>
            {generatingAvailable ? "Generando Word…" : "Descargar Word"}
          </button>
        </div>
      </article>

      <article className="report-download-card">
        <div className="report-download-identification">
          <span className="report-word-mark" aria-hidden="true">DOCX</span>
          <div>
            <span className="report-card-eyebrow">Reporte integral de inventario</span>
            <h2>{REPORT_TITLE_ZONES}</h2>
          </div>
        </div>
        <div className="report-download-actions">
          <button type="button" className="secondary-button" disabled={preparingPreview === "zones"} onClick={() => void openZonesPreview()}>
            {preparingPreview === "zones" ? "Preparando…" : "Revisar y descargar"}
          </button>
          <button type="button" className="primary-button" disabled={generatingZones} onClick={() => void generateZonesReport()}>
            {generatingZones ? "Generando Word…" : "Descargar Word"}
          </button>
        </div>
      </article>

      <article className="report-download-card">
        <div className="report-download-identification">
          <span className="report-word-mark" aria-hidden="true">DOCX</span>
          <div>
            <span className="report-card-eyebrow">Reporte individual por polígono</span>
            <h2>{REPORT_TITLE_UNIZONA} ({locationOptions.find((l) => l.id === selectedUnizona)?.shortName ?? selectedUnizona})</h2>
          </div>
        </div>
        <div className="report-download-actions" style={{ flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          <select
            className="report-unizona-select"
            value={selectedUnizona}
            onChange={(e) => setSelectedUnizona(e.target.value)}
            aria-label="Seleccionar zona comercial para el dossier"
          >
            {locationOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.shortName}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="secondary-button"
            disabled={preparingPreview === "unizona"}
            onClick={() => void openUnizonaPreview()}
          >
            {preparingPreview === "unizona" ? "Preparando…" : "Revisar y descargar"}
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={generatingUnizona}
            onClick={() => void generateUnizonaReport()}
          >
            {generatingUnizona ? "Generando Word…" : "Descargar Word"}
          </button>
        </div>
      </article>

      <article className="report-download-card">
        <div className="report-download-identification">
          <span className="report-word-mark" aria-hidden="true">DOCX</span>
          <div>
            <span className="report-card-eyebrow">Impacto financiero por metro cuadrado</span>
            <h2>{REPORT_TITLE_FINANCIAL_VACANCY}</h2>
          </div>
        </div>
        <div className="report-download-actions">
          <button type="button" className="secondary-button" disabled={preparingPreview === "financialVacancy"} onClick={() => void openFinancialVacancyPreview()}>
            {preparingPreview === "financialVacancy" ? "Preparando…" : "Revisar y descargar"}
          </button>
          <button type="button" className="primary-button" disabled={generatingFinancialVacancy} onClick={() => void generateFinancialVacancyReport()}>
            {generatingFinancialVacancy ? "Generando Word…" : "Descargar Word"}
          </button>
        </div>
      </article>

      <article className="report-download-card">
        <div className="report-download-identification">
          <span className="report-word-mark" aria-hidden="true">DOCX</span>
          <div>
            <span className="report-card-eyebrow">Diagnóstico y estrategia comercial ETP</span>
            <h2>{REPORT_TITLE_BCG_ETP}</h2>
          </div>
        </div>
        <div className="report-download-actions">
          <button type="button" className="secondary-button" disabled={preparingPreview === "bcgEtp"} onClick={() => void openBcgEtpPreview()}>
            {preparingPreview === "bcgEtp" ? "Preparando…" : "Revisar y descargar"}
          </button>
          <button type="button" className="primary-button" disabled={generatingBcgEtp} onClick={() => void generateBcgEtpReport()}>
            {generatingBcgEtp ? "Generando Word…" : "Descargar Word"}
          </button>
        </div>
      </article>

      <article className="report-download-card">
        <div className="report-download-identification">
          <span className="report-word-mark" aria-hidden="true">DOCX</span>
          <div>
            <span className="report-card-eyebrow">Alertas de cartera y renovaciones</span>
            <h2>{REPORT_TITLE_CONTRACT_TIMELINE}</h2>
          </div>
        </div>
        <div className="report-download-actions">
          <button type="button" className="secondary-button" disabled={preparingPreview === "contractTimeline"} onClick={() => void openContractTimelinePreview()}>
            {preparingPreview === "contractTimeline" ? "Preparando…" : "Revisar y descargar"}
          </button>
          <button type="button" className="primary-button" disabled={generatingContractTimeline} onClick={() => void generateContractTimelineReport()}>
            {generatingContractTimeline ? "Generando Word…" : "Descargar Word"}
          </button>
        </div>
      </article>

      <article className="report-download-card">
        <div className="report-download-identification">
          <span className="report-word-mark" aria-hidden="true">DOCX</span>
          <div>
            <span className="report-card-eyebrow">Métricas e interpretación</span>
            <h2>{REPORT_TITLE_ZONE_ANALYTICS}</h2>
          </div>
        </div>
        <div className="report-download-actions" style={{ flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          <select
            className="report-unizona-select"
            value={selectedZoneAnalytics}
            onChange={(e) => setSelectedZoneAnalytics(e.target.value)}
            aria-label="Seleccionar zona para reporte analítico"
          >
            <option value="all">Todas las zonas comerciales</option>
            {locationOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.shortName}
              </option>
            ))}
          </select>
          <button type="button" className="secondary-button" disabled={preparingPreview === "zoneAnalytics"} onClick={() => void openZoneAnalyticsPreview()}>
            {preparingPreview === "zoneAnalytics" ? "Preparando…" : "Revisar y descargar"}
          </button>
          <button type="button" className="primary-button" disabled={generatingZoneAnalytics} onClick={() => void generateZoneAnalyticsReport()}>
            {generatingZoneAnalytics ? "Generando Word…" : "Descargar Word"}
          </button>
        </div>
      </article>

      <article className="report-ficha-card">
        <header className="report-ficha-heading">
          <div>
            <span className="report-card-eyebrow">Consulta documental</span>
            <h2>Fichas ejecutivas de locales y contratos</h2>
            <p>Selecciona el tipo de ficha, filtra la base y revisa el documento antes de descargarlo en Word o PDF.</p>
          </div>
          <span className="report-ficha-mark" aria-hidden="true">FICHA</span>
        </header>


        {reportableRecords.length ? (
          <>
            <div className="report-document-filters">
              <label className="report-mode-selector">
                <span>Tipo de ficha</span>
                <select
                  value={fichaMode}
                  onChange={(event) => {
                    setFichaMode(event.target.value as FichaMode);
                    setZone("");
                    setSituation("");
                    setQuery("");
                    setSelectedKey("");
                  }}
                >
                  <option value="local">Ficha por local</option>
                  <option value="contract">Ficha consolidada por contrato</option>
                </select>
              </label>

              <label>
                <span>Zona comercial</span>
                <select value={zone} onChange={(event) => { setZone(event.target.value); setSelectedKey(""); }}>
                  <option value="">Todas las zonas</option>
                  {zones.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>

              <label>
                <span>Situación del contrato</span>
                <select value={situation} onChange={(event) => { setSituation(event.target.value); setSelectedKey(""); }}>
                  <option value="">Todas las situaciones</option>
                  {situations.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>

              <label className="report-search-field">
                <span>{fichaMode === "contract" ? "Buscar contrato, marca o razón social" : "Buscar local, marca o contrato"}</span>
                <div className="report-search-input-wrap">
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                    }}
                    placeholder={fichaMode === "contract" ? "Número de contrato, marca o razón social" : "Nomenclatura, marca o contrato"}
                  />
                  {query && (
                    <button
                      type="button"
                      className="report-search-clear"
                      onClick={() => setQuery("")}
                      aria-label="Limpiar búsqueda"
                    >
                      ×
                    </button>
                  )}
                </div>
              </label>

              <label className="report-local-selector">
                <span>{fichaMode === "contract" ? "Número de contrato" : "Local comercial"}</span>
                <select
                  value={selectedOption ? selectedOption.key : ""}
                  onChange={(event) => setSelectedKey(event.target.value)}
                >
                  <option value="">
                    {filteredOptions.length === 0
                      ? "Sin resultados para los filtros actuales"
                      : fichaMode === "contract"
                      ? `Selecciona un contrato (${filteredOptions.length} disponibles)`
                      : `Selecciona un local (${filteredOptions.length} disponibles)`}
                  </option>
                  {filteredOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {filteredOptions.length === 0 && (
              <div className="report-no-results">
                <p>No se encontraron {fichaMode === "contract" ? "contratos" : "locales"} con los filtros actuales.</p>
                {(query || zone || situation) && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setQuery("");
                      setZone("");
                      setSituation("");
                      setSelectedKey("");
                    }}
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}

            {selectedOption ? (
              <div className="report-selected-local">
                <div>
                  <span>{fichaMode === "contract" ? "Contrato seleccionado" : "Local seleccionado"}</span>
                  <strong>{fichaMode === "contract" ? selectedOption.identifier : (selectedOption.primary?.nomenclatura ?? selectedOption.identifier)}</strong>
                  <small>{selectedOption.primary?.marca ?? selectedOption.primary?.razonSocial ?? "Sin marca asignada"} · {getRecordZone(selectedOption.primary)}</small>
                </div>
                <div>
                  <span>{fichaMode === "contract" ? "Locales relacionados" : "Contrato"}</span>
                  <strong>{fichaMode === "contract" ? selectedOption.records.length : (selectedOption.primary?.contractNumber ?? "Sin número")}</strong>
                  <small>{contractSituation(selectedOption.primary)}</small>
                </div>
                <div className="report-selected-actions">
                  <button type="button" className="secondary-button" disabled={preparingPreview === "ficha"} onClick={() => void openFichaPreview()}>
                    {preparingPreview === "ficha" ? "Preparando…" : "Revisar y descargar"}
                  </button>
                  <button type="button" className="primary-button" disabled={generatingFicha} onClick={() => void generateFicha()}>
                    {generatingFicha ? "Generando ficha…" : fichaMode === "contract" ? "Descargar ficha consolidada" : "Descargar ficha Word"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="report-selection-help">
                {fichaMode === "contract"
                  ? "Selecciona un número de contrato para consolidar sus locales y habilitar la descarga."
                  : "Selecciona un local para habilitar la descarga de la ficha."}
              </div>
            )}
          </>
        ) : (
          <div className="report-selection-empty">
            <p>No hay locales cargados para generar fichas.</p>
            <button type="button" className="secondary-button" onClick={onUpload}>Cargar Excel</button>
          </div>
        )}
      </article>

      {error && <div className="report-error" role="alert">{error}</div>}

      {preparedPreview && (
        <DocumentPreviewModal preview={preparedPreview} onClose={() => setPreparedPreview(null)} />
      )}
    </section>
  );
}
