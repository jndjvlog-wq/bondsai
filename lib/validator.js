// lib/validator.js — Input validation and result validation layer

/**
 * Validates and sanitizes the incoming search query from the user.
 * Returns { valid, errors, sanitized }
 */
function validateSearchInput({ address, name, zip, type }) {
  const errors = [];
  const sanitized = {};

  // At least one search param required
  if (!address && !name && !zip) {
    errors.push('At least one of: address, name, or ZIP code is required.');
  }

  if (address) {
    const clean = address.trim().replace(/[<>{}]/g, '');
    if (clean.length < 5) errors.push('Address too short.');
    else if (clean.length > 200) errors.push('Address too long.');
    else sanitized.address = clean;
  }

  if (name) {
    const clean = name.trim().replace(/[^a-zA-Z\s\-'\.]/g, '');
    if (clean.length < 2) errors.push('Name too short.');
    else if (clean.length > 100) errors.push('Name too long.');
    else sanitized.name = clean;
  }

  if (zip) {
    const clean = zip.trim().replace(/\D/g, '');
    if (!/^\d{5}$/.test(clean)) errors.push('ZIP must be 5 digits.');
    else sanitized.zip = clean;
  }

  if (type) {
    const allowed = ['property', 'person', 'all'];
    sanitized.type = allowed.includes(type) ? type : 'all';
  } else {
    sanitized.type = 'all';
  }

  return { valid: errors.length === 0, errors, sanitized };
}

/**
 * Validates and cleans a property result object.
 * Returns null if the result is too incomplete to be useful.
 */
function validatePropertyResult(result) {
  if (!result || typeof result !== 'object') return null;

  const required = ['address'];
  for (const field of required) {
    if (!result[field]) return null;
  }

  // Clean nulls and empty strings
  const cleaned = {};
  const fields = ['address', 'owner', 'value', 'propertyType', 'bedrooms', 'bathrooms',
                  'sqft', 'yearBuilt', 'lastSaleDate', 'lastSalePrice', 'source', 'last_updated'];

  for (const field of fields) {
    const val = result[field];
    if (val !== null && val !== undefined && val !== '') {
      cleaned[field] = val;
    }
  }

  cleaned.source = cleaned.source || 'Unknown';
  cleaned.last_updated = cleaned.last_updated || new Date().toISOString();

  return cleaned;
}

/**
 * Deduplicates results by address.
 */
function deduplicateResults(results) {
  const seen = new Set();
  return results.filter(r => {
    const key = (r.address || '').toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Flags outdated records (last_updated > 180 days ago).
 */
function flagOutdated(results) {
  const cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
  return results.map(r => {
    const updated = r.last_updated ? new Date(r.last_updated).getTime() : null;
    return {
      ...r,
      outdated: updated ? updated < cutoff : false,
    };
  });
}

module.exports = { validateSearchInput, validatePropertyResult, deduplicateResults, flagOutdated };
