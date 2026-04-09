import { Router } from 'express'
import { getByCourseOffering, getByClassroom, getTimetables } from './timetable.controller.js'

const router: Router = Router()

// 注意：静态路径在前，动态路径在后
router.get('/', getTimetables) // 6.3.3
router.get('/course-offerings/:courseOfferingId', getByCourseOffering) // 6.3.1
router.get('/classrooms/:classroomId', getByClassroom) // 6.3.2

export default router
