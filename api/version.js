import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed. Use GET." });
  }

  const liveManifestPath = path.join(__dirname, "version_manifest.json");
  let versionData = {
    activeVersion: "v0.0.0-dev",
    releaseDate: new Date().toISOString(),
    description: "Development Build",
  };

  if (fs.existsSync(liveManifestPath)) {
    try {
      versionData = JSON.parse(fs.readFileSync(liveManifestPath, "utf8"));
    } catch (err) {
      console.warn("Warning: Could not parse live version manifest:", err.message);
    }
  }

  res.setHeader("Content-Type", "application/json");
  return res.status(200).json(versionData);
}
