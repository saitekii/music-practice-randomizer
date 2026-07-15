# Favorite Learning Path Stages

**Goal:** Let users star specific Learning Path stages they like to return to, and filter the existing "All Paths" popup down to just their favorites — replacing the earlier, broader "save arbitrary settings as a named preset" idea with something narrower, cheaper, and directly built on code that already exists.

## Background

The "All Paths" popup (`stageListModal`) already renders every stage as a clickable row (`renderStageRow()`) grouped into collapsible phases (`renderStageList()`), with a search box that flattens the view to matching rows across all phases (`stageListSearch` → `renderStageList(filterText)`). Clicking any row already calls `applyStage(idx)` and jumps straight to that stage's settings, closing the popup.

Favoriting slots into this directly: no new "jump to a stage" logic is needed (that already exists), only a way to mark a subset of stages and filter the same list down to them.

## Design

**Storage**: new localStorage key `mpr_favorite_stages` — a JSON array of stage **names** (not indices — matching the established convention from the `mpr_learning_stage` fix, so a future stage insertion never silently corrupts someone's favorites list the way index-based storage once did for the current-stage pointer).

**Row changes** (`renderStageRow()`, script.js:3108-3121): each row gains a star toggle between the stage number and name — `☆` (outline) if not favorited, `★` (filled) if favorited, plain Unicode glyphs matching this popup's existing chevron icons (`▾`/`▸`), not SVG. New row order: number → star → name → mastery dot.

**Click handling** (the delegated handler on `#stageListContent`, script.js:3351+): a new check for `.closest('.stage-favorite-star')` is added **before** the existing `.closest('.stage-list-row')` check (the star lives inside a row, so `closest('.stage-list-row')` would also match a star click — checking the star first and returning early is what prevents a star click from also jumping to that stage). Toggling a star updates `mpr_favorite_stages` and re-renders the whole list content (same pattern the search box already uses on every keystroke — `stageListContent.innerHTML = renderStageList(...)` — so this doesn't introduce a new rendering strategy).

**Favorites filter**: a new "★ Favorites" toggle button added to `.stage-list-search-row` (index.html:895-897), next to the existing search input. `renderStageList()` gains a second parameter, `favoritesOnly` — when true, it filters to only stages in `mpr_favorite_stages` **before** applying the existing text-search filter (both combine — search box text still narrows down within favorites, per your call). When `favoritesOnly` is true (with or without search text), the view is the flat list style already used for search results (no phase headers) — favorites naturally span multiple phases, so grouping by phase wouldn't make sense here, exactly the same reasoning that already made search results flat.

**Empty state**: when the Favorites filter is on and `mpr_favorite_stages` is empty, show a short message ("No favorites yet — tap ☆ on any stage to add it here") instead of an empty list, matching this app's existing pattern of friendly empty-state text (e.g. the Stats popup's "No data yet" message).

**Reset on open**: like the search box (already cleared on every popup open), the Favorites filter toggle resets to off every time the popup opens — no persisted "was favorites view active last time" state.

**Backup**: `mpr_favorite_stages` is added to `exportJSON()`/`importJSON()`, consistent with every other localStorage-backed feature already covered there (adaptive weights, daily log, settings, learning stage, theme, and — most recently — auto-backup's own 3 keys, which deliberately were NOT added since they're local device preferences, not portable data; favorites, like the daily log and settings, are genuinely portable data worth carrying across a restore, so they follow that precedent instead).

## Testing

- Clicking a star toggles that stage's favorite status without jumping to the stage or closing the popup.
- The star's visual state (☆ vs ★) matches `mpr_favorite_stages` after toggling, and persists across popup close/reopen.
- The Favorites filter button shows only favorited stages, flat (no phase headers), when active.
- Combining the Favorites filter with search text narrows the view to favorited stages whose name also matches the search text.
- Clicking a row (not the star) inside the Favorites-filtered view still jumps to that stage and closes the popup, exactly like the unfiltered view.
- The empty-state message appears when the Favorites filter is on and zero stages are favorited, and disappears once at least one exists.
- Both the search box and the Favorites filter reset to their default (empty / off) state every time the popup is reopened.
- `exportJSON()` includes `mpr_favorite_stages`; `importJSON()` restores it.
- Regression: `applyStage()`, `renderStageList()`'s existing phase-grouped/search-flattened behavior, and the phase-header collapse/expand toggle are all unchanged when no favorites-related UI is touched.
