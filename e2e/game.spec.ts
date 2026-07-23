import { expect, test, type Page } from '@playwright/test'

const APP_ORIGIN = 'http://127.0.0.1:5173'

const routes = [
  {
    endingId: 'train-gone',
    title: '列车已经开走',
    choices: [
      'accept-shift',
      'apologize',
      'say-fine',
      'accept-care',
      'thank-silently',
      'stay-silent',
      'take-rose',
      'ask-time',
      'ignore-phone',
      'run-after-nine',
    ],
  },
  {
    endingId: 'unanswered',
    title: '无人接听',
    choices: [
      'accept-shift',
      'apologize',
      'say-fine',
      'avoid-care',
      'refuse-shoes',
      'withdraw',
      'discard-rose',
      'ask-time',
      'ignore-phone',
      'stay-warehouse',
    ],
  },
  {
    endingId: 'better-person',
    title: '更好的人',
    choices: [
      'ask-reason',
      'protect-self',
      'admit-tired',
      'accept-care',
      'ask-why-shoes',
      'ask-xiaomei',
      'take-rose',
      'say-better-person',
      'send-message',
      'stay-warehouse',
    ],
  },
  {
    endingId: 'platform-divide',
    title: '站台两端',
    choices: [
      'refuse-shift',
      'protect-self',
      'admit-tired',
      'accept-care',
      'thank-silently',
      'stay-silent',
      'take-rose',
      'ask-time',
      'answer-phone',
      'leave-before-nine',
      'question-xiaoshuai',
    ],
  },
  {
    endingId: 'next-city',
    title: '下一座城市',
    choices: [
      'refuse-shift',
      'protect-self',
      'admit-tired',
      'accept-care',
      'ask-why-shoes',
      'ask-xiaomei',
      'take-rose',
      'say-yes',
      'answer-phone',
      'leave-before-nine',
      'trust-and-go',
    ],
  },
] as const

async function clearStorageAndStart(page: Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  const settingsButton = page.getByRole('button', {
    name: '设置',
    exact: true,
  })
  await expect(settingsButton).toBeVisible()
  await settingsButton.click()
  await page
    .getByRole('combobox', { name: '文字速度', exact: true })
    .selectOption('instant')
  await page
    .getByRole('checkbox', { name: '减少动态', exact: true })
    .check()
  await page
    .getByRole('button', { name: '关闭设置', exact: true })
    .click()

  const startButton = page.getByRole('button', {
    name: '开始故事',
    exact: true,
  })
  await expect(startButton).toBeVisible()
  await startButton.click()
}

async function startFromMemory(page: Page) {
  const backButton = page.getByRole('button', {
    name: '返回标题',
    exact: true,
  })
  await expect(backButton).toBeVisible()
  await backButton.click()

  const startButton = page.getByRole('button', {
    name: '开始故事',
    exact: true,
  })
  await expect(startButton).toBeVisible()
  await startButton.click()
}

async function choose(page: Page, choiceId: string) {
  const choice = page.locator(`[data-choice-id="${choiceId}"]`)

  for (let attempt = 0; attempt < 24; attempt += 1) {
    if (await choice.isVisible()) {
      await choice.click()
      return
    }

    const advanceButton = page.getByRole('button', {
      name: '推进剧情',
      exact: true,
    })
    await expect(advanceButton).toBeVisible()
    await advanceButton.click()
  }

  await expect(choice, `未能抵达选择：${choiceId}`).toBeVisible()
  await choice.click()
}

async function reachEnding(
  page: Page,
  route: (typeof routes)[number],
) {
  for (const choiceId of route.choices) {
    await choose(page, choiceId)
  }

  const endingTitle = page.getByRole('heading', {
    name: route.title,
    exact: true,
  })

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await endingTitle.isVisible()) return

    const advanceButton = page.getByRole('button', {
      name: '推进剧情',
      exact: true,
    })
    await expect(advanceButton).toBeVisible()
    await advanceButton.click()
  }

  throw new Error(`未能抵达结局：${route.endingId}`)
}

async function collectEnding(page: Page, title: string) {
  const collectButton = page.getByRole('button', {
    name: '收下这张残票',
    exact: true,
  })
  await expect(collectButton).toBeVisible()
  await collectButton.click()

  await expect(
    page.getByRole('heading', { name: '雨夜回忆', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('article', { name: title, exact: true })).toBeVisible()
}

test('刷新后从同一选择继续且首周目没有回退', async ({ page }) => {
  await clearStorageAndStart(page)
  await choose(page, 'accept-shift')

  await expect(
    page.getByRole('heading', { name: '杯盖没有扣紧', exact: true }),
  ).toBeVisible()
  await page.reload()

  await expect(
    page.getByRole('heading', { name: '杯盖没有扣紧', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: '上一步', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: '回退', exact: true }),
  ).toHaveCount(0)
})

for (const route of routes) {
  test(`真实交互抵达并收藏结局：${route.title}`, async ({ page }) => {
    await clearStorageAndStart(page)
    await reachEnding(page, route)

    await expect(
      page.getByRole('heading', { name: route.title, exact: true }),
    ).toBeVisible()
    await collectEnding(page, route.title)
  })
}

test('离线完成五条路线后解锁全集收藏与隐藏独白', async ({ page }) => {
  test.setTimeout(420_000)
  const externalRequests: string[] = []

  await page.route('**/*', async (requestRoute) => {
    const requestUrl = requestRoute.request().url()

    if (new URL(requestUrl).origin === APP_ORIGIN) {
      await requestRoute.continue()
      return
    }

    externalRequests.push(requestUrl)
    await requestRoute.abort()
  })

  await clearStorageAndStart(page)

  for (const [index, route] of routes.entries()) {
    await reachEnding(page, route)
    await collectEnding(page, route.title)

    if (index < routes.length - 1) {
      await startFromMemory(page)
    }
  }

  await expect(page.getByLabel('已抵达 5 个结局')).toHaveText('5 / 5')
  await expect(
    page.getByText('真正让我失去她的，从来不是那一班列车。', {
      exact: true,
    }),
  ).toBeVisible()
  expect(externalRequests).toEqual([])
})
