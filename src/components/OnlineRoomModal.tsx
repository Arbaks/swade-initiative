import { useState } from 'react'
import type { OnlineRole } from '../multiplayer/useRoomSync'
import { Modal } from './Modal'

export function OnlineRoomModal({
  role,
  roomId,
  shareUrl,
  connected,
  error,
  onClose,
  onCreate,
  onLeave,
}: {
  role: OnlineRole
  roomId: string
  shareUrl: string
  connected: boolean
  error: string | null
  onClose: () => void
  onCreate: () => Promise<unknown>
  onLeave: () => void
}) {
  const [working, setWorking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  async function create() {
    setWorking(true)
    setLocalError(null)
    try {
      await onCreate()
    } catch (reason) {
      setLocalError(reason instanceof Error ? reason.message : 'Не удалось создать комнату.')
    } finally {
      setWorking(false)
    }
  }

  async function copyLink() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('Скопируйте ссылку комнаты:', shareUrl)
    }
  }

  const shownError = localError ?? error

  return (
    <Modal title="Онлайн-стол" onClose={onClose}>
      {role === 'local' && (
        <div className="online-modal-content">
          <p className="online-lead">Создайте комнату и отправьте игрокам одну ссылку. Они увидят стол в режиме наблюдателя и будут получать изменения в реальном времени.</p>
          <p className="helper-text">Firebase уже настроен для этого приложения — ведущему и игрокам не нужно знать адрес базы.</p>
          {shownError && <div className="online-error">{shownError}</div>}
          <button className="online-primary-button" type="button" disabled={working} onClick={() => void create()}>
            {working ? 'Создаём комнату…' : 'Создать онлайн-стол'}
          </button>
        </div>
      )}

      {role === 'connecting' && (
        <div className="online-modal-content online-centered">
          <div className="online-spinner" aria-hidden="true" />
          <strong>Подключаемся к Firebase…</strong>
          <span className="helper-text">Первое подключение может занять несколько секунд.</span>
        </div>
      )}

      {role === 'host' && (
        <div className="online-modal-content">
          <div className="online-room-hero">
            <span className={connected ? 'connection-dot connected' : 'connection-dot'} />
            <div>
              <span className="helper-text">Вы ведущий</span>
              <strong>Комната {roomId}</strong>
            </div>
          </div>
          <label className="field-label">
            Ссылка для игроков
            <input value={shareUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
          </label>
          <button className="online-primary-button" type="button" onClick={() => void copyLink()}>
            {copied ? 'Ссылка скопирована ✓' : 'Скопировать ссылку'}
          </button>
          <p className="helper-text">Игроки автоматически авторизуются анонимно и получают только режим просмотра. Ваши действия продолжают сохраняться локально в браузере.</p>
          {shownError && <div className="online-error">{shownError}</div>}
          <button className="online-secondary-button" type="button" onClick={onLeave}>Отключить онлайн-режим</button>
        </div>
      )}

      {role === 'spectator' && (
        <div className="online-modal-content">
          <div className="online-room-hero">
            <span className={connected ? 'connection-dot connected' : 'connection-dot'} />
            <div>
              <span className="helper-text">Режим наблюдателя</span>
              <strong>Комната {roomId}</strong>
            </div>
          </div>
          <p className="online-lead">Стол обновляется автоматически. Управление инициативой, состояниями и персонажами доступно только ведущему.</p>
          {shownError && <div className="online-error">{shownError}</div>}
          <button className="online-secondary-button" type="button" onClick={onLeave}>Выйти из комнаты</button>
        </div>
      )}
    </Modal>
  )
}
