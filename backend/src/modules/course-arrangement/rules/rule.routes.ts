import { Router } from 'express'
import {
  setSchedulingRule,
  getRulesList,
  getRuleById,
  deleteRule,
  batchDeleteRules,
  getSchedulingOverview,
} from './rule.controller.js'

const router: Router = Router()

// 对应文档 6.5.1，添加了 overview 路由用于初始化学期、课程、教室等必需信息
// 移除 validate 中间件，把参数检查任务交给 controller
router.post('/', setSchedulingRule)
router.get('/', getRulesList)
router.get('/overview', getSchedulingOverview)
router.get('/:id', getRuleById)
router.delete('/:id', deleteRule)
router.post('/batch-delete', batchDeleteRules)

export default router
