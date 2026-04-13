// lib/attom.js — ATTOM Data API client
// Docs: https://api.developer.attomdata.com/docs

const axios = require('axios');
const logger = require('./logger');

const BASE_URL = 'https://api.gateway.attomdata.com/propertyapi/v1.0.0';

function getClient() {
  const apiKey = process.env.ATTOM_API_KEY;
  if (!apiKey) throw new Error('ATTOM_API_KEY is not set in environment variables.');

  return axios.create({
    baseURL: BASE_URL,
    headers: {
      apikey: apiKey,
      accept: 'application/json',
    },
    timeout: 8000,
  });
}

/**
 * Search property by address.
 * @param {string} address - Full street address
 * @param {string} zip - ZIP code (optional but improves accuracy)
 */
async function searchByAddress(address, zip = '') {
  const client = getClient();
  const params = { address1: address };
  if (zip) params.postalcode = zip;

  try {
    logger.info('ATTOM searchByAddress', { address, zip });
    const res = await client.get('/property/basicprofile', { params });

    const properties = res.data?.property || [];
    return properties.map(p => formatAttomResult(p));
  } catch (err) {
    if (err.response?.status === 404) {
      logger.warn('ATTOM: no results', { address });
      return [];
    }
    logger.error('ATTOM searchByAddress error', { msg: err.message, status: err.response?.status });
    throw err;
  }
}

/**
 * Search properties by owner name.
 * @param {string} name - Owner last name or full name
 * @param {string} zip - ZIP code (optional)
 */
async function searchByOwner(name, zip = '') {
  const client = getClient();
  const params = { lastname: name };
  if (zip) params.postalcode = zip;

  try {
    logger.info('ATTOM searchByOwner', { name, zip });
    const res = await client.get('/property/basicprofile', { params });

    const properties = res.data?.property || [];
    return properties.map(p => formatAttomResult(p));
  } catch (err) {
    if (err.response?.status === 404) {
      logger.warn('ATTOM: no results for owner', { name });
      return [];
    }
    logger.error('ATTOM searchByOwner error', { msg: err.message });
    throw err;
  }
}

/**
 * Search properties by ZIP code.
 */
async function searchByZip(zip) {
  const client = getClient();

  try {
    logger.info('ATTOM searchByZip', { zip });
    const res = await client.get('/property/basicprofile', {
      params: { postalcode: zip },
    });

    const properties = res.data?.property || [];
    return properties.slice(0, 20).map(p => formatAttomResult(p));
  } catch (err) {
    if (err.response?.status === 404) return [];
    logger.error('ATTOM searchByZip error', { msg: err.message });
    throw err;
  }
}

/**
 * Format raw ATTOM property response into our standard schema.
 */
function formatAttomResult(p) {
  const addr = p.address || {};
  const lot = p.lot || {};
  const building = p.building || {};
  const sale = p.sale || {};
  const owner = p.owner || {};
  const assessment = p.assessment || {};

  return {
    address: [addr.line1, addr.locality, addr.countrySubd, addr.postal1]
      .filter(Boolean).join(', ') || null,
    owner: [owner.owner1?.lastname, owner.owner1?.firstname]
      .filter(Boolean).join(', ') || null,
    value: assessment.assessed?.assdttlvalue
      ? `$${Number(assessment.assessed.assdttlvalue).toLocaleString()}`
      : null,
    propertyType: building.summary?.proptype || null,
    bedrooms: building.rooms?.beds || null,
    bathrooms: building.rooms?.bathsfull || null,
    sqft: building.size?.bldgsize || null,
    yearBuilt: building.summary?.yearbuilt || null,
    lastSaleDate: sale.amount?.salerecdate || null,
    lastSalePrice: sale.amount?.saledisclosuretype === 'F' && sale.amount?.saleamt
      ? `$${Number(sale.amount.saleamt).toLocaleString()}`
      : null,
    lat: p.location?.latitude || null,
    lon: p.location?.longitude || null,
    source: 'ATTOM Data',
    last_updated: new Date().toISOString(),
  };
}

module.exports = { searchByAddress, searchByOwner, searchByZip };
