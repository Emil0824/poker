import { createApp } from "vue"
import { createRouter, createWebHistory } from "vue-router"
import App from "./App.vue"
import Lobby from "./views/Lobby.vue"
import Game from "./views/Game.vue"

const routes = [
  { path: "/", component: Lobby },
  { path: "/game/:roomId", component: Game }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const app = createApp(App)
app.use(router)
app.mount("#app")
