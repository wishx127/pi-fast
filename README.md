# pi-fast

Use `/fast` or `/ultrafast` to request faster processing for supported models in [Pi](https://pi.dev). The commands change the service tier while preserving your model and reasoning level.

[简体中文](README.zh-CN.md)

## Quick start

Try it for one Pi run without installing it permanently:

```sh
pi --no-extensions -e npm:@wishx127/pi-fast
```

To install it permanently:

```sh
pi install npm:@wishx127/pi-fast
```

In Pi, type `/fast` or `/ultrafast`. Both commands take no arguments. The modes are mutually exclusive and start **off** by default:

Enabling a mode requires the current model and provider to support it. If unsupported, the command warns you and leaves both the active and saved modes unchanged. For example, requesting Ultrafast on a model that only supports Fast keeps Fast active. Turning off the currently selected mode always works.

## What it does

When enabled, the extension checks the Pi provider, active model, and serialized request model. It adds `service_tier: "priority"` for Fast or `service_tier: "ultrafast"` for Ultrafast before Pi sends the request, unless a tier is already set. OpenAI documents `priority` as the backward-compatible alias for Fast mode. Other requests are unchanged. The extension does not make independent network requests or alter your prompts, tools, model, or reasoning level.

| Provider | Fast model IDs | Ultrafast model IDs |
| --- | --- | --- |
| `openai` (API key) | `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.5`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-6-astra`, `gpt-6.1-sol` | `gpt-6-astra`, `gpt-6.1-sol` |
| `openai-codex` (ChatGPT sign-in) | `gpt-5.4`, `gpt-5.5`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-6-astra`, `gpt-6-sol`, `gpt-6-luna`, `gpt-6.1-sol` | `gpt-6-astra`, `gpt-6.1-sol` |

### Important: requested ≠ delivered

Command notifications report the locally requested mode, not the tier actually used. OpenAI may reject or downgrade a request; check the response or provider usage dashboard. Existing tiers set by other configuration or extensions take precedence.

## Contributing

Contributions are welcome! [Open an issue](https://github.com/wishx127/pi-fast/issues) to report a bug or discuss an idea, or [submit a pull request](https://github.com/wishx127/pi-fast/pulls) with a fix. When adding model support, link the provider's documentation for that mode and include a test.

MIT licensed.
