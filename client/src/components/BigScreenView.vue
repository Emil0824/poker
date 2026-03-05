<script setup>
import { computed, ref, watch } from "vue"
import { useGameStore, startGame, nextHand, leaveGame } from "../store/gameStore"
import { useRouter } from "vue-router"
import Card from "./Card.vue"
import PlayerList from "./PlayerList.vue"
import { PHASES } from "../../../shared/gameConstants.js"

const store = useGameStore()
const router = useRouter()

const gameState = computed(() => store.state.gameState)
const phase = computed(() => gameState.value?.phase || "loading")
const roomId = computed(() => store.state.roomId)

const BASE_URL = "https://poker.emilshome.com"
const joinUrl = computed(() => `${BASE_URL}/?room=${roomId.value}`)
const qrUrl = computed(() =>
  `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl.value)}`
)

const phaseLabel = computed(() => {
  const labels = {
    [PHASES.PRE_FLOP]: "Pre-Flop",
    [PHASES.FLOP]: "Flop",
    [PHASES.TURN]: "Turn",
    [PHASES.RIVER]: "River",
    [PHASES.SHOWDOWN]: "Showdown",
    [PHASES.END]: "Game Over",
  }
  return labels[phase.value] || phase.value
})

// Animated pot
const displayPot = ref(0)
watch(() => gameState.value?.pot, (newVal) => {
  if (newVal == null) return
  const start = displayPot.value
  const diff = newVal - start
  if (diff === 0) { displayPot.value = newVal; return }
  const steps = 15
  let step = 0
  const tick = () => {
    step++
    displayPot.value = Math.round(start + (diff * step / steps))
    if (step < steps) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}, { immediate: true })

const actionKey = ref(0)
watch(() => gameState.value?.lastAction, () => { actionKey.value++ })

const lastActionText = computed(() => {
  const action = gameState.value?.lastAction
  if (!action) return ""
  const player = gameState.value.players.find(p => p.id === action.playerId)
  const name = player?.name || "Someone"
  switch (action.type) {
    case "fold": return `${name} folded`
    case "check": return `${name} checked`
    case "call": return `${name} called $${action.amount}`
    case "raise": return `${name} raised to $${action.amount}`
    case "allIn": return `${name} went all-in ($${action.amount})`
    default: return ""
  }
})

const isShowdown = computed(() => phase.value === PHASES.SHOWDOWN || phase.value === PHASES.END)
const isPlaying = computed(() => [PHASES.PRE_FLOP, PHASES.FLOP, PHASES.TURN, PHASES.RIVER].includes(phase.value))

function handleNextHand() {
  nextHand()
}

function handleLeave() {
  leaveGame()
  router.push("/")
}
</script>

<template>
  <div class="bigscreen">
    <!-- Lobby: QR code + waiting -->
    <div v-if="phase === 'lobby'" class="bs-lobby">
      <h1 class="bs-title">Poker Night</h1>

      <div class="qr-section">
        <img :src="qrUrl" alt="QR Code to join" class="qr-code" />
        <p class="join-url">{{ joinUrl }}</p>
        <p class="room-label">Room: <strong>{{ roomId }}</strong></p>
      </div>

      <div class="bs-players-lobby">
        <TransitionGroup name="bs-player" tag="div" class="bs-player-chips">
          <div v-for="player in gameState.players" :key="player.id" class="bs-player-chip">
            {{ player.name }}
          </div>
        </TransitionGroup>
        <p class="player-count">
          {{ gameState.players.length }} player{{ gameState.players.length !== 1 ? 's' : '' }} joined
        </p>
      </div>

      <button
        @click="startGame"
        class="btn btn-start"
        :disabled="gameState.players.length < 2"
      >
        Start Game
      </button>
    </div>

    <!-- Active game -->
    <div v-else class="bs-game">
      <!-- Player list across top -->
      <div class="bs-players-bar">
        <PlayerList
          :players="gameState.players"
          myPlayerId="__bigscreen__"
          :phase="phase"
          :dealerIndex="gameState.dealerIndex"
          :smallBlindIndex="gameState.smallBlindIndex"
          :bigBlindIndex="gameState.bigBlindIndex"
          :winners="gameState.winners"
        />
      </div>

      <!-- Table -->
      <div class="bs-table-area">
        <div class="bs-poker-table">
          <Transition name="phase-swap" mode="out-in">
            <div class="bs-phase" :key="phase">{{ phaseLabel }}</div>
          </Transition>

          <Transition name="action-fade" mode="out-in">
            <div v-if="lastActionText" class="bs-last-action" :key="actionKey">
              {{ lastActionText }}
            </div>
          </Transition>

          <div class="bs-pot">💰 ${{ displayPot }}</div>

          <div class="bs-community">
            <TransitionGroup name="card-reveal">
              <Card
                v-for="(card, i) in gameState.tableCards"
                :key="card"
                :card="card"
                :delay="i * 120"
              />
            </TransitionGroup>
            <div
              v-for="i in (5 - (gameState.tableCards?.length || 0))"
              :key="'empty-' + i"
              class="bs-card-slot"
            ></div>
          </div>

          <div class="bs-round">
            Round {{ gameState.roundNumber }}
            <span v-if="gameState.currentMaxBet > 0">
              — Current bet: ${{ gameState.currentMaxBet }}
            </span>
          </div>
        </div>
      </div>

      <!-- Host controls -->
      <div class="bs-controls">
        <button v-if="isShowdown" @click="handleNextHand" class="btn btn-start">
          Deal Next Hand
        </button>
        <div v-else-if="isPlaying" class="bs-waiting">
          Hand in progress...
        </div>
      </div>
    </div>

    <!-- Game over overlay -->
    <Transition name="overlay">
      <div v-if="phase === 'end'" class="bs-game-over">
        <div class="bs-game-over-card">
          <h2>Game Over!</h2>
          <p v-if="gameState.winners?.length">
            Winner: {{ gameState.players.find(p => p.id === gameState.winners[0]?.playerId)?.name }}
          </p>
          <button @click="handleLeave" class="btn btn-start">
            Back to Lobby
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.bigscreen {
  width: 100%;
  min-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ========= Lobby ========= */
.bs-lobby {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 2rem;
  flex: 1;
  justify-content: center;
  animation: fadeIn 0.5s ease;
}

.bs-title {
  font-size: 3rem;
  font-weight: 800;
  background: linear-gradient(135deg, #fbbf24, #f59e0b, #d97706);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
}

.qr-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.qr-code {
  width: 200px;
  height: 200px;
  border-radius: 12px;
  border: 4px solid rgba(255, 255, 255, 0.15);
  background: #fff;
  padding: 8px;
}

.join-url {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.45);
  font-family: monospace;
}

.room-label {
  font-size: 1.4rem;
  color: rgba(255, 255, 255, 0.7);
}

.room-label strong {
  color: #fbbf24;
  font-family: monospace;
  font-size: 1.8rem;
  letter-spacing: 0.1em;
}

.bs-players-lobby {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.bs-player-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.bs-player-chip {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.5rem 1.25rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.bs-player-enter-active, .bs-player-leave-active { transition: all 0.3s ease; }
.bs-player-enter-from { opacity: 0; transform: scale(0.8); }
.bs-player-leave-to { opacity: 0; transform: scale(0.8); }

.player-count {
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.9rem;
}

/* ========= Active Game ========= */
.bs-game {
  width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0.5rem;
  animation: fadeIn 0.4s ease;
}

.bs-players-bar {
  padding: 0.75rem 1rem;
}

.bs-table-area {
  display: flex;
  justify-content: center;
  flex: 1;
  align-items: center;
  padding: 0 2rem;
}

.bs-poker-table {
  background: radial-gradient(ellipse, #1a5c2a 0%, #0d3518 65%, #0a2610 100%);
  border-radius: 140px;
  border: 8px solid #8B6914;
  box-shadow:
    0 0 50px rgba(0, 0, 0, 0.5),
    inset 0 0 80px rgba(0, 0, 0, 0.3),
    0 0 0 14px rgba(139, 105, 20, 0.12);
  padding: 2.5rem 4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-width: 600px;
  min-height: 320px;
  position: relative;
  width: 70vw;
  max-width: 900px;
}

.bs-phase {
  position: absolute;
  top: 18px;
  right: 32px;
  background: rgba(0, 0, 0, 0.55);
  padding: 0.3rem 1rem;
  border-radius: 12px;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.75);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.bs-last-action {
  font-size: 1.1rem;
  color: #fbbf24;
  font-weight: 600;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.bs-pot {
  font-size: 2rem;
  font-weight: 800;
  color: #fbbf24;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
}

.bs-community {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  min-height: 140px;
}

.bs-community :deep(.card img) {
  height: 140px;
}

.bs-card-slot {
  width: 97px;
  height: 140px;
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.bs-round {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.4);
}

/* ========= Host Controls ========= */
.bs-controls {
  display: flex;
  justify-content: center;
  padding: 1rem;
}

.bs-waiting {
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
  font-size: 1rem;
}

/* ========= Game Over ========= */
.bs-game-over {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.bs-game-over-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 3rem;
  backdrop-filter: blur(12px);
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  animation: popIn 0.4s ease;
}

.bs-game-over-card h2 { font-size: 2.5rem; margin-bottom: 1rem; }
.bs-game-over-card p { font-size: 1.5rem; margin-bottom: 2rem; color: rgba(255, 255, 255, 0.8); }

/* ========= Shared ========= */
.btn {
  padding: 0.85rem 2rem;
  border-radius: 10px;
  border: none;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
}
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-start {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 1.3rem;
  padding: 1rem 2.5rem;
  animation: glow 2.5s ease-in-out infinite;
}

.btn-start:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(102, 126, 234, 0.5);
}

/* Transitions */
.phase-swap-enter-active, .phase-swap-leave-active { transition: all 0.3s ease; }
.phase-swap-enter-from { opacity: 0; transform: translateY(-6px); }
.phase-swap-leave-to { opacity: 0; transform: translateY(6px); }

.action-fade-enter-active, .action-fade-leave-active { transition: all 0.3s ease; }
.action-fade-enter-from { opacity: 0; transform: scale(0.9); }
.action-fade-leave-to { opacity: 0; transform: scale(0.95); }

.card-reveal-enter-active { transition: all 0.4s ease; }
.card-reveal-enter-from { opacity: 0; transform: translateY(16px) scale(0.7) rotate(-10deg); }

.overlay-enter-active { transition: all 0.4s ease; }
.overlay-enter-from { opacity: 0; }
.overlay-leave-active { transition: all 0.3s ease; }
.overlay-leave-to { opacity: 0; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes popIn { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes glow {
  0%, 100% { box-shadow: 0 0 8px rgba(102,126,234,0.3); }
  50% { box-shadow: 0 0 20px rgba(102,126,234,0.6); }
}
</style>
