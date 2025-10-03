// back/src/services/config.js
const toNumber = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

module.exports = {
  DEFAULT_RADIUS_METERS: toNumber(process.env.QUEUE_RADIUS_METERS_DEFAULT, 8000),
};
