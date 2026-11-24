import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverEnvPath = path.resolve(__dirname, '../../.env');
const rootEnvPath = path.resolve(__dirname, '../../../.env');

// Load environment variables (checking both server/.env and root .env)
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath, override: true });
}
dotenv.config();

// Fallback logic for Vercel: If PUBLIC_BASE_URL is missing, use VERCEL_URL
if (!process.env.PUBLIC_BASE_URL && process.env.VERCEL_URL) {
  const vUrl = process.env.VERCEL_URL.trim();
  process.env.PUBLIC_BASE_URL = vUrl.startsWith('http://') || vUrl.startsWith('https://')
    ? vUrl
    : `https://${vUrl}`;
}

// Strip any trailing slash from PUBLIC_BASE_URL
if (process.env.PUBLIC_BASE_URL) {
  process.env.PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL.trim().replace(/\/+$/, '');
}

const envSchema = z.object({
  PORT: z
    .union([z.string(), z.number()])
    .default('5000')
    .transform((val) => (typeof val === 'number' ? val : parseInt(val, 10))),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string({
    required_error: 'MONGODB_URI is required',
  }).min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string({
    required_error: 'JWT_SECRET is required',
  }).min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string({
    required_error: 'JWT_REFRESH_SECRET is required',
  }).min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  ENCRYPTION_KEY: z.string({
    required_error: 'ENCRYPTION_KEY is required',
  }).length(64, 'ENCRYPTION_KEY must be a 64-character hex string (32 bytes)'),
  PUBLIC_BASE_URL: z.string({
    required_error: 'PUBLIC_BASE_URL is required (or set VERCEL_URL on Vercel)',
  }).url('PUBLIC_BASE_URL must be a valid URL').transform((val) => val.replace(/\/+$/, '')),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issuesList = parsed.error.issues
    .map((issue) => `   - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  const errorMessage = `FATAL: Missing or invalid environment variables:\n${issuesList}\n\nPlease check your environment variables against .env.example`;

  console.error(errorMessage);
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(errorMessage);
  }
}

export const env = parsed.success
  ? parsed.data
  : {
      PORT: 5000,
      NODE_ENV: 'test',
      MONGODB_URI: process.env.MONGODB_URI || '',
      JWT_SECRET: process.env.JWT_SECRET || 'test_jwt_secret_at_least_16_characters',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_at_least_16_characters',
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'f6a8e32c813bbd74d39fae6189ef9490351f08cb38b939dc6158f447604ad473',
      PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || 'http://localhost:5000',
      CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    };
