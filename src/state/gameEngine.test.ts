import { describe, expect, it } from 'vitest'
import { sortInitiative } from '../rules/initiative'
import { addParticipants, createInitialGame, dealInitiative, manualDraw, nextTurn, reshuffle, toggleDefeated } from './gameEngine'

describe('turn tracking', () => {
  it('starts at the top of initiative, advances, then completes the round', () => {
    let state = createInitialGame()
    state = addParticipants(state, 'Hero', 1, true)
    state = addParticipants(state, 'Bandit', 3, false)
    state = dealInitiative(state)

    const sorted = sortInitiative(state.participants)
    expect(sorted.length).toBe(4)
    expect(state.activeParticipantId).toBe(sorted[0].id)

    for (let index = 1; index < sorted.length; index += 1) {
      state = nextTurn(state)
      expect(state.activeParticipantId).toBe(sorted[index].id)
    }

    state = nextTurn(state)
    expect(state.activeParticipantId).toBeNull()
    expect(state.roundComplete).toBe(true)
  })

  it('moves on when the active participant is defeated', () => {
    let state = createInitialGame()
    state = addParticipants(state, 'Fighter', 1, true)
    state = addParticipants(state, 'Goblin', 2, false)
    state = dealInitiative(state)

    const active = state.activeParticipantId
    expect(active).not.toBeNull()
    state = toggleDefeated(state, active!)
    expect(state.activeParticipantId).not.toBe(active)
  })
})


describe('full reshuffle', () => {
  it('returns discard and initiative cards to the draw pile', () => {
    let state = createInitialGame()
    state = addParticipants(state, 'Hero', 1, true)
    state = addParticipants(state, 'Bandit', 2, false)
    state = manualDraw(state, state.participants[0].id)
    state = dealInitiative(state)

    const cardsBefore = [
      ...state.deck.drawPile,
      ...state.deck.discardPile,
      ...state.participants.flatMap((participant) => participant.initiative ? [participant.initiative] : []),
      ...state.pendingChoices.flatMap((choice) => choice.cards),
    ]
    expect(cardsBefore).toHaveLength(54)

    state = reshuffle(state)

    expect(state.deck.drawPile).toHaveLength(54)
    expect(state.deck.discardPile).toHaveLength(0)
    expect(state.participants.every((participant) => participant.initiative === null)).toBe(true)
    expect(state.pendingChoices).toHaveLength(0)
    expect(state.activeParticipantId).toBeNull()
  })
})
