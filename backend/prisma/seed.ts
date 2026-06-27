import { Prisma, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 创建权限
  const permissionDefinitions = [
    ['user:read', '查看用户', 'user', 'read', '允许查看用户信息'],
    ['user:create', '创建用户', 'user', 'create', '允许创建用户'],
    ['user:update', '更新用户', 'user', 'update', '允许更新用户'],
    ['user:delete', '删除用户', 'user', 'delete', '允许删除用户'],
    ['department:read', '查看院系', 'department', 'read', '允许查看院系'],
    ['department:create', '创建院系', 'department', 'create', '允许创建院系'],
    ['department:update', '更新院系', 'department', 'update', '允许更新院系'],
    ['department:delete', '删除院系', 'department', 'delete', '允许删除院系'],
    ['major:read', '查看专业', 'major', 'read', '允许查看专业'],
    ['major:create', '创建专业', 'major', 'create', '允许创建专业'],
    ['major:update', '更新专业', 'major', 'update', '允许更新专业'],
    ['major:delete', '删除专业', 'major', 'delete', '允许删除专业'],
    ['course:read', '查看课程', 'course', 'read', '允许查看课程'],
    ['course:create', '创建课程', 'course', 'create', '允许创建课程'],
    ['course:update', '更新课程', 'course', 'update', '允许更新课程'],
    ['course:delete', '删除课程', 'course', 'delete', '允许删除课程'],
    ['curriculum:read', '查看培养方案', 'curriculum', 'read', '允许查看培养方案'],
    ['curriculum:create', '创建培养方案', 'curriculum', 'create', '允许创建培养方案'],
    ['curriculum:update', '更新培养方案', 'curriculum', 'update', '允许更新培养方案'],
    ['curriculum:delete', '删除培养方案', 'curriculum', 'delete', '允许删除培养方案'],
    ['role:read', '查看角色', 'role', 'read', '允许查看角色'],
    ['role:create', '创建角色', 'role', 'create', '允许创建角色'],
    ['role:update', '更新角色', 'role', 'update', '允许更新角色'],
    ['role:delete', '删除角色', 'role', 'delete', '允许删除角色'],
    ['permission:read', '查看权限', 'permission', 'read', '允许查看权限'],
    ['permission:assign', '分配角色权限', 'permission', 'assign', '允许分配角色权限'],
    ['permission:revoke', '撤销角色权限', 'permission', 'revoke', '允许撤销角色权限'],
    ['token:read', '查看活跃令牌', 'token', 'read', '允许查看活跃令牌'],
    ['token:revoke', '吊销令牌', 'token', 'revoke', '允许吊销令牌'],
    ['log:read', '查看系统日志', 'log', 'read', '允许查看系统日志'],
  ] as const

  const permissions = await Promise.all(
    permissionDefinitions.map(([code, name, resource, action, description]) =>
      prisma.permission.upsert({
        where: { code },
        update: {
          name,
          resource,
          action,
          description,
        },
        create: {
          name,
          code,
          resource,
          action,
          description,
        },
      })
    )
  )

  // 创建角色
  const studentRole = await prisma.role.upsert({
    where: { code: 'student' },
    update: {},
    create: {
      name: '学生',
      code: 'student',
      description: '普通学生角色',
    },
  })

  const teacherRole = await prisma.role.upsert({
    where: { code: 'teacher' },
    update: {},
    create: {
      name: '教师',
      code: 'teacher',
      description: '教师角色',
    },
  })

  const adminRole = await prisma.role.upsert({
    where: { code: 'admin' },
    update: {},
    create: {
      name: '管理员',
      code: 'admin',
      description: '教务管理员',
    },
  })

  const superAdminRole = await prisma.role.upsert({
    where: { code: 'super_admin' },
    update: {},
    create: {
      name: '超级管理员',
      code: 'super_admin',
      description: '系统超级管理员',
    },
  })

  // 为超级管理员角色分配所有权限
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: permission.id,
      },
    })
  }

  // 创建测试管理员 (密码: Admin123)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: '$2b$10$zp7zpWDbhVxVPwEWGMGMMeQd6TU4x8wrX0OGCbGUX5zWac5wAO022',
      email: 'admin@stss.edu',
      realName: '系统管理员',
      gender: 'MALE',
      status: 'ACTIVE',
    },
  })

  // 为管理员分配超级管理员角色
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: superAdminRole.id,
    },
  })

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id,
    },
  })

  // 创建测试学生 (密码: student123)
  const student = await prisma.user.upsert({
    where: { username: 'student' },
    update: {},
    create: {
      username: 'student',
      passwordHash: '$2b$10$VmS5HSLRcNOoEtR3jZ.EwOMCJJ4R/V81UIqQJU3D06tGFjx1n4aiq',
      email: 'student@stss.edu',
      realName: '测试学生',
      gender: 'MALE',
      status: 'ACTIVE',
    },
  })

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: student.id,
        roleId: studentRole.id,
      },
    },
    update: {},
    create: {
      userId: student.id,
      roleId: studentRole.id,
    },
  })

  // 为学生创建档案记录（学生答题需要此记录）
  await prisma.student.upsert({
    where: { userId: student.id },
    update: {
      studentNumber: 'S2026001',
      grade: 2026,
      className: '软件工程1班',
    },
    create: {
      userId: student.id,
      studentNumber: 'S2026001',
      grade: 2026,
      className: '软件工程1班',
    },
  })

  // 创建测试教师 (密码: teacher123)
  const teacher = await prisma.user.upsert({
    where: { username: 'teacher' },
    update: {},
    create: {
      username: 'teacher',
      passwordHash: '$2b$10$c6PMdM0nmz2cKLuF666t7uqHCPrwFN2WIFrYBYaw6bbbqi7LA3oPO',
      email: 'teacher@stss.edu',
      realName: '测试教师',
      gender: 'MALE',
      status: 'ACTIVE',
    },
  })

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: teacher.id,
        roleId: teacherRole.id,
      },
    },
    update: {},
    create: {
      userId: teacher.id,
      roleId: teacherRole.id,
    },
  })

  // ==================== 在线测试模块基础数据 ====================

  // 创建示例院系
  const csDepartment = await prisma.department.upsert({
    where: { code: 'CS' },
    update: {},
    create: {
      name: '计算机学院',
      code: 'CS',
      description: '在线测试示例数据所属院系',
    },
  })

  // 为测试教师补充教师档案
  await prisma.teacher.upsert({
    where: { userId: teacher.id },
    update: {
      departmentId: csDepartment.id,
      title: '讲师',
      officeLocation: '玉泉 4 教',
    },
    create: {
      userId: teacher.id,
      teacherNumber: 'T2026001',
      departmentId: csDepartment.id,
      title: '讲师',
      officeLocation: '玉泉 4 教',
    },
  })

  // 创建在线测试示例课程
  const onlineTestCourse = await prisma.course.upsert({
    where: { code: 'CS-ONLINE-101' },
    update: {},
    create: {
      code: 'CS-ONLINE-101',
      name: '在线测试系统导论',
      credits: new Prisma.Decimal('2.0'),
      hours: 32,
      courseType: 'REQUIRED',
      category: '专业课',
      departmentId: csDepartment.id,
      teacherId: teacher.id,
      description: '用于在线测试模块示例题库数据',
      assessmentMethod: '在线测试 + 作业',
      status: 'ACTIVE',
    },
  })

  // 创建示例题库（若不存在）
  let sampleBank = await prisma.questionBank.findFirst({
    where: {
      name: '在线测试示例题库',
      courseId: onlineTestCourse.id,
      creatorId: teacher.id,
    },
  })

  if (!sampleBank) {
    sampleBank = await prisma.questionBank.create({
      data: {
        name: '在线测试示例题库',
        description: '系统初始化生成，用于题目 CRUD 演示',
        status: 'ACTIVE',
        courseId: onlineTestCourse.id,
        creatorId: teacher.id,
      },
    })
  }

  // 创建示例题目（避免重复插入）
  // 注意：answer 必须使用选项序号（数字），与学生提交的答案格式一致
  const seedQuestions = [
    {
      questionType: 'SINGLE_CHOICE' as const,
      content: '以下关于static的说法，不正确的是？',
      answer: '4', // 第4个选项
      explanation: '不包含引用的数据结构也是static的，不要求一定包含指向静态存储期的引用。',
      defaultPoints: new Prisma.Decimal('2.0'),
      difficulty: 'HARD' as const,
      knowledgePoint: 'Rust 生命周期',
      options: [
        { optionText: '能声明静态全局变量', optionOrder: 1, isCorrect: false },
        { optionText: '能声明静态局部变量', optionOrder: 2, isCorrect: false },
        { optionText: '能声明在程序运行期间都有效的引用', optionOrder: 3, isCorrect: false },
        { optionText: '一定包含指向静态存储期的引用', optionOrder: 4, isCorrect: true },
      ],
    },
    {
      questionType: 'MULTI_CHOICE' as const,
      content: '以下哪些属于 HTTP 常见方法？',
      answer: '1,2,4', // 第1,2,4个选项（排除 FETCH）
      explanation: 'REST 接口中最常用的请求方法。',
      defaultPoints: new Prisma.Decimal('3.0'),
      difficulty: 'MEDIUM' as const,
      knowledgePoint: 'Web 基础',
      options: [
        { optionText: 'GET', optionOrder: 1, isCorrect: true },
        { optionText: 'POST', optionOrder: 2, isCorrect: true },
        { optionText: 'FETCH', optionOrder: 3, isCorrect: false },
        { optionText: 'DELETE', optionOrder: 4, isCorrect: true },
      ],
    },
    {
      questionType: 'TRUE_FALSE' as const,
      content: 'Prisma 是一种 ORM 工具。',
      answer: '1', // 正确=第1个选项
      explanation: 'Prisma 可用于定义 schema 并访问数据库。',
      defaultPoints: new Prisma.Decimal('1.0'),
      difficulty: 'EASY' as const,
      knowledgePoint: '数据库工具',
      options: [
        { optionText: '正确', optionOrder: 1, isCorrect: true },
        { optionText: '错误', optionOrder: 2, isCorrect: false },
      ],
    },
  ]

  for (const question of seedQuestions) {
    const existed = await prisma.question.findFirst({
      where: {
        bankId: sampleBank.id,
        content: question.content,
      },
    })

    if (!existed) {
      await prisma.question.create({
        data: {
          bankId: sampleBank.id,
          questionType: question.questionType,
          content: question.content,
          answer: question.answer,
          explanation: question.explanation,
          defaultPoints: question.defaultPoints,
          difficulty: question.difficulty,
          knowledgePoint: question.knowledgePoint,
          options: {
            create: question.options,
          },
        },
      })
    }
  }

  const department = await prisma.department.upsert({
    where: { code: 'CS' },
    update: {},
    create: {
      name: '计算机学院',
      code: 'CS',
      description: 'F 模块演示用院系',
    },
  })

  const major = await prisma.major.upsert({
    where: { code: 'CS-SE' },
    update: {
      departmentId: department.id,
      totalCredits: 160,
    },
    create: {
      departmentId: department.id,
      name: '软件工程',
      code: 'CS-SE',
      degreeType: 'BACHELOR',
      totalCredits: 160,
    },
  })

  await prisma.admin.upsert({
    where: { userId: admin.id },
    update: {
      adminType: 'SUPER',
      departmentId: department.id,
    },
    create: {
      userId: admin.id,
      adminType: 'SUPER',
      departmentId: department.id,
    },
  })

  await prisma.teacher.upsert({
    where: { userId: teacher.id },
    update: {
      departmentId: department.id,
      title: '讲师',
      officeLocation: 'A-301',
    },
    create: {
      userId: teacher.id,
      teacherNumber: 'T20260001',
      departmentId: department.id,
      title: '讲师',
      officeLocation: 'A-301',
    },
  })

  await prisma.student.upsert({
    where: { userId: student.id },
    update: {
      majorId: major.id,
      grade: 2023,
      className: '软工 2301',
    },
    create: {
      userId: student.id,
      studentNumber: 'S20230001',
      majorId: major.id,
      grade: 2023,
      className: '软工 2301',
    },
  })

  const semester = await prisma.semester.upsert({
    where: { id: '11111111-1111-4111-8111-111111111111' },
    update: {
      name: '2025-2026 春季学期',
      status: 'CURRENT',
    },
    create: {
      id: '11111111-1111-4111-8111-111111111111',
      name: '2025-2026 春季学期',
      startDate: new Date('2026-02-23'),
      endDate: new Date('2026-07-05'),
      status: 'CURRENT',
    },
  })

  const course = await prisma.course.upsert({
    where: { code: 'F-DEMO-001' },
    update: {
      name: '成绩管理演示课程',
      credits: 3,
      courseType: 'REQUIRED',
      departmentId: department.id,
      teacherId: teacher.id,
      status: 'ACTIVE',
    },
    create: {
      code: 'F-DEMO-001',
      name: '成绩管理演示课程',
      credits: 3,
      hours: 48,
      courseType: 'REQUIRED',
      category: '专业基础',
      departmentId: department.id,
      teacherId: teacher.id,
      assessmentMethod: '平时 30% + 期中 20% + 期末 50%',
      status: 'ACTIVE',
    },
  })

  const curriculum = await prisma.curriculum.upsert({
    where: { id: '22222222-2222-4222-8222-222222222222' },
    update: {
      majorId: major.id,
      totalCredits: 160,
      requiredCredits: 120,
      electiveCredits: 40,
    },
    create: {
      id: '22222222-2222-4222-8222-222222222222',
      majorId: major.id,
      name: '软件工程 2023 级培养方案',
      year: 2023,
      totalCredits: 160,
      requiredCredits: 120,
      electiveCredits: 40,
    },
  })

  await prisma.curriculumCourse.upsert({
    where: {
      curriculumId_courseId: {
        curriculumId: curriculum.id,
        courseId: course.id,
      },
    },
    update: {
      courseType: 'REQUIRED',
      semesterSuggestion: 6,
    },
    create: {
      curriculumId: curriculum.id,
      courseId: course.id,
      courseType: 'REQUIRED',
      semesterSuggestion: 6,
    },
  })

  const courseOffering = await prisma.courseOffering.upsert({
    where: { id: '33333333-3333-4333-8333-333333333333' },
    update: {
      courseId: course.id,
      semesterId: semester.id,
      teacherId: teacher.id,
      capacity: 40,
      enrolledCount: 1,
      status: 'OPEN',
    },
    create: {
      id: '33333333-3333-4333-8333-333333333333',
      courseId: course.id,
      semesterId: semester.id,
      teacherId: teacher.id,
      capacity: 40,
      enrolledCount: 1,
      status: 'OPEN',
    },
  })

  const enrollment = await prisma.enrollment.upsert({
    where: {
      studentId_courseOfferingId: {
        studentId: student.id,
        courseOfferingId: courseOffering.id,
      },
    },
    update: {
      status: 'ENROLLED',
      droppedAt: null,
    },
    create: {
      id: '44444444-4444-4444-8444-444444444444',
      studentId: student.id,
      courseOfferingId: courseOffering.id,
      status: 'ENROLLED',
    },
  })

  const modificationRequest = {
    proposedChanges: {
      finalScore: 92,
    },
    reason: 'F6 演示数据：期末试卷复核后需调整期末成绩',
    applicantId: teacher.id,
    appliedAt: new Date().toISOString(),
  }

  const score = await prisma.score.upsert({
    where: { enrollmentId: enrollment.id },
    update: {
      studentId: student.id,
      courseOfferingId: courseOffering.id,
      usualScore: 86,
      midtermScore: 82,
      finalScore: 88,
      totalScore: 86.2,
      gradePoint: 3.7,
      gradeLetter: 'B',
      enteredBy: teacher.id,
      enteredAt: new Date(),
      status: 'SUBMITTED',
      modificationRequest: JSON.stringify(modificationRequest),
      modifiedAt: null,
      modifiedBy: null,
    },
    create: {
      id: '55555555-5555-4555-8555-555555555555',
      enrollmentId: enrollment.id,
      studentId: student.id,
      courseOfferingId: courseOffering.id,
      usualScore: 86,
      midtermScore: 82,
      finalScore: 88,
      totalScore: 86.2,
      gradePoint: 3.7,
      gradeLetter: 'B',
      enteredBy: teacher.id,
      enteredAt: new Date(),
      status: 'SUBMITTED',
      modificationRequest: JSON.stringify(modificationRequest),
    },
  })

  await prisma.systemLog.create({
    data: {
      userId: teacher.id,
      action: 'score.modification.requested',
      resourceType: 'score',
      resourceId: score.id,
      details: modificationRequest,
    },
  })

  // ==================== B 自动排课模块基础数据 ====================

  const bSemester = await prisma.semester.upsert({
    where: { id: '2024-spring' },
    update: {
      name: '2024年春季学期',
      startDate: new Date('2024-02-26'),
      endDate: new Date('2024-07-05'),
      status: 'CURRENT',
    },
    create: {
      id: '2024-spring',
      name: '2024年春季学期',
      startDate: new Date('2024-02-26'),
      endDate: new Date('2024-07-05'),
      status: 'CURRENT',
    },
  })

  const bCourseData = [
    {
      code: 'CS201',
      name: '数据结构与算法',
      credits: '4.0',
      courseType: 'REQUIRED',
      hours: 64,
      category: '专业核心',
    },
    {
      code: 'CS202',
      name: '操作系统原理',
      credits: '3.0',
      courseType: 'REQUIRED',
      hours: 48,
      category: '专业核心',
    },
    {
      code: 'CS203',
      name: '计算机网络',
      credits: '3.0',
      courseType: 'REQUIRED',
      hours: 48,
      category: '专业核心',
    },
    {
      code: 'CS204',
      name: '数据库系统概论',
      credits: '3.0',
      courseType: 'REQUIRED',
      hours: 48,
      category: '专业核心',
    },
    {
      code: 'CS301',
      name: '人工智能导论',
      credits: '2.0',
      courseType: 'ELECTIVE',
      hours: 32,
      category: '专业选修',
    },
  ] as const

  const bCourses = await Promise.all(
    bCourseData.map((bCourse) =>
      prisma.course.upsert({
        where: { code: bCourse.code },
        update: {
          name: bCourse.name,
          credits: new Prisma.Decimal(bCourse.credits),
          courseType: bCourse.courseType,
          hours: bCourse.hours,
          category: bCourse.category,
          departmentId: department.id,
          teacherId: teacher.id,
          status: 'ACTIVE',
        },
        create: {
          code: bCourse.code,
          name: bCourse.name,
          credits: new Prisma.Decimal(bCourse.credits),
          courseType: bCourse.courseType,
          hours: bCourse.hours,
          category: bCourse.category,
          departmentId: department.id,
          teacherId: teacher.id,
          status: 'ACTIVE',
        },
      })
    )
  )

  const bClassroomData = [
    {
      building: '教学楼A',
      roomNumber: '101',
      campus: '主校区',
      capacity: 60,
      roomType: 'LECTURE',
      equipment: { projector: true, airConditioner: true, microphone: true, computerCount: 0 },
    },
    {
      building: '教学楼A',
      roomNumber: '102',
      campus: '主校区',
      capacity: 80,
      roomType: 'LECTURE',
      equipment: { projector: true, airConditioner: true, microphone: true, computerCount: 0 },
    },
    {
      building: '实验楼B',
      roomNumber: '201',
      campus: '主校区',
      capacity: 30,
      roomType: 'COMPUTER',
      equipment: { projector: true, airConditioner: true, microphone: false, computerCount: 30 },
    },
    {
      building: '实验楼B',
      roomNumber: '202',
      campus: '主校区',
      capacity: 30,
      roomType: 'LAB',
      equipment: { projector: true, airConditioner: true, microphone: false, computerCount: 0 },
    },
    {
      building: '教学楼C',
      roomNumber: '301',
      campus: '主校区',
      capacity: 100,
      roomType: 'MULTIMEDIA',
      equipment: { projector: true, airConditioner: true, microphone: true, computerCount: 1 },
    },
  ] as const

  await Promise.all(
    bClassroomData.map((room) =>
      prisma.classroom.upsert({
        where: {
          building_roomNumber: {
            building: room.building,
            roomNumber: room.roomNumber,
          },
        },
        update: {
          campus: room.campus,
          capacity: room.capacity,
          roomType: room.roomType,
          equipment: room.equipment,
          status: 'AVAILABLE',
        },
        create: {
          building: room.building,
          roomNumber: room.roomNumber,
          campus: room.campus,
          capacity: room.capacity,
          roomType: room.roomType,
          equipment: room.equipment,
          status: 'AVAILABLE',
        },
      })
    )
  )

  const bOfferings = await Promise.all(
    bCourses.map((bCourse) =>
      prisma.courseOffering.upsert({
        where: { id: 'b-offering-' + bCourse.code + '-2024-spring' },
        update: {
          courseId: bCourse.id,
          semesterId: bSemester.id,
          teacherId: teacher.id,
          capacity: 50,
          status: 'OPEN',
        },
        create: {
          id: 'b-offering-' + bCourse.code + '-2024-spring',
          courseId: bCourse.id,
          semesterId: bSemester.id,
          teacherId: teacher.id,
          capacity: 50,
          status: 'OPEN',
        },
      })
    )
  )

  console.log('✅ Database seeded successfully!')
  console.log('📝 Test accounts:')
  console.log('   - admin / Admin123 (超级管理员)')
  console.log('   - teacher / teacher123 (教师)')
  console.log('   - student / student123 (学生)')
  console.log(`📚 Question bank ready: ${sampleBank.name} (${sampleBank.id})`)
  console.log(`   - F demo courseOfferingId: ${courseOffering.id}`)
  console.log(`   - B demo semesterId: ${bSemester.id}`)
  console.log(`   - B demo courseOfferingIds: ${bOfferings.map((offering) => offering.id).join(', ')}`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
