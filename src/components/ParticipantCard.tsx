import { useState } from 'react'
import type { Participant, StandardCondition } from '../models/game'
import { cardText } from '../rules/cards'
import { PlayingCardView } from './PlayingCardView'

const conditionLabels: Record<StandardCondition, string> = {
  shaken: 'В шоке',
  vulnerable: 'Уязвим',
  distracted: 'Отвлечён',
}

const standardConditions: StandardCondition[] = ['shaken', 'vulnerable', 'distracted']

function CounterDots({ value, max, onChange, disabled = false }: { value: number; max: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="counter-dots">
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          type="button"
          className={i < value ? 'dot active' : 'dot'}
          onClick={() => !disabled && onChange(i + 1 === value ? i : i + 1)}
          aria-label={`${i + 1}`}
          disabled={disabled}
        />
      ))}
    </div>
  )
}

export function ParticipantCard({
  participant,
  isActive,
  onOpenSettings,
  onSetNumbers,
  onToggleDefeated,
  onRemove,
  onToggleCondition,
  onAddCustomCondition,
  onRemoveCustomCondition,
}: {
  participant: Participant
  isActive: boolean
  onOpenSettings: () => void
  onSetNumbers: (patch: Partial<Pick<Participant, 'wounds'|'fatigue'>>) => void
  onToggleDefeated: () => void
  onRemove: () => void
  onToggleCondition: (condition: StandardCondition) => void
  onAddCustomCondition: (value: string) => void
  onRemoveCustomCondition: (value: string) => void
}) {
  const [conditionsOpen, setConditionsOpen] = useState(false)
  const [customCondition, setCustomCondition] = useState('')

  const addCustom = () => {
    const cleaned = customCondition.trim()
    if (!cleaned) return
    onAddCustomCondition(cleaned)
    setCustomCondition('')
  }

  return (
    <article className={`participant-card ${participant.defeated ? 'defeated' : ''} ${participant.wildCard ? 'wild' : ''} ${isActive ? 'active-turn' : ''}`}>
      {participant.defeated && (
        <div className="defeated-action-row">
          <strong>Участник выбыл</strong>
          <div>
            <button className="card-action-button restore" type="button" onClick={onToggleDefeated}>Вернуть</button>
            <button
              className="card-action-button delete"
              type="button"
              onClick={() => { if (confirm(`Удалить «${participant.name}» окончательно?`)) onRemove() }}
            >
              Удалить
            </button>
          </div>
        </div>
      )}
      <header className="participant-header">
        <div>
          <div className="participant-title-row">
            {participant.wildCard && <span className="wild-star">◆</span>}
            <h3>{participant.name}</h3>
            {participant.defeated && <span className="defeated-label">Выбыл</span>}
          </div>
          <span className="participant-type">{participant.wildCard ? 'Дикая карта' : 'Статист'}</span>
        </div>
        <div className="participant-card-actions">
          {!participant.defeated && (
            <button className="card-action-button defeat" type="button" onClick={onToggleDefeated}>
              Выбыл
            </button>
          )}
          <button className="icon-button" type="button" onClick={onOpenSettings} aria-label="Настройки участника">⋮</button>
        </div>
      </header>

      <div className="participant-body">
        <PlayingCardView card={participant.initiative} />
        <div className="participant-stats">
          <div className="stat-block">
            <span>Ранения</span>
            {participant.woundsEnabled ? (
              <CounterDots value={participant.wounds} max={participant.maxWounds} onChange={(wounds) => onSetNumbers({ wounds })} disabled={participant.defeated} />
            ) : <span className="muted-value">—</span>}
          </div>
          <div className="stat-block">
            <span>Усталость</span>
            <CounterDots value={participant.fatigue} max={2} onChange={(fatigue) => onSetNumbers({ fatigue })} disabled={participant.defeated} />
          </div>
          {(participant.rules.quick || participant.rules.hesitant || participant.rules.levelHeaded > 0) && (
            <div className="rule-mini-list">
              {participant.rules.quick && <span>Быстрый</span>}
              {participant.rules.hesitant && <span>Медлительный</span>}
              {participant.rules.levelHeaded === 1 && <span>Холодные нервы</span>}
              {participant.rules.levelHeaded === 2 && <span>Улучш. холодные нервы</span>}
            </div>
          )}
        </div>
      </div>

      <div className="condition-row">
        <div className="condition-add-wrap">
          <button
            className="condition-add-button"
            type="button"
            aria-label="Добавить состояние"
            title="Добавить состояние"
            onClick={() => setConditionsOpen((open) => !open)}
          >+
          </button>
          {conditionsOpen && (
            <div className="condition-popover">
              <strong>Состояния</strong>
              {standardConditions.map((condition) => (
                <button
                  key={condition}
                  type="button"
                  className={participant.conditions.includes(condition) ? 'active' : ''}
                  onClick={() => onToggleCondition(condition)}
                >
                  <span>{conditionLabels[condition]}</span>
                  <span>{participant.conditions.includes(condition) ? '✓' : '+'}</span>
                </button>
              ))}
              <div className="condition-custom-add">
                <input
                  value={customCondition}
                  onChange={(e) => setCustomCondition(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
                  placeholder="Своё состояние"
                />
                <button type="button" onClick={addCustom}>+</button>
              </div>
            </div>
          )}
        </div>
        {participant.conditions.map((condition) => (
          <button key={condition} type="button" className={`condition-chip ${condition}`} title="Нажмите, чтобы снять" onClick={() => onToggleCondition(condition)}>
            {conditionLabels[condition]}
          </button>
        ))}
        {participant.customConditions.map((condition) => (
          <button key={condition} type="button" className="condition-chip custom" title="Нажмите, чтобы снять" onClick={() => onRemoveCustomCondition(condition)}>
            {condition}
          </button>
        ))}
        {participant.conditions.length + participant.customConditions.length === 0 && <span className="no-conditions">Нет состояний</span>}
      </div>

      <div className="history-strip">
        <span className="history-label">История карт</span>
        <div className="history-cards">
          {participant.history.slice(0, 5).map((entry) => (
            <span key={entry.id} className={entry.card.rank === 'JOKER' ? 'history-chip joker' : 'history-chip'} title={`Раунд ${entry.round}: ${entry.reason}`}>
              {cardText(entry.card)}
            </span>
          ))}
          {participant.history.length === 0 && <span className="history-empty">Пока пусто</span>}
        </div>
      </div>
    </article>
  )
}
