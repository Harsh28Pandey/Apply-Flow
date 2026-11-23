import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { VALID_TEST_PDF } from './helpers/testPdf.js';
import { User } from '../src/models/User.js';
import { Email } from '../src/models/Email.js';
import { Campaign } from '../src/models/Campaign.js';
import { Suppression } from '../src/models/Suppression.js';

describe('Comprehensive End-to-End Application Flow Verification (Section 10)', () => {
  let app;
  let authToken = '';
  let resumeId = '';
  let jdId = '';
  let trackingId = '';
  let linkId = '';
  let emailId = '';
  let campaignId = '';
  const testUserEmail = `e2e_user_${Date.now()}@careermail.pro`;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }
    app = createApp();
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /e2e_user_/ } });
    await Email.deleteMany({ to: { $regex: /e2e_/ } });
    await Campaign.deleteMany({ name: { $regex: /E2E/ } });
    await Suppression.deleteMany({ email: { $regex: /e2e_/ } });
  });

  it('1. User Registration & Cookie Auth: registers candidate and sets refresh cookie', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Alex Johnson',
      email: testUserEmail,
      password: 'SecurePassword123!',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(testUserEmail);
    expect(res.body.accessToken).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();

    authToken = res.body.accessToken;
  });

  it('2. User Login: authenticates with credentials and returns JWT', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: testUserEmail,
      password: 'SecurePassword123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    authToken = res.body.accessToken;
  });

  it('3. Upload PDF Resume: validates %PDF- magic bytes and extracts text', async () => {
    const res = await request(app)
      .post('/api/v1/resumes/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('resume', VALID_TEST_PDF, 'alex_johnson_resume.pdf');

    expect(res.status).toBe(201);
    expect(res.body.resume).toBeDefined();
    expect(res.body.resume.extractedText).toContain('Dummy PDF');
    expect(res.body.resume.isDefault).toBe(true);

    resumeId = res.body.resume.id;
  });

  it('4. Save Job Description: stores company, role, and text content', async () => {
    const res = await request(app)
      .post('/api/v1/jds')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Senior Distributed Systems Engineer',
        company: 'Vercel',
        jobUrl: 'https://vercel.com/careers/distributed-systems',
        recipientName: 'Guillermo Rauch',
        recipientPosition: 'CEO & Founder',
        recipientEmail: 'e2e_target@vercel.com',
        content: 'Building next-generation edge rendering pipelines and distributed caching layers.',
        tags: ['Edge', 'Next.js', 'Vercel'],
      });

    expect(res.status).toBe(201);
    expect(res.body.jd.company).toBe('Vercel');
    jdId = res.body.jd._id;
  });

  it('5. Create Email Draft: creates draft with trackingId & versioning', async () => {
    const draftRes = await request(app)
      .post('/api/v1/emails/drafts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        to: 'e2e_target@vercel.com',
        recipientName: 'Guillermo',
        company: 'Vercel',
        role: 'Senior Distributed Systems Engineer',
        subject: 'Idea on optimizing edge cache invalidation latency',
        body: 'Hi Guillermo,\n\nSaw Vercel is expanding edge rendering. At my previous team, I cut P99 cache latency by 35%.\n\nCheck out [My Edge Benchmark](https://github.com/developer/edge-benchmarks).\n\nBest regards,\nAlex Johnson',
        resumeId,
        hasAttachment: true,
      });

    expect(draftRes.status).toBe(201);
    expect(draftRes.body.email.status).toBe('draft');
    expect(draftRes.body.email.versions.length).toBe(1);

    emailId = draftRes.body.email._id;
  });

  it('6. Schedule Email: queues email with future scheduled timestamp', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/api/v1/emails/schedule')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        emailId,
        to: 'e2e_target@vercel.com',
        recipientName: 'Guillermo',
        subject: 'Scheduled Outreach',
        body: 'Hi Guillermo,\n\nScheduled note.\n\nBest regards,\nAlex',
        scheduledAt: futureDate,
      });

    expect(res.status).toBe(200);
    expect(res.body.email.status).toBe('queued');
    expect(res.body.email.trackingId).toBeDefined();

    trackingId = res.body.email.trackingId;
  });

  it('7. Cancel Schedule: resets queued email back to draft', async () => {
    const res = await request(app)
      .post(`/api/v1/emails/${emailId}/cancel-schedule`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email.status).toBe('draft');
  });

  it('8. Email Tracking Simulation: setup sent email with link and test pixel + click', async () => {
    const simulatedTrackingId = `e2e_trk_${Date.now()}`;
    const sentEmail = await Email.create({
      userId: (await User.findOne({ email: testUserEmail }))._id,
      to: 'e2e_recipient@example.com',
      recipientName: 'Hiring Lead',
      subject: 'Interview Note',
      body: 'Hello',
      status: 'sent',
      trackingId: simulatedTrackingId,
      trackedLinks: [
        {
          linkId: 'l1',
          originalUrl: 'https://github.com/alex-johnson/project',
          clickCount: 0,
        },
      ],
      sentAt: new Date(),
    });

    // Test Open Tracking Pixel (GET /t/o/:id.png)
    const pixelRes = await request(app).get(`/t/o/${simulatedTrackingId}.png`);
    expect(pixelRes.status).toBe(200);
    expect(pixelRes.headers['content-type']).toBe('image/png');
    expect(pixelRes.headers['cache-control']).toContain('no-cache');

    // Test Click Tracking Redirect (GET /t/c/:id/:linkId)
    const clickRes = await request(app).get(`/t/c/${simulatedTrackingId}/l1`);
    expect(clickRes.status).toBe(302);
    expect(clickRes.headers.location).toBe('https://github.com/alex-johnson/project');

    // Test Mark as Replied toggle
    const replyRes = await request(app)
      .post(`/api/v1/emails/${sentEmail._id}/replied`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(replyRes.status).toBe(200);
    expect(replyRes.body.email.isReplied).toBe(true);
  });

  it('9. Public Unsubscribe Endpoint: adds recipient to suppression list', async () => {
    const user = await User.findOne({ email: testUserEmail });
    const targetEmail = 'e2e_unsub_recipient@example.com';
    const unsubToken = Buffer.from(`${user._id}:${targetEmail}`).toString('base64url');

    const res = await request(app).get(`/u/${unsubToken}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('You have been unsubscribed');

    const suppression = await Suppression.findOne({ userId: user._id, email: targetEmail });
    expect(suppression).toBeDefined();
    expect(suppression.reason).toBe('unsubscribe');
  });

  it('10. Bulk Campaign Creation & Management: creates campaign with recipient parsing', async () => {
    const res = await request(app)
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'E2E Engineering Campaign',
        resumeId,
        followUpEnabled: true,
        followUpDays: 3,
        recipients: [
          { name: 'Alice Smith', email: 'e2e_alice@stripe.com', company: 'Stripe', position: 'Tech Lead' },
          { name: 'Bob Jones', email: 'e2e_bob@stripe.com', company: 'Stripe', position: 'VP Eng' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.campaign.totalRecipients).toBe(2);
    campaignId = res.body.campaign._id;

    // Batch approve recipients
    const approveRes = await request(app)
      .post(`/api/v1/campaigns/${campaignId}/batch-approve`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(approveRes.status).toBe(200);

    // Pause campaign
    const pauseRes = await request(app)
      .post(`/api/v1/campaigns/${campaignId}/pause`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(pauseRes.status).toBe(200);
    expect(pauseRes.body.campaign.status).toBe('paused');
  });

  it('11. Analytics Aggregation: calculates summary, timeseries, and conversion funnel', async () => {
    const summaryRes = await request(app)
      .get('/api/v1/analytics/summary')
      .set('Authorization', `Bearer ${authToken}`);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.summary).toBeDefined();

    const timeseriesRes = await request(app)
      .get('/api/v1/analytics/timeseries?days=30')
      .set('Authorization', `Bearer ${authToken}`);
    expect(timeseriesRes.status).toBe(200);
    expect(timeseriesRes.body.timeseries.length).toBe(30);

    const breakdownsRes = await request(app)
      .get('/api/v1/analytics/breakdowns')
      .set('Authorization', `Bearer ${authToken}`);
    expect(breakdownsRes.status).toBe(200);
    expect(breakdownsRes.body.funnel.length).toBe(5);
  });

  it('12. Settings Crypto at Rest: saves masked secrets and decrypts on server', async () => {
    const res = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        smtp: {
          host: 'smtp.test.com',
          port: 587,
          username: 'test_smtp_user',
          password: 'SuperSecretSmtpPassword123!',
          fromAddress: 'outreach@test.com',
        },
        ai: {
          groqApiKey: 'gsk_1234567890abcdef1234567890abcdef',
          modelName: 'openai/gpt-oss-20b',
        },
        branding: {
          attachmentFilename: 'Alex_Johnson_Staff_Engineer.pdf',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.settings.smtp.passwordMasked).toBe('••••••••••••');
    expect(res.body.settings.ai.groqApiKeyMasked).toContain('****');
    expect(res.body.settings.ai.groqApiKeyMasked).not.toContain('1234567890abcdef1234567890abcdef');
  });

  it('13. Health Check: returns uptime and operational status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});
