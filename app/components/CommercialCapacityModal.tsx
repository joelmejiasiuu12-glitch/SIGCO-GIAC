"use client";

import { useState } from "react";
import type { EtpCommercialCapacityData, PassengerTrafficRecord } from "@/app/types";

interface CommercialCapacityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCapacity: EtpCommercialCapacityData | null;
  passengerTraffic: PassengerTrafficRecord[];
  onCapacityUpdated: (newCapacity: EtpCommercialCapacityData) => void;
  onTrafficUpdated: (newTraffic: PassengerTrafficRecord[]) => void;
}

const numberFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });
const passengerFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

const MONTHS = [
  { num: 1, name: "ENERO" },
  { num: 2, name: "FEBRERO" },
  { num: 3, name: "MARZO" },
  { num: 4, name: "ABRIL" },
  { num: 5, name: "MAYO" },
  { num: 6, name: "JUNIO" },
  { num: 7, name: "JULIO" },
  { num: 8, name: "AGOSTO" },
  { num: 9, name: "SEPTIEMBRE" },
  { num: 10, name: "OCTUBRE" },
  { num: 11, name: "NOVIEMBRE" },
  { num: 12, name: "DICIEMBRE" },
];

export default function CommercialCapacityModal({
  isOpen,
  onClose,
  currentCapacity,
  passengerTraffic,
  onCapacityUpdated,
  onTrafficUpdated,
}: CommercialCapacityModalProps) {
  const [activeTab, setActiveTab] = useState<"capacity" | "traffic">("capacity");

  // State for Commercial Capacity
  const [terminalCapacity, setTerminalCapacity] = useState<number>(
    currentCapacity?.terminalPassengerCapacity ?? 20000000
  );
  const [areaFactor, setAreaFactor] = useState<number>(
    currentCapacity?.commercialAreaFactor ?? 0.000821
  );
  const [leasedArea, setLeasedArea] = useState<number>(
    currentCapacity?.leasedCommercialArea ?? 11850.32
  );
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [capacityMessage, setCapacityMessage] = useState<string | null>(null);

  // Derived calculations
  const recommendedArea = terminalCapacity * areaFactor;
  const commercialCapacityPax = areaFactor > 0 ? leasedArea / areaFactor : 0;

  // State for Passenger Traffic Entry
  const currentYear = new Date().getFullYear();
  const [trafficYear, setTrafficYear] = useState<number>(currentYear);
  const [trafficMonth, setTrafficMonth] = useState<number>(new Date().getMonth() + 1);
  const [passengers, setPassengers] = useState<string>("");
  const [trafficStatus, setTrafficStatus] = useState<"real" | "partial" | "projection">("real");
  const [savingTraffic, setSavingTraffic] = useState(false);
  const [trafficMessage, setTrafficMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCapacity(true);
    setCapacityMessage(null);

    const payload: EtpCommercialCapacityData = {
      terminalPassengerCapacity: Number(terminalCapacity),
      commercialAreaFactor: Number(areaFactor),
      recommendedCommercialArea: Number(recommendedArea),
      leasedCommercialArea: Number(leasedArea),
      commercialPassengerCapacity: Number(commercialCapacityPax),
    };

    try {
      const res = await fetch("/api/capacidad-comercial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Error al guardar en la base de datos");
      const data = (await res.json()) as { success: boolean; capacity?: EtpCommercialCapacityData };
      if (data.success && data.capacity) {
        onCapacityUpdated(data.capacity);
        setCapacityMessage("¡Parámetros de capacidad comercial actualizados exitosamente en D1!");
      } else {
        onCapacityUpdated(payload);
        setCapacityMessage("Parámetros actualizados en memoria.");
      }
    } catch {
      // Fallback local
      onCapacityUpdated(payload);
      setCapacityMessage("Guardado localmente en memoria activa.");
    } finally {
      setSavingCapacity(false);
      setTimeout(() => setCapacityMessage(null), 4000);
    }
  };

  const handleSaveTraffic = async (e: React.FormEvent) => {
    e.preventDefault();
    const paxNum = parseInt(passengers.replace(/,/g, ""), 10);
    if (isNaN(paxNum) || paxNum < 0) {
      setTrafficMessage("Por favor ingresa una cifra de pasajeros válida.");
      return;
    }

    setSavingTraffic(true);
    setTrafficMessage(null);

    const monthObj = MONTHS.find((m) => m.num === trafficMonth);
    const monthName = monthObj ? monthObj.name : "MES";

    const payload = {
      year: trafficYear,
      month: trafficMonth,
      monthName,
      passengers: paxNum,
      status: trafficStatus,
    };

    try {
      const res = await fetch("/api/trafico-pasajeros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Error al guardar en la base de datos");
      const data = (await res.json()) as { success: boolean; passengerTraffic?: PassengerTrafficRecord[] };
      if (data.success && Array.isArray(data.passengerTraffic)) {
        onTrafficUpdated(data.passengerTraffic);
        setTrafficMessage(`¡Tráfico de ${monthName} ${trafficYear} actualizado exitosamente!`);
      } else {
        // Update state locally
        const updated = [...passengerTraffic];
        const idx = updated.findIndex((t) => t.year === trafficYear && t.month === trafficMonth);
        if (idx >= 0) {
          updated[idx] = payload;
        } else {
          updated.push(payload);
          updated.sort((a, b) => a.year - b.year || a.month - b.month);
        }
        onTrafficUpdated(updated);
        setTrafficMessage(`Tráfico de ${monthName} ${trafficYear} guardado en memoria.`);
      }
      setPassengers("");
    } catch {
      const updated = [...passengerTraffic];
      const idx = updated.findIndex((t) => t.year === trafficYear && t.month === trafficMonth);
      if (idx >= 0) {
        updated[idx] = payload;
      } else {
        updated.push(payload);
        updated.sort((a, b) => a.year - b.year || a.month - b.month);
      }
      onTrafficUpdated(updated);
      setTrafficMessage(`Guardado en memoria de sesión.`);
      setPassengers("");
    } finally {
      setSavingTraffic(false);
      setTimeout(() => setTrafficMessage(null), 4000);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-card capacity-update-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "720px", width: "95%", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #dfe4e7", paddingBottom: "12px" }}>
          <div>
            <span className="section-kicker" style={{ color: "#ac182c", fontWeight: 700, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Subdirección de Servicios Comerciales · AIFA
            </span>
            <h2 style={{ fontSize: "19px", margin: "4px 0 0", color: "#09212e" }}>
              Actualización de Capacidad Comercial y Tráfico
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#596975" }}
          >
            ✕
          </button>
        </div>

        {/* Modal Subtabs */}
        <div className="capacity-modal-tabs" style={{ display: "flex", gap: "8px", margin: "16px 0", borderBottom: "1px solid #dfe4e7" }}>
          <button
            type="button"
            onClick={() => setActiveTab("capacity")}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: activeTab === "capacity" ? "3px solid #ac182c" : "3px solid transparent",
              background: "none",
              fontWeight: 700,
              color: activeTab === "capacity" ? "#ac182c" : "#596975",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            📐 Parámetros Capacidad Comercial ETP
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("traffic")}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: activeTab === "traffic" ? "3px solid #ac182c" : "3px solid transparent",
              background: "none",
              fontWeight: 700,
              color: activeTab === "traffic" ? "#ac182c" : "#596975",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            🛫 Registro de Tráfico Mensual
          </button>
        </div>

        {/* TAB 1: CAPACIDAD COMERCIAL */}
        {activeTab === "capacity" && (
          <form onSubmit={handleSaveCapacity} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ fontSize: "13px", color: "#596975", margin: 0 }}>
              Modifique los coeficientes y superficies oficiales del Edificio Terminal de Pasajeros (ETP). Estos valores recalculan en tiempo real la <strong>Capacidad de Atención Comercial</strong> en el Tablero de Inicio y Reportes Ejecutivos.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "#09212e", fontWeight: 600 }}>
                Capacidad Terminal de Diseño (Pax/Año):
                <input
                  type="number"
                  step="100000"
                  value={terminalCapacity}
                  onChange={(e) => setTerminalCapacity(Number(e.target.value))}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #c2cbd1", fontSize: "14px" }}
                  required
                />
                <small style={{ color: "#71828d", fontWeight: 400 }}>Diseño inicial oficial: 20,000,000 Pax</small>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "#09212e", fontWeight: 600 }}>
                Factor Superficie Comercial (m²/Pax):
                <input
                  type="number"
                  step="0.000001"
                  value={areaFactor}
                  onChange={(e) => setAreaFactor(Number(e.target.value))}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #c2cbd1", fontSize: "14px" }}
                  required
                />
                <small style={{ color: "#71828d", fontWeight: 400 }}>Estándar normativo: 0.000821 m² por pasajero</small>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "#09212e", fontWeight: 600 }}>
                Superficie Comercial Arrendada (m²):
                <input
                  type="number"
                  step="0.01"
                  value={leasedArea}
                  onChange={(e) => setLeasedArea(Number(e.target.value))}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #c2cbd1", fontSize: "14px" }}
                  required
                />
                <small style={{ color: "#71828d", fontWeight: 400 }}>Metraje comercial ocupado en ETP</small>
              </label>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "#09212e", fontWeight: 600 }}>
                <span>Superficie Comercial Recomendada:</span>
                <div style={{ padding: "8px 12px", background: "#f5f7f8", borderRadius: "6px", border: "1px solid #e1e6ea", fontSize: "14px", fontWeight: 700, color: "#405364" }}>
                  {numberFormat.format(recommendedArea)} m²
                </div>
                <small style={{ color: "#71828d", fontWeight: 400 }}>Calculada: {terminalCapacity.toLocaleString()} × {areaFactor}</small>
              </div>
            </div>

            {/* Resultado Proyectado */}
            <div style={{ background: "#fdf2f4", border: "1px solid #f2c7ce", borderRadius: "8px", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
              <div>
                <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#ac182c", fontWeight: 700, letterSpacing: "0.05em" }}>
                  Capacidad de Atención Comercial Resultante:
                </span>
                <h3 style={{ fontSize: "22px", margin: "4px 0 0", color: "#8a1323" }}>
                  {passengerFormat.format(commercialCapacityPax)} <span style={{ fontSize: "14px", fontWeight: 500 }}>Pax. equivalentes</span>
                </h3>
              </div>
              <div style={{ textAlign: "right", fontSize: "12px", color: "#596975" }}>
                <div>Relación de Cobertura:</div>
                <strong style={{ fontSize: "16px", color: commercialCapacityPax >= terminalCapacity ? "#00886f" : "#ac182c" }}>
                  {terminalCapacity > 0 ? `${((commercialCapacityPax / terminalCapacity) * 100).toFixed(1)}%` : "0%"}
                </strong>
              </div>
            </div>

            {capacityMessage && (
              <div style={{ padding: "10px 14px", borderRadius: "6px", background: "#e6f4f1", color: "#006250", fontSize: "13px", fontWeight: 600 }}>
                {capacityMessage}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button type="button" onClick={onClose} style={{ padding: "9px 18px", borderRadius: "6px", border: "1px solid #c2cbd1", background: "#ffffff", cursor: "pointer", fontWeight: 600 }}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingCapacity}
                style={{ padding: "9px 22px", borderRadius: "6px", border: "none", background: "#ac182c", color: "#ffffff", cursor: "pointer", fontWeight: 700 }}
              >
                {savingCapacity ? "Guardando en D1…" : "Guardar Parámetros"}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: TRÁFICO DE PASAJEROS */}
        {activeTab === "traffic" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <form onSubmit={handleSaveTraffic} style={{ background: "#f8fafb", border: "1px solid #e1e6ea", borderRadius: "8px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <h4 style={{ margin: 0, fontSize: "14px", color: "#09212e" }}>Registrar o Actualizar Mes de Tráfico</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1.5fr 1fr", gap: "10px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: 600 }}>
                  Año:
                  <input
                    type="number"
                    min="2022"
                    max="2035"
                    value={trafficYear}
                    onChange={(e) => setTrafficYear(Number(e.target.value))}
                    style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #c2cbd1" }}
                    required
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: 600 }}>
                  Mes:
                  <select
                    value={trafficMonth}
                    onChange={(e) => setTrafficMonth(Number(e.target.value))}
                    style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #c2cbd1" }}
                  >
                    {MONTHS.map((m) => (
                      <option key={m.num} value={m.num}>
                        {m.num} - {m.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: 600 }}>
                  Pasajeros:
                  <input
                    type="text"
                    placeholder="Ej. 450,000"
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #c2cbd1" }}
                    required
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: 600 }}>
                  Estatus:
                  <select
                    value={trafficStatus}
                    onChange={(e) => setTrafficStatus(e.target.value as "real" | "partial" | "projection")}
                    style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #c2cbd1" }}
                  >
                    <option value="real">Real (Cerrado)</option>
                    <option value="partial">Parcial / Preliminar</option>
                    <option value="projection">Proyectado / Estimado</option>
                  </select>
                </label>
              </div>

              {trafficMessage && (
                <div style={{ padding: "8px 12px", borderRadius: "6px", background: "#e6f4f1", color: "#006250", fontSize: "12px", fontWeight: 600 }}>
                  {trafficMessage}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  disabled={savingTraffic}
                  onClick={handleSaveTraffic}
                  style={{
                    padding: "9px 20px",
                    background: "#00886f",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: 700,
                    cursor: savingTraffic ? "not-allowed" : "pointer",
                    fontSize: "13px",
                  }}
                >
                  {savingTraffic ? "Guardando..." : "Guardar Registro de Tráfico"}
                </button>
              </div>
            </form>

            {/* Historial / Tabla de Registros */}
            <div style={{ marginTop: "20px" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: "13px", color: "#405364", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Historial Registrado ({passengerTraffic.length} registros)
              </h4>
              <div style={{ maxHeight: "240px", overflowY: "auto", border: "1px solid #dfe4e7", borderRadius: "6px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                  <thead style={{ background: "#f5f7f8", position: "sticky", top: 0 }}>
                    <tr>
                      <th style={{ padding: "8px 12px", borderBottom: "1px solid #dfe4e7" }}>Año</th>
                      <th style={{ padding: "8px 12px", borderBottom: "1px solid #dfe4e7" }}>Mes</th>
                      <th style={{ padding: "8px 12px", borderBottom: "1px solid #dfe4e7", textAlign: "right" }}>Pasajeros</th>
                      <th style={{ padding: "8px 12px", borderBottom: "1px solid #dfe4e7", textAlign: "center" }}>Estatus</th>
                      <th style={{ padding: "8px 12px", borderBottom: "1px solid #dfe4e7", textAlign: "center" }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...passengerTraffic].reverse().map((rec) => (
                      <tr key={`${rec.year}-${rec.month}`} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "7px 12px", fontWeight: 600 }}>{rec.year}</td>
                        <td style={{ padding: "7px 12px" }}>{rec.monthName || MONTHS.find((m) => m.num === rec.month)?.name || rec.month}</td>
                        <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 700, color: "#09212e" }}>
                          {passengerFormat.format(rec.passengers)}
                        </td>
                        <td style={{ padding: "7px 12px", textAlign: "center" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: rec.status === "real" ? "#e6f4f1" : rec.status === "partial" ? "#e8f4fd" : "#fef4e6",
                            color: rec.status === "real" ? "#00886f" : rec.status === "partial" ? "#0284c7" : "#f28c28",
                          }}>
                            {rec.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "7px 12px", textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setTrafficYear(rec.year);
                              setTrafficMonth(rec.month);
                              setPassengers(String(rec.passengers));
                              setTrafficStatus(rec.status as "real" | "partial" | "projection");
                            }}
                            style={{ background: "none", border: "none", color: "#ac182c", cursor: "pointer", fontWeight: 600, fontSize: "11px" }}
                          >
                            Cargar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
