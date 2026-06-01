import app from "../index.js";
import { createServer } from "http";

const server = createServer(app);

// Ensure Vercel can handle the request correctly
export default function handler(req, res) {
  server.emit("request", req, res);
}
