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
