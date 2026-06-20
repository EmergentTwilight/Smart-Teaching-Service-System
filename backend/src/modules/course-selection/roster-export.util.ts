/**
 * C4：教师名单 Excel 生成与下载文件名处理（FR-C-28）。
 */
import ExcelJS from 'exceljs'
import type { RosterStudentItem } from './course-selection.types.js'

export async function buildRosterExcelBuffer(students: RosterStudentItem[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('学生名单')

  sheet.columns = [
    { header: '学号', key: 'studentNumber', width: 16 },
    { header: '姓名', key: 'studentName', width: 14 },
    { header: '专业', key: 'majorName', width: 24 },
    { header: '班级', key: 'className', width: 16 },
    { header: '选课状态', key: 'enrollmentStatus', width: 12 },
    { header: '选课时间', key: 'enrolledAt', width: 24 },
  ]

  for (const student of students) {
    sheet.addRow({
      studentNumber: student.studentNumber,
      studentName: student.studentName,
      majorName: student.majorName ?? '',
      className: student.className ?? '',
      enrollmentStatus: student.enrollmentStatus,
      enrolledAt: student.enrolledAt,
    })
  }

  sheet.getRow(1).font = { bold: true }
  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}

export const sanitizeExportFileName = (courseCode: string, semesterName: string): string => {
  const safe = `${courseCode}-${semesterName}-roster`
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/[^\x20-\x7E]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  return `${safe}.xlsx`
}

/** ASCII-only Content-Disposition (Node rejects non-Latin-1 in header values). */
export const buildContentDispositionAttachment = (fileName: string): string => {
  const asciiOnly = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '')
  return `attachment; filename="${asciiOnly}"`
}
