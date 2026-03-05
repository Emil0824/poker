import { MOVE_TYPES } from "../../../shared/gameConstants.js"

export function validateMove(game, player, move) {
  if (player.folded) return { error: "You have already folded" }
  if (player.allIn) return { error: "You are all-in" }
  if (player.hasActed) return { error: "You already acted this round" }

  const toCall = game.currentMaxBet - player.bet

  switch (move.type) {
    case MOVE_TYPES.FOLD:
      return { error: null }

    case MOVE_TYPES.CHECK:
      if (toCall > 0) return { error: "Cannot check, there is a bet to match" }
      return { error: null }

    case MOVE_TYPES.CALL:
      if (toCall <= 0) return { error: "Nothing to call" }
      return { error: null }

    case MOVE_TYPES.RAISE: {
      if (move.amount == null) return { error: "Raise amount required" }
      const minRaiseTotal = game.currentMaxBet + game.minRaise
      const toAdd = move.amount - player.bet
      if (toAdd > player.money) return { error: "Not enough money" }
      if (move.amount < minRaiseTotal && toAdd < player.money) {
        return { error: `Minimum raise is ${minRaiseTotal}` }
      }
      return { error: null }
    }

    case MOVE_TYPES.ALL_IN:
      if (player.money <= 0) return { error: "No money to go all-in" }
      return { error: null }

    default:
      return { error: "Invalid move type" }
  }
}




