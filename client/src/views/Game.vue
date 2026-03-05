<script setup>
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useGameStore, leaveGame } from "../store/gameStore"
import Card from "../components/Card.vue"
import PlayerHand from "../components/PlayerHand.vue"
import GameControls from "../components/GameControls.vue"
import PlayerList from "../components/PlayerList.vue"
import BigScreenView from "../components/BigScreenView.vue"
import { PHASES } from "../../../shared/gameConstants.js"

const route = useRoute()
const router = useRouter()
const store = useGameStore()

const roomId = computed(() => route.params.roomId)
const gameState = computed(() => store.state.gameState)
const phase = computed(() => gameState.value?.phase || "loading")
const myPlayer = computed(() => store.myPlayer)

// Big screen detection
const isBigScreenHost = computed(() => store.isBigScreenHost)
const isBigScreenPlayer = computed(() => store.isBigScreenPlayer)

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

// Animate pot changes
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

// Key for last action to retrigger animation
const actionKey = ref(0)
watch(() => gameState.value?.lastAction, () => {
  actionKey.value++
})

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
</script>

<template>
  <div class="game-container">
    <!-- Error toast -->
    <Transition name="toast">
      <div v-if="store.state.error" class="error-toast" :key="store.state.error">
        {{ store.state.error }}
      </div>
    </Transition>

    <!-- Reconnecting overlay -->
    <Transition name="overlay">
      <div v-if="store.isReconnecting" class="reconnecting-overlay">
        <div class="reconnecting-card">
          <div class="loading-spinner"></div>
          <p>Reconnecting to game...</p>
        </div>
      </div>
    </Transition>

    <!-- Disconnected banner -->
    <Transition name="toast">
      <div v-if="!store.state.isConnected && gameState" class="disconnect-banner">
        Connection lost — reconnecting...
      </div>
    </Transition>

    <!-- Loading -->
    <div v-if="!gameState && !store.isReconnecting" class="loading">
      <div class="loading-spinner"></div>
      <p>Loading game...</p>
    </div>

    <!-- ===== BIG SCREEN HOST ===== -->
    <BigScreenView v-else-if="isBigScreenHost" />

    <!-- ===== BIG SCREEN PLAYER (phone view) ===== -->
    <div v-else-if="isBigScreenPlayer" class="phone-view">
      <div class="phone-header">
        <Transition name="phase-swap" mode="out-in">
          <span class="phone-phase" :key="phase">{{ phaseLabel }}</span>
        </Transition>
        <span class="phone-pot">💰 ${{ displayPot }}</span>
        <span v-if="gameState.currentMaxBet > 0" class="phone-bet">Bet: ${{ gameState.currentMaxBet }}</span>
      </div>

      <!-- Lobby waiting -->
      <div v-if="phase === 'lobby'" class="phone-waiting-lobby">
        <p>Waiting for host to start the game...</p>
        <p class="phone-player-count">{{ gameState.players.length }} players joined</p>
      </div>

      <!-- Hand area -->
      <div v-else class="phone-hand-area">
        <div v-if="myPlayer" class="phone-cards-section">
          <PlayerHand
            :hand="myPlayer.hand"
            :money="myPlayer.money"
            :name="myPlayer.name"
            :privacy="true"
          />
        </div>

        <Transition name="action-fade" mode="out-in">
          <div v-if="lastActionText" class="phone-last-action" :key="actionKey">
            {{ lastActionText }}
          </div>
        </Transition>

        <div class="phone-controls">
          <GameControls />
        </div>
      </div>
    </div>

    <!-- ===== NORMAL GAME ===== -->
    <div v-else-if="phase === 'lobby'" class="lobby-phase">
      <div class="lobby-card">
        <h2>Waiting for Players</h2>
        <p class="room-code">Room Code: <strong>{{ roomId }}</strong></p>

        <TransitionGroup name="lobby-player" tag="div" class="lobby-players">
          <div v-for="player in gameState.players" :key="player.id" class="lobby-player">
            {{ player.name }}
            <span v-if="player.id === gameState.hostId" class="host-badge">Host</span>
          </div>
        </TransitionGroup>

        <p class="player-count">
          {{ gameState.players.length }} player{{ gameState.players.length !== 1 ? 's' : '' }} in lobby
        </p>

        <button
          v-if="store.isHost"
          @click="store.startGame"
          class="btn btn-primary btn-start"
          :disabled="gameState.players.length < 2"
        >
          Start Game
        </button>
        <p v-else class="waiting-text">
          Waiting for host to start...
        </p>
      </div>
    </div>

    <!-- Active game -->
    <div v-else class="game-phase">
      <!-- Top: other players -->
      <div class="players-area">
        <PlayerList
          :players="gameState.players"
          :myPlayerId="store.state.playerId"
          :phase="phase"
          :dealerIndex="gameState.dealerIndex"
          :smallBlindIndex="gameState.smallBlindIndex"
          :bigBlindIndex="gameState.bigBlindIndex"
          :winners="gameState.winners"
        />
      </div>

      <!-- Middle: table -->
      <div class="table-area">
        <div class="poker-table">
          <!-- Phase indicator -->
          <Transition name="phase-swap" mode="out-in">
            <div class="phase-badge" :key="phase">{{ phaseLabel }}</div>
          </Transition>

          <!-- Last action -->
          <Transition name="action-fade" mode="out-in">
            <div v-if="lastActionText" class="last-action" :key="actionKey">{{ lastActionText }}</div>
          </Transition>

          <!-- Pot -->
          <div class="pot">
            <span class="pot-icon">💰</span> ${{ displayPot }}
          </div>

          <!-- Community cards -->
          <div class="community-cards">
            <TransitionGroup name="card-reveal">
              <Card
                v-for="(card, i) in gameState.tableCards"
                :key="card"
                :card="card"
                :delay="i * 100"
              />
            </TransitionGroup>
            <!-- Empty slots -->
            <div
              v-for="i in (5 - (gameState.tableCards?.length || 0))"
              :key="'empty-' + i"
              class="card-slot"
            ></div>
          </div>

          <!-- Round info -->
          <div class="round-info">
            Round {{ gameState.roundNumber }}
            <span v-if="gameState.currentMaxBet > 0">
              &mdash; Current bet: ${{ gameState.currentMaxBet }}
            </span>
          </div>
        </div>
      </div>

      <!-- Bottom: my hand + controls -->
      <div class="my-area">
        <div class="my-hand-section" v-if="myPlayer">
          <PlayerHand
            :hand="myPlayer.hand"
            :money="myPlayer.money"
            :name="myPlayer.name"
          />
        </div>

        <div class="controls-section">
          <GameControls />
        </div>
      </div>
    </div>

    <!-- Game over overlay (normal + phone view only) -->
    <Transition name="overlay">
      <div v-if="phase === 'end' && !isBigScreenHost" class="game-over-overlay">
        <div class="game-over-card">
          <h2>Game Over!</h2>
          <p v-if="gameState.winners?.length">
            Winner: {{ gameState.players.find(p => p.id === gameState.winners[0]?.playerId)?.name }}
          </p>
          <p v-if="isBigScreenPlayer" class="waiting-text">Waiting for host...</p>
          <button v-else @click="leaveGame(); router.push('/')" class="btn btn-primary">
            Back to Lobby
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.game-container {
  width: 100%;
  min-height: calc(100vh - 100px);
  position: relative;
  display: flex;
  flex-direction: column;
}

/* --- Toasts --- */
.error-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(220, 40, 40, 0.92);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  z-index: 1000;
  backdrop-filter: blur(6px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}
.toast-enter-active, .toast-leave-active { transition: all 0.35s ease; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-10px); }

/* --- Loading --- */
.loading {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  gap: 1rem;
  font-size: 1.15rem;
  color: rgba(255, 255, 255, 0.6);
}
.loading-spinner {
  width: 36px; height: 36px;
  border: 3px solid rgba(255,255,255,0.15);
  border-top-color: #fbbf24;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* --- Reconnecting / Disconnect --- */
.reconnecting-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
  backdrop-filter: blur(4px);
}
.reconnecting-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: rgba(255,255,255,0.8);
  font-size: 1.1rem;
}

.disconnect-banner {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(245, 158, 11, 0.92);
  color: #000;
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  z-index: 1000;
  font-weight: 600;
  font-size: 0.9rem;
  backdrop-filter: blur(6px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}

/* --- Lobby --- */
.lobby-phase {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  animation: fadeIn 0.5s ease;
}

.lobby-card {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  min-width: 320px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.3);
}
.lobby-card h2 { margin-bottom: 1rem; }

.room-code {
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
  color: rgba(255, 255, 255, 0.8);
}
.room-code strong {
  color: #fbbf24;
  font-family: monospace;
  font-size: 1.5rem;
  user-select: all;
}

.lobby-players { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
.lobby-player {
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.lobby-player-enter-active, .lobby-player-leave-active { transition: all 0.3s ease; }
.lobby-player-enter-from { opacity: 0; transform: translateX(-12px); }
.lobby-player-leave-to { opacity: 0; transform: translateX(12px); }

.host-badge {
  background: #f59e0b;
  color: #000;
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
}

.player-count { margin: 1rem 0; color: rgba(255, 255, 255, 0.55); }
.waiting-text { color: rgba(255, 255, 255, 0.45); font-style: italic; }

/* --- Game Layout --- */
.game-phase {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0.75rem;
  animation: fadeIn 0.4s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.players-area { padding: 0.5rem; }

.table-area {
  display: flex;
  justify-content: center;
  flex: 1;
}

/* --- Poker Table --- */
.poker-table {
  background: radial-gradient(ellipse, #1a5c2a 0%, #0d3518 65%, #0a2610 100%);
  border-radius: 120px;
  border: 6px solid #8B6914;
  box-shadow:
    0 0 40px rgba(0, 0, 0, 0.5),
    inset 0 0 60px rgba(0, 0, 0, 0.3),
    0 0 0 10px rgba(139, 105, 20, 0.15);
  padding: 2rem 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-width: 520px;
  min-height: 260px;
  position: relative;
}

/* --- Phase Badge --- */
.phase-badge {
  position: absolute;
  top: 14px;
  right: 28px;
  background: rgba(0, 0, 0, 0.55);
  padding: 0.25rem 0.85rem;
  border-radius: 12px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.75);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
  border: 1px solid rgba(255,255,255,0.08);
}
.phase-swap-enter-active, .phase-swap-leave-active {
  transition: all 0.3s ease;
}
.phase-swap-enter-from { opacity: 0; transform: translateY(-6px); }
.phase-swap-leave-to { opacity: 0; transform: translateY(6px); }

/* --- Last Action --- */
.last-action {
  font-size: 0.85rem;
  color: #fbbf24;
  font-weight: 500;
  text-shadow: 0 1px 4px rgba(0,0,0,0.4);
}
.action-fade-enter-active, .action-fade-leave-active { transition: all 0.3s ease; }
.action-fade-enter-from { opacity: 0; transform: scale(0.9); }
.action-fade-leave-to { opacity: 0; transform: scale(0.95); }

/* --- Pot --- */
.pot {
  font-size: 1.4rem;
  font-weight: 700;
  color: #fbbf24;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
  transition: color 0.3s;
}
.pot-icon { font-size: 1.1rem; }

/* --- Community Cards --- */
.community-cards {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  min-height: 124px;
}

.card-reveal-enter-active {
  transition: all 0.4s ease;
}
.card-reveal-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.7) rotate(-10deg);
}

.card-slot {
  width: 83px;
  height: 120px;
  border: 2px dashed rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  transition: border-color 0.3s;
}

.round-info {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
}

/* --- Bottom Area --- */
.my-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 1rem 1rem 0.75rem;
  background: rgba(0, 0, 0, 0.25);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(4px);
}
.my-hand-section { flex-shrink: 0; }
.controls-section { flex: 1; max-width: 600px; }

/* --- Game Over Overlay --- */
.game-over-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}
.overlay-enter-active { transition: all 0.4s ease; }
.overlay-enter-from { opacity: 0; }
.overlay-leave-active { transition: all 0.3s ease; }
.overlay-leave-to { opacity: 0; }

.game-over-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 3rem;
  backdrop-filter: blur(12px);
  text-align: center;
  border: 1px solid rgba(255,255,255,0.08);
  animation: popIn 0.4s ease;
}
@keyframes popIn {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.game-over-card h2 { font-size: 2rem; margin-bottom: 1rem; }
.game-over-card p { font-size: 1.25rem; margin-bottom: 2rem; color: rgba(255, 255, 255, 0.8); }

/* --- Buttons --- */
.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}
.btn:disabled { opacity: 0.45; cursor: not-allowed; }

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.45);
}
.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-start {
  font-size: 1.1rem;
  padding: 0.85rem 2rem;
  animation: glow 2.5s ease-in-out infinite;
}
@keyframes glow {
  0%, 100% { box-shadow: 0 0 8px rgba(102,126,234,0.3); }
  50% { box-shadow: 0 0 20px rgba(102,126,234,0.6); }
}

/* ========= PHONE VIEW (Big Screen Player) ========= */
.phone-view {
  width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  animation: fadeIn 0.4s ease;
}

.phone-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-wrap: wrap;
}

.phone-phase {
  background: rgba(0, 0, 0, 0.4);
  padding: 0.2rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.7);
}

.phone-pot {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fbbf24;
}

.phone-bet {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
}

.phone-waiting-lobby {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

.phone-player-count {
  font-size: 0.9rem;
}

.phone-hand-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
}

.phone-cards-section {
  flex-shrink: 0;
}

.phone-last-action {
  font-size: 0.85rem;
  color: #fbbf24;
  font-weight: 500;
  text-align: center;
}

.phone-controls {
  width: 100%;
  max-width: 420px;
}
</style>
