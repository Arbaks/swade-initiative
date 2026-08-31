import { useState } from 'react'
import type { Participant, StandardCondition } from '../models/game'
import { Modal } from '../components/Modal'

const conditions: Array<[StandardCondition, string]> = [
  ['shaken', 'В шоке'],
  ['vulnerable', 'Уязвим'],
  ['distracted', 'Отвлечён'],
]

export function ParticipantSettingsModal({
  participant,
  onClose,
  onToggleCondition,
  onAddCustomCondition,
  onRemoveCustomCondition,
  onSetNumbers,
  onSetRules,
  onToggleDefeated,
  onMakeWildCard,
  onRemove,
}: {
  participant: Participant
  onClose: () => void
  onToggleCondition: (condition: StandardCondition) => void
  onAddCustomCondition: (value: string) => void
  onRemoveCustomCondition: (value: string) => void
  onSetNumbers: (patch: Partial<Pick<Participant, 'wounds'|'maxWounds'|'fatigue'|'woundsEnabled'>>) => void
  onSetRules: (patch: Partial<Participant['rules']>) => void
  onToggleDefeated: () => void
  onMakeWildCard: () => void
  onRemove: () => void
}) {
  const [custom, setCustom] = useState('')
  const addCustom = () => {
    if (!custom.trim()) return
    onAddCustomCondition(custom)
    setCustom('')
  }

  return (
    <Modal title={participant.name} onClose={onClose} wide>
      <div className="settings-columns">
        <section className="settings-section">
          <h3>Состояния</h3>
          <div className="toggle-list">
            {conditions.map(([key, label]) => (
              <button key={key} className={participant.conditions.includes(key) ? 'toggle active' : 'toggle'} onClick={() => onToggleCondition(key)}>
                <span>{label}</span><span>{participant.conditions.includes(key) ? '✓' : '+'}</span>
              </button>
            ))}
          </div>
          <div className="custom-condition-form">
            <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Своё состояние" onKeyDown={(e) => e.key === 'Enter' && addCustom()} />
            <button onClick={addCustom}>Добавить</button>
          </div>
          {participant.customConditions.length > 0 && (
            <div className="custom-condition-list">
              {participant.customConditions.map((item) => <button key={item} onClick={() => onRemoveCustomCondition(item)}>{item} ×</button>)}
            </div>
          )}
        </section>

        <section className="settings-section">
          <h3>Ранения и усталость</h3>
          {!participant.wildCard && (
            <label className="switch-row">
              <span>Статист может получать ранения</span>
              <input type="checkbox" checked={participant.woundsEnabled} onChange={(e) => onSetNumbers({ woundsEnabled: e.target.checked, wounds: 0 })} />
            </label>
          )}
          {participant.woundsEnabled && (
            <>
              <label className="field-label compact-field">Максимум ранений
                <input type="number" min={1} max={6} value={participant.maxWounds} onChange={(e) => onSetNumbers({ maxWounds: Math.max(1, Number(e.target.value)), wounds: Math.min(participant.wounds, Math.max(1, Number(e.target.value))) })} />
              </label>
              <label className="field-label compact-field">Текущие ранения
                <input type="number" min={0} max={participant.maxWounds} value={participant.wounds} onChange={(e) => onSetNumbers({ wounds: Math.max(0, Math.min(participant.maxWounds, Number(e.target.value))) })} />
              </label>
            </>
          )}
          <label className="field-label compact-field">Усталость
            <input type="number" min={0} max={2} value={participant.fatigue} onChange={(e) => onSetNumbers({ fatigue: Math.max(0, Math.min(2, Number(e.target.value))) })} />
          </label>
        </section>

        <section className="settings-section">
          <h3>Инициатива</h3>
          <label className="switch-row"><span>Быстрый</span><input type="checkbox" checked={participant.rules.quick} disabled={participant.rules.hesitant} onChange={(e) => onSetRules({ quick: e.target.checked })} /></label>
          <label className="switch-row"><span>Медлительный</span><input type="checkbox" checked={participant.rules.hesitant} disabled={participant.rules.quick || participant.rules.levelHeaded > 0} onChange={(e) => onSetRules({ hesitant: e.target.checked })} /></label>
          <label className="field-label">Холодные Нервы
            <select value={participant.rules.levelHeaded} disabled={participant.rules.hesitant} onChange={(e) => onSetRules({ levelHeaded: Number(e.target.value) as 0|1|2 })}>
              <option value={0}>Нет</option>
              <option value={1}>2 карты, выбрать одну</option>
              <option value={2}>3 карты, выбрать одну</option>
            </select>
          </label>
          <p className="helper-text">Медлительный несовместим с Быстрым и Холодными Нервами; интерфейс не даёт включить конфликтующую комбинацию.</p>
        </section>

        <section className="settings-section danger-section">
          <h3>Участник</h3>
          <button className={participant.defeated ? 'danger-button active' : 'danger-button'} onClick={onToggleDefeated}>{participant.defeated ? 'Вернуть в бой' : 'Выбыл'}</button>
          {!participant.wildCard && <button onClick={onMakeWildCard}>Сделать Дикой Картой</button>}
          {participant.defeated && (
            <button className="text-danger" onClick={() => { if (confirm(`Удалить «${participant.name}» окончательно?`)) { onRemove(); onClose() } }}>Удалить участника</button>
          )}
        </section>
      </div>
    </Modal>
  )
}
