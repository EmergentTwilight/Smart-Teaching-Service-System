/**
 * C group load-test seed. Creates deterministic student accounts for
 * course-selection admission pressure tests without deleting existing data.
 *
 * Run inside Docker:
 * pnpm --filter @stss/server exec tsx prisma/seed-c-load.ts
 */
import { CourseStatus, CourseType, Gender, OfferingStatus, PrismaClient, UserStatus } from '@prisma/client'
import IORedis from 'ioredis'

const prisma = new PrismaClient()

const STUDENT_HASH = '$2b$10$VmS5HSLRcNOoEtR3jZ.EwOMCJJ4R/V81UIqQJU3D06tGFjx1n4aiq'
const DEFAULT_USER_COUNT = 200
const DEFAULT_USER_PREFIX = 'cload'
const LOAD_COURSE_50_ID = 'cload-course-capacity-050'
const LOAD_COURSE_200_ID = 'cload-course-capacity-200'
const LOAD_OFFERING_50_ID = 'cload-offering-capacity-050'
const LOAD_OFFERING_200_ID = 'cload-offering-capacity-200'

const readPositiveIntegerEnv = (name: string, fallback: number): number => {
  const raw = process.env[name]
  const value = raw ? Number(raw) : fallback

  return Number.isInteger(value) && value > 0 ? value : fallback
}

const userCount = readPositiveIntegerEnv('C_LOAD_USER_COUNT', DEFAULT_USER_COUNT)
const userPrefix = process.env.C_LOAD_USER_PREFIX || DEFAULT_USER_PREFIX

const loadUsername = (index: number): string =>
  `${userPrefix}${String(index).padStart(3, '0')}`

async function findCourseSelectionContext() {
  const now = new Date()
  const activePeriod = await prisma.selectionPeriod.findFirst({
    where: {
      isActive: true,
      startTime: { lte: now },
      endTime: { gte: now },
    },
    orderBy: [
      { endTime: 'asc' },
      { startTime: 'desc' },
    ],
  })

  if (!activePeriod) {
    throw new Error('No active selection period found. Run a C seed before load-test seed.')
  }

  const curriculumCourse = await prisma.curriculumCourse.findFirst({
    where: {
      course: {
        offerings: {
          some: {
            semesterId: activePeriod.semesterId,
            status: 'OPEN',
          },
        },
      },
    },
    include: {
      curriculum: true,
    },
  })

  const curriculum =
    curriculumCourse?.curriculum ??
    (await prisma.curriculum.findFirst({
      orderBy: { createdAt: 'desc' },
    }))

  if (!curriculum) {
    throw new Error('No curriculum found. Run a C seed before load-test seed.')
  }

  return {
    semesterId: activePeriod.semesterId,
    curriculumId: curriculum.id,
    majorId: curriculum.majorId,
  }
}

async function ensureLoadTestOfferings(context: Awaited<ReturnType<typeof findCourseSelectionContext>>) {
  const teacher = await prisma.teacher.findFirst({
    orderBy: { userId: 'asc' },
  })

  if (!teacher) {
    throw new Error('No teacher found. Run the base seed before load-test seed.')
  }

  const department = await prisma.major.findUnique({
    where: { id: context.majorId },
    select: { departmentId: true },
  })

  await prisma.course.upsert({
    where: { id: LOAD_COURSE_50_ID },
    update: {
      code: 'CLOAD-CAP50',
      name: 'C Load Test Capacity 50',
      credits: 1,
      courseType: CourseType.ELECTIVE,
      departmentId: department?.departmentId,
      status: CourseStatus.ACTIVE,
    },
    create: {
      id: LOAD_COURSE_50_ID,
      code: 'CLOAD-CAP50',
      name: 'C Load Test Capacity 50',
      credits: 1,
      courseType: CourseType.ELECTIVE,
      departmentId: department?.departmentId,
      status: CourseStatus.ACTIVE,
    },
  })

  await prisma.course.upsert({
    where: { id: LOAD_COURSE_200_ID },
    update: {
      code: 'CLOAD-CAP200',
      name: 'C Load Test Capacity 200',
      credits: 1,
      courseType: CourseType.ELECTIVE,
      departmentId: department?.departmentId,
      status: CourseStatus.ACTIVE,
    },
    create: {
      id: LOAD_COURSE_200_ID,
      code: 'CLOAD-CAP200',
      name: 'C Load Test Capacity 200',
      credits: 1,
      courseType: CourseType.ELECTIVE,
      departmentId: department?.departmentId,
      status: CourseStatus.ACTIVE,
    },
  })

  for (const courseId of [LOAD_COURSE_50_ID, LOAD_COURSE_200_ID]) {
    await prisma.curriculumCourse.upsert({
      where: {
        curriculumId_courseId: {
          curriculumId: context.curriculumId,
          courseId,
        },
      },
      update: { courseType: CourseType.ELECTIVE },
      create: {
        curriculumId: context.curriculumId,
        courseId,
        courseType: CourseType.ELECTIVE,
      },
    })
  }

  await prisma.enrollment.deleteMany({
    where: {
      courseOfferingId: {
        in: [LOAD_OFFERING_50_ID, LOAD_OFFERING_200_ID],
      },
    },
  })

  await prisma.courseOffering.upsert({
    where: { id: LOAD_OFFERING_50_ID },
    update: {
      courseId: LOAD_COURSE_50_ID,
      semesterId: context.semesterId,
      teacherId: teacher.userId,
      capacity: 50,
      enrolledCount: 0,
      status: OfferingStatus.OPEN,
    },
    create: {
      id: LOAD_OFFERING_50_ID,
      courseId: LOAD_COURSE_50_ID,
      semesterId: context.semesterId,
      teacherId: teacher.userId,
      capacity: 50,
      enrolledCount: 0,
      status: OfferingStatus.OPEN,
    },
  })

  await prisma.courseOffering.upsert({
    where: { id: LOAD_OFFERING_200_ID },
    update: {
      courseId: LOAD_COURSE_200_ID,
      semesterId: context.semesterId,
      teacherId: teacher.userId,
      capacity: 200,
      enrolledCount: 0,
      status: OfferingStatus.OPEN,
    },
    create: {
      id: LOAD_OFFERING_200_ID,
      courseId: LOAD_COURSE_200_ID,
      semesterId: context.semesterId,
      teacherId: teacher.userId,
      capacity: 200,
      enrolledCount: 0,
      status: OfferingStatus.OPEN,
    },
  })
}

async function main() {
  const context = await findCourseSelectionContext()
  await ensureLoadTestOfferings(context)
  const studentRole = await prisma.role.upsert({
    where: { code: 'student' },
    update: {},
    create: {
      name: 'Student',
      code: 'student',
      description: 'Student role for course-selection load tests',
    },
  })

  for (let index = 1; index <= userCount; index += 1) {
    const username = loadUsername(index)
    const displayNumber = String(index).padStart(3, '0')
    const user = await prisma.user.upsert({
      where: { username },
      update: {
        passwordHash: STUDENT_HASH,
        status: UserStatus.ACTIVE,
      },
      create: {
        username,
        passwordHash: STUDENT_HASH,
        email: `${username}@stss.local`,
        realName: `Load Test Student ${displayNumber}`,
        gender: index % 2 === 0 ? Gender.FEMALE : Gender.MALE,
        status: UserStatus.ACTIVE,
      },
    })

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: studentRole.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: studentRole.id,
      },
    })

    await prisma.student.upsert({
      where: { userId: user.id },
      update: {
        majorId: context.majorId,
        grade: 2024,
        className: 'C-Load',
      },
      create: {
        userId: user.id,
        studentNumber: `CLOAD${String(index).padStart(4, '0')}`,
        majorId: context.majorId,
        grade: 2024,
        className: 'C-Load',
      },
    })

    await prisma.studentCurriculumConfirmation.upsert({
      where: {
        studentId_curriculumId: {
          studentId: user.id,
          curriculumId: context.curriculumId,
        },
      },
      update: { confirmedAt: new Date() },
      create: {
        studentId: user.id,
        curriculumId: context.curriculumId,
        confirmedAt: new Date(),
      },
    })
  }

  if (process.env.C_LOAD_CLEAR_ADMISSION !== '0') {
    const redisUrl = process.env.REDIS_URL
    if (redisUrl) {
      // Use a short-lived client so this seed exits cleanly after clearing stale leases.
      // @ts-expect-error - ioredis ESM typing does not match the runtime default export.
      const redis = new IORedis(redisUrl)
      await redis.del(`course-selection:admission:${context.semesterId}`)
      redis.disconnect()
    }
  }

  console.log('C load-test seed OK')
  console.log(`  users: ${loadUsername(1)}..${loadUsername(userCount)} / student123`)
  console.log(`  semester_id: ${context.semesterId}`)
  console.log(`  curriculum_id: ${context.curriculumId}`)
  console.log(`  capacity_50_offering_id: ${LOAD_OFFERING_50_ID}`)
  console.log(`  capacity_200_offering_id: ${LOAD_OFFERING_200_ID}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
