

// ==================== Deck ====================

export function generateDeck() {
  const suits = ["clubs", "diamonds", "hearts", "spades"]
  const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king", "ace"]

  const deck = []
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(`${suit}_${rank}`)
    }
  }

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }

  return deck
}

// ==================== Card Parsing ====================

const RANK_MAP = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
  "9": 9, "10": 10, "jack": 11, "queen": 12, "king": 13, "ace": 14,
}

function parseCard(cardStr) {
  const idx = cardStr.indexOf("_")
  const suit = cardStr.slice(0, idx)
  const rank = cardStr.slice(idx + 1)
  return { suit, rank: RANK_MAP[rank] }
}

// ==================== Combinations ====================

function combinations(arr, k) {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const [first, ...rest] = arr
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c])
  const withoutFirst = combinations(rest, k)
  return [...withFirst, ...withoutFirst]
}

// ==================== 5-Card Hand Evaluation ====================

function evaluate5(cards) {
  const parsed = cards.map(parseCard)
  const ranks = parsed.map(c => c.rank).sort((a, b) => b - a)
  const suits = parsed.map(c => c.suit)

  const isFlush = suits.every(s => s === suits[0])

  // Check straight
  let isStraight = false
  let straightHigh = 0

  if (ranks[0] - ranks[4] === 4 && new Set(ranks).size === 5) {
    isStraight = true
    straightHigh = ranks[0]
  }
  // Ace-low straight (A-2-3-4-5)
  if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
    isStraight = true
    straightHigh = 5
  }

  // Count frequencies
  const freqMap = {}
  for (const r of ranks) {
    freqMap[r] = (freqMap[r] || 0) + 1
  }
  const freqs = Object.entries(freqMap)
    .map(([rank, count]) => ({ rank: parseInt(rank), count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank)

  // Straight Flush (includes Royal Flush)
  if (isStraight && isFlush) {
    return [8, straightHigh]
  }
  // Four of a Kind
  if (freqs[0].count === 4) {
    return [7, freqs[0].rank, freqs[1].rank]
  }
  // Full House
  if (freqs[0].count === 3 && freqs[1].count === 2) {
    return [6, freqs[0].rank, freqs[1].rank]
  }
  // Flush
  if (isFlush) {
    return [5, ...ranks]
  }
  // Straight
  if (isStraight) {
    return [4, straightHigh]
  }
  // Three of a Kind
  if (freqs[0].count === 3) {
    return [3, freqs[0].rank, freqs[1].rank, freqs[2].rank]
  }
  // Two Pair
  if (freqs[0].count === 2 && freqs[1].count === 2) {
    const highPair = Math.max(freqs[0].rank, freqs[1].rank)
    const lowPair = Math.min(freqs[0].rank, freqs[1].rank)
    return [2, highPair, lowPair, freqs[2].rank]
  }
  // One Pair
  if (freqs[0].count === 2) {
    return [1, freqs[0].rank, freqs[1].rank, freqs[2].rank, freqs[3].rank]
  }
  // High Card
  return [0, ...ranks]
}

// ==================== Hand Comparison ====================

/** Returns negative if a is better, positive if b is better, 0 if tie */
export function compareHands(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (b[i] || 0) - (a[i] || 0)
  }
  return 0
}

// ==================== Best Hand from 7 Cards ====================

export function evaluateHand(cards) {
  const combos = combinations(cards, 5)
  let bestScore = null
  let bestCombo = null

  for (const combo of combos) {
    const score = evaluate5(combo)
    if (!bestScore || compareHands(score, bestScore) < 0) {
      bestScore = score
      bestCombo = combo
    }
  }

  return { score: bestScore, cards: bestCombo }
}

// ==================== Hand Name ====================

const HAND_NAMES = {
  0: "High Card",
  1: "One Pair",
  2: "Two Pair",
  3: "Three of a Kind",
  4: "Straight",
  5: "Flush",
  6: "Full House",
  7: "Four of a Kind",
  8: "Straight Flush",
}

export function getHandName(score) {
  if (score[0] === 8 && score[1] === 14) return "Royal Flush"
  return HAND_NAMES[score[0]]
}


