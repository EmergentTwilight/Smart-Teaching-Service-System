import { Router } from 'express'
import { authMiddleware, requireRoles } from '../../../shared/middleware/auth.js'
import {
  getClassrooms,
  createClassroom,
  getAvailableClassrooms,
  getClassroomById,
  updateClassroom,
} from './classroom.controller.js'

const router: Router = Router() // 显式给 router 加上 : Router 类型

// 所有教室管理接口需登录鉴权
router.use(authMiddleware)

// 路径已经在模块外层定义前缀，这里写子路径
router.get('/', getClassrooms)
router.post('/', requireRoles('admin', 'super_admin'), createClassroom)
router.get('/available', getAvailableClassrooms) // 6.1.5 放在这里
router.get('/:id', getClassroomById) // 6.1.2
router.patch('/:id', requireRoles('admin', 'super_admin'), updateClassroom) // 6.1.4

export default router
