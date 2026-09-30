import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import fastExtension from "../src/index.ts";
import { applyOpenAIFast } from "../src/openai.ts";

const codex = { provider: "openai-codex", id: "gpt-5.6-luna" };
type Context = { model: typeof codex; ui: { notify: (message: string, level?: string) => void } };
type Handler = (event: { payload: unknown }, ctx: Context) => unknown;

function mockExtension() {
  let command: ((args: string, ctx: Context) => Promise<void>) | undefined;
  const handlers = new Map<string, Handler>();
  fastExtension({
    registerCommand(_name: string, options: { handler: typeof command }) {
      command = options.handler;
    },
    on(name: string, handler: Handler) {
      handlers.set(name, handler);
    },
  } as unknown as ExtensionAPI);
  assert.ok(command);
  return { command, start: handlers.get("session_start")!, request: handlers.get("before_provider_request")! };
}

test("eligible OpenAI requests receive the right fast tier without overriding settings", () => {
  const payload = { model: codex.id, input: [] };
  const sol = { provider: "openai", id: "gpt-6.1-sol" };
  assert.deepEqual(applyOpenAIFast(codex, payload), { ...payload, service_tier: "priority" });
  assert.deepEqual(applyOpenAIFast({ ...codex, provider: "openai" }, payload), {
    ...payload,
    service_tier: "priority",
  });
  assert.deepEqual(applyOpenAIFast({ ...codex, id: "gpt-6-sol" }, { model: "gpt-6-sol" }), {
    model: "gpt-6-sol",
    service_tier: "priority",
  });
  assert.deepEqual(applyOpenAIFast(sol, { model: sol.id }), {
    model: sol.id,
    service_tier: "fast",
  });
  assert.deepEqual(applyOpenAIFast({ ...sol, provider: "openai-codex" }, { model: sol.id }), {
    model: sol.id,
    service_tier: "fast",
  });
  assert.equal(applyOpenAIFast({ ...codex, provider: "anthropic" }, payload), undefined);
  assert.equal(applyOpenAIFast({ ...codex, id: "gpt-5.4-nano" }, { model: "gpt-5.4-nano" }), undefined);
  assert.equal(applyOpenAIFast(codex, { model: "gpt-5.5" }), undefined);
  assert.equal(applyOpenAIFast(codex, { ...payload, service_tier: "default" }), undefined);
  assert.equal(applyOpenAIFast(codex, null), undefined);
  assert.deepEqual(payload, { model: codex.id, input: [] });
});

test("/fast toggles and remembers state across sessions", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pi-fast-"));
  const previous = process.env.PI_CODING_AGENT_DIR;
  process.env.PI_CODING_AGENT_DIR = dir;
  try {
    const messages: string[] = [];
    const ctx: Context = { model: codex, ui: { notify: (message) => messages.push(message) } };
    const first = mockExtension();
    first.start({ payload: null }, ctx);
    assert.equal(first.request({ payload: { model: codex.id } }, ctx), undefined);
    await first.command("", ctx);
    assert.deepEqual(first.request({ payload: { model: codex.id } }, ctx), {
      model: codex.id,
      service_tier: "priority",
    });
    assert.equal(JSON.parse(readFileSync(join(dir, "extensions", "pi-fast.json"), "utf8")).enabled, true);

    const second = mockExtension();
    second.start({ payload: null }, ctx);
    assert.deepEqual(second.request({ payload: { model: codex.id } }, ctx), {
      model: codex.id,
      service_tier: "priority",
    });
    await second.command("unexpected", ctx);
    assert.match(messages.at(-1)!, /Usage: \/fast/);
    await second.command("", ctx);
    assert.equal(second.request({ payload: { model: codex.id } }, ctx), undefined);
    assert.equal(JSON.parse(readFileSync(join(dir, "extensions", "pi-fast.json"), "utf8")).enabled, false);
  } finally {
    if (previous === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});
