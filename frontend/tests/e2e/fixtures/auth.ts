/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect } from '@playwright/test'

/**
 * 认证 Fixtures
 * 提供已登录状态的测试上下文
 */

export const test = base.extend({
  /**
   * 已认证用户 Fixture
   * 自动完成登录流程，提供已登录的 page 上下文
   */
  authenticatedUser: async ({ page }, use) => {
    const username = process.env.E2E_USERNAME || 'admin'
    const password = process.env.E2E_PASSWORD || 'Admin123'

    // 每次都执行登录，确保测试独立性
    await page.goto('/login')
    await page.fill('input[name="username"]', username)
    await page.fill('input[name="password"]', password)
    await page.click('button[type="submit"]')

    // 等待登录成功 - 检查是否离开了登录页
    try {
      // 检查 URL 不再是 /login
      await page.waitForURL(/http:\/\/localhost:5173\/(?!login).*/, { timeout: 15000 })
    } catch (error) {
      // 登录失败时抛出明确错误，而不是静默忽略
      throw new Error(
        `登录失败: 无法跳转。` +
          `请检查 E2E_USERNAME=${username} 和密码是否正确。` +
          `原始错误: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    // 额外等待确保登录完成
    await page.waitForTimeout(1000)

    // 使用已认证的 page
    await use(true)
  },
})

export { expect }
