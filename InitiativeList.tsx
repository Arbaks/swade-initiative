import type { Participant } from '../models/game'
import { sortInitiative } from '../rules/initiative'
import { PlayingCardView } from './PlayingCardView'

export function InitiativeList({
  participants,
  activeParticipantId,
  roundComplete,
  onNextTurn,
  readOnly = false,
}: {
  participants: Participant[]
  activeParticipantId: string | null
  roundComplete: boolean
  onNextTurn: () => void
  readOnly?: boolean
}) {
  const sorted = sortInitiative(participants)
  const canAdvance = sorted.length > 0 && !roundComplete && !readOnly

  return (
    <aside className={`initiative-panel panel ${roundComplete ? 'round-complete' : ''}`}>
      <div className="panel-heading initiative-heading">
        <div>
          <h2>Порядок инициативы</h2>
          <span className="panel-hint">Joker → A → K → … → 2</span>
        </div>
        <button className="next-turn-button" type="button" onClick={onNextTurn} disabled={!canAdvance}>
          {roundComplete ? 'Раунд завершён' : readOnly ? 'Ход ведёт мастер' : 'Следующий ход →'}
        </button>
      </div>
      <div className="initiative-list">
        {sorted.map((participant, index) => (
          <div className={`initiative-row ${participant.id === activeParticipantId ? 'active' : ''}`} key={participant.id}>
            <span className="initiative-index">{index + 1}</span>
            <PlayingCardView card={participant.initiative} compact />
            <strong>{participant.name}</strong>
            <span className="initiative-type">{participant.wildCard ? 'ДК' : 'Статист'}</span>
          </div>
        ))}
        {sorted.length === 0 && <div className="empty-panel">Сдайте инициативу, чтобы увидеть порядок хода.</div>}
      </div>
    </aside>
  )
}
