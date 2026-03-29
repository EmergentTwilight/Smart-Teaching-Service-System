/**
 * 认证 Schema 单元测试
 * 验证 Zod schema 对各类输入的校验行为
 * 按最佳实践：每个 schema 测试 valid / invalid / edge cases
 */
import { describe, expect, it } from 'vitest'
import { type ZodIssue } from 'zod'
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  refreshTokenSchema,
  activateAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../../../modules/info-management/auth.types.js'

// ==================== loginSchema ====================
describe('loginSchema', () => {
  describe('valid inputs', () => {
    it('应该接受正常的用户名和密码', () => {
      const result = loginSchema.safeParse({
        username: 'alice',
        password: 'Password123',
      })
      expect(result.success).toBe(true)
    })

    it('应该接受用户名包含特殊字符', () => {
      const result = loginSchema.safeParse({
        username: 'alice_123',
        password: 'anypassword',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('应该拒绝空用户名', () => {
      const result = loginSchema.safeParse({ username: '', password: 'Password123' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('用户名不能为空')
      }
    })

    it('应该拒绝空密码', () => {
      const result = loginSchema.safeParse({ username: 'alice', password: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('密码不能为空')
      }
    })

    it('应该拒绝缺失字段', () => {
      expect(loginSchema.safeParse({ username: 'alice' }).success).toBe(false)
      expect(loginSchema.safeParse({ password: 'Password123' }).success).toBe(false)
      expect(loginSchema.safeParse({}).success).toBe(false)
    })
  })
})

// ==================== registerSchema ====================
describe('registerSchema', () => {
  const validInput = {
    username: 'newuser',
    password: 'Password123',
    realName: '张三',
  }

  describe('valid inputs', () => {
    it('应该接受符合所有要求的注册信息', () => {
      const result = registerSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('应该接受带完整可选字段', () => {
      const result = registerSchema.safeParse({
        ...validInput,
        email: 'user@example.com',
        phone: '13812345678',
        gender: 'MALE',
      })
      expect(result.success).toBe(true)
    })

    it('应该接受 3 位用户名（最小长度）', () => {
      const result = registerSchema.safeParse({ ...validInput, username: 'abc' })
      expect(result.success).toBe(true)
    })

    it('应该接受 50 位用户名（最大长度）', () => {
      const result = registerSchema.safeParse({ ...validInput, username: 'a'.repeat(50) })
      expect(result.success).toBe(true)
    })
  })

  describe('username validation', () => {
    it('应该拒绝 2 位用户名（小于最小长度）', () => {
      const result = registerSchema.safeParse({ ...validInput, username: 'ab' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('用户名至少3位')
      }
    })

    it('应该拒绝 51 位用户名（大于最大长度）', () => {
      const result = registerSchema.safeParse({ ...validInput, username: 'a'.repeat(51) })
      expect(result.success).toBe(false)
    })

    it('应该拒绝空用户名', () => {
      const result = registerSchema.safeParse({ ...validInput, username: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('password validation', () => {
    it('应该拒绝少于 8 位密码', () => {
      const result = registerSchema.safeParse({ ...validInput, password: 'Pass1' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('密码至少8位')
      }
    })

    it('应该拒绝没有大写字母的密码', () => {
      const result = registerSchema.safeParse({ ...validInput, password: 'password123' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('密码必须包含大写字母')
      }
    })

    it('应该拒绝没有小写字母的密码', () => {
      const result = registerSchema.safeParse({ ...validInput, password: 'PASSWORD123' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('密码必须包含小写字母')
      }
    })

    it('应该拒绝没有数字的密码', () => {
      const result = registerSchema.safeParse({ ...validInput, password: 'PasswordAB' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('密码必须包含数字')
      }
    })

    it('应该接受正好 8 位的合规密码', () => {
      const result = registerSchema.safeParse({ ...validInput, password: 'Pass1234' })
      expect(result.success).toBe(true)
    })
  })

  describe('email validation', () => {
    it('应该接受有效邮箱', () => {
      const result = registerSchema.safeParse({ ...validInput, email: 'test@test.com' })
      expect(result.success).toBe(true)
    })

    it('应该拒绝无效邮箱格式', () => {
      const result = registerSchema.safeParse({ ...validInput, email: 'not-an-email' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('邮箱格式不正确')
      }
    })

    it('应该拒绝没有 @ 的邮箱', () => {
      const result = registerSchema.safeParse({ ...validInput, email: 'userexample.com' })
      expect(result.success).toBe(false)
    })

    it('应该拒绝没有域名的邮箱', () => {
      const result = registerSchema.safeParse({ ...validInput, email: 'user@' })
      expect(result.success).toBe(false)
    })
  })

  describe('realName validation', () => {
    it('应该拒绝空姓名', () => {
      const result = registerSchema.safeParse({ ...validInput, realName: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('姓名不能为空')
      }
    })

    it('应该拒绝超过 50 字的姓名', () => {
      const result = registerSchema.safeParse({ ...validInput, realName: '张'.repeat(51) })
      expect(result.success).toBe(false)
    })

    it('应该接受 50 字姓名', () => {
      const result = registerSchema.safeParse({ ...validInput, realName: '张'.repeat(50) })
      expect(result.success).toBe(true)
    })
  })

  describe('gender validation', () => {
    it('应该接受有效枚举值', () => {
      expect(registerSchema.safeParse({ ...validInput, gender: 'MALE' }).success).toBe(true)
      expect(registerSchema.safeParse({ ...validInput, gender: 'FEMALE' }).success).toBe(true)
      expect(registerSchema.safeParse({ ...validInput, gender: 'OTHER' }).success).toBe(true)
    })

    it('应该拒绝无效枚举值', () => {
      const result = registerSchema.safeParse({ ...validInput, gender: 'UNKNOWN' })
      expect(result.success).toBe(false)
    })
  })
})

// ==================== changePasswordSchema ====================
describe('changePasswordSchema', () => {
  const validInput = { oldPassword: 'OldPass123', newPassword: 'NewPass456' }

  describe('valid inputs', () => {
    it('应该接受符合要求的新旧密码', () => {
      const result = changePasswordSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })
  })

  describe('oldPassword validation', () => {
    it('应该拒绝空旧密码', () => {
      const result = changePasswordSchema.safeParse({ oldPassword: '', newPassword: 'NewPass123' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('旧密码不能为空')
      }
    })
  })

  describe('newPassword validation', () => {
    it('应该拒绝少于 8 位新密码', () => {
      const result = changePasswordSchema.safeParse({
        oldPassword: 'OldPass123',
        newPassword: 'New1',
      })
      expect(result.success).toBe(false)
    })

    it('应该拒绝没有大写字母的新密码', () => {
      const result = changePasswordSchema.safeParse({
        oldPassword: 'OldPass123',
        newPassword: 'newpassword123',
      })
      expect(result.success).toBe(false)
    })

    it('应该拒绝没有小写字母的新密码', () => {
      const result = changePasswordSchema.safeParse({
        oldPassword: 'OldPass123',
        newPassword: 'NEWPASSWORD123',
      })
      expect(result.success).toBe(false)
    })

    it('应该拒绝没有数字的新密码', () => {
      const result = changePasswordSchema.safeParse({
        oldPassword: 'OldPass123',
        newPassword: 'NewPasswordAB',
      })
      expect(result.success).toBe(false)
    })
  })
})

// ==================== refreshTokenSchema ====================
describe('refreshTokenSchema', () => {
  it('应该接受有效 token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: 'some-token-value' })
    expect(result.success).toBe(true)
  })

  it('应该拒绝空 token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('刷新令牌不能为空')
    }
  })

  it('应该拒绝缺失 token', () => {
    expect(refreshTokenSchema.safeParse({}).success).toBe(false)
  })
})

// ==================== activateAccountSchema ====================
describe('activateAccountSchema', () => {
  it('应该接受有效激活 token', () => {
    const result = activateAccountSchema.safeParse({ token: 'activation-token-value' })
    expect(result.success).toBe(true)
  })

  it('应该拒绝空 token', () => {
    const result = activateAccountSchema.safeParse({ token: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('激活令牌不能为空')
    }
  })
})

// ==================== forgotPasswordSchema ====================
describe('forgotPasswordSchema', () => {
  it('应该接受有效邮箱', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(true)
  })

  it('应该拒绝无效邮箱', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'not-valid' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('邮箱格式不正确')
    }
  })

  it('应该拒绝空邮箱', () => {
    const result = forgotPasswordSchema.safeParse({ email: '' })
    expect(result.success).toBe(false)
  })
})

// ==================== resetPasswordSchema ====================
describe('resetPasswordSchema', () => {
  const validInput = {
    token: 'reset-token',
    newPassword: 'NewPass123',
    confirmPassword: 'NewPass123',
  }

  describe('valid inputs', () => {
    it('应该接受符合要求的完整输入', () => {
      const result = resetPasswordSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })
  })

  describe('token validation', () => {
    it('应该拒绝空 token', () => {
      const result = resetPasswordSchema.safeParse({
        token: '',
        newPassword: 'NewPass123',
        confirmPassword: 'NewPass123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('重置令牌不能为空')
      }
    })
  })

  describe('newPassword validation', () => {
    it('应该拒绝少于 8 位新密码', () => {
      const result = resetPasswordSchema.safeParse({
        ...validInput,
        newPassword: 'New1',
        confirmPassword: 'New1',
      })
      expect(result.success).toBe(false)
    })

    it('应该拒绝没有大写字母的新密码', () => {
      const result = resetPasswordSchema.safeParse({
        ...validInput,
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      })
      expect(result.success).toBe(false)
    })

    it('应该拒绝没有小写字母的新密码', () => {
      const result = resetPasswordSchema.safeParse({
        ...validInput,
        newPassword: 'NEWPASSWORD123',
        confirmPassword: 'NEWPASSWORD123',
      })
      expect(result.success).toBe(false)
    })

    it('应该拒绝没有数字的新密码', () => {
      const result = resetPasswordSchema.safeParse({
        ...validInput,
        newPassword: 'NewPasswordAB',
        confirmPassword: 'NewPasswordAB',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('confirmPassword validation', () => {
    it('应该拒绝与新密码不匹配的确认密码', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'reset-token',
        newPassword: 'NewPass123',
        confirmPassword: 'DifferentPass1',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        // refine 错误 path 指向 confirmPassword
        const issue = result.error.issues.find((i: ZodIssue) => i.path.includes('confirmPassword'))
        expect(issue?.message).toBe('两次输入的新密码不一致')
      }
    })

    it('应该拒绝少于 8 位的确认密码', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'reset-token',
        newPassword: 'NewPass123',
        confirmPassword: 'New1',
      })
      expect(result.success).toBe(false)
    })
  })
})
