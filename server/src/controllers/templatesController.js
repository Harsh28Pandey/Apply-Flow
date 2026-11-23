import { Template } from '../models/Template.js';

export async function listTemplates(req, res, next) {
  try {
    const templates = await Template.find({ userId: req.user.id }).sort({ isDefault: -1, createdAt: -1 });
    res.json({ templates });
  } catch (err) {
    next(err);
  }
}

export async function createTemplate(req, res, next) {
  try {
    const { name, subject, body, tags, isDefault } = req.body;
    if (!name || !subject || !body) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Name, subject, and body are required.' },
      });
    }

    if (isDefault) {
      await Template.updateMany({ userId: req.user.id }, { isDefault: false });
    }

    const template = await Template.create({
      userId: req.user.id,
      name: name.trim(),
      subject: subject.trim(),
      body: body.trim(),
      tags: Array.isArray(tags) ? tags : [],
      isDefault: !!isDefault,
    });

    res.status(201).json({ template });
  } catch (err) {
    next(err);
  }
}

export async function getTemplate(req, res, next) {
  try {
    const template = await Template.findOne({ _id: req.params.id, userId: req.user.id });
    if (!template) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Template not found.' } });
    }
    res.json({ template });
  } catch (err) {
    next(err);
  }
}

export async function updateTemplate(req, res, next) {
  try {
    const { name, subject, body, tags, isDefault } = req.body;

    if (isDefault) {
      await Template.updateMany({ userId: req.user.id }, { isDefault: false });
    }

    const template = await Template.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      {
        ...(name && { name: name.trim() }),
        ...(subject && { subject: subject.trim() }),
        ...(body && { body: body.trim() }),
        ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
        ...(isDefault !== undefined && { isDefault: !!isDefault }),
      },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Template not found.' } });
    }

    res.json({ template });
  } catch (err) {
    next(err);
  }
}

export async function deleteTemplate(req, res, next) {
  try {
    const template = await Template.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!template) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Template not found.' } });
    }
    res.json({ message: 'Template deleted successfully.' });
  } catch (err) {
    next(err);
  }
}
