import { Router } from 'express';
import Event from '../models/Event.js';

const router = Router();

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * GET /share/events/:id
 * Returns an HTML page with Open Graph meta tags so Facebook/Twitter/etc.
 * can generate a rich link preview. Human visitors are redirected to the
 * frontend SPA immediately via <meta http-equiv="refresh"> and a JS redirect.
 */
router.get('/events/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).select(
      'title description bannerImagePath location startDate endDate free tags organizerName status'
    );

    if (!event || event.status !== 'PUBLISHED') {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/events/${req.params.id}`);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const backendUrl  = process.env.BACKEND_URL  || 'http://localhost:5000';
    const eventUrl    = `${frontendUrl}/events/${event._id}`;

    // Build absolute image URL
    let imageUrl = `${backendUrl}/og-default.png`;
    if (event.bannerImagePath) {
      const p = event.bannerImagePath.trim();
      if (p.startsWith('http://') || p.startsWith('https://')) {
        imageUrl = p;
      } else if (p.startsWith('/uploads/')) {
        imageUrl = `${backendUrl}${p}`;
      } else {
        imageUrl = `${backendUrl}/uploads/${p}`;
      }
    }

    const title       = escapeHtml(event.title);
    const description = escapeHtml(
      (event.description || '').substring(0, 200).replace(/\n/g, ' ')
    );
    const siteName    = 'EventHub';
    const dateStr     = new Date(event.startDate).toLocaleDateString('vi-VN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const fullDesc    = escapeHtml(`📅 ${dateStr} | 📍 ${event.location || ''} — ${description}`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300'); // cache 5 min

    res.send(`<!DOCTYPE html>
<html lang="vi" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8" />
  <title>${title} | ${siteName}</title>

  <!-- Open Graph -->
  <meta property="og:type"        content="website" />
  <meta property="og:url"         content="${escapeHtml(eventUrl)}" />
  <meta property="og:site_name"   content="${siteName}" />
  <meta property="og:title"       content="${title}" />
  <meta property="og:description" content="${fullDesc}" />
  <meta property="og:image"       content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale"      content="vi_VN" />

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${title}" />
  <meta name="twitter:description" content="${fullDesc}" />
  <meta name="twitter:image"       content="${escapeHtml(imageUrl)}" />

  <!-- Redirect human visitors to the SPA immediately -->
  <meta http-equiv="refresh" content="0; url=${escapeHtml(eventUrl)}" />
</head>
<body>
  <p>Đang chuyển hướng… / Redirecting to <a href="${escapeHtml(eventUrl)}">${title}</a></p>
  <script>window.location.replace("${escapeHtml(eventUrl)}");</script>
</body>
</html>`);
  } catch (err) {
    console.error('[shareRoutes] OG error:', err.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/events/${req.params.id}`);
  }
});

export default router;
