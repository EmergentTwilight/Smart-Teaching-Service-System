// backend/src/modules/course-arrangement/timetable/timetable.controller.ts
import { Request, Response } from 'express'
import { TimetableService } from './timetable.service.js'

const timetableService = new TimetableService()
// 6.3.1 按课程开设查询
export const getByCourseOffering = async (req: Request, res: Response) => {
  try {
    const { courseOfferingId } = req.params
    const data = await timetableService.getByCourseOffering(courseOfferingId as string)
    res.json({ code: 0, message: '查询成功', data })
  } catch {
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
}
// 6.3.2 按教室查询
export const getByClassroom = async (req: Request, res: Response) => {
  try {
    const { classroomId } = req.params
    const { semesterId } = req.query // 从 query 中获取可选的学期 ID
    const data = await timetableService.getByClassroom(classroomId as string, semesterId as string)
    res.json({ code: 0, message: '查询成功', data })
  } catch {
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
}
// 6.3.3 按学期查询
export const getTimetables = async (req: Request, res: Response) => {
  try {
    // 这里的 req.user 视你们认证中间件的实现而定
    const user = req.user!
    const result = await timetableService.getTimetables(req.query, user)
    res.json({ code: 0, message: '查询成功', data: result })
  } catch {
    res.status(500).json({ code: 500, message: '查询失败' })
  }
}

// 6.3.4 导出/打印 (实现文件流返回)
export const exportTimetable = async (req: Request, res: Response) => {
  try {
    const schedules = await timetableService.getExportData(req.query)

    // 生成简单的 CSV 字符串 (实际项目可用 exceljs)
    let csvContent = '\uFEFF周次,星期,节次,课程,教室\n'
    schedules.forEach((s) => {
      const courseName = s.courseOffering.course.name
      const teacherName = (s.courseOffering as any).teacher?.user?.realName || '未指定'
      const location = `${s.classroom.building}${s.classroom.roomNumber}`

      csvContent += `${s.startWeek}-${s.endWeek},${s.dayOfWeek},${s.startPeriod}-${s.endPeriod},${courseName},${teacherName},${location}\n`
    })

    const filename = `timetable_${req.query.targetType}_${Date.now()}.csv`

    // 设置响应头，触发下载
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    return res.status(200).send(csvContent)
  } catch (err) {

    res.status(500).send('导出失败')
  }
}
