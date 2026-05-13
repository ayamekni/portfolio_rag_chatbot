import { NextRequest, NextResponse } from "next/server";
import { retrieveContext } from "@/lib/retrieve";
import Groq from "groq-sdk";

type ChatMessageRole = "user" | "assistant" | "system";
type Message = { role: ChatMessageRole; content: string };

export const runtime = "nodejs";

function corsHeaders(origin?: string) {
  const allowed = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const isAllowed = origin && allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin! : "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin") ?? undefined),
  });
}

const SYSTEM_PROMPT = `You are the AI assistant on Aya Mekni's portfolio website.

About Aya:
- AI Engineer & Data Engineer, graduating June 2026 from ESPRIM (GPA: 15.12/20).
- Currently working full-time as AI Engineer at Roundesk (since January 2026), building a multi-tenant agentic SaaS platform with LangGraph, MCP, ReAct, and multi-LLM routing.
- Winner of the AI Camera Challenge at GAICA 2025 hackathon — real-time computer vision in 24h on NVIDIA GPUs.
- Core expertise: LLM agents, RAG, MLOps, document intelligence & OCR, data engineering (Airflow, Spark, Kafka).
- Open to: AI Engineer, Data Engineer, MLOps Engineer — on-site Tunisia, relocation Europe, or remote.
- Contact: aya.mekni@esprim.tn | linkedin.com/in/aya-mekni

FORMATTING RULES — follow exactly:
- Use markdown. Render bullet lists with "- " (dash space), never with • symbols.
- Use **bold** only for names, tools, and key metrics.
- Use a short ### heading only when the answer has 2+ distinct sections.
- Keep the total response under 120 words unless the question explicitly needs detail.
- One short closing sentence max — no lengthy sign-off paragraphs.
- Never repeat the question back. Get straight to the answer.
- Never invent facts not found in the context. If unsure, direct to aya.mekni@esprim.tn.`;

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin") ?? undefined);

  try {
    const body = await req.json().catch(() => ({}));
    const messages = (body?.messages ?? []) as Message[];
    const userMsg = messages.filter(m => m.role === "user").pop()?.content?.trim() ?? "";

    if (!userMsg) {
      return NextResponse.json({ error: "Empty message." }, { status: 400, headers });
    }

    // Retrieve relevant CV context (real semantic search)
    const retrieved = await retrieveContext(userMsg, 8);
    const context = retrieved.map((r, i) => `[${i + 1}] ${r.text}`).join("\n\n");

    // Init Groq inside handler — safe if env var is missing at module load
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.slice(-6),
        {
          role: "user",
          content: `Relevant context from Aya's CV:\n${context}\n\nQuestion: ${userMsg}`,
        },
      ],
    });

    const reply = response?.choices?.[0]?.message?.content?.trim() ?? "No response available.";
    return NextResponse.json({ reply, references: retrieved }, { headers });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("Chat route error:", msg);
    return NextResponse.json({ error: msg }, { status: 500, headers });
  }
}
