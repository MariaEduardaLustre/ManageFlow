// /back/src/middlewares/s3Upload.js
const multer = require('multer');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
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

// middlewares/s3Upload.js
async function putToS3(buffer, key, mimetype) {
  const bucket = process.env.S3_BUCKET;
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key.replace(/^\//, ''),
    Body: buffer,
    ContentType: mimetype
    // ACL: 'public-read'  <- REMOVA (ou comente)
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

/** Multer fields */
const empresaPerfilSingle = upload.single('img_perfil'); // perfil da empresa
const configuracaoFields = upload.fields([
  { name: 'img_logo',   maxCount: 1 }, // LOGO da configuração de fila
  { name: 'img_banner', maxCount: 1 }  // BANNER da configuração de fila
]);
const usuarioPerfilSingle = upload.single('img_perfil'); // perfil do usuário

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
