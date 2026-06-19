import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Simple environment variables loader
let envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  envPath = path.join(__dirname, '.env.local.txt');
}
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const index = trimmed.indexOf('=');
      if (index !== -1) {
        const key = trimmed.substring(0, index).trim();
        const value = trimmed.substring(index + 1).trim();
        process.env[key] = value;
      }
    }
  });
  console.log(`⚡ Loaded environment variables from: ${path.basename(envPath)}`);
} else {
  console.log('⚠️  No .env.local or .env.local.txt file found. Please create one with GROQ_API_KEY.');
}

const PORT = 3008;

// 2. Import the serverless handler dynamically
import handler from './api/agent.js';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Handle /api/version
  if (pathname === '/api/version' && req.method === 'GET') {
    const liveManifestPath = path.join(__dirname, 'api', 'version_manifest.json');
    let versionData = { activeVersion: 'v0.0.0-dev', releaseDate: new Date().toISOString(), description: 'Development Build' };
    if (fs.existsSync(liveManifestPath)) {
      try {
        versionData = JSON.parse(fs.readFileSync(liveManifestPath, 'utf8'));
      } catch (err) {
        console.warn('Warning: Could not parse live version manifest:', err.message);
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(versionData));
    return;
  }

  // 3. Handle /api/agent
  if (pathname === '/api/agent' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const parsedBody = body ? JSON.parse(body) : {};
        
        // Mock request object
        const mockReq = {
          method: 'POST',
          body: parsedBody,
        };

        // Mock response object
        let statusCode = 200;
        const headers = { 'Content-Type': 'application/json' };
        
        const mockRes = {
          status(code) {
            statusCode = code;
            return this;
          },
          setHeader(name, value) {
            headers[name] = value;
            return this;
          },
          json(data) {
            res.writeHead(statusCode, headers);
            res.end(JSON.stringify(data));
          }
        };

        // Invoke Vercel handler
        await handler(mockReq, mockRes);
      } catch (err) {
        console.error('API Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // 4. Serve Static Files
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  
  // Safely serve files only from the project root or docs/ folder
  const relative = path.relative(__dirname, filePath);
  const isSafe = !relative.startsWith('..') && !path.isAbsolute(relative);
  
  if (!isSafe) {
    res.writeHead(403);
    res.end('403 Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`==================================================`);
  console.log(`🚀 VoiceCare AI Safe Growth Engine Local Server`);
  console.log(`👉 Running at: ${url}`);
  console.log(`==================================================`);

  // Auto-open browser
  exec(`open ${url}`);
});
