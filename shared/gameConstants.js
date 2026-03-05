// Poker game constants
export const MAX_PLAYERS = 10
export const STARTING_MONEY = 500
export const BIG_BLIND = 10
export const SMALL_BLIND = 5

export const PHASES = {
  LOBBY: "lobby",
  PRE_FLOP: "pre_flop",
  FLOP: "flop",
  TURN: "turn",
  RIVER: "river",
  SHOWDOWN: "showdown",
  END: "end",
}

export const MOVE_TYPES = {
  FOLD: "fold",
  CHECK: "check",
  CALL: "call",
  RAISE: "raise",
  ALL_IN: "allIn",
}

export const HAND_RANKINGS = {
  HIGH_CARD: 0,
  ONE_PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_A_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8,
}


