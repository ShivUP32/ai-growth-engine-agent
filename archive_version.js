import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVE_DIR = path.join(__dirname, '.versions_archive');
const LIVE_MANIFEST = path.join(__dirname, 'api', 'version_manifest.json');
const ARCHIVE_MANIFEST = path.join(ARCHIVE_DIR, 'version_manifest.json');

const FILES_TO_ARCHIVE = [
  'api/agent.js',
  'api/prompts.js',
  'api/version.js',
  'app.js',
  'index.html',
  'styles.css',
  'generate_pdf.py',
  'growth_engine_workflow.pdf'
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getArgs() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node archive_version.js <version> [description]');
    console.error('Example: node archive_version.js v1.0.0 "Initial stable release"');
    process.exit(1);
  }
  return {
    version: args[0],
    description: args[1] || 'No description provided.'
  };
}

function run() {
  const { version, description } = getArgs();

  // Validate version format (vX.Y.Z)
  const semverRegex = /^v\d+\.\d+\.\d+$/;
  if (!semverRegex.test(version)) {
    console.error(`Error: Version "${version}" does not match standard SemVer format (e.g. v1.0.0)`);
    process.exit(1);
  }

  const targetDir = path.join(ARCHIVE_DIR, version);
  if (fs.existsSync(targetDir)) {
    console.error(`Error: Version "${version}" already exists in archive directory.`);
    process.exit(1);
  }

  console.log(`Archiving release version: ${version}...`);
  ensureDir(targetDir);

  // Copy files
  for (const relPath of FILES_TO_ARCHIVE) {
    const src = path.join(__dirname, relPath);
    const dest = path.join(targetDir, relPath);

    if (fs.existsSync(src)) {
      ensureDir(path.dirname(dest));
      fs.copyFileSync(src, dest);
      console.log(`  Copied: ${relPath} -> .versions_archive/${version}/${relPath}`);
    } else {
      console.warn(`  Warning: File "${relPath}" not found. Skipping.`);
    }
  }

  const timestamp = new Date().toISOString();
  
  // Read and update global manifest
  let manifest = { versions: [] };
  if (fs.existsSync(ARCHIVE_MANIFEST)) {
    try {
      manifest = JSON.parse(fs.readFileSync(ARCHIVE_MANIFEST, 'utf8'));
    } catch (err) {
      console.warn('Warning: Could not parse archive manifest. Starting fresh.');
    }
  }

  // Add new version
  manifest.versions.unshift({
    version,
    description,
    timestamp
  });
  manifest.activeVersion = version;
  manifest.lastUpdated = timestamp;

  // Write archive manifest
  fs.writeFileSync(ARCHIVE_MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`Updated archive manifest at: .versions_archive/version_manifest.json`);

  // Write live manifest for dev server
  const liveManifestData = {
    activeVersion: version,
    releaseDate: timestamp,
    description
  };
  ensureDir(path.dirname(LIVE_MANIFEST));
  fs.writeFileSync(LIVE_MANIFEST, JSON.stringify(liveManifestData, null, 2));
  console.log(`Updated live active version file at: api/version_manifest.json`);

  console.log(`\n🎉 Successfully archived and set active version to: ${version}`);
}

run();
