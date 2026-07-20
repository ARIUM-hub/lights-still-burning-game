/// <reference types="vite/client" />

import { describe, expect, it } from 'vitest'

import indexHtml from '../index.html?raw'

describe('index.html', () => {
  it('允许页面延伸到移动端安全区', () => {
    const document = new DOMParser().parseFromString(indexHtml, 'text/html')
    const viewport = document.querySelector('meta[name="viewport"]')

    expect(viewport?.getAttribute('content')).toContain('viewport-fit=cover')
  })
})
