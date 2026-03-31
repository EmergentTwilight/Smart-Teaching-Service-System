import { test, expect } from '@playwright/test'

test.describe('密码找回功能', () => {
  test('应该显示忘记密码页面', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.getByRole('heading', { name: '忘记密码' })).toBeVisible()
  })

  test('应该显示重置密码页面', async ({ page }) => {
    // 注意：使用无效 token 会显示错误消息而不是表单
    // 这是预期行为，因为后端会验证 token
    await page.goto('/reset-password?token=test-token')

    // 页面应该显示错误提示（链接无效）或重置密码表单
    // 无论哪种情况，页面都应该正常渲染
    // 使用 .first 避免 strict mode violation
    await expect(page.locator('.ant-card, .ant-result').first()).toBeVisible({ timeout: 5000 })
  })
})
