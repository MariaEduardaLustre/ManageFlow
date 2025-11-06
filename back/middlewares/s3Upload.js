const multer = require('multer');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');
const s3 = require('../services/s3Client');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Formato inválido. Use PNG/JPG/WEBP.'));
    }
    cb(null, true);
  }
});

function safeExt(mimetype) {
  switch (mimetype) {
    case 'image/png': return '.png';
    case 'image/jpeg':
    case 'image/jpg': return '.jpg';
    case 'image/webp': return '.webp';
    default: return '';
  }
}
function randomName(prefix = '') {
  const ts = Date.now();
  const rnd = crypto.randomBytes(6).toString('hex');
  return `${prefix}${ts}-${rnd}`;
}

async function putToS3(buffer, key, mimetype) {
  const bucket = process.env.S3_BUCKET;
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key.replace(/^\//, ''),
    Body: buffer,
    ContentType: mimetype
    // ACL: 'public-read'  // <- NÃO usar (bucket privado)
  });
  await s3.send(cmd);
  return key.startsWith('/') ? key : `/${key}`;
}

/** Geradores de key */
function keyEmpresaPerfil(idEmpresa, mimetype) {
  const ext = safeExt(mimetype);
  const fname = `perfil-${randomName('')}${ext}`;
  return `/uploads/empresas/${idEmpresa}/perfil/${fname}`;
}
function keyEmpresaLogoConfig(idEmpresa, mimetype) {
  const ext = safeExt(mimetype);
  const fname = `logo-${randomName('')}${ext}`;
  return `/uploads/empresas/${idEmpresa}/logo/${fname}`;
}
function keyEmpresaBannerConfig(idEmpresa, mimetype) {
  const ext = safeExt(mimetype);
  const fname = `banner-${randomName('')}${ext}`;
  return `/uploads/empresas/${idEmpresa}/banner/${fname}`;
}
function keyUsuarioPerfil(idUsuario, mimetype) {
  const ext = safeExt(mimetype);
  const fname = `perfil-${randomName('')}${ext}`;
  return `/uploads/usuarios/${idUsuario}/perfil/${fname}`;
}

/**
 * Pipeline que:
 *  1) recebe multipart (campo 'img_perfil')
 *  2) sobe no S3 (privado)
 *  3) injeta req.fileUploaded = { key, contentType, size }
 */
const empresaPerfilSingle = [
  upload.single('img_perfil'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Arquivo img_perfil é obrigatório.' });
      }
      const empresaId = String(req.params.id || '').replace(/\D+/g, '') || '0';
      const key = keyEmpresaPerfil(empresaId, req.file.mimetype);

      const savedKey = await putToS3(req.file.buffer, key, req.file.mimetype);

      req.fileUploaded = {
        key: savedKey,
        contentType: req.file.mimetype,
        size: req.file.size,
        filename: path.basename(savedKey),
      };
      next();
    } catch (err) {
      console.error('[empresaPerfilSingle] erro upload S3:', err);
      return res.status(500).json({ error: 'Erro ao enviar imagem ao S3.' });
    }
  }
];

const configuracaoFields = upload.fields([
  { name: 'img_logo',   maxCount: 1 },
  { name: 'img_banner', maxCount: 1 }
]);

const usuarioPerfilSingle = upload.single('img_perfil');

module.exports = {
  putToS3,
  keyEmpresaPerfil,
  keyEmpresaLogoConfig,
  keyEmpresaBannerConfig,
  keyUsuarioPerfil,
  empresaPerfilSingle,
  configuracaoFields,
  usuarioPerfilSingle
};
