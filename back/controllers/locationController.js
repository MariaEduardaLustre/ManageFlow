// back/src/controllers/locationController.js
const GoogleService = require('../services/googleService');
const db = require('../database/connection'); // mysql2/promise
const { DEFAULT_RADIUS_METERS } = require('../services/config');

const DEBUG = String(process.env.LOCATION_DEBUG || '').trim() === '1';

function mkReqId() {
  const d = new Date();
  return `${d.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
}
function log(reqId, ...args) { console.log(`[loc:${reqId}]`, ...args); }
function warn(reqId, ...args) { console.warn(`[loc:${reqId}]`, ...args); }
function err(reqId, ...args) { console.error(`[loc:${reqId}]`, ...args); }

// BIT/TINYINT/STRING -> boolean
function toBool1(v) {
  if (Buffer.isBuffer(v)) return v.length ? v[0] === 1 : false;
  if (typeof v === 'boolean') return v;
  const n = Number(v);
  if (Number.isFinite(n)) return n === 1;
  const s = String(v ?? '').trim().toLowerCase();
  return s === '1' || s === 'true';
}

async function validateClientDistance(req, res) {
  const reqId = mkReqId();
  try {
    const { token_fila } = req.params;
    const { lat: clientLat, lng: clientLng } = req.query;

    log(reqId, `IN -> GET ${req.originalUrl}`);
    if (!clientLat || !clientLng) {
      warn(reqId, 'faltando lat/lng na query');
      return res.status(400).json({ error: 'lat and lng query params are required' });
    }

    // ⚠️ O TOKEN está em ConfiguracaoFila. Só temos ENDERECO (rua).
    // Para evitar ER_BAD_FIELD_ERROR, NÃO referenciamos colunas que não existem.
    const [rows] = await db.query(
      `
      SELECT
        cf.ID_CONF_FILA,
        cf.TOKEN_FILA,
        cf.NOME_FILA,
        cf.PER_LOC,
        e.ID_EMPRESA,
        e.NOME_EMPRESA,
        e.ENDERECO
        -- Se você TIVER a coluna do número, descomente a linha abaixo
        -- , e.NUMERO
      FROM ConfiguracaoFila cf
      JOIN empresa e ON e.ID_EMPRESA = cf.ID_EMPRESA
      WHERE cf.TOKEN_FILA = ?
      LIMIT 1
      `,
      [token_fila]
    );

    if (!rows.length) {
      warn(reqId, 'config não encontrada pelo TOKEN_FILA');
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }
    const r = rows[0];

    const exigirLocal = toBool1(r.PER_LOC);
    log(reqId, `PER_LOC=${JSON.stringify(r.PER_LOC)} -> exigirLocal=${exigirLocal}`);

    if (!exigirLocal) {
      log(reqId, 'localização dispensada pela configuração → allowed=true');
      return res.json({ allowed: true, reason: 'localizacao_nao_exigida' });
    }

    const maxDistanceMeters = DEFAULT_RADIUS_METERS;
    log(reqId, `maxDistanceMeters=${maxDistanceMeters}`);

    // Monta endereço para geocodificar (temos só a RUA; se tiver NUMERO, concatene)
    let endereco = r.ENDERECO || '';
    // OPCIONAL: se sua tabela tiver a coluna NUMERO, após descomentar no SELECT acima, descomente:
    // if (r.NUMERO) endereco = `${endereco}, ${r.NUMERO}`;

    if (!endereco) {
      err(reqId, 'ENDERECO vazio na empresa');
      return res.status(500).json({ error: 'Endereço do estabelecimento não cadastrado' });
    }

    log(reqId, 'geocoding endereço da empresa:', endereco);
    const geocode = await GoogleService.geocodeAddress(endereco, { reqId });
    if (!geocode) {
      err(reqId, 'falha no geocoding do endereço da empresa');
      return res.status(500).json({ error: 'Não foi possível obter coordenadas do estabelecimento' });
    }
    const destLat = geocode.lat;
    const destLng = geocode.lng;
    log(reqId, `empresa coords -> lat=${destLat}, lng=${destLng}`);

    // Distance Matrix (ou trocamos por Haversine se preferir custo zero)
    log(reqId, `DistanceMatrix: origin(${clientLat},${clientLng}) -> dest(${destLat},${destLng})`);
    const distanceInfo = await GoogleService.getDistanceMeters(
      {
        origin: { lat: Number(clientLat), lng: Number(clientLng) },
        destination: { lat: Number(destLat), lng: Number(destLng) }
      },
      { reqId }
    );

    if (!distanceInfo || typeof distanceInfo.distanceMeters !== 'number') {
      err(reqId, 'Distance Matrix sem distanceMeters válido:', distanceInfo);
      return res.status(500).json({ error: 'Erro ao calcular distância' });
    }

    log(reqId, `distance=${distanceInfo.distanceMeters}m (${distanceInfo.distanceText || 'n/d'})`);
    const allowed = distanceInfo.distanceMeters <= maxDistanceMeters;
    log(reqId, `DECISÃO -> allowed=${allowed} (limite=${maxDistanceMeters}m)`);

    return res.json({
      allowed,
      distanceMeters: distanceInfo.distanceMeters,
      distanceText: distanceInfo.distanceText,
      maxDistanceMeters,
      reason: allowed ? 'within_radius' : 'out_of_radius'
    });
  } catch (e) {
    err(reqId, 'validateClientDistance error:', e);
    return res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { validateClientDistance };
