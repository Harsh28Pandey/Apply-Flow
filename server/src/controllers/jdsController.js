import { JobDescription } from '../models/JobDescription.js';

export async function listJds(req, res, next) {
  try {
    const jds = await JobDescription.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ jds });
  } catch (err) {
    next(err);
  }
}

export async function createJd(req, res, next) {
  try {
    const { title, company, jobUrl, recipientName, recipientPosition, recipientEmail, content, tags, notes } = req.body;

    if (!title || !company || !content) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Title, company, and content are required.' },
      });
    }

    const jd = await JobDescription.create({
      userId: req.user.id,
      title: title.trim(),
      company: company.trim(),
      jobUrl: (jobUrl || '').trim(),
      recipientName: (recipientName || '').trim(),
      recipientPosition: (recipientPosition || '').trim(),
      recipientEmail: (recipientEmail || '').trim(),
      content: content.trim(),
      tags: Array.isArray(tags) ? tags : [],
      notes: (notes || '').trim(),
    });

    res.status(201).json({ jd });
  } catch (err) {
    next(err);
  }
}

export async function getJd(req, res, next) {
  try {
    const jd = await JobDescription.findOne({ _id: req.params.id, userId: req.user.id });
    if (!jd) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Job description not found.' } });
    }
    res.json({ jd });
  } catch (err) {
    next(err);
  }
}

export async function updateJd(req, res, next) {
  try {
    const { title, company, jobUrl, recipientName, recipientPosition, recipientEmail, content, tags, notes } = req.body;

    const jd = await JobDescription.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      {
        ...(title && { title: title.trim() }),
        ...(company && { company: company.trim() }),
        ...(jobUrl !== undefined && { jobUrl: jobUrl.trim() }),
        ...(recipientName !== undefined && { recipientName: recipientName.trim() }),
        ...(recipientPosition !== undefined && { recipientPosition: recipientPosition.trim() }),
        ...(recipientEmail !== undefined && { recipientEmail: recipientEmail.trim() }),
        ...(content && { content: content.trim() }),
        ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
        ...(notes !== undefined && { notes: notes.trim() }),
      },
      { new: true }
    );

    if (!jd) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Job description not found.' } });
    }

    res.json({ jd });
  } catch (err) {
    next(err);
  }
}

export async function deleteJd(req, res, next) {
  try {
    const jd = await JobDescription.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!jd) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Job description not found.' } });
    }
    res.json({ message: 'Job description deleted successfully.' });
  } catch (err) {
    next(err);
  }
}
