import { NextResponse } from "next/server";

export const runtime = "edge";

type CopilotRequestPayload = {
  message: string;
  category?: "chat" | "oficio" | "finance";
  context?: {
    totalLocals?: number;
    operatingLocals?: number;
    adaptingLocals?: number;
    availableLocals?: number;
    totalContracts?: number;
    totalMonthlyRent?: number;
    totalDebtorsCount?: number;
    totalOverdueDebt?: number;
    topDebtors?: Array<{ name: string; amount: number; months: number }>;
    sampleLocals?: Array<{ nomenclatura: string; marca: string; estatus: string; metraje?: number }>;
  };
};

function generateInstitutionalFallback(message: string, category: string, context?: CopilotRequestPayload["context"]) {
  const msg = message.toLowerCase();

  if (/que es sigco|quien eres|nombre|para que sirve|que haces|giac|aifa/.test(msg)) {
    return {
      text: `### 🏛️ Identidad e Información Institucional de SIGCO GIAC\n\n` +
        `**SIGCO** significa **Sistema Integral de Gestión Comercial y Operativa**, la plataforma tecnológica oficial desarrollada para el **GIAC** (Grupo de Inteligencia y Análisis Comercial) de la Subdirección Comercial del **Aeropuerto Internacional Felipe Ángeles (AIFA)**.\n\n` +
        `#### 🎯 Funciones Principales de SIGCO:\n` +
        `- **Gestión Comercial de Zonas:** Control de inventario y ocupación en las 7 zonas comerciales (ETP, Santa Lucía, Plaza Mexicana, etc.).\n` +
        `- **Scorecard de Arrendatarios:** Evaluación cuantitativa de marcas de 0 a 100 pts (*Estatus Operativo 35pts, Salud Documental 30pts, Formalización 20pts, Vigencia 15pts*).\n` +
        `- **Análisis Financiero & Cartera Vencida:** Seguimiento de facturación, cobro mensual y recuperación de saldos morosos.\n` +
        `- **Dictamen & Emisión de Oficios:** Generación de notificaciones oficiales e instrumentos de regularización.\n\n` +
        `*Actualmente la plataforma administra **${context?.totalLocals ?? "ND"} locales** y **${context?.totalContracts ?? "ND"} expedientes contractuales**.*`,
      sources: ["Manual Institucional SIGCO AIFA"],
    };
  }

  if (category === "oficio" || /oficio|carta|notificacion|comunicado|requerimiento|memorandum/.test(msg)) {
    return {
      text: `### 📄 Borrador de Oficio Oficial AIFA / GIAC\n\n` +
        `**MEMORÁNDUM / OFICIO REF: AIFA-GIAC-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}**\n\n` +
        `**FECHA:** ${new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}\n` +
        `**PARA:** Dirección Comercial / Arrendatarios Requeridos\n` +
        `**DE:** Grupo de Inteligencia y Análisis Comercial (GIAC) - AIFA\n` +
        `**ASUNTO:** Requerimiento Formal de Regularización Comercial / Cumplimiento Contractual\n\n` +
        `Por medio del presente, en el marco del seguimiento continuo a la cartera comercial del Aeropuerto Internacional Felipe Ángeles (AIFA), se solicita de la manera más atenta la inmediata regularización de los siguientes rubros observados en el expediente comercial:\n\n` +
        `1. **Actualización Documental:** Entrega y cotejo de Pólizas de Responsabilidad Civil (R.C.) y Garantía de Cumplimiento vigentes.\n` +
        `2. **Cumplimiento Obligacional:** Regularización de los saldos pendientes de pago por concepto de contraprestación mensual.\n\n` +
        `Agradecemos de antemano su atención a este comunicado para asegurar la continuidad operativa y el cumplimiento integral de los términos acordados.\n\n` +
        `*Atentamente,*\n` +
        `**Subdirección Comercial - GIAC AIFA**`,
      sources: ["Plantilla Oficial GIAC AIFA"],
    };
  }

  if (category === "finance" || /deuda|deudores|cartera|cobranza|renta|factura|saldo/.test(msg)) {
    const overdueTotal = context?.totalOverdueDebt ? `$${context.totalOverdueDebt.toLocaleString("es-MX")} MXN` : "$0.00 MXN";
    const debtorsCount = context?.totalDebtorsCount ?? 0;
    const topList = context?.topDebtors?.slice(0, 3).map((d) => `- **${d.name}**: $${d.amount.toLocaleString("es-MX")} MXN (${d.months} meses de mora)`).join("\n") ?? "- Sin deudores críticos registrados.";

    return {
      text: `### 📊 Diagnóstico Financiero & Cartera Vencida (GIAC AIFA)\n\n` +
        `A partir del análisis consolidado de la base financiera activa:\n\n` +
        `- **Cartera Vencida Acumulada:** **${overdueTotal}**\n` +
        `- **Arrendatarios en Estado de Mora:** **${debtorsCount} marcas**\n\n` +
        `#### 🚨 Principales Expedientes en Seguimiento Prioritario:\n${topList}\n\n` +
        `**Dictamen Comercial:** Emitir requerimientos formales de cobro y condicionar la renovación de contratos a la liquidación total de adeudos.`,
      sources: ["Módulo Financiero SIGCO"],
    };
  }

  // General Commercial Analysis
  const total = context?.totalLocals ?? 0;
  const op = context?.operatingLocals ?? 0;
  const adapt = context?.adaptingLocals ?? 0;
  const avail = context?.availableLocals ?? 0;

  return {
    text: `### 💡 Análisis Comercial & Estratégico AIFA (SIGCO)\n\n` +
      `De acuerdo con los datos registrados en el sistema **SIGCO** (` +
      `Total: **${total} locales**, **${op} en funcionamiento**, **${adapt} en adaptación**, **${avail} disponibles**):\n\n` +
      `- **Respuesta:** En relación a su consulta (*"${message}"*), se sugiere mantener el monitoreo continuo de los espacios disponibles y acelerar la transición de locales en obra a operación activa.\n` +
      `- **Recomendación GIAC:** Priorizar la asignación de giros de Alimentos y Servicios en zonas de alto tráfico de pasajeros para elevar la tasa de ocupación.`,
    sources: ["Directorio Comercial SIGCO GIAC"],
  };
}

export async function POST(req: Request) {
  try {
    const body: CopilotRequestPayload = await req.json();
    const { message, category = "chat", context } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const fallback = generateInstitutionalFallback(message, category, context);
      return NextResponse.json({
        success: true,
        response: fallback.text,
        sources: fallback.sources,
        mode: "fallback",
      });
    }

    // System Instructions with complete SIGCO GIAC AIFA Identity
    const systemPrompt =
      `Eres el Copiloto de Inteligencia Comercial Institucional de SIGCO (Sistema Integral de Gestión Comercial y Operativa), ` +
      `desarrollado para el GIAC (Grupo de Inteligencia y Análisis Comercial) de la Subdirección Comercial del Aeropuerto Internacional Felipe Ángeles (AIFA).\n\n` +
      `Conocimiento Institucional Permanente:\n` +
      `- SIGCO administra las 7 zonas comerciales del AIFA (ETP, Santa Lucía, Plaza Mexicana, etc.).\n` +
      `- El Scorecard evalúa arrendatarios de 0 a 100 pts: Estatus Operativo (35pts), Salud Documental (30pts), Formalización (20pts), Vigencia (15pts).\n` +
      `- Categorías de Calificación: A+ (90-100), A (75-89), B (60-74), C (40-59), D (<40).\n` +
      `- Contexto de datos activo: Locales Totales: ${context?.totalLocals ?? 0}, En Funcionamiento: ${context?.operatingLocals ?? 0}, En Adaptación: ${context?.adaptingLocals ?? 0}, Disponibles: ${context?.availableLocals ?? 0}, Cartera Vencida: $${context?.totalOverdueDebt?.toLocaleString("es-MX") ?? "0"} MXN (${context?.totalDebtorsCount ?? 0} deudores).\n\n` +
      `Instrucciones de Respuesta:\n` +
      `- Responde de forma sumamente ejecutiva, formal, inteligente y precisa en español.\n` +
      `- Si te preguntan qué es SIGCO o quién eres, responde con orgullo institucional explicando el Sistema Integral de Gestión Comercial y Operativa del AIFA.\n` +
      `- Utiliza formato Markdown limpio (encabezados ###, negritas, viñetas).\n` +
      `- Si piden redactar un oficio o comunicado, genera un memorándum formal oficial del AIFA / GIAC.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\nConsulta del usuario: ${message}` }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!geminiRes.ok) {
      const fallback = generateInstitutionalFallback(message, category, context);
      return NextResponse.json({
        success: true,
        response: fallback.text,
        sources: fallback.sources,
        mode: "fallback",
      });
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? generateInstitutionalFallback(message, category, context).text;

    return NextResponse.json({
      success: true,
      response: text,
      mode: "gemini-api",
    });
  } catch (error) {
    console.error("Error in Copilot API:", error);
    return NextResponse.json(
      { success: false, error: "No se pudo procesar la consulta en el Copiloto IA." },
      { status: 500 },
    );
  }
}
