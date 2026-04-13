// lib/rentcast.js — RentCast API client
// Docs: https://developers.rentcast.io/reference

const axios = require('axios');
const logger = require('./logger');

const BASE_URL = 'https://api.rentcast.io/v1';

function getClient() {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) throw new Error('RENTCAST_API_KEY is not set in environment variables.');

  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'X-Api-Key': apiKey,
      accept: 'application/json',
    },
    timeout: 8000,
  });
}

/**
 * Get property details and rent estimate by address.
 */
async function getPropertyByAddress(address, zipCode = '') {
  const client = getClient();
  const fullAddress = zipCode ? `${address} ${zipCode}` : address;

  try {
    logger.info('RentCast getPropertyByAddress', { address: fullAddress });

    const [propRes, rentRes] = await Promise.allSettled([
      client.get('/properties', { params: { address: fullAddress, limit: 5 } }),
      client.get('/avm/rent/long-term', { params: { address: fullAddress } }),
    ]);

    const properties = propRes.status === 'fulfilled'
      ? (propRes.value.data?.items || propRes.value.data || [])
      : [];

    const rentEstimate = rentRes.status === 'fulfilled'
      ? rentRes.value.data
      : null;

    return properties.slice(0, 5).map(p => formatRentcastResult(p, rentEstimate));
  } catch (err) {
    if (err.response?.status === 404) return [];
    logger.error('RentCast getPropertyByAddress error', { msg: err.message });
    throw err;
  }
}

/**
 * Search properties by ZIP code with optional filters.
 */
async function searchByZip(zip, limit = 10) {
  const client = getClient();

  try {
    logger.info('RentCast searchByZip', { zip });
    const res = await client.get('/properties', {
      params: { zipCode: zip, limit },
    });

    const items = res.data?.items || res.data || [];
    return items.map(p => formatRentcastResult(p, null));
  } catch (err) {
    if (err.response?.status === 404) return [];
    logger.error('RentCast searchByZip error', { msg: err.message });
    throw err;
  }
}

/**
 * Format RentCast property + rent data into standard schema.
 */
function formatRentcastResult(p, rentData) {
  return {
    address: p.formattedAddress || p.address || null,
    owner: null, // RentCast doesn't return owner name
    value: p.price ? `$${Number(p.price).toLocaleString()}` : null,
    rentEstimate: rentData?.rent ? `$${Number(rentData.rent).toLocaleString()}/mo` : null,
    propertyType: p.propertyType || null,
    bedrooms: p.bedrooms || null,
    bathrooms: p.bathrooms || null,
    sqft: p.squareFootage || null,
    yearBuilt: p.yearBuilt || null,
    lastSaleDate: p.lastSaleDate || null,
    lastSalePrice: p.lastSalePrice
      ? `$${Number(p.lastSalePrice).toLocaleString()}`
      : null,
    lat: p.latitude || null,
    lon: p.longitude || null,
    source: 'RentCast',
    last_updated: new Date().toISOString(),
  };
}

module.exports = { getPropertyByAddress, searchByZip };
