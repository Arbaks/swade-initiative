import type { PlayingCard, Rank, Suit } from '../models/game'

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
}

export const SUIT_LABEL: Record<Suit, string> = {
  spades: 'Пики',
  hearts: 'Червы',
  diamonds: 'Бубны',
  clubs: 'Трефы',
}

const ranks: Exclude<Rank, 'JOKER'>[] = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']
const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']

export function createDeck(): PlayingCard[] {
  const cards: PlayingCard[] = suits.flatMap((suit) => ranks.map((rank) => ({ id: `${suit}-${rank}`, rank, suit } satisfies PlayingCard)))
  cards.push(
    { id: 'joker-red', rank: 'JOKER', jokerColor: 'red' },
    { id: 'joker-black', rank: 'JOKER', jokerColor: 'black' },
  )
  return cards
}

export function shuffle<T>(items: T[], random = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const rankScore: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, J: 11, Q: 12, K: 13, A: 14, JOKER: 100,
}

const suitScore: Record<Suit, number> = {
  clubs: 1,
  diamonds: 2,
  hearts: 3,
  spades: 4,
}

export function compareCardsHighFirst(a: PlayingCard, b: PlayingCard): number {
  if (rankScore[a.rank] !== rankScore[b.rank]) return rankScore[b.rank] - rankScore[a.rank]
  if (a.rank === 'JOKER' || b.rank === 'JOKER') return 0
  return suitScore[b.suit!] - suitScore[a.suit!]
}

export function isFiveOrLower(card: PlayingCard): boolean {
  return card.rank !== 'JOKER' && rankScore[card.rank] <= 5
}

export function cardText(card: PlayingCard): string {
  if (card.rank === 'JOKER') return 'Джокер'
  return `${card.rank}${SUIT_SYMBOL[card.suit!]}`
}

export function isRedSuit(card: PlayingCard): boolean {
  return card.suit === 'hearts' || card.suit === 'diamonds' || card.jokerColor === 'red'
}
