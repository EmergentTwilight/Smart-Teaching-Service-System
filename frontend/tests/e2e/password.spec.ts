import { test, expect } from '@playwright/test'

test.describe('密码找回功能', () => {
  test('应该显示忘记密码页面', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.getByRole('heading', { name: '忘记密码' })).toBeVisible()
  })

  test('应该显示重置密码页面', async ({ page }) => {
    await page.goto('/reset-password?token=test-token')
    await expect(page.getByRole('heading', { name: '重置密码' })).toBeVisible()
  })
})
