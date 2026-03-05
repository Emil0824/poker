import { STARTING_MONEY, PHASES, BIG_BLIND } from "../../../shared/gameConstants.js"
import { generateDeck } from "./gameLib.js"

export function createGame(hostId, hostName, bigScreen = false) {
  return {
    hostId,
    bigScreen,
    players: bigScreen ? [] : [createPlayer(hostId, hostName)],
    deck: generateDeck(),
    tableCards: [],
    pot: 0,
    dealerIndex: 0,
    smallBlindIndex: -1,
    bigBlindIndex: -1,
    currentTurnIndex: -1,
    currentTurn: null,
    currentMaxBet: 0,
    minRaise: BIG_BLIND,
    phase: PHASES.LOBBY,
    roundNumber: 0,
    winners: null,
    lastAction: null,
    createdAt: Date.now(),
  }
}

export function addPlayerToGame(game, playerId, playerName) {
  const newPlayer = createPlayer(playerId, playerName)

  return {
    ...game,
    players: [...game.players, newPlayer],
  }
}

function createPlayer(id, name) {
  return {
    id,
    name,
    hand: [],
    bet: 0,
    totalBet: 0,
    folded: false,
    allIn: false,
    hasActed: false,
    money: STARTING_MONEY,
    connected: true,
  }
}

