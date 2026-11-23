import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { UserSettings } from '../models/UserSettings.js';
import { Resume } from '../models/Resume.js';
import { JobDescription } from '../models/JobDescription.js';
import { Template } from '../models/Template.js';
import { Email } from '../models/Email.js';
import { TrackingEvent } from '../models/TrackingEvent.js';
import { Campaign } from '../models/Campaign.js';
import { encrypt } from '../services/cryptoService.js';

export async function seedDemoData() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('🌱 Connected to MongoDB for seeding...');

  const demoEmail = 'demo@careermail.pro';
  let user = await User.findOne({ email: demoEmail });

  if (user) {
    console.log('Demo user already exists. Skipping seed.');
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash('Password123!', 12);
  user = await User.create({
    email: demoEmail,
    passwordHash,
    name: 'Alex Mercer',
  });

  // Settings
  await UserSettings.create({
    userId: user._id,
    smtp: {
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      username: 'alex.mercer@ethereal.email',
      fromAddress: 'alex.mercer@ethereal.email',
      fromName: 'Alex Mercer',
    },
    branding: {
      attachmentFilename: 'Alex_Mercer_Senior_Software_Engineer.pdf',
      defaultSignature: 'Best regards,\nAlex Mercer\nSenior Full-Stack Engineer\nhttps://github.com/alex-mercer',
    },
    sending: {
      dailyLimit: 75,
      minDelayMs: 3000,
      maxDelayMs: 8000,
      openTrackingEnabled: true,
      clickTrackingEnabled: true,
      unsubscribeFooterEnabled: true,
    },
  });

  // Create valid sample PDF buffer
  const samplePdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000056 00000 n \n0000000111 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n185\n%%EOF'
  );

  const resume1 = await Resume.create({
    userId: user._id,
    originalName: 'Alex_Mercer_FullStack_Resume.pdf',
    customName: 'Full-Stack & Backend Focus',
    size: samplePdfBuffer.length,
    fileData: samplePdfBuffer,
    extractedText: `Alex Mercer
Senior Full-Stack Engineer | 6+ years experience
Location: San Francisco, CA | Email: alex.mercer@example.com | Portfolio: https://github.com/alex-mercer

SUMMARY:
Results-driven software engineer specializing in scalable Node.js microservices, distributed systems, and modern React architectures. Reduced API response latency by 42% for a fintech client handling 50k RPS.

EXPERIENCE:
Staff Software Engineer — Horizon Cloud Systems (2022 - Present)
- Architected event-driven asynchronous notification and analytics pipeline processing 15M daily messages using Kafka, Express, and Redis.
- Redesigned MongoDB multi-tenant query layer, cutting P99 database latency from 320ms to 48ms.
- Mentored a squad of 8 engineers and introduced automated integration testing achieving 94% coverage.

Senior Full-Stack Engineer — TechFlow Labs (2019 - 2022)
- Built customer-facing analytics dashboard in React, Tailwind, and Recharts serving 120k MAU.
- Engineered resilient SMTP and webhook tracking engine delivering 99.8% inbox placement.

SKILLS:
Node.js, Express, React, TypeScript, MongoDB, PostgreSQL, Redis, Docker, AWS, Kafka, Tailwind CSS`,
    isDefault: true,
  });

  const resume2 = await Resume.create({
    userId: user._id,
    originalName: 'Alex_Mercer_Frontend_Resume.pdf',
    customName: 'Frontend & Design System Focus',
    size: samplePdfBuffer.length,
    fileData: samplePdfBuffer,
    extractedText: `Alex Mercer
Senior Frontend Engineer & UI Architect
Specializing in React 18, Tailwind CSS, high-performance web applications, and accessible design systems.`,
    isDefault: false,
  });

  // Sample JDs
  const jd1 = await JobDescription.create({
    userId: user._id,
    title: 'Lead Full-Stack Engineer',
    company: 'Stripe',
    jobUrl: 'https://stripe.com/jobs/lead-full-stack',
    recipientName: 'Sarah Jenkins',
    recipientPosition: 'Engineering Director',
    recipientEmail: 'sarah.jenkins@example.com',
    content: `Stripe is seeking a Lead Full-Stack Engineer to scale our Merchant Outreach & Integration suite.
You will lead architecture for real-time tracking pipelines, optimize MongoDB and Postgres queries for high-throughput transactional flows, and build delightful developer interfaces in React.
Requirements:
- 5+ years building distributed backend services in Node.js or Go.
- Deep expertise in database optimization, index tuning, and asynchronous event streams.
- Strong product intuition and UI design sensibility with modern React.`,
    tags: ['Fintech', 'Distributed Systems', 'Stripe'],
    notes: 'Met Sarah briefly at React Summit 2024.',
  });

  // Sample Templates
  const tpl1 = await Template.create({
    userId: user._id,
    name: 'Quick High-Impact Project Pitch',
    subject: 'Idea on scaling {{company}}\'s distributed query layer',
    body: `Hi {{recipient_name}},

Noticed {{company}} is aggressively expanding the engineering org for {{role}}.

At Horizon Cloud, I spearheaded our MongoDB optimization initiative which cut P99 latency by 42% under 50k RPS peak load. Given {{company}}'s high-throughput architecture, I'd love to share a couple of insights on how we structured indexing and multi-tenant isolation.

Would you be open to a 10-minute chat this Thursday?

Best regards,
Alex Mercer`,
    tags: ['Outreach', 'Engineering'],
    isDefault: true,
  });

  // Sample Emails with tracking metrics for beautiful dashboard demo
  const email1 = await Email.create({
    userId: user._id,
    resumeId: resume1._id,
    to: 'sarah.jenkins@example.com',
    recipientName: 'Sarah Jenkins',
    company: 'Stripe',
    role: 'Lead Full-Stack Engineer',
    subject: 'Scaling Stripe\'s merchant data pipeline: quick thought',
    body: `Hi Sarah,

Saw Stripe's posting for the Lead Full-Stack position focusing on high-throughput merchant pipelines.

At Horizon Cloud Systems, I architected our distributed event pipeline that scales across 15M messages daily, while reducing P99 query latency from 320ms down to 48ms in MongoDB. Having navigated similar multi-tenant throughput constraints, I would love to bring this experience to Stripe's merchant platform team.

Are you open to a brief 10-minute introductory conversation sometime next week?

Best regards,
Alex Mercer`,
    bodyHtml: `<p>Hi Sarah,</p><p>Saw Stripe's posting for the Lead Full-Stack position focusing on high-throughput merchant pipelines.</p><p>Best regards,<br>Alex Mercer</p>`,
    bodyText: `Hi Sarah,\n\nSaw Stripe's posting...`,
    status: 'sent',
    trackingId: 'demo_track_stripe_001',
    hasAttachment: true,
    sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    openedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    openCount: 3,
    clickedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    clickCount: 1,
    isReplied: true,
    repliedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    trackedLinks: [
      { linkId: 'link_github', originalUrl: 'https://github.com/alex-mercer', clickCount: 1 }
    ],
  });

  // Tracking events for email1
  await TrackingEvent.create({
    emailId: email1._id,
    userId: user._id,
    type: 'open',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0',
    ipHash: 'demo_ip_hash_01',
    isBot: false,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
  });

  await TrackingEvent.create({
    emailId: email1._id,
    userId: user._id,
    type: 'click',
    linkId: 'link_github',
    destinationUrl: 'https://github.com/alex-mercer',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0',
    ipHash: 'demo_ip_hash_01',
    isBot: false,
    timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000),
  });

  await TrackingEvent.create({
    emailId: email1._id,
    userId: user._id,
    type: 'reply',
    userAgent: 'Manual Toggle',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
  });

  console.log(`✅ Demo data seeded successfully!`);
  console.log(`   Email: ${demoEmail}`);
  console.log(`   Password: Password123!`);

  await mongoose.disconnect();
}

if (process.argv[1].endsWith('seed.js')) {
  seedDemoData().catch(console.error);
}
