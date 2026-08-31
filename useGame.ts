import { useCallback, useEffect, useState } from 'react'
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

function normalize(value: GameState): GameState {
  return {
    ...value,
    activeParticipantId: value.activeParticipantId ?? null,
    roundComplete: value.roundComplete ?? false,
  }
}

function load(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialGame()
    const parsed = JSON.parse(raw) as GameState
    if (parsed.version !== 1) return createInitialGame()
    return normalize(parsed)
  } catch {
    return createInitialGame()
  }
}

export function useGame() {
  const [state, setState] = useState<GameState>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const importState = useCallback((value: GameState) => setState(normalize(value)), [])

  return {
    state,
    addParticipants: useCallback((name: string, count: number, wild: boolean) => setState((s) => addParticipants(s, name, count, wild)), []),
    dealInitiative: useCallback(() => setState(dealInitiative), []),
    resolveChoice: useCallback((choiceId: string, cardId: string) => setState((s) => resolveInitiativeChoice(s, choiceId, cardId)), []),
    manualDraw: useCallback((participantId: string) => setState((s) => manualDraw(s, participantId)), []),
    nextTurn: useCallback(() => setState(nextTurn), []),
    reshuffle: useCallback(() => setState(reshuffle), []),
    toggleDefeated: useCallback((participantId: string) => setState((s) => toggleDefeated(s, participantId)), []),
    toggleCondition: useCallback((participantId: string, condition: StandardCondition) => setState((s) => toggleCondition(s, participantId, condition)), []),
    addCustomCondition: useCallback((participantId: string, value: string) => setState((s) => addCustomCondition(s, participantId, value)), []),
    removeCustomCondition: useCallback((participantId: string, value: string) => setState((s) => removeCustomCondition(s, participantId, value)), []),
    setNumbers: useCallback((participantId: string, patch: Parameters<typeof setParticipantNumbers>[2]) => setState((s) => setParticipantNumbers(s, participantId, patch)), []),
    setRules: useCallback((participantId: string, patch: Parameters<typeof setParticipantRules>[2]) => setState((s) => setParticipantRules(s, participantId, patch)), []),
    makeWildCard: useCallback((participantId: string) => setState((s) => makeWildCard(s, participantId)), []),
    removeParticipant: useCallback((participantId: string) => setState((s) => removeParticipant(s, participantId)), []),
    reset: useCallback(() => setState(createInitialGame()), []),
    importState,
  }
}
