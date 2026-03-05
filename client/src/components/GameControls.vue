<script setup>
import { ref, computed, watch } from "vue"
import { useGameStore, fold, check, call, raise, allIn, nextHand } from "../store/gameStore"
import { PHASES } from "../../../shared/gameConstants.js"

const store = useGameStore()

const gameState = computed(() => store.state.gameState)
const myPlayer = computed(() => store.myPlayer)
const canAct = computed(() => store.canAct)
const isHost = computed(() => store.isHost)
const phase = computed(() => gameState.value?.phase)

const callAmount = computed(() => {
  if (!myPlayer.value || !gameState.value) return 0
  return Math.min(
    gameState.value.currentMaxBet - myPlayer.value.bet,
    myPlayer.value.money
  )
})

const canCheck = computed(() => {
  if (!myPlayer.value || !gameState.value) return false
  return gameState.value.currentMaxBet <= myPlayer.value.bet
})

const canCall = computed(() => {
  return !canCheck.value && callAmount.value > 0
})

const minRaiseVal = computed(() => {
  if (!gameState.value || !myPlayer.value) return 0
  return gameState.value.currentMaxBet + gameState.value.minRaise
})

const maxRaise = computed(() => {
  if (!myPlayer.value) return 0
  return myPlayer.value.bet + myPlayer.value.money
})

const canRaise = computed(() => {
  return maxRaise.value > minRaiseVal.value
})

const raiseAmount = ref(20)

// Keep raise slider in range when min changes
watch(minRaiseVal, (val) => {
  if (raiseAmount.value < val) raiseAmount.value = val
})

function handleRaise() {
  raise(raiseAmount.value)
}

const isShowdown = computed(() => phase.value === PHASES.SHOWDOWN || phase.value === PHASES.END)
const isPlaying = computed(() =>
  [PHASES.PRE_FLOP, PHASES.FLOP, PHASES.TURN, PHASES.RIVER].includes(phase.value)
)
</script>

<template>
  <div class="game-controls">
    <!-- Showdown: next hand button -->
    <div v-if="isShowdown" class="showdown-controls">
      <button v-if="isHost" @click="nextHand" class="btn btn-primary btn-glow">
        Deal Next Hand
      </button>
      <p v-else class="waiting-text">Waiting for host to deal...</p>
    </div>

    <!-- Active play controls — shown whenever player can act -->
    <div v-else-if="isPlaying && canAct && myPlayer" class="action-buttons">
      <button @click="fold" class="btn btn-danger">Fold</button>

      <button v-if="canCheck" @click="check" class="btn btn-secondary">
        Check
      </button>

      <button v-if="canCall" @click="call" class="btn btn-primary">
        Call ${{ callAmount }}
      </button>

      <div v-if="canRaise" class="raise-group">
        <input
          type="range"
          v-model.number="raiseAmount"
          :min="minRaiseVal"
          :max="maxRaise"
          step="5"
          class="raise-slider"
        />
        <button @click="handleRaise" class="btn btn-accent">
          Raise ${{ raiseAmount }}
        </button>
      </div>

      <button @click="allIn" class="btn btn-warning">
        All In ${{ myPlayer.money }}
      </button>
    </div>

    <!-- Already acted this round -->
    <div v-else-if="isPlaying && myPlayer && !myPlayer.folded && !myPlayer.allIn && myPlayer.hasActed" class="waiting">
      <p>Waiting for others...</p>
    </div>

    <div v-else-if="myPlayer?.folded" class="waiting">
      <p>You folded this hand</p>
    </div>

    <div v-else-if="myPlayer?.allIn" class="waiting">
      <p>You are all-in!</p>
    </div>
  </div>
</template>

<style scoped>
.game-controls {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  animation: fadeSlideUp 0.3s ease;
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.raise-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.raise-slider {
  width: 120px;
  accent-color: #fbbf24;
}

.btn {
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  overflow: hidden;
}

.btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0);
  transition: background 0.15s;
}

.btn:hover::after {
  background: rgba(255, 255, 255, 0.1);
}

.btn:active {
  transform: scale(0.96);
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.btn:active {
  transform: translateY(0) scale(0.97);
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
}

.btn-accent {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #000;
}

.btn-warning {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: #fff;
}

.btn-glow {
  animation: glow 2s ease-in-out infinite alternate;
}

@keyframes glow {
  from { box-shadow: 0 0 8px rgba(102, 126, 234, 0.3); }
  to { box-shadow: 0 0 20px rgba(102, 126, 234, 0.6); }
}

.waiting, .showdown-controls {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.waiting-text {
  color: rgba(255, 255, 255, 0.4);
}
</style>
