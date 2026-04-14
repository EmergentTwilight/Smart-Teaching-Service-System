// rule.controller.ts
import { Request, Response } from 'express'
import { ruleService } from './rule.service.js'

// 6.5.1 设置约束规则
export const setSchedulingRule = async (req: Request, res: Response) => {
  try {
    const result = await ruleService.saveRule(req.body)
    return res.status(201).json({
      code: 0,
      message: '约束规则配置成功',
      data: {
        ruleId: result.ruleId,
      },
    })
  } catch {
    return res.status(500).json({ code: 500, message: '配置失败' })
  }
}
