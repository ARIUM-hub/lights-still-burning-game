export interface AiServerConfig {
  baseUrl: string
  model: string
  apiKey: string
  port: number
  allowedOrigins: string[]
}

const DEFAULT_ALLOWED_ORIGINS = [
  'https://arium-hub.github.io',
  'http://localhost:5173',
]

export function loadAiServerConfig(
  env: NodeJS.ProcessEnv = process.env,
): AiServerConfig {
  const baseUrl = env.AI_BASE_URL?.trim() ?? ''
  const model = env.AI_MODEL?.trim() ?? ''
  const apiKey = env.AI_API_KEY?.trim() ?? ''
  const rawPort = env.PORT?.trim() ?? env.AI_SERVER_PORT?.trim() ?? ''

  if (baseUrl.length === 0 || model.length === 0 || apiKey.length === 0) {
    throw new Error('AI 服务缺少必要配置，请检查服务端环境变量。')
  }

  const parsedPort =
    rawPort.length === 0 ? 8787 : Number.parseInt(rawPort, 10)

  return {
    baseUrl,
    model,
    apiKey,
    port: Number.isFinite(parsedPort) ? parsedPort : 8787,
    allowedOrigins: DEFAULT_ALLOWED_ORIGINS,
  }
}
