import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform(val => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be a 64-character hex string (32 bytes)'),
  PUBLIC_BASE_URL: z.string().url('PUBLIC_BASE_URL must be a valid URL'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ FATAL: Missing or invalid environment variables:');
  parsed.error.issues.forEach(issue => {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  });
  console.error('\nPlease check your .env file against .env.example');
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
}

export const env = parsed.success ? parsed.data : {
  PORT: 5000,
  NODE_ENV: 'test',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/careermail_pro_test',
  JWT_SECRET: process.env.JWT_SECRET || 'test_jwt_secret_at_least_16_characters',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_at_least_16_characters',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'f6a8e32c813bbd74d39fae6189ef9490351f08cb38b939dc6158f447604ad473',
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || 'http://localhost:5000',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};
