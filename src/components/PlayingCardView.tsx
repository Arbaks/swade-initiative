import type { PlayingCard } from '../models/game'
import { isRedSuit, SUIT_SYMBOL } from '../rules/cards'

export function PlayingCardView({ card, compact = false }: { card: PlayingCard | null; compact?: boolean }) {
  if (!card) return <div className={`playing-card empty ${compact ? 'compact' : ''}`}><span>—</span></div>
  const red = isRedSuit(card)
  if (card.rank === 'JOKER') {
    return (
      <div className={`playing-card joker ${red ? 'red' : ''} ${compact ? 'compact' : ''}`}>
        <strong>JOKER</strong>
        {!compact && <span className="joker-mark">★</span>}
      </div>
    )
  }
  return (
    <div className={`playing-card ${red ? 'red' : ''} ${compact ? 'compact' : ''}`}>
      <div className="card-rank">{card.rank}</div>
      <div className="card-suit">{SUIT_SYMBOL[card.suit!]}</div>
    </div>
  )
}
