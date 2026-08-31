import type {
  CardHistoryEntry,
  GameEvent,
  GameState,
  Participant,
  PendingInitiativeChoice,
  PlayingCard,
  StandardCondition,
} from '../models/game'

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Firebase Realtime Database does not preserve empty arrays: an empty array is
 * stored as no value and comes back as null/undefined. It can also represent
 * array-like data as numeric-keyed objects. Normalize both forms here before
 * any snapshot reaches React or the game engine.
 */
function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value.filter((item): item is T => item != null)
  if (!isRecord(value)) return []

  return Object.entries(value)
    .filter(([key, item]) => /^\d+$/.test(key) && item != null)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, item]) => item as T)
}

function normalizeCard(value: unknown): PlayingCard | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.rank !== 'string') return null
  return {
    id: value.id,
    rank: value.rank as PlayingCard['rank'],
    ...(typeof value.suit === 'string' ? { suit: value.suit as PlayingCard['suit'] } : {}),
    ...(typeof value.jokerColor === 'string' ? { jokerColor: value.jokerColor as PlayingCard['jokerColor'] } : {}),
  }
}

function normalizeCards(value: unknown): PlayingCard[] {
  return asArray<unknown>(value)
    .map(normalizeCard)
    .filter((card): card is PlayingCard => card !== null)
}

function normalizeHistory(value: unknown): CardHistoryEntry[] {
  return asArray<unknown>(value).flatMap((raw) => {
    if (!isRecord(raw) || typeof raw.id !== 'string') return []
    const card = normalizeCard(raw.card)
    if (!card) return []
    return [{
      id: raw.id,
      card,
      round: typeof raw.round === 'number' ? raw.round : 0,
      deckCycle: typeof raw.deckCycle === 'number' ? raw.deckCycle : 0,
      reason: typeof raw.reason === 'string' ? raw.reason as CardHistoryEntry['reason'] : 'initiative',
      outcome: typeof raw.outcome === 'string' ? raw.outcome as CardHistoryEntry['outcome'] : 'discarded',
      timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : Date.now(),
    }]
  })
}

function normalizeConditions(value: unknown): StandardCondition[] {
  return asArray<unknown>(value).filter(
    (condition): condition is StandardCondition => condition === 'shaken' || condition === 'vulnerable' || condition === 'distracted',
  )
}

function normalizeParticipant(value: unknown): Participant | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') return null
  const rules = isRecord(value.rules) ? value.rules : {}

  return {
    id: value.id,
    name: value.name,
    wildCard: value.wildCard === true,
    defeated: value.defeated === true,
    initiative: normalizeCard(value.initiative),
    rules: {
      quick: rules.quick === true,
      hesitant: rules.hesitant === true,
      levelHeaded: rules.levelHeaded === 2 ? 2 : rules.levelHeaded === 1 ? 1 : 0,
    },
    woundsEnabled: value.woundsEnabled === true,
    wounds: typeof value.wounds === 'number' ? value.wounds : 0,
    maxWounds: typeof value.maxWounds === 'number' ? value.maxWounds : (value.wildCard === true ? 3 : 1),
    fatigue: typeof value.fatigue === 'number' ? value.fatigue : 0,
    conditions: normalizeConditions(value.conditions),
    customConditions: asArray<unknown>(value.customConditions).filter((item): item is string => typeof item === 'string'),
    history: normalizeHistory(value.history),
  }
}

function normalizePendingChoice(value: unknown): PendingInitiativeChoice | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.participantId !== 'string') return null
  return {
    id: value.id,
    participantId: value.participantId,
    cards: normalizeCards(value.cards),
    source: 'level-headed',
  }
}

function normalizeEvent(value: unknown): GameEvent | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.text !== 'string') return null
  const card = normalizeCard(value.card)
  return {
    id: value.id,
    timestamp: typeof value.timestamp === 'number' ? value.timestamp : Date.now(),
    round: typeof value.round === 'number' ? value.round : 0,
    kind: typeof value.kind === 'string' ? value.kind as GameEvent['kind'] : 'system',
    text: value.text,
    ...(card ? { card } : {}),
    ...(typeof value.participantId === 'string' ? { participantId: value.participantId } : {}),
  }
}

export function normalizeGameState(value: unknown): GameState | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.deck)) return null

  const participants = asArray<unknown>(value.participants)
    .map(normalizeParticipant)
    .filter((participant): participant is Participant => participant !== null)

  const pendingChoices = asArray<unknown>(value.pendingChoices)
    .map(normalizePendingChoice)
    .filter((choice): choice is PendingInitiativeChoice => choice !== null)

  const events = asArray<unknown>(value.events)
    .map(normalizeEvent)
    .filter((event): event is GameEvent => event !== null)

  return {
    version: 1,
    round: typeof value.round === 'number' ? value.round : 0,
    jokerDrawnThisRound: value.jokerDrawnThisRound === true,
    activeParticipantId: typeof value.activeParticipantId === 'string' ? value.activeParticipantId : null,
    roundComplete: value.roundComplete === true,
    participants,
    deck: {
      drawPile: normalizeCards(value.deck.drawPile),
      discardPile: normalizeCards(value.deck.discardPile),
      cycle: typeof value.deck.cycle === 'number' ? value.deck.cycle : 1,
    },
    pendingChoices,
    events,
  }
}
