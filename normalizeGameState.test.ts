import { describe, expect, it } from 'vitest'
import { createInitialGame, addParticipants } from './gameEngine'
import { normalizeGameState } from './normalizeGameState'

describe('normalizeGameState', () => {
  it('restores arrays omitted by Firebase when they are empty', () => {
    const original = addParticipants(createInitialGame(), 'Кейн', 1, true)
    const firebaseLike = JSON.parse(JSON.stringify(original))

    delete firebaseLike.pendingChoices
    delete firebaseLike.events
    delete firebaseLike.deck.discardPile
    delete firebaseLike.participants[0].conditions
    delete firebaseLike.participants[0].customConditions
    delete firebaseLike.participants[0].history

    const restored = normalizeGameState(firebaseLike)
    expect(restored).not.toBeNull()
    expect(restored?.pendingChoices).toEqual([])
    expect(restored?.events).toEqual([])
    expect(restored?.deck.discardPile).toEqual([])
    expect(restored?.participants[0].conditions).toEqual([])
    expect(restored?.participants[0].customConditions).toEqual([])
    expect(restored?.participants[0].history).toEqual([])
  })

  it('accepts numeric-keyed Firebase array objects', () => {
    const original = addParticipants(createInitialGame(), 'Разбойник', 2, false)
    const firebaseLike = JSON.parse(JSON.stringify(original))
    firebaseLike.participants = {
      0: firebaseLike.participants[0],
      1: firebaseLike.participants[1],
    }

    const restored = normalizeGameState(firebaseLike)
    expect(restored?.participants.map((participant) => participant.name)).toEqual(['Разбойник 1', 'Разбойник 2'])
  })
})
