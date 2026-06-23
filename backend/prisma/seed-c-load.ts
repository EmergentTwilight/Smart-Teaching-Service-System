/**
 * C group load-test seed. Creates deterministic student accounts for
 * course-selection admission pressure tests without deleting existing data.
 *
 * Run inside Docker:
 * pnpm --filter @stss/server exec tsx prisma/seed-c-load.ts
 */
import { Gender, PrismaClient, UserStatus } from '@prisma/client'
import IORedis from 'ioredis'

const prisma = new PrismaClient()

const STUDENT_HASH = '$2b$10$VmS5HSLRcNOoEtR3jZ.EwOMCJJ4R/V81UIqQJU3D06tGFjx1n4aiq'
const DEFAULT_USER_COUNT = 200
const DEFAULT_USER_PREFIX = 'cload'

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

async function main() {
  const context = await findCourseSelectionContext()
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
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
