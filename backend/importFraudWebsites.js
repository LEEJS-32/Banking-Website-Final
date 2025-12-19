/* eslint-disable no-console */
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const FraudWebsite = require('./models/FraudWebsite');

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
};

const hasFlag = (name) => args.includes(name);

const normalizeDomain = (input) => {
  const raw = String(input || '')
    .trim()
    .replace(/[),.;]+$/g, '');
  if (!raw) return '';

  const denyHosts = new Set([
    'facebook.com',
    'www.facebook.com',
    'm.facebook.com',
    't.me',
    'telegram.me',
    'instagram.com',
    'www.instagram.com',
    'twitter.com',
    'x.com',
    'youtube.com',
    'youtu.be',
    'linkedin.com',
    'tiktok.com',
    'blogspot.com',
    'wordpress.com',
    'wixsite.com',
  ]);

  const isFileLikeToken = (value) =>
    /\.(php|html?|asp|aspx|jsp|cgi|do|json|xml|txt)$/i.test(value);

  // If it's already a bare domain
  const looksLikeDomain =
    /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(raw) &&
    !raw.includes(' ') &&
    !raw.includes('/') &&
    !isFileLikeToken(raw);
  const tryUrl = (value) => {
    try {
      const urlObj = new URL(value.startsWith('http') ? value : `https://${value}`);
      const host = urlObj.hostname.toLowerCase().replace(/^www\./, '');
      if (denyHosts.has(host)) return '';
      if (isFileLikeToken(host)) return '';
      return host;
    } catch {
      return '';
    }
  };

  const fromUrl = tryUrl(raw);
  if (fromUrl) return fromUrl;

  const bare = looksLikeDomain ? raw.toLowerCase().replace(/^www\./, '') : '';
  if (bare && denyHosts.has(bare)) return '';
  return bare;
};

const parseCsvLine = (line) => {
  // Minimal CSV parser that handles quoted commas.
  const out = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out.map((s) => s.trim());
};

const extractDomainsFromText = (text) => {
  const domains = new Set();

  // URLs
  const urlMatches = text.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  for (const url of urlMatches) {
    const d = normalizeDomain(url);
    if (d) domains.add(d);
  }

  // Bare domains
  const bareMatches = text.match(/\b(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}\b/gi) || [];
  for (const maybe of bareMatches) {
    const d = normalizeDomain(maybe);
    if (d) domains.add(d);
  }

  return Array.from(domains);
};

const looksLikeUrl = (s) => /^https?:\/\//i.test(s.trim());
const stripBullet = (s) => s.replace(/^\s*[•\-–—]+\s*/, '').trim();

const parseTxtLikeList = (raw) => {
  // The provided list typically alternates between:
  // - Merchant/entity line (sometimes with urls in parentheses)
  // - Section headers: "Main Website:", "Facebook:", "Telegram:" etc.
  // - Bullet lines containing URLs
  // - Occasional standalone URLs
  const lines = raw.split(/\r?\n/);
  const rows = [];
  let currentMerchantName = '';

  for (let line of lines) {
    line = (line || '').trim();
    if (!line) continue;

    // Skip section headers but keep current merchant context
    if (/^(main website|facebook|telegram|instagram|twitter|youtube)\s*:\s*$/i.test(line)) {
      continue;
    }

    // Bullet lines usually carry URLs for the current merchant
    const isBullet = /^\s*[•\-–—]+\s*/.test(line);
    const cleaned = stripBullet(line);

    // If the line is a URL (bullet or not)
    if (looksLikeUrl(cleaned)) {
      const domain = normalizeDomain(cleaned);
      if (domain) {
        rows.push({
          domain,
          merchantName: currentMerchantName || domain,
          reason: '',
        });
      }
      continue;
    }

    // If the line contains URLs/domains in parentheses, treat left side as merchant name
    // Example: "1Gold.com.my (www.1gold.com.my)"
    // Example: "Amethyst ... (www.powergoldclub.com, www.powergold999.com, ...)"
    const parenMatch = cleaned.match(/^(.*?)\((.*)\)\s*$/);
    if (parenMatch) {
      const left = parenMatch[1].trim();
      const inside = parenMatch[2];

      if (left) currentMerchantName = left;

      const domains = extractDomainsFromText(inside);
      for (const d of domains) {
        rows.push({ domain: d, merchantName: currentMerchantName || d, reason: '' });
      }
      continue;
    }

    // If the line itself contains domains/urls without parentheses, extract them.
    // If we extract at least one domain, keep merchant name as currentMerchantName.
    const extracted = extractDomainsFromText(cleaned);
    if (extracted.length > 0) {
      for (const d of extracted) {
        rows.push({ domain: d, merchantName: currentMerchantName || d, reason: '' });
      }
      continue;
    }

    // Otherwise it's likely a merchant/entity name. Update context.
    // Avoid setting context to tiny noise tokens.
    if (!isBullet && cleaned.length >= 3) {
      currentMerchantName = cleaned;
    }
  }

  return rows;
};

const parseInputFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const raw = await fs.readFile(filePath, 'utf8');

  if (ext === '.json') {
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.items)
        ? parsed.items
        : Array.isArray(parsed.data)
          ? parsed.data
          : [];

    // Expect objects like { merchantName, url/domain, reason }
    return items
      .map((it) => {
        const url = it.url || it.website || it.domain || it.link || '';
        const domain = normalizeDomain(url) || normalizeDomain(it.domain);
        const merchantName = (it.merchantName || it.name || it.entity || it.operator || domain || '').trim();
        const reason = (it.reason || it.remarks || it.remark || it.note || '').trim();
        return { domain, merchantName, reason };
      })
      .filter((r) => r.domain);
  }

  if (ext === '.csv') {
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const idxOf = (candidates) => {
      for (const c of candidates) {
        const idx = header.indexOf(c);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const urlIdx = idxOf(['website', 'url', 'link', 'web', 'domain']);
    const nameIdx = idxOf(['name', 'entity', 'company', 'operator', 'merchant', 'merchantname']);
    const reasonIdx = idxOf(['remarks', 'remark', 'reason', 'note', 'comment']);

    const rows = [];
    for (const line of lines.slice(1)) {
      const cols = parseCsvLine(line);
      const url = urlIdx >= 0 ? cols[urlIdx] : '';
      const domain = normalizeDomain(url) || normalizeDomain(url);
      if (!domain) continue;

      const merchantName = (nameIdx >= 0 ? cols[nameIdx] : domain) || domain;
      const reason = reasonIdx >= 0 ? (cols[reasonIdx] || '') : '';
      rows.push({ domain, merchantName: merchantName.trim(), reason: reason.trim() });
    }

    return rows;
  }

  // .txt, .html, or anything else
  // If it's a TXT-like list, try to preserve merchantName context.
  const rows = parseTxtLikeList(raw);
  if (rows.length > 0) return rows;

  // Fallback: treat as generic text and extract domains
  const domains = extractDomainsFromText(raw);
  return domains.map((domain) => ({ domain, merchantName: domain, reason: '' }));
};

async function main() {
  const file = getArg('--file') || getArg('-f');
  const riskLevel = (getArg('--risk-level', 'high') || 'high').toLowerCase();
  const reportedBy = getArg('--reported-by', 'BNM');
  const defaultReason = getArg('--reason', 'BNM Financial Consumer Alert List');
  const dryRun = hasFlag('--dry-run');
  const limit = parseInt(getArg('--limit', ''), 10);

  if (!file) {
    console.log('Usage: node importFraudWebsites.js --file <path-to-csv|json|txt|html> [--dry-run]');
    console.log('Example: npm run import:fraud -- --file data/bnm-fcal.csv');
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI in environment (.env)');
    process.exit(1);
  }

  const filePath = path.isAbsolute(file) ? file : path.join(__dirname, file);
  const rows = await parseInputFile(filePath);
  const unique = new Map();

  for (const row of rows) {
    const domain = normalizeDomain(row.domain);
    if (!domain) continue;

    // Prefer non-empty merchantName/reason when duplicates occur
    const existing = unique.get(domain) || { domain, merchantName: domain, reason: '' };
    unique.set(domain, {
      domain,
      merchantName: row.merchantName?.trim() || existing.merchantName,
      reason: row.reason?.trim() || existing.reason,
    });
  }

  let finalRows = Array.from(unique.values());
  if (!Number.isNaN(limit) && limit > 0) finalRows = finalRows.slice(0, limit);

  console.log(`Parsed ${finalRows.length} unique domains from ${path.basename(filePath)}`);

  if (dryRun) {
    console.log('Dry run enabled; showing first 10:');
    console.log(finalRows.slice(0, 10));
    process.exit(0);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const ops = finalRows.map((r) => ({
    updateOne: {
      filter: { domain: r.domain },
      update: {
        $setOnInsert: {
          blockedTransactions: 0,
          createdAt: new Date(),
        },
        $set: {
          domain: r.domain,
          merchantName: r.merchantName || r.domain,
          reason: r.reason || defaultReason,
          riskLevel,
          reportedBy,
          isActive: true,
        },
      },
      upsert: true,
    },
  }));

  const result = await FraudWebsite.bulkWrite(ops, { ordered: false });

  console.log('Import complete:');
  console.log(`- Upserted: ${result.upsertedCount || 0}`);
  console.log(`- Modified: ${result.modifiedCount || 0}`);
  console.log(`- Matched: ${result.matchedCount || 0}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Import fraud websites error:', err);
  process.exit(1);
});
