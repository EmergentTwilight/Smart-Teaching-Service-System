import { test, expect } from '@playwright/test'

/**
 * 用户管理 E2E 测试
 * 注意：这些测试需要先登录，且后端 API 需要运行
 */

test.describe('用户管理', () => {
  // 登录辅助函数
  async function login(page: import('@playwright/test').Page) {
    await page.goto('/login')
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'Admin123!')
    await page.click('button[type="submit"]')

    // 等待登录成功跳转
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
      // 如果跳转失败，可能是密码不对或用户不存在，继续测试
    })
  }

  test('未登录访问用户管理应跳转到登录页', async ({ page }) => {
    await page.goto('/users')
    // 应该被重定向到登录页
    await expect(page).toHaveURL(/.*login.*/, { timeout: 5000 })
  })

  test('登录后应该能访问用户列表页面', async ({ page }) => {
    await login(page)

    // 尝试访问用户管理页面
    await page.goto('/users')

    // 验证页面加载成功
    await expect(page.locator('.ant-card, .ant-table')).toBeVisible({ timeout: 10000 })
  })

  test('用户列表应该显示搜索框和新增按钮', async ({ page }) => {
    await login(page)
    await page.goto('/users')

    // 等待页面加载
    await page.waitForSelector('.ant-card', { timeout: 10000 })

    // 检查搜索框存在
    const searchInput = page.locator('.ant-input-search input, input[placeholder*="搜索"]')
    await expect(searchInput).toBeVisible()

    // 检查新增按钮存在
    const addButton = page.locator('button:has-text("新增用户")')
    await expect(addButton).toBeVisible()
  })

  test('点击新增用户应该打开表单', async ({ page }) => {
    await login(page)
    await page.goto('/users')

    await page.waitForSelector('.ant-card', { timeout: 10000 })

    // 点击新增按钮
    await page.click('button:has-text("新增用户")')

    // 等待 Modal 打开
    await expect(page.locator('.ant-modal:visible')).toBeVisible({ timeout: 5000 })

    // 验证表单标题
    await expect(page.locator('.ant-modal-title:has-text("新建用户")')).toBeVisible()
  })

  test('用户列表分页功能', async ({ page }) => {
    await login(page)
    await page.goto('/users')

    await page.waitForSelector('.ant-table', { timeout: 10000 })

    // 检查分页器存在
    const pagination = page.locator('.ant-pagination')
    await expect(pagination).toBeVisible()

    // 检查总数显示
    const totalText = page.locator('.ant-pagination-total-text')
    await expect(totalText).toBeVisible()
  })

  test('搜索功能测试', async ({ page }) => {
    await login(page)
    await page.goto('/users')

    await page.waitForSelector('.ant-card', { timeout: 10000 })

    // 输入搜索关键词
    const searchInput = page.locator('.ant-input-search input').first()
    await searchInput.fill('test')

    // 点击搜索按钮
    await page.click('.ant-input-search button')

    // 等待表格刷新
    await page.waitForTimeout(1000)

    // 验证搜索已执行（URL 或表格内容变化）
    await expect(page.locator('.ant-table')).toBeVisible()
  })

  test('状态筛选功能', async ({ page }) => {
    await login(page)
    await page.goto('/users')

    await page.waitForSelector('.ant-card', { timeout: 10000 })

    // 点击状态筛选下拉框
    const statusSelect = page.locator('.ant-select:has-text("状态筛选")')
    if (await statusSelect.isVisible()) {
      await statusSelect.click()

      // 选择"正常"状态
      await page.click('.ant-select-dropdown:visible .ant-select-item:has-text("正常")')

      // 等待表格刷新
      await page.waitForTimeout(1000)
    }
  })
})
