import { PrismaClient } from '@prisma/client'

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

  console.log('✅ Database seeded successfully!')
  console.log('📝 Test accounts:')
  console.log('   - admin / Admin123 (超级管理员)')
  console.log('   - teacher / teacher123 (教师)')
  console.log('   - student / student123 (学生)')
  console.log(`   - F demo courseOfferingId: ${courseOffering.id}`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
