// routes/docs.route.js
const express = require('express');
const router = express.Router();
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const fs = require('fs');

function tryLoadYaml(possiblePaths) {
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        const doc = YAML.load(p);
        if (doc && typeof doc === 'object') {
          console.log('[swagger] carregado:', p);
          return doc;
        }
      }
    } catch (e) {
      console.error('[swagger] erro ao carregar', p, e.message);
    }
  }
  return null;
}

// Tente em várias localizações comuns do teu projeto
const candidates = [
  // se você salvou em ./docs/swagger.yaml (mesmo nível de server.js)
  path.join(process.cwd(), 'docs', 'swagger.yaml'),
  // se salvou em ./src/docs/swagger.yaml
  path.join(process.cwd(), 'src', 'docs', 'swagger.yaml'),
  // relativo à pasta de rotas
  path.join(__dirname, '../docs/swagger.yaml'),
  path.join(__dirname, '../src/docs/swagger.yaml'),
];

const swaggerDoc = tryLoadYaml(candidates);

if (!swaggerDoc || !swaggerDoc.paths || !Object.keys(swaggerDoc.paths).length) {
  console.error('[swagger] Atenção: spec carregado sem paths. Verifique o caminho do swagger.yaml.');
}

// JSON puro
router.get('/docs.json', (_req, res) => {
  if (!swaggerDoc) {
    return res.status(500).json({ error: 'Swagger spec não encontrado' });
  }
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDoc);
});

// UI
router.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDoc || { openapi: '3.0.3', info: { title: 'ManageFlow', version: '0.0.0' }, paths: {} }, {
    explorer: true,
    customSiteTitle: 'ManageFlow API Docs',
  })
);

module.exports = router;
