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

Version `0.2.0` of this plugin removed the multi-version declarations and the
compatibility code paths that only existed for older hosts. The plugin imports
Host UI modules and version-specific DOM anchors, so an untested host is treated
as unsupported rather than admitted by range.

## Host contract used

| Surface | Use |
| --- | --- |
| `sessionQuery.listSessions` / `observeSession` / `readTitleSnapshot` | Host-side cross-conversation reads, never a second database or index |
| `connection.fetch.register` | Authenticated `POST /api/dsh-find-all/search` |
| `remote.session.follow` / `page` | Durable whole-conversation reads by `throughSeq` |
| `workspaceRegistry.archivedSessionIds`, `uiWorkspace.unarchiveSession` | Archive exclusion, explicit restore |
| `conversation.session.header.utilities` | Find button in the Session header |
| `sidebar.footer.action` | `对话全文搜索` / `Full-text conversation search` entry |
| `ui-primitives` `Modal`, `Button`, `Input`, `Checkbox`, `MarkdownText`, `writeClipboard` | Native controls and renderer-faithful text projection |
| `uiConversation.userText.createEvaluator()` and the public Slot inspection | Default-masked user text and renderer guard |
| `data-phase`, `data-conversation-content[data-conversation-session]`, `data-conversation-scroll`, `data-chat-flow`, `data-chat-anchor-key`, `data-chat-turn`, `data-clock` | Scope isolation, navigation and text extraction |

## Verification (2026-11-01)

- `node scripts/build-client.mjs --check`: reproducible bundle from `src/`.
- `node --test "test/**/*.test.mjs"`: **134 passed, 0 failed**.
- `scripts/check-client-registration.mjs`: the bundle registers
  `@ryuu-64/dsh-find-all`.
- Production client bundle SHA-256:
  `b84a1f65c0d760647e1aebfdd3bc0c60d5a4c66eeddb88adba216456fb995c12`.
- Isolated official `0.2.1-rc.5` Web profile (`DSH_HOME` under a temporary
  directory, bundled Desktop runtime commit `d4db512`):
  `dsh plugin --profile web add <candidate.tgz>` installed `0.2.0`, and
  `window.__DSH_BOOT__` listed `@ryuu-64/dsh-find-all`.
- Real Chrome run on that profile:
  - the sidebar `对话全文搜索` entry rendered;
  - searching `FIND_ALL_A_USER_001` returned exactly one conversation with the
    title and the matching body snippet;
  - opening that result retained the query, opened the conversation and showed
    `1 个结果` in the current-conversation find bar;
  - no console or page errors were recorded.
- Host route with two synthetic 80-turn sessions: `scanned: 2`,
  `complete: true`, `failed: 0`, one body match with the exact snippet and
  UTF-16 range `0–19`.
- The same route rejects unauthenticated requests and does not enable the
  optional SQLite full-text index.

## Unverified boundaries

- Packaged Electron/Tauri installers, Windows registry integration and other
  operating systems were not exercised.
- Any host other than `0.2.1-rc.5` is unsupported by declaration.
- Whole-history navigation beyond the retained-query handoff, default-masked
  secret reveal invalidation, archived-search UI and the plugin-manager
  disable/enable cycles were not rerun for this cleanup.
- The historical desktop/Windows acceptance harness and its evidence were
  removed with the old host targets; this document is the single current
  record.

No npm publication is implied by this review.
