import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import dotenv from "dotenv";

dotenv.config();

console.log("🔍 Checking local embedding setup...");

async function main() {
  const dataDir = path.resolve(process.cwd(), "data");
  const cvPath = path.join(dataDir, "cv.md");
  const outPath = path.join(dataDir, "index.json");

  // 1️⃣ Verify your CV file
  if (!fs.existsSync(cvPath)) {
    console.error("❌ Missing data/cv.md. Please add your resume text.");
    process.exit(1);
  }

  // 2️⃣ Verify your local embeddings
  if (!fs.existsSync(outPath)) {
    console.error("❌ Missing data/index.json. Run 'python scripts/build-index-local.py' first!");
    process.exit(1);
  }

  // 3️⃣ Optionally, inspect the file
  try {
    const data = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    console.log(`✅ Found ${data.length} embedding chunks in data/index.json`);
  } catch (err) {
    console.error("⚠️ Invalid index.json:", err);
  }
}

main().catch((e) => {
  console.error("❌ Fatal error:", e);
  process.exit(1);
});
