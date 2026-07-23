# Railway AI 代理部署说明

## 1. 在 Railway 创建服务

- 从 GitHub 连接仓库 `ARIUM-hub/lights-still-burning-game`
- 选择 Node 服务
- 仓库根目录内已提供 `Dockerfile`，Railway 会优先按它启动 Node AI 代理，而不是把项目识别成纯静态 Vite 站点
- Start Command 填：

```bash
npm run start:server
```

## 2. 配置 Railway 环境变量

```env
AI_BASE_URL=https://你的兼容接口地址/v1
AI_MODEL=你的模型名称
AI_API_KEY=你的密钥
```

`PORT` 由 Railway 自动注入，不需要手动填写。

## 3. 配置 GitHub Pages 构建变量

在 GitHub 仓库 Variables 中新增：

```text
AI_PROXY_URL=https://你的-railway-域名/api/ai-story
```

## 4. 发布与验收

- 推送到 `codex/lights-still-burning-game`
- 等待 `Deploy GitHub Pages` 工作流完成
- 手机打开公开链接并通关
- 进入 AI 故事工坊，输入故事需求后点击 `生成新故事`
