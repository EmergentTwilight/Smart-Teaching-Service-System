import { Router } from 'express'
import { setSchedulingRule } from './rule.controller.js'

const router: Router = Router()

// 对应文档 6.5.1
router.post('/', setSchedulingRule)

export default router
