import { createServer } from 'node:http'

import { loadAiServerConfig } from './config'
import { createHttpApp } from './httpApp'

const { port, allowedOrigins } = loadAiServerConfig()
const app = createHttpApp({ allowedOrigins })

createServer(async (request, response) => {
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const result = await app({
    method: request.method ?? 'GET',
    url: request.url ?? '/',
    origin:
      typeof request.headers.origin === 'string'
        ? request.headers.origin
        : undefined,
    body: Buffer.concat(chunks).toString('utf8'),
  })

  response.writeHead(result.status, result.headers)
  response.end(result.body)
}).listen(port, '0.0.0.0')
