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

    // 等待错误提示出现
    await expect(page.locator('.ant-message-error, .ant-alert-error')).toBeVisible({
      timeout: 5000,
    })
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
})
