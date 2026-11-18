import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import fastExtension from "../src/index.ts";
import { applyOpenAIFast, applyOpenAIUltrafast, supportsOpenAIUltrafast } from "../src/openai.ts";

const codex = { provider: "openai-codex", id: "gpt-5.6-luna", api: "openai-codex-responses" };
const sol = { provider: "openai", id: "gpt-6.1-sol", api: "openai-responses" };
type Context = { model: typeof sol | undefined; ui: { notify: (message: string, level?: string) => void } };
type Handler = (event: { payload: unknown }, ctx: Context) => unknown;
type Command = (args: string, ctx: Context) => Promise<void>;
type Mode = "off" | "fast" | "ultrafast";

function mockExtension() {
  const commands = new Map<string, Command>();
  const handlers = new Map<string, Handler>();
  fastExtension({
    registerCommand(name: string, options: { handler: Command }) {
      commands.set(name, options.handler);
    },
    on(name: string, handler: Handler) {
      handlers.set(name, handler);
    },
  } as unknown as ExtensionAPI);
  assert.deepEqual([...commands.keys()], ["fast", "ultrafast"]);
  return {
    command: (name: "fast" | "ultrafast", ctx: Context, args = "") => commands.get(name)!(args, ctx),
    start: handlers.get("session_start")!,
    request: (ctx: Context, payload: unknown = { model: ctx.model?.id }) =>
      handlers.get("before_provider_request")!({ payload }, ctx),
  };
}

function session(t: TestContext, model: typeof sol | undefined = sol, saved?: unknown) {
  const dir = mkdtempSync(join(tmpdir(), "pi-fast-"));
  const previous = process.env.PI_CODING_AGENT_DIR;
  process.env.PI_CODING_AGENT_DIR = dir;
  t.after(() => {
    if (previous === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = previous;
    rmSync(dir, { recursive: true, force: true });
  });
  const path = join(dir, "extensions", "pi-fast.json");
  if (saved !== undefined) {
    mkdirSync(join(dir, "extensions"), { recursive: true });
    writeFileSync(path, JSON.stringify(saved), "utf8");
  }
  const messages: { message: string; level?: string }[] = [];
  const ctx: Context = { model, ui: { notify: (message, level) => messages.push({ message, level }) } };
  const restart = () => {
    const extension = mockExtension();
    extension.start({ payload: null }, ctx);
    return extension;
  };
  return { ctx, messages, path, restart, extension: restart(), readState: () => JSON.parse(readFileSync(path, "utf8")) };
}

test("eligible OpenAI requests receive the right fast tier without overriding settings", () => {
  const payload = { model: codex.id, input: [] };
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
    service_tier: "priority",
  });
  assert.deepEqual(applyOpenAIFast({ ...sol, provider: "openai-codex" }, { model: sol.id }), {
    model: sol.id,
    service_tier: "priority",
  });
  assert.equal(applyOpenAIFast({ ...codex, provider: "anthropic" }, payload), undefined);
  assert.equal(applyOpenAIFast({ ...codex, id: "gpt-5.4-nano" }, { model: "gpt-5.4-nano" }), undefined);
  assert.equal(applyOpenAIFast(codex, { model: "gpt-5.5" }), undefined);
  assert.equal(applyOpenAIFast(codex, { ...payload, service_tier: "default" }), undefined);
  assert.equal(applyOpenAIFast(codex, null), undefined);
  assert.deepEqual(payload, { model: codex.id, input: [] });
});

test("Ultrafast applies to supported models on API-key and ChatGPT Responses channels", () => {
  for (const provider of ["openai", "openai-codex"]) {
    for (const id of ["gpt-6.1-sol", "gpt-6-astra", "gpt-6.2-sol", "gpt-6.2-astra"]) {
      const model = { provider, id, api: provider === "openai" ? "openai-responses" : "openai-codex-responses" };
      const payload = Object.freeze({ model: id, input: [], tools: [], reasoning: { effort: "high" }, stream: true });
      assert.equal(supportsOpenAIUltrafast(model), true);
      assert.deepEqual(applyOpenAIUltrafast(model, payload), { ...payload, service_tier: "ultrafast" });
    }
  }
});

test("Ultrafast rejects unsupported models, providers, and non-Responses interfaces", () => {
  for (const model of [
    undefined,
    codex,
    { ...sol, id: "gpt-6-sol" },
    { ...sol, id: "gpt-5.6-sol" },
    { ...sol, id: "gpt-6.1-sol-2026-09-29" },
    { ...sol, provider: "anthropic" },
    { ...sol, api: "openai-completions" },
    { ...sol, api: "openai-codex-responses" },
    { ...sol, api: undefined },
    { ...sol, provider: "openai-codex" },
    { ...sol, id: "gpt-6.2-sol", api: "openai-completions" },
    { ...codex, id: "gpt-6.2-astra", api: "openai-responses" },
  ]) {
    assert.equal(supportsOpenAIUltrafast(model), false);
    assert.equal(applyOpenAIUltrafast(model, { model: model?.id }), undefined);
  }
});

test("both modes preserve existing service tiers and leave unrelated or invalid payloads alone", () => {
  for (const apply of [applyOpenAIFast, applyOpenAIUltrafast]) {
    for (const tier of ["auto", "default", "priority", "fast", "ultrafast", null, undefined]) {
      assert.equal(apply(sol, { model: sol.id, service_tier: tier }), undefined);
    }
    for (const payload of [null, undefined, [], "request", 42, { model: "gpt-6-astra" }]) {
      assert.equal(apply(sol, payload), undefined);
    }
  }
});

const transitions: [Mode, "fast" | "ultrafast", Mode][] = [
  ["off", "fast", "fast"],
  ["off", "ultrafast", "ultrafast"],
  ["fast", "fast", "off"],
  ["fast", "ultrafast", "ultrafast"],
  ["ultrafast", "fast", "fast"],
  ["ultrafast", "ultrafast", "off"],
];

for (const [from, command, to] of transitions) {
  test(`${from} + /${command} becomes ${to} and persists across sessions`, async (t) => {
    const s = session(t, sol, { mode: from });
    await s.extension.command(command, s.ctx);
    const expected = to === "off" ? undefined : { model: sol.id, service_tier: to === "fast" ? "priority" : "ultrafast" };
    assert.deepEqual(s.extension.request(s.ctx), expected);
    assert.deepEqual(s.readState(), { mode: to });
    assert.deepEqual(s.restart().request(s.ctx), expected);
    assert.equal(s.messages.at(-1)?.level, "info");
    assert.match(s.messages.at(-1)!.message, to === "off" ? /modes off/ : /mode requested/);
  });
}

test("a new session defaults to Standard and unsupported commands never create saved state", async (t) => {
  const s = session(t, { ...sol, provider: "anthropic" });
  assert.equal(s.extension.request(s.ctx), undefined);
  for (const command of ["fast", "ultrafast"] as const) {
    await s.extension.command(command, s.ctx);
    assert.equal(s.extension.request(s.ctx), undefined);
    assert.equal(existsSync(s.path), false);
    assert.deepEqual(s.messages.at(-1), {
      message: `${command === "fast" ? "Fast" : "Ultrafast"} mode is not supported for anthropic/${sol.id}. Standard mode unchanged.`,
      level: "warning",
    });
  }
});

test("requesting unsupported Ultrafast leaves Fast active and its saved state untouched", async (t) => {
  const s = session(t, codex);
  await s.extension.command("fast", s.ctx);
  const before = readFileSync(s.path, "utf8");
  await s.extension.command("ultrafast", s.ctx);
  assert.deepEqual(s.extension.request(s.ctx), { model: codex.id, service_tier: "priority" });
  assert.equal(readFileSync(s.path, "utf8"), before);
  assert.deepEqual(s.restart().request(s.ctx), { model: codex.id, service_tier: "priority" });
  assert.match(s.messages.at(-1)!.message, /Ultrafast mode is not supported.*Fast mode unchanged/);
  assert.equal(s.messages.at(-1)?.level, "warning");
});

test("a non-Responses model cannot switch from Fast to Ultrafast", async (t) => {
  const s = session(t, { ...sol, api: "openai-completions" }, { mode: "fast" });
  await s.extension.command("ultrafast", s.ctx);
  assert.deepEqual(s.readState(), { mode: "fast" });
  assert.deepEqual(s.extension.request(s.ctx), { model: sol.id, service_tier: "priority" });
  assert.equal(s.messages.at(-1)?.level, "warning");
});

test("switching models preserves Ultrafast, and a rejected /fast keeps that selection", async (t) => {
  const s = session(t, sol, { mode: "ultrafast" });
  const before = readFileSync(s.path, "utf8");
  s.ctx.model = { ...sol, provider: "anthropic" };
  assert.equal(s.extension.request(s.ctx), undefined);
  await s.extension.command("fast", s.ctx);
  assert.equal(readFileSync(s.path, "utf8"), before);
  assert.match(s.messages.at(-1)!.message, /Ultrafast mode unchanged/);
  s.ctx.model = codex;
  assert.equal(s.extension.request(s.ctx), undefined);
  s.ctx.model = sol;
  assert.deepEqual(s.extension.request(s.ctx), { model: sol.id, service_tier: "ultrafast" });
});

for (const mode of ["fast", "ultrafast"] as const) {
  test(`/${mode} can always turn its active mode off, even on an unsupported model`, async (t) => {
    const s = session(t, { ...sol, provider: "anthropic" }, { mode });
    await s.extension.command(mode, s.ctx);
    assert.deepEqual(s.readState(), { mode: "off" });
    s.ctx.model = sol;
    assert.equal(s.extension.request(s.ctx), undefined);
    assert.equal(s.restart().request(s.ctx), undefined);
    assert.equal(s.messages.at(-1)?.level, "info");
  });
}

test("unexpected arguments to either command leave the active and saved modes unchanged", async (t) => {
  const s = session(t, sol, { mode: "ultrafast" });
  const before = readFileSync(s.path, "utf8");
  for (const command of ["fast", "ultrafast"] as const) {
    await s.extension.command(command, s.ctx, "unexpected");
    assert.deepEqual(s.messages.at(-1), { message: `Usage: /${command}`, level: "warning" });
    assert.equal(readFileSync(s.path, "utf8"), before);
    assert.deepEqual(s.extension.request(s.ctx), { model: sol.id, service_tier: "ultrafast" });
  }
});

test("legacy enabled state restores Fast and migrates when the user changes mode", async (t) => {
  const s = session(t, sol, { enabled: true });
  assert.deepEqual(s.extension.request(s.ctx), { model: sol.id, service_tier: "priority" });
  await s.extension.command("ultrafast", s.ctx);
  assert.deepEqual(s.readState(), { mode: "ultrafast" });
  assert.deepEqual(s.restart().request(s.ctx), { model: sol.id, service_tier: "ultrafast" });
});

for (const saved of [{ enabled: false }, { mode: "off", enabled: true }, { mode: "unknown", enabled: true }, null]) {
  test(`saved state ${JSON.stringify(saved)} does not enable acceleration`, (t) => {
    const s = session(t, sol, saved);
    assert.equal(s.extension.request(s.ctx), undefined);
  });
}

test("missing model information prevents enabling a mode", async (t) => {
  const s = session(t);
  s.ctx.model = undefined;
  await s.extension.command("ultrafast", s.ctx);
  assert.equal(existsSync(s.path), false);
  s.ctx.model = sol;
  assert.equal(s.extension.request(s.ctx), undefined);
  assert.equal(s.messages.at(-1)?.level, "warning");
});

test("a save failure still applies the selected mode for the current session", async (t) => {
  const s = session(t);
  mkdirSync(s.path, { recursive: true });
  await s.extension.command("ultrafast", s.ctx);
  assert.deepEqual(s.extension.request(s.ctx), { model: sol.id, service_tier: "ultrafast" });
  assert.match(s.messages[0]!.message, /could not be saved/);
  assert.equal(s.messages[0]?.level, "warning");
  assert.equal(s.messages.at(-1)?.level, "info");
});
