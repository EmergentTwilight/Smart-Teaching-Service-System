import 'dotenv/config'

export default {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'stss-super-secret-jwt-key-2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
}
