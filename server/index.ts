import { createServer } from 'node:http'

import { loadAiServerConfig } from './config'
import { handleAiStoryRequest } from './aiStoryRoute'

const { port } = loadAiServerConfig()

createServer(async (request, response) => {
  if (request.url !== '/api/ai-story') {
    response.writeHead(404, {
      'Content-Type': 'application/json; charset=utf-8',
    })
    response.end(JSON.stringify({ error: '接口不存在。' }))
    return
  }

  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const result = await handleAiStoryRequest({
    method: request.method ?? 'GET',
    body: Buffer.concat(chunks).toString('utf8'),
  })

  response.writeHead(result.status, {
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(result.body)
}).listen(port, '127.0.0.1')
