<script setup>
import { computed } from "vue"

const props = defineProps({
  card: String,
  faceDown: Boolean,
  delay: { type: Number, default: 0 },
})

const frontImages = import.meta.glob(
  "../svg_playing_cards/fronts/png_96_dpi/*.png",
  { eager: true }
)
const backImages = import.meta.glob(
  "../svg_playing_cards/backs/png_96_dpi/blue.png",
  { eager: true }
)

const imageUrl = computed(() => {
  if (props.faceDown || !props.card) {
    const key = Object.keys(backImages)[0]
    return backImages[key]?.default
  }
  const key = `../svg_playing_cards/fronts/png_96_dpi/${props.card}.png`
  return frontImages[key]?.default
})

const animStyle = computed(() => ({
  animationDelay: `${props.delay}ms`,
}))
</script>

<template>
  <div class="card" :class="{ 'face-down': faceDown }" :style="animStyle">
    <img v-if="imageUrl" :src="imageUrl" :alt="card || 'card back'" />
    <div v-else class="card-placeholder">🂠</div>
  </div>
</template>

<style scoped>
.card {
  display: inline-block;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  animation: dealIn 0.4s ease both;
}

.card:hover {
  transform: translateY(-6px) scale(1.04);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
}

@keyframes dealIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.7) rotate(-8deg);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(0);
  }
}

.card img {
  display: block;
  height: 120px;
  width: auto;
}

.face-down {
  filter: brightness(0.85);
}

.face-down:hover {
  transform: translateY(-3px);
}

.card-placeholder {
  width: 83px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a5c2a;
  font-size: 3rem;
}
</style>
