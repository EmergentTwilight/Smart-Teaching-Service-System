/**
 * swagger-jsdoc 类型定义
 * 为 swagger-jsdoc 模块提供 TypeScript 类型支持
 */
declare module 'swagger-jsdoc' {
  interface Options {
    definition: {
      openapi: string
      info: {
        title: string
        version: string
        description?: string
        contact?: {
          name?: string
          email?: string
          url?: string
        }
      }
      servers?: Array<{
        url: string
        description?: string
      }>
      components?: Record<string, unknown>
      tags?: Array<{
        name: string
        description?: string
      }>
      security?: Array<Record<string, string[]>>
      [key: string]: unknown
    }
    apis: string[]
  }

  function swaggerJsdoc(options: Options): object

  export = swaggerJsdoc
}
