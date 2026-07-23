import { describe, expect, it } from 'vitest'

import workflowSource from '../../.github/workflows/deploy-pages.yml?raw'

describe('GitHub Pages workflow', () => {
  it('为 build:pages 注入 Railway 代理地址变量', () => {
    expect(workflowSource).toContain(
      'VITE_AI_PROXY_URL: ${{ vars.AI_PROXY_URL }}',
    )
    expect(workflowSource).toContain('run: npm run build:pages')
  })
})
