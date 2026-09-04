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
    <div className="adv-modal-overlay capacity-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="adv-modal-dialog capacity-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="adv-modal-header">
          <div className="adv-modal-title-wrap">
            <span className="adv-modal-big-icon" aria-hidden="true">
              {activeTab === "capacity" ? "📐" : "🛫"}
            </span>
            <div>
              <span className="adv-modal-kicker">Subdirección de Servicios Comerciales · AIFA</span>
              <h2>Capacidad de Atención Comercial y Tráfico de Pasajeros</h2>
            </div>
          </div>
          <button
            type="button"
            className="adv-modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
            title="Cerrar"
          >
            ✕
          </button>
        </header>

        {/* Modal Subtabs */}
        <nav className="capacity-nav-tabs">
          <button
            type="button"
            className={`capacity-nav-tab ${activeTab === "capacity" ? "active" : ""}`}
            onClick={() => setActiveTab("capacity")}
          >
            📐 Parámetros de Capacidad Comercial (ETP)
          </button>
          <button
            type="button"
            className={`capacity-nav-tab ${activeTab === "traffic" ? "active" : ""}`}
            onClick={() => setActiveTab("traffic")}
          >
            🛫 Registro de Tráfico Mensual ({passengerTraffic.length})
          </button>
        </nav>

        {/* TAB 1: CAPACIDAD COMERCIAL */}
        {activeTab === "capacity" && (
          <form onSubmit={handleSaveCapacity} className="capacity-form">
            <div className="capacity-intro-box">
              <p>
                Configure los coeficientes y superficies oficiales del Edificio Terminal de Pasajeros (ETP). Estos valores recalculan en tiempo real la <strong>Capacidad de Atención Comercial</strong> en el Tablero de Inicio y Reportes Ejecutivos.
              </p>
            </div>

            <div className="capacity-grid">
              <div className="capacity-field">
                <label htmlFor="terminal-cap">
                  Capacidad Terminal de Diseño (Pax/Año) <span className="req">*</span>
                </label>
                <input
                  id="terminal-cap"
                  type="number"
                  step="100000"
                  value={terminalCapacity}
                  onChange={(e) => setTerminalCapacity(Number(e.target.value))}
                  required
                />
                <small>Diseño inicial oficial: 20,000,000 Pax</small>
              </div>

              <div className="capacity-field">
                <label htmlFor="area-factor">
                  Factor Superficie Comercial (m²/Pax) <span className="req">*</span>
                </label>
                <input
                  id="area-factor"
                  type="number"
                  step="0.000001"
                  value={areaFactor}
                  onChange={(e) => setAreaFactor(Number(e.target.value))}
                  required
                />
                <small>Estándar normativo IATA/OACI: 0.000821 m² por pasajero</small>
              </div>

              <div className="capacity-field">
                <label htmlFor="leased-area">
                  Superficie Comercial Arrendada (m²) <span className="req">*</span>
                </label>
                <input
                  id="leased-area"
                  type="number"
                  step="0.01"
                  value={leasedArea}
                  onChange={(e) => setLeasedArea(Number(e.target.value))}
                  required
                />
                <small>Metraje comercial ocupado en ETP</small>
              </div>

              <div className="capacity-field">
                <label>Superficie Comercial Recomendada</label>
                <div className="capacity-computed-val">
                  {numberFormat.format(recommendedArea)} m²
                </div>
                <small>Calculada: {terminalCapacity.toLocaleString()} Pax × {areaFactor}</small>
              </div>
            </div>

            {/* Resultado Proyectado */}
            <div className="capacity-kpi-banner">
              <div>
                <span className="capacity-kpi-label">
                  Capacidad de Atención Comercial Resultante:
                </span>
                <div className="capacity-kpi-val">
                  {passengerFormat.format(commercialCapacityPax)}{" "}
                  <span className="capacity-kpi-unit">Pasajeros equivalentes</span>
                </div>
              </div>
              <div className="capacity-kpi-coverage">
                <span className="coverage-label">Relación de Cobertura:</span>
                <strong className={`coverage-percent ${commercialCapacityPax >= terminalCapacity ? "ok" : "alert"}`}>
                  {terminalCapacity > 0 ? `${((commercialCapacityPax / terminalCapacity) * 100).toFixed(1)}%` : "0%"}
                </strong>
              </div>
            </div>

            {capacityMessage && (
              <div className="capacity-status-alert success">
                {capacityMessage}
              </div>
            )}

            <footer className="adv-form-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingCapacity}
                className="btn-primary"
              >
                {savingCapacity ? "Guardando en D1…" : "Guardar Parámetros"}
              </button>
            </footer>
          </form>
        )}

        {/* TAB 2: TRÁFICO DE PASAJEROS */}
        {activeTab === "traffic" && (
          <div className="capacity-traffic-wrap">
            <form onSubmit={handleSaveTraffic} className="capacity-traffic-form">
              <h4>Registrar o Actualizar Mes de Tráfico de Pasajeros</h4>
              <div className="traffic-form-grid">
                <div className="capacity-field">
                  <label htmlFor="traffic-year">Año</label>
                  <input
                    id="traffic-year"
                    type="number"
                    min="2022"
                    max="2035"
                    value={trafficYear}
                    onChange={(e) => setTrafficYear(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="capacity-field">
                  <label htmlFor="traffic-month">Mes</label>
                  <select
                    id="traffic-month"
                    value={trafficMonth}
                    onChange={(e) => setTrafficMonth(Number(e.target.value))}
                  >
                    {MONTHS.map((m) => (
                      <option key={m.num} value={m.num}>
                        {m.num} - {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="capacity-field">
                  <label htmlFor="traffic-pax">Pasajeros</label>
                  <input
                    id="traffic-pax"
                    type="text"
                    placeholder="Ej. 450,000"
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                    required
                  />
                </div>

                <div className="capacity-field">
                  <label htmlFor="traffic-status">Estatus</label>
                  <select
                    id="traffic-status"
                    value={trafficStatus}
                    onChange={(e) => setTrafficStatus(e.target.value as "real" | "partial" | "projection")}
                  >
                    <option value="real">Real (Cerrado)</option>
                    <option value="partial">Parcial / Preliminar</option>
                    <option value="projection">Proyectado / Estimado</option>
                  </select>
                </div>
              </div>

              {trafficMessage && (
                <div className="capacity-status-alert success">
                  {trafficMessage}
                </div>
              )}

              <div className="traffic-form-actions">
                <button
                  type="submit"
                  disabled={savingTraffic}
                  className="btn-save-traffic"
                >
                  {savingTraffic ? "Guardando..." : "Guardar Registro de Tráfico"}
                </button>
              </div>
            </form>

            {/* Historial / Tabla de Registros */}
            <div className="capacity-history-block">
              <h4>
                Historial Registrado ({passengerTraffic.length} periodos)
              </h4>
              <div className="capacity-table-wrap">
                <table className="capacity-table">
                  <thead>
                    <tr>
                      <th>Año</th>
                      <th>Mes</th>
                      <th className="num-col">Pasajeros</th>
                      <th className="center-col">Estatus</th>
                      <th className="center-col">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...passengerTraffic].reverse().map((rec) => (
                      <tr key={`${rec.year}-${rec.month}`}>
                        <td className="year-cell">{rec.year}</td>
                        <td className="month-cell">{rec.monthName || MONTHS.find((m) => m.num === rec.month)?.name || rec.month}</td>
                        <td className="num-col pax-val">
                          {passengerFormat.format(rec.passengers)}
                        </td>
                        <td className="center-col">
                          <span className={`traffic-badge ${rec.status}`}>
                            {rec.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="center-col">
                          <button
                            type="button"
                            className="btn-edit-traffic"
                            onClick={() => {
                              setTrafficYear(rec.year);
                              setTrafficMonth(rec.month);
                              setPassengers(String(rec.passengers));
                              setTrafficStatus(rec.status as "real" | "partial" | "projection");
                            }}
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
