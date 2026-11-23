import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

// Ensure 32-byte key buffer
const keyBuffer = Buffer.from(env.ENCRYPTION_KEY, 'hex');

/**
 * Encrypt a plain text string using AES-256-GCM.
 * Output format: "iv:authTag:ciphertext" (all in hex)
 */
export function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return null;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }
    const [ivHex, authTagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed: invalid key or corrupted payload');
  }
}

/**
 * Mask sensitive string for UI display.
 * E.g. "gsk_1234567890abcdef" -> "gsk_****cdef"
 */
export function maskSecret(secret, prefixLen = 4, suffixLen = 4) {
  if (!secret) return '';
  if (secret.length <= prefixLen + suffixLen) return '********';
  const prefix = secret.slice(0, prefixLen);
  const suffix = secret.slice(-suffixLen);
  return `${prefix}****${suffix}`;
}

/**
 * Hash IP using SHA-256 for privacy in tracking events.
 */
export function hashIp(ip) {
  if (!ip) return 'unknown';
  return crypto.createHash('sha256').update(ip + env.JWT_SECRET).digest('hex').slice(0, 16);
}
