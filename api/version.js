import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed. Use GET." });
  }

  // 1. Try reading the live manifest first (for local dev)
  const manifestPath = path.join(process.cwd(), "api", "version_manifest.json");
  let versionData = null;

  if (fs.existsSync(manifestPath)) {
    try {
      versionData = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch (err) {
      console.warn("Warning: Could not parse live version manifest:", err.message);
    }
  }

  // 2. If manifest doesn't exist (e.g. on production/Vercel where it is gitignored), fall back to package.json
  if (!versionData) {
    const packagePath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(packagePath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
        versionData = {
          activeVersion: pkg.version ? `v${pkg.version}` : "v0.0.0-dev",
          releaseDate: new Date().toISOString(),
          description: pkg.description || "VoiceCare AI Safe Growth Engine",
        };
      } catch (err) {
        console.warn("Warning: Could not parse package.json:", err.message);
      }
    }
  }

  // 3. Absolute fallback
  if (!versionData) {
    versionData = {
      activeVersion: "v0.0.0-dev",
      releaseDate: new Date().toISOString(),
      description: "Development Build",
    };
  }

  res.setHeader("Content-Type", "application/json");
  return res.status(200).json(versionData);
}
