import { createServer } from "http"
import express from "express"
import { Server } from "socket.io"
import { setupSocketHandlers } from "./socket/socketHandlers.js"

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: { origin: "*" }
})

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" })
})

setupSocketHandlers(io)

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`🎲 Poker server running on port ${PORT}`)
})
