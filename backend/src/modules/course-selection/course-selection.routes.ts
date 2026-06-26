import { Router, type Router as RouterType } from 'express'
import { authMiddleware, requireRoles } from '../../shared/middleware/auth.js'
import { validate } from '../../shared/middleware/validate.js'
import { curriculumController } from './curriculum.controller.js'
import { courseSearchController } from './course-search.controller.js'
import { enrollmentController } from './enrollment.controller.js'
import { enrollmentResultsController } from './enrollment-results.controller.js'
import { timetableController } from './timetable.controller.js'
import { rosterController } from './roster.controller.js'
import { selectionPeriodController } from './selection-period.controller.js'
import { aiAdvisorController } from './ai-advisor.controller.js'
import { admissionController } from './admission.controller.js'
import {
  curriculumConfirmationBodySchema,
  curriculumQuerySchema,
  curriculumProgressQuerySchema,
  courseSearchQuerySchema,
  availableOfferingsQuerySchema,
  courseOfferingParamsSchema,
  courseOfferingDetailQuerySchema,
  enrollmentQuerySchema,
  createEnrollmentBodySchema,
  dropEnrollmentParamsSchema,
  dropEnrollmentBodySchema,
  admissionEnterBodySchema,
  admissionLeaseBodySchema,
  selectionPeriodQuerySchema,
  createSelectionPeriodBodySchema,
  updateSelectionPeriodBodySchema,
  selectionPeriodParamsSchema,
  rosterQuerySchema,
  rosterExportQuerySchema,
  rosterOfferingParamsSchema,
  manualEnrollmentLookupQuerySchema,
  manualEnrollmentBodySchema,
  timetableQuerySchema,
  aiRecommendBodySchema,
  aiExplainBodySchema,
} from './course-selection.schemas.js'

const router: RouterType = Router()

// 所有 C 组接口都要求认证
router.use(authMiddleware)

// ===== 学生端：课程与培养方案 =====
router.post(
  '/admission/enter',
  requireRoles('student'),
  validate(admissionEnterBodySchema, 'body'),
  admissionController.enter
)
router.post(
  '/admission/heartbeat',
  requireRoles('student'),
  validate(admissionLeaseBodySchema, 'body'),
  admissionController.heartbeat
)
router.post(
  '/admission/leave',
  requireRoles('student'),
  validate(admissionLeaseBodySchema, 'body'),
  admissionController.leave
)
router.get('/curriculum/me', requireRoles('student'), validate(curriculumQuerySchema, 'query'), curriculumController.getMyCurriculum)
router.post(
  '/curriculum/me/confirmation',
  requireRoles('student'),
  validate(curriculumConfirmationBodySchema, 'body'),
  curriculumController.confirmMyCurriculum
)
router.get(
  '/curriculum/me/progress',
  requireRoles('student'),
  validate(curriculumProgressQuerySchema, 'query'),
  curriculumController.getMyCurriculumProgress
)
router.get('/courses', requireRoles('student', 'teacher', 'admin', 'super_admin'), validate(courseSearchQuerySchema, 'query'), courseSearchController.searchCourses)
router.get('/offerings', requireRoles('student', 'teacher', 'admin', 'super_admin'), validate(courseSearchQuerySchema, 'query'), courseSearchController.listOfferings)
router.get(
  '/offerings/available',
  requireRoles('student'),
  validate(availableOfferingsQuerySchema, 'query'),
  courseSearchController.listAvailableOfferings
)
router.get(
  '/offerings/:id',
  requireRoles('student', 'teacher', 'admin', 'super_admin'),
  validate(courseOfferingParamsSchema, 'params'),
  validate(courseOfferingDetailQuerySchema, 'query'),
  courseSearchController.getOfferingDetail
)
router.get(
  '/enrollments/me',
  requireRoles('student'),
  validate(enrollmentQuerySchema, 'query'),
  enrollmentResultsController.listMyEnrollments
)
router.post(
  '/enrollments',
  requireRoles('student'),
  validate(createEnrollmentBodySchema, 'body'),
  enrollmentController.createEnrollment
)
router.patch(
  '/enrollments/:id/drop',
  requireRoles('student'),
  validate(dropEnrollmentParamsSchema, 'params'),
  validate(dropEnrollmentBodySchema, 'body'),
  enrollmentController.dropEnrollment
)
router.get(
  '/timetable/me/semesters',
  requireRoles('student'),
  timetableController.listMyTimetableSemesters
)
router.get(
  '/timetable/me',
  requireRoles('student'),
  validate(timetableQuerySchema, 'query'),
  timetableController.getMyTimetable
)

// ===== 教师端：名单与导出 =====
router.get(
  '/teacher/offerings/:id/roster',
  requireRoles('teacher'),
  validate(rosterOfferingParamsSchema, 'params'),
  validate(rosterQuerySchema, 'query'),
  rosterController.getOfferingRoster
)
router.get(
  '/teacher/offerings/:id/roster/export',
  requireRoles('teacher'),
  validate(rosterOfferingParamsSchema, 'params'),
  validate(rosterExportQuerySchema, 'query'),
  rosterController.exportOfferingRoster
)

// ===== 教务管理端：阶段与手动加课 =====
router.get(
  '/admin/manual-enrollment/students',
  requireRoles('admin', 'super_admin'),
  validate(manualEnrollmentLookupQuerySchema, 'query'),
  selectionPeriodController.listManualEnrollmentStudents
)
router.get(
  '/admin/manual-enrollment/course-offerings',
  requireRoles('admin', 'super_admin'),
  validate(manualEnrollmentLookupQuerySchema, 'query'),
  selectionPeriodController.listManualEnrollmentCourseOfferings
)
router.get('/admin/periods', requireRoles('admin', 'super_admin'), validate(selectionPeriodQuerySchema, 'query'), selectionPeriodController.listPeriods)
router.post(
  '/admin/periods',
  requireRoles('admin', 'super_admin'),
  validate(createSelectionPeriodBodySchema, 'body'),
  selectionPeriodController.createPeriod
)
router.patch(
  '/admin/periods/:id',
  requireRoles('admin', 'super_admin'),
  validate(selectionPeriodParamsSchema, 'params'),
  validate(updateSelectionPeriodBodySchema, 'body'),
  selectionPeriodController.updatePeriod
)
router.post(
  '/admin/enrollments',
  requireRoles('admin', 'super_admin'),
  validate(manualEnrollmentBodySchema, 'body'),
  selectionPeriodController.manualEnroll
)

// ===== AI 辅助 =====
router.get('/ai-advisor/saved', requireRoles('student'), aiAdvisorController.listSavedRecords)
router.post('/ai-advisor/saved', requireRoles('student'), aiAdvisorController.saveRecord)
router.get('/ai-advisor/saved/:id', requireRoles('student'), aiAdvisorController.getSavedRecord)
router.delete('/ai-advisor/saved/:id', requireRoles('student'), aiAdvisorController.deleteSavedRecord)
router.post('/ai-advisor/recommend', requireRoles('student'), validate(aiRecommendBodySchema, 'body'), aiAdvisorController.recommend)
router.post('/ai-advisor/explain', requireRoles('student'), validate(aiExplainBodySchema, 'body'), aiAdvisorController.explain)

export default router
