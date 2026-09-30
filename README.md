# pi-fast

One `/fast` command to request Fast mode for supported models in [Pi](https://pi.dev). Toggle it on, toggle it off. No model switch, lower reasoning setting, or extra shortcut.

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

In Pi, type `/fast` to toggle. It starts **off** by default. The last choice is saved in `<Pi agent dir>/extensions/pi-fast.json` and restored in new sessions. The notification tells you whether the current model is eligible; switching models does not reset the toggle.

If another extension already registers `/fast`, disable it before installing this one to avoid a command conflict.

## What it does

When enabled, the extension checks the Pi provider, active model, and serialized request model. For models listed below, it adds a fast service tier before Pi sends the request, unless a tier is already set: `service_tier: "priority"` for existing models and `service_tier: "fast"` for `gpt-6.1-sol`. OpenAI documents `priority` as the backward-compatible alias for the newer Fast mode name. Other requests are unchanged. It does not make independent network requests or alter your prompts, tools, model, or reasoning level.

| Provider | Eligible model IDs |
| --- | --- |
| `openai` (API key) | `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.5`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-6-astra`, `gpt-6.1-sol` |
| `openai-codex` (ChatGPT sign-in) | `gpt-5.4`, `gpt-5.5`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-6-astra`, `gpt-6-sol`, `gpt-6-luna`, `gpt-6.1-sol` |

### Important: requested ≠ delivered

`/fast` reports your local toggle, not the tier actually used. OpenAI may decline or downgrade a Fast request; check the response or provider usage dashboard. Fast costs more where available, and Pi's cost display may not include the premium from this request-payload change. ChatGPT/Codex credits and API-key token billing are different. See [Codex Fast mode](https://developers.openai.com/codex/speed) and [OpenAI API Fast mode](https://developers.openai.com/api/docs/guides/fast-mode).

## Contributing

Contributions are welcome! [Open an issue](https://github.com/wishx127/pi-fast/issues) to report a bug or discuss an idea, or [submit a pull request](https://github.com/wishx127/pi-fast/pulls) with a fix. When adding model support, link the provider's Fast-mode documentation and include a test.

MIT licensed.
