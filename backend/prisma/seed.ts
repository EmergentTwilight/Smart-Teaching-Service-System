import { Prisma, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 创建权限
  const permissions = await Promise.all([
    prisma.permission.upsert({
      where: { code: 'user:read' },
      update: {},
      create: {
        name: '查看用户',
        code: 'user:read',
        resource: 'user',
        action: 'read',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'user:create' },
      update: {},
      create: {
        name: '创建用户',
        code: 'user:create',
        resource: 'user',
        action: 'create',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'user:update' },
      update: {},
      create: {
        name: '更新用户',
        code: 'user:update',
        resource: 'user',
        action: 'update',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'user:delete' },
      update: {},
      create: {
        name: '删除用户',
        code: 'user:delete',
        resource: 'user',
        action: 'delete',
      },
    }),
  ])

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
  const seedQuestions = [
    {
      questionType: 'SINGLE_CHOICE' as const,
      content: '以下关于static的说法，不正确的是？',
      answer: '一定包含指向静态存储期的引用',
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
      answer: 'GET,POST,PUT,DELETE',
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
      answer: 'true',
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

  console.log('✅ Database seeded successfully!')
  console.log('📝 Test accounts:')
  console.log('   - admin / Admin123 (超级管理员)')
  console.log('   - teacher / teacher123 (教师)')
  console.log('   - student / student123 (学生)')
  console.log(`📚 Question bank ready: ${sampleBank.name} (${sampleBank.id})`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
