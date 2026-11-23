import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { JobDescription } from '../src/models/JobDescription.js';
import { Resume } from '../src/models/Resume.js';
import { VALID_TEST_PDF } from './helpers/testPdf.js';

describe('Multi-User Strict Data Isolation (Anti-IDOR)', () => {
  let app;
  let userAToken = '';
  let userBToken = '';
  let userAJdId = '';
  let userAResumeId = '';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }
    app = createApp();

    // Register User A
    const resA = await request(app).post('/api/v1/auth/register').send({
      email: `user_a_${Date.now()}@example.com`,
      password: 'Password123!',
      name: 'User A',
    });
    userAToken = resA.body.accessToken;

    // Register User B
    const resB = await request(app).post('/api/v1/auth/register').send({
      email: `user_b_${Date.now()}@example.com`,
      password: 'Password123!',
      name: 'User B',
    });
    userBToken = resB.body.accessToken;

    // User A creates a Job Description
    const jdRes = await request(app)
      .post('/api/v1/jds')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Secret Senior Role',
        company: 'Confidential Corp',
        content: 'Must have top secret clearance.',
      });
    userAJdId = jdRes.body.jd._id;

    // User A uploads a Resume
    const resumeRes = await request(app)
      .post('/api/v1/resumes/upload')
      .set('Authorization', `Bearer ${userAToken}`)
      .attach('resume', VALID_TEST_PDF, 'user_a_resume.pdf');
    userAResumeId = resumeRes.body.resume.id;
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /user_[ab]_/ } });
    await JobDescription.deleteMany({ company: 'Confidential Corp' });
    await Resume.deleteMany({ originalName: 'user_a_resume.pdf' });
  });

  it('User B CANNOT access User A job description (returns 404)', async () => {
    const res = await request(app)
      .get(`/api/v1/jds/${userAJdId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(404);
  });

  it('User B CANNOT update or mutate User A job description (returns 404)', async () => {
    const res = await request(app)
      .put(`/api/v1/jds/${userAJdId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ title: 'Hacked Title' });

    expect(res.status).toBe(404);
  });

  it('User B CANNOT delete User A job description (returns 404)', async () => {
    const res = await request(app)
      .delete(`/api/v1/jds/${userAJdId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(404);
  });

  it('User B CANNOT download User A resume (returns 404)', async () => {
    const res = await request(app)
      .get(`/api/v1/resumes/${userAResumeId}/download`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(404);
  });

  it('User B resume list does NOT include User A resume', async () => {
    const res = await request(app)
      .get('/api/v1/resumes')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(200);
    const hasUserAResume = res.body.resumes.some(r => r.id === userAResumeId);
    expect(hasUserAResume).toBe(false);
  });
});
