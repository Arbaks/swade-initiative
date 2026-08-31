import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GameState } from '../models/game'
import { normalizeGameState } from '../state/normalizeGameState'
import { getFirebaseContext, serializableState, type FirebaseContext, type RoomRecord } from './firebase'

export type OnlineRole = 'local' | 'connecting' | 'host' | 'spectator'

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function makeRoomCode(length = 6): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => ROOM_ALPHABET[value % ROOM_ALPHABET.length]).join('')
}

function roomFromSnapshot(value: unknown): RoomRecord | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<RoomRecord>
  if (typeof candidate.ownerId !== 'string') return null
  const state = normalizeGameState(candidate.state)
  if (!state) return null
  return {
    ownerId: candidate.ownerId,
    state,
    createdAt: typeof candidate.createdAt === 'number' ? candidate.createdAt : Date.now(),
    updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : Date.now(),
  }
}

function roomFromUrl(): string {
  return new URLSearchParams(window.location.search).get('room')?.toUpperCase() ?? ''
}

function setRoomInUrl(roomId: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('room', roomId)
  url.searchParams.delete('db') // migrate old v6 links silently
  window.history.replaceState({}, '', url)
}

function clearRoomFromUrl() {
  const url = new URL(window.location.href)
  url.searchParams.delete('room')
  url.searchParams.delete('db')
  window.history.replaceState({}, '', url)
}

export function useRoomSync(localState: GameState, restoreHostState: (state: GameState) => void) {
  const [role, setRole] = useState<OnlineRole>('local')
  const [roomId, setRoomId] = useState('')
  const [remoteState, setRemoteState] = useState<GameState | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const contextRef = useRef<FirebaseContext | null>(null)
  const roomIdRef = useRef('')
  const unsubscribersRef = useRef<Array<() => void>>([])
  const expectedHostRestoreRef = useRef<string | null>(null)
  const initialConnectStartedRef = useRef(false)

  const cleanupListeners = useCallback(() => {
    for (const unsubscribe of unsubscribersRef.current) unsubscribe()
    unsubscribersRef.current = []
    setConnected(false)
  }, [])

  const watchConnection = useCallback((context: FirebaseContext) => {
    const connectionRef = context.db.ref(context.database, '.info/connected')
    const unsubscribe = context.db.onValue(connectionRef, (snapshot) => {
      setConnected(snapshot.val() === true)
    })
    unsubscribersRef.current.push(unsubscribe)
  }, [])

  const watchSpectatorState = useCallback((context: FirebaseContext, code: string) => {
    const stateRef = context.db.ref(context.database, `rooms/${code}/state`)
    const unsubscribe = context.db.onValue(
      stateRef,
      (snapshot) => {
        const value = normalizeGameState(snapshot.val())
        if (value) {
          setRemoteState(value)
          setError(null)
        } else {
          setError('Получено повреждённое состояние онлайн-стола.')
        }
      },
      (reason) => setError(`Синхронизация остановлена: ${reason.message}`),
    )
    unsubscribersRef.current.push(unsubscribe)
  }, [])

  const connectToExistingRoom = useCallback(async (codeInput: string) => {
    const code = codeInput.trim().toUpperCase()
    if (!code) throw new Error('Не указан код комнаты.')

    cleanupListeners()
    setRole('connecting')
    setError(null)

    try {
      const context = await getFirebaseContext()
      const roomRef = context.db.ref(context.database, `rooms/${code}`)
      const snapshot = await context.db.get(roomRef)
      const room = roomFromSnapshot(snapshot.val())
      if (!snapshot.exists() || !room) throw new Error('Комната не найдена или имеет неверный формат.')

      contextRef.current = context
      roomIdRef.current = code
      setRoomId(code)
      setRoomInUrl(code)
      watchConnection(context)

      if (room.ownerId === context.uid) {
        expectedHostRestoreRef.current = JSON.stringify(serializableState(room.state))
        restoreHostState(room.state)
        setRemoteState(null)
        setRole('host')
      } else {
        setRemoteState(room.state)
        watchSpectatorState(context, code)
        setRole('spectator')
      }
    } catch (reason) {
      cleanupListeners()
      contextRef.current = null
      roomIdRef.current = ''
      setRole('local')
      const message = reason instanceof Error ? reason.message : 'Не удалось подключиться к комнате.'
      setError(message)
      throw reason
    }
  }, [cleanupListeners, restoreHostState, watchConnection, watchSpectatorState])

  const createRoom = useCallback(async () => {
    cleanupListeners()
    setRole('connecting')
    setError(null)

    try {
      const context = await getFirebaseContext()
      let code = ''
      let roomReference: unknown = null

      for (let attempt = 0; attempt < 6; attempt += 1) {
        code = makeRoomCode()
        roomReference = context.db.ref(context.database, `rooms/${code}`)
        const existing = await context.db.get(roomReference)
        if (!existing.exists()) break
        code = ''
      }

      if (!code || !roomReference) throw new Error('Не удалось подобрать свободный код комнаты. Попробуйте ещё раз.')

      const timestamp = Date.now()
      const room: RoomRecord = {
        ownerId: context.uid,
        state: serializableState(localState),
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      await context.db.set(roomReference, room)

      contextRef.current = context
      roomIdRef.current = code
      setRoomId(code)
      setRoomInUrl(code)
      setRemoteState(null)
      expectedHostRestoreRef.current = null
      setRole('host')
      watchConnection(context)
      return code
    } catch (reason) {
      cleanupListeners()
      contextRef.current = null
      roomIdRef.current = ''
      setRole('local')
      const message = reason instanceof Error ? reason.message : 'Не удалось создать комнату.'
      setError(message)
      throw reason
    }
  }, [cleanupListeners, localState, watchConnection])

  const leaveRoom = useCallback(() => {
    cleanupListeners()
    contextRef.current = null
    roomIdRef.current = ''
    expectedHostRestoreRef.current = null
    setRoomId('')
    setRemoteState(null)
    setRole('local')
    setError(null)
    clearRoomFromUrl()
  }, [cleanupListeners])

  useEffect(() => {
    if (initialConnectStartedRef.current) return
    initialConnectStartedRef.current = true
    const code = roomFromUrl()
    if (!code) return
    void connectToExistingRoom(code).catch(() => undefined)
  }, [connectToExistingRoom])

  useEffect(() => {
    if (role !== 'host') return
    const context = contextRef.current
    const code = roomIdRef.current
    if (!context || !code) return

    const serialized = JSON.stringify(serializableState(localState))
    if (expectedHostRestoreRef.current !== null) {
      if (serialized === expectedHostRestoreRef.current) {
        expectedHostRestoreRef.current = null
      }
      return
    }

    const roomRef = context.db.ref(context.database, `rooms/${code}`)
    void context.db.update(roomRef, {
      state: serializableState(localState),
      updatedAt: Date.now(),
    }).catch((reason: unknown) => {
      const message = reason instanceof Error ? reason.message : 'Не удалось отправить изменения игрокам.'
      setError(message)
    })
  }, [localState, role])

  useEffect(() => cleanupListeners, [cleanupListeners])

  const shareUrl = useMemo(() => {
    if (!roomId) return ''
    const url = new URL(window.location.href)
    url.searchParams.set('room', roomId)
    url.searchParams.delete('db')
    return url.toString()
  }, [roomId])

  return {
    role,
    roomId,
    remoteState,
    connected,
    error,
    shareUrl,
    createRoom,
    connectToExistingRoom,
    leaveRoom,
    clearError: () => setError(null),
  }
}
