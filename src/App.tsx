import { useEffect, useRef, useState } from 'react'
import type { GameState } from './models/game'
import { EventLog } from './components/EventLog'
import { InitiativeList } from './components/InitiativeList'
import { OnlineRoomModal } from './components/OnlineRoomModal'
import { ParticipantCard } from './components/ParticipantCard'
import { AddParticipantModal } from './modals/AddParticipantModal'
import { ChoiceModal } from './modals/ChoiceModal'
import { ManualDrawModal } from './modals/ManualDrawModal'
import { ParticipantSettingsModal } from './modals/ParticipantSettingsModal'
import { Modal } from './components/Modal'
import { useRoomSync } from './multiplayer/useRoomSync'
import { useGame } from './state/useGame'

export default function App() {
  const game = useGame()
  const multiplayer = useRoomSync(game.state, game.importState)
  const readOnly = multiplayer.role === 'spectator'
  const state = readOnly && multiplayer.remoteState ? multiplayer.remoteState : game.state

  const [addOpen, setAddOpen] = useState(false)
  const [drawOpen, setDrawOpen] = useState(false)
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [logOpen, setLogOpen] = useState(false)
  const [onlineOpen, setOnlineOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (multiplayer.error && new URLSearchParams(window.location.search).has('room')) setOnlineOpen(true)
  }, [multiplayer.error])

  useEffect(() => {
    if (readOnly) {
      setAddOpen(false)
      setDrawOpen(false)
      setSettingsId(null)
    }
  }, [readOnly])

  const settingsParticipant = state.participants.find((p) => p.id === settingsId) ?? null

  // Table order is presentation-only: current active participant first, then remaining active
  // Wild Cards, then active Extras. Defeated participants are always moved to the very end.
  // Initiative order on the right remains governed exclusively by dealt cards.
  const activeTableParticipant = state.participants.find(
    (participant) => participant.id === state.activeParticipantId && !participant.defeated,
  )
  const tableParticipants = [
    ...(activeTableParticipant ? [activeTableParticipant] : []),
    ...state.participants.filter((participant) => !participant.defeated && participant.id !== state.activeParticipantId && participant.wildCard),
    ...state.participants.filter((participant) => !participant.defeated && participant.id !== state.activeParticipantId && !participant.wildCard),
    ...state.participants.filter((participant) => participant.defeated),
  ]

  const currentChoice = state.pendingChoices[0]
  const choiceParticipant = currentChoice ? state.participants.find((p) => p.id === currentChoice.participantId) : undefined

  function exportSession() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `swade-session-round-${state.round}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importSession(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as GameState
      if (parsed.version !== 1 || !Array.isArray(parsed.participants) || !parsed.deck) throw new Error('Неверный формат')
      game.importState(parsed)
    } catch {
      alert('Не удалось импортировать сессию: файл имеет неверный формат.')
    }
  }

  const onlineLabel = multiplayer.role === 'host'
    ? `${multiplayer.connected ? '●' : '○'} Онлайн · ${multiplayer.roomId}`
    : multiplayer.role === 'spectator'
      ? `${multiplayer.connected ? '●' : '○'} Наблюдатель · ${multiplayer.roomId}`
      : multiplayer.role === 'connecting'
        ? '◌ Подключение…'
        : '◎ Онлайн'

  return (
    <div className={`app-shell ${readOnly ? 'spectator-mode' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">◇</span>
          <strong>SWADE</strong>
          <span>Initiative Tracker</span>
        </div>
        <div className="topbar-spacer" />
        <div className="round-pill">Раунд {state.round || '—'}</div>
        <div className="deck-summary">
          <span>Колода <strong>{state.deck.drawPile.length}</strong></span>
          <span>Сброс <strong>{state.deck.discardPile.length}</strong></span>
        </div>
        {state.jokerDrawnThisRound && (
          <div className="joker-warning"><strong>Джокер!</strong><span>Перед новым раундом колода будет перемешана.</span></div>
        )}
        <button
          className={`online-status-button ${multiplayer.role} ${multiplayer.connected ? 'connected' : ''}`}
          type="button"
          onClick={() => setOnlineOpen(true)}
        >
          {onlineLabel}
        </button>
        {!readOnly && (
          <>
            <button className="toolbar-button" onClick={exportSession}>Экспорт</button>
            <button className="toolbar-button" onClick={() => fileRef.current?.click()}>Импорт</button>
            <input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(e) => { const file = e.target.files?.[0]; if (file) void importSession(file); e.currentTarget.value = '' }} />
            <button className="icon-button top-icon" onClick={() => { if (confirm('Начать новую сессию? Текущая будет удалена из браузера.')) game.reset() }}>↺</button>
          </>
        )}
      </header>

      <main className="main-layout">
        <section className="workspace">
          {multiplayer.role === 'connecting' ? (
            <div className="spectator-banner connecting">Подключаемся к онлайн-столу…</div>
          ) : readOnly ? (
            <div className="spectator-banner">
              <span className={multiplayer.connected ? 'connection-dot connected' : 'connection-dot'} />
              <div><strong>Режим наблюдателя</strong><small>{multiplayer.connected ? 'Стол синхронизируется с ведущим в реальном времени.' : 'Связь потеряна. Показываем последнее полученное состояние.'}</small></div>
            </div>
          ) : (
            <div className="actionbar">
              <button className={`action-button deal ${state.roundComplete ? 'round-ready' : ''}`} onClick={game.dealInitiative} disabled={state.participants.length === 0 || state.pendingChoices.length > 0}>
                <span className="action-icon">✓</span><span><strong>Сдать инициативу</strong><small>По правилам SWADE</small></span>
              </button>
              <button className="action-button draw" onClick={() => setDrawOpen(true)} disabled={state.participants.length === 0}>
                <span className="action-icon">↓</span><span><strong>Сдать карту</strong><small>Вытянуть и сбросить</small></span>
              </button>
              <button className="action-button neutral" onClick={() => setAddOpen(true)}>
                <span className="action-icon">＋</span><span><strong>Добавить участника</strong><small>ДК или статист</small></span>
              </button>
              <button
                className="action-button neutral"
                onClick={game.reshuffle}
                disabled={state.deck.discardPile.length === 0 && !state.participants.some((participant) => participant.initiative) && state.pendingChoices.length === 0}
              >
                <span className="action-icon">⤨</span><span><strong>Перемешать</strong><small>Собрать все карты в колоду</small></span>
              </button>
            </div>
          )}

          {multiplayer.error && !onlineOpen && (
            <button className="online-error-banner" type="button" onClick={() => setOnlineOpen(true)}>
              ⚠ Онлайн: {multiplayer.error} <strong>Подробнее</strong>
            </button>
          )}

          {state.pendingChoices.length > 0 && (
            <div className="pending-banner">Ожидается выбор инициативы: {state.pendingChoices.length}. {readOnly ? 'Ведущий завершит выбор.' : 'Завершите выбор перед новой раздачей.'}</div>
          )}

          <div className="cards-grid">
            {tableParticipants.map((participant) => (
              <ParticipantCard
                key={participant.id}
                participant={participant}
                isActive={participant.id === state.activeParticipantId}
                readOnly={readOnly}
                onOpenSettings={() => !readOnly && setSettingsId(participant.id)}
                onSetNumbers={(patch) => !readOnly && game.setNumbers(participant.id, patch)}
                onToggleDefeated={() => !readOnly && game.toggleDefeated(participant.id)}
                onRemove={() => !readOnly && game.removeParticipant(participant.id)}
                onToggleCondition={(condition) => !readOnly && game.toggleCondition(participant.id, condition)}
                onAddCustomCondition={(value) => !readOnly && game.addCustomCondition(participant.id, value)}
                onRemoveCustomCondition={(value) => !readOnly && game.removeCustomCondition(participant.id, value)}
              />
            ))}
            {!readOnly && (
              <button className="add-card-tile" onClick={() => setAddOpen(true)}>
                <span>＋</span>
                <strong>Добавить участника</strong>
              </button>
            )}
          </div>
        </section>

        <InitiativeList
          participants={state.participants}
          activeParticipantId={state.activeParticipantId}
          roundComplete={state.roundComplete}
          onNextTurn={game.nextTurn}
          readOnly={readOnly}
        />
      </main>

      <section className="journal-panel panel">
        <div className="journal-heading">
          <h2>◷ Журнал событий</h2>
          <button onClick={() => setLogOpen(true)}>Открыть полный журнал</button>
        </div>
        <EventLog events={state.events} />
      </section>

      {!readOnly && addOpen && <AddParticipantModal onClose={() => setAddOpen(false)} onAdd={game.addParticipants} />}
      {!readOnly && drawOpen && <ManualDrawModal participants={state.participants} onClose={() => setDrawOpen(false)} onDraw={game.manualDraw} />}
      {!readOnly && settingsParticipant && (
        <ParticipantSettingsModal
          participant={settingsParticipant}
          onClose={() => setSettingsId(null)}
          onToggleCondition={(condition) => game.toggleCondition(settingsParticipant.id, condition)}
          onAddCustomCondition={(value) => game.addCustomCondition(settingsParticipant.id, value)}
          onRemoveCustomCondition={(value) => game.removeCustomCondition(settingsParticipant.id, value)}
          onSetNumbers={(patch) => game.setNumbers(settingsParticipant.id, patch)}
          onSetRules={(patch) => game.setRules(settingsParticipant.id, patch)}
          onToggleDefeated={() => game.toggleDefeated(settingsParticipant.id)}
          onMakeWildCard={() => game.makeWildCard(settingsParticipant.id)}
          onRemove={() => game.removeParticipant(settingsParticipant.id)}
        />
      )}
      {!readOnly && currentChoice && choiceParticipant && (
        <ChoiceModal choice={currentChoice} participant={choiceParticipant} onChoose={(cardId) => game.resolveChoice(currentChoice.id, cardId)} />
      )}
      {logOpen && (
        <Modal title="Журнал событий" onClose={() => setLogOpen(false)} wide>
          <EventLog events={state.events} expanded />
        </Modal>
      )}
      {onlineOpen && (
        <OnlineRoomModal
          role={multiplayer.role}
          roomId={multiplayer.roomId}
          shareUrl={multiplayer.shareUrl}
          connected={multiplayer.connected}
          error={multiplayer.error}
          onClose={() => setOnlineOpen(false)}
          onCreate={multiplayer.createRoom}
          onLeave={() => { multiplayer.leaveRoom(); setOnlineOpen(false) }}
        />
      )}
    </div>
  )
}
