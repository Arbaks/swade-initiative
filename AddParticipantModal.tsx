import { useRef, useState } from 'react'
import { Modal } from '../components/Modal'

export function AddParticipantModal({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string, count: number, wild: boolean) => void }) {
  const [name, setName] = useState('')
  const [lastAdded, setLastAdded] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const add = (count: number, wild: boolean) => {
    const cleaned = name.trim()
    if (!cleaned) return
    onAdd(cleaned, count, wild)
    setLastAdded(count > 1 ? `${cleaned} ×${count}` : cleaned)
    setName('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <Modal title="Добавить участника" onClose={onClose}>
      <label className="field-label">
        Имя
        <input
          ref={inputRef}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(1, false)
            }
          }}
          placeholder="Например: Разбойник"
        />
      </label>
      <div className="modal-section">
        <h3>Добавить</h3>
        <div className="action-grid">
          <button type="button" className="primary-button" onClick={() => add(1, true)}>Дикая карта</button>
          <button type="button" onClick={() => add(1, false)}>Статист</button>
          <button type="button" onClick={() => add(2, false)}>Статисты ×2</button>
          <button type="button" onClick={() => add(3, false)}>Статисты ×3</button>
          <button type="button" onClick={() => add(5, false)}>Статисты ×5</button>
        </div>
      </div>
      <p className="helper-text">Enter добавляет одного статиста. Окно остаётся открытым, чтобы быстро набрать весь бой.</p>
      {lastAdded && <p className="add-feedback">✓ Добавлено: {lastAdded}</p>}
    </Modal>
  )
}
