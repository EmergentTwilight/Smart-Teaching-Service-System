/**
 * Swagger/OpenAPI 配置
 * API 文档生成和展示配置
 */
import swaggerJsdoc from 'swagger-jsdoc'

/**
 * Swagger 配置选项类型
 */
interface SwaggerOptions {
  definition: {
    openapi: string
    info: {
      title: string
      version: string
      description?: string
      contact?: {
        name?: string
      }
    }
    servers?: Array<{
      url: string
      description?: string
    }>
    components?: {
      securitySchemes?: Record<string, unknown>
      schemas?: Record<string, unknown>
    }
    tags?: Array<{
      name: string
      description?: string
    }>
  }
  apis: string[]
}

/**
 * Swagger 配置选项
 */
const options: SwaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'STSS API 文档',
      version: '1.0.0',
      description: '智慧教学服务系统 API 接口文档',
      contact: {
        name: 'STSS Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '开发服务器',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // 通用响应结构
        ApiResponse: {
          type: 'object',
          properties: {
            code: { type: 'integer', example: 200 },
            message: { type: 'string', example: 'Success' },
            data: { type: 'object' },
          },
        },
        // 分页响应结构
        PaginatedResponse: {
          type: 'object',
          properties: {
            code: { type: 'integer', example: 200 },
            message: { type: 'string', example: 'Success' },
            data: {
              type: 'object',
              properties: {
                items: { type: 'array', items: {} },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer' },
                    pageSize: { type: 'integer' },
                    total: { type: 'integer' },
                    totalPages: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
        // 错误响应
        ErrorResponse: {
          type: 'object',
          properties: {
            code: { type: 'integer', example: 400 },
            message: { type: 'string', example: '错误信息' },
          },
        },
        // 用户信息
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            realName: { type: 'string' },
            phone: { type: 'string' },
            avatarUrl: { type: 'string' },
            gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'] },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'BANNED'] },
            roles: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        // 登录响应
        LoginResponse: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            expiresIn: { type: 'integer' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        // 院系信息
        Department: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            code: { type: 'string' },
            description: { type: 'string' },
          },
        },
        // 课程信息
        Course: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            code: { type: 'string' },
            name: { type: 'string' },
            credits: { type: 'number' },
            hours: { type: 'integer' },
            courseType: { type: 'string', enum: ['REQUIRED', 'ELECTIVE', 'GENERAL'] },
            category: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: '认证相关接口' },
      { name: 'Users', description: '用户管理接口' },
      { name: 'Departments', description: '院系管理接口' },
      { name: 'Courses', description: '课程管理接口' },
    ],
  },
  // 扫描所有路由文件中的 JSDoc 注释
  apis: ['./src/modules/*/*.routes.ts', './src/modules/*/*.controller.ts'],
}

/**
 * Swagger 文档规范
 */
export const swaggerSpec = swaggerJsdoc(options)
