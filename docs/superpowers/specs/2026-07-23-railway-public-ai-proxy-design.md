# 《灯火未熄》Railway 公网 AI 代理部署设计

## 目标

在保留现有 GitHub Pages 公开游戏链接不变的前提下，把 AI 故事工坊从“只能依赖本地 Node 代理”升级为“所有手机用户都可通过公网 AI 服务生成新故事”的方案。

本次设计的核心目标有四点：

1. 玩家继续通过现有 GitHub Pages 链接游玩《灯火未熄》。
2. 通关后进入 AI 故事工坊时，不再依赖用户自己在电脑上启动本地服务。
3. `AI_API_KEY` 仍只保存在服务端环境变量中，不暴露到浏览器。
4. 前端构建时写入固定 Railway 公网地址，其他手机用户无需再填写任何接口配置即可生成新故事。

## 选定方案

采用“GitHub Pages 前端 + Railway 公网 Node 代理”的双端部署方案。

具体而言：

- 前端继续使用现有 Vite 构建产物，并发布到 GitHub Pages。
- 后端继续复用当前仓库里的 `server/` 目录逻辑，部署到 Railway。
- 前端不再写死 `http://127.0.0.1:8787/api/ai-story`，而是在构建时注入固定的 Railway 公网地址。

相比继续要求用户自己在本地启动代理，这个方案可以直接覆盖“其他人的手机如何使用”这一真实需求。相比把整个前后端都迁移到 Railway，这个方案对现有公开链接影响最小，也能保留已经稳定的 GitHub Pages 发布流程。

## 整体架构

整体请求流调整为：

`手机浏览器 -> GitHub Pages 前端 -> Railway AI 代理 -> 上游模型供应商`

各层职责如下：

- GitHub Pages 前端
  - 承载原作故事、命名流程、AI 工坊入口、生成故事试玩和最近生成缓存。
  - 只负责提交“故事需求、主角名字、整体基调”等故事相关字段。

- Railway AI 代理
  - 接收 `POST /api/ai-story`
  - 读取 Railway 环境变量中的模型配置
  - 请求上游 OpenAI 兼容接口
  - 解析并校验返回故事结构
  - 以标准 `GeneratedStory` JSON 返回前端

- 上游模型供应商
  - 提供兼容 `chat/completions` 的文本生成能力

该架构下，前端不再区分“本地代理”与“公网代理”的业务差异，只关心是否收到合法故事 JSON。

## 前端改造

### 请求地址改造

前端将不再把 AI 请求地址硬编码为本地地址，而是改为在构建时读取固定环境变量，例如：

`VITE_AI_PROXY_URL=https://your-railway-service.up.railway.app/api/ai-story`

GitHub Pages 构建产物中写入的是最终固定地址，因此所有打开公开链接的用户都会请求同一个 Railway 代理服务。

本次不采用运行时动态下发配置，也不让用户在浏览器里自行输入代理地址，避免增加理解成本和配置入口。

### AI 工坊界面

AI 工坊继续保留以下输入项：

- `主角名字`
- `整体基调`
- `故事需求`

以下敏感配置输入项继续保持移除状态：

- `API 基础地址`
- `模型名称`
- `API Key`

### 提示文案调整

AI 工坊顶部提示应从“需要先启动本地 AI 服务”改为更适合公网方案的表达，例如：

- 常态提示：`生成新故事后可直接开始试玩。`
- 服务不可达或网络错误时：`AI 故事服务暂时不可用，请稍后再试。`

如果 Railway 后端返回了更具体的中文错误，前端继续直接显示后端返回值。

## 后端改造

后端继续保留现有 `server/` 结构：

```text
server/
├── index.ts
├── config.ts
├── aiStoryRoute.ts
└── aiClient.ts
```

但需要补齐 Railway 可部署能力。

### 监听地址与端口

当前服务只监听 `127.0.0.1`，仅适合本机访问。部署到 Railway 后需要改为：

- 监听地址：`0.0.0.0`
- 优先读取平台注入的 `PORT`
- 本地开发缺少 `PORT` 时再回退到 `8787`

这能保证服务在本地和 Railway 环境下都可正常启动。

### CORS

因为前端部署在 GitHub Pages，后端部署在 Railway，不同源之间的请求必须显式允许。

建议后端只放行以下来源：

- `https://arium-hub.github.io`
- `http://localhost:5173`

同时支持 `OPTIONS` 预检请求，并返回必要的 CORS 头：

- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Methods`
- `Access-Control-Allow-Headers`

本次不采用 `*` 全开放策略，尽量减少被其他站点随意调用的风险。

### 健康检查

新增一个轻量接口：

`GET /health`

返回示例：

```json
{
  "ok": true
}
```

它的用途是：

- Railway 部署后快速确认服务是否存活
- 后续排查“前端不可用”时，先分辨是代理挂了还是上游模型有问题

### 核心业务接口

继续保留：

`POST /api/ai-story`

前端提交的请求体不变：

```json
{
  "brief": "故事需求",
  "protagonistName": "主角名字",
  "tone": "整体基调"
}
```

服务端成功后仍直接返回 `GeneratedStory` JSON，保证前端故事播放器逻辑无需重写。

## 环境变量与 Railway 配置

Railway 侧最小环境变量如下：

```env
AI_BASE_URL=https://你的兼容接口地址/v1
AI_MODEL=你的模型名称
AI_API_KEY=你的密钥
```

说明如下：

- `AI_BASE_URL`：上游 OpenAI 兼容接口基础地址
- `AI_MODEL`：统一使用的模型名
- `AI_API_KEY`：只保存在 Railway 后端
- `PORT`：由 Railway 自动注入，不要求手动填写

本地开发仍可继续使用 `.env.local`，与 Railway 的环境变量含义保持一致。

## GitHub Pages 构建策略

公开站点仍由 GitHub Actions 执行 `npm run build:pages` 后发布到 GitHub Pages。

本次需要补充的能力是：在 Pages 构建时注入固定的 `VITE_AI_PROXY_URL`，让构建产物中的 AI 工坊自动指向 Railway 公网地址。

因此发布流程会拆成两个独立维度：

- GitHub Pages：负责页面静态资源
- Railway：负责 AI 公网代理

只要 Railway 域名不变，后续游戏内容继续更新时无需让用户重新配置任何东西。

## 错误处理

### 前端错误

前端优先显示用户能理解的中文提示：

- 代理网络不可达、域名无响应、跨域失败
  - `AI 故事服务暂时不可用，请稍后再试。`

- 后端返回业务错误
  - 直接显示后端返回的 `error`

### 后端错误

后端继续把错误转换成统一中文文本，包括：

- 缺少环境变量
  - `AI 服务缺少必要配置，请检查服务端环境变量。`

- 上游 HTTP 失败
  - `AI 请求失败（HTTP xxx）：...`

- 上游返回为空或无可读内容
  - `AI 没有返回可解析的故事内容。`

- 上游返回不是合法 JSON
  - `AI 返回的内容不是合法 JSON。`

- 上游故事结构不合法
  - `AI 返回的故事结构无效：...`

- 未知异常
  - `生成故事时发生未知错误。`

## 测试与验收

### 前端测试

- AI 工坊页面仍不显示 `API 基础地址 / 模型名称 / API Key`
- 生成故事时请求构建注入的代理地址，而不是 `127.0.0.1`
- 网络错误时显示公网服务不可用提示

### 后端测试

- 端口优先读取 `PORT`，回退到本地默认端口
- 允许 `https://arium-hub.github.io` 与 `http://localhost:5173` 的跨域访问
- `OPTIONS` 预检请求返回正确状态与头部
- `GET /health` 返回成功
- `POST /api/ai-story` 继续覆盖原有成功与失败路径

### 回归验证

- `npm test`
- `npm run build`
- `npm run build:pages`

如果进入实际部署阶段，还需要补一次手动验收：

- Railway 服务部署成功并获得稳定公网地址
- GitHub Pages 构建产物已指向该地址
- 使用手机打开公开链接，通关后可真实生成新故事

## 不在本次范围内

- 多 Railway 环境切换
- 多模型轮询
- 用户级配额、登录或鉴权系统
- 接口限流与风控后台
- 供应商自动熔断切换
- 把整个前后端都迁移到 Railway

本次只聚焦于“让其他人的手机也能通过公开页面调用同一个公网 AI 服务”。
