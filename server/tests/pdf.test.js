import { describe, it, expect } from 'vitest';
import { extractTextFromPdf } from '../src/services/pdfService.js';
import { VALID_TEST_PDF } from './helpers/testPdf.js';

describe('PDF Magic Bytes & Size Validation (Section 8 & 9)', () => {
  it('should accept valid PDF starting with %PDF- header and extract text', async () => {
    const result = await extractTextFromPdf(VALID_TEST_PDF);
    expect(result).toBeDefined();
    expect(result.size).toBe(VALID_TEST_PDF.length);
    expect(result.extractedText).toContain('Dummy PDF');
  });

  it('should reject non-PDF file disguised as PDF with 422 HTTP status', async () => {
    // Malicious or fake PDF starting with PNG or plaintext header
    const fakePdfBuffer = Buffer.from('FAKE-PDF-HEADER not starting with %PDF-');

    await expect(extractTextFromPdf(fakePdfBuffer)).rejects.toMatchObject({
      statusCode: 422,
      errorCode: 'UNPROCESSABLE_ENTITY',
    });
  });

  it('should reject empty or tiny buffer (< 5 bytes) with 422 status', async () => {
    const tinyBuffer = Buffer.from('%PD');

    await expect(extractTextFromPdf(tinyBuffer)).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it('should reject file exceeding 10MB limit with 413 HTTP status', async () => {
    // 10MB + 1 byte
    const largeBuffer = Buffer.alloc(10 * 1024 * 1024 + 1);
    largeBuffer.write('%PDF-1.4');

    await expect(extractTextFromPdf(largeBuffer)).rejects.toMatchObject({
      statusCode: 413,
      errorCode: 'PAYLOAD_TOO_LARGE',
    });
  });
});
