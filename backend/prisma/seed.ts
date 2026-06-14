import { PrismaClient } from '@prisma/client'

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

  await prisma.role.upsert({
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
