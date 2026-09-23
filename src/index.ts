import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { applyOpenAIFast, supportsOpenAIFast } from "./openai.ts";

function statePath(): string {
  return join(getAgentDir(), "extensions", "pi-fast.json");
}

function loadEnabled(): boolean {
  try {
    return JSON.parse(readFileSync(statePath(), "utf8")).enabled === true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[pi-fast] Could not read saved state; starting with Fast mode off.");
    }
    return false;
  }
}

export default function fastExtension(pi: ExtensionAPI): void {
  let enabled = false;

  pi.on("session_start", () => {
    enabled = loadEnabled();
  });

  pi.registerCommand("fast", {
    description: "Toggle Fast mode for supported models",
    handler: async (args, ctx) => {
      if (args.trim()) {
        ctx.ui.notify("Usage: /fast", "warning");
        return;
      }
      enabled = !enabled;
      try {
        const path = statePath();
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, `${JSON.stringify({ enabled })}\n`, "utf8");
      } catch {
        ctx.ui.notify("Fast mode state could not be saved; this session still works.", "warning");
      }
      const model = ctx.model;
      const supported = supportsOpenAIFast(model);
      let message = "Fast mode off.";
      if (enabled) {
        message = supported
          ? `Fast mode on for ${model?.provider}/${model?.id}.`
          : `Fast mode on, but ${model?.provider ?? "current provider"}/${model?.id ?? "model"} is not supported.`;
      }
      ctx.ui.notify(message, enabled && !supported ? "warning" : "info");
    },
  });

  pi.on("before_provider_request", (event, ctx) => {
    if (enabled) return applyOpenAIFast(ctx.model, event.payload);
  });
}
