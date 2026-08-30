import type { Participant } from '../models/game'
import { Modal } from '../components/Modal'

export function ManualDrawModal({ participants, onClose, onDraw }: { participants: Participant[]; onClose: () => void; onDraw: (participantId: string) => void }) {
  const active = participants.filter((p) => !p.defeated)
  return (
    <Modal title="Сдать карту" onClose={onClose}>
      <p className="helper-text">Карта будет показана в журнале и сразу отправлена в общий сброс. Инициатива персонажа не изменится.</p>
      <div className="participant-picker">
        {active.map((participant) => (
          <button key={participant.id} onClick={() => { onDraw(participant.id); onClose() }}>
            <strong>{participant.name}</strong>
            <span>{participant.wildCard ? 'Дикая карта' : 'Статист'}</span>
          </button>
        ))}
      </div>
      {active.length === 0 && <div className="empty-panel">Нет активных участников.</div>}
    </Modal>
  )
}
