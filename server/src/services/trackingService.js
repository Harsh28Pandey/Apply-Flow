import EventEmitter from 'events';
import { Email } from '../models/Email.js';
import { TrackingEvent } from '../models/TrackingEvent.js';
import { Suppression } from '../models/Suppression.js';
import { hashIp } from './cryptoService.js';
import { detectBot } from '../utils/botDetector.js';
import { logger } from '../utils/logger.js';

// Event emitter for real-time SSE updates across tabs/clients
export const trackingEventsEmitter = new EventEmitter();

// 1x1 transparent GIF buffer (43 bytes)
export const TRANSPARENT_GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// 1x1 transparent PNG buffer (68 bytes)
export const TRANSPARENT_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

/**
 * Handle open tracking event
 */
export async function handleOpenTracking({ trackingId, userAgent, ip, headers }) {
  if (!trackingId) return null;

  const email = await Email.findOne({ trackingId });
  if (!email) {
    logger.warn({ trackingId }, 'Open tracking hit for unknown trackingId');
    return null;
  }

  const { isBot, botReason } = detectBot(userAgent, headers);
  const ipHashed = hashIp(ip);

  // Record tracking event in database
  const event = await TrackingEvent.create({
    emailId: email._id,
    userId: email.userId,
    type: 'open',
    userAgent: userAgent ? userAgent.slice(0, 500) : '',
    ipHash: ipHashed,
    isBot,
    botReason,
    timestamp: new Date(),
  });

  // Only update email open metrics if not a bot (or update count while keeping accurate stats)
  if (!isBot) {
    email.openCount = (email.openCount || 0) + 1;
    if (!email.openedAt) {
      email.openedAt = new Date();
    }
    await email.save();
  }

  // Emit real-time event for SSE
  trackingEventsEmitter.emit('event', {
    userId: email.userId.toString(),
    type: 'open',
    emailId: email._id.toString(),
    isBot,
    botReason,
    timestamp: event.timestamp,
  });

  return { email, event, isBot };
}

/**
 * Handle click tracking event and return the destination URL
 */
export async function handleClickTracking({ trackingId, linkId, userAgent, ip, headers }) {
  if (!trackingId || !linkId) return null;

  const email = await Email.findOne({ trackingId });
  if (!email) {
    return null;
  }

  // Find destination link from trackedLinks array
  const linkItem = email.trackedLinks.find(l => l.linkId === linkId);
  if (!linkItem || !linkItem.originalUrl) {
    logger.warn({ trackingId, linkId }, 'Click tracking linkId not found in email trackedLinks');
    return null;
  }

  const destinationUrl = linkItem.originalUrl;
  // Ensure destination URL is valid https (prevents open redirects)
  if (!destinationUrl.startsWith('https://')) {
    logger.warn({ destinationUrl }, 'Refusing redirect to non-https URL');
    return null;
  }

  const { isBot, botReason } = detectBot(userAgent, headers);
  const ipHashed = hashIp(ip);

  const event = await TrackingEvent.create({
    emailId: email._id,
    userId: email.userId,
    type: 'click',
    linkId,
    destinationUrl,
    userAgent: userAgent ? userAgent.slice(0, 500) : '',
    ipHash: ipHashed,
    isBot,
    botReason,
    timestamp: new Date(),
  });

  if (!isBot) {
    linkItem.clickCount = (linkItem.clickCount || 0) + 1;
    email.clickCount = (email.clickCount || 0) + 1;
    if (!email.clickedAt) {
      email.clickedAt = new Date();
    }
    await email.save();
  }

  // Emit real-time SSE update
  trackingEventsEmitter.emit('event', {
    userId: email.userId.toString(),
    type: 'click',
    emailId: email._id.toString(),
    linkId,
    destinationUrl,
    isBot,
    botReason,
    timestamp: event.timestamp,
  });

  return destinationUrl;
}

/**
 * Handle unsubscribe request
 */
export async function handleUnsubscribe(token) {
  // Token format: base64 encoded "userId:email"
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [userId, email] = decoded.split(':');
    if (!userId || !email) {
      throw new Error('Invalid token structure');
    }

    const cleanEmail = email.trim().toLowerCase();

    // Add to suppression list
    await Suppression.findOneAndUpdate(
      { userId, email: cleanEmail },
      { userId, email: cleanEmail, reason: 'unsubscribe' },
      { upsert: true, new: true }
    );

    return { success: true, email: cleanEmail };
  } catch (err) {
    throw new Error('Invalid or expired unsubscribe link');
  }
}

/**
 * Generate unsubscribe token for a recipient
 */
export function generateUnsubscribeToken(userId, email) {
  return Buffer.from(`${userId}:${email.toLowerCase().trim()}`).toString('base64url');
}
