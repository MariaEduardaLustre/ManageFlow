// /back/src/utils/image.js
function makePublicImageUrl(key) {
  if (!key) return null;

  const s3Base = process.env.S3_PUBLIC_BASE_URL && process.env.S3_PUBLIC_BASE_URL.trim();
  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION;

  // Garante que key tenha "/" no começo (nosso padrão relativo)
  const normalizedKey = key.startsWith('/') ? key : `/${key}`;

  if (s3Base) {
    // Preferir CloudFront / CDN
    return `${s3Base}${normalizedKey}`;
  }
  // Fallback S3 público (se o bucket permitir leitura pública ou tiver políticas adequadas)
  return `https://${bucket}.s3.${region}.amazonaws.com${normalizedKey}`;
}

module.exports = { makePublicImageUrl };
