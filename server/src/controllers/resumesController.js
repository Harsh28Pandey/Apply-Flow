import { Resume } from '../models/Resume.js';
import { extractTextFromPdf } from '../services/pdfService.js';

export async function uploadResume(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        error: { code: 'NO_FILE_UPLOADED', message: 'Please select a PDF resume to upload.' },
      });
    }

    // PDF validation & extraction (validates %PDF- magic bytes and 10MB limit)
    const { extractedText, size } = await extractTextFromPdf(req.file.buffer);

    const customName = (req.body.customName || req.file.originalname.replace(/\.[^/.]+$/, '')).trim();

    // Check if user has any existing resumes
    const existingCount = await Resume.countDocuments({ userId: req.user.id });
    const isDefault = existingCount === 0 || req.body.isDefault === 'true' || req.body.isDefault === true;

    if (isDefault) {
      await Resume.updateMany({ userId: req.user.id }, { isDefault: false });
    }

    const resume = await Resume.create({
      userId: req.user.id,
      originalName: req.file.originalname,
      customName,
      mimeType: 'application/pdf',
      size,
      fileData: req.file.buffer,
      extractedText,
      isDefault,
    });

    res.status(201).json({
      resume: {
        id: resume._id.toString(),
        originalName: resume.originalName,
        customName: resume.customName,
        size: resume.size,
        extractedText: resume.extractedText,
        isDefault: resume.isDefault,
        createdAt: resume.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listResumes(req, res, next) {
  try {
    const resumes = await Resume.find({ userId: req.user.id })
      .select('-fileData')
      .sort({ isDefault: -1, createdAt: -1 });

    res.json({
      resumes: resumes.map(r => ({
        id: r._id.toString(),
        originalName: r.originalName,
        customName: r.customName,
        size: r.size,
        extractedText: r.extractedText,
        isDefault: r.isDefault,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getResume(req, res, next) {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user.id }).select('-fileData');
    if (!resume) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resume not found.' } });
    }
    res.json({ resume });
  } catch (err) {
    next(err);
  }
}

export async function downloadResume(req, res, next) {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user.id });
    if (!resume || !resume.fileData) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resume file not found.' } });
    }

    const filename = `${resume.customName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(resume.fileData);
  } catch (err) {
    next(err);
  }
}

export async function renameResume(req, res, next) {
  try {
    const { customName } = req.body;
    if (!customName || customName.trim().length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name cannot be empty.' } });
    }

    const resume = await Resume.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { customName: customName.trim() },
      { new: true }
    ).select('-fileData');

    if (!resume) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resume not found.' } });
    }

    res.json({ resume });
  } catch (err) {
    next(err);
  }
}

export async function updateExtractedText(req, res, next) {
  try {
    const { extractedText } = req.body;
    const resume = await Resume.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { extractedText: extractedText || '' },
      { new: true }
    ).select('-fileData');

    if (!resume) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resume not found.' } });
    }

    res.json({ resume });
  } catch (err) {
    next(err);
  }
}

export async function setDefaultResume(req, res, next) {
  try {
    await Resume.updateMany({ userId: req.user.id }, { isDefault: false });
    const resume = await Resume.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isDefault: true },
      { new: true }
    ).select('-fileData');

    if (!resume) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resume not found.' } });
    }

    res.json({ resume });
  } catch (err) {
    next(err);
  }
}

export async function deleteResume(req, res, next) {
  try {
    const resume = await Resume.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!resume) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resume not found.' } });
    }

    // If deleted resume was default, assign default to another resume if available
    if (resume.isDefault) {
      const nextResume = await Resume.findOne({ userId: req.user.id });
      if (nextResume) {
        nextResume.isDefault = true;
        await nextResume.save();
      }
    }

    res.json({ message: 'Resume deleted successfully.' });
  } catch (err) {
    next(err);
  }
}
