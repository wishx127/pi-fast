# pi-fast

在 [Pi](https://pi.dev) 中，用一条 `/fast` 命令为支持的模型请求快速模式：执行一次开启，再执行一次关闭。不会切换模型、降低推理级别或添加快捷键。

[English](README.md)

## 快速开始

无需永久安装，先在本次 Pi 运行中临时试用：

```sh
pi --no-extensions -e npm:@wishx127/pi-fast
```

永久安装：

```sh
pi install npm:@wishx127/pi-fast
```

在 Pi 中输入 `/fast` 切换。首次使用**默认关闭**；选择会保存在 `<Pi agent dir>/extensions/pi-fast.json`，并在新会话中恢复。通知会提示当前模型是否在支持名单中；切换模型不会重置开关。

如果已有其他扩展注册了 `/fast`，请先停用它，避免命令冲突。

## 工作方式

开启后，扩展会检查 Pi 的提供商、当前模型和请求中的模型。对下表列出的模型，若请求尚未设置服务层级，就会在 Pi 发出请求前添加 `service_tier: "priority"`。OpenAI 将 `priority` 作为新版 Fast 模式名称的兼容别名。其他请求保持原样。扩展不会自行发送网络请求，也不会改动提示词、工具、模型或推理级别。

| 提供商 | 支持的模型 ID |
| --- | --- |
| `openai`（API Key） | `gpt-5.4`、`gpt-5.4-mini`、`gpt-5.5`、`gpt-5.6-sol`、`gpt-5.6-terra`、`gpt-5.6-luna`、`gpt-6-astra`、`gpt-6.1-sol` |
| `openai-codex`（ChatGPT 登录） | `gpt-5.4`、`gpt-5.5`、`gpt-5.6-sol`、`gpt-5.6-terra`、`gpt-5.6-luna`、`gpt-6-astra`、`gpt-6-sol`、`gpt-6-luna`、`gpt-6.1-sol` |

### 注意：已请求 ≠ 已生效

`/fast` 显示的是本地开关状态，并非服务端实际采用的层级。OpenAI 可能拒绝 Fast 请求，或将其降为普通速度；请通过响应或提供商用量面板确认。Fast 在可用时会增加费用，而 Pi 的费用显示可能未计入这种请求参数改写带来的溢价。ChatGPT/Codex 点数计费与 API Key 的按 token 计费不同。参见 [Codex Fast 模式](https://developers.openai.com/codex/speed)和 [OpenAI API Fast 模式](https://developers.openai.com/api/docs/guides/fast-mode)。

## 参与贡献

欢迎参与！遇到问题或有想法，可以[提交 Issue](https://github.com/wishx127/pi-fast/issues)；准备好改进后，欢迎[发起 Pull Request](https://github.com/wishx127/pi-fast/pulls)。新增模型支持时，请附上提供商的 Fast 模式官方资料，并补充相应测试。

MIT 许可。
