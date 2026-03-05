import { reactive, readonly } from "vue"
import { socket } from "../socket"
import { MOVE_TYPES } from "../../../shared/gameConstants.js"

// Reactive game state
const state = reactive({
  gameState: null,
  roomId: null,
  playerId: null,
  playerName: null,
  error: null,
  isConnected: false,
  isReconnecting: false,
  isBigScreenHost: false,
})

// Persist session info so we can rejoin after refresh/reconnect
function saveSession() {
  if (state.roomId && state.playerName) {
    sessionStorage.setItem("poker_session", JSON.stringify({
      roomId: state.roomId,
      playerName: state.playerName,
      isBigScreenHost: state.isBigScreenHost,
    }))
  }
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem("poker_session")
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function clearSession() {
  sessionStorage.removeItem("poker_session")
}

// Initialize socket listeners
socket.on("connect", () => {
  state.isConnected = true
  state.playerId = socket.id

  // Auto-rejoin if we have a saved session
  const session = loadSession()
  if (session && !state.gameState) {
    state.isReconnecting = true
    state.isBigScreenHost = !!session.isBigScreenHost
    console.log("🔄 Attempting to rejoin game:", session.roomId)
    socket.emit("rejoinGame", {
      roomId: session.roomId,
      playerName: session.playerName,
    })
  }
})

socket.on("disconnect", () => {
  state.isConnected = false
  state.isReconnecting = false
})

socket.on("gameCreated", ({ roomId, bigScreen }) => {
  state.roomId = roomId
  state.isBigScreenHost = !!bigScreen
  state.error = null
  saveSession()
})

socket.on("rejoined", ({ roomId, playerId, bigScreen }) => {
  state.roomId = roomId
  state.playerId = playerId
  state.isBigScreenHost = !!bigScreen
  state.isReconnecting = false
  state.error = null
  console.log("🔄 Successfully rejoined game:", roomId)
  saveSession()
})

socket.on("gameState", newState => {
  state.gameState = newState
  state.error = null
  state.isReconnecting = false
})

socket.on("error", ({ message }) => {
  state.error = message
  state.isReconnecting = false
  setTimeout(() => {
    state.error = null
  }, 3000)
})

// Actions
export function createGame(playerName, bigScreen = false) {
  state.playerName = playerName
  state.isBigScreenHost = bigScreen
  socket.emit("createGame", { playerName, bigScreen })
}

export function joinGame(roomId, playerName) {
  state.playerName = playerName
  socket.emit("joinGame", { roomId, playerName })
  state.roomId = roomId
  saveSession()
}

export function startGame() {
  if (state.roomId) {
    socket.emit("startGame", { roomId: state.roomId })
  }
}

export function sendMove(move) {
  if (state.roomId) {
    socket.emit("playerMove", { roomId: state.roomId, move })
  }
}

export function fold() {
  sendMove({ type: MOVE_TYPES.FOLD })
}

export function check() {
  sendMove({ type: MOVE_TYPES.CHECK })
}

export function call() {
  sendMove({ type: MOVE_TYPES.CALL })
}

export function raise(amount) {
  sendMove({ type: MOVE_TYPES.RAISE, amount })
}

export function allIn() {
  sendMove({ type: MOVE_TYPES.ALL_IN })
}

export function nextHand() {
  if (state.roomId) {
    socket.emit("nextHand", { roomId: state.roomId })
  }
}

export function leaveGame() {
  state.gameState = null
  state.roomId = null
  state.playerName = null
  state.isBigScreenHost = false
  clearSession()
}

// Store composable
export function useGameStore() {
  return {
    state: readonly(state),

    get myPlayer() {
      if (!state.gameState) return null
      return state.gameState.players.find(p => p.id === state.playerId)
    },

    get isMyTurn() {
      // Legacy compat — still true if strict turn matches
      return state.gameState?.currentTurn === state.playerId
    },

    get canAct() {
      if (!state.gameState) return false
      const me = state.gameState.players.find(p => p.id === state.playerId)
      if (!me) return false
      return !me.folded && !me.allIn && !me.hasActed
    },

    get isHost() {
      return state.gameState?.hostId === state.playerId
    },

    get isBigScreenHost() {
      return state.isBigScreenHost
    },

    get isBigScreenPlayer() {
      return !!state.gameState?.bigScreen && !state.isBigScreenHost
    },

    get isReconnecting() {
      return state.isReconnecting
    },

    // Actions
    createGame,
    joinGame,
    startGame,
    sendMove,
    fold,
    check,
    call,
    raise,
    allIn,
    nextHand,
    leaveGame,
  }
}
