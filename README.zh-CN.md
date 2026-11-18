# pi-fast

在 [Pi](https://pi.dev) 中，用 `/fast` 或 `/ultrafast` 为支持的模型请求加速。命令只改变服务层级，保留当前模型和推理级别。

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

在 Pi 中输入 `/fast` 或 `/ultrafast`，两个命令均不接收参数。Fast 和 Ultrafast 互斥，首次使用**默认关闭**：

开启目标档位前，会检查当前模型和提供商是否支持。不支持时提示，并保持执行命令前的状态，已保存的档位也不改变。例如，当前是 Fast，而模型不支持 Ultrafast，执行 `/ultrafast` 后仍保持 Fast。关闭当前档位始终可以执行。

## 工作方式

开启后，扩展会检查 Pi 的提供商、当前模型和请求中的模型。若请求尚未设置服务层级，Fast 会添加 `service_tier: "priority"`，Ultrafast 会添加 `service_tier: "ultrafast"`。OpenAI 将 `priority` 作为 Fast 模式的兼容别名。其他请求保持原样。扩展不会自行发送网络请求，也不会改动提示词、工具、模型或推理级别。

| 提供商 | Fast 支持的模型 ID | Ultrafast 支持的模型 ID |
| --- | --- | --- |
| `openai`（API Key） | `gpt-5.4`、`gpt-5.4-mini`、`gpt-5.5`、`gpt-5.6-sol`、`gpt-5.6-terra`、`gpt-5.6-luna`、`gpt-6-astra`、`gpt-6.1-sol`、`gpt-6.2-sol`、`gpt-6.2-astra` | `gpt-6-astra`、`gpt-6.1-sol`、`gpt-6.2-sol`、`gpt-6.2-astra` |
| `openai-codex`（ChatGPT 登录） | `gpt-5.4`、`gpt-5.5`、`gpt-5.6-sol`、`gpt-5.6-terra`、`gpt-5.6-luna`、`gpt-6-astra`、`gpt-6-sol`、`gpt-6-luna`、`gpt-6.1-sol`、`gpt-6.2-sol`、`gpt-6.2-astra` | `gpt-6-astra`、`gpt-6.1-sol`、`gpt-6.2-sol`、`gpt-6.2-astra` |

### 注意：已请求 ≠ 已生效

命令通知显示的是本地请求的档位，并非服务端实际采用的层级。OpenAI 可能拒绝请求或降级处理；请通过响应或提供商用量面板确认。其他配置或扩展已设置的服务层级优先，不会被覆盖。

## 参与贡献

欢迎参与！遇到问题或有想法，可以[提交 Issue](https://github.com/wishx127/pi-fast/issues)；准备好改进后，欢迎[发起 Pull Request](https://github.com/wishx127/pi-fast/pulls)。新增模型支持时，请附上提供商对该档位的官方资料，并补充相应测试。

MIT 许可。
