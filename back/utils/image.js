// /back/src/utils/image.js
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3 = require('../services/s3Client');

function normalizeKey(key) {
  if (!key) return null;
  return key.startsWith('/') ? key : `/${key}`;
}

/** URL direta (CDN/CloudFront) OU endpoint S3 — só use se tiver público/CloudFront */
function makePublicImageUrl(key) {
  if (!key) return null;
  const normalizedKey = normalizeKey(key);
  const s3Base = (process.env.S3_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  if (s3Base) return `${s3Base}${normalizedKey}`;
  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION;
  return `https://${bucket}.s3.${region}.amazonaws.com${normalizedKey}`;
}

/**
 * Retorna a URL de acesso à imagem:
 * - Se S3_URL_MODE=public  -> retorna makePublicImageUrl (para CloudFront/objeto público)
 * - Caso contrário         -> retorna URL PRÉ-ASSINADA (recomendado p/ bucket privado)
 */
async function makeImageAccessUrl(key, expiresInSec = 600) {
  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) return null;

  const mode = String(process.env.S3_URL_MODE || 'signed').toLowerCase();
  if (mode === 'public') {
    return makePublicImageUrl(normalizedKey);
  }

  const cmd = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: normalizedKey.replace(/^\//, ''),
  });

  return getSignedUrl(s3, cmd, { expiresIn: expiresInSec });
}

module.exports = { normalizeKey, makePublicImageUrl, makeImageAccessUrl };
