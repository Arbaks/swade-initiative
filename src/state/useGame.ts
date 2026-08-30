import { useEffect, useMemo, useState } from 'react'
import type { GameState, StandardCondition } from '../models/game'
import {
  addCustomCondition,
  addParticipants,
  createInitialGame,
  dealInitiative,
  makeWildCard,
  manualDraw,
  nextTurn,
  removeCustomCondition,
  removeParticipant,
  reshuffle,
  resolveInitiativeChoice,
  setParticipantNumbers,
  setParticipantRules,
  toggleCondition,
  toggleDefeated,
} from './gameEngine'

const STORAGE_KEY = 'swade-initiative-tracker:v1'

function load(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialGame()
    const parsed = JSON.parse(raw) as GameState
    if (parsed.version !== 1) return createInitialGame()
    return {
      ...parsed,
      activeParticipantId: parsed.activeParticipantId ?? null,
      roundComplete: parsed.roundComplete ?? false,
    }
  } catch {
    return createInitialGame()
  }
}

export function useGame() {
  const [state, setState] = useState<GameState>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  return useMemo(() => ({
    state,
    addParticipants: (name: string, count: number, wild: boolean) => setState((s) => addParticipants(s, name, count, wild)),
    dealInitiative: () => setState(dealInitiative),
    resolveChoice: (choiceId: string, cardId: string) => setState((s) => resolveInitiativeChoice(s, choiceId, cardId)),
    manualDraw: (participantId: string) => setState((s) => manualDraw(s, participantId)),
    nextTurn: () => setState(nextTurn),
    reshuffle: () => setState(reshuffle),
    toggleDefeated: (participantId: string) => setState((s) => toggleDefeated(s, participantId)),
    toggleCondition: (participantId: string, condition: StandardCondition) => setState((s) => toggleCondition(s, participantId, condition)),
    addCustomCondition: (participantId: string, value: string) => setState((s) => addCustomCondition(s, participantId, value)),
    removeCustomCondition: (participantId: string, value: string) => setState((s) => removeCustomCondition(s, participantId, value)),
    setNumbers: (participantId: string, patch: Parameters<typeof setParticipantNumbers>[2]) => setState((s) => setParticipantNumbers(s, participantId, patch)),
    setRules: (participantId: string, patch: Parameters<typeof setParticipantRules>[2]) => setState((s) => setParticipantRules(s, participantId, patch)),
    makeWildCard: (participantId: string) => setState((s) => makeWildCard(s, participantId)),
    removeParticipant: (participantId: string) => setState((s) => removeParticipant(s, participantId)),
    reset: () => setState(createInitialGame()),
    importState: (value: GameState) => setState({ ...value, activeParticipantId: value.activeParticipantId ?? null, roundComplete: value.roundComplete ?? false }),
  }), [state])
}
