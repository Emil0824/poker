<script setup>
import Card from "./Card.vue"
import { PHASES } from "../../../shared/gameConstants.js"

const props = defineProps({
  players: Array,
  myPlayerId: String,
  phase: String,
  dealerIndex: Number,
  smallBlindIndex: Number,
  bigBlindIndex: Number,
  winners: Array,
})

function getPlayerRole(index) {
  const roles = []
  if (index === props.dealerIndex) roles.push("D")
  if (index === props.smallBlindIndex) roles.push("SB")
  if (index === props.bigBlindIndex) roles.push("BB")
  return roles.join(" / ")
}

function getStatusText(player) {
  if (player.folded && player.money <= 0) return "Out"
  if (player.folded) return "Folded"
  if (player.allIn) return "ALL IN"
  if (!player.connected) return "Disconnected"
  return ""
}

function needsToAct(player) {
  return !player.folded && !player.allIn && !player.hasActed && isPlaying()
}

function isWinner(playerId) {
  return props.winners?.some(w => w.playerId === playerId)
}

function getWinInfo(playerId) {
  return props.winners?.find(w => w.playerId === playerId)
}

const isShowdown = () => props.phase === PHASES.SHOWDOWN
const isPlaying = () => [PHASES.PRE_FLOP, PHASES.FLOP, PHASES.TURN, PHASES.RIVER].includes(props.phase)
</script>

<template>
  <div class="player-list">
    <TransitionGroup name="player">
      <div
        v-for="(player, index) in players"
        :key="player.id"
        class="player-card"
        :class="{
          'needs-action': needsToAct(player),
          'has-acted': player.hasActed && isPlaying() && !player.folded,
          'is-me': player.id === myPlayerId,
          'is-folded': player.folded,
          'is-winner': isWinner(player.id),
          'is-disconnected': !player.connected,
          'is-all-in': player.allIn,
        }"
      >
        <div class="player-header">
          <span class="player-name">
            {{ player.name }}
            <span v-if="player.id === myPlayerId" class="me-tag">(you)</span>
          </span>
          <div class="badges">
            <span v-if="player.hasActed && isPlaying() && !player.folded && !player.allIn" class="acted-badge">✓</span>
            <span v-if="getPlayerRole(index)" class="role-badge">{{ getPlayerRole(index) }}</span>
          </div>
        </div>

        <div class="player-info">
          <span class="money">${{ player.money }}</span>
          <span v-if="player.bet > 0" class="bet">Bet: ${{ player.bet }}</span>
          <span v-if="getStatusText(player)" class="status" :class="{ 'status-allin': player.allIn }">{{ getStatusText(player) }}</span>
        </div>

        <!-- Show cards at showdown for non-folded players -->
        <div v-if="isShowdown() && !player.folded && player.hand?.length" class="player-cards">
          <Card v-for="(card, i) in player.hand" :key="i" :card="card" />
        </div>

        <!-- Show face-down cards during play (not for self) -->
        <div v-else-if="player.id !== myPlayerId && player.hand?.length && !player.folded && phase !== 'lobby'" class="player-cards">
          <Card v-for="(card, i) in player.hand" :key="i" :card="card" :faceDown="true" />
        </div>

        <!-- Winner info -->
        <div v-if="isWinner(player.id)" class="win-info">
          🏆 Won ${{ getWinInfo(player.id)?.amount }} — {{ getWinInfo(player.id)?.handName }}
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.player-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}

/* TransitionGroup animations */
.player-enter-active,
.player-leave-active {
  transition: all 0.4s ease;
}
.player-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
.player-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.player-card {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 0.75rem;
  min-width: 155px;
  border: 2px solid transparent;
  transition: all 0.35s ease;
}

.player-card.needs-action {
  border-color: rgba(251, 191, 36, 0.6);
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.15);
  animation: pulseOutline 2s ease-in-out infinite;
}

@keyframes pulseOutline {
  0%, 100% { border-color: rgba(251, 191, 36, 0.6); box-shadow: 0 0 10px rgba(251, 191, 36, 0.15); }
  50% { border-color: rgba(251, 191, 36, 0.3); box-shadow: 0 0 4px rgba(251, 191, 36, 0.05); }
}

.player-card.has-acted {
  border-color: rgba(74, 222, 128, 0.35);
}

.player-card.is-me {
  background: rgba(59, 130, 246, 0.12);
}

.player-card.is-folded {
  opacity: 0.4;
  filter: grayscale(0.5);
}

.player-card.is-winner {
  border-color: #22c55e;
  box-shadow: 0 0 16px rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.1);
  animation: winPop 0.5s ease;
}

@keyframes winPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.player-card.is-disconnected {
  opacity: 0.3;
}

.player-card.is-all-in {
  border-color: rgba(139, 92, 246, 0.6);
  box-shadow: 0 0 8px rgba(139, 92, 246, 0.2);
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.3rem;
}

.player-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.me-tag {
  color: #60a5fa;
  font-size: 0.75rem;
}

.badges {
  display: flex;
  gap: 0.3rem;
  align-items: center;
}

.acted-badge {
  background: #22c55e;
  color: #000;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  font-weight: 900;
  animation: checkPop 0.3s ease;
}

@keyframes checkPop {
  0% { transform: scale(0); }
  60% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.role-badge {
  background: #f59e0b;
  color: #000;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
}

.player-info {
  display: flex;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
}

.money {
  color: #4ade80;
  font-weight: 600;
}

.bet {
  color: #fbbf24;
}

.status {
  color: #f87171;
  font-style: italic;
}

.status-allin {
  color: #a78bfa;
  font-weight: 700;
  font-style: normal;
  text-transform: uppercase;
  font-size: 0.7rem;
}

.player-cards {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.player-cards :deep(.card img) {
  height: 60px;
}

.win-info {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #4ade80;
  font-weight: 600;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
