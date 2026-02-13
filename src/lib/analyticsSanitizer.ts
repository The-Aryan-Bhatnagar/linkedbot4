/**
 * Sanitizes analytics values from the extension.
 * The extension sometimes sends values multiplied by 1,000,000
 * (e.g., 5 views becomes 5000000). This detects and corrects that.
 */
export function sanitizeAnalyticsValue(value: unknown): number {
  if (value === null || value === undefined) return 0;

  let num: number;

  if (typeof value === 'string') {
    // Handle locale-formatted strings like "1,234" or "1.234"
    let str = String(value).trim();
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    const isCommaDecimal = lastComma > lastDot;

    if (isCommaDecimal) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }

    num = parseFloat(str);
    if (isNaN(num)) return 0;
  } else {
    num = Number(value);
    if (isNaN(num)) return 0;
  }

  // Detect the x1,000,000 inflation pattern:
  // LinkedIn posts rarely exceed 10M views organically for normal users.
  // If value >= 1,000,000 AND is exactly divisible by 1,000,000,
  // it's almost certainly inflated.
  if (num >= 1_000_000 && num % 1_000_000 === 0) {
    console.warn(`⚠️ Analytics value ${num} appears inflated (divisible by 1M), correcting to ${num / 1_000_000}`);
    return num / 1_000_000;
  }

  return Math.round(num);
}

export function sanitizeAnalytics(analytics: {
  views?: unknown;
  likes?: unknown;
  comments?: unknown;
  reposts?: unknown;
  shares?: unknown;
}) {
  return {
    views: sanitizeAnalyticsValue(analytics.views),
    likes: sanitizeAnalyticsValue(analytics.likes),
    comments: sanitizeAnalyticsValue(analytics.comments),
    shares: sanitizeAnalyticsValue(analytics.reposts ?? analytics.shares),
  };
}
