import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { Email } from '../src/models/Email.js';
import { sanitizeHeader } from '../src/services/mailService.js';
import { detectBot } from '../src/utils/botDetector.js';

describe('Mail Sending & Email Tracking Flow', () => {
  let app;
  const testTrackingId = `test_track_${Date.now()}`;
  let testEmailId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }
    app = createApp();

    const dummyUser = new mongoose.Types.ObjectId();
    const email = await Email.create({
      userId: dummyUser,
      to: 'recipient@example.com',
      subject: 'Interview Follow Up',
      body: 'Hello',
      status: 'sent',
      trackingId: testTrackingId,
      trackedLinks: [
        {
          linkId: 'link123',
          originalUrl: 'https://github.com/developer',
          clickCount: 0,
        },
      ],
    });
    testEmailId = email._id;
  });

  afterAll(async () => {
    await Email.deleteMany({ trackingId: testTrackingId });
  });

  it('should reject CR/LF header injection in sanitizeHeader', () => {
    expect(() => sanitizeHeader('Subject\r\nBcc: evil@attacker.com')).toThrow();
    expect(sanitizeHeader('Clean Subject Line')).toBe('Clean Subject Line');
  });

  it('should serve 1x1 transparent PNG pixel on /t/o/:id.png with no-cache headers', async () => {
    const res = await request(app).get(`/t/o/${testTrackingId}.png`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['cache-control']).toContain('no-cache');
    expect(res.headers['cache-control']).toContain('no-store');
  });

  it('should record click and 302 redirect to original https link on /t/c/:id/:linkId', async () => {
    const res = await request(app).get(`/t/c/${testTrackingId}/link123`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://github.com/developer');
  });

  it('should detect bot / prefetch user agents accurately', () => {
    const googleBot = detectBot('Mozilla/5.0 GoogleImageProxy');
    expect(googleBot.isBot).toBe(true);
    expect(googleBot.botReason).toBe('Google Image Proxy');

    const mimecastBot = detectBot('Mozilla/5.0 (Windows NT 10.0) Mimecast Security');
    expect(mimecastBot.isBot).toBe(true);

    const normalUser = detectBot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    expect(normalUser.isBot).toBe(false);
  });
});
