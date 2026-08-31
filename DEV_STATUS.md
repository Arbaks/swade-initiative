# DEV STATUS — v7

## Changes in this build

- Firebase Realtime Database URL is hardcoded in the app config:
  `https://swade-tracker-default-rtdb.europe-west1.firebasedatabase.app`.
- Room links now contain only `?room=XXXXXX`; legacy `db` query parameters are removed automatically.
- Firebase Web API key is no longer committed in `src/`; it is read from `VITE_FIREBASE_API_KEY`.
- `.env.local` is ignored; `.env.example` documents local setup.
- GitHub Pages workflow passes `secrets.VITE_FIREBASE_API_KEY` to the Vite build.
- Manual `Перемешать` now gathers draw pile + discard pile + current initiative cards + pending initiative choices, shuffles all physical cards into one draw pile, clears current initiative/active turn, and preserves exactly 54 unique cards.

## Validation

- All TS/TSX files pass TypeScript syntax/transpile parsing.
- Full reshuffle invariant was executed 250 randomized times with normal and Level Headed participants: 54 physical cards before and after reshuffle, with no duplicates or losses.
- Full npm install/build could not be run in this environment because npm registry access times out.

## Deployment note

The repository must define the GitHub Actions secret `VITE_FIREBASE_API_KEY`. The Firebase Web API key is public at browser runtime; Firebase Security Rules/Auth/App Check remain the actual data-access boundary.

## v8 — Firebase snapshot normalization
- Firebase RTDB empty arrays are normalized back to `[]` before reaching React.
- Numeric-keyed Firebase list objects are accepted as arrays.
- Nested participant arrays (`conditions`, `customConditions`, `history`) are normalized.
- Deck piles, pending choices and event log are normalized.
- This fixes spectator crashes such as `Cannot read properties of undefined (reading '0')`.
