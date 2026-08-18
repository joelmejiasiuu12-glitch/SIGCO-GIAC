"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { LocalRecord } from "@/app/types";

export type ChatMessage = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  suggestedLocals?: LocalRecord[];
  timestamp: string;
};

function normalized(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX");
}

function processNaturalQuery(query: string, records: LocalRecord[]): { text: string; matches: LocalRecord[] } {
  const q = normalized(query.trim());
  if (!q) {
    return { text: "Por favor escribe una consulta o selecciona una sugerencia.", matches: [] };
  }

  // 1. Availability Intent
  if (/disponible|vacant|libre|vacancia/.test(q)) {
    const matches = records.filter((r) => r.estatus === "DISPONIBLE");
    const totalArea = matches.reduce((sum, r) => sum + (r.metraje ?? 0), 0);
    return {
      text: `Se encontraron ${matches.length} espacios DISPONIBLES con un área acumulada de ${totalArea.toFixed(1)} m².`,
      matches: matches.slice(0, 8),
    };
  }

  // 2. Food & Beverage Intent
  if (/alimento|comida|restaurante|cafe|bebida|alimentos/.test(q)) {
    const matches = records.filter((r) =>
      /alimento|comida|restaurante|cafe|snack|bar/.test(normalized(`${r.giroOperativo} ${r.areaComercial} ${r.marca}`)),
    );
    return {
      text: `Se identificaron ${matches.length} locales asociados a Alimentos y Bebidas en esta zona.`,
      matches: matches.slice(0, 8),
    };
  }

  // 3. Operating Status Intent
  if (/funcionando|funcionamiento|operando|activo/.test(q)) {
    const matches = records.filter((r) => r.estatus === "EN FUNCIONAMIENTO");
    return {
      text: `Actualmente hay ${matches.length} locales EN FUNCIONAMIENTO comercial activo.`,
      matches: matches.slice(0, 8),
    };
  }

  // 4. Adaptation Status Intent
  if (/adaptacion|obra|adecuacion/.test(q)) {
    const matches = records.filter((r) => r.estatus === "EN ADAPTACION");
    return {
      text: `Se tienen registrados ${matches.length} espacios EN ADAPTACIÓN / obra física.`,
      matches: matches.slice(0, 8),
    };
  }

  // 5. Size / Area Intent (> 50m2, > 100m2)
  const sizeMatch = q.match(/(>|>=\s*|mayor\s*a\s*|mas\s*de\s*)(\d+)/);
  if (sizeMatch) {
    const threshold = Number(sizeMatch[2]);
    const matches = records.filter((r) => (r.metraje ?? 0) >= threshold);
    return {
      text: `Se encontraron ${matches.length} locales con metraje igual o mayor a ${threshold} m².`,
      matches: matches.slice(0, 8),
    };
  }

  // 6. Generic Text Search Across Brand, Nomenclatura, Giro, Level, Module
  const matches = records.filter((r) => {
    const haystack = normalized(
      `${r.nomenclatura} ${r.marca} ${r.giroOperativo} ${r.areaComercial} ${r.nivel} ${r.modulo} ${r.estatus} ${r.observaciones}`,
    );
    return haystack.includes(q);
  });

  if (matches.length > 0) {
    return {
      text: `Encontré ${matches.length} coincidencia${matches.length > 1 ? "s" : ""} para "${query}":`,
      matches: matches.slice(0, 8),
    };
  }

  return {
    text: `No encontré locales que coincidan exactamente con "${query}". Intenta buscar por nombre de marca, número de local (ej. L-10) o por giro comercial.`,
    matches: [],
  };
}

export default function LocalQueryAssistant({
  records,
  locationName,
  isOpen,
  onClose,
  onSelectLocal,
}: {
  records: LocalRecord[];
  locationName: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectLocal: (nomenclature: string) => void;
}) {
  const [inputQuery, setInputQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      sender: "assistant",
      text: `¡Hola! Soy el Asistente IA de Locales para ${locationName}. ¿Qué información deseas consultar hoy sobre los ${records.length} espacios de esta zona?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = (textToSend?: string) => {
    const query = textToSend ?? inputQuery;
    if (!query.trim()) return;

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: time,
    };

    const { text, matches } = processNaturalQuery(query, records);
    const assistantMsg: ChatMessage = {
      id: `assistant-${Date.now()}`,
      sender: "assistant",
      text,
      suggestedLocals: matches,
      timestamp: time,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    if (!textToSend) setInputQuery("");
  };

  const quickPrompts = [
    { label: "🟢 Locales disponibles", query: "Locales disponibles" },
    { label: "🍔 Alimentos y Bebidas", query: "Alimentos y bebidas" },
    { label: "📐 Locales > 50 m²", query: "mayor a 50" },
    { label: "🛠️ En adaptación", query: "En adaptacion" },
  ];

  if (!isOpen) return null;

  return (
    <aside className="local-ai-drawer" role="dialog" aria-label={`Asistente IA de Locales en ${locationName}`}>
      <header className="local-ai-header">
        <div className="ai-title-group">
          <span className="ai-sparkle-badge">✨ IA SIIGCO</span>
          <h3>Asistente de Locales</h3>
          <small>{locationName} · {records.length} registros</small>
        </div>
        <button type="button" className="ai-close-button" onClick={onClose} aria-label="Cerrar asistente IA">
          ×
        </button>
      </header>

      <div className="local-ai-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`ai-chat-bubble ${msg.sender}`}>
            <div className="bubble-content">
              <p>{msg.text}</p>
              {msg.suggestedLocals && msg.suggestedLocals.length > 0 && (
                <div className="ai-suggested-locals-grid">
                  {msg.suggestedLocals.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="ai-local-card-btn"
                      onClick={() => {
                        onSelectLocal(r.nomenclatura);
                        onClose();
                      }}
                      title={`Ver detalles de ${r.nomenclatura} en la tabla`}
                    >
                      <div className="ai-card-top">
                        <strong>{r.nomenclatura}</strong>
                        <span className={`estatus-pill ${r.estatus.toLowerCase().replaceAll(/\s+/g, "-")}`}>
                          {r.estatus}
                        </span>
                      </div>
                      <div className="ai-card-meta">
                        <span>{r.marca || r.giroOperativo || "Sin marca"}</span>
                        <b>{r.metraje ? `${r.metraje} m²` : ""}</b>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="bubble-time">{msg.timestamp}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="local-ai-quick-prompts">
        <span>Sugerencias rápidas:</span>
        <div className="prompts-scroll">
          {quickPrompts.map((p) => (
            <button key={p.query} type="button" onClick={() => handleSend(p.query)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <form
        className="local-ai-input-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Escribe tu consulta (ej. 'Locales de comida', 'L-10')..."
          aria-label="Consulta para el asistente IA"
        />
        <button type="submit" disabled={!inputQuery.trim()}>
          Enviar
        </button>
      </form>
    </aside>
  );
}
