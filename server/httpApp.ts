import { handleAiStoryRequest } from './aiStoryRoute'

interface HttpRequest {
  method: string
  url: string
  origin?: string
  body: string
}

interface HttpResponse {
  status: number
  headers: Record<string, string>
  body: string
}

interface CreateHttpAppOptions {
  allowedOrigins: string[]
  handleAiStory?: typeof handleAiStoryRequest
}

function createCorsHeaders(
  origin: string | undefined,
  allowedOrigins: string[],
): Record<string, string> {
  const allowOrigin =
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]

  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export function createHttpApp({
  allowedOrigins,
  handleAiStory = handleAiStoryRequest,
}: CreateHttpAppOptions) {
  return async function app(request: HttpRequest): Promise<HttpResponse> {
    const headers = createCorsHeaders(request.origin, allowedOrigins)

    if (request.method === 'OPTIONS') {
      return {
        status: 204,
        headers,
        body: '',
      }
    }

    if (request.url === '/health' && request.method === 'GET') {
      return {
        status: 200,
        headers,
        body: JSON.stringify({ ok: true }),
      }
    }

    if (request.url === '/api/ai-story') {
      const result = await handleAiStory({
        method: request.method,
        body: request.body,
      })

      return {
        status: result.status,
        headers,
        body: result.body,
      }
    }

    return {
      status: 404,
      headers,
      body: JSON.stringify({ error: '接口不存在。' }),
    }
  }
}
