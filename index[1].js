import express from "express";
import { createBareServer } from "@tomphttp/bare-server-node";
import http from "http";
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

server.on("listening", () => {
  console.log(`🚀 Druxen Proxy Server running on port ${PORT}`);
  console.log(`📡 Bare server available at /bare/`);
});

server.listen(PORT);
