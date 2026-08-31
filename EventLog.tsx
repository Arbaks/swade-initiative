import type { GameEvent } from '../models/game'
import { cardText } from '../rules/cards'

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(timestamp)
}

export function EventLog({ events, expanded = false }: { events: GameEvent[]; expanded?: boolean }) {
  const visible = expanded ? events : events.slice(0, 6)
  return (
    <div className={expanded ? 'event-log expanded' : 'event-log'}>
      {visible.map((event) => (
        <div className="event-card" key={event.id}>
          <div className="event-time">{formatTime(event.timestamp)}</div>
          <div className="event-content">
            {event.card && <span className="event-card-symbol">{cardText(event.card)}</span>}
            <span>{event.text}</span>
          </div>
          <div className="event-round">Раунд {event.round}</div>
        </div>
      ))}
      {visible.length === 0 && <div className="empty-panel">События появятся после первого действия.</div>}
    </div>
  )
}
