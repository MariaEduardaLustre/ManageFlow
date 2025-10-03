// back/src/services/googleService.js
const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY; // configure na sua env

if (!GOOGLE_API_KEY) {
  console.warn('Aviso: GOOGLE_MAPS_API_KEY não configurado. Geocoding/Distance Matrix não funcionarão.');
}

async function geocodeAddress(address) {
  if (!GOOGLE_API_KEY) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json`;
    const resp = await axios.get(url, {
      params: {
        address,
        key: GOOGLE_API_KEY
      }
    });
    if (resp.data.status !== 'OK' || !resp.data.results.length) return null;
    const loc = resp.data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng };
  } catch (err) {
    console.error('geocodeAddress error', err.message || err);
    return null;
  }
}

/**
 * Usa a Distance Matrix API para obter a distância em metros entre origin e destination.
 * origin/destination: {lat: number, lng: number}
 */
async function getDistanceMeters({ origin, destination }) {
  if (!GOOGLE_API_KEY) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json`;
    // origin/destination como "lat,lng"
    const resp = await axios.get(url, {
      params: {
        origins: `${origin.lat},${origin.lng}`,
        destinations: `${destination.lat},${destination.lng}`,
        key: GOOGLE_API_KEY,
        units: 'metric'
      }
    });
    if (!resp.data || resp.data.status !== 'OK') return null;
    const row = resp.data.rows?.[0];
    const element = row?.elements?.[0];
    if (!element || element.status !== 'OK') return null;

    const distanceMeters = element.distance.value; // metros
    const distanceText = element.distance.text;
    return { distanceMeters, distanceText };
  } catch (err) {
    console.error('getDistanceMeters error', err.message || err);
    return null;
  }
}

module.exports = {
  geocodeAddress,
  getDistanceMeters
};
