import express from "express";
import { createBareServer } from "@tomphttp/bare-server-node";
import http from "http";
import https from "https";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer();

// Create bare server
const bare = createBareServer("/bare/");

// Serve static files
app.use(express.static(join(__dirname, "static")));

// Handle bare server requests
server.on("request", (req, res) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});

const PORT = process.env.PORT || 8080;

// Download UV files if they don't exist
async function setupUVFiles() {
  const uvDir = join(__dirname, "static", "uv");
  const UV_VERSION = "3.2.6";
  const BASE_URL = `https://cdn.jsdelivr.net/npm/@titaniumnetwork-dev/ultraviolet@${UV_VERSION}/dist/`;
  
  const files = [
    'uv.bundle.js',
    'uv.handler.js',
    'uv.sw.js',
    'uv.client.js'
  ];

  // Create directory if it doesn't exist
  if (!fs.existsSync(uvDir)) {
    fs.mkdirSync(uvDir, { recursive: true });
  }

  // Check if files already exist
  const allExist = files.every(file => fs.existsSync(join(uvDir, file)));
  
  if (allExist) {
    console.log('✅ UV files already present');
    return;
  }

  console.log('📦 Downloading UV files...');

  function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          file.close();
          fs.unlinkSync(dest);
          downloadFile(response.headers.location, dest).then(resolve).catch(reject);
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        file.close();
        fs.unlinkSync(dest);
        reject(err);
      });
    });
  }

  try {
    for (const file of files) {
      const url = BASE_URL + file;
      const dest = join(uvDir, file);
      console.log(`⬇️  Downloading ${file}...`);
      await downloadFile(url, dest);
    }
    console.log('✅ UV files downloaded successfully!');
  } catch (error) {
    console.error('❌ Failed to download UV files:', error.message);
    console.log('⚠️  Server will start but proxy may not work');
  }
}

// Setup and start server
setupUVFiles().then(() => {
  server.on("listening", () => {
    console.log(`🚀 Druxen Proxy Server running on port ${PORT}`);
    console.log(`📡 Bare server available at /bare/`);
  });

  server.listen(PORT);
}).catch(error => {
  console.error('❌ Setup failed:', error);
  // Start server anyway
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} (with errors)`);
  });
});
