interface ProxyEnv {
  readonly VITE_AI_PROXY_URL?: string
}

const LOCAL_PROXY_URL = 'http://127.0.0.1:8787/api/ai-story'

export function resolveAiProxyUrl(
  env: ProxyEnv = import.meta.env as ProxyEnv,
): string {
  const configuredUrl = env.VITE_AI_PROXY_URL?.trim() ?? ''
  return configuredUrl.length > 0 ? configuredUrl : LOCAL_PROXY_URL
}
