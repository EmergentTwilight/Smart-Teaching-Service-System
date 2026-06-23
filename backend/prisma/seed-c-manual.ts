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
const HISTORY_SEMESTER_ID = 'cmanual-semester-2025-fall'
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
const historicalOfferingIds = Array.from({ length: 12 }, (_, index) =>
  `cmanual-history-offering-${String(index + 1).padStart(3, '0')}`
)
const classroomIds = Array.from({ length: 6 }, (_, index) =>
  `cmanual-classroom-${String(index + 1).padStart(2, '0')}`
)
const scheduleIds = Array.from({ length: 32 }, (_, index) =>
  `cmanual-schedule-${String(index + 1).padStart(3, '0')}`
)

const courseCatalog = [
  {
    code: 'CMAN-CS101',
    name: 'Introduction to Programming',
    credits: 4,
    type: CourseType.REQUIRED,
    category: 'programming foundation',
    semester: 1,
    description: 'Python-based computational thinking, control flow, functions, and basic testing.',
  },
  {
    code: 'CMAN-CS102',
    name: 'Object-Oriented Programming',
    credits: 4,
    type: CourseType.REQUIRED,
    category: 'programming foundation',
    semester: 2,
    description: 'Object-oriented design, Java programming, interfaces, inheritance, and unit testing.',
  },
  {
    code: 'CMAN-MATH101',
    name: 'Calculus I',
    credits: 4,
    type: CourseType.REQUIRED,
    category: 'mathematics',
    semester: 1,
    description: 'Limits, derivatives, integrals, and mathematical modeling for computing students.',
  },
  {
    code: 'CMAN-MATH102',
    name: 'Linear Algebra',
    credits: 3,
    type: CourseType.REQUIRED,
    category: 'mathematics',
    semester: 2,
    description: 'Vectors, matrices, linear transformations, eigenvalues, and applications in computing.',
  },
  {
    code: 'CMAN-CS103',
    name: 'Discrete Mathematics',
    credits: 3,
    type: CourseType.REQUIRED,
    category: 'mathematics',
    semester: 2,
    description: 'Logic, sets, induction, combinatorics, graphs, and proof techniques.',
  },
  {
    code: 'CMAN-CS201',
    name: 'Data Structures',
    credits: 4,
    type: CourseType.REQUIRED,
    category: 'computer science core',
    semester: 3,
    description: 'Lists, trees, graphs, hash tables, asymptotic analysis, and implementation tradeoffs.',
  },
  {
    code: 'CMAN-CS202',
    name: 'Computer Organization',
    credits: 4,
    type: CourseType.REQUIRED,
    category: 'computer systems',
    semester: 3,
    description: 'Instruction sets, memory hierarchy, assembly basics, and processor organization.',
  },
  {
    code: 'CMAN-STAT201',
    name: 'Probability and Statistics',
    credits: 3,
    type: CourseType.REQUIRED,
    category: 'mathematics',
    semester: 3,
    description: 'Probability models, random variables, estimation, and statistical reasoning.',
  },
  {
    code: 'CMAN-CS203',
    name: 'Software Construction',
    credits: 3,
    type: CourseType.REQUIRED,
    category: 'software engineering',
    semester: 3,
    description: 'Version control, modular design, testing, documentation, and maintainable code.',
  },
  {
    code: 'CMAN-CS301',
    name: 'Algorithms',
    credits: 4,
    type: CourseType.REQUIRED,
    category: 'computer science core',
    semester: 4,
    description: 'Greedy algorithms, divide and conquer, dynamic programming, graph algorithms, and complexity.',
  },
  {
    code: 'CMAN-CS302',
    name: 'Operating Systems',
    credits: 4,
    type: CourseType.REQUIRED,
    category: 'computer systems',
    semester: 5,
    description: 'Processes, threads, scheduling, virtual memory, file systems, and synchronization.',
  },
  {
    code: 'CMAN-CS303',
    name: 'Database Systems',
    credits: 3,
    type: CourseType.REQUIRED,
    category: 'data systems',
    semester: 4,
    description: 'Relational modeling, SQL, indexing, transactions, query processing, and normalization.',
  },
  {
    code: 'CMAN-CS304',
    name: 'Computer Networks',
    credits: 3,
    type: CourseType.REQUIRED,
    category: 'computer systems',
    semester: 4,
    description: 'Layered network architecture, routing, transport protocols, congestion control, and security basics.',
  },
  {
    code: 'CMAN-CS305',
    name: 'Software Engineering',
    credits: 3,
    type: CourseType.REQUIRED,
    category: 'software engineering',
    semester: 4,
    description: 'Requirements, architecture, agile delivery, testing strategy, and team project practices.',
  },
  {
    code: 'CMAN-CS306',
    name: 'Theory of Computation',
    credits: 3,
    type: CourseType.REQUIRED,
    category: 'theory',
    semester: 5,
    description: 'Automata, computability, reductions, and complexity classes.',
  },
  {
    code: 'CMAN-CS307',
    name: 'Compilers',
    credits: 3,
    type: CourseType.REQUIRED,
    category: 'computer systems',
    semester: 6,
    description: 'Lexing, parsing, semantic analysis, optimization, and code generation.',
  },
  {
    code: 'CMAN-CS308',
    name: 'Artificial Intelligence',
    credits: 3,
    type: CourseType.REQUIRED,
    category: 'ai and data',
    semester: 5,
    description: 'Search, planning, knowledge representation, reasoning under uncertainty, and learning basics.',
  },
  {
    code: 'CMAN-CS309',
    name: 'Machine Learning',
    credits: 3,
    type: CourseType.ELECTIVE,
    category: 'ai and data',
    semester: 6,
    description: 'Supervised learning, model evaluation, regularization, neural networks, and responsible deployment.',
  },
  {
    code: 'CMAN-CS310',
    name: 'Low-Level Systems Programming',
    credits: 3,
    type: CourseType.REQUIRED,
    category: 'computer systems',
    semester: 4,
    description: 'C programming, memory layout, pointers, debugging, and systems-level performance.',
  },
  {
    code: 'CMAN-CS311',
    name: 'Web Application Development',
    credits: 2,
    type: CourseType.ELECTIVE,
    category: 'software engineering',
    semester: 4,
    description: 'Modern web frontends, HTTP APIs, state management, and deployment basics.',
  },
  {
    code: 'CMAN-CS401',
    name: 'Distributed Systems',
    credits: 3,
    type: CourseType.ELECTIVE,
    category: 'computer systems',
    semester: 6,
    description: 'Replication, consensus, fault tolerance, distributed storage, and service reliability.',
  },
  {
    code: 'CMAN-CS402',
    name: 'Computer Security',
    credits: 3,
    type: CourseType.ELECTIVE,
    category: 'computer systems',
    semester: 6,
    description: 'Threat models, cryptography basics, secure systems, web security, and incident response.',
  },
  {
    code: 'CMAN-CS403',
    name: 'Cloud Computing',
    credits: 3,
    type: CourseType.ELECTIVE,
    category: 'computer systems',
    semester: 6,
    description: 'Virtualization, containers, orchestration, cloud storage, and scalable service design.',
  },
  {
    code: 'CMAN-CS404',
    name: 'Parallel Computing',
    credits: 3,
    type: CourseType.ELECTIVE,
    category: 'computer systems',
    semester: 7,
    description: 'Parallel algorithms, shared-memory programming, GPU basics, and performance analysis.',
  },
  {
    code: 'CMAN-CS405',
    name: 'Data Mining',
    credits: 3,
    type: CourseType.ELECTIVE,
    category: 'ai and data',
    semester: 5,
    description: 'Data preprocessing, clustering, association analysis, classification, and pattern discovery.',
  },
  {
    code: 'CMAN-CS406',
    name: 'Natural Language Processing',
    credits: 3,
    type: CourseType.ELECTIVE,
    category: 'ai and data',
    semester: 6,
    description: 'Language modeling, embeddings, sequence models, information extraction, and evaluation.',
  },
  {
    code: 'CMAN-CS407',
    name: 'Computer Vision',
    credits: 3,
    type: CourseType.ELECTIVE,
    category: 'ai and data',
    semester: 6,
    description: 'Image formation, features, detection, segmentation, and neural vision models.',
  },
  {
    code: 'CMAN-CS408',
    name: 'Human-Computer Interaction',
    credits: 2,
    type: CourseType.ELECTIVE,
    category: 'software engineering',
    semester: 5,
    description: 'User research, prototyping, usability evaluation, accessibility, and interaction design.',
  },
  {
    code: 'CMAN-CS409',
    name: 'Computer Graphics',
    credits: 3,
    type: CourseType.ELECTIVE,
    category: 'graphics',
    semester: 5,
    description: 'Rendering pipeline, geometry, shading, transformations, and interactive graphics.',
  },
  {
    code: 'CMAN-CS410',
    name: 'Mobile Application Development',
    credits: 2,
    type: CourseType.ELECTIVE,
    category: 'software engineering',
    semester: 5,
    description: 'Mobile UI, local persistence, networked apps, platform constraints, and release workflows.',
  },
  {
    code: 'CMAN-CS411',
    name: 'Software Testing and Quality',
    credits: 2,
    type: CourseType.ELECTIVE,
    category: 'software engineering',
    semester: 5,
    description: 'Test design, coverage, integration testing, CI, mutation testing, and quality metrics.',
  },
  {
    code: 'CMAN-CS412',
    name: 'Information Retrieval',
    credits: 3,
    type: CourseType.ELECTIVE,
    category: 'ai and data',
    semester: 6,
    description: 'Indexing, ranking, search evaluation, recommendation, and retrieval-augmented applications.',
  },
  {
    code: 'CMAN-CS413',
    name: 'Robotics',
    credits: 3,
    type: CourseType.ELECTIVE,
    category: 'ai and systems',
    semester: 7,
    description: 'Sensors, kinematics, planning, control, and robot software architecture.',
  },
  {
    code: 'CMAN-CS414',
    name: 'Blockchain Systems',
    credits: 2,
    type: CourseType.ELECTIVE,
    category: 'computer systems',
    semester: 7,
    description: 'Consensus protocols, smart contracts, distributed ledgers, and security tradeoffs.',
  },
  {
    code: 'CMAN-CS415',
    name: 'Computer Science Research Seminar',
    credits: 2,
    type: CourseType.ELECTIVE,
    category: 'research',
    semester: 7,
    description: 'Reading papers, presenting research, and designing small-scale CS investigations.',
  },
  {
    code: 'CMAN-CS416',
    name: 'Senior Capstone Project I',
    credits: 3,
    type: CourseType.REQUIRED,
    category: 'capstone',
    semester: 7,
    description: 'Team project proposal, requirements, architecture, and early implementation milestone.',
  },
  {
    code: 'CMAN-CS417',
    name: 'Senior Capstone Project II',
    credits: 4,
    type: CourseType.REQUIRED,
    category: 'capstone',
    semester: 8,
    description: 'Full implementation, validation, deployment, final report, and project presentation.',
  },
  {
    code: 'CMAN-CS418',
    name: 'Professional Internship Practice',
    credits: 2,
    type: CourseType.ELECTIVE,
    category: 'practice',
    semester: 7,
    description: 'Supervised industry practice with reflection on engineering process and professional conduct.',
  },
  {
    code: 'CMAN-GEN101',
    name: 'Academic Writing',
    credits: 2,
    type: CourseType.GENERAL,
    category: 'general education',
    semester: 1,
    description: 'Academic reading, argument structure, citation, and technical communication basics.',
  },
  {
    code: 'CMAN-GEN102',
    name: 'Scientific Ethics',
    credits: 2,
    type: CourseType.GENERAL,
    category: 'general education',
    semester: 2,
    description: 'Research integrity, privacy, fairness, and professional responsibility in computing.',
  },
  {
    code: 'CMAN-GEN201',
    name: 'Communication and Collaboration',
    credits: 2,
    type: CourseType.GENERAL,
    category: 'general education',
    semester: 3,
    description: 'Presentation, teamwork, negotiation, and collaborative problem solving.',
  },
  {
    code: 'CMAN-GEN202',
    name: 'Innovation and Entrepreneurship',
    credits: 2,
    type: CourseType.GENERAL,
    category: 'general education',
    semester: 4,
    description: 'Product discovery, business modeling, intellectual property, and startup case studies.',
  },
  {
    code: 'CMAN-GEN301',
    name: 'Technical Writing',
    credits: 2,
    type: CourseType.GENERAL,
    category: 'general education',
    semester: 5,
    description: 'Engineering documents, API documentation, design reports, and review writing.',
  },
  {
    code: 'CMAN-GEN302',
    name: 'Career Planning for Computing',
    credits: 1,
    type: CourseType.GENERAL,
    category: 'general education',
    semester: 6,
    description: 'Portfolio preparation, interview practice, career planning, and workplace norms.',
  },
  {
    code: 'CMAN-CS499',
    name: 'Legacy Systems Laboratory',
    credits: 1,
    type: CourseType.ELECTIVE,
    category: 'archived elective',
    semester: 8,
    description: 'Archived laboratory course retained for unavailable-course and legacy-data checks.',
    status: CourseStatus.ARCHIVED,
  },
] satisfies Array<{
  code: string
  name: string
  credits: number
  type: CourseType
  category: string
  semester: number
  description: string
  status?: CourseStatus
}>

const offeringCourseIndices = [
  1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 18, 11,
  13, 14, 15, 16, 19, 20, 25, 22, 29, 27, 32, 24,
  17, 30, 28, 31, 12, 13, 21, 35, 33, 34, 38, 36,
  37, 44, 39, 40, 41, 42, 43, 21, 23, 36, 45, 17,
]

const prerequisitePairs = [
  [2, 1],
  [6, 2],
  [6, 5],
  [7, 1],
  [8, 3],
  [9, 2],
  [9, 6],
  [10, 5],
  [10, 6],
  [11, 6],
  [11, 7],
  [11, 19],
  [12, 6],
  [13, 6],
  [14, 6],
  [14, 9],
  [15, 5],
  [15, 10],
  [16, 7],
  [16, 10],
  [17, 8],
  [17, 10],
  [18, 4],
  [18, 8],
  [18, 10],
  [19, 1],
  [20, 2],
  [21, 11],
  [21, 13],
  [22, 11],
  [22, 13],
  [23, 11],
  [23, 13],
  [24, 10],
  [24, 11],
  [25, 10],
  [25, 12],
  [26, 18],
  [27, 18],
  [28, 2],
  [29, 4],
  [29, 6],
  [30, 20],
  [31, 14],
  [32, 10],
  [32, 12],
  [33, 7],
  [33, 17],
  [34, 12],
  [34, 22],
  [35, 10],
  [36, 10],
  [36, 14],
  [37, 36],
  [38, 14],
]

if (courseCatalog.length !== courseIds.length) {
  throw new Error('C manual course catalog must match courseIds length')
}

if (offeringCourseIndices.length !== offeringIds.length) {
  throw new Error('C manual offering catalog must match offeringIds length')
}

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
  return courseCatalog[index - 1].type
}

const creditsOf = (index: number) => {
  return courseCatalog[index - 1].credits
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
  const allOfferingIds = [...offeringIds, ...historicalOfferingIds]
  await prisma.scoreModificationLog.deleteMany({
    where: { scoreId: { startsWith: 'cmanual-score-' } },
  })
  await prisma.score.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'cmanual-score-' } },
        { studentId: { in: studentIds } },
        { courseOfferingId: { in: allOfferingIds } },
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
        { courseOfferingId: { in: allOfferingIds } },
      ],
    },
  })
  await prisma.schedule.deleteMany({
    where: {
      OR: [
        { id: { in: scheduleIds } },
        { courseOfferingId: { in: allOfferingIds } },
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
    where: { id: { in: allOfferingIds } },
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
    where: { id: { in: [SEMESTER_ID, HISTORY_SEMESTER_ID] } },
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
      name: 'C Manual Computer Science Department',
      description: 'Realistic CS curriculum manual QA data for course selection',
    },
    create: {
      id: DEPARTMENT_ID,
      code: 'CMAN',
      name: 'C Manual Computer Science Department',
      description: 'Realistic CS curriculum manual QA data for course selection',
    },
  })

  await prisma.major.upsert({
    where: { id: MAJOR_ID },
    update: {
      departmentId: DEPARTMENT_ID,
      code: 'CMAN-CS',
      name: 'C Manual Computer Science',
      totalCredits: 132,
    },
    create: {
      id: MAJOR_ID,
      departmentId: DEPARTMENT_ID,
      code: 'CMAN-CS',
      name: 'C Manual Computer Science',
      totalCredits: 132,
    },
  })

  for (const [index, student] of students.entries()) {
    await prisma.student.upsert({
      where: { userId: student.id },
      update: {
        majorId: MAJOR_ID,
        grade: 2024,
        className: `CM-${index < 3 ? '1' : '2'}`,
      },
      create: {
        userId: student.id,
        studentNumber: `CMAN2024${String(index + 1).padStart(2, '0')}`,
        majorId: MAJOR_ID,
        grade: 2024,
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
        officeLocation: `CS Manual Building ${index + 1}01`,
      },
      create: {
        userId: teacher.id,
        teacherNumber: `CMANT${String(index + 1).padStart(3, '0')}`,
        departmentId: DEPARTMENT_ID,
        title: ['Lecturer', 'Associate Professor', 'Professor'][index],
        officeLocation: `CS Manual Building ${index + 1}01`,
      },
    })
  }

  await prisma.semester.upsert({
    where: { id: SEMESTER_ID },
    update: {
      name: '2026 Spring CS Manual QA',
      status: SemesterStatus.CURRENT,
    },
    create: {
      id: SEMESTER_ID,
      name: '2026 Spring CS Manual QA',
      startDate: new Date('2026-02-23'),
      endDate: new Date('2026-07-10'),
      status: SemesterStatus.CURRENT,
    },
  })

  await prisma.semester.upsert({
    where: { id: HISTORY_SEMESTER_ID },
    update: {
      name: '2025 Fall CS Manual History',
      status: SemesterStatus.ENDED,
    },
    create: {
      id: HISTORY_SEMESTER_ID,
      name: '2025 Fall CS Manual History',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-01-16'),
      status: SemesterStatus.ENDED,
    },
  })

  for (const [index, classroomId] of classroomIds.entries()) {
    await prisma.classroom.upsert({
      where: { id: classroomId },
      update: {
        building: 'CS Manual Building',
        roomNumber: `${201 + index}`,
        campus: 'Main',
        capacity: index % 2 === 0 ? 80 : 48,
        roomType: index % 3 === 0 ? RoomType.LAB : RoomType.LECTURE,
        status: RoomStatus.AVAILABLE,
      },
      create: {
        id: classroomId,
        building: 'CS Manual Building',
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
    const course = courseCatalog[index - 1]
    await prisma.course.upsert({
      where: { id: courseId },
      update: {
        code: course.code,
        name: course.name,
        credits: course.credits,
        hours: creditsOf(index) * 16,
        courseType: courseTypeOf(index),
        category: course.category,
        departmentId: DEPARTMENT_ID,
        teacherId: teachers[(index - 1) % teachers.length].id,
        description: course.description,
        assessmentMethod: 'usual 30%, project 20%, final 50%',
        status: course.status ?? CourseStatus.ACTIVE,
      },
      create: {
        id: courseId,
        code: course.code,
        name: course.name,
        credits: course.credits,
        hours: creditsOf(index) * 16,
        courseType: courseTypeOf(index),
        category: course.category,
        departmentId: DEPARTMENT_ID,
        teacherId: teachers[(index - 1) % teachers.length].id,
        description: course.description,
        assessmentMethod: 'usual 30%, project 20%, final 50%',
        status: course.status ?? CourseStatus.ACTIVE,
      },
    })
  }

  await prisma.curriculum.upsert({
    where: { id: CURRICULUM_ID },
    update: {
      majorId: MAJOR_ID,
      name: 'C Manual CS 2024 Curriculum',
      year: 2024,
      totalCredits: 132,
      requiredCredits: 78,
      electiveCredits: 42,
    },
    create: {
      id: CURRICULUM_ID,
      majorId: MAJOR_ID,
      name: 'C Manual CS 2024 Curriculum',
      year: 2024,
      totalCredits: 132,
      requiredCredits: 78,
      electiveCredits: 42,
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
        semesterSuggestion: courseCatalog[index - 1].semester,
      },
      create: {
        curriculumId: CURRICULUM_ID,
        courseId: courseIds[index - 1],
        courseType: courseTypeOf(index),
        semesterSuggestion: courseCatalog[index - 1].semester,
      },
    })
  }

  for (const [courseIndex, prerequisiteIndex] of prerequisitePairs) {
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
    const courseIndex = offeringCourseIndices[index - 1]
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
        courseId: courseIds[courseIndex - 1],
        semesterId: SEMESTER_ID,
        teacherId: teachers[(index - 1) % teachers.length].id,
        capacity,
        status,
      },
      create: {
        id: offeringIds[index - 1],
        courseId: courseIds[courseIndex - 1],
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
        notes: index === 20 ? 'Conflicts with CMAN-CS101 for cstudent01' : null,
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
        notes: index === 20 ? 'Conflicts with CMAN-CS101 for cstudent01' : null,
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
  for (let index = 1; index <= historicalOfferingIds.length; index += 1) {
    await prisma.courseOffering.upsert({
      where: { id: historicalOfferingIds[index - 1] },
      update: {
        courseId: courseIds[index - 1],
        semesterId: HISTORY_SEMESTER_ID,
        teacherId: teachers[(index - 1) % teachers.length].id,
        capacity: 40,
        enrolledCount: 1,
        status: OfferingStatus.CLOSED,
      },
      create: {
        id: historicalOfferingIds[index - 1],
        courseId: courseIds[index - 1],
        semesterId: HISTORY_SEMESTER_ID,
        teacherId: teachers[(index - 1) % teachers.length].id,
        capacity: 40,
        enrolledCount: 1,
        status: OfferingStatus.CLOSED,
      },
    })
  }

  const enrollmentRecords = [
    ...[9, 13].map((offeringIndex) => ({
      studentIndex: 0,
      offeringIndex,
      status: EnrollmentStatus.ENROLLED,
    })),
    { studentIndex: 1, offeringIndex: 1, status: EnrollmentStatus.ENROLLED },
    { studentIndex: 1, offeringIndex: 2, status: EnrollmentStatus.ENROLLED },
    { studentIndex: 2, offeringIndex: 1, status: EnrollmentStatus.ENROLLED },
    { studentIndex: 2, offeringIndex: 2, status: EnrollmentStatus.ENROLLED },
    { studentIndex: 2, offeringIndex: 5, status: EnrollmentStatus.ENROLLED },
    { studentIndex: 2, offeringIndex: 6, status: EnrollmentStatus.ENROLLED },
    ...[1, 2, 4, 5, 6, 7, 8, 9, 10].map((offeringIndex) => ({
      studentIndex: 3,
      offeringIndex,
      status: EnrollmentStatus.ENROLLED,
    })),
    { studentIndex: 4, offeringIndex: 1, status: EnrollmentStatus.ENROLLED },
    { studentIndex: 4, offeringIndex: 2, status: EnrollmentStatus.ENROLLED },
    { studentIndex: 4, offeringIndex: 5, status: EnrollmentStatus.ENROLLED },
    { studentIndex: 4, offeringIndex: 8, status: EnrollmentStatus.DROPPED },
    { studentIndex: 4, offeringIndex: 17, status: EnrollmentStatus.ENROLLED },
    { studentIndex: 4, offeringIndex: 44, status: EnrollmentStatus.ENROLLED },
    { studentIndex: 5, offeringIndex: 1, status: EnrollmentStatus.ENROLLED },
    { studentIndex: 5, offeringIndex: 2, status: EnrollmentStatus.ENROLLED },
    { studentIndex: 5, offeringIndex: 5, status: EnrollmentStatus.ENROLLED },
    { studentIndex: 5, offeringIndex: 6, status: EnrollmentStatus.ENROLLED },
    { studentIndex: 5, offeringIndex: 44, status: EnrollmentStatus.ENROLLED },
  ]

  const enrollmentIdByKey = new Map<string, string>()
  const historicalEnrollmentIdByKey = new Map<string, string>()
  for (let courseIndex = 1; courseIndex <= 8; courseIndex += 1) {
    const id = `cmanual-enrollment-history-${String(courseIndex).padStart(3, '0')}`
    await prisma.enrollment.upsert({
      where: {
        studentId_courseOfferingId: {
          studentId: students[0].id,
          courseOfferingId: historicalOfferingIds[courseIndex - 1],
        },
      },
      update: {
        status: EnrollmentStatus.ENROLLED,
        droppedAt: null,
      },
      create: {
        id,
        studentId: students[0].id,
        courseOfferingId: historicalOfferingIds[courseIndex - 1],
        status: EnrollmentStatus.ENROLLED,
        droppedAt: null,
      },
    })
    historicalEnrollmentIdByKey.set(`0:${courseIndex}`, id)
  }

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
    { studentIndex: 0, historyCourseIndex: 1, total: 91, status: ScoreStatus.SUBMITTED },
    { studentIndex: 0, historyCourseIndex: 2, total: 86, status: ScoreStatus.CONFIRMED },
    { studentIndex: 0, historyCourseIndex: 3, total: 82, status: ScoreStatus.CONFIRMED },
    { studentIndex: 0, historyCourseIndex: 4, total: 88, status: ScoreStatus.CONFIRMED },
    { studentIndex: 0, historyCourseIndex: 5, total: 84, status: ScoreStatus.SUBMITTED },
    { studentIndex: 0, historyCourseIndex: 6, total: 82, status: ScoreStatus.CONFIRMED },
    { studentIndex: 0, historyCourseIndex: 7, total: 79, status: ScoreStatus.CONFIRMED },
    { studentIndex: 0, historyCourseIndex: 8, total: 55, status: ScoreStatus.CONFIRMED },
    { studentIndex: 1, offeringIndex: 1, total: 72, status: ScoreStatus.DRAFT },
    { studentIndex: 2, offeringIndex: 1, total: 83, status: ScoreStatus.SUBMITTED },
    { studentIndex: 2, offeringIndex: 2, total: 80, status: ScoreStatus.CONFIRMED },
    { studentIndex: 2, offeringIndex: 5, total: 78, status: ScoreStatus.CONFIRMED },
    { studentIndex: 2, offeringIndex: 6, total: 81, status: ScoreStatus.CONFIRMED },
    { studentIndex: 3, offeringIndex: 1, total: 84, status: ScoreStatus.SUBMITTED },
    { studentIndex: 3, offeringIndex: 2, total: 81, status: ScoreStatus.CONFIRMED },
    { studentIndex: 3, offeringIndex: 4, total: 76, status: ScoreStatus.CONFIRMED },
    { studentIndex: 3, offeringIndex: 5, total: 86, status: ScoreStatus.CONFIRMED },
    { studentIndex: 3, offeringIndex: 6, total: 88, status: ScoreStatus.CONFIRMED },
    { studentIndex: 4, offeringIndex: 1, total: 68, status: ScoreStatus.CONFIRMED },
    { studentIndex: 4, offeringIndex: 2, total: 64, status: ScoreStatus.SUBMITTED },
    { studentIndex: 4, offeringIndex: 8, total: 52, status: ScoreStatus.CONFIRMED },
    { studentIndex: 5, offeringIndex: 1, total: 89, status: ScoreStatus.CONFIRMED },
    { studentIndex: 5, offeringIndex: 2, total: 87, status: ScoreStatus.CONFIRMED },
    { studentIndex: 5, offeringIndex: 5, total: 85, status: ScoreStatus.CONFIRMED },
    { studentIndex: 5, offeringIndex: 6, total: 83, status: ScoreStatus.CONFIRMED },
  ]

  for (const [index, record] of scoreRecords.entries()) {
    const offeringId =
      'historyCourseIndex' in record
        ? historicalOfferingIds[record.historyCourseIndex - 1]
        : offeringIds[record.offeringIndex - 1]
    const enrollmentId =
      'historyCourseIndex' in record
        ? historicalEnrollmentIdByKey.get(`${record.studentIndex}:${record.historyCourseIndex}`)
        : enrollmentIdByKey.get(`${record.studentIndex}:${record.offeringIndex}`)
    if (!enrollmentId) continue

    await prisma.score.upsert({
      where: { enrollmentId },
      update: {
        studentId: students[record.studentIndex].id,
        courseOfferingId: offeringId,
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
        courseOfferingId: offeringId,
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
  console.log('  cstudent01: mid-program CS student, confirmed curriculum, AI recommendation context')
  console.log('  cstudent02: curriculum not confirmed')
  console.log('  cstudent03: stale curriculum confirmation')
  console.log('  cstudent04: max credit pressure after selecting many core courses')
  console.log('  cstudent05: weak/failed prerequisite background')
  console.log('  cstudent06: capacity pressure and roster checks')
  console.log('Key ids:')
  console.log(`  active period: ${PERIOD_ACTIVE_ID}`)
  console.log('  selectable offering: cmanual-offering-009 (CMAN-CS301 Algorithms)')
  console.log('  unmet prerequisite offering: cmanual-offering-011 (CMAN-CS309 Machine Learning)')
  console.log('  time conflict offering: cmanual-offering-020 (CMAN-CS402 Computer Security)')
  console.log('  full offering: cmanual-offering-044 (CMAN-CS401 Distributed Systems)')
  console.log('  manual add target: cmanual-offering-021 (CMAN-CS409 Computer Graphics)')
  console.log(`  academic user id: ${academic.id}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
