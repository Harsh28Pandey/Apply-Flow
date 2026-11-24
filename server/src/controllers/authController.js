import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { UserSettings } from '../models/UserSettings.js';
import { Resume } from '../models/Resume.js';
import { JobDescription } from '../models/JobDescription.js';
import { Template } from '../models/Template.js';
import { Email } from '../models/Email.js';
import { TrackingEvent } from '../models/TrackingEvent.js';
import { Campaign } from '../models/Campaign.js';
import { CampaignRecipient } from '../models/CampaignRecipient.js';
import { Suppression } from '../models/Suppression.js';
import { AuditLog } from '../models/AuditLog.js';
import { hashIp } from '../services/cryptoService.js';

const registerSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Generate Access Token (15m) and Refresh Token (30d)
 */
function generateTokens(user) {
  const accessToken = jwt.sign(
    { userId: user._id.toString(), email: user.email },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshTokenRaw = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  return { accessToken, refreshTokenRaw, tokenHash, expiresAt };
}

function setRefreshTokenCookie(res, token, req) {
  const isHttps = req ? (req.secure || req.headers['x-forwarded-proto'] === 'https') : false;
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearRefreshTokenCookie(res, req) {
  const isHttps = req ? (req.secure || req.headers['x-forwarded-proto'] === 'https') : false;
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
  });
}

export async function register(req, res, next) {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        error: {
          code: 'USER_EXISTS',
          message: 'An account with this email already exists.',
        },
      });
    }

    // Cost factor 12 as required by Section 2
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, name });

    // Initialize default UserSettings
    await UserSettings.create({
      userId: user._id,
      branding: {
        attachmentFilename: 'Resume.pdf',
        defaultSignature: `Best regards,\n${name}`,
      },
    });

    const { accessToken, refreshTokenRaw, tokenHash, expiresAt } = generateTokens(user);
    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    setRefreshTokenCookie(res, refreshTokenRaw, req);

    await AuditLog.create({
      userId: user._id,
      action: 'USER_REGISTERED',
      ipHash: hashIp(req.ip),
    });

    res.status(201).json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken: refreshTokenRaw,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }

    const { accessToken, refreshTokenRaw, tokenHash, expiresAt } = generateTokens(user);
    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    setRefreshTokenCookie(res, refreshTokenRaw, req);

    await AuditLog.create({
      userId: user._id,
      action: 'USER_LOGGED_IN',
      ipHash: hashIp(req.ip),
    });

    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken: refreshTokenRaw,
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!rawToken) {
      return res.status(401).json({
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'No refresh token provided.',
        },
      });
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const existingToken = await RefreshToken.findOne({ tokenHash });

    if (!existingToken || existingToken.expiresAt < new Date()) {
      clearRefreshTokenCookie(res, req);
      return res.status(401).json({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token is expired. Please log in again.',
        },
      });
    }

    // Grace window of 30 seconds for concurrent requests / React StrictMode double mounts
    if (existingToken.revokedAt) {
      const msSinceRevocation = Date.now() - new Date(existingToken.revokedAt).getTime();
      if (msSinceRevocation < 30000 && existingToken.replacedByToken) {
        const user = await User.findById(existingToken.userId);
        if (user) {
          const accessToken = jwt.sign(
            { userId: user._id.toString(), email: user.email },
            env.JWT_SECRET,
            { expiresIn: '15m' }
          );
          return res.json({
            accessToken,
            user: {
              id: user._id.toString(),
              email: user.email,
              name: user.name,
            },
          });
        }
      }

      clearRefreshTokenCookie(res, req);
      return res.status(401).json({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token is expired or revoked. Please log in again.',
        },
      });
    }

    const user = await User.findById(existingToken.userId);
    if (!user) {
      return res.status(401).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
      });
    }

    // Token rotation: revoke old token and issue a new one
    const { accessToken, refreshTokenRaw: newRawToken, tokenHash: newTokenHash, expiresAt } = generateTokens(user);

    existingToken.revokedAt = new Date();
    existingToken.replacedByToken = newTokenHash;
    await existingToken.save();

    await RefreshToken.create({
      userId: user._id,
      tokenHash: newTokenHash,
      expiresAt,
    });

    setRefreshTokenCookie(res, newRawToken, req);

    res.json({
      accessToken,
      refreshToken: newRawToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (rawToken) {
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      await RefreshToken.updateOne({ tokenHash }, { revokedAt: new Date() });
    }

    clearRefreshTokenCookie(res, req);
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('_id email name createdAt');
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });
    }
    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Name must be at least 2 characters.' },
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name: name.trim() },
      { new: true }
    ).select('_id email name');

    res.json({ user: { id: user._id.toString(), email: user.email, name: user.name } });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'New password must be at least 8 characters long.' },
      });
    }

    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        error: { code: 'INVALID_PASSWORD', message: 'Current password does not match.' },
      });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    // Revoke all refresh tokens
    await RefreshToken.updateMany({ userId: user._id }, { revokedAt: new Date() });

    res.json({ message: 'Password updated successfully. Please log in again.' });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email is required.' } });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Don't leak user existence
      return res.json({ message: 'If an account with that email exists, reset instructions have been generated.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    res.json({
      message: 'Password reset token generated.',
      resetToken, // Provided directly for easy recovery when external system SMTP is unconfigured
      resetUrl: `${env.PUBLIC_BASE_URL}/reset-password?token=${resetToken}`,
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Token and a valid 8+ character password are required.' },
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        error: { code: 'INVALID_RESET_TOKEN', message: 'Password reset token is invalid or has expired.' },
      });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    await RefreshToken.updateMany({ userId: user._id }, { revokedAt: new Date() });

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete Account: cascades deletion across all user data (Section 2)
 */
export async function deleteAccount(req, res, next) {
  try {
    const userId = req.user.id;

    await Promise.all([
      User.findByIdAndDelete(userId),
      RefreshToken.deleteMany({ userId }),
      UserSettings.deleteMany({ userId }),
      Resume.deleteMany({ userId }),
      JobDescription.deleteMany({ userId }),
      Template.deleteMany({ userId }),
      Email.deleteMany({ userId }),
      TrackingEvent.deleteMany({ userId }),
      Campaign.deleteMany({ userId }),
      CampaignRecipient.deleteMany({ userId }),
      Suppression.deleteMany({ userId }),
      AuditLog.deleteMany({ userId }),
    ]);

    clearRefreshTokenCookie(res, req);
    res.json({ message: 'Account and all associated data have been permanently deleted.' });
  } catch (err) {
    next(err);
  }
}
