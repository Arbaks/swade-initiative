import { describe, expect, it } from 'vitest'
import { createDeck, compareCardsHighFirst } from './cards'
import { chooseHesitantCard } from './initiative'

const card = (rank: any, suit?: any) => ({ id: `${suit}-${rank}`, rank, suit })

describe('SWADE cards', () => {
  it('creates 54 unique cards', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(54)
    expect(new Set(deck.map((c) => c.id)).size).toBe(54)
  })

  it('sorts equal ranks by Spades > Hearts > Diamonds > Clubs', () => {
    const cards = [card('10','clubs'), card('10','spades'), card('10','diamonds'), card('10','hearts')]
    expect(cards.sort(compareCardsHighFirst).map((c) => c.suit)).toEqual(['spades','hearts','diamonds','clubs'])
  })

  it('hesitant takes the lower card unless there is a Joker', () => {
    expect(chooseHesitantCard([card('K','spades'), card('7','clubs')]).rank).toBe('7')
    expect(chooseHesitantCard([card('2','clubs'), { id: 'jr', rank: 'JOKER', jokerColor: 'red' } as any]).rank).toBe('JOKER')
  })
})
