// Uses the official Session/JSONL seams exercised by the current host tests.
// No model is called: every synthetic turn is already closed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function seedHistory(runtimeRequire, home, workspace) {
  const load = name => import(pathToFileURL(runtimeRequire.resolve(name)).href);
  const { Session, SessionId, SESSION_FORMAT_VERSION } = await load('@deepseek-ai/dsh-session');
  const { createUserMessage, createAssistantMessage, createSystemMessage } = await load('@deepseek-ai/dsh-llm');
  const { Context } = await load('@deepseek-ai/cordis');
  const jsonl = await load('@deepseek-ai/dsh-session-persistence-jsonl');
  const Jsonl = jsonl.default ?? jsonl;
  const createdAt = Date.now() - 60_000;
  fs.mkdirSync(workspace, { recursive: true });
  const ctx = new Context();
  const summary = [];
  try {
    await ctx.plugin(Jsonl, { root: path.join(home, '.dsh', 'sessions') });
    for (const label of ['A', 'B']) {
      const id = SessionId(`find-all-synthetic-${label.toLowerCase()}`);
      const session = Session.create(id);
      for (let turn = 1; turn <= 80; turn++) {
        session.append('turn/start', { turn });
        session.append('step/start', { turn, step: 1 });
        if (turn === 1) session.append('system/message', {
          turn, step: 1, message: createSystemMessage('Synthetic compatibility fixture.', '@deepseek-ai/dsh-system-prompt'),
        }, { surfaceOp: 'append' });
        const suffix = String(turn).padStart(3, '0');
        const user = session.append('user/message', createUserMessage({
          content: [{ type: 'text', text: `FIND_ALL_${label}_USER_${suffix} synthetic user` }], source: { kind: 'user' },
        }), { surfaceOp: 'append' });
        if (turn === 1) session.append('session/title', {
          title: `FIND_ALL_${label} synthetic compatibility`, messageSeqs: [user.seq], source: { kind: 'fallback' },
        });
        session.append('request/header', {
          header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } }, reason: turn === 1 ? 'initial' : 'change',
        });
        session.append('assistant/message', {
          stream: [], turn, step: 1,
          message: createAssistantMessage({
            content: [{ type: 'text', text: `FIND_ALL_${label}_REPLY_${suffix} synthetic reply` }],
            source: { provider: 'deepseek-official', model: 'deepseek-v4-flash' },
          }),
          usage: { inputTokens: 1, outputTokens: 1 },
        }, { surfaceOp: 'append' });
        session.append('step/end', { turn, step: 1 });
        session.append('turn/end', { turn, reason: { kind: 'completed' } });
      }
      const events = session.snapshotEvents();
      assert.equal(events.at(-1).type, 'turn/end');
      const handle = await ctx.sessionPersistence.create({
        version: SESSION_FORMAT_VERSION, id, createdAt,
        isSeeded: false, cwd: workspace, delegationDepth: 0,
      });
      await handle.append(events);
      await handle.close();
      summary.push({ id, events: events.length, turns: 80 });
    }
  } finally { await ctx.fiber.dispose(); }
  return summary;
}
