import { describe, expect, it } from 'vitest'
import type { MenuProps } from 'antd'
import { getMenuItemsForRoles } from './menu'

function collectKeys(items: MenuProps['items']): string[] {
  if (!items) return []

  return items.flatMap((item) => {
    if (!item) return []
    const key = 'key' in item && item.key !== undefined ? [String(item.key)] : []
    const children = 'children' in item ? collectKeys(item.children as MenuProps['items']) : []
    return [...key, ...children]
  })
}

describe('getMenuItemsForRoles', () => {
  it('should show student grade pages only to students', () => {
    const keys = collectKeys(getMenuItemsForRoles(['student']))

    expect(keys).toContain('/grade/statistics')
    expect(keys).toContain('/grade/gpa')
    expect(keys).not.toContain('/grade/entry')
    expect(keys).not.toContain('/grade/approval')
  })

  it('should show teacher grade entry and statistics only', () => {
    const keys = collectKeys(getMenuItemsForRoles(['teacher']))

    expect(keys).toContain('/grade/entry')
    expect(keys).toContain('/grade/statistics')
    expect(keys).not.toContain('/grade/gpa')
    expect(keys).not.toContain('/grade/approval')
  })

  it('should show admin statistics and approval without teacher entry', () => {
    const keys = collectKeys(getMenuItemsForRoles(['admin']))

    expect(keys).toContain('/grade/statistics')
    expect(keys).toContain('/grade/approval')
    expect(keys).not.toContain('/grade/entry')
    expect(keys).not.toContain('/grade/gpa')
  })
})
