"use client";

import { useEffect, useState } from "react";
import { locationOptions, type ContractStage, type LocalRecord } from "../types";

type ContractFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: LocalRecord) => void;
  initialRecord?: LocalRecord | null;
  defaultLocationId: string;
  availableLocals?: string[];
};

export default function ContractFormModal({
  isOpen,
  onClose,
  onSave,
  initialRecord,
  defaultLocationId,
  availableLocals = [],
}: ContractFormModalProps) {
  const isEditing = Boolean(initialRecord);

  // Form State
  const [contractNumber, setContractNumber] = useState("");
  const [gerencia, setGerencia] = useState("Gerencia de Servicios Comerciales");
  const [contractStage, setContractStage] = useState<ContractStage>("formalized");
  const [contractStatus, setContractStatus] = useState("OPERANDO");
  const [manager, setManager] = useState("");

  // Commercial & Tenant
  const [marca, setMarca] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [giroOperativo, setGiroOperativo] = useState("RETAIL");
  const [giroIata, setGiroIata] = useState("");
  const [giroIndaabin, setGiroIndaabin] = useState("");
  const [commercialLine, setCommercialLine] = useState("");
  const [commercialSubline, setCommercialSubline] = useState("");
  const [contactData, setContactData] = useState("");

  // Location & Physical space
  const [locationId, setLocationId] = useState(defaultLocationId);
  const [nomenclatura, setNomenclatura] = useState("");

  // Financial
  const [monthlyRent, setMonthlyRent] = useState<string>("");
  const [costPerM2, setCostPerM2] = useState<string>("");
  const [participationRate, setParticipationRate] = useState<string>("");
  const [participationNotes, setParticipationNotes] = useState("");

  // Dates & Term
  const [signatureDate, setSignatureDate] = useState("");
  const [operationsStartDate, setOperationsStartDate] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [contractTerm, setContractTerm] = useState("");
  const [daysRemaining, setDaysRemaining] = useState<string>("");

  // Guarantees & Observaciones
  const [guaranteeStatus, setGuaranteeStatus] = useState("VIGENTE");
  const [liabilityPolicyStatus, setLiabilityPolicyStatus] = useState("VIGENTE");
  const [projectStatus, setProjectStatus] = useState("APROBADO");
  const [observaciones, setObservaciones] = useState("");

  const [errors, setErrors] = useState<{ contractNumber?: string }>({});

  // Auto-calculate days remaining from renewalDate
  useEffect(() => {
    if (renewalDate) {
      const target = new Date(`${renewalDate}T00:00:00Z`);
      if (!isNaN(target.getTime())) {
        const today = new Date();
        const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
        const diffDays = Math.ceil((target.getTime() - utcToday) / 86400000);
        setDaysRemaining(String(diffDays));
      }
    }
  }, [renewalDate]);

  useEffect(() => {
    if (isOpen) {
      if (initialRecord) {
        setContractNumber(initialRecord.contractNumber ?? initialRecord.nomenclatura ?? "");
        setGerencia(initialRecord.gerencia ?? "Gerencia de Servicios Comerciales");
        setContractStage((initialRecord.contractStage as ContractStage) ?? "formalized");
        setContractStatus(initialRecord.contractStatus ?? initialRecord.situacion ?? "OPERANDO");
        setManager(initialRecord.manager ?? "");

        setMarca(initialRecord.marca ?? "");
        setRazonSocial(initialRecord.razonSocial ?? "");
        setGiroOperativo(initialRecord.giroOperativo ?? "RETAIL");
        setGiroIata(initialRecord.giroIata ?? "");
        setGiroIndaabin(initialRecord.giroIndaabin ?? "");
        setCommercialLine(initialRecord.commercialLine ?? "");
        setCommercialSubline(initialRecord.commercialSubline ?? "");
        setContactData(initialRecord.contactData ?? "");

        setLocationId(initialRecord.contractLocationId ?? defaultLocationId);
        setNomenclatura(initialRecord.nomenclatura ?? "");

        setMonthlyRent(initialRecord.monthlyRent !== null && initialRecord.monthlyRent !== undefined ? String(initialRecord.monthlyRent) : "");
        setCostPerM2(initialRecord.costPerM2 !== null && initialRecord.costPerM2 !== undefined ? String(initialRecord.costPerM2) : "");
        setParticipationRate(initialRecord.participationRate !== null && initialRecord.participationRate !== undefined ? String(initialRecord.participationRate) : "");
        setParticipationNotes(initialRecord.participationNotes ?? "");

        setSignatureDate(initialRecord.signatureDate ?? initialRecord.fechaFormalizacion ?? "");
        setOperationsStartDate(initialRecord.operationsStartDate ?? "");
        setRenewalDate(initialRecord.renewalDate ?? initialRecord.fechaConclusion ?? "");
        setContractTerm(initialRecord.contractTerm ?? "");
        setDaysRemaining(initialRecord.daysRemaining !== null && initialRecord.daysRemaining !== undefined ? String(initialRecord.daysRemaining) : "");

        setGuaranteeStatus(initialRecord.guaranteeStatus ?? "VIGENTE");
        setLiabilityPolicyStatus(initialRecord.liabilityPolicyStatus ?? "VIGENTE");
        setProjectStatus(initialRecord.projectStatus ?? "APROBADO");
        setObservaciones(initialRecord.observaciones ?? "");
      } else {
        setContractNumber("");
        setGerencia("Gerencia de Servicios Comerciales");
        setContractStage("formalized");
        setContractStatus("OPERANDO");
        setManager("");

        setMarca("");
        setRazonSocial("");
        setGiroOperativo("RETAIL");
        setGiroIata("");
        setGiroIndaabin("");
        setCommercialLine("");
        setCommercialSubline("");
        setContactData("");

        setLocationId(defaultLocationId);
        setNomenclatura("");

        setMonthlyRent("");
        setCostPerM2("");
        setParticipationRate("");
        setParticipationNotes("");

        setSignatureDate("");
        setOperationsStartDate("");
        setRenewalDate("");
        setContractTerm("");
        setDaysRemaining("");

        setGuaranteeStatus("VIGENTE");
        setLiabilityPolicyStatus("VIGENTE");
        setProjectStatus("APROBADO");
        setObservaciones("");
      }
      setErrors({});
    }
  }, [isOpen, initialRecord, defaultLocationId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { contractNumber?: string } = {};

    if (!contractNumber.trim()) {
      newErrors.contractNumber = "El número de contrato es obligatorio (ej. AIFA-DCS-SSC-GSC-194-2025).";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const targetLoc = locationOptions.find((l) => l.id === locationId);
    const numRent = monthlyRent ? parseFloat(monthlyRent) : null;
    const numCost = costPerM2 ? parseFloat(costPerM2) : null;
    let numPart = participationRate ? parseFloat(participationRate) : null;
    if (numPart !== null && numPart > 1) {
      numPart = numPart / 100;
    }
    const numDays = daysRemaining ? parseInt(daysRemaining, 10) : null;

    const recordToSave: LocalRecord = {
      id: initialRecord ? initialRecord.id : Date.now(),
      nomenclatura: nomenclatura.trim() || contractNumber.trim(),
      lado: initialRecord?.lado || "N/A",
      area: initialRecord?.area || "N/A",
      modulo: initialRecord?.modulo || "N/A",
      metraje: initialRecord?.metraje ?? null,
      metrajeOriginal: initialRecord?.metrajeOriginal ?? null,
      areaComercial: initialRecord?.areaComercial || "Local",
      nivel: initialRecord?.nivel || "1",
      estatus: contractStatus || "FORMALIZADO",
      situacion: contractStatus || null,
      marca: marca.trim() || null,
      razonSocial: razonSocial.trim() || null,
      subdireccion: "SVS COM",
      gerencia: gerencia.trim() || "Gerencia de Servicios Comerciales",
      giroIata: giroIata.trim() || null,
      giroOperativo: giroOperativo.trim() || null,
      giroIndaabin: giroIndaabin.trim() || null,
      observaciones: observaciones.trim() || null,
      fechaFormalizacion: signatureDate || null,
      fechaConclusion: renewalDate || null,
      contractNumber: contractNumber.trim(),
      contractPending: false,
      commercialLine: commercialLine.trim() || null,
      commercialSubline: commercialSubline.trim() || null,
      costPerM2: numCost,
      monthlyRent: numRent,
      participationRate: numPart,
      participationNotes: participationNotes.trim() || null,
      operationsStartDate: operationsStartDate || null,
      signatureDate: signatureDate || null,
      contractTerm: contractTerm.trim() || null,
      renewalDate: renewalDate || null,
      guaranteeStatus: guaranteeStatus.trim() || null,
      liabilityPolicyStatus: liabilityPolicyStatus.trim() || null,
      projectStatus: projectStatus.trim() || null,
      contractStatus: contractStatus.trim() || null,
      operationalStatus: contractStatus.trim() || null,
      contactData: contactData.trim() || null,
      manager: manager.trim() || null,
      contractStage: contractStage,
      contractSourceSheet: "Padrón Oficial",
      contractLocationName: targetLoc?.name ?? "Edificio Terminal de Pasajeros (ETP)",
      contractLocationId: locationId,
      zonaComercial: targetLoc?.shortName ?? "ETP",
      daysRemaining: numDays,
    };

    onSave(recordToSave);
    onClose();
  };

  const selectedLocOption = locationOptions.find((l) => l.id === locationId);

  return (
    <div className="local-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="local-modal-container contract-modal-wide" onClick={(e) => e.stopPropagation()}>
        <header className="local-modal-header">
          <div>
            <span className="section-kicker">
              {isEditing ? "Gestión contractual" : "Nuevo expediente contractual"}
            </span>
            <h2>{isEditing ? `Editar Contrato ${initialRecord?.contractNumber ?? initialRecord?.nomenclatura}` : "📑 Registrar Nuevo Contrato"}</h2>
            <small>Zona comercial: <b>{selectedLocOption?.name}</b></small>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar ventana">
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="local-modal-form">
          {/* SECCIÓN 1: EXPEDIENTE Y CONTROL */}
          <div className="form-section-title">
            <span>1</span> Identificación del Contrato
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="contractNumber">Número de Contrato *</label>
              <input
                id="contractNumber"
                type="text"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                placeholder="Ej. AIFA-DCS-SSC-GSC-194-2025"
                className={`form-control ${errors.contractNumber ? "is-invalid" : ""}`}
                required
              />
              {errors.contractNumber && <span className="error-text">{errors.contractNumber}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="gerencia">Gerencia Responsable</label>
              <select
                id="gerencia"
                value={gerencia}
                onChange={(e) => setGerencia(e.target.value)}
                className="form-control"
              >
                <option value="Gerencia de Servicios Comerciales">Gerencia de Servicios Comerciales (GSC)</option>
                <option value="Gerencia de Espacios Publicitarios">Gerencia de Espacios Publicitarios (GEP)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="contractStage">Etapa Contractual</label>
              <select
                id="contractStage"
                value={contractStage}
                onChange={(e) => setContractStage(e.target.value as ContractStage)}
                className="form-control"
              >
                <option value="formalized">Formalizado (Activo)</option>
                <option value="formalization">En formalización</option>
                <option value="preformalization">En preformalización</option>
                <option value="agreements">Convenio</option>
                <option value="expired">Fenecido / Vencido</option>
                <option value="cancelled">Cancelado / Rescindido</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="contractStatus">Estatus Operativo</label>
              <input
                id="contractStatus"
                type="text"
                value={contractStatus}
                onChange={(e) => setContractStatus(e.target.value)}
                placeholder="Ej. OPERANDO, EN ADAPTACIÓN, FORMALIZADO"
                className="form-control"
              >
              </input>
            </div>

            <div className="form-group">
              <label htmlFor="manager">Gestor / Supervisor Responsable</label>
              <input
                id="manager"
                type="text"
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                placeholder="Ej. OCTAVIO, YAMI, MAURO, RICARDO"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="locationId">Zona Comercial</label>
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

            <div className="form-group">
              <label htmlFor="nomenclatura">Local Físico Asignado</label>
              {availableLocals.length > 0 ? (
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    id="nomenclatura"
                    type="text"
                    value={nomenclatura}
                    onChange={(e) => setNomenclatura(e.target.value)}
                    placeholder="Ej. LLENA-02A"
                    className="form-control"
                    list="available-locals-list"
                  />
                  <datalist id="available-locals-list">
                    {availableLocals.map((locNom) => (
                      <option key={locNom} value={locNom} />
                    ))}
                  </datalist>
                </div>
              ) : (
                <input
                  id="nomenclatura"
                  type="text"
                  value={nomenclatura}
                  onChange={(e) => setNomenclatura(e.target.value)}
                  placeholder="Ej. LLENA-02A"
                  className="form-control"
                />
              )}
            </div>
          </div>

          {/* SECCIÓN 2: IDENTIDAD COMERCIAL Y ARRENDATARIO */}
          <div className="form-section-title">
            <span>2</span> Marca Comercial y Arrendatario
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="marca">Marca Comercial (Visible al público)</label>
              <input
                id="marca"
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Ej. FARMACIA CHECK, URBANUS"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="razonSocial">Razón Social (Arrendatario)</label>
              <input
                id="razonSocial"
                type="text"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                placeholder="Ej. Superfarmacia Check 2013, S.A. de C.V."
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="giroOperativo">Giro Operativo</label>
              <input
                id="giroOperativo"
                type="text"
                value={giroOperativo}
                onChange={(e) => setGiroOperativo(e.target.value)}
                placeholder="Ej. RETAIL, ALIMENTOS Y BEBIDAS"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="giroIata">Giro IATA</label>
              <input
                id="giroIata"
                type="text"
                value={giroIata}
                onChange={(e) => setGiroIata(e.target.value)}
                placeholder="Ej. TIENDA DE CONVENIENCIA, FAST FOOD"
                className="form-control"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="contactData">Datos de Contacto y Representante Legal</label>
              <input
                id="contactData"
                type="text"
                value={contactData}
                onChange={(e) => setContactData(e.target.value)}
                placeholder="Ej. Lic. Juan Pérez, Tel: 55-1234-5678, correo@empresa.com"
                className="form-control"
              />
            </div>
          </div>

          {/* SECCIÓN 3: CONDICIONES FINANCIERAS */}
          <div className="form-section-title">
            <span>3</span> Condiciones Económicas
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="monthlyRent">Renta Mensual Fija ($ MXN antes de IVA)</label>
              <input
                id="monthlyRent"
                type="number"
                step="0.01"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                placeholder="Ej. 45000"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="costPerM2">Costo por m² ($ MXN)</label>
              <input
                id="costPerM2"
                type="number"
                step="0.01"
                value={costPerM2}
                onChange={(e) => setCostPerM2(e.target.value)}
                placeholder="Ej. 1100"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="participationRate">% de Participación sobre Ventas</label>
              <input
                id="participationRate"
                type="number"
                step="0.01"
                value={participationRate}
                onChange={(e) => setParticipationRate(e.target.value)}
                placeholder="Ej. 0.18 o 18"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="participationNotes">Notas sobre Participación Variable</label>
              <input
                id="participationNotes"
                type="text"
                value={participationNotes}
                onChange={(e) => setParticipationNotes(e.target.value)}
                placeholder="Ej. Lo que resulte mayor entre fija y variable"
                className="form-control"
              />
            </div>
          </div>

          {/* SECCIÓN 4: CALENDARIO Y VIGENCIAS */}
          <div className="form-section-title">
            <span>4</span> Plazos y Calendario de Vigencia
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="signatureDate">Fecha de Firma / Formalización</label>
              <input
                id="signatureDate"
                type="date"
                value={signatureDate}
                onChange={(e) => setSignatureDate(e.target.value)}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="operationsStartDate">Fecha Inicio de Operaciones</label>
              <input
                id="operationsStartDate"
                type="date"
                value={operationsStartDate}
                onChange={(e) => setOperationsStartDate(e.target.value)}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="renewalDate">Fecha de Renovación / Conclusión</label>
              <input
                id="renewalDate"
                type="date"
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="contractTerm">Plazo de Vigencia (Texto)</label>
              <input
                id="contractTerm"
                type="text"
                value={contractTerm}
                onChange={(e) => setContractTerm(e.target.value)}
                placeholder="Ej. 3 años (1 Nov. 2025 al 31 Oct. 2028)"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="daysRemaining">Días Restantes de Vigencia</label>
              <input
                id="daysRemaining"
                type="number"
                value={daysRemaining}
                onChange={(e) => setDaysRemaining(e.target.value)}
                placeholder="Cálculo automático"
                className="form-control"
              />
            </div>
          </div>

          {/* SECCIÓN 5: GARANTÍAS Y EXPEDIENTE */}
          <div className="form-section-title">
            <span>5</span> Garantías y Cumplimiento
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="guaranteeStatus">Estatus Fianza / Garantía</label>
              <input
                id="guaranteeStatus"
                type="text"
                value={guaranteeStatus}
                onChange={(e) => setGuaranteeStatus(e.target.value)}
                placeholder="Ej. ACMES, CARTA STAND BY, VIGENTE, FALTA"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="liabilityPolicyStatus">Estatus Póliza Responsabilidad Civil</label>
              <input
                id="liabilityPolicyStatus"
                type="text"
                value={liabilityPolicyStatus}
                onChange={(e) => setLiabilityPolicyStatus(e.target.value)}
                placeholder="Ej. ACMES, VIGENTE, EN CORRECCIÓN, FALTA"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="projectStatus">Estatus Proyecto de Obra</label>
              <input
                id="projectStatus"
                type="text"
                value={projectStatus}
                onChange={(e) => setProjectStatus(e.target.value)}
                placeholder="Ej. APROBADO, EN REVISIÓN, FALTA, N/A"
                className="form-control"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="observaciones">Observaciones del Expediente</label>
              <textarea
                id="observaciones"
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas adicionales sobre garantías, convenios o antecedentes del contrato..."
                className="form-control"
              />
            </div>
          </div>

          <footer className="local-modal-footer">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="primary-button">
              {isEditing ? "Guardar Cambios" : "Registrar Contrato"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
