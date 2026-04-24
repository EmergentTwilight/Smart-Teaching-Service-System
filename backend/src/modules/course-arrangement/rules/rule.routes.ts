import { Router } from 'express'
import { setSchedulingRule, getRulesList, getRuleById, deleteRule, batchDeleteRules, getSchedulingOverview } from './rule.controller.js'
import { validate } from '../../../shared/middleware/validate.js'
import { ruleSaveInputSchema } from './rule.types.js'

const router: Router = Router()

// 对应文档 6.5.1
router.post('/', validate(ruleSaveInputSchema, 'body'), setSchedulingRule)

// 新增以下路由：
router.get('/', getRulesList)                   // 获取规则列表（查询/分页）
router.get('/overview', getSchedulingOverview)  // 概览统计
router.get('/:id', getRuleById)                 // 获取单条规则
router.delete('/:id', deleteRule)               // 删除单条规则
router.post('/batch-delete', batchDeleteRules)  // 批量删除

export default router
