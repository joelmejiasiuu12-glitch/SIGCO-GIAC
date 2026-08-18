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

function generateFallbackResponse(message: string, category: string, context?: CopilotRequestPayload["context"]) {
  const msg = message.toLowerCase();

  if (category === "oficio" || /oficio|carta|notificacion|comunicado|requerimiento/.test(msg)) {
    return {
      text: `### 📄 Borrador de Oficio Oficial AIFA / GIAC\n\n` +
        `**MEMORÁNDUM / OFICIO REF: AIFA-GIAC-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}**\n\n` +
        `**FECHA:** ${new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}\n` +
        `**PARA:** Dirección Comercial / Arrendatario Requerido\n` +
        `**DE:** Grupo de Inteligencia y Análisis Comercial (GIAC) - AIFA\n` +
        `**ASUNTO:** Requerimiento Formal de Regularización Comercial / Cumplimiento Contractual\n\n` +
        `Por medio del presente, en el marco del seguimiento continuo a la cartera comercial del Aeropuerto Internacional Felipe Ángeles (AIFA), se solicita de la manera más atenta la inmediata regularización de los siguientes rubros observados en el expediente comercial:\n\n` +
        `1. **Actualización Documental:** Entrega y cotejo de Pólizas de Responsabilidad Civil (R.C.) y Garantía de Cumplimiento vigentes.\n` +
        `2. **Cumplimiento Obligacional:** Regularización de los saldos pendientes de pago por concepto de contraprestación mensual.\n\n` +
        `Agradecemos de antemano su atención a este comunicado para asegurar la continuidad operativa y el cumplimiento integral de los términos acordados.\n\n` +
        `*Atentamente,*\n` +
        `**Subdirección Comercial - GIAC AIFA**`,
      sources: ["Plantilla Institucional GIAC AIFA"],
    };
  }

  if (category === "finance" || /deuda|deudores|cartera|cobranza|renta|factura/.test(msg)) {
    const overdueTotal = context?.totalOverdueDebt ? `$${context.totalOverdueDebt.toLocaleString("es-MX")} MXN` : "$0.00 MXN";
    const debtorsCount = context?.totalDebtorsCount ?? 0;
    const topList = context?.topDebtors?.slice(0, 3).map((d) => `- **${d.name}**: $${d.amount.toLocaleString("es-MX")} MXN (${d.months} meses)`).join("\n") ?? "- Sin deudores críticos registrados.";

    return {
      text: `### 📊 Diagnóstico Financiero & Cartera Vencida\n\n` +
        `A partir del análisis consolidado de la base financiera activa:\n\n` +
        `- **Cartera Vencida Acumulada:** **${overdueTotal}**\n` +
        `- **Arrendatarios en Estado de Mora:** **${debtorsCount} marcas**\n\n` +
        `#### 🚨 Principales Expedientes en Seguimiento:\n${topList}\n\n` +
        `**Recomendación GIAC:** Emitir notificaciones de cobro prioritarias y condicionar las renovaciones de contrato a la liquidación total de los saldos pendientes.`,
      sources: ["Módulo Financiero GIAC"],
    };
  }

  // General Chat / Commercial Analysis
  const total = context?.totalLocals ?? 0;
  const op = context?.operatingLocals ?? 0;
  const adapt = context?.adaptingLocals ?? 0;
  const avail = context?.availableLocals ?? 0;

  return {
    text: `### 💡 Análisis Comercial & Estratégico AIFA\n\n` +
      `De acuerdo a la información registrada en el sistema (` +
      `Total: **${total} locales**, **${op} en funcionamiento**, **${adapt} en adaptación**, **${avail} disponibles**):\n\n` +
      `- **Respuesta:** En relación a su consulta (*"${message}"*), se sugiere mantener el monitoreo continuo de los espacios disponibles y verificar la salud documental de la cartera.\n` +
      `- **Estrategia Recomendada:** Fomentar la asignación prioritaria de giros complementarios (Alimentos & Servicios) en zonas de alto tráfico de pasajeros.`,
    sources: ["Directorio Comercial GIAC"],
  };
}

export async function POST(req: Request) {
  try {
    const body: CopilotRequestPayload = await req.json();
    const { message, category = "chat", context } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const fallback = generateFallbackResponse(message, category, context);
      return NextResponse.json({
        success: true,
        response: fallback.text,
        sources: fallback.sources,
        mode: "fallback",
      });
    }

    // System Instructions for GIAC AIFA Copilot
    const systemPrompt =
      `Eres el Copiloto de Inteligencia Comercial Institucional (GIAC) del Aeropuerto Internacional Felipe Ángeles (AIFA).\n` +
      `Respondes de forma ejecutiva, formal y precisa en español coloquial institucional.\n` +
      `Contexto comercial actual:\n` +
      `- Locales totales: ${context?.totalLocals ?? "ND"}\n` +
      `- En funcionamiento: ${context?.operatingLocals ?? "ND"}\n` +
      `- En adaptación: ${context?.adaptingLocals ?? "ND"}\n` +
      `- Disponibles: ${context?.availableLocals ?? "ND"}\n` +
      `- Cartera Vencida Total: $${context?.totalOverdueDebt?.toLocaleString("es-MX") ?? "0"} MXN (${context?.totalDebtorsCount ?? 0} deudores)\n\n` +
      `Instrucciones:\n` +
      `- Usa formato Markdown claro (encabezados, negritas, viñetas).\n` +
      `- Si el usuario pide un oficio o carta, redacta un documento oficial institucional formal.\n` +
      `- Brinda recomendaciones analíticas sólidas para la toma de decisiones comerciales.`;

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
      const fallback = generateFallbackResponse(message, category, context);
      return NextResponse.json({
        success: true,
        response: fallback.text,
        sources: fallback.sources,
        mode: "fallback",
      });
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? generateFallbackResponse(message, category, context).text;

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
