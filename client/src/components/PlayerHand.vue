<script setup>
import { ref } from "vue"
import Card from "./Card.vue"

const props = defineProps({
  hand: Array,
  money: Number,
  name: String,
  privacy: { type: Boolean, default: false },
})

const revealed = ref(false)

function toggleReveal() {
  if (props.privacy) {
    revealed.value = !revealed.value
  }
}
</script>

<template>
  <div class="my-hand">
    <div class="hand-label">
      <span class="hand-name">{{ name }}</span>
      <span class="hand-money">${{ money }}</span>
    </div>
    <div
      class="cards-wrapper"
      :class="{ 'has-privacy': privacy, 'is-revealed': revealed }"
      @click="toggleReveal"
    >
      <div class="cards">
        <Card v-for="(card, i) in hand" :key="i" :card="card" :delay="i * 120" />
      </div>
      <div v-if="privacy && !revealed" class="privacy-overlay">
        <span class="privacy-icon">👁</span>
        <span class="privacy-text">Tap to peek</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-hand {
  text-align: center;
}

.hand-label {
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  align-items: baseline;
}

.hand-money {
  color: #4ade80;
  font-size: 1.1rem;
}

.cards-wrapper {
  position: relative;
  display: inline-block;
  border-radius: 10px;
}

.cards-wrapper.has-privacy {
  cursor: pointer;
}

.cards {
  display: flex;
  gap: 0.6rem;
  justify-content: center;
  transition: filter 0.3s ease;
}

.cards-wrapper.has-privacy:not(.is-revealed) .cards {
  filter: blur(16px) brightness(0.5);
}

.cards :deep(.card) {
  transition: transform 0.2s ease;
}

.cards :deep(.card:hover) {
  transform: translateY(-10px) scale(1.06);
}

.privacy-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  z-index: 2;
  animation: fadeIn 0.3s ease;
}

.privacy-icon {
  font-size: 1.8rem;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}

.privacy-text {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
