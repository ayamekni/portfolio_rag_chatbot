import os
import json
import re
from markdown import markdown
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

# ==============================
# CONFIGURATION
# ==============================
DATA_DIR = os.path.join(os.getcwd(), "data")
CV_PATH = os.path.join(DATA_DIR, "cv.md")
OUT_PATH = os.path.join(DATA_DIR, "index.json")
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
CHUNK_SIZE = 1800   # larger = more coherent sections per chunk
OVERLAP = 40        # words of overlap between adjacent chunks in same section
MIN_CHUNK = 80      # drop micro-fragments shorter than this


# ==============================
# HELPERS
# ==============================

def strip_markdown(md_text: str) -> str:
    html = markdown(md_text)
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"&[a-z]+;", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def smart_chunk_by_section(md_text: str, max_len: int = CHUNK_SIZE) -> list[str]:
    """
    Split on markdown headings, prepend the heading to every chunk so
    retrieval can match section names (e.g. 'PROJECTS', 'SKILLS') directly.
    Drop micro-fragments produced by very short subsections.
    """
    # Keep headings as capture groups so we can use them as prefixes
    parts = re.split(r'\n(#{1,3} .+)\n', md_text)

    chunks: list[str] = []
    current_heading = ""

    for part in parts:
        # Identify heading tokens
        if re.match(r'^#{1,3} ', part.strip()):
            current_heading = strip_markdown(part.strip())
            continue

        # Strip markdown from body text
        body = strip_markdown(part)
        if not body.strip():
            continue

        words = body.split()
        current: list[str] = []

        for word in words:
            current.append(word)
            joined = " ".join(current)
            if len(joined) >= max_len:
                chunk_text = f"{current_heading}\n{joined}" if current_heading else joined
                chunks.append(chunk_text)
                current = current[-OVERLAP:]

        if current:
            joined = " ".join(current)
            chunk_text = f"{current_heading}\n{joined}" if current_heading else joined
            chunks.append(chunk_text)

    # Drop micro-fragments
    return [c for c in chunks if len(c.strip()) >= MIN_CHUNK]


# ==============================
# MAIN PIPELINE
# ==============================
def main():
    if not os.path.exists(CV_PATH):
        print("Missing data/cv.md — please add your resume file.")
        return

    print("Reading CV...")
    with open(CV_PATH, "r", encoding="utf-8") as f:
        md = f.read()

    chunks = smart_chunk_by_section(md)
    print(f"Split into {len(chunks)} chunks (target: 35-60).")

    if len(chunks) > 200:
        print(f"Warning: {len(chunks)} chunks is high — check CHUNK_SIZE or CV structure.")

    print(f"Loading model '{MODEL_NAME}'...")
    model = SentenceTransformer(MODEL_NAME)

    print("Generating embeddings...")
    embeddings = model.encode(chunks, convert_to_numpy=True, show_progress_bar=True)

    index = []
    for i, (text, emb) in tqdm(enumerate(zip(chunks, embeddings)), total=len(chunks)):
        index.append({
            "id": str(i),
            "text": text,
            "embedding": emb.tolist()
        })

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(index)} chunks -> {OUT_PATH}")


if __name__ == "__main__":
    main()
