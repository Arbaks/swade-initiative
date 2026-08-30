import type { GameState } from '../models/game'

const FIREBASE_VERSION = '12.18.0'

const firebaseConfig = {
  apiKey: 'AIzaSyACw9bHy2BC4uWWgviuAPQsAuGgK2XENqI',
  authDomain: 'swade-tracker.firebaseapp.com',
  projectId: 'swade-tracker',
  storageBucket: 'swade-tracker.firebasestorage.app',
  messagingSenderId: '509975349317',
  appId: '1:509975349317:web:1d9059c3db78b57f5dfb2c',
}

type FirebaseAppModule = {
  initializeApp: (config: Record<string, string>) => unknown
  getApps: () => unknown[]
  getApp: () => unknown
}

type FirebaseAuth = {
  currentUser: { uid: string } | null
}

type FirebaseAuthModule = {
  getAuth: (app: unknown) => FirebaseAuth
  signInAnonymously: (auth: FirebaseAuth) => Promise<{ user: { uid: string } }>
  setPersistence: (auth: FirebaseAuth, persistence: unknown) => Promise<void>
  browserLocalPersistence: unknown
  onAuthStateChanged: (auth: FirebaseAuth, callback: (user: { uid: string } | null) => void) => () => void
}

type DataSnapshot = {
  exists: () => boolean
  val: () => unknown
}

type FirebaseDatabaseModule = {
  getDatabase: (app: unknown, url?: string) => unknown
  ref: (database: unknown, path: string) => unknown
  get: (reference: unknown) => Promise<DataSnapshot>
  set: (reference: unknown, value: unknown) => Promise<void>
  update: (reference: unknown, value: unknown) => Promise<void>
  onValue: (
    reference: unknown,
    callback: (snapshot: DataSnapshot) => void,
    onError?: (error: Error) => void,
  ) => () => void
}

export interface FirebaseContext {
  uid: string
  database: unknown
  db: FirebaseDatabaseModule
}

export interface RoomRecord {
  ownerId: string
  state: GameState
  createdAt: number
  updatedAt: number
}

let modulesPromise: Promise<{
  app: FirebaseAppModule
  auth: FirebaseAuthModule
  database: FirebaseDatabaseModule
}> | null = null

let firebaseApp: unknown | null = null

function importFromFirebase<T>(path: string): Promise<T> {
  const url = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/${path}`
  return import(/* @vite-ignore */ url) as Promise<T>
}

async function loadModules() {
  if (!modulesPromise) {
    modulesPromise = Promise.all([
      importFromFirebase<FirebaseAppModule>('firebase-app.js'),
      importFromFirebase<FirebaseAuthModule>('firebase-auth.js'),
      importFromFirebase<FirebaseDatabaseModule>('firebase-database.js'),
    ]).then(([app, auth, database]) => ({ app, auth, database }))
  }
  return modulesPromise
}

export function normalizeDatabaseUrl(value: string): string {
  const cleaned = value.trim().replace(/\/+$/, '')
  if (!cleaned) throw new Error('Укажите URL Realtime Database.')

  let parsed: URL
  try {
    parsed = new URL(cleaned)
  } catch {
    throw new Error('URL базы выглядит некорректно.')
  }

  if (parsed.protocol !== 'https:') throw new Error('URL Realtime Database должен начинаться с https://')
  if (!parsed.hostname.endsWith('.firebaseio.com') && !parsed.hostname.endsWith('.firebasedatabase.app')) {
    throw new Error('Это не похоже на URL Firebase Realtime Database.')
  }

  return cleaned
}

export async function getFirebaseContext(databaseUrl: string): Promise<FirebaseContext> {
  const normalizedUrl = normalizeDatabaseUrl(databaseUrl)
  const modules = await loadModules()

  if (!firebaseApp) {
    firebaseApp = modules.app.getApps().length > 0
      ? modules.app.getApp()
      : modules.app.initializeApp(firebaseConfig)
  }

  const auth = modules.auth.getAuth(firebaseApp)
  await modules.auth.setPersistence(auth, modules.auth.browserLocalPersistence)

  const restoredUser = auth.currentUser ?? await new Promise<{ uid: string } | null>((resolve) => {
    let unsubscribe: () => void = () => undefined
    unsubscribe = modules.auth.onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
  const uid = restoredUser?.uid ?? (await modules.auth.signInAnonymously(auth)).user.uid
  const database = modules.database.getDatabase(firebaseApp, normalizedUrl)

  return { uid, database, db: modules.database }
}

export function serializableState(state: GameState): GameState {
  // Firebase rejects explicit `undefined` values. JSON round-tripping also guarantees
  // that snapshots are plain data and never carry browser/runtime objects.
  return JSON.parse(JSON.stringify(state)) as GameState
}
