"use client";

import { useEffect, useState } from "react";
import { locationOptions, type LocalRecord } from "../types";

type LocalFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: LocalRecord) => void;
  initialRecord?: LocalRecord | null;
  defaultLocationId: string;
};

export default function LocalFormModal({
  isOpen,
  onClose,
  onSave,
  initialRecord,
  defaultLocationId,
}: LocalFormModalProps) {
  const isEditing = Boolean(initialRecord);

  // Form State
  const [locationId, setLocationId] = useState(defaultLocationId);
  const [nomenclatura, setNomenclatura] = useState("");
  const [metraje, setMetraje] = useState<string>("");
  const [lado, setLado] = useState("Tierra");
  const [area, setArea] = useState("Salidas");
  const [modulo, setModulo] = useState("Módulo A");
  const [areaComercial, setAreaComercial] = useState("Local");
  const [estatus, setEstatus] = useState("DISPONIBLE");
  const [giroOperativo, setGiroOperativo] = useState("");
  const [marca, setMarca] = useState("");
  const [monthlyRent, setMonthlyRent] = useState<string>("");
  const [observaciones, setObservaciones] = useState("");

  const [errors, setErrors] = useState<{ nomenclatura?: string; metraje?: string }>({});

  useEffect(() => {
    if (isOpen) {
      if (initialRecord) {
        setLocationId(initialRecord.contractLocationId ?? defaultLocationId);
        setNomenclatura(initialRecord.nomenclatura ?? "");
        setMetraje(initialRecord.metraje !== null ? String(initialRecord.metraje) : "");
        setLado(initialRecord.lado ?? "Tierra");
        setArea(initialRecord.area ?? "Salidas");
        setModulo(initialRecord.modulo ?? "Módulo A");
        setAreaComercial(initialRecord.areaComercial ?? "Local");
        setEstatus(initialRecord.estatus ?? "DISPONIBLE");
        setGiroOperativo(initialRecord.giroOperativo ?? "");
        setMarca(initialRecord.marca ?? "");
        setMonthlyRent(initialRecord.monthlyRent !== null ? String(initialRecord.monthlyRent) : "");
        setObservaciones(initialRecord.observaciones ?? "");
      } else {
        setLocationId(defaultLocationId);
        setNomenclatura("");
        setMetraje("");
        setLado("Tierra");
        setArea("Salidas");
        setModulo("Módulo A");
        setAreaComercial("Local");
        setEstatus("DISPONIBLE");
        setGiroOperativo("");
        setMarca("");
        setMonthlyRent("");
        setObservaciones("");
      }
      setErrors({});
    }
  }, [isOpen, initialRecord, defaultLocationId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { nomenclatura?: string; metraje?: string } = {};

    if (!nomenclatura.trim()) {
      newErrors.nomenclatura = "La nomenclatura es obligatoria (ej. ETP-L1-001).";
    }

    const numMetraje = parseFloat(metraje);
    if (metraje !== "" && (isNaN(numMetraje) || numMetraje <= 0)) {
      newErrors.metraje = "El metraje debe ser un número mayor a 0.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const targetLoc = locationOptions.find((l) => l.id === locationId);
    const numRent = monthlyRent ? parseFloat(monthlyRent) : null;

    const recordToSave: LocalRecord = {
      id: initialRecord ? initialRecord.id : Date.now(),
      nomenclatura: nomenclatura.trim(),
      lado: lado.trim() || "Tierra",
      area: area.trim() || "Salidas",
      modulo: modulo.trim() || "Módulo A",
      metraje: metraje !== "" ? parseFloat(metraje) : null,
      metrajeOriginal: metraje !== "" ? parseFloat(metraje) : null,
      areaComercial: areaComercial.trim() || "Local",
      nivel: 1,
      estatus: estatus,
      situacion: estatus === "DISPONIBLE" ? "Vacante" : "Ocupado",
      marca: marca.trim() || null,
      subdireccion: initialRecord?.subdireccion ?? null,
      gerencia: initialRecord?.gerencia ?? null,
      giroIata: giroOperativo.trim() || null,
      giroOperativo: giroOperativo.trim() || null,
      giroIndaabin: giroOperativo.trim() || null,
      observaciones: observaciones.trim() || null,
      fechaFormalizacion: initialRecord?.fechaFormalizacion ?? null,
      fechaConclusion: initialRecord?.fechaConclusion ?? null,
      contractNumber: initialRecord?.contractNumber ?? null,
      contractPending: initialRecord?.contractPending ?? false,
      commercialLine: initialRecord?.commercialLine ?? null,
      commercialSubline: initialRecord?.commercialSubline ?? null,
      costPerM2: initialRecord?.costPerM2 ?? null,
      monthlyRent: numRent,
      participationRate: initialRecord?.participationRate ?? null,
      participationNotes: initialRecord?.participationNotes ?? null,
      operationsStartDate: initialRecord?.operationsStartDate ?? null,
      signatureDate: initialRecord?.signatureDate ?? null,
      contractTerm: initialRecord?.contractTerm ?? null,
      renewalDate: initialRecord?.renewalDate ?? null,
      guaranteeStatus: initialRecord?.guaranteeStatus ?? null,
      liabilityPolicyStatus: initialRecord?.liabilityPolicyStatus ?? null,
      projectStatus: initialRecord?.projectStatus ?? null,
      contractStatus: initialRecord?.contractStatus ?? null,
      operationalStatus: initialRecord?.operationalStatus ?? null,
      contactData: initialRecord?.contactData ?? null,
      manager: initialRecord?.manager ?? null,
      contractStage: initialRecord?.contractStage ?? null,
      contractSourceSheet: targetLoc?.name ?? "Zona Comercial",
      contractLocationName: targetLoc?.name ?? "Zona Comercial",
      contractLocationId: locationId,
    };

    onSave(recordToSave);
    onClose();
  };

  const selectedLocOption = locationOptions.find((l) => l.id === locationId);

  return (
    <div className="local-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="local-modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="local-modal-header">
          <div>
            <span className="section-kicker">
              {isEditing ? "Edición de espacio comercial" : "Alta de espacio comercial"}
            </span>
            <h2>{isEditing ? `Editar Local ${initialRecord?.nomenclatura}` : "➕ Registrar Nuevo Local"}</h2>
            <small>Zona activa: <b>{selectedLocOption?.name}</b></small>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar ventana">
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="local-modal-form">
          <div className="form-grid">

            {/* Zona Comercial */}
            <div className="form-group full-width">
              <label htmlFor="locationId">Zona Comercial de Adscripción *</label>
              <select
                id="locationId"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="form-control"
              >
                {locationOptions.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Nomenclatura */}
            <div className="form-group">
              <label htmlFor="nomenclatura">Nomenclatura / Código *</label>
              <input
                id="nomenclatura"
                type="text"
                value={nomenclatura}
                onChange={(e) => setNomenclatura(e.target.value)}
                placeholder="Ej. ETP-L1-001"
                className={`form-control ${errors.nomenclatura ? "is-invalid" : ""}`}
              />
              {errors.nomenclatura && <span className="error-text">{errors.nomenclatura}</span>}
            </div>

            {/* Metraje */}
            <div className="form-group">
              <label htmlFor="metraje">Metraje ($m^2$)</label>
              <input
                id="metraje"
                type="number"
                step="0.01"
                value={metraje}
                onChange={(e) => setMetraje(e.target.value)}
                placeholder="Ej. 45.50"
                className={`form-control ${errors.metraje ? "is-invalid" : ""}`}
              />
              {errors.metraje && <span className="error-text">{errors.metraje}</span>}
            </div>

            {/* Lado */}
            <div className="form-group">
              <label htmlFor="lado">Lado / Sector</label>
              <input
                id="lado"
                type="text"
                value={lado}
                onChange={(e) => setLado(e.target.value)}
                placeholder="Ej. Aire, Tierra, Pública"
                className="form-control"
              />
            </div>

            {/* Área */}
            <div className="form-group">
              <label htmlFor="area">Área</label>
              <input
                id="area"
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Ej. Salidas, Llegadas, Mezzanine"
                className="form-control"
              />
            </div>

            {/* Módulo */}
            <div className="form-group">
              <label htmlFor="modulo">Módulo</label>
              <input
                id="modulo"
                type="text"
                value={modulo}
                onChange={(e) => setModulo(e.target.value)}
                placeholder="Ej. Módulo A, Módulo J"
                className="form-control"
              />
            </div>

            {/* Tipo de Espacio */}
            <div className="form-group">
              <label htmlFor="areaComercial">Tipo de Espacio / Formato</label>
              <select
                id="areaComercial"
                value={areaComercial}
                onChange={(e) => setAreaComercial(e.target.value)}
                className="form-control"
              >
                <option value="Local">Local</option>
                <option value="Isla">Isla</option>
                <option value="Bodega">Bodega</option>
                <option value="Terraza">Terraza</option>
                <option value="Mezzanine">Mezzanine</option>
                <option value="Cajero">Cajero</option>
                <option value="Kiosco">Kiosco</option>
              </select>
            </div>

            {/* Estatus Físico */}
            <div className="form-group">
              <label htmlFor="estatus">Estatus Físico / Comercial *</label>
              <select
                id="estatus"
                value={estatus}
                onChange={(e) => setEstatus(e.target.value)}
                className="form-control"
              >
                <option value="DISPONIBLE">Disponible (Vacante)</option>
                <option value="EN FUNCIONAMIENTO">En Funcionamiento (Operando)</option>
                <option value="EN ADAPTACION">En Adaptación / Entrega</option>
                <option value="FORMALIZADO">Formalizado (Sin adaptación)</option>
                <option value="EN PROCESO DE ASIGNACION">En Proceso de Asignación</option>
              </select>
            </div>

            {/* Giro Operativo */}
            <div className="form-group">
              <label htmlFor="giroOperativo">Giro Operativo</label>
              <input
                id="giroOperativo"
                type="text"
                value={giroOperativo}
                onChange={(e) => setGiroOperativo(e.target.value)}
                placeholder="Ej. Alimentos y Bebidas, Souvenirs"
                className="form-control"
              />
            </div>

            {/* Marca Inquilina */}
            <div className="form-group">
              <label htmlFor="marca">Marca / Inquilino</label>
              <input
                id="marca"
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Ej. Starbucks, Sanborns"
                className="form-control"
              />
            </div>

            {/* Renta Mensual */}
            <div className="form-group">
              <label htmlFor="monthlyRent">Renta Mensual Estimada ($ MXN)</label>
              <input
                id="monthlyRent"
                type="number"
                step="1"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                placeholder="Ej. 45000"
                className="form-control"
              />
            </div>

            {/* Observaciones */}
            <div className="form-group full-width">
              <label htmlFor="observaciones">Observaciones</label>
              <textarea
                id="observaciones"
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Detalles adicionales sobre la infraestructura, contrato o entrega..."
                className="form-control"
              />
            </div>

          </div>

          <footer className="local-modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save">
              {isEditing ? "💾 Guardar Cambios" : "➕ Crear Local"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
