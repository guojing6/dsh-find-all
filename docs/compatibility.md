# Compatibility and verification

## Supported host

Exactly one host is supported: official DSH `0.2.2-rc.1`. The Desktop runtime
that installs it is `@deepseek-ai/dsh-desktop-runtime@0.2.2-rc.1`, whose
app-boot reports release version `0.2.2-rc.1` and build commit
`c59d10aff167ad7eefead4b3a9082fb57c8fbfe8`.

All four peer requirements declare only that version:

- `@deepseek-ai/dsh-api-session-controller`
- `@deepseek-ai/dsh-client-ui-chat`
- `@deepseek-ai/dsh-client-ui-conversation`
- `@deepseek-ai/dsh-client-ui-primitives`

`0.2.1-rc.5`, plain `0.2.1`, `0.2.2-alpha.*`, every earlier release and every
future release are rejected by the official compatibility evaluator. Its
matching logic is unchanged from `0.2.1-rc.5`: the runtime version is app-boot's
own version, and prereleases participate via `includePrerelease`. There is no
`engines.dsh` override and no exact-version exemption.

The plugin imports Host UI modules and version-pinned DOM anchors, so an
untested host is treated as unsupported rather than admitted by range.

## Host contract used

| Surface | Use |
| --- | --- |
| `sessionQuery.listSessions` / `observeSession` / `readTitleSnapshot` | Host-side cross-conversation reads, never a second database or index |
| `connection.fetch.register` | Authenticated `POST /api/dsh-find-all/search` |
| `remote.session.follow` / `page` | Durable whole-conversation reads by `throughSeq` |
| `workspaceRegistry.archivedSessionIds`, `uiWorkspace.unarchiveSession` | Archive exclusion, explicit restore |
| `conversation.session.header.utilities` | Find button in the Session header |
| `sidebar.footer.action` | Hidden mount point for the search Modal; no visible footer entry remains |
| Workspaces section header (`[class*="_sectionHeader"]`, host search button in all eight UI locales) | The host button is swapped inside its existing search slot, so the header layout (label, filter, add-workspace actions) is unchanged; works in the expanded sidebar and in the collapsed rail |
| Host `session.search` chord (`Ctrl+K` / `Cmd+K`) | Web: intercepted in the capture phase before the Host bubble handler. Desktop: the shell routes matched chords natively to `session.search`; the plugin detects the Host inline search expanding, collapses it and opens its own search |
| `ui-primitives` `Modal`, `Button`, `Input`, `Checkbox`, `MarkdownText`, `writeClipboard` | Native controls and renderer-faithful text projection |
| `uiConversation.userText.createEvaluator()` and the public Slot inspection | Default-masked user text and renderer guard |
| `data-phase`, `data-conversation-content[data-conversation-session]`, `data-conversation-scroll`, `data-chat-flow`, `data-chat-anchor-key`, `data-chat-turn`, `data-clock` | Scope isolation, navigation and text extraction |

The Workspaces header has no public Slot, so its search button is replaced by a
DOM entry kept alive with a coalesced `MutationObserver`. This anchor is part of
the same version-pinned contract as the other `data-*` hooks. `Ctrl/Cmd+K` is
taken over by a `window` capture listener; the Host dispatches its shortcuts on
the bubble phase and respects `defaultPrevented`, so other shortcuts and open
dialogs are unaffected.

`0.2.2-rc.1` localizes the Workspaces search button, the in-conversation
turn-navigation rail and the exact "jump to turn N" labels into eight UI
locales (zh/en/ja/es/fr/de/ru/pt). The plugin matches every localized label, and
deliberately never activates the localized "load and jump" labels.

## Verification (2026-11-06)

- `node scripts/build-client.mjs --check`: reproducible bundle from `src/`.
- `npm run check`: **143 passed, 0 failed** (3 new locale regression tests).
- `scripts/check-client-registration.mjs`: the bundle registers
  `@guojing6/dsh-find-all`.
- Production client bundle SHA-256:
  `5e864fcfa797e42f84fc22fb4c829923cbe6e72c7b8645943f4d77d96efb423e`; the
  copy inside the acceptance candidate tarball is byte-identical.
- Acceptance candidate tarball SHA-256:
  `ceab127ec3cac4c348a1e9fe0c25cc5702343afd216bc7b9ac49d95c89f059e7`, the same
  `artifactSha256` the accepted run recorded. A final repack changed only the
  bundled Markdown documents; the client bundle above did not change.
- Published npm artefact `@guojing6/dsh-find-all@0.4.0` (dist-tag `latest`,
  integrity
  `sha512-rfDrziy8JCTwgcnW7rdLlOlqMi1A+8WcFtKWxDyiuiI7qaRpVUUegex0X2YtlvJFm499FkgPuD1JmjR6vF6H6A==`):
  tarball SHA-256
  `56f23dab5c999a6bb9360ca9062b60e9af619d9809e6c187b9e9ceca710cd318`.
- Isolated official host graph (`HOME`/`DSH_HOME` under a temporary directory,
  never the user profile): public-registry `@deepseek-ai/dsh@0.2.2-rc.1` with
  652 packages, all required host packages at `0.2.2-rc.1`. The vendor pins
  asserted from the lock are cordis `4.1.0`, cosmokit `1.9.0`,
  group/include/loader `1.1.0`, schemastery `3.19.0` and timer `1.2.0`; 327 lock
  entries were checked with no drift.
- `dsh plugin --profile web add <candidate.tgz> --ignore-scripts -w` was
  accepted by the compatibility gate and installed
  `@guojing6/dsh-find-all@0.4.0`; the boot graph listed
  `@guojing6/dsh-find-all` at release version `0.2.2-rc.1` / commit `c59d10a`.
- Real Chrome run on that profile:
  - the Workspaces header shows the plugin entry, which replaces the Host
    "Search sessions" button;
  - `Ctrl+K` opens the plugin search Modal, and the Host inline search stays
    collapsed;
  - `Ctrl+F` mounts `#dsh-find-all-root`;
  - no page or console errors were recorded.
- Acceptance command (isolated profile, system Chrome):
  `FIND_ALL_FULL_ACCEPTANCE=1 node scripts/compat/web-smoke.mjs 0.2.2-rc.1 <candidate.tgz> _compat-scratch/verify/0.2.2-rc.1-final2`.
  Evidence is kept in that directory (`result.json`, `host-versions.json`,
  `runtime-lock.json`, install logs, a token-redacted `server.log`, screenshots
  and redacted page texts); `browserErrors` is empty and no server was left
  running.

### Whole-history search acceptance

- Artifact match: the acceptance candidate tarball SHA-256 above equals
  `result.json`'s `artifactSha256`, and `lib/client.js` inside it is
  byte-identical to the built bundle and to the published npm artefact.
- Stages, all passed: install plus version-drift and required-host-package
  assertions; first-run prompts (notice pre-acknowledged, sign-in dialog
  closed through its own Close action); bootstrap (`seeded-conversation`,
  count "No results", `initialSessionViews: 1`); modern whole-history and
  cross-conversation search; projection. `desktop: "not-run"`.
- Seeds: two synthetic sessions of 562 events / 80 turns each
  (`find-all-synthetic-a`, `find-all-synthetic-b`).
- Whole-history with the default masked projection: `USER` and `REPLY` text
  each read 25 loaded / 80 whole (25 rendered, no offscreen preload), plus 160
  shared-prefix records.
- Navigation landed on `FIND_ALL_A_USER_001` (session A, user) and
  `FIND_ALL_B_REPLY_001` (session B, reply) with the exact, visible ranges;
  query replacement, close clearing ranges and an A/B/A switch immediately
  after a query all cancelled correctly.
- Cross-conversation: body search over `remote.session.follow`/`page` plus the
  `userText` projection, retained-query handoff and title-only search all
  passed.
- Archive: `excludedByDefault`, `explicitInclusion`, `noImplicitOpen`,
  `unarchiveAndOpen` and `retainedQuery` all passed.
- Projection: 2 file labels, 2 default secret masks, reveal invalidation,
  second-mask navigation, hidden-fragment whole count 0 / revealed-fragment
  loaded 1, and remount masks all passed.
- No page or browser errors (`browserErrors: []`).

### Acceptance environment adaptations

These are harness/environment adaptations for this isolated profile; plugin
behavior and the Host contract are unchanged, and no assertion was weakened.

1. A seeded `0.2.2-rc.1` profile opens a blank New Session with no conversation
   frame, so the full acceptance opens the seeded synthetic-A conversation
   through its normal sidebar row and waits for `[data-chat-flow]` before the
   `Ctrl+F` bootstrap step. The empty-profile bootstrap still exists for
   non-full runs; the rc.5-era ordering cannot be used as evidence.
2. Host session reads can exceed the plugin route's per-batch budget, so
   cross-conversation search legitimately pages (an initial `complete: false`
   plus `next`). The harness asserts the aggregate instead: stable total,
   monotonic scan, `failed: 0` / `skipped: 0`, final `complete: true` with
   `scanned` equal to the total, and rendered rows/titles equal to the
   aggregated items.

## Unverified boundaries

- Packaged Electron/Tauri installers, Windows registry integration and other
  operating systems were not exercised. The run reports `desktop: "not-run"`:
  only page-level surfaces were exercised, and directly driven native keystrokes
  in the packaged Desktop shell remain unverified.
- Any host other than `0.2.2-rc.1` is unsupported by declaration; the header
  replacement is explicitly coupled to its DOM and to its eight localized
  labels.
- The 28×28 header-entry box and `x = 16` label position measured for 0.3.0
  were not re-measured on `0.2.2-rc.1`, which changed sidebar spacing tokens;
  class names and DOM roles are unchanged.
- Known Host-side limitation, unrelated to the plugin: on a fresh CLI-started
  Web profile of `0.2.2-rc.1` the "Preview Notice" Continue acknowledgement
  cannot be persisted — `POST /api/settings/mutate` answers
  `settings/rejected` ("dsh: profile reload requires the root Include entry")
  for `ui-settings-general` — so the notice modal cannot be dismissed in that
  environment. The isolated acceptance harness therefore pre-seeds
  `welcomeNoticeVersion: "2026-09-28.1"` for `ui-settings-general` in that
  throwaway profile's patch layer, as declared test-environment setup. The
  packaged Desktop path and existing profiles that already acknowledged the
  notice are unaffected.
- Default-masked secret reveal invalidation, the archived-search UI and the
  projection remount path were covered by the acceptance run above; other
  projection and search variants were not separately re-run. Plugin-manager
  disable/enable cycles and installer/registry integration were not re-run for
  this change.
- The historical desktop/Windows acceptance harness and its evidence were
  removed with the old host targets; this document is the single current
  record.

No npm publication is implied by this review.
