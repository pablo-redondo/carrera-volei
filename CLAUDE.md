# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Carrera de Vóley" — a single-player volleyball career simulator. Pure client-side app: no framework, no bundler, no build step, no package.json, no test suite. Just `index.html` + native ES modules + hand-written CSS. All UI text, comments, and identifiers are in Spanish.

## Running it

There is no build/dev-server command defined in the repo. Because `js/main.js` is loaded as `<script type="module">`, the app must be served over `http(s)://`, not opened as a `file://` URL (module scripts are blocked by CORS under `file://`). Serve the repo root with any static file server, e.g.:

```
python -m http.server 8000
```

then open `http://localhost:8000/`. There are no lint, test, or build commands — none are configured in this repo.

## Architecture

The app is a single mutable state machine driven from `js/main.js`, with a strict separation between logic and rendering:

- **`js/data.js`** — static game data only (no functions besides none): `ATRIBUTOS`, `POSICIONES` (position profiles with base stats + scoring weights), `PAISES` (countries → leagues → clubs, two divisions each), event pools (`EVENTOS_PRETEMPORADA`, `EVENTOS_TEMPORADA`, `EVENTOS_ECONOMICOS`), `TORNEOS`, flavor phrases. Adding a country/club/event means editing this file only.
- **`js/engine.js`** — pure game-logic/simulation functions, no DOM access: `crearJugador`, `aplicarEntrenamiento`, `generarEvento`/`resolverOpcion`, `simularTemporada`/`aplicarResultadoTemporada`, `comprobarSeleccionNacional`, `generarOfertas`/`ficharPorClub`, `calcularOverall*`, `calcularLegado`. Everything here operates on a plain `jugador` (player) object and returns new values or mutates it directly — no side effects on the page.
- **`js/graficos.js`** — SVG generation as pure functions returning markup strings (`escudoClub`, `emblemaLiga`, `trofeoSvg`, `banderaSvg`, `ico`, `colorClub`, `nivelOverall`). Club crests are procedurally generated from a deterministic FNV-1a hash of the club name (not real logos — the comment in the file explains this is intentional, to avoid using trademarked branding), so the same club always renders the same crest everywhere in the UI.
- **`js/logros.js`** — the achievements system. `LOGROS` is a flat array of `{ id, categoria, condicion(jugador, ctx) }` entries; `comprobarLogros(jugador, ctx)` checks unmet ones and returns newly unlocked ones. Persisted under its **own** `localStorage` key (`carreraVoley_logros`), separate from the save game, so unlocked achievements survive "Nueva carrera" as account-wide progress.
- **`js/ui.js`** — the entire view layer. Every `render*` function (`renderInicio`, `renderCreacion`, `renderEntrenamiento`, `renderEvento`, `renderResumenTemporada`, `renderFichajes`, `renderRetiro`, etc.) builds an HTML string, injects it via `pintarPantalla()`/`innerHTML`, and wires up DOM event listeners that call back into a `cb` object of callbacks passed in by `main.js`. `ui.js` never imports from `main.js` — it only calls the callbacks it's given. `renderSidebar`/`renderTrayectoria`/`actualizarCabeceraTemporada` update the persistent chrome (player card sidebar, season header, career trajectory table) independently of the main screen.
- **`js/main.js`** — the entry point and orchestrator. Owns the single mutable `estado = { jugador, temporadaNum }` object and a chain of `pantallaX()` functions that form the game's screen flow (state machine):

  ```
  pantallaInicio → pantallaCreacion → pantallaEntrenamiento → pantallaEventoPretemporada
    → (pantallaEventoTemporada) → pantallaSimularTemporada → pantallaComprobarSeleccion
    → pantallaFichajes ⇄ pantallaRetirar → avanzarTemporada → pantallaEntrenamiento (loop)
  ```

  Each `pantallaX()` calls the matching `render*` in `ui.js`, passing callbacks that call into `engine.js` to mutate `estado.jugador`, then transition to the next screen. `guardar()`/`cargar()` persist `estado` to `localStorage` under `carreraVoley`. **`VERSION_GUARDADO`** gates save compatibility — bump it whenever the save shape changes (new required fields, changed league/division data, etc.), since an old save loaded against new data can otherwise crash the screen; `esGuardadoValido()` is the schema check that decides whether a stored save is still usable. Achievement checks (`comprobarYNotificarLogros`) run after any state-mutating action.

## Working in this codebase

- Keep the layering intact: game logic changes go in `engine.js`/`data.js`; rendering/markup changes go in `ui.js`; screen-flow/persistence changes go in `main.js`. Don't have `ui.js` reach into `localStorage` or call `engine.js` simulation entry points directly — it should only call the `cb` callbacks it receives.
- `index.html` also hosts a shared `<svg class="svg-defs">` block of reusable `<symbol>` definitions (ball, spike silhouette, trophy) referenced via `<use href="#ico-...">` from `graficos.js`/`ui.js`; new reusable icons belong there.
- Fonts (`fonts/*.woff2`) are self-hosted and declared in `css/fuentes.css` — no external/CDN font or script loading is used anywhere in the app.
- Match the existing Spanish naming convention for new functions, variables, and UI copy.
