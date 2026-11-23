/**
 * Detects whether an HTTP request (such as a tracking pixel or link click)
 * originates from an automated prefetcher, proxy, or security scanner.
 */
export function detectBot(userAgent = '', headers = {}) {
  const ua = (userAgent || '').toLowerCase();
  
  // Google Image Proxy
  if (ua.includes('googleimageproxy') || ua.includes('via ggpht.com')) {
    return { isBot: true, botReason: 'Google Image Proxy' };
  }

  // Apple Mail Privacy Protection (MPP)
  // MPP opens emails through Apple proxy servers, typically using a generic Safari/AppleWebKit UA
  // with specific IP subnets or missing standard browser headers
  if (ua.includes('mozilla/5.0') && ua.includes('applewebkit') && !ua.includes('chrome') && !ua.includes('safari/')) {
    return { isBot: true, botReason: 'Apple Mail Privacy Protection' };
  }

  // Common corporate security scanners & prefetchers
  const securityBots = [
    { pattern: 'barracuda', name: 'Barracuda Networks' },
    { pattern: 'mimecast', name: 'Mimecast Scanner' },
    { pattern: 'proofpoint', name: 'Proofpoint Scanner' },
    { pattern: 'symantec', name: 'Symantec Email Security' },
    { pattern: 'fireeye', name: 'FireEye Security' },
    { pattern: 'trend micro', name: 'Trend Micro Scanner' },
    { pattern: 'messagelabs', name: 'MessageLabs' },
    { pattern: 'kaspersky', name: 'Kaspersky' },
    { pattern: 'sophos', name: 'Sophos Security' },
    { pattern: 'bingpreview', name: 'Bing Preview' },
    { pattern: 'thunderbird', name: 'Thunderbird Prefetch' },
    { pattern: 'curl', name: 'Automated Script (curl)' },
    { pattern: 'wget', name: 'Automated Script (wget)' },
    { pattern: 'python', name: 'Automated Script (python)' },
    { pattern: 'headlesschrome', name: 'Headless Browser' },
    { pattern: 'phantomjs', name: 'Headless Browser' },
  ];

  for (const bot of securityBots) {
    if (ua.includes(bot.pattern)) {
      return { isBot: true, botReason: bot.name };
    }
  }

  // Check headers for proxy/prefetch flags
  if (headers['x-purpose'] === 'preview' || headers['purpose'] === 'prefetch') {
    return { isBot: true, botReason: 'HTTP Prefetch Header' };
  }

  return { isBot: false, botReason: null };
}
