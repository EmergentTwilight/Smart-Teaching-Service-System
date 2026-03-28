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
    const storageStatePath = '.auth/user.json'
    const username = process.env.E2E_USERNAME || 'admin'
    const password = process.env.E2E_PASSWORD || 'Admin123!'

    // 检查是否已有 storageState
    try {
      // 尝试使用已有的 storageState
      await page.context().storageState({ path: storageStatePath })
    } catch {
      // 没有 storageState，执行登录获取
      await page.goto('/login')
      await page.fill('input[name="username"]', username)
      await page.fill('input[name="password"]', password)
      await page.click('button[type="submit"]')

      // 等待登录成功跳转到 dashboard
      try {
        await page.waitForURL('**/dashboard', { timeout: 15000 })
      } catch (error) {
        // 登录失败时抛出明确错误，而不是静默忽略
        throw new Error(
          `登录失败: 无法跳转到 dashboard 页面。` +
            `请检查 E2E_USERNAME=${username} 和密码是否正确。` +
            `原始错误: ${error instanceof Error ? error.message : String(error)}`
        )
      }

      // 确保登录状态已生效
      await expect(page).toHaveURL(/.*dashboard.*/)

      // 保存 storageState
      await page.context().storageState({ path: storageStatePath })
    }

    // 使用已认证的 page (use 是 Playwright fixture API)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(true)
  },
})

export { expect }
