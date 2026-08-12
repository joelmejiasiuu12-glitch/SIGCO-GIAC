"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Packer } from "docx";
import type { LocalRecord } from "@/app/types";
import {
  buildConsolidatedContractFicha,
  buildLocalContractFicha,
} from "@/app/lib/localContractFicha";
import {
  buildSscReportMatrix,
  buildSscWordDocument,
  REPORT_TITLE,
} from "@/app/lib/sscWordReport";

type Dataset = Record<string, LocalRecord[]>;
type FichaMode = "local" | "contract";

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
  label: string;
};

function normalized(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX");
}

function recordKey(record: LocalRecord) {
  return [
    record.contractLocationId ?? record.contractLocationName ?? "zona",
    record.contractSourceSheet ?? "hoja",
    record.nomenclatura,
    record.contractNumber ?? "sin-contrato",
    record.id,
  ].join("::");
}

function contractSituation(record: LocalRecord) {
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
        const pages = container.querySelectorAll<HTMLElement>("section.docx");
        setPageCount(pages.length);
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
    const pages = documentRef.current?.querySelectorAll<HTMLElement>("section.docx") ?? [];
    pages.forEach((page, index) => {
      page.style.display = index === currentPage ? "block" : "none";
    });
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
  const [generatingFicha, setGeneratingFicha] = useState(false);
  const [preparingPreview, setPreparingPreview] = useState(false);
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

  const reportableRecords = useMemo(
    () => contractRecords.filter((record) => Boolean(record.nomenclatura) && !isHistoricalExcluded(record)),
    [contractRecords],
  );

  const modeRecords = useMemo(
    () => fichaMode === "local"
      ? reportableRecords.filter((record) => !isAgreementRecord(record))
      : reportableRecords,
    [fichaMode, reportableRecords],
  );

  const zones = useMemo(
    () => [...new Set(modeRecords.map((record) => record.contractLocationName ?? "Zona no indicada"))]
      .sort((a, b) => a.localeCompare(b, "es", { numeric: true })),
    [modeRecords],
  );

  const situations = useMemo(
    () => [...new Set(modeRecords.map(contractSituation))]
      .sort((a, b) => a.localeCompare(b, "es", { numeric: true })),
    [modeRecords],
  );

  const fichaOptions = useMemo<FichaOption[]>(() => {
    if (fichaMode === "local") {
      return modeRecords.map((record) => ({
        key: recordKey(record),
        identifier: record.nomenclatura,
        records: [record],
        primary: record,
        label: `${record.nomenclatura} · ${record.marca ?? "Sin marca"} · ${record.contractNumber ?? "Sin contrato"}`,
      }));
    }

    const groups = new Map<string, LocalRecord[]>();
    modeRecords.forEach((record) => {
      const identifier = record.contractNumber
        ?? (isAgreementRecord(record) ? `Convenio · ${record.nomenclatura}` : null);
      if (!identifier) return;
      groups.set(identifier, [...(groups.get(identifier) ?? []), record]);
    });
    return [...groups.entries()].map(([identifier, records]) => ({
      key: `contract::${identifier}`,
      identifier,
      records,
      primary: records[0],
      label: `${identifier} · ${records[0].marca ?? "Sin marca"} · ${records.length} ${records.length === 1 ? "local" : "locales"}`,
    }));
  }, [fichaMode, modeRecords]);

  const filteredOptions = useMemo(() => {
    const term = normalized(query.trim());
    return fichaOptions
      .filter((option) => {
        const recordSituation = contractSituation(option.primary);
        const optionZones = option.records.map((record) => record.contractLocationName ?? "Zona no indicada");
        const haystack = option.records
          .flatMap((record) => [record.nomenclatura, record.marca, record.contractNumber, record.commercialLine, record.manager])
          .join(" ");
        return (!zone || optionZones.includes(zone))
          && (!situation || recordSituation === situation)
          && (!term || normalized(haystack).includes(term));
      })
      .sort((a, b) => a.label.localeCompare(b.label, "es", { numeric: true }));
  }, [fichaOptions, query, situation, zone]);

  const selectedOption = useMemo(
    () => filteredOptions.find((option) => option.key === selectedKey) ?? null,
    [filteredOptions, selectedKey],
  );

  const buildGeneralPreview = async (): Promise<PreparedPreview> => {
    const logoResponse = await fetch("/brand/aifa-logo-vertical-dark.png");
    if (!logoResponse.ok) throw new Error("No se pudo incorporar el logotipo institucional.");
    const logoData = new Uint8Array(await logoResponse.arrayBuffer());
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
    const logoResponse = await fetch("/brand/aifa-logo-horizontal-dark.png");
    if (!logoResponse.ok) throw new Error("No se pudo incorporar el logotipo institucional.");
    const logoData = new Uint8Array(await logoResponse.arrayBuffer());
    const now = new Date();
    const document = fichaMode === "contract"
      ? buildConsolidatedContractFicha(selectedOption.records, logoData, now)
      : buildLocalContractFicha(selectedOption.primary, logoData, now);
    const identifier = fichaMode === "contract" ? selectedOption.identifier : selectedOption.primary.nomenclatura;
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
    setPreparingPreview(true);
    try {
      setPreparedPreview(await buildGeneralPreview());
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible preparar la vista previa.");
    } finally {
      setPreparingPreview(false);
    }
  };

  const openFichaPreview = async () => {
    if (!selectedOption) return;
    setError("");
    setPreparingPreview(true);
    try {
      setPreparedPreview(await buildFichaPreview());
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible preparar la vista previa.");
    } finally {
      setPreparingPreview(false);
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
          {!hasData && <button type="button" className="secondary-button" onClick={onUpload}>Cargar Excel</button>}
          <button type="button" className="secondary-button" disabled={!canGenerateGeneral || preparingPreview} onClick={() => void openGeneralPreview()}>
            {preparingPreview ? "Preparando…" : "Revisar y descargar"}
          </button>
          <button type="button" className="primary-button" disabled={!canGenerateGeneral || generatingGeneral} onClick={() => void generateGeneralReport()}>
            {generatingGeneral ? "Generando Word…" : "Descargar Word"}
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
                <select value={fichaMode} onChange={(event) => { setFichaMode(event.target.value as FichaMode); setSituation(""); setSelectedKey(""); }}>
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
                <span>Buscar local</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => { setQuery(event.target.value); setSelectedKey(""); }}
                  placeholder="Nomenclatura, marca o contrato"
                />
              </label>

              <label className="report-local-selector">
                <span>{fichaMode === "contract" ? "Número de contrato" : "Local"}</span>
                <select value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
                  <option value="">{fichaMode === "contract" ? "Selecciona un contrato" : "Selecciona un local"} ({filteredOptions.length})</option>
                  {filteredOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                </select>
              </label>
            </div>

            {selectedOption ? (
              <div className="report-selected-local">
                <div>
                  <span>{fichaMode === "contract" ? "Contrato seleccionado" : "Local seleccionado"}</span>
                  <strong>{fichaMode === "contract" ? selectedOption.identifier : selectedOption.primary.nomenclatura}</strong>
                  <small>{selectedOption.primary.marca ?? "Sin marca asignada"} · {selectedOption.primary.contractLocationName ?? "Zona no indicada"}</small>
                </div>
                <div>
                  <span>{fichaMode === "contract" ? "Locales relacionados" : "Contrato"}</span>
                  <strong>{fichaMode === "contract" ? selectedOption.records.length : selectedOption.primary.contractNumber ?? "Sin número"}</strong>
                  <small>{contractSituation(selectedOption.primary)}</small>
                </div>
                <div className="report-selected-actions">
                  <button type="button" className="secondary-button" disabled={preparingPreview} onClick={() => void openFichaPreview()}>
                    {preparingPreview ? "Preparando…" : "Revisar y descargar"}
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
