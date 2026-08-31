import type { PlayingCard } from '../models/game'
import { compareCardsHighFirst } from './cards'

export function sortInitiative<T extends { initiative: PlayingCard | null; defeated: boolean }>(participants: T[]): T[] {
  return participants
    .filter((p) => p.initiative && !p.defeated)
    .slice()
    .sort((a, b) => compareCardsHighFirst(a.initiative!, b.initiative!))
}

export function chooseHesitantCard(cards: PlayingCard[]): PlayingCard {
  const joker = cards.find((card) => card.rank === 'JOKER')
  if (joker) return joker
  return [...cards].sort(compareCardsHighFirst).at(-1)!
}
