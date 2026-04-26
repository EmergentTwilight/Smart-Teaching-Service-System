import { test, expect } from './fixtures/auth'

test.describe('部门管理', () => {
  test('未登录访问部门管理应跳转到登录页', async ({ page }) => {
    await page.goto('/info/departments')

    await expect(page).toHaveURL(/.*login.*/, { timeout: 5000 })
  })

  test('应该能通过菜单进入部门管理页面', async ({ page, authenticatedUser: _ }) => {
    await page.goto('/')

    await page.getByText('基础信息管理').click()
    await page.getByText('部门管理').click()

    await expect(page).toHaveURL(/.*\/info\/departments/)
    await expect(page.locator('.ant-table')).toBeVisible({ timeout: 10000 })
    await expect(page.getByPlaceholder('搜索部门名称或代码')).toBeVisible()
    await expect(page.getByRole('button', { name: /新增部门/ })).toBeVisible()
  })

  test('应该支持部门新建、查看、编辑、搜索和删除', async ({ page, authenticatedUser: _ }) => {
    const suffix = Date.now().toString().slice(-8)
    const code = `E2ED${suffix}`
    const missCode = `E2EM${suffix}`
    const createdName = `E2E部门_${suffix}`
    const missName = `E2E干扰部门_${suffix}`
    const updatedName = `E2E部门_更新_${suffix}`

    await page.goto('/info/departments')
    await expect(page.locator('.ant-table')).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: /新增部门/ }).click()
    await expect(page.locator('.ant-modal:visible')).toContainText('新增部门')

    const modal = page.locator('.ant-modal:visible')
    await modal.getByLabel('部门名称').fill(createdName)
    await modal.getByLabel('部门代码').fill(code)
    await modal.getByLabel('描述').fill('E2E 自动化创建的部门')
    await modal.locator('.ant-modal-footer .ant-btn-primary').click()

    await expect(page.locator('.ant-modal:visible')).toBeHidden({ timeout: 5000 })

    await page.getByRole('button', { name: /新增部门/ }).click()
    await expect(page.locator('.ant-modal:visible')).toContainText('新增部门')
    const missModal = page.locator('.ant-modal:visible')
    await missModal.getByLabel('部门名称').fill(missName)
    await missModal.getByLabel('部门代码').fill(missCode)
    await missModal.getByLabel('描述').fill('E2E 搜索干扰部门')
    await missModal.locator('.ant-modal-footer .ant-btn-primary').click()
    await expect(page.locator('.ant-modal:visible')).toBeHidden({ timeout: 5000 })

    await page.getByPlaceholder('搜索部门名称或代码').fill(code)
    await expect(page.getByRole('cell', { name: code })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('cell', { name: createdName })).toBeVisible()
    await expect(page.getByRole('cell', { name: missCode })).toBeHidden({ timeout: 10000 })

    await page.getByRole('button', { name: /新增部门/ }).click()
    await expect(page.locator('.ant-modal:visible')).toContainText('新增部门')
    const duplicateModal = page.locator('.ant-modal:visible')
    await duplicateModal.getByLabel('部门名称').fill(`E2E重复部门_${suffix}`)
    await duplicateModal.getByLabel('部门代码').fill(code)
    await duplicateModal.getByLabel('描述').fill('E2E 重复代码校验')
    await duplicateModal.locator('.ant-modal-footer .ant-btn-primary').click()
    await expect(page.getByText('部门代码已存在')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.ant-modal:visible')).toContainText('新增部门')
    await page.locator('.ant-modal:visible .ant-modal-close').click()
    await expect(page.locator('.ant-modal:visible')).toBeHidden({ timeout: 5000 })

    const createdRow = page.locator('.ant-table-tbody tr', { hasText: code }).first()
    await createdRow.getByRole('button', { name: /查看/ }).click()
    await expect(page.locator('.ant-modal:visible')).toContainText(createdName)
    await page.locator('.ant-modal:visible .ant-modal-close').click()
    await expect(page.locator('.ant-modal:visible')).toBeHidden({ timeout: 5000 })

    await createdRow.getByRole('button', { name: /编辑/ }).click()
    await expect(page.locator('.ant-modal:visible')).toContainText('编辑部门')

    const editModal = page.locator('.ant-modal:visible')
    await editModal.getByLabel('部门名称').fill(updatedName)
    await editModal.getByLabel('描述').fill('E2E 自动化更新的部门')
    await editModal.locator('.ant-modal-footer .ant-btn-primary').click()

    await expect(page.locator('.ant-modal:visible')).toBeHidden({ timeout: 5000 })
    await expect(page.getByRole('cell', { name: updatedName })).toBeVisible({ timeout: 10000 })

    const updatedRow = page.locator('.ant-table-tbody tr', { hasText: code }).first()
    await updatedRow.getByRole('button', { name: /删除/ }).click()
    await expect(page.locator('.ant-modal:visible')).toContainText('确认删除')
    await page.locator('.ant-modal:visible .ant-modal-footer .ant-btn-primary').click()

    await expect(page.getByRole('cell', { name: code })).toBeHidden({ timeout: 10000 })

    await page.getByPlaceholder('搜索部门名称或代码').fill(missCode)
    await expect(page.getByRole('cell', { name: missCode })).toBeVisible({ timeout: 10000 })
    const missRow = page.locator('.ant-table-tbody tr', { hasText: missCode }).first()
    await missRow.getByRole('button', { name: /删除/ }).click()
    await expect(page.locator('.ant-modal:visible')).toContainText('确认删除')
    await page.locator('.ant-modal:visible .ant-modal-footer .ant-btn-primary').click()
    await expect(page.getByRole('cell', { name: missCode })).toBeHidden({ timeout: 10000 })
  })
})
