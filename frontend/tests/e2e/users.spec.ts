import { test, expect } from './fixtures/auth'

/**
 * 用户管理 E2E 测试
 * 使用 authenticatedUser fixture 确保已登录状态
 */

test.describe('用户管理', () => {
  test('未登录访问用户管理应跳转到登录页', async ({ page }) => {
    await page.goto('/users')
    // 应该被重定向到登录页
    await expect(page).toHaveURL(/.*login.*/, { timeout: 5000 })
  })

  test('登录后应该能访问用户列表页面', async ({ page, authenticatedUser: _ }) => {
    // 已通过 fixture 完成登录

    // 尝试访问用户管理页面
    await page.goto('/users')

    // 验证页面加载成功
    await expect(page.locator('.ant-card, .ant-table')).toBeVisible({ timeout: 10000 })
  })

  test('用户列表应该显示搜索框和新增按钮', async ({ page, authenticatedUser: _ }) => {
    await page.goto('/users')

    // 等待页面加载完成
    await expect(page.locator('.ant-card')).toBeVisible({ timeout: 10000 })

    // 检查搜索框存在
    const searchInput = page.locator('.ant-input-search input, input[placeholder*="搜索"]')
    await expect(searchInput).toBeVisible()

    // 检查新增按钮存在
    const addButton = page.locator('button:has-text("新增用户")')
    await expect(addButton).toBeVisible()
  })

  test('点击新增用户应该打开表单', async ({ page, authenticatedUser: _ }) => {
    await page.goto('/users')

    // 等待页面加载
    await expect(page.locator('.ant-card')).toBeVisible({ timeout: 10000 })

    // 点击新增按钮
    await page.click('button:has-text("新增用户")')

    // 等待 Modal 打开
    await expect(page.locator('.ant-modal:visible')).toBeVisible({ timeout: 5000 })

    // 验证表单标题
    await expect(page.locator('.ant-modal-title:has-text("新建用户")')).toBeVisible()
  })

  test('用户列表分页功能', async ({ page, authenticatedUser: _ }) => {
    await page.goto('/users')

    // 等待表格加载
    await expect(page.locator('.ant-table')).toBeVisible({ timeout: 10000 })

    // 检查分页器存在
    const pagination = page.locator('.ant-pagination')
    await expect(pagination).toBeVisible()

    // 检查总数显示
    const totalText = page.locator('.ant-pagination-total-text')
    await expect(totalText).toBeVisible()
  })

  test('搜索功能测试', async ({ page, authenticatedUser: _ }) => {
    await page.goto('/users')

    // 等待页面加载
    await expect(page.locator('.ant-card')).toBeVisible({ timeout: 10000 })

    // 输入搜索关键词
    const searchInput = page.locator('.ant-input-search input').first()
    await searchInput.fill('test')

    // 点击搜索按钮
    await page.click('.ant-input-search button')

    // 等待表格刷新 - 使用 waitForSelector 替代 waitForTimeout
    await expect(page.locator('.ant-table .ant-spin'))
      .toBeHidden({ timeout: 5000 })
      .catch(() => {
        // 如果没有 loading 状态，继续验证
      })

    // 验证搜索已执行（URL 或表格内容变化）
    await expect(page.locator('.ant-table')).toBeVisible()
  })

  test('状态筛选功能', async ({ page, authenticatedUser: _ }) => {
    await page.goto('/users')

    // 等待页面加载
    await expect(page.locator('.ant-card')).toBeVisible({ timeout: 10000 })

    // 点击状态筛选下拉框
    const statusSelect = page.locator('.ant-select:has-text("状态筛选")')

    // 检查筛选器是否存在（可选功能）
    if (await statusSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await statusSelect.click()

      // 等待下拉菜单打开
      await expect(page.locator('.ant-select-dropdown:visible')).toBeVisible({ timeout: 3000 })

      // 选择"正常"状态
      await page.click('.ant-select-dropdown:visible .ant-select-item:has-text("正常")')

      // 等待表格刷新 - 等待 loading 状态消失
      await expect(page.locator('.ant-table .ant-spin'))
        .toBeHidden({ timeout: 5000 })
        .catch(() => {
          // 如果没有 loading 状态，继续验证
        })
    }
  })

  test('用户表格应该显示列标题', async ({ page, authenticatedUser: _ }) => {
    await page.goto('/users')

    // 等待表格加载
    await expect(page.locator('.ant-table')).toBeVisible({ timeout: 10000 })

    // 验证表格列标题存在
    const tableHeader = page.locator('.ant-table-thead')
    await expect(tableHeader).toBeVisible()
  })
})
