# Compatibility and verification

## Supported host

Exactly one host is supported: official DSH `0.2.1-rc.5`.

All four peer requirements declare only that version:

- `@deepseek-ai/dsh-api-session-controller`
- `@deepseek-ai/dsh-client-ui-chat`
- `@deepseek-ai/dsh-client-ui-conversation`
- `@deepseek-ai/dsh-client-ui-primitives`

`0.2.1-rc.4`, plain `0.2.1`, every earlier release and every future release are
rejected by the official compatibility evaluator. There is no `engines.dsh`
override and no exact-version exemption.

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
| Workspaces section header (`[class*="_sectionHeader"]`, host `搜索会话` / `Search sessions` button) | The host button is swapped inside its existing search slot, so the header layout (label, filter, add-workspace actions) is unchanged; works in the expanded sidebar and in the collapsed rail |
| Host `session.search` chord (`Ctrl+K` / `Cmd+K`) | Intercepted in the capture phase before the Host bubble handler; opens the plugin search |
| `ui-primitives` `Modal`, `Button`, `Input`, `Checkbox`, `MarkdownText`, `writeClipboard` | Native controls and renderer-faithful text projection |
| `uiConversation.userText.createEvaluator()` and the public Slot inspection | Default-masked user text and renderer guard |
| `data-phase`, `data-conversation-content[data-conversation-session]`, `data-conversation-scroll`, `data-chat-flow`, `data-chat-anchor-key`, `data-chat-turn`, `data-clock` | Scope isolation, navigation and text extraction |

The Workspaces header has no public Slot, so its search button is replaced by a
DOM entry kept alive with a coalesced `MutationObserver`. This anchor is part of
the same version-pinned contract as the other `data-*` hooks. `Ctrl/Cmd+K` is
taken over by a `window` capture listener; the Host dispatches its shortcuts on
the bubble phase and respects `defaultPrevented`, so other shortcuts and open
dialogs are unaffected.

## Verification (2026-11-01)

- `node scripts/build-client.mjs --check`: reproducible bundle from `src/`.
- `node --test "test/**/*.test.mjs"`: **138 passed, 0 failed**.
- `scripts/check-client-registration.mjs`: the bundle registers
  `@ryuu-64/dsh-find-all`.
- Production client bundle SHA-256:
  `77f8b97d2dcf20f63d0d2ed05dc07921d14792f19714cf38df6bd6d1493c97c8`.
- Isolated official `0.2.1-rc.5` Web profile (`DSH_HOME` under a temporary
  directory, bundled Desktop runtime commit `d4db512`):
  `dsh plugin --profile web add <candidate.tgz>` installed `0.2.2`, and
  `window.__DSH_BOOT__` listed `@ryuu-64/dsh-find-all`.
- Real Chrome run on that profile:
  - the Workspaces header shows the plugin entry in the Host search icon's
    box (28×28); the Host `搜索会话` button is hidden and the old
    sidebar-footer entry is gone;
  - the `工作区` label keeps the Host's original position: `x = 16` with the
    plugin and `x = 16` after temporarily restoring the Host button, so the
    slot, filter and add-workspace actions do not move;
  - `Ctrl+K` opens the plugin search Modal instead of the Host session search;
  - clicking the header entry opens the same Modal; searching
    `FIND_ALL_A_USER_001` returned one conversation with its title and body
    snippet;
  - opening that result retained the query, opened the conversation and showed
    `1 个结果` in the current-conversation find bar;
  - in the collapsed rail (55 px sidebar) the entry still renders as a 36×36
    icon button and `Ctrl+K` still opens the Modal;
  - no console or page errors were recorded.
- Host route with two synthetic 80-turn sessions: `scanned: 2`,
  `complete: true`, `failed: 0`, exact snippet and UTF-16 ranges.
- `Ctrl/Cmd+K` is ignored while another Host dialog is open, and the hidden Host
  search input/slot is restored when the plugin is disabled.

## Unverified boundaries

- Packaged Electron/Tauri installers, Windows registry integration and other
  operating systems were not exercised.
- Any host other than `0.2.1-rc.5` is unsupported by declaration; the header
  replacement is explicitly coupled to its DOM.
- Whole-history navigation beyond the retained-query handoff, default-masked
  secret reveal invalidation, archived-search UI and the plugin-manager
  disable/enable cycles were not rerun for this change.
- The historical desktop/Windows acceptance harness and its evidence were
  removed with the old host targets; this document is the single current
  record.

No npm publication is implied by this review.
