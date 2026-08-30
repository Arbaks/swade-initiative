import { describe, expect, it } from 'vitest'
import { sortInitiative } from '../rules/initiative'
import { addParticipants, createInitialGame, dealInitiative, nextTurn, toggleDefeated } from './gameEngine'

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
