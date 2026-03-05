<script setup>
import { RouterView } from "vue-router"
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>� Poker</h1>
    </header>
    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  min-height: 100vh;
  color: #fff;
  overflow-x: hidden;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 0.75rem 2rem;
  background: rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
}

.header h1 {
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.main {
  flex: 1;
  padding: 1.5rem;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
</style>
