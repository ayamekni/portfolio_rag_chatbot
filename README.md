# Aya Portfolio Chatbot

An AI assistant embedded in Aya Mekni's portfolio website. Visitors can ask natural-language questions about her experience, projects, skills, and education — and receive warm, accurate, context-aware answers powered by a local RAG pipeline and the Groq LLM API.

---

## How it works

```
Visitor message
      │
      ▼
matchStaticFallback()   ←── keyword match (no API call needed)
      │ no match
      ▼
retrieveContext()       ←── embed query with all-MiniLM-L6-v2 (local ONNX)
      │                      cosine similarity against data/index.json
      ▼
Groq API (llama-3.3-70b-versatile)
      │  system prompt + top-3 CV chunks + conversation history
      ▼
Reply streamed to chat widget
      │ on error / rate limit
      ▼
matchStaticFallback()   ←── try static answer first
      │ no match
      ▼
GENERIC_FALLBACK        ←── friendly message, never raw error
```

**RAG is fully local.** The CV is chunked, embedded with `all-MiniLM-L6-v2` via `@xenova/transformers` (ONNX, runs in Node), and stored in `data/index.json`. No embedding API calls are made at runtime. Only the final LLM completion goes to Groq.

---

## Features

- **Semantic retrieval** — top-3 CV chunks retrieved by cosine similarity, prepended as context
- **Static fallback map** — 10 keyword groups intercept common questions instantly (no token spend, works when Groq is down)
- **Fuzzy matching** — punctuation stripped, spaces normalized before keyword lookup; catches typos and short inputs
- **Privacy guardrails** — phone number and personal data blocked at the system prompt level and in the static fallback map
- **Confidential system prompt** — bot never quotes, paraphrases, or confirms its own instructions
- **Rate-limit resilience** — Groq 429s and outages fall through to static answers, then a friendly generic message
- **Token-efficient** — 3 context chunks, 4-message history window, temperature 0.6
- **CORS** — configurable allowed origins via `ALLOWED_ORIGINS` env var

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, Node runtime) |
| LLM | Groq API — `llama-3.3-70b-versatile` |
| Embeddings | `@xenova/transformers` — `Xenova/all-MiniLM-L6-v2` (local ONNX) |
| Indexing | Python — `sentence-transformers`, `build_index_local.py` |
| Chat UI | `components/ChatWidget.tsx` — glass-morphism, animated, mobile-responsive |
| Markdown | `react-markdown` + `remark-gfm` |

---

## Project structure

```
aya-portfolio-chatbot-main/
├── app/
│   ├── api/chat/route.ts      # POST handler: RAG + Groq + fallbacks
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ChatWidget.tsx         # Floating chat UI
├── data/
│   ├── cv.md                  # Source CV — NEVER commit
│   └── index.json             # Pre-built embeddings — regenerate after CV changes
├── lib/
│   ├── retrieve.ts            # Embedding pipeline + cosine search
│   └── vector.ts              # cosineSimilarity helper
├── build_index_local.py       # One-time indexing script (Python)
└── .env.local                 # Secrets — NEVER commit
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment file

Create `.env.local` at the project root:

```env
GROQ_API_KEY=your_groq_api_key_here
ALLOWED_ORIGINS=https://your-portfolio.vercel.app,http://localhost:5173
```

Get a free Groq API key at [console.groq.com](https://console.groq.com).

`ALLOWED_ORIGINS` is optional — omit it to allow all origins (fine for development).

### 3. Add your CV

Place your CV as `data/cv.md` (plain markdown). This file must never be committed — it is listed in `.gitignore`.

### 4. Build the index

Run the Python indexer once (and again whenever you update `cv.md`):

```bash
pip install sentence-transformers
python build_index_local.py
```

This reads `data/cv.md`, chunks it into ~40–60 sections, generates embeddings with `all-MiniLM-L6-v2`, and writes `data/index.json`.

**Chunker settings** (top of `build_index_local.py`):

| Setting | Default | Effect |
|---|---|---|
| `CHUNK_SIZE` | 1800 chars | Max characters per chunk |
| `OVERLAP` | 40 words | Words carried over between chunks |
| `MIN_CHUNK` | 80 chars | Drop fragments shorter than this |

### 5. Run the dev server

```bash
npm run dev
```

The API is available at `http://localhost:3000/api/chat`.

---

## API

### `POST /api/chat`

**Request body:**

```json
{
  "messages": [
    { "role": "user", "content": "What projects has Aya built?" },
    { "role": "assistant", "content": "..." },
    { "role": "user", "content": "Tell me more about Vision-X" }
  ]
}
```

**Response (success):**

```json
{
  "reply": "Vision-X is a real-time multi-camera tracking system...",
  "references": [
    { "id": "chunk_12", "text": "## Projects\nVision-X — ..." }
  ]
}
```

**Response (fallback / error):**

```json
{
  "reply": "I'm taking a quick breather! But I can still answer questions about Aya's projects, skills, experience..."
}
```

The API always returns HTTP 200 with a `reply` field — never exposes raw errors to the frontend.

### `OPTIONS /api/chat`

Returns CORS preflight headers. Handled automatically.

---

## Rebuilding the index

Any time you update `data/cv.md`, re-run the indexer:

```bash
python build_index_local.py
```

The script prints chunk count and warns if it exceeds 200 (a sign the chunker settings need adjustment).

---

## Deployment

Deploy as a standard Next.js app (Vercel recommended):

1. Set `GROQ_API_KEY` and `ALLOWED_ORIGINS` in your hosting environment's secrets manager
2. Do **not** commit `data/cv.md` or `.env.local` — both are in `.gitignore`
3. Commit `data/index.json` — this is the pre-built embedding store (contains no raw CV text, only vectors and chunked excerpts)
4. Run `npm run build` — the ONNX model is bundled automatically via `@xenova/transformers`

### Embedding model on Vercel

`@xenova/transformers` downloads the ONNX model at first request and caches it. On serverless platforms with ephemeral filesystems the model re-downloads on each cold start. For production, consider:

- Vercel Pro (larger function memory + longer timeouts)
- Or pre-bundling the model weights into the deployment artifact

---

## Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Groq API key for LLM completions |
| `GROQ_MODEL` | No | Override default model (default: `llama-3.3-70b-versatile`) |
| `ALLOWED_ORIGINS` | No | Comma-separated allowed CORS origins (default: `*`) |

---

## Security notes

- `data/cv.md` contains personal information — keep it out of version control
- `.env.local` contains secrets — keep it out of version control
- The system prompt instructs the bot never to share phone numbers, salary, or financial information regardless of how the visitor phrases the request
- The static fallback map enforces the phone/privacy redirect even when Groq is unreachable
