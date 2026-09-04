"use client";

import { useEffect, useState } from "react";
import type { AdvertisingSpaceRecord } from "../types";

interface AdvertisingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (unit: AdvertisingSpaceRecord) => void;
  initialRecord?: AdvertisingSpaceRecord | null;
}

const MEDIA_TYPES = [
  "Video Wall",
  "Tótem Digital",
  "Backlight",
  "Estructura 3D",
  "Muro Gráfico",
  "Tell Exterior",
  "Caja de Luz",
  "Vitral Publicitario",
  "Banda de Reclamo",
  "Kiosko Promocional",
  "Otro",
];

const OPERATING_STATUSES = [
  "Operando",
  "Sin operar",
  "En instalación",
  "Mantenimiento",
  "Disponible",
];

export default function AdvertisingFormModal({
  isOpen,
  onClose,
  onSave,
  initialRecord,
}: AdvertisingFormModalProps) {
  const [idUnidad, setIdUnidad] = useState("");
  const [codigoNomenclatura, setCodigoNomenclatura] = useState("");
  const [tipoMedio, setTipoMedio] = useState("Video Wall");
  const [customTipoMedio, setCustomTipoMedio] = useState("");
  const [modulo, setModulo] = useState("A");
  const [nivel, setNivel] = useState("1");
  const [superficie, setSuperficie] = useState<string>("");
  const [ubicacionEspecifica, setUbicacionEspecifica] = useState("");
  const [arrendatario, setArrendatario] = useState("");
  const [contratoId, setContratoId] = useState("");
  const [estatusOperativo, setEstatusOperativo] = useState("Operando");
  const [observaciones, setObservaciones] = useState("");

  const isEditing = Boolean(initialRecord);

  useEffect(() => {
    if (initialRecord) {
      setIdUnidad(initialRecord.id_unidad || "");
      setCodigoNomenclatura(initialRecord.codigo_nomenclatura || "");
      if (MEDIA_TYPES.includes(initialRecord.tipo_medio)) {
        setTipoMedio(initialRecord.tipo_medio);
        setCustomTipoMedio("");
      } else {
        setTipoMedio("Otro");
        setCustomTipoMedio(initialRecord.tipo_medio || "");
      }
      setModulo(initialRecord.modulo || "");
      setNivel(initialRecord.nivel || "1");
      setSuperficie(initialRecord.superficie !== null && initialRecord.superficie !== undefined ? String(initialRecord.superficie) : "");
      setUbicacionEspecifica(initialRecord.ubicacion_especifica || "");
      setArrendatario(initialRecord.arrendatario || "");
      setContratoId(initialRecord.contrato_id || "");
      setEstatusOperativo(initialRecord.estatus_operativo || "Operando");
      setObservaciones(initialRecord.observaciones || "");
    } else {
      setIdUnidad("");
      setCodigoNomenclatura("");
      setTipoMedio("Video Wall");
      setCustomTipoMedio("");
      setModulo("A");
      setNivel("1");
      setSuperficie("");
      setUbicacionEspecifica("");
      setArrendatario("");
      setContratoId("");
      setEstatusOperativo("Operando");
      setObservaciones("");
    }
  }, [initialRecord, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalTipoMedio = tipoMedio === "Otro" ? (customTipoMedio.trim() || "Otro") : tipoMedio;
    const parsedSuperficie = superficie.trim() ? parseFloat(superficie) : null;

    const recordToSave: AdvertisingSpaceRecord = {
      id: initialRecord?.id || Date.now(),
      id_unidad: idUnidad.trim() || `EP-${Date.now().toString().slice(-4)}`,
      codigo_nomenclatura: codigoNomenclatura.trim() || idUnidad.trim(),
      tipo_medio: finalTipoMedio,
      modulo: modulo.trim() || "General",
      nivel: nivel.trim() || "1",
      superficie: isNaN(Number(parsedSuperficie)) ? null : parsedSuperficie,
      ubicacion_especifica: ubicacionEspecifica.trim() || "Terminal de Pasajeros",
      arrendatario: arrendatario.trim() || "Publicidad AIFA",
      contrato_id: contratoId.trim() || "",
      estatus_operativo: estatusOperativo,
      observaciones: observaciones.trim() || null,
      activo: 1,
    };

    onSave(recordToSave);
    onClose();
  };

  return (
    <div className="adv-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="adv-modal-dialog adv-form-dialog" onClick={(e) => e.stopPropagation()}>
        <header className="adv-modal-header">
          <div className="adv-modal-title-wrap">
            <span className="adv-modal-big-icon" aria-hidden="true">
              {isEditing ? "✏️" : "➕"}
            </span>
            <div>
              <span className="adv-modal-kicker">Gestión de Inventario Publicitario (GEP)</span>
              <h2>{isEditing ? `Editar Soporte: ${initialRecord?.id_unidad}` : "Agregar Nuevo Soporte Publicitario"}</h2>
            </div>
          </div>
          <button
            type="button"
            className="adv-modal-close-btn"
            onClick={onClose}
            title="Cerrar formulario"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="adv-crud-form">
          <div className="adv-form-body">
            <div className="adv-form-grid">
              {/* ID Unidad */}
              <div className="adv-form-group">
                <label htmlFor="id_unidad">
                  ID Unidad / Clave Única <span className="req">*</span>
                </label>
                <input
                  id="id_unidad"
                  type="text"
                  required
                  placeholder="Ej. EP-168"
                  value={idUnidad}
                  onChange={(e) => setIdUnidad(e.target.value)}
                  disabled={isEditing}
                />
                <small>Identificador único del soporte publicitario</small>
              </div>

              {/* Código Nomenclatura */}
              <div className="adv-form-group">
                <label htmlFor="codigo_nomenclatura">
                  Código / Nomenclatura <span className="req">*</span>
                </label>
                <input
                  id="codigo_nomenclatura"
                  type="text"
                  required
                  placeholder="Ej. EP-VWSAL01"
                  value={codigoNomenclatura}
                  onChange={(e) => setCodigoNomenclatura(e.target.value)}
                />
                <small>Clave técnica de ubicación y formato</small>
              </div>

              {/* Tipo de Medio */}
              <div className="adv-form-group">
                <label htmlFor="tipo_medio">
                  Tipo de Soporte / Medio <span className="req">*</span>
                </label>
                <select
                  id="tipo_medio"
                  value={tipoMedio}
                  onChange={(e) => setTipoMedio(e.target.value)}
                >
                  {MEDIA_TYPES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                {tipoMedio === "Otro" && (
                  <input
                    type="text"
                    style={{ marginTop: "6px" }}
                    placeholder="Especificar tipo de medio"
                    value={customTipoMedio}
                    onChange={(e) => setCustomTipoMedio(e.target.value)}
                    required
                  />
                )}
              </div>

              {/* Estatus Operativo */}
              <div className="adv-form-group">
                <label htmlFor="estatus_operativo">
                  Estatus Operativo <span className="req">*</span>
                </label>
                <select
                  id="estatus_operativo"
                  value={estatusOperativo}
                  onChange={(e) => setEstatusOperativo(e.target.value)}
                >
                  {OPERATING_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Módulo */}
              <div className="adv-form-group">
                <label htmlFor="modulo">Módulo / Zona</label>
                <input
                  id="modulo"
                  type="text"
                  placeholder="Ej. Módulo G / Salas / Exterior"
                  value={modulo}
                  onChange={(e) => setModulo(e.target.value)}
                />
              </div>

              {/* Nivel */}
              <div className="adv-form-group">
                <label htmlFor="nivel">Nivel</label>
                <input
                  id="nivel"
                  type="text"
                  placeholder="Ej. 1.00 / 0.00 / Mezzanine"
                  value={nivel}
                  onChange={(e) => setNivel(e.target.value)}
                />
              </div>

              {/* Superficie */}
              <div className="adv-form-group">
                <label htmlFor="superficie">Superficie (m²)</label>
                <input
                  id="superficie"
                  type="number"
                  step="0.01"
                  placeholder="Ej. 12.50"
                  value={superficie}
                  onChange={(e) => setSuperficie(e.target.value)}
                />
              </div>

              {/* Arrendatario / Empresa */}
              <div className="adv-form-group">
                <label htmlFor="arrendatario">Empresa / Arrendatario</label>
                <input
                  id="arrendatario"
                  type="text"
                  placeholder="Ej. Vendor Publicidad, S.A. de C.V."
                  value={arrendatario}
                  onChange={(e) => setArrendatario(e.target.value)}
                />
              </div>

              {/* No. Contrato */}
              <div className="adv-form-group">
                <label htmlFor="contrato_id">No. de Contrato Vinculado</label>
                <input
                  id="contrato_id"
                  type="text"
                  placeholder="Ej. AIFA-DCS-SSC-GEP-01-2026"
                  value={contratoId}
                  onChange={(e) => setContratoId(e.target.value)}
                />
              </div>

              {/* Ubicación Específica */}
              <div className="adv-form-group adv-form-full">
                <label htmlFor="ubicacion_especifica">Ubicación Específica</label>
                <input
                  id="ubicacion_especifica"
                  type="text"
                  placeholder="Ej. Frente a Sala de Última Espera 104, Módulo G"
                  value={ubicacionEspecifica}
                  onChange={(e) => setUbicacionEspecifica(e.target.value)}
                />
              </div>

              {/* Observaciones */}
              <div className="adv-form-group adv-form-full">
                <label htmlFor="observaciones">Observaciones Técnicas / Operativas</label>
                <textarea
                  id="observaciones"
                  rows={3}
                  placeholder="Detalles sobre luminarias, estado de pantalla, canalizaciones o acuerdos especiales..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </div>
            </div>
          </div>

          <footer className="adv-form-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              {isEditing ? "Guardar Cambios" : "Registrar Soporte"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
