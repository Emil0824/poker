import { io } from "socket.io-client"

const SERVER_URL = import.meta.env.PROD
  ? window.location.origin
  : "http://localhost:3001"

export const socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
})

socket.on("connect", () => {
  console.log("🔌 Connected to server:", socket.id)
})

socket.on("disconnect", reason => {
  console.log("🔌 Disconnected from server:", reason)
})

socket.on("reconnect_attempt", attempt => {
  console.log(`🔌 Reconnect attempt #${attempt}`)
})

socket.on("connect_error", error => {
  console.error("🔌 Connection error:", error.message)
})

