import { Router } from 'express'
import {
  getClassrooms,
  createClassroom,
  getAvailableClassrooms,
  getClassroomById,
  updateClassroom,
} from './classroom.controller.js'

const router: Router = Router() // 显式给 router 加上 : Router 类型

// 路径已经在模块外层定义前缀，这里写子路径
router.get('/', getClassrooms)
router.post('/', createClassroom)
router.get('/available', getAvailableClassrooms) // 6.1.5 放在这里
router.get('/:id', getClassroomById) // 6.1.2
router.patch('/:id', updateClassroom) // 6.1.4

export default router
