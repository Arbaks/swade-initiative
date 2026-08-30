import type {
  CardHistoryEntry,
  GameEvent,
  GameState,
  Participant,
  PlayingCard,
  StandardCondition,
} from '../models/game'
import { cardText, isFiveOrLower } from '../rules/cards'
import { discard, drawOne, newDeck, shuffleDiscardIntoDeck } from '../rules/deck'
import { chooseHesitantCard, sortInitiative } from '../rules/initiative'

const uid = () => crypto.randomUUID()

function nowEvent(round: number, kind: GameEvent['kind'], text: string, extra: Partial<GameEvent> = {}): GameEvent {
  return { id: uid(), timestamp: Date.now(), round, kind, text, ...extra }
}

function historyEntry(
  state: GameState,
  card: PlayingCard,
  reason: CardHistoryEntry['reason'],
  outcome: CardHistoryEntry['outcome'],
): CardHistoryEntry {
  return {
    id: uid(),
    card,
    round: state.round,
    deckCycle: state.deck.cycle,
    reason,
    outcome,
    timestamp: Date.now(),
  }
}

export function createInitialGame(): GameState {
  return {
    version: 1,
    round: 0,
    jokerDrawnThisRound: false,
    activeParticipantId: null,
    roundComplete: false,
    participants: [],
    deck: newDeck(),
    pendingChoices: [],
    events: [],
  }
}

function pushEvents(state: GameState, ...events: GameEvent[]): GameState {
  return { ...state, events: [...events, ...state.events].slice(0, 500) }
}

function updateParticipant(state: GameState, id: string, update: (participant: Participant) => Participant): GameState {
  return { ...state, participants: state.participants.map((p) => (p.id === id ? update(p) : p)) }
}

function drawTracked(state: GameState): { state: GameState; card: PlayingCard } {
  const result = drawOne(state.deck)
  let next = { ...state, deck: result.deck }
  if (result.autoReshuffled) {
    next = pushEvents(next, nowEvent(next.round, 'deck', 'Сброс автоматически перемешан: колода закончилась.'))
  }
  if (result.card.rank === 'JOKER') next = { ...next, jokerDrawnThisRound: true }
  return { state: next, card: result.card }
}

function discardTracked(state: GameState, cards: PlayingCard | PlayingCard[]): GameState {
  return { ...state, deck: discard(state.deck, cards) }
}

function addHistory(state: GameState, participantId: string, entries: CardHistoryEntry[]): GameState {
  return updateParticipant(state, participantId, (p) => ({ ...p, history: [...entries, ...p.history].slice(0, 300) }))
}

export function addParticipants(state: GameState, baseName: string, count: number, wildCard: boolean): GameState {
  const cleaned = baseName.trim()
  if (!cleaned) return state
  const participants: Participant[] = Array.from({ length: count }, (_, index) => ({
    id: uid(),
    name: count > 1 ? `${cleaned} ${index + 1}` : cleaned,
    wildCard,
    defeated: false,
    initiative: null,
    rules: { quick: false, hesitant: false, levelHeaded: 0 },
    woundsEnabled: wildCard,
    wounds: 0,
    maxWounds: wildCard ? 3 : 1,
    fatigue: 0,
    conditions: [],
    customConditions: [],
    history: [],
  }))

  return pushEvents(
    { ...state, participants: [...state.participants, ...participants] },
    nowEvent(state.round, 'participant', wildCard
      ? `Добавлена Дикая Карта: ${cleaned}.`
      : count === 1 ? `Добавлен статист: ${cleaned}.` : `Добавлены статисты: ${cleaned} ×${count}.`),
  )
}

export function toggleDefeated(state: GameState, participantId: string): GameState {
  const participant = state.participants.find((p) => p.id === participantId)
  if (!participant) return state
  const defeated = !participant.defeated
  const before = sortInitiative(state.participants)
  const currentIndex = before.findIndex((p) => p.id === participantId)
  let next = updateParticipant(state, participantId, (p) => ({ ...p, defeated }))

  if (defeated && state.activeParticipantId === participantId && !state.roundComplete) {
    const following = before.slice(currentIndex + 1).find((p) => p.id !== participantId && !p.defeated)
    next = following
      ? { ...next, activeParticipantId: following.id }
      : { ...next, activeParticipantId: null, roundComplete: state.round > 0 }
  }

  next = pushEvents(next, nowEvent(state.round, 'status', `${participant.name}: ${defeated ? 'выбыл' : 'вернулся в бой'}.`, { participantId }))
  return next
}

export function toggleCondition(state: GameState, participantId: string, condition: StandardCondition): GameState {
  const participant = state.participants.find((p) => p.id === participantId)
  if (!participant) return state
  const active = participant.conditions.includes(condition)
  const label = condition === 'shaken' ? 'В шоке' : condition === 'vulnerable' ? 'Уязвим' : 'Отвлечён'
  let next = updateParticipant(state, participantId, (p) => ({
    ...p,
    conditions: active ? p.conditions.filter((c) => c !== condition) : [...p.conditions, condition],
  }))
  next = pushEvents(next, nowEvent(state.round, 'status', `${participant.name}: ${active ? 'снято' : 'добавлено'} состояние «${label}».`, { participantId }))
  return next
}

export function addCustomCondition(state: GameState, participantId: string, value: string): GameState {
  const cleaned = value.trim()
  if (!cleaned) return state
  const participant = state.participants.find((p) => p.id === participantId)
  if (!participant || participant.customConditions.includes(cleaned)) return state
  let next = updateParticipant(state, participantId, (p) => ({ ...p, customConditions: [...p.customConditions, cleaned] }))
  next = pushEvents(next, nowEvent(state.round, 'status', `${participant.name}: добавлено состояние «${cleaned}».`, { participantId }))
  return next
}

export function removeCustomCondition(state: GameState, participantId: string, value: string): GameState {
  return updateParticipant(state, participantId, (p) => ({ ...p, customConditions: p.customConditions.filter((c) => c !== value) }))
}

export function setParticipantNumbers(
  state: GameState,
  participantId: string,
  patch: Partial<Pick<Participant, 'wounds'|'maxWounds'|'fatigue'|'woundsEnabled'>>,
): GameState {
  return updateParticipant(state, participantId, (p) => ({ ...p, ...patch }))
}

export function setParticipantRules(state: GameState, participantId: string, patch: Partial<Participant['rules']>): GameState {
  return updateParticipant(state, participantId, (p) => {
    const nextRules = { ...p.rules, ...patch }
    if (nextRules.hesitant) {
      nextRules.quick = false
      nextRules.levelHeaded = 0
    }
    if (nextRules.quick || nextRules.levelHeaded > 0) nextRules.hesitant = false
    return { ...p, rules: nextRules }
  })
}

export function makeWildCard(state: GameState, participantId: string): GameState {
  return updateParticipant(state, participantId, (p) => ({ ...p, wildCard: true, woundsEnabled: true, maxWounds: Math.max(3, p.maxWounds) }))
}

export function removeParticipant(state: GameState, participantId: string): GameState {
  const participant = state.participants.find((p) => p.id === participantId)
  // Deletion is intentionally a two-step action: mark the participant defeated first,
  // then remove them. This prevents an active combatant from disappearing by accident.
  if (!participant || !participant.defeated) return state
  const before = sortInitiative(state.participants)
  const currentIndex = before.findIndex((p) => p.id === participantId)
  const following = before.slice(currentIndex + 1).find((p) => p.id !== participantId && !p.defeated)
  let deck = state.deck
  if (participant.initiative) deck = discard(deck, participant.initiative)
  let next: GameState = {
    ...state,
    deck,
    participants: state.participants.filter((p) => p.id !== participantId),
    pendingChoices: state.pendingChoices.filter((c) => c.participantId !== participantId),
  }
  if (state.activeParticipantId === participantId && !state.roundComplete) {
    next = following
      ? { ...next, activeParticipantId: following.id }
      : { ...next, activeParticipantId: null, roundComplete: state.round > 0 }
  }
  return pushEvents(next, nowEvent(state.round, 'participant', `Удалён участник: ${participant.name}.`))
}

function clearOldInitiative(state: GameState): GameState {
  const cards = state.participants.flatMap((p) => (p.initiative ? [p.initiative] : []))
  const withDiscard = cards.length ? discardTracked(state, cards) : state
  return {
    ...withDiscard,
    participants: withDiscard.participants.map((p) => ({ ...p, initiative: null })),
    pendingChoices: [],
    activeParticipantId: null,
    roundComplete: false,
  }
}

function quickCandidate(state: GameState, participant: Participant): { state: GameState; card: PlayingCard } {
  let working = state
  while (true) {
    const drawn = drawTracked(working)
    working = drawn.state
    if (!participant.rules.quick || !isFiveOrLower(drawn.card)) return { state: working, card: drawn.card }
    working = discardTracked(working, drawn.card)
    working = addHistory(working, participant.id, [historyEntry(working, drawn.card, 'quick-redraw', 'discarded')])
    working = pushEvents(working, nowEvent(working.round, 'draw', `${participant.name}: ${cardText(drawn.card)} пересдана из-за «Быстрого».`, { participantId: participant.id, card: drawn.card }))
  }
}

export function dealInitiative(state: GameState): GameState {
  const shouldReshuffle = state.jokerDrawnThisRound
  let working = clearOldInitiative(state)
  if (shouldReshuffle) {
    working = { ...working, deck: shuffleDiscardIntoDeck(working.deck) }
    working = pushEvents(working, nowEvent(working.round, 'deck', 'После Джокера сброс автоматически перемешан перед новым раундом.'))
  }
  working = { ...working, round: working.round + 1, jokerDrawnThisRound: false }
  working = pushEvents(working, nowEvent(working.round, 'round', `Начат раунд ${working.round}.`))

  for (const snapshot of working.participants) {
    if (snapshot.defeated) continue
    const participant = working.participants.find((p) => p.id === snapshot.id)!

    if (participant.rules.hesitant) {
      const first = drawTracked(working); working = first.state
      const second = drawTracked(working); working = second.state
      const cards = [first.card, second.card]
      const chosen = chooseHesitantCard(cards)
      const rejected = cards.filter((c) => c.id !== chosen.id)
      if (rejected.length) working = discardTracked(working, rejected)
      working = updateParticipant(working, participant.id, (p) => ({ ...p, initiative: chosen }))
      working = addHistory(working, participant.id, [
        historyEntry(working, chosen, 'initiative', 'kept'),
        ...rejected.map((card) => historyEntry(working, card, 'hesitant-rejected', 'discarded')),
      ])
      working = pushEvents(working, nowEvent(working.round, 'deal', `${participant.name} получил ${cardText(chosen)} (Медлительный).`, { participantId: participant.id, card: chosen }))
      continue
    }

    const count = participant.rules.levelHeaded === 2 ? 3 : participant.rules.levelHeaded === 1 ? 2 : 1
    const candidates: PlayingCard[] = []
    for (let i = 0; i < count; i += 1) {
      const result = quickCandidate(working, participant)
      working = result.state
      candidates.push(result.card)
    }

    const joker = candidates.find((c) => c.rank === 'JOKER')
    if (count > 1 && !joker) {
      working = {
        ...working,
        pendingChoices: [...working.pendingChoices, { id: uid(), participantId: participant.id, cards: candidates, source: 'level-headed' }],
      }
      continue
    }

    const chosen = joker ?? candidates[0]
    const rejected = candidates.filter((c) => c.id !== chosen.id)
    if (rejected.length) working = discardTracked(working, rejected)
    working = updateParticipant(working, participant.id, (p) => ({ ...p, initiative: chosen }))
    working = addHistory(working, participant.id, [
      historyEntry(working, chosen, 'initiative', 'kept'),
      ...rejected.map((card) => historyEntry(working, card, 'level-headed-rejected', 'discarded')),
    ])
    working = pushEvents(working, nowEvent(working.round, 'deal', `${participant.name} получил ${cardText(chosen)}.`, { participantId: participant.id, card: chosen }))
  }

  if (working.pendingChoices.length === 0) {
    const first = sortInitiative(working.participants)[0]
    working = { ...working, activeParticipantId: first?.id ?? null, roundComplete: false }
  }

  return pushEvents(working, nowEvent(working.round, 'deal', working.pendingChoices.length ? 'Инициатива сдана. Ожидается выбор карт.' : 'Инициатива сдана всем активным участникам.'))
}

export function resolveInitiativeChoice(state: GameState, choiceId: string, cardId: string): GameState {
  const choice = state.pendingChoices.find((c) => c.id === choiceId)
  if (!choice) return state
  const participant = state.participants.find((p) => p.id === choice.participantId)
  const chosen = choice.cards.find((c) => c.id === cardId)
  if (!participant || !chosen) return state
  const rejected = choice.cards.filter((c) => c.id !== cardId)
  let working = rejected.length ? discardTracked(state, rejected) : state
  working = updateParticipant(working, participant.id, (p) => ({ ...p, initiative: chosen }))
  working = addHistory(working, participant.id, [
    historyEntry(working, chosen, 'initiative', 'kept'),
    ...rejected.map((card) => historyEntry(working, card, 'level-headed-rejected', 'discarded')),
  ])
  working = { ...working, pendingChoices: working.pendingChoices.filter((c) => c.id !== choiceId) }
  if (working.pendingChoices.length === 0) {
    const first = sortInitiative(working.participants)[0]
    working = { ...working, activeParticipantId: first?.id ?? null, roundComplete: false }
  }
  return pushEvents(working, nowEvent(working.round, 'deal', `${participant.name} выбрал ${cardText(chosen)}.`, { participantId: participant.id, card: chosen }))
}

export function nextTurn(state: GameState): GameState {
  if (state.pendingChoices.length > 0 || state.roundComplete) return state
  const sorted = sortInitiative(state.participants)
  if (sorted.length === 0) return state

  const currentIndex = sorted.findIndex((p) => p.id === state.activeParticipantId)
  if (currentIndex < 0) {
    return { ...state, activeParticipantId: sorted[0].id, roundComplete: false }
  }

  const next = sorted[currentIndex + 1]
  if (!next) {
    return pushEvents(
      { ...state, activeParticipantId: null, roundComplete: true },
      nowEvent(state.round, 'round', `Раунд ${state.round} завершён. Можно сдавать новую инициативу.`),
    )
  }

  return { ...state, activeParticipantId: next.id }
}

export function manualDraw(state: GameState, participantId: string): GameState {
  const participant = state.participants.find((p) => p.id === participantId)
  if (!participant) return state
  const drawn = drawTracked(state)
  let working = discardTracked(drawn.state, drawn.card)
  working = addHistory(working, participant.id, [historyEntry(working, drawn.card, 'manual-draw', 'discarded')])
  return pushEvents(working, nowEvent(working.round, 'draw', `${participant.name} вытянул ${cardText(drawn.card)} и сбросил карту.`, { participantId, card: drawn.card }))
}

export function reshuffle(state: GameState): GameState {
  const next = { ...state, deck: shuffleDiscardIntoDeck(state.deck), jokerDrawnThisRound: false }
  return pushEvents(next, nowEvent(state.round, 'deck', 'Сброс перемешан обратно в колоду.'))
}
