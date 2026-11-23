import { describe, it, expect } from 'vitest';
import { extractSignature, preserveUserSignature } from '../src/utils/signatureUtils.js';
import { markdownToSafeHtml, markdownToPlainText } from '../src/utils/markdownToHtml.js';

describe('AI Signature Preservation & Safe Markdown Rendering (Section 9)', () => {
  it('should extract and preserve user signature block from "Best regards," onward', () => {
    const originalEmail = `Hi Sarah,

Saw the opening for Lead Engineer at Stripe. I scaled a distributed pipeline to 15M messages daily.

Would love to chat for 10 minutes next week.

Best regards,
Alex Mercer
Staff Software Engineer
https://github.com/alex-mercer`;

    const { signature } = extractSignature(originalEmail);
    expect(signature).toBe('Best regards,\nAlex Mercer\nStaff Software Engineer\nhttps://github.com/alex-mercer');

    const newAiBody = `Hi Sarah,

Refined project body content.

Best,
AI Generated Signature Name`;

    const merged = preserveUserSignature(newAiBody, signature);
    expect(merged).toContain('Refined project body content.');
    expect(merged).toContain('Alex Mercer');
    expect(merged).not.toContain('AI Generated Signature Name');
  });

  it('should convert markdown to safe HTML and escape potential XSS', () => {
    const unsafeMarkdown = `Hello <script>alert("xss")</script> **Bold Achievement** and [Portfolio](https://example.com).`;
    const safeHtml = markdownToSafeHtml(unsafeMarkdown);

    expect(safeHtml).not.toContain('<script>');
    expect(safeHtml).toContain('&lt;script&gt;');
    expect(safeHtml).toContain('<strong>Bold Achievement</strong>');
    expect(safeHtml).toContain('<a href="https://example.com"');
  });

  it('should convert markdown to clean plain-text alternative', () => {
    const markdown = `Check out my **recent project** at [My Work](https://work.com/portfolio).`;
    const plainText = markdownToPlainText(markdown);

    expect(plainText).toBe('Check out my recent project at My Work (https://work.com/portfolio).');
  });
});
