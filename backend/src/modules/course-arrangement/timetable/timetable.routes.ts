// backend/src/modules/course-arrangement/timetable/timetable.routes.ts
import { Router } from 'express'
import {
  getByCourseOffering,
  getByClassroom,
  getTimetables,
  exportTimetable,
} from './timetable.controller.js'

const router: Router = Router()

// 1. 综合查询 (6.3.3)
router.get('/', getTimetables)

// 2. 导出接口 (6.3.4) - 必须放在变量路由前面
router.get('/export', exportTimetable)

// 3. 按课程开设查询 (6.3.1)
router.get('/course-offerings/:courseOfferingId', getByCourseOffering)

// 4. 按教室查询 (6.3.2)
router.get('/classrooms/:classroomId', getByClassroom)

export default router
