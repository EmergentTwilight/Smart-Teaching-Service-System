/**
 * C4/C5 手动验收用种子数据（可重复执行）。
 * 命令：pnpm --filter @stss/server db:seed:c4c5
 * 产出：scripts/.c4c5-verify-ids.json（勿提交到 Git）
 */
import {
  AdminType,
  CourseType,
  EnrollmentStatus,
  OfferingStatus,
  PrismaClient,
  RoomType,
  SelectionPhase,
  SemesterStatus,
} from '@prisma/client'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const prisma = new PrismaClient()

const IDS_FILE = join(process.cwd(), '..', 'scripts', '.c4c5-verify-ids.json')

const SEMESTER_ID = 'a1000000-0000-4000-8000-000000000001'
const CLASSROOM_ID = 'a1000000-0000-4000-8000-000000000002'
const OWN_OFFERING_ID = 'a1000000-0000-4000-8000-000000000010'
const OTHER_OFFERING_ID = 'a1000000-0000-4000-8000-000000000011'
const SCHEDULE_ID = 'a1000000-0000-4000-8000-000000000020'
const PERIOD_ID = 'a1000000-0000-4000-8000-000000000030'

async function main() {
  const studentUser = await prisma.user.findUnique({ where: { username: 'student' } })
  const teacherUser = await prisma.user.findUnique({ where: { username: 'teacher' } })
  if (!studentUser || !teacherUser) {
    throw new Error('Run db:seed first (student/teacher users missing)')
  }

  await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      studentNumber: '20260001',
      grade: 2026,
      className: 'CS-1',
    },
  })

  await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: {
      userId: teacherUser.id,
      teacherNumber: 'T2026001',
      title: '讲师',
    },
  })

  const teacher2 = await prisma.user.upsert({
    where: { username: 'teacher2' },
    update: {},
    create: {
      username: 'teacher2',
      passwordHash: '$2b$10$c6PMdM0nmz2cKLuF666t7uqHCPrwFN2WIFrYBYaw6bbbqi7LA3oPO',
      email: 'teacher2@stss.edu',
      realName: '测试教师二',
      gender: 'MALE',
      status: 'ACTIVE',
    },
  })
  const teacherRole = await prisma.role.findUnique({ where: { code: 'teacher' } })
  if (teacherRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: teacher2.id, roleId: teacherRole.id } },
      update: {},
      create: { userId: teacher2.id, roleId: teacherRole.id },
    })
  }
  await prisma.teacher.upsert({
    where: { userId: teacher2.id },
    update: {},
    create: {
      userId: teacher2.id,
      teacherNumber: 'T2026002',
      title: '副教授',
    },
  })

  const academicUser = await prisma.user.upsert({
    where: { username: 'academic' },
    update: {},
    create: {
      username: 'academic',
      passwordHash: '$2b$10$zp7zpWDbhVxVPwEWGMGMMeQd6TU4x8wrX0OGCbGUX5zWac5wAO022',
      email: 'academic@stss.edu',
      realName: '教务管理员',
      gender: 'MALE',
      status: 'ACTIVE',
    },
  })
  const adminRole = await prisma.role.findUnique({ where: { code: 'admin' } })
  if (adminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: academicUser.id, roleId: adminRole.id } },
      update: {},
      create: { userId: academicUser.id, roleId: adminRole.id },
    })
  }
  await prisma.admin.upsert({
    where: { userId: academicUser.id },
    update: { adminType: AdminType.ACADEMIC },
    create: { userId: academicUser.id, adminType: AdminType.ACADEMIC },
  })

  const semester = await prisma.semester.upsert({
    where: { id: SEMESTER_ID },
    update: { status: SemesterStatus.CURRENT },
    create: {
      id: SEMESTER_ID,
      name: '2025-2026 春季（验证）',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-07-15'),
      status: SemesterStatus.CURRENT,
    },
  })

  const classroom =
    (await prisma.classroom.findFirst({
      where: { building: '教学楼A', roomNumber: '101' },
    })) ??
    (await prisma.classroom.create({
      data: {
        id: CLASSROOM_ID,
        building: '教学楼A',
        roomNumber: '101',
        campus: '主校区',
        capacity: 80,
        roomType: RoomType.LECTURE,
      },
    }))

  const course = await prisma.course.upsert({
    where: { code: 'CS-C4C5-VERIFY' },
    update: {},
    create: {
      code: 'CS-C4C5-VERIFY',
      name: '智能选课验证课程',
      credits: 3,
      hours: 48,
      courseType: CourseType.REQUIRED,
      teacherId: teacherUser.id,
      status: 'ACTIVE',
    },
  })

  const ownOffering = await prisma.courseOffering.upsert({
    where: { id: OWN_OFFERING_ID },
    update: { status: OfferingStatus.OPEN, enrolledCount: 1 },
    create: {
      id: OWN_OFFERING_ID,
      courseId: course.id,
      semesterId: semester.id,
      teacherId: teacherUser.id,
      capacity: 50,
      enrolledCount: 1,
      status: OfferingStatus.OPEN,
    },
  })

  const otherOffering = await prisma.courseOffering.upsert({
    where: { id: OTHER_OFFERING_ID },
    update: { status: OfferingStatus.OPEN },
    create: {
      id: OTHER_OFFERING_ID,
      courseId: course.id,
      semesterId: semester.id,
      teacherId: teacher2.id,
      capacity: 40,
      enrolledCount: 0,
      status: OfferingStatus.OPEN,
    },
  })

  await prisma.schedule.upsert({
    where: { id: SCHEDULE_ID },
    update: {},
    create: {
      id: SCHEDULE_ID,
      courseOfferingId: ownOffering.id,
      classroomId: classroom.id,
      dayOfWeek: 1,
      startWeek: 1,
      endWeek: 16,
      startPeriod: 1,
      endPeriod: 2,
    },
  })

  await prisma.enrollment.upsert({
    where: {
      studentId_courseOfferingId: {
        studentId: studentUser.id,
        courseOfferingId: ownOffering.id,
      },
    },
    update: { status: EnrollmentStatus.ENROLLED },
    create: {
      studentId: studentUser.id,
      courseOfferingId: ownOffering.id,
      status: EnrollmentStatus.ENROLLED,
      enrolledAt: new Date(),
    },
  })

  const now = new Date()
  const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  await prisma.selectionPeriod.upsert({
    where: { id: PERIOD_ID },
    update: { isActive: true },
    create: {
      id: PERIOD_ID,
      semesterId: semester.id,
      phase: SelectionPhase.FIRST_ROUND,
      startTime: periodStart,
      endTime: periodEnd,
      maxCredits: 30,
      isActive: true,
    },
  })

  const ids = {
    myOfferingId: ownOffering.id,
    otherOfferingId: otherOffering.id,
    academicUser: 'academic',
    academicPass: 'Admin123',
  }
  writeFileSync(IDS_FILE, JSON.stringify(ids, null, 2), 'utf8')

  console.log('✅ C4/C5 verify seed OK')
  console.log('   academic / Admin123 (教务 ACADEMIC)')
  console.log('   teacher2 / teacher123')
  console.log('   offering (own):', ownOffering.id)
  console.log('   offering (other):', otherOffering.id)
  console.log('   ids file:', IDS_FILE)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
