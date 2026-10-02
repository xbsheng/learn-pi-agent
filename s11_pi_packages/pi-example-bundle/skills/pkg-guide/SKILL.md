---
name: pkg-guide
description: 演示 pi package 内自带的 skill。当用户问「这个包能做什么」或提到 pi-example-bundle 时使用。
---

# pi-example-bundle 使用说明

这个包包含三样东西：

1. **扩展** `extensions/hello.ts` —— 注册了 `pkg_time` 工具和 `/pkg-hello` 命令。
2. **Skill** 就是你正在读的这个文件。
3. **Prompt 模板** `/pkg-check`。

安装后：

```bash
pi install ./pi-example-bundle
pi -p "现在几点？"          # 模型可以调用 pkg_time
/pkg-hello 你好              # 触发命令
/pkg-check                   # 展开模板
```
