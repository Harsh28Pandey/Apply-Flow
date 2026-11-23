import { Email } from '../models/Email.js';
import { TrackingEvent } from '../models/TrackingEvent.js';
import { Campaign } from '../models/Campaign.js';
import { Resume } from '../models/Resume.js';

export async function getSummary(req, res, next) {
  try {
    const userId = req.user.id;

    const [
      totalSent,
      openedCount,
      clickedCount,
      repliedCount,
      scheduledCount,
      failedCount,
    ] = await Promise.all([
      Email.countDocuments({ userId, status: 'sent' }),
      Email.countDocuments({ userId, status: 'sent', openCount: { $gt: 0 } }),
      Email.countDocuments({ userId, status: 'sent', clickCount: { $gt: 0 } }),
      Email.countDocuments({ userId, isReplied: true }),
      Email.countDocuments({ userId, status: 'queued' }),
      Email.countDocuments({ userId, status: 'failed' }),
    ]);

    const openRate = totalSent > 0 ? Math.round((openedCount / totalSent) * 100 * 10) / 10 : 0;
    const clickRate = totalSent > 0 ? Math.round((clickedCount / totalSent) * 100 * 10) / 10 : 0;
    const replyRate = totalSent > 0 ? Math.round((repliedCount / totalSent) * 100 * 10) / 10 : 0;

    res.json({
      summary: {
        totalSent,
        openedCount,
        clickedCount,
        repliedCount,
        scheduledCount,
        failedCount,
        openRate,
        clickRate,
        replyRate,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getTimeseries(req, res, next) {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;
    const daysNum = Math.min(90, Math.max(7, parseInt(days, 10)));
    const startDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    // Group emails sent by day
    const sentByDay = await Email.aggregate([
      {
        $match: {
          userId: Email.base.Types.ObjectId.createFromHexString(userId),
          status: 'sent',
          sentAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$sentAt' } },
          sent: { $sum: 1 },
          opened: { $sum: { $cond: [{ $gt: ['$openCount', 0] }, 1, 0] } },
          clicked: { $sum: { $cond: [{ $gt: ['$clickCount', 0] }, 1, 0] } },
          replied: { $sum: { $cond: ['$isReplied', 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill missing dates
    const dateMap = new Map();
    sentByDay.forEach(item => dateMap.set(item._id, item));

    const result = [];
    for (let i = daysNum - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const entry = dateMap.get(dateStr) || {
        _id: dateStr,
        sent: 0,
        opened: 0,
        clicked: 0,
        replied: 0,
      };
      result.push({
        date: dateStr,
        sent: entry.sent,
        opened: entry.opened,
        clicked: entry.clicked,
        replied: entry.replied,
      });
    }

    res.json({ timeseries: result });
  } catch (err) {
    next(err);
  }
}

export async function getBreakdowns(req, res, next) {
  try {
    const userId = req.user.id;

    // By campaign
    const campaigns = await Campaign.find({ userId }).select('name sentCount openCount clickCount replyCount');

    // By resume
    const resumes = await Resume.find({ userId }).select('customName');
    const resumeStats = await Promise.all(
      resumes.map(async r => {
        const sent = await Email.countDocuments({ userId, resumeId: r._id, status: 'sent' });
        const opened = await Email.countDocuments({ userId, resumeId: r._id, status: 'sent', openCount: { $gt: 0 } });
        return {
          id: r._id.toString(),
          name: r.customName,
          sent,
          opened,
          openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
        };
      })
    );

    // Funnel stats
    const totalSent = await Email.countDocuments({ userId, status: 'sent' });
    const opened = await Email.countDocuments({ userId, status: 'sent', openCount: { $gt: 0 } });
    const clicked = await Email.countDocuments({ userId, status: 'sent', clickCount: { $gt: 0 } });
    const replied = await Email.countDocuments({ userId, isReplied: true });

    const funnel = [
      { step: 'Sent', count: totalSent, percentage: 100 },
      { step: 'Delivered', count: totalSent, percentage: 100 },
      { step: 'Opened', count: opened, percentage: totalSent > 0 ? Math.round((opened / totalSent) * 100) : 0 },
      { step: 'Clicked', count: clicked, percentage: totalSent > 0 ? Math.round((clicked / totalSent) * 100) : 0 },
      { step: 'Replied', count: replied, percentage: totalSent > 0 ? Math.round((replied / totalSent) * 100) : 0 },
    ];

    // Top clicked links
    const topEvents = await TrackingEvent.aggregate([
      {
        $match: {
          userId: TrackingEvent.base.Types.ObjectId.createFromHexString(userId),
          type: 'click',
          isBot: false,
          destinationUrl: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$destinationUrl',
          clicks: { $sum: 1 },
        },
      },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
    ]);

    const topLinks = topEvents.map(item => ({
      url: item._id,
      clicks: item.clicks,
    }));

    res.json({
      byCampaign: campaigns,
      byResume: resumeStats,
      funnel,
      topLinks,
    });
  } catch (err) {
    next(err);
  }
}
