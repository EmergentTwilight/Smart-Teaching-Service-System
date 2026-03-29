import { test, expect } from '@playwright/test'

test.describe('登录功能', () => {
  test('应该显示登录页面', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /登录/i })).toBeVisible()
  })

  test('应该显示用户名和密码输入框', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[name="username"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
  })

  test('登录失败应该显示错误', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="username"]', 'wronguser')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // 等待页面响应（可能显示错误消息，或者由于 rate limiting 仍然停留在登录页）
    // 验证页面仍然在登录页或显示了错误消息
    await page.waitForTimeout(2000)

    // 检查是否仍然在登录页（表示登录失败）或显示了错误提示
    const isStillOnLoginPage = page.url().includes('/login')
    const hasErrorMessage = await page
      .locator('.ant-message, .ant-form-item-explain-error, .ant-alert, .ant-message-error')
      .isVisible()
      .catch(() => false)

    // 至少满足一个条件：仍在登录页 或 显示了错误消息
    expect(isStillOnLoginPage || hasErrorMessage).toBeTruthy()
  })

  test('表单验证 - 空用户名', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // 应该显示验证错误
    await expect(page.locator('.ant-form-item-explain-error')).toBeVisible()
  })

  test('表单验证 - 空密码', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="username"]', 'admin')
    await page.click('button[type="submit"]')

    // 应该显示验证错误
    await expect(page.locator('.ant-form-item-explain-error')).toBeVisible()
  })

  test('登录成功应该跳转到首页（Dashboard）', async ({ page }) => {
    const username = process.env.E2E_USERNAME || 'admin'
    const password = process.env.E2E_PASSWORD || 'admin123'

    await page.goto('/login')
    await page.fill('input[name="username"]', username)
    await page.fill('input[name="password"]', password)
    await page.click('button[type="submit"]')

    // 等待登录成功跳转 - 首页就是 Dashboard
    await expect(page).toHaveURL('http://localhost:5173/', { timeout: 15000 })

    // 验证 dashboard 页面元素存在
    await expect(page.locator('.ant-layout-content, .ant-pro-layout-content')).toBeVisible({
      timeout: 5000,
    })
  })
})
