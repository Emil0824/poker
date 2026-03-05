<script setup>
import { ref, watch, onMounted } from "vue"
import { useRouter, useRoute } from "vue-router"
import { useGameStore, createGame, joinGame } from "../store/gameStore"
import { socket } from "../socket"

const router = useRouter()
const route = useRoute()
const store = useGameStore()

const playerName = ref("")
const roomCode = ref("")
const mode = ref("menu") // menu | create | join
const bigScreen = ref(false)

// Auto-fill room code from URL query param (?room=XXXX)
onMounted(() => {
  const roomParam = route.query.room
  if (roomParam) {
    roomCode.value = roomParam
    mode.value = "join"
  }
})

// Listen for game creation and navigate
socket.on("gameCreated", ({ roomId }) => {
  router.push(`/game/${roomId}`)
})

// Navigate to game when state arrives (including after rejoin)
socket.on("gameState", () => {
  if (store.state.roomId) {
    router.push(`/game/${store.state.roomId}`)
  }
})

socket.on("rejoined", ({ roomId }) => {
  router.push(`/game/${roomId}`)
})

function handleCreate() {
  if (!playerName.value.trim() && !bigScreen.value) return
  const name = bigScreen.value ? "__bigscreen__" : playerName.value.trim()
  createGame(name, bigScreen.value)
}

function handleJoin() {
  if (!playerName.value.trim() || !roomCode.value.trim()) return
  joinGame(roomCode.value.trim(), playerName.value.trim())
}
</script>

<template>
  <div class="lobby">
    <div class="lobby-card">
      <h2>Welcome to Poker</h2>
      
      <!-- Error message -->
      <div v-if="store.state.error" class="error">
        {{ store.state.error }}
      </div>

      <!-- Main menu -->
      <div v-if="mode === 'menu'" class="menu">
        <button @click="mode = 'create'" class="btn btn-primary">
          🎮 Create Game
        </button>
        <button @click="mode = 'join'" class="btn btn-secondary">
          🔗 Join Game
        </button>
      </div>

      <!-- Create game form -->
      <div v-else-if="mode === 'create'" class="form">
        <div class="toggle-row">
          <label class="toggle-label" @click="bigScreen = !bigScreen">
            <span class="toggle-track" :class="{ active: bigScreen }">
              <span class="toggle-thumb"></span>
            </span>
            <span class="toggle-text">📺 Big Screen Mode</span>
          </label>
        </div>

        <p v-if="bigScreen" class="big-screen-hint">
          You'll be the display — players join on their own devices.
        </p>

        <input
          v-if="!bigScreen"
          v-model="playerName"
          type="text"
          placeholder="Your name"
          class="input"
          @keyup.enter="handleCreate"
        />
        <div class="buttons">
          <button @click="mode = 'menu'; bigScreen = false" class="btn btn-secondary">
            ← Back
          </button>
          <button
            @click="handleCreate"
            class="btn btn-primary"
            :disabled="!bigScreen && !playerName.trim()"
          >
            {{ bigScreen ? 'Launch Big Screen' : 'Create Game' }}
          </button>
        </div>
      </div>

      <!-- Join game form -->
      <div v-else-if="mode === 'join'" class="form">
        <input
          v-model="playerName"
          type="text"
          placeholder="Your name"
          class="input"
        />
        <input
          v-model="roomCode"
          type="text"
          placeholder="Room code"
          class="input"
          @keyup.enter="handleJoin"
        />
        <div class="buttons">
          <button @click="mode = 'menu'" class="btn btn-secondary">
            ← Back
          </button>
          <button
            @click="handleJoin"
            class="btn btn-primary"
            :disabled="!playerName.trim() || !roomCode.trim()"
          >
            Join Game
          </button>
        </div>
      </div>

      <!-- Connection status -->
      <div class="status">
        <span :class="['dot', { connected: store.state.isConnected }]"></span>
        {{ store.state.isConnected ? "Connected" : "Connecting..." }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.lobby {
  width: 100%;
  max-width: 400px;
}

.lobby-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

.error {
  background: rgba(255, 0, 0, 0.2);
  border: 1px solid rgba(255, 0, 0, 0.3);
  color: #ff6b6b;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: center;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.input:focus {
  border-color: rgba(255, 255, 255, 0.4);
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.buttons {
  display: flex;
  gap: 0.75rem;
}

.btn {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
}

.status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff6b6b;
}

.dot.connected {
  background: #51cf66;
}

/* Toggle switch */
.toggle-row {
  display: flex;
  justify-content: center;
  margin-bottom: 0.25rem;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  user-select: none;
}

.toggle-track {
  width: 44px;
  height: 24px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  position: relative;
  transition: background 0.25s;
}

.toggle-track.active {
  background: #667eea;
}

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.25s;
}

.toggle-track.active .toggle-thumb {
  transform: translateX(20px);
}

.toggle-text {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.85);
}

.big-screen-hint {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  text-align: center;
  font-style: italic;
}
</style>
