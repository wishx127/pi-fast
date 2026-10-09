import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { applyOpenAIFast, applyOpenAIUltrafast, supportsOpenAIFast, supportsOpenAIUltrafast } from "./openai.ts";

type SpeedMode = "off" | "fast" | "ultrafast";

const modes = [
  { command: "fast", label: "Fast", supports: supportsOpenAIFast },
  { command: "ultrafast", label: "Ultrafast", supports: supportsOpenAIUltrafast },
] as const;

function statePath(): string {
  return join(getAgentDir(), "extensions", "pi-fast.json");
}

function loadMode(): SpeedMode {
  try {
    const saved = JSON.parse(readFileSync(statePath(), "utf8"));
    if (saved?.mode === "fast" || saved?.mode === "ultrafast") return saved.mode;
    // Preserve choices saved by versions that only had the /fast toggle.
    if (saved?.mode === undefined && saved?.enabled === true) return "fast";
    return "off";
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[pi-fast] Could not read saved state; starting with Fast and Ultrafast off.");
    }
    return "off";
  }
}

export default function fastExtension(pi: ExtensionAPI): void {
  let mode: SpeedMode = "off";

  pi.on("session_start", () => {
    mode = loadMode();
  });

  for (const target of modes) {
    pi.registerCommand(target.command, {
      description: `Toggle ${target.label} mode for supported models`,
      handler: async (args, ctx) => {
        if (args.trim()) {
          ctx.ui.notify(`Usage: /${target.command}`, "warning");
          return;
        }
        const nextMode = mode === target.command ? "off" : target.command;
        const model = ctx.model;
        const modelName = `${model?.provider ?? "current provider"}/${model?.id ?? "model"}`;
        if (nextMode !== "off" && !target.supports(model)) {
          const currentMode = mode === "off" ? "Standard" : mode === "fast" ? "Fast" : "Ultrafast";
          ctx.ui.notify(`${target.label} mode is not supported for ${modelName}. ${currentMode} mode unchanged.`, "warning");
          return;
        }
        mode = nextMode;
        try {
          const path = statePath();
          mkdirSync(dirname(path), { recursive: true });
          writeFileSync(path, `${JSON.stringify({ mode })}\n`, "utf8");
        } catch {
          ctx.ui.notify("Speed mode state could not be saved; this session still works.", "warning");
        }
        ctx.ui.notify(mode === "off" ? "Fast and Ultrafast modes off." : `${target.label} mode requested for ${modelName}.`, "info");
      },
    });
  }

  pi.on("before_provider_request", (event, ctx) => {
    if (mode === "fast") return applyOpenAIFast(ctx.model, event.payload);
    if (mode === "ultrafast") return applyOpenAIUltrafast(ctx.model, event.payload);
  });
}
