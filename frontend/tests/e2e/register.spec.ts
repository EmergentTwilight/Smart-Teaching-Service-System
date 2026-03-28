import { test, expect } from '@playwright/test'

test.describe('注册功能', () => {
  test('应该显示注册页面', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('heading', { name: '注册账号' })).toBeVisible()
  })

  test('应该能填写注册表单', async ({ page }) => {
    await page.goto('/register')
    await page.fill('input[name="username"]', 'newuser123')
    await page.fill('input[name="email"]', 'newuser123@test.com')
    await page.fill('input[name="realName"]', '新用户')
    await page.fill('input[name="password"]', 'Test1234!')
    await page.fill('input[name="confirmPassword"]', 'Test1234!')
    await expect(page.locator('button[type="submit"]')).toBeEnabled()
  })
})
