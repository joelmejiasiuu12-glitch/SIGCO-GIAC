"use client";

import { useMemo, useState } from "react";
import { Packer } from "docx";
import type { LocalRecord } from "@/app/types";
import {
  buildSscReportMatrix,
  buildSscWordDocument,
  REPORT_TITLE,
} from "@/app/lib/sscWordReport";

type Dataset = Record<string, LocalRecord[]>;

export default function ReportsCenter({ datasets, onUpload }: {
  datasets: Dataset;
  onUpload: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const matrix = useMemo(() => buildSscReportMatrix(datasets.etp ?? []), [datasets]);
  const hasData = matrix.sourceTotal > 0;
  const canGenerate = matrix.classifiedTotal > 0;

  const generate = async () => {
    setError("");
    setGenerating(true);
    try {
      const logoResponse = await fetch("/brand/aifa-logo-vertical-dark.png");
      if (!logoResponse.ok) throw new Error("No se pudo incorporar el logotipo institucional.");
      const logoData = new Uint8Array(await logoResponse.arrayBuffer());
      const now = new Date();
      const document = buildSscWordDocument(matrix, logoData, now);
      const blob = await Packer.toBlob(document);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `SIGCO_Distribucion_Estatus_SSC_${now.toISOString().slice(0, 10)}.docx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No fue posible generar el documento Word.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className="reports-center reports-center-simple" id="reportes" aria-label="Centro de Reportes">
      <article className="report-download-card">
        <div className="report-download-identification">
          <span className="report-word-mark" aria-hidden="true">DOCX</span>
          <h2>{REPORT_TITLE}</h2>
        </div>
        <div className="report-download-actions">
          {!hasData && <button type="button" className="secondary-button" onClick={onUpload}>Cargar Excel</button>}
          <button type="button" className="primary-button" disabled={!canGenerate || generating} onClick={generate}>
            {generating ? "Generando Word…" : "Descargar Word"}
          </button>
        </div>
      </article>
      {error && <div className="report-error" role="alert">{error}</div>}
    </section>
  );
}
