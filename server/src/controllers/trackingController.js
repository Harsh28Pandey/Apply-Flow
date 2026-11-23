import {
  handleOpenTracking,
  handleClickTracking,
  handleUnsubscribe,
  TRANSPARENT_PNG_BUFFER,
  trackingEventsEmitter,
} from '../services/trackingService.js';
import { env } from '../config/env.js';

/**
 * Public 1x1 transparent PNG pixel endpoint: GET /t/o/:trackingId.png
 */
export async function trackOpen(req, res) {
  const { trackingId } = req.params;
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // Process asynchronously without delaying image response
  handleOpenTracking({
    trackingId: trackingId.replace(/\.png$/, ''),
    userAgent,
    ip,
    headers: req.headers,
  }).catch(() => {});

  // Return 1x1 transparent PNG with strict no-cache headers
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, post-check=0, pre-check=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(TRANSPARENT_PNG_BUFFER);
}

/**
 * Public click tracking & redirect endpoint: GET /t/c/:trackingId/:linkId
 */
export async function trackClick(req, res) {
  const { trackingId, linkId } = req.params;
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    const destinationUrl = await handleClickTracking({
      trackingId,
      linkId,
      userAgent,
      ip,
      headers: req.headers,
    });

    if (destinationUrl && destinationUrl.startsWith('https://')) {
      return res.redirect(302, destinationUrl);
    }
  } catch (err) {
    // Fallback
  }

  // Safe fallback to app homepage
  res.redirect(302, env.PUBLIC_BASE_URL);
}

/**
 * Public unsubscribe endpoint: GET or POST /u/:token
 */
export async function unsubscribe(req, res) {
  const { token } = req.params;

  try {
    const result = await handleUnsubscribe(token);

    // If client requested JSON
    if (req.headers.accept?.includes('application/json')) {
      return res.json({ success: true, message: `Successfully unsubscribed ${result.email}.` });
    }

    // Serve clean HTML confirmation
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Unsubscribed Successfully | Apply Flow</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FAF9F6; color: #1E293B; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: white; border: 1px solid #FED7AA; border-radius: 24px; padding: 40px; max-width: 440px; box-shadow: 0 4px 20px rgba(249,115,22,0.08); text-align: center; }
          h1 { color: #EA580C; font-size: 24px; margin-bottom: 12px; }
          p { color: #64748B; font-size: 15px; line-height: 1.5; margin-bottom: 24px; }
          .badge { background: #FFF7ED; color: #EA580C; font-weight: 600; padding: 6px 16px; border-radius: 9999px; display: inline-block; font-size: 14px; border: 1px solid #FED7AA; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>You have been unsubscribed</h1>
          <div class="badge">${result.email}</div>
          <p style="margin-top: 16px;">You will no longer receive outreach emails from this sender.</p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #F8FAFC;">
        <h2>Invalid or expired unsubscribe link.</h2>
      </body>
      </html>
    `);
  }
}

/**
 * Server-Sent Events (SSE) stream for live tracking updates: GET /api/v1/tracking/stream
 */
export function streamTrackingEvents(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || env.CLIENT_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.flushHeaders?.();

  const userId = req.user.id;

  const eventListener = (data) => {
    if (data.userId === userId) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  trackingEventsEmitter.on('event', eventListener);

  // Heartbeat ping every 20s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    trackingEventsEmitter.off('event', eventListener);
  });
}
