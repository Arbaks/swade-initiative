import type { DeckState, PlayingCard } from '../models/game'
import { createDeck, shuffle } from './cards'

export function newDeck(): DeckState {
  return { drawPile: shuffle(createDeck()), discardPile: [], cycle: 1 }
}

export interface DrawResult {
  card: PlayingCard
  deck: DeckState
  autoReshuffled: boolean
}

export function drawOne(deck: DeckState): DrawResult {
  let working = deck
  let autoReshuffled = false
  if (working.drawPile.length === 0) {
    working = {
      drawPile: shuffle(working.discardPile),
      discardPile: [],
      cycle: working.cycle + 1,
    }
    autoReshuffled = true
  }

  const [card, ...rest] = working.drawPile
  if (!card) throw new Error('Колода пуста: нет карт ни в колоде, ни в сбросе.')
  return { card, autoReshuffled, deck: { ...working, drawPile: rest } }
}

export function discard(deck: DeckState, cards: PlayingCard | PlayingCard[]): DeckState {
  const list = Array.isArray(cards) ? cards : [cards]
  return { ...deck, discardPile: [...deck.discardPile, ...list] }
}

export function shuffleDiscardIntoDeck(deck: DeckState): DeckState {
  return {
    drawPile: shuffle([...deck.drawPile, ...deck.discardPile]),
    discardPile: [],
    cycle: deck.cycle + 1,
  }
}

export function shuffleAllIntoDeck(deck: DeckState, cardsInPlay: PlayingCard[] = []): DeckState {
  return {
    drawPile: shuffle([...deck.drawPile, ...deck.discardPile, ...cardsInPlay]),
    discardPile: [],
    cycle: deck.cycle + 1,
  }
}
