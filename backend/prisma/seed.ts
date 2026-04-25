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
      name: '计算机科学与技术学院',
      code: 'CS',
      description: '计算机科学与技术学院',
    },
  })

  console.log('✅ 创建院系:', department.name)

  // 创建专业
  const major = await prisma.major.upsert({
    where: { code: 'CS101' },
    update: {},
    create: {
      name: '计算机科学与技术',
      code: 'CS101',
      departmentId: department.id,
      degreeType: 'BACHELOR',
      totalCredits: 170,
    },
  })

  console.log('✅ 创建专业:', major.name)

  await prisma.teacher.upsert({
    where: { userId: teacher.id },
    update: {},
    create: {
      userId: teacher.id,
      teacherNumber: 'T2024001',
      departmentId: department.id,
      title: '教授',
      officeLocation: '教学楼A-301',
    },
  })

  console.log('✅ 创建教师记录')

  // 创建学期
  const semester = await prisma.semester.upsert({
    where: { id: '2024-spring' },
    update: {},
    create: {
      id: '2024-spring',
      name: '2024年春季学期',
      startDate: new Date('2024-02-26'),
      endDate: new Date('2024-07-05'),
      status: 'CURRENT',
    },
  })

  console.log('✅ 创建学期:', semester.name)

  // 创建课程
  const courseData = [
    {
      code: 'CS201',
      name: '数据结构与算法',
      credits: 4,
      courseType: 'REQUIRED',
      hours: 64,
      category: '专业核心',
    },
    {
      code: 'CS202',
      name: '操作系统原理',
      credits: 3,
      courseType: 'REQUIRED',
      hours: 48,
      category: '专业核心',
    },
    {
      code: 'CS203',
      name: '计算机网络',
      credits: 3,
      courseType: 'REQUIRED',
      hours: 48,
      category: '专业核心',
    },
    {
      code: 'CS204',
      name: '数据库系统概论',
      credits: 3,
      courseType: 'REQUIRED',
      hours: 48,
      category: '专业核心',
    },
    {
      code: 'CS301',
      name: '人工智能导论',
      credits: 2,
      courseType: 'ELECTIVE',
      hours: 32,
      category: '专业选修',
    },
  ]

  const courses = await Promise.all(
    courseData.map((course) =>
      prisma.course.upsert({
        where: { code: course.code },
        update: {},
        create: {
          code: course.code,
          name: course.name,
          credits: course.credits,
          courseType: course.courseType as any,
          hours: course.hours,
          category: course.category,
          departmentId: department.id,
          teacherId: teacher.id,
          status: 'ACTIVE' as any,
        },
      })
    )
  )

  courses.forEach((course) =>
    console.log(`✅ 创建课程: ${course.code} ${course.name} (${course.credits}学分)`)
  )

  // 创建教室
  const classroomData = [
    { building: '教学楼A', roomNumber: '101', campus: '主校区', capacity: 60, roomType: 'LECTURE' },
    { building: '教学楼A', roomNumber: '102', campus: '主校区', capacity: 80, roomType: 'LECTURE' },
    {
      building: '实验楼B',
      roomNumber: '201',
      campus: '主校区',
      capacity: 30,
      roomType: 'COMPUTER',
    },
    { building: '实验楼B', roomNumber: '202', campus: '主校区', capacity: 30, roomType: 'LAB' },
    {
      building: '教学楼C',
      roomNumber: '301',
      campus: '主校区',
      capacity: 100,
      roomType: 'MULTIMEDIA',
    },
  ]

  const classrooms = await Promise.all(
    classroomData.map((room) =>
      prisma.classroom.upsert({
        where: {
          building_roomNumber: {
            building: room.building,
            roomNumber: room.roomNumber,
          },
        },
        update: {},
        create: {
          building: room.building,
          roomNumber: room.roomNumber,
          campus: room.campus,
          capacity: room.capacity,
          roomType: room.roomType as any,
        },
      })
    )
  )

  classrooms.forEach((room) =>
    console.log(`✅ 创建教室: ${room.building} ${room.roomNumber} (容量: ${room.capacity})`)
  )

  // 创建开课记录
  const offerings = await Promise.all(
    courses.map((course) =>
      prisma.courseOffering.upsert({
        where: {
          id: `${course.id}-${semester.id}`,
        },
        update: {},
        create: {
          id: `${course.id}-${semester.id}`,
          courseId: course.id,
          semesterId: semester.id,
          teacherId: teacher.id,
          capacity: 50,
          status: 'OPEN',
        },
      })
    )
  )

  offerings.forEach((offering) =>
    console.log(`✅ 创建开课: ${courses.find((c) => c.id === offering.courseId)?.name}`)
  )

  console.log('✅ Database seeded successfully!')
  console.log('📝 Test accounts:')
  console.log('   - admin / Admin123 (超级管理员)')
  console.log('   - teacher / teacher123 (教师)')
  console.log('   - student / student123 (学生)')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
