// rule.service.ts
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid' // 记得 pnpm add uuid
import { RuleSaveInput } from './rule.types.js'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const RULES_FILE = path.join(__dirname, '../data/rules.json')

export class RuleService {
  private async readData(): Promise<any[]> {
    try {
      const content = await fs.readFile(RULES_FILE, 'utf-8')
      return JSON.parse(content)
    } catch {
      return [] // 文件不存在或损坏则返回空数组
    }
  }

  async saveRule(input: RuleSaveInput) {
    // 确保目录存在
    await fs.mkdir(path.dirname(RULES_FILE), { recursive: true })

    const allRules = await this.readData()

    // 1. 查找是否已存在针对该 target 的规则
    const existingIndex = allRules.findIndex(
      (r) => r.targetType === input.targetType && r.targetId === input.targetId
    )

    let ruleId: string

    if (existingIndex > -1) {
      // 2. 如果存在，复用旧的 ruleId 并更新内容
      ruleId = allRules[existingIndex].ruleId
      allRules[existingIndex] = {
        ...input,
        ruleId,
        updatedAt: new Date().toISOString(),
      }
    } else {
      // 3. 如果不存在，生成新的 ruleId
      ruleId = `rule-${uuidv4().slice(0, 8)}` // 生成一个短 UUID
      allRules.push({
        ...input,
        ruleId,
        updatedAt: new Date().toISOString(),
      })
    }

    // 4. 写回文件
    await fs.writeFile(RULES_FILE, JSON.stringify(allRules, null, 2))

    return { ruleId }
  }

  // 算法核心：获取所有规则并转换成 Map，方便排课时快速检索
  async getRulesMap() {
    const allRules = await this.readData()
    const map = new Map<string, any>()
    allRules.forEach((r) => {
      // 使用 "teacher:id" 作为 key
      map.set(`${r.targetType}:${r.targetId}`, r.rules)
    })
    return map
  }
}
export const ruleService = new RuleService()
