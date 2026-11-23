import pdfParse from 'pdf-parse';

/**
 * Validates PDF magic bytes (%PDF-), enforces 10MB size limit,
 * and extracts text content from PDF buffer.
 */
export async function extractTextFromPdf(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    const error = new Error('No PDF file buffer provided.');
    error.statusCode = 400;
    error.errorCode = 'BAD_REQUEST';
    throw error;
  }

  // 10MB limit check (10 * 1024 * 1024 = 10,485,760 bytes)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (buffer.length > MAX_SIZE) {
    const error = new Error('PDF file size exceeds the 10MB limit.');
    error.statusCode = 413;
    error.errorCode = 'PAYLOAD_TOO_LARGE';
    throw error;
  }

  // Magic bytes check: "%PDF-" in ASCII is [0x25, 0x50, 0x44, 0x46, 0x2D]
  if (buffer.length < 5) {
    const error = new Error('File is too small to be a valid PDF.');
    error.statusCode = 422;
    error.errorCode = 'UNPROCESSABLE_ENTITY';
    throw error;
  }

  const magicHeader = buffer.slice(0, 5).toString('ascii');
  if (magicHeader !== '%PDF-') {
    const error = new Error('Invalid PDF file format. The file must begin with "%PDF-" magic bytes.');
    error.statusCode = 422;
    error.errorCode = 'UNPROCESSABLE_ENTITY';
    throw error;
  }

  try {
    const data = await pdfParse(buffer);
    const cleanedText = (data.text || '').replace(/\r\n/g, '\n').trim();

    return {
      extractedText: cleanedText,
      pageCount: data.numpages || 1,
      size: buffer.length,
    };
  } catch (err) {
    const error = new Error(`Failed to parse PDF document: ${err.message}`);
    error.statusCode = 422;
    error.errorCode = 'PDF_PARSE_FAILED';
    throw error;
  }
}
