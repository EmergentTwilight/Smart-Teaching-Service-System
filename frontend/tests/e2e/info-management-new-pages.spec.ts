import { test, expect } from './fixtures/auth'

test.describe('基础信息管理新增页面', () => {
  test('应该能通过菜单进入角色权限页面并查看角色与权限列表', async ({
    page,
    authenticatedUser: _,
  }) => {
    await page.goto('/')

    await page.getByText('基础信息管理').click()
    await page.getByText('角色权限').click()

    await expect(page).toHaveURL(/.*\/info\/roles/)
    await expect(page.getByRole('tab', { name: '角色管理' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '权限列表' })).toBeVisible()
    await expect(page.getByPlaceholder('搜索角色名称或代码')).toBeVisible()
    await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /新增角色/ })).toBeVisible()

    await page.getByRole('tab', { name: '权限列表' }).click()
    await expect(page.getByPlaceholder('搜索权限名称或代码')).toBeVisible()
    await expect(page.locator('.ant-table').last()).toBeVisible({ timeout: 10000 })
  })

  test('应该能通过菜单进入课程信息页面并看到筛选与操作入口', async ({
    page,
    authenticatedUser: _,
  }) => {
    await page.goto('/')

    await page.getByText('基础信息管理').click()
    await page.getByText('课程信息').click()

    await expect(page).toHaveURL(/.*\/info\/courses/)
    await expect(page.getByPlaceholder('搜索课程名称或代码')).toBeVisible()
    await expect(page.getByText('筛选院系')).toBeVisible()
    await expect(page.getByText('课程类型')).toBeVisible()
    await expect(page.locator('.ant-table')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.ant-pagination')).toBeVisible()
    await expect(page.getByRole('button', { name: /新增课程/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /批量创建/ })).toBeVisible()
  })

  test('应该能通过菜单进入培养方案页面并看到筛选与新增入口', async ({
    page,
    authenticatedUser: _,
  }) => {
    await page.goto('/')

    await page.getByText('基础信息管理').click()
    await page.getByText('培养方案').click()

    await expect(page).toHaveURL(/.*\/info\/curriculums/)
    await expect(page.getByText('筛选专业')).toBeVisible()
    await expect(page.getByPlaceholder('年份')).toBeVisible()
    await expect(page.locator('.ant-table')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.ant-pagination')).toBeVisible()
    await expect(page.getByRole('button', { name: /新增培养方案/ })).toBeVisible()
  })
})
