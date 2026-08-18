"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { LocalRecord } from "@/app/types";

type Dataset = Record<string, LocalRecord[]>;

type CopilotMessage = {
  id: string;
  sender: "user" | "copilot";
  text: string;
  category?: "chat" | "oficio" | "finance";
  mode?: "gemini-api" | "fallback";
  timestamp: string;
};

export default function GlobalCopilotModal({
  open,
  onClose,
  datasets,
  allContractRecords,
  onNavigateToModule,
}: {
  open: boolean;
  onClose: () => void;
  datasets: Dataset;
  allContractRecords: LocalRecord[];
  onNavigateToModule?: (module: string, subView?: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"chat" | "oficio" | "finance">("chat");
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: "welcome-copilot",
      sender: "copilot",
      text: "### 🏛️ ¡Bienvenido al Copiloto de Inteligencia Comercial de SIGCO GIAC (AIFA)!\n\n" +
        "Soy tu asistente virtual institucional, conectado a la base consolidada de **Locales, Contratos y Finanzas** del Aeropuerto Internacional Felipe Ángeles.\n\n" +
        "Puedes preguntarme sobre la **identidad del sistema (SIGCO)**, solicitar análisis de ocupación o cartera vencida, o pedirme que **redacte un oficio formal** de requerimiento comercial.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Consolidate global context metrics across datasets
  const globalContext = useMemo(() => {
    const allLocals = Object.values(datasets).flat();
    const totalLocals = allLocals.length;
    const operatingLocals = allLocals.filter((l) => l.estatus === "EN FUNCIONAMIENTO").length;
    const adaptingLocals = allLocals.filter((l) => l.estatus === "EN ADAPTACION").length;
    const availableLocals = allLocals.filter((l) => l.estatus === "DISPONIBLE").length;

    // Debtors calculation
    const debtorsMap = new Map<string, { amount: number; months: number }>();
    allContractRecords.forEach((c) => {
      const debt = (c as any).overdueBalance ?? (c as any).saldoPendiente ?? 0;
      if (debt > 0 && c.marca) {
        const existing = debtorsMap.get(c.marca) ?? { amount: 0, months: 1 };
        debtorsMap.set(c.marca, {
          amount: existing.amount + debt,
          months: Math.max(existing.months, (c as any).overdueMonths ?? 1),
        });
      }
    });

    const topDebtors = [...debtorsMap.entries()]
      .map(([name, val]) => ({ name, amount: val.amount, months: val.months }))
      .sort((a, b) => b.amount - a.amount);

    const totalOverdueDebt = topDebtors.reduce((sum, d) => sum + d.amount, 0);

    return {
      totalLocals,
      operatingLocals,
      adaptingLocals,
      availableLocals,
      totalContracts: allContractRecords.length,
      totalDebtorsCount: topDebtors.length,
      totalOverdueDebt,
      topDebtors,
    };
  }, [datasets, allContractRecords]);

  useEffect(() => {
    if (open) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const handleSendMessage = async (customPrompt?: string) => {
    const text = customPrompt ?? inputMessage;
    if (!text.trim() || loading) return;

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      category: activeTab,
      timestamp: time,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          category: activeTab,
          context: globalContext,
        }),
      });

      const data = await res.json();
      const copilotMsg: CopilotMessage = {
        id: `copilot-${Date.now()}`,
        sender: "copilot",
        text: data.response || "No se obtuvo respuesta del copiloto.",
        mode: data.mode,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, copilotMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "copilot",
          text: "⚠️ Ocurrió un inconveniente al conectar con el servidor de la IA. Por favor intenta de nuevo.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const presets = {
    chat: [
      "¿Qué es SIGCO y cuál es el objetivo del GIAC?",
      "Diagnóstico general de ocupación comercial en el AIFA",
      "Recomendación para comercializar espacios libres en ETP",
    ],
    oficio: [
      "Redactar requerimiento formal de pago a deudores",
      "Generar oficio de actualización de Póliza de R.C.",
      "Redactar recordatorio preventivo de vencimiento de contrato",
    ],
    finance: [
      "Análisis de Cartera Vencida y marcas con saldo pendiente",
      "¿Cuál es el saldo total recuperado este mes?",
      "Marcas con más de 2 meses de morosidad",
    ],
  };

  if (!open) return null;

  return (
    <div className="global-copilot-backdrop" role="dialog" aria-modal="true" aria-label="Copiloto IA Global SIGCO GIAC AIFA">
      <div className="global-copilot-modal">
        <header className="copilot-header">
          <div className="copilot-brand">
            <span className="copilot-badge">✨ GEMINI 3.6 FLASH · SIGCO GIAC</span>
            <h2>Copiloto IA de Inteligencia Comercial</h2>
            <small>AIFA · Cartera Consolidada ({globalContext.totalLocals} locales, {globalContext.totalContracts} contratos)</small>
          </div>
          <button type="button" className="copilot-close-btn" onClick={onClose} aria-label="Cerrar Copiloto IA">
            ×
          </button>
        </header>

        {/* Tab Selection Navigation */}
        <div className="copilot-tab-nav" role="tablist">
          <button
            type="button"
            className={`copilot-tab-btn ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            💬 Consultas & Identidad SIGCO
          </button>
          <button
            type="button"
            className={`copilot-tab-btn ${activeTab === "oficio" ? "active" : ""}`}
            onClick={() => setActiveTab("oficio")}
          >
            📑 Redacción de Oficios
          </button>
          <button
            type="button"
            className={`copilot-tab-btn ${activeTab === "finance" ? "active" : ""}`}
            onClick={() => setActiveTab("finance")}
          >
            📊 Diagnóstico Financiero
          </button>
        </div>

        {/* Action Shortcuts Bar */}
        <div className="copilot-shortcuts-bar">
          <span className="shortcuts-label">Salto Rápido:</span>
          <button type="button" onClick={() => { onNavigateToModule?.("finances", "overdue_debt"); onClose(); }}>
            💰 Cartera Vencida
          </button>
          <button type="button" onClick={() => { onNavigateToModule?.("intelligence", "contracts_validity"); onClose(); }}>
            📄 Scorecard Contratos
          </button>
          <button type="button" onClick={() => { onNavigateToModule?.("locals"); onClose(); }}>
            📍 Directorio Locales
          </button>
        </div>

        {/* Messages Stream Container */}
        <div className="copilot-messages-container">
          {messages.map((msg) => (
            <div key={msg.id} className={`copilot-bubble ${msg.sender}`}>
              <div className="copilot-bubble-content">
                {msg.sender === "copilot" && (
                  <span className="copilot-msg-header">
                    ✨ Copiloto SIGCO GIAC {msg.mode === "gemini-api" ? "· Gemini API" : "· Motor Institucional"}
                  </span>
                )}
                <div className="copilot-text-formatted">
                  {msg.text.split("\n").map((line, idx) => {
                    if (line.startsWith("### ")) {
                      return <h3 key={idx}>{line.replace("### ", "")}</h3>;
                    }
                    if (line.startsWith("#### ")) {
                      return <h4 key={idx}>{line.replace("#### ", "")}</h4>;
                    }
                    if (line.startsWith("- ")) {
                      return <li key={idx}>{line.replace("- ", "")}</li>;
                    }
                    if (!line.trim()) return <br key={idx} />;
                    return <p key={idx}>{line}</p>;
                  })}
                </div>
              </div>
              <span className="copilot-timestamp">{msg.timestamp}</span>
            </div>
          ))}
          {loading && (
            <div className="copilot-bubble copilot loading">
              <div className="copilot-bubble-content">
                <span className="copilot-msg-header">✨ Procesando con Gemini 3.6 Flash…</span>
                <p>Analizando datos de la plataforma y generando dictamen institucional...</p>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Preset Prompt Recommendations */}
        <div className="copilot-presets-section">
          <span className="presets-header">Consultas recomendadas:</span>
          <div className="presets-list">
            {presets[activeTab].map((promptText) => (
              <button
                key={promptText}
                type="button"
                className="preset-pill-btn"
                onClick={() => handleSendMessage(promptText)}
              >
                {promptText}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form
          className="copilot-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              activeTab === "oficio"
                ? "Solicita un oficio o memorándum (ej. 'Redactar requerimiento a deudores')..."
                : activeTab === "finance"
                ? "Consulta datos de cobranza o cartera vencida..."
                : "Haz cualquier pregunta estratégica o sobre la app (ej. '¿Qué es SIGCO?')..."
            }
            disabled={loading}
          />
          <button type="submit" disabled={!inputMessage.trim() || loading}>
            {loading ? "Enviando…" : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
}
