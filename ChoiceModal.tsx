import type { Participant, PendingInitiativeChoice } from '../models/game'
import { Modal } from '../components/Modal'
import { PlayingCardView } from '../components/PlayingCardView'

export function ChoiceModal({ choice, participant, onChoose }: { choice: PendingInitiativeChoice; participant: Participant; onChoose: (cardId: string) => void }) {
  return (
    <Modal title={`${participant.name}: выберите инициативу`} onClose={() => {}} wide>
      <p className="helper-text">Холодные Нервы оставляют выбор игроку или ведущему. Невыбранные карты уйдут в сброс.</p>
      <div className="choice-cards">
        {choice.cards.map((card) => (
          <button className="choice-card-button" key={card.id} onClick={() => onChoose(card.id)}>
            <PlayingCardView card={card} />
            <span>Выбрать</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
