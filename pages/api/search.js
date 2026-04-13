// pages/api/search.js — Main search endpoint
// Aggregates results from ATTOM + RentCast with retry, validation, dedup

import { validateSearchInput, validatePropertyResult, deduplicateResults, flagOutdated } from '../../lib/validator';
import logger from '../../lib/logger';
import rateLimit from '../../lib/rateLimit';

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 30,
});

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  // Rate limiting
  const allowed = limiter(req, res);
  if (!allowed) return;

  const query = req.method === 'POST' ? req.body : req.query;
  const { address, name, zip, type } = query;

  // Validate input
  const { valid, errors, sanitized } = validateSearchInput({ address, name, zip, type });
  if (!valid) {
    return res.status(400).json({ error: 'Invalid input.', details: errors });
  }

  logger.info('Search request', { sanitized });

  const results = [];
  const sourceErrors = [];

  // Run ATTOM + RentCast in parallel using Promise.allSettled (never fail both)
  const [attomResult, rentcastResult] = await Promise.allSettled([
    fetchFromAttom(sanitized),
    fetchFromRentcast(sanitized),
  ]);

  if (attomResult.status === 'fulfilled') {
    results.push(...attomResult.value);
  } else {
    logger.error('ATTOM fetch failed', { msg: attomResult.reason?.message });
    sourceErrors.push({ source: 'ATTOM', error: attomResult.reason?.message || 'Unknown error' });
  }

  if (rentcastResult.status === 'fulfilled') {
    results.push(...rentcastResult.value);
  } else {
    logger.error('RentCast fetch failed', { msg: rentcastResult.reason?.message });
    sourceErrors.push({ source: 'RentCast', error: rentcastResult.reason?.message || 'Unknown error' });
  }

  // Validate each result
  const validated = results
    .map(r => validatePropertyResult(r))
    .filter(Boolean);

  // Deduplicate by address
  const deduped = deduplicateResults(validated);

  // Flag outdated records
  const flagged = flagOutdated(deduped);

  const responsePayload = {
    query: sanitized,
    count: flagged.length,
    results: flagged.length > 0 ? flagged : [],
    message: flagged.length === 0 ? 'No verified data found.' : null,
    sourceErrors: sourceErrors.length > 0 ? sourceErrors : undefined,
    timestamp: new Date().toISOString(),
  };

  return res.status(200).json(responsePayload);
}

// ── ATTOM with retry ──────────────────────────────────────────────────────────
async function fetchFromAttom({ address, name, zip }) {
  if (!process.env.ATTOM_API_KEY) return [];

  const attom = await import('../../lib/attom');

  const tryFetch = async () => {
    if (address) return attom.searchByAddress(address, zip);
    if (name) return attom.searchByOwner(name, zip);
    if (zip) return attom.searchByZip(zip);
    return [];
  };

  try {
    return await tryFetch();
  } catch (err) {
    logger.warn('ATTOM first attempt failed, retrying...', { msg: err.message });
    await new Promise(r => setTimeout(r, 1000)); // wait 1s
    try {
      return await tryFetch();
    } catch (retryErr) {
      logger.error('ATTOM retry failed', { msg: retryErr.message });
      throw retryErr;
    }
  }
}

// ── RentCast with retry ───────────────────────────────────────────────────────
async function fetchFromRentcast({ address, zip }) {
  if (!process.env.RENTCAST_API_KEY) return [];

  const rentcast = await import('../../lib/rentcast');

  const tryFetch = async () => {
    if (address) return rentcast.getPropertyByAddress(address, zip);
    if (zip) return rentcast.searchByZip(zip);
    return [];
  };

  try {
    return await tryFetch();
  } catch (err) {
    logger.warn('RentCast first attempt failed, retrying...', { msg: err.message });
    await new Promise(r => setTimeout(r, 1000));
    try {
      return await tryFetch();
    } catch (retryErr) {
      logger.error('RentCast retry failed', { msg: retryErr.message });
      throw retryErr;
    }
  }
}
