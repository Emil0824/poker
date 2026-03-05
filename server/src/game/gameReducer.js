import { generateDeck, evaluateHand, getHandName, compareHands } from "./gameLib.js"
import { PHASES, MOVE_TYPES, BIG_BLIND, SMALL_BLIND } from "../../../shared/gameConstants.js"
import { validateMove } from "./validateMove.js"

// ==================== Start / New Hand ====================

export function startGame(game) {
  game.roundNumber = 0
  game.dealerIndex = 0
  return startNewHand(game)
}

export function startNextHand(game) {
  game.dealerIndex = getNextAliveIndex(game.players, game.dealerIndex)
  return startNewHand(game)
}

function startNewHand(game) {
  game.roundNumber++

  // Reset players
  game.players.forEach(p => {
    p.hand = []
    p.bet = 0
    p.totalBet = 0
    p.folded = p.money <= 0
    p.allIn = false
    p.hasActed = false
  })

  game.tableCards = []
  game.pot = 0
  game.currentMaxBet = 0
  game.minRaise = BIG_BLIND
  game.winners = null
  game.lastAction = null
  game.currentTurn = null // no strict turn — semi-simultaneous

  const alivePlayers = game.players.filter(p => !p.folded)
  if (alivePlayers.length < 2) {
    game.phase = PHASES.END
    game.winners = [{
      playerId: alivePlayers[0]?.id,
      amount: 0,
      handName: "Last player standing",
    }]
    return game
  }

  // Ensure deck has enough cards
  if (game.deck.length < alivePlayers.length * 2 + 5) {
    game.deck = generateDeck()
  }

  // Deal 2 cards to alive players
  alivePlayers.forEach(p => {
    p.hand = [game.deck.pop(), game.deck.pop()]
  })

  // Calculate blind positions
  let sbIdx, bbIdx
  if (alivePlayers.length === 2) {
    sbIdx = game.dealerIndex
    while (game.players[sbIdx].folded) sbIdx = (sbIdx + 1) % game.players.length
    bbIdx = getNextAliveIndex(game.players, sbIdx)
  } else {
    sbIdx = getNextAliveIndex(game.players, game.dealerIndex)
    bbIdx = getNextAliveIndex(game.players, sbIdx)
  }

  // Post small blind
  const sbPlayer = game.players[sbIdx]
  const sbAmount = Math.min(SMALL_BLIND, sbPlayer.money)
  sbPlayer.bet = sbAmount
  sbPlayer.totalBet = sbAmount
  sbPlayer.money -= sbAmount
  if (sbPlayer.money === 0) sbPlayer.allIn = true

  // Post big blind
  const bbPlayer = game.players[bbIdx]
  const bbAmount = Math.min(BIG_BLIND, bbPlayer.money)
  bbPlayer.bet = bbAmount
  bbPlayer.totalBet = bbAmount
  bbPlayer.money -= bbAmount
  if (bbPlayer.money === 0) bbPlayer.allIn = true

  game.pot = sbAmount + bbAmount
  game.currentMaxBet = bbAmount
  game.smallBlindIndex = sbIdx
  game.bigBlindIndex = bbIdx

  // In semi-simultaneous mode everyone who isn't all-in needs to act
  // Blinds have already "acted" by posting, but they still need to act in pre-flop
  game.phase = PHASES.PRE_FLOP

  // Check if no one can act (everyone all-in from blinds)
  const canActPlayers = game.players.filter(p => !p.folded && !p.allIn)
  if (canActPlayers.length < 1) {
    return dealRemainingAndShowdown(game)
  }

  return game
}

// ==================== Apply Move ====================

export function applyMove(game, playerId, move) {
  const playerIndex = game.players.findIndex(p => p.id === playerId)
  if (playerIndex === -1) return { game, error: "Player not found" }

  const player = game.players[playerIndex]

  // Semi-simultaneous: check the player can act, not that it's "their turn"
  if (player.folded) return { game, error: "You already folded" }
  if (player.allIn) return { game, error: "You are all-in" }
  if (player.hasActed) return { game, error: "You already acted this round" }

  const validation = validateMove(game, player, move)
  if (validation.error) return { game, error: validation.error }

  // Apply the move
  switch (move.type) {
    case MOVE_TYPES.FOLD:
      player.folded = true
      player.hasActed = true
      game.lastAction = { playerId, type: "fold" }
      break

    case MOVE_TYPES.CHECK:
      player.hasActed = true
      game.lastAction = { playerId, type: "check" }
      break

    case MOVE_TYPES.CALL: {
      const callAmount = Math.min(game.currentMaxBet - player.bet, player.money)
      player.money -= callAmount
      player.bet += callAmount
      player.totalBet += callAmount
      game.pot += callAmount
      if (player.money === 0) player.allIn = true
      player.hasActed = true
      game.lastAction = { playerId, type: "call", amount: callAmount }
      break
    }

    case MOVE_TYPES.RAISE: {
      const raiseTotal = move.amount // total bet for this round
      const toAdd = raiseTotal - player.bet
      player.money -= toAdd
      game.pot += toAdd
      game.minRaise = raiseTotal - game.currentMaxBet
      game.currentMaxBet = raiseTotal
      player.bet = raiseTotal
      player.totalBet += toAdd
      if (player.money === 0) player.allIn = true
      player.hasActed = true
      game.lastAction = { playerId, type: "raise", amount: raiseTotal }

      // Others need to act again (raise resets everyone)
      game.players.forEach((p, i) => {
        if (i !== playerIndex && !p.folded && !p.allIn) {
          p.hasActed = false
        }
      })
      break
    }

    case MOVE_TYPES.ALL_IN: {
      const allInAmount = player.money
      const newBet = player.bet + allInAmount
      player.money = 0
      game.pot += allInAmount
      player.totalBet += allInAmount
      player.bet = newBet
      player.allIn = true
      player.hasActed = true

      if (newBet > game.currentMaxBet) {
        if (newBet - game.currentMaxBet >= game.minRaise) {
          game.minRaise = newBet - game.currentMaxBet
        }
        game.currentMaxBet = newBet
        game.players.forEach((p, i) => {
          if (i !== playerIndex && !p.folded && !p.allIn) {
            p.hasActed = false
          }
        })
      }

      game.lastAction = { playerId, type: "allIn", amount: allInAmount }
      break
    }

    default:
      return { game, error: "Unknown move type" }
  }

  // Check if only one player remains
  const activePlayers = game.players.filter(p => !p.folded)
  if (activePlayers.length === 1) {
    activePlayers[0].money += game.pot
    game.winners = [{
      playerId: activePlayers[0].id,
      amount: game.pot,
      handName: "Everyone else folded",
    }]
    game.pot = 0
    game.phase = PHASES.SHOWDOWN
    return { game, error: null }
  }

  // Check if betting round is over (all who can act have acted and matched)
  const canActPlayers = game.players.filter(p => !p.folded && !p.allIn)
  const allActed = canActPlayers.every(p => p.hasActed)
  const allMatched = canActPlayers.every(p => p.bet === game.currentMaxBet)

  if (canActPlayers.length === 0 || (allActed && allMatched)) {
    advancePhase(game)
  }

  return { game, error: null }
}

// ==================== Phase Advancement ====================

function advancePhase(game) {
  // Reset per-round betting state
  game.players.forEach(p => {
    p.bet = 0
    p.hasActed = false
  })
  game.currentMaxBet = 0
  game.minRaise = BIG_BLIND

  const canActPlayers = game.players.filter(p => !p.folded && !p.allIn)

  switch (game.phase) {
    case PHASES.PRE_FLOP:
      game.tableCards.push(game.deck.pop(), game.deck.pop(), game.deck.pop())
      game.phase = PHASES.FLOP
      break
    case PHASES.FLOP:
      game.tableCards.push(game.deck.pop())
      game.phase = PHASES.TURN
      break
    case PHASES.TURN:
      game.tableCards.push(game.deck.pop())
      game.phase = PHASES.RIVER
      break
    case PHASES.RIVER:
      resolveShowdown(game)
      return
  }

  // If fewer than 2 can act, keep dealing until showdown
  if (canActPlayers.length < 2) {
    advancePhase(game)
    return
  }
}

// ==================== Showdown ====================

function resolveShowdown(game) {
  game.phase = PHASES.SHOWDOWN
  game.currentTurn = null

  const activePlayers = game.players.filter(p => !p.folded)
  const pots = calculatePots(game.players)

  // Evaluate hands
  const handResults = {}
  for (const p of activePlayers) {
    const allCards = [...p.hand, ...game.tableCards]
    handResults[p.id] = evaluateHand(allCards)
  }

  // Distribute pots
  game.winners = []

  for (const pot of pots) {
    let bestPlayers = []
    let bestScore = null

    for (const playerId of pot.eligible) {
      const result = handResults[playerId]
      if (!result) continue

      if (!bestScore || compareHands(result.score, bestScore) < 0) {
        bestScore = result.score
        bestPlayers = [playerId]
      } else if (compareHands(result.score, bestScore) === 0) {
        bestPlayers.push(playerId)
      }
    }

    const share = Math.floor(pot.amount / bestPlayers.length)
    const remainder = pot.amount - share * bestPlayers.length

    for (let i = 0; i < bestPlayers.length; i++) {
      const pid = bestPlayers[i]
      const amount = share + (i === 0 ? remainder : 0)
      const player = game.players.find(p => p.id === pid)
      player.money += amount

      const handName = getHandName(handResults[pid].score)
      game.winners.push({ playerId: pid, amount, handName, handCards: handResults[pid].cards })
    }
  }

  game.pot = 0
}

function calculatePots(players) {
  const levels = [...new Set(players.map(p => p.totalBet).filter(b => b > 0))].sort((a, b) => a - b)
  const pots = []
  let prevLevel = 0

  for (const level of levels) {
    let amount = 0
    for (const p of players) {
      amount += Math.min(p.totalBet, level) - Math.min(p.totalBet, prevLevel)
    }

    const eligible = players
      .filter(p => !p.folded && p.totalBet >= level)
      .map(p => p.id)

    if (amount > 0 && eligible.length > 0) {
      pots.push({ amount, eligible })
    }

    prevLevel = level
  }

  return pots
}

function dealRemainingAndShowdown(game) {
  while (game.tableCards.length < 5) {
    game.tableCards.push(game.deck.pop())
  }
  resolveShowdown(game)
  return game
}

// ==================== Helpers ====================

function getNextAliveIndex(players, fromIndex) {
  const n = players.length
  let idx = (fromIndex + 1) % n
  let count = 0
  while (count < n) {
    if (players[idx].money > 0 || (!players[idx].folded && players[idx].allIn)) return idx
    idx = (idx + 1) % n
    count++
  }
  return fromIndex
}
