/**
 * C group manual QA seed data. Repeatable and isolated by the cmanual/CMAN namespace.
 * Command: pnpm --filter @stss/server db:seed:c-manual
 */
import {
  AdminType,
  CourseStatus,
  CourseType,
  EnrollmentStatus,
  Gender,
  OfferingStatus,
  PrismaClient,
  RoomStatus,
  RoomType,
  ScoreStatus,
  SelectionPhase,
  SemesterStatus,
  UserStatus,
} from '@prisma/client'

const prisma = new PrismaClient()

const STUDENT_HASH = '$2b$10$VmS5HSLRcNOoEtR3jZ.EwOMCJJ4R/V81UIqQJU3D06tGFjx1n4aiq'
const TEACHER_HASH = '$2b$10$c6PMdM0nmz2cKLuF666t7uqHCPrwFN2WIFrYBYaw6bbbqi7LA3oPO'
const ADMIN_HASH = '$2b$10$zp7zpWDbhVxVPwEWGMGMMeQd6TU4x8wrX0OGCbGUX5zWac5wAO022'

const DEPARTMENT_ID = 'cmanual-department'
const MAJOR_ID = 'cmanual-major'
const CURRICULUM_ID = 'cmanual-curriculum-2026'
const SEMESTER_ID = 'cmanual-semester-2026-spring'
const PERIOD_ACTIVE_ID = 'cmanual-period-adjustment'
const PERIOD_EXPIRED_ID = 'cmanual-period-expired'

const studentUsernames = Array.from({ length: 6 }, (_, index) =>
  `cstudent${String(index + 1).padStart(2, '0')}`
)
const teacherUsernames = Array.from({ length: 3 }, (_, index) =>
  `cteacher${String(index + 1).padStart(2, '0')}`
)
const courseIds = Array.from({ length: 45 }, (_, index) =>
  `cmanual-course-${String(index + 1).padStart(3, '0')}`
)
const offeringIds = Array.from({ length: 48 }, (_, index) =>
  `cmanual-offering-${String(index + 1).padStart(3, '0')}`
)
const classroomIds = Array.from({ length: 6 }, (_, index) =>
  `cmanual-classroom-${String(index + 1).padStart(2, '0')}`
)
const scheduleIds = Array.from({ length: 32 }, (_, index) =>
  `cmanual-schedule-${String(index + 1).padStart(3, '0')}`
)

const ensureRole = async (code: string, name: string) =>
  prisma.role.upsert({
    where: { code },
    update: {},
    create: { code, name, description: `Manual QA ${name} role` },
  })

const ensureUserRole = async (userId: string, roleId: string) =>
  prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    update: {},
    create: { userId, roleId },
  })

const addDays = (base: Date, days: number) =>
  new Date(base.getTime() + days * 24 * 60 * 60 * 1000)

const courseTypeOf = (index: number) => {
  if (index <= 24) return CourseType.REQUIRED
  if (index <= 38) return CourseType.ELECTIVE
  return CourseType.GENERAL
}

const creditsOf = (index: number) => {
  const pattern = [3, 4, 2]
  return pattern[(index - 1) % pattern.length]
}

const gradePointOf = (score: number) => {
  if (score >= 90) return 4
  if (score >= 85) return 3.7
  if (score >= 80) return 3.3
  if (score >= 75) return 3
  if (score >= 70) return 2.7
  if (score >= 65) return 2.3
  if (score >= 60) return 2
  return 0
}

const letterOf = (score: number) => {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

async function ensureUsers() {
  const studentRole = await ensureRole('student', 'student')
  const teacherRole = await ensureRole('teacher', 'teacher')
  const adminRole = await ensureRole('admin', 'admin')

  const academic = await prisma.user.upsert({
    where: { username: 'academic' },
    update: {
      passwordHash: ADMIN_HASH,
      realName: 'Academic Admin',
      status: UserStatus.ACTIVE,
      deletedAt: null,
    },
    create: {
      username: 'academic',
      passwordHash: ADMIN_HASH,
      email: 'academic@stss.edu',
      realName: 'Academic Admin',
      gender: Gender.MALE,
      status: UserStatus.ACTIVE,
    },
  })
  await ensureUserRole(academic.id, adminRole.id)
  await prisma.admin.upsert({
    where: { userId: academic.id },
    update: { adminType: AdminType.ACADEMIC },
    create: { userId: academic.id, adminType: AdminType.ACADEMIC },
  })

  const students = []
  for (const [index, username] of studentUsernames.entries()) {
    const user = await prisma.user.upsert({
      where: { username },
      update: {
        passwordHash: STUDENT_HASH,
        realName: `C Manual Student ${String(index + 1).padStart(2, '0')}`,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      create: {
        username,
        passwordHash: STUDENT_HASH,
        email: `${username}@stss.edu`,
        realName: `C Manual Student ${String(index + 1).padStart(2, '0')}`,
        gender: index % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        status: UserStatus.ACTIVE,
      },
    })
    await ensureUserRole(user.id, studentRole.id)
    students.push(user)
  }

  const teachers = []
  for (const [index, username] of teacherUsernames.entries()) {
    const user = await prisma.user.upsert({
      where: { username },
      update: {
        passwordHash: TEACHER_HASH,
        realName: `C Manual Teacher ${String(index + 1).padStart(2, '0')}`,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      create: {
        username,
        passwordHash: TEACHER_HASH,
        email: `${username}@stss.edu`,
        realName: `C Manual Teacher ${String(index + 1).padStart(2, '0')}`,
        gender: Gender.OTHER,
        status: UserStatus.ACTIVE,
      },
    })
    await ensureUserRole(user.id, teacherRole.id)
    teachers.push(user)
  }

  return { academic, students, teachers }
}

async function cleanupManualData(studentIds: string[]) {
  await prisma.scoreModificationLog.deleteMany({
    where: { scoreId: { startsWith: 'cmanual-score-' } },
  })
  await prisma.score.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'cmanual-score-' } },
        { studentId: { in: studentIds } },
        { courseOfferingId: { in: offeringIds } },
      ],
    },
  })
  await prisma.studentCurriculumConfirmation.deleteMany({
    where: {
      OR: [
        { studentId: { in: studentIds } },
        { curriculumId: CURRICULUM_ID },
      ],
    },
  })
  await prisma.enrollment.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'cmanual-enrollment-' } },
        { studentId: { in: studentIds } },
        { courseOfferingId: { in: offeringIds } },
      ],
    },
  })
  await prisma.schedule.deleteMany({
    where: {
      OR: [
        { id: { in: scheduleIds } },
        { courseOfferingId: { in: offeringIds } },
        { classroomId: { in: classroomIds } },
      ],
    },
  })
  await prisma.coursePrerequisite.deleteMany({
    where: {
      OR: [
        { courseId: { in: courseIds } },
        { prerequisiteId: { in: courseIds } },
      ],
    },
  })
  await prisma.curriculumCourse.deleteMany({
    where: {
      OR: [
        { curriculumId: CURRICULUM_ID },
        { courseId: { in: courseIds } },
      ],
    },
  })
  await prisma.courseOffering.deleteMany({
    where: { id: { in: offeringIds } },
  })
  await prisma.selectionPeriod.deleteMany({
    where: { id: { in: [PERIOD_ACTIVE_ID, PERIOD_EXPIRED_ID] } },
  })
  await prisma.course.deleteMany({
    where: { id: { in: courseIds } },
  })
  await prisma.curriculum.deleteMany({
    where: { id: CURRICULUM_ID },
  })
  await prisma.classroom.deleteMany({
    where: { id: { in: classroomIds } },
  })
  await prisma.semester.deleteMany({
    where: { id: SEMESTER_ID },
  })
}

async function seedBaseData(
  students: Awaited<ReturnType<typeof ensureUsers>>['students'],
  teachers: Awaited<ReturnType<typeof ensureUsers>>['teachers']
) {
  await prisma.department.upsert({
    where: { id: DEPARTMENT_ID },
    update: {
      code: 'CMAN',
      name: 'C Manual QA Department',
      description: 'Course selection manual QA data',
    },
    create: {
      id: DEPARTMENT_ID,
      code: 'CMAN',
      name: 'C Manual QA Department',
      description: 'Course selection manual QA data',
    },
  })

  await prisma.major.upsert({
    where: { id: MAJOR_ID },
    update: {
      departmentId: DEPARTMENT_ID,
      code: 'CMAN-SE',
      name: 'C Manual Software Engineering',
      totalCredits: 130,
    },
    create: {
      id: MAJOR_ID,
      departmentId: DEPARTMENT_ID,
      code: 'CMAN-SE',
      name: 'C Manual Software Engineering',
      totalCredits: 130,
    },
  })

  for (const [index, student] of students.entries()) {
    await prisma.student.upsert({
      where: { userId: student.id },
      update: {
        majorId: MAJOR_ID,
        grade: 2026,
        className: `CM-${index < 3 ? '1' : '2'}`,
      },
      create: {
        userId: student.id,
        studentNumber: `CMAN2026${String(index + 1).padStart(2, '0')}`,
        majorId: MAJOR_ID,
        grade: 2026,
        className: `CM-${index < 3 ? '1' : '2'}`,
      },
    })
  }

  for (const [index, teacher] of teachers.entries()) {
    await prisma.teacher.upsert({
      where: { userId: teacher.id },
      update: {
        departmentId: DEPARTMENT_ID,
        title: ['Lecturer', 'Associate Professor', 'Professor'][index],
        officeLocation: `Manual Building ${index + 1}01`,
      },
      create: {
        userId: teacher.id,
        teacherNumber: `CMANT${String(index + 1).padStart(3, '0')}`,
        departmentId: DEPARTMENT_ID,
        title: ['Lecturer', 'Associate Professor', 'Professor'][index],
        officeLocation: `Manual Building ${index + 1}01`,
      },
    })
  }

  await prisma.semester.upsert({
    where: { id: SEMESTER_ID },
    update: {
      name: '2026 Spring C Manual QA',
      status: SemesterStatus.CURRENT,
    },
    create: {
      id: SEMESTER_ID,
      name: '2026 Spring C Manual QA',
      startDate: new Date('2026-02-23'),
      endDate: new Date('2026-07-10'),
      status: SemesterStatus.CURRENT,
    },
  })

  for (const [index, classroomId] of classroomIds.entries()) {
    await prisma.classroom.upsert({
      where: { id: classroomId },
      update: {
        building: 'C Manual Building',
        roomNumber: `${201 + index}`,
        campus: 'Main',
        capacity: index % 2 === 0 ? 80 : 48,
        roomType: index % 3 === 0 ? RoomType.LAB : RoomType.LECTURE,
        status: RoomStatus.AVAILABLE,
      },
      create: {
        id: classroomId,
        building: 'C Manual Building',
        roomNumber: `${201 + index}`,
        campus: 'Main',
        capacity: index % 2 === 0 ? 80 : 48,
        roomType: index % 3 === 0 ? RoomType.LAB : RoomType.LECTURE,
        status: RoomStatus.AVAILABLE,
      },
    })
  }
}

async function seedCourses(teachers: Awaited<ReturnType<typeof ensureUsers>>['teachers']) {
  for (let index = 1; index <= courseIds.length; index += 1) {
    const courseId = courseIds[index - 1]
    await prisma.course.upsert({
      where: { id: courseId },
      update: {
        code: `CMAN-${String(index).padStart(3, '0')}`,
        name: `C Manual Course ${String(index).padStart(3, '0')}`,
        credits: creditsOf(index),
        hours: creditsOf(index) * 16,
        courseType: courseTypeOf(index),
        category: index <= 18 ? 'core' : index <= 30 ? 'advanced' : 'general',
        departmentId: DEPARTMENT_ID,
        teacherId: teachers[(index - 1) % teachers.length].id,
        description: `Manual QA course ${index}`,
        assessmentMethod: 'usual 30%, final 70%',
        status: index === 45 ? CourseStatus.ARCHIVED : CourseStatus.ACTIVE,
      },
      create: {
        id: courseId,
        code: `CMAN-${String(index).padStart(3, '0')}`,
        name: `C Manual Course ${String(index).padStart(3, '0')}`,
        credits: creditsOf(index),
        hours: creditsOf(index) * 16,
        courseType: courseTypeOf(index),
        category: index <= 18 ? 'core' : index <= 30 ? 'advanced' : 'general',
        departmentId: DEPARTMENT_ID,
        teacherId: teachers[(index - 1) % teachers.length].id,
        description: `Manual QA course ${index}`,
        assessmentMethod: 'usual 30%, final 70%',
        status: index === 45 ? CourseStatus.ARCHIVED : CourseStatus.ACTIVE,
      },
    })
  }

  await prisma.curriculum.upsert({
    where: { id: CURRICULUM_ID },
    update: {
      majorId: MAJOR_ID,
      name: 'C Manual 2026 Curriculum',
      year: 2026,
      totalCredits: 130,
      requiredCredits: 84,
      electiveCredits: 30,
    },
    create: {
      id: CURRICULUM_ID,
      majorId: MAJOR_ID,
      name: 'C Manual 2026 Curriculum',
      year: 2026,
      totalCredits: 130,
      requiredCredits: 84,
      electiveCredits: 30,
    },
  })

  for (let index = 1; index <= courseIds.length; index += 1) {
    await prisma.curriculumCourse.upsert({
      where: {
        curriculumId_courseId: {
          curriculumId: CURRICULUM_ID,
          courseId: courseIds[index - 1],
        },
      },
      update: {
        courseType: courseTypeOf(index),
        semesterSuggestion: Math.min(8, Math.ceil(index / 6)),
      },
      create: {
        curriculumId: CURRICULUM_ID,
        courseId: courseIds[index - 1],
        courseType: courseTypeOf(index),
        semesterSuggestion: Math.min(8, Math.ceil(index / 6)),
      },
    })
  }

  const prerequisites = [
    [9, 1],
    [10, 2],
    [11, 4],
    [12, 5],
    [13, 7],
    [14, 8],
    [15, 1],
    [15, 4],
    [16, 6],
    [17, 3],
  ]

  for (const [courseIndex, prerequisiteIndex] of prerequisites) {
    await prisma.coursePrerequisite.upsert({
      where: {
        courseId_prerequisiteId: {
          courseId: courseIds[courseIndex - 1],
          prerequisiteId: courseIds[prerequisiteIndex - 1],
        },
      },
      update: {},
      create: {
        courseId: courseIds[courseIndex - 1],
        prerequisiteId: courseIds[prerequisiteIndex - 1],
      },
    })
  }
}

async function seedOfferingsAndSchedules(
  teachers: Awaited<ReturnType<typeof ensureUsers>>['teachers']
) {
  for (let index = 1; index <= offeringIds.length; index += 1) {
    const status =
      index === 46
        ? OfferingStatus.PLANNED
        : index === 47
          ? OfferingStatus.CLOSED
          : OfferingStatus.OPEN
    const capacity = index === 44 ? 2 : 28 + (index % 5) * 6

    await prisma.courseOffering.upsert({
      where: { id: offeringIds[index - 1] },
      update: {
        courseId: courseIds[(index - 1) % courseIds.length],
        semesterId: SEMESTER_ID,
        teacherId: teachers[(index - 1) % teachers.length].id,
        capacity,
        status,
      },
      create: {
        id: offeringIds[index - 1],
        courseId: courseIds[(index - 1) % courseIds.length],
        semesterId: SEMESTER_ID,
        teacherId: teachers[(index - 1) % teachers.length].id,
        capacity,
        status,
      },
    })
  }

  for (let index = 1; index <= scheduleIds.length; index += 1) {
    const isConflictOffering = index === 20
    const dayOfWeek = isConflictOffering ? 1 : ((index - 1) % 5) + 1
    const startPeriod = isConflictOffering ? 1 : ((Math.floor((index - 1) / 5) % 4) * 2) + 1

    await prisma.schedule.upsert({
      where: { id: scheduleIds[index - 1] },
      update: {
        courseOfferingId: offeringIds[index - 1],
        classroomId: classroomIds[(index - 1) % classroomIds.length],
        dayOfWeek,
        startWeek: 1 + ((index - 1) % 3),
        endWeek: 16,
        startPeriod,
        endPeriod: startPeriod + 1,
        notes: index === 20 ? 'Conflicts with cmanual-offering-001' : null,
      },
      create: {
        id: scheduleIds[index - 1],
        courseOfferingId: offeringIds[index - 1],
        classroomId: classroomIds[(index - 1) % classroomIds.length],
        dayOfWeek,
        startWeek: 1 + ((index - 1) % 3),
        endWeek: 16,
        startPeriod,
        endPeriod: startPeriod + 1,
        notes: index === 20 ? 'Conflicts with cmanual-offering-001' : null,
      },
    })
  }
}

async function seedPeriods() {
  const now = new Date()
  await prisma.selectionPeriod.upsert({
    where: { id: PERIOD_ACTIVE_ID },
    update: {
      semesterId: SEMESTER_ID,
      phase: SelectionPhase.ADJUSTMENT,
      startTime: addDays(now, -1),
      endTime: addDays(now, 14),
      maxCredits: 30,
      allowDrop: true,
      isActive: true,
    },
    create: {
      id: PERIOD_ACTIVE_ID,
      semesterId: SEMESTER_ID,
      phase: SelectionPhase.ADJUSTMENT,
      startTime: addDays(now, -1),
      endTime: addDays(now, 14),
      maxCredits: 30,
      allowDrop: true,
      isActive: true,
    },
  })

  await prisma.selectionPeriod.upsert({
    where: { id: PERIOD_EXPIRED_ID },
    update: {
      semesterId: SEMESTER_ID,
      phase: SelectionPhase.FIRST_ROUND,
      startTime: addDays(now, -35),
      endTime: addDays(now, -28),
      maxCredits: 24,
      allowDrop: false,
      isActive: false,
    },
    create: {
      id: PERIOD_EXPIRED_ID,
      semesterId: SEMESTER_ID,
      phase: SelectionPhase.FIRST_ROUND,
      startTime: addDays(now, -35),
      endTime: addDays(now, -28),
      maxCredits: 24,
      allowDrop: false,
      isActive: false,
    },
  })
}

async function seedEnrollmentsAndScores(
  students: Awaited<ReturnType<typeof ensureUsers>>['students'],
  teachers: Awaited<ReturnType<typeof ensureUsers>>['teachers']
) {
  const enrollmentRecords = [
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((offeringIndex) => ({
      studentIndex: 0,
      offeringIndex,
      status: EnrollmentStatus.ENROLLED,
    })),
    { studentIndex: 0, offeringIndex: 14, status: EnrollmentStatus.DROPPED },
    { studentIndex: 0, offeringIndex: 15, status: EnrollmentStatus.DROPPED },
    { studentIndex: 1, offeringIndex: 1, status: EnrollmentStatus.ENROLLED },
    { studentIndex: 1, offeringIndex: 2, status: EnrollmentStatus.ENROLLED },
    { studentIndex: 2, offeringIndex: 1, status: EnrollmentStatus.ENROLLED },
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((offeringIndex) => ({
      studentIndex: 3,
      offeringIndex,
      status: EnrollmentStatus.ENROLLED,
    })),
    { studentIndex: 4, offeringIndex: 17, status: EnrollmentStatus.DROPPED },
    { studentIndex: 4, offeringIndex: 18, status: EnrollmentStatus.ENROLLED },
    { studentIndex: 4, offeringIndex: 44, status: EnrollmentStatus.ENROLLED },
    { studentIndex: 5, offeringIndex: 19, status: EnrollmentStatus.ENROLLED },
    { studentIndex: 5, offeringIndex: 44, status: EnrollmentStatus.ENROLLED },
  ]

  const enrollmentIdByKey = new Map<string, string>()
  for (const [index, record] of enrollmentRecords.entries()) {
    const id = `cmanual-enrollment-${String(index + 1).padStart(3, '0')}`
    const droppedAt = record.status === EnrollmentStatus.DROPPED ? addDays(new Date(), -1) : null
    await prisma.enrollment.upsert({
      where: {
        studentId_courseOfferingId: {
          studentId: students[record.studentIndex].id,
          courseOfferingId: offeringIds[record.offeringIndex - 1],
        },
      },
      update: {
        status: record.status,
        droppedAt,
      },
      create: {
        id,
        studentId: students[record.studentIndex].id,
        courseOfferingId: offeringIds[record.offeringIndex - 1],
        status: record.status,
        droppedAt,
      },
    })
    enrollmentIdByKey.set(`${record.studentIndex}:${record.offeringIndex}`, id)
  }

  const scoreRecords = [
    { studentIndex: 0, offeringIndex: 1, total: 88, status: ScoreStatus.SUBMITTED },
    { studentIndex: 0, offeringIndex: 2, total: 76, status: ScoreStatus.CONFIRMED },
    { studentIndex: 0, offeringIndex: 3, total: 61, status: ScoreStatus.SUBMITTED },
    { studentIndex: 0, offeringIndex: 4, total: 59, status: ScoreStatus.CONFIRMED },
    { studentIndex: 0, offeringIndex: 5, total: 90, status: ScoreStatus.DRAFT },
    { studentIndex: 0, offeringIndex: 6, total: 92, status: ScoreStatus.CONFIRMED },
    { studentIndex: 0, offeringIndex: 7, total: 55, status: ScoreStatus.SUBMITTED },
    { studentIndex: 0, offeringIndex: 8, total: 80, status: ScoreStatus.CONFIRMED },
    { studentIndex: 3, offeringIndex: 1, total: 84, status: ScoreStatus.SUBMITTED },
    { studentIndex: 3, offeringIndex: 2, total: 81, status: ScoreStatus.CONFIRMED },
    { studentIndex: 3, offeringIndex: 3, total: 78, status: ScoreStatus.SUBMITTED },
    { studentIndex: 3, offeringIndex: 4, total: 86, status: ScoreStatus.CONFIRMED },
    { studentIndex: 1, offeringIndex: 1, total: 72, status: ScoreStatus.DRAFT },
  ]

  for (const [index, record] of scoreRecords.entries()) {
    const enrollmentId = enrollmentIdByKey.get(`${record.studentIndex}:${record.offeringIndex}`)
    if (!enrollmentId) continue

    await prisma.score.upsert({
      where: { enrollmentId },
      update: {
        studentId: students[record.studentIndex].id,
        courseOfferingId: offeringIds[record.offeringIndex - 1],
        usualScore: Math.max(0, record.total - 4),
        midtermScore: Math.max(0, record.total - 2),
        finalScore: record.total,
        totalScore: record.total,
        gradePoint: gradePointOf(record.total),
        gradeLetter: letterOf(record.total),
        enteredBy: teachers[0].id,
        enteredAt: new Date(),
        status: record.status,
      },
      create: {
        id: `cmanual-score-${String(index + 1).padStart(3, '0')}`,
        enrollmentId,
        studentId: students[record.studentIndex].id,
        courseOfferingId: offeringIds[record.offeringIndex - 1],
        usualScore: Math.max(0, record.total - 4),
        midtermScore: Math.max(0, record.total - 2),
        finalScore: record.total,
        totalScore: record.total,
        gradePoint: gradePointOf(record.total),
        gradeLetter: letterOf(record.total),
        enteredBy: teachers[0].id,
        enteredAt: new Date(),
        status: record.status,
      },
    })
  }
}

async function seedConfirmations(students: Awaited<ReturnType<typeof ensureUsers>>['students']) {
  const now = new Date()
  const confirmationRecords = [
    { studentIndex: 0, confirmedAt: now },
    { studentIndex: 2, confirmedAt: addDays(now, -30) },
    { studentIndex: 3, confirmedAt: now },
    { studentIndex: 4, confirmedAt: now },
  ]

  for (const record of confirmationRecords) {
    await prisma.studentCurriculumConfirmation.upsert({
      where: {
        studentId_curriculumId: {
          studentId: students[record.studentIndex].id,
          curriculumId: CURRICULUM_ID,
        },
      },
      update: { confirmedAt: record.confirmedAt },
      create: {
        id: `cmanual-confirmation-${record.studentIndex + 1}`,
        studentId: students[record.studentIndex].id,
        curriculumId: CURRICULUM_ID,
        confirmedAt: record.confirmedAt,
      },
    })
  }
}

async function refreshOfferingCounts() {
  for (const offeringId of offeringIds) {
    const count = await prisma.enrollment.count({
      where: { courseOfferingId: offeringId, status: EnrollmentStatus.ENROLLED },
    })
    await prisma.courseOffering.update({
      where: { id: offeringId },
      data: { enrolledCount: count },
    })
  }
}

async function main() {
  const { academic, students, teachers } = await ensureUsers()
  await cleanupManualData(students.map((student) => student.id))
  await seedBaseData(students, teachers)
  await seedCourses(teachers)
  await seedOfferingsAndSchedules(teachers)
  await seedPeriods()
  await seedEnrollmentsAndScores(students, teachers)
  await seedConfirmations(students)
  await refreshOfferingCounts()

  console.log('C manual seed OK')
  console.log('Accounts:')
  console.log('  academic / Admin123')
  console.log('  cstudent01..cstudent06 / student123')
  console.log('  cteacher01..cteacher03 / teacher123')
  console.log('Recommended manual scenarios:')
  console.log('  cstudent01: confirmed curriculum, normal selection, AI context')
  console.log('  cstudent02: curriculum not confirmed')
  console.log('  cstudent03: stale curriculum confirmation')
  console.log('  cstudent04: max credit pressure')
  console.log('Key ids:')
  console.log(`  active period: ${PERIOD_ACTIVE_ID}`)
  console.log('  selectable offering: cmanual-offering-009')
  console.log('  unmet prerequisite offering: cmanual-offering-011')
  console.log('  time conflict offering: cmanual-offering-020')
  console.log('  full offering: cmanual-offering-044')
  console.log('  manual add target: cmanual-offering-021')
  console.log(`  academic user id: ${academic.id}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
