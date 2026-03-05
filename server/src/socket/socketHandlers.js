import { MAX_PLAYERS, PHASES, MOVE_TYPES } from "../../../shared/gameConstants.js"
import { createGame, addPlayerToGame } from "../game/createGame.js"
import { applyMove, startGame, startNextHand } from "../game/gameReducer.js"

const rooms = new Map()
const disconnectTimers = new Map() // socketId → { timerId, roomId, playerId }

const DISCONNECT_TIMEOUT_MS = 60_000 // 60 seconds

function broadcastState(io, roomId) {
  const game = rooms.get(roomId)
  if (game) io.to(roomId).emit("gameState", game)
}

// Auto-fold a disconnected player if they're in an active hand
function autoFoldDisconnected(io, roomId, playerId) {
  const game = rooms.get(roomId)
  if (!game) return

  const player = game.players.find(p => p.id === playerId)
  if (!player) return

  // If we're in an active betting phase and the player hasn't folded, auto-fold
  const activePhases = [PHASES.PRE_FLOP, PHASES.FLOP, PHASES.TURN, PHASES.RIVER]
  if (activePhases.includes(game.phase) && !player.folded && !player.allIn) {
    const result = applyMove(game, playerId, { type: MOVE_TYPES.FOLD })
    if (!result.error) {
      rooms.set(roomId, result.game)
      broadcastState(io, roomId)
      console.log(`⏱️ Auto-folded disconnected player: ${player.name}`)
    }
  }
}

export function setupSocketHandlers(io) {
  io.on("connection", socket => {
    console.log("🔌 Client connected:", socket.id)

    // Create a new game room
    socket.on("createGame", ({ playerName, bigScreen }) => {
      const roomId = crypto.randomUUID().slice(0, 4) // shorter room codes
      const game = createGame(socket.id, playerName, !!bigScreen)

      rooms.set(roomId, game)
      socket.join(roomId)
      socket.roomId = roomId
      socket.playerId = socket.id
      socket.isBigScreenHost = !!bigScreen

      console.log(`🎮 Game created: ${roomId} by ${playerName}${bigScreen ? ' (Big Screen)' : ''}`)

      socket.emit("gameCreated", { roomId, bigScreen: !!bigScreen })
      socket.emit("gameState", game)
    })

    // Join an existing game room
    socket.on("joinGame", ({ roomId, playerName }) => {
      const game = rooms.get(roomId)

      if (!game) {
        socket.emit("error", { message: "Game not found" })
        return
      }

      if (game.players.length >= MAX_PLAYERS) {
        socket.emit("error", { message: "Game is full" })
        return
      }

      if (game.phase !== PHASES.LOBBY) {
        socket.emit("error", { message: "Game already started" })
        return
      }

      const updatedGame = addPlayerToGame(game, socket.id, playerName)
      rooms.set(roomId, updatedGame)

      socket.join(roomId)
      socket.roomId = roomId
      socket.playerId = socket.id

      console.log(`👤 ${playerName} joined game: ${roomId}`)

      io.to(roomId).emit("gameState", updatedGame)
    })

    // Rejoin after reconnection
    socket.on("rejoinGame", ({ roomId, playerName }) => {
      const game = rooms.get(roomId)

      if (!game) {
        socket.emit("error", { message: "Game not found" })
        return
      }

      // Big screen host reconnecting
      if (game.bigScreen && game._hostDisconnected) {
        const oldHostId = game.hostId
        game.hostId = socket.id
        game._hostDisconnected = false
        rooms.set(roomId, game)

        socket.join(roomId)
        socket.roomId = roomId
        socket.playerId = socket.id
        socket.isBigScreenHost = true

        console.log(`🔄 Big screen host reconnected to game: ${roomId}`)
        socket.emit("rejoined", { roomId, playerId: socket.id, bigScreen: true })
        broadcastState(io, roomId)
        return
      }

      // Find the matching player by name (their old socket id is gone)
      const player = game.players.find(
        p => p.name === playerName && !p.connected
      )

      if (!player) {
        // Maybe they're already connected or name doesn't match
        socket.emit("error", { message: "Could not find your seat. Try joining again." })
        return
      }

      const oldPlayerId = player.id

      // Clear any pending disconnect timer
      const timerKey = `${roomId}:${oldPlayerId}`
      if (disconnectTimers.has(timerKey)) {
        clearTimeout(disconnectTimers.get(timerKey).timerId)
        disconnectTimers.delete(timerKey)
        console.log(`⏱️ Cleared disconnect timer for ${playerName}`)
      }

      // Update player id to new socket id and mark connected
      player.id = socket.id
      player.connected = true

      // If this player was the host, update hostId
      if (game.hostId === oldPlayerId) {
        game.hostId = socket.id
      }

      rooms.set(roomId, game)

      socket.join(roomId)
      socket.roomId = roomId
      socket.playerId = socket.id

      console.log(`🔄 ${playerName} reconnected to game: ${roomId}`)

      // Let the client know they successfully rejoined
      socket.emit("rejoined", { roomId, playerId: socket.id, bigScreen: false })
      broadcastState(io, roomId)
    })

    // Start the game (host only)
    socket.on("startGame", ({ roomId }) => {
      const game = rooms.get(roomId)

      if (!game) {
        socket.emit("error", { message: "Game not found" })
        return
      }

      if (game.hostId !== socket.id) {
        socket.emit("error", { message: "Only host can start the game" })
        return
      }

      if (game.players.length < 2) {
        socket.emit("error", { message: "Need at least 2 players to start" })
        return
      }

      const updatedGame = startGame(game)
      rooms.set(roomId, updatedGame)

      console.log(`🚀 Game started: ${roomId}`)

      io.to(roomId).emit("gameState", updatedGame)
    })

    // Handle player moves
    socket.on("playerMove", ({ roomId, move }) => {
      const game = rooms.get(roomId)

      if (!game) {
        socket.emit("error", { message: "Game not found" })
        return
      }

      const result = applyMove(game, socket.id, move)

      if (result.error) {
        socket.emit("error", { message: result.error })
        return
      }

      rooms.set(roomId, result.game)

      io.to(roomId).emit("gameState", result.game)
    })

    // Start next hand (host only)
    socket.on("nextHand", ({ roomId }) => {
      const game = rooms.get(roomId)

      if (!game) {
        socket.emit("error", { message: "Game not found" })
        return
      }

      if (game.hostId !== socket.id) {
        socket.emit("error", { message: "Only host can deal next hand" })
        return
      }

      if (game.phase !== PHASES.SHOWDOWN && game.phase !== PHASES.END) {
        socket.emit("error", { message: "Hand is still in progress" })
        return
      }

      const updatedGame = startNextHand(game)
      rooms.set(roomId, updatedGame)

      console.log(`🃏 Next hand dealt: ${roomId}`)

      io.to(roomId).emit("gameState", updatedGame)
    })

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("🔌 Client disconnected:", socket.id)

      if (!socket.roomId) return

      const roomId = socket.roomId
      const game = rooms.get(roomId)
      if (!game) return

      // Big screen host disconnecting — just mark for reconnect, don't touch players
      if (game.bigScreen && game.hostId === socket.id) {
        game._hostDisconnected = true
        rooms.set(roomId, game)
        console.log(`📺 Big screen host disconnected from ${roomId}`)
        return
      }

      const player = game.players.find(p => p.id === socket.id)
      if (!player) return

      // Mark disconnected
      player.connected = false
      rooms.set(roomId, game)
      broadcastState(io, roomId)

      console.log(`⏱️ Starting ${DISCONNECT_TIMEOUT_MS / 1000}s disconnect timer for ${player.name}`)

      // Start a timer — if they don't reconnect, auto-fold and remove
      const timerKey = `${roomId}:${socket.id}`
      const timerId = setTimeout(() => {
        disconnectTimers.delete(timerKey)

        const currentGame = rooms.get(roomId)
        if (!currentGame) return

        const currentPlayer = currentGame.players.find(p => p.id === socket.id)
        if (!currentPlayer || currentPlayer.connected) return

        console.log(`⏱️ Disconnect timeout expired for ${currentPlayer.name}`)

        // Auto-fold if in active hand
        autoFoldDisconnected(io, roomId, socket.id)

        // Clean up: in lobby remove them, in game mark folded permanently
        if (currentGame.phase === PHASES.LOBBY) {
          currentGame.players = currentGame.players.filter(p => p.id !== socket.id)
          // If host left, assign new host
          if (currentGame.hostId === socket.id && currentGame.players.length > 0) {
            currentGame.hostId = currentGame.players[0].id
          }
        }

        rooms.set(roomId, currentGame)
        broadcastState(io, roomId)

        // If room is empty, clean it up
        if (currentGame.players.every(p => !p.connected)) {
          console.log(`🗑️ Room ${roomId} is empty, cleaning up`)
          rooms.delete(roomId)
        }
      }, DISCONNECT_TIMEOUT_MS)

      disconnectTimers.set(timerKey, { timerId, roomId, playerId: socket.id })
    })
  })
}

