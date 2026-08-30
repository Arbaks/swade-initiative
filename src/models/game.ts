export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
export type Rank = '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K'|'A'|'JOKER'

export interface PlayingCard {
  id: string
  rank: Rank
  suit?: Suit
  jokerColor?: 'red' | 'black'
}

export type StandardCondition = 'shaken' | 'vulnerable' | 'distracted'

export interface InitiativeRules {
  quick: boolean
  hesitant: boolean
  levelHeaded: 0 | 1 | 2
}

export interface CardHistoryEntry {
  id: string
  card: PlayingCard
  round: number
  deckCycle: number
  reason: 'initiative' | 'quick-redraw' | 'hesitant-rejected' | 'level-headed-rejected' | 'manual-draw'
  outcome: 'kept' | 'discarded' | 'pending'
  timestamp: number
}

export interface Participant {
  id: string
  name: string
  wildCard: boolean
  defeated: boolean
  initiative: PlayingCard | null
  rules: InitiativeRules
  woundsEnabled: boolean
  wounds: number
  maxWounds: number
  fatigue: number
  conditions: StandardCondition[]
  customConditions: string[]
  history: CardHistoryEntry[]
}

export interface DeckState {
  drawPile: PlayingCard[]
  discardPile: PlayingCard[]
  cycle: number
}

export interface PendingInitiativeChoice {
  id: string
  participantId: string
  cards: PlayingCard[]
  source: 'level-headed'
}

export interface GameEvent {
  id: string
  timestamp: number
  round: number
  kind: 'deal' | 'draw' | 'status' | 'participant' | 'deck' | 'round' | 'system'
  text: string
  card?: PlayingCard
  participantId?: string
}

export interface GameState {
  version: 1
  round: number
  jokerDrawnThisRound: boolean
  activeParticipantId: string | null
  roundComplete: boolean
  participants: Participant[]
  deck: DeckState
  pendingChoices: PendingInitiativeChoice[]
  events: GameEvent[]
}
