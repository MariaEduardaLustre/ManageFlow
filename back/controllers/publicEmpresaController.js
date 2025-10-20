// back/src/controllers/publicEmpresaController.js
const db = require('../database/connection');

let makePublicImageUrl;
try {
  ({ makePublicImageUrl } = require('../utils/image'));
} catch {
  makePublicImageUrl = (path, req) => {
    if (!path) return null;
    const base =
      process.env.PUBLIC_API_BASE_URL ||
      `${req.protocol}://${req.get('host')}`;
    return path.startsWith('http') ? path : `${base}${path}`;
  };
}

/** Helper: sanitiza paginação */
function parsePagination(qs) {
  const page = Math.max(1, parseInt(qs.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(qs.pageSize, 10) || 10));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

/** GET /api/public/empresa/:id
 * Retorna:
 * {
 *   empresa: { id, nome, logo },
 *   resumo: { media, total, dist: { "1": n, "2": n, ... "5": n } },
 *   avaliacoes: [{ id, data, nota, comentario, criadoEm }]
 * }
 */
exports.getPerfilEmpresaById = async (req, res) => {
  try {
    const idEmpresa = Number(req.params.id);
    if (!Number.isFinite(idEmpresa) || idEmpresa <= 0) {
      return res.status(400).json({ error: 'ID_EMPRESA_INVALIDO' });
    }
    const { page, pageSize, offset } = parsePagination(req.query);

    // 1) Empresa
    const [[empresa]] = await db.query(
      `SELECT ID_EMPRESA, NOME_EMPRESA, LOGO
         FROM empresa
        WHERE ID_EMPRESA = ?
        LIMIT 1`,
      [idEmpresa]
    );
    if (!empresa) {
      return res.status(404).json({ error: 'EMPRESA_NAO_ENCONTRADA' });
    }

    // 2) Resumo (média + total)
    const [[resumo]] = await db.query(
      `SELECT 
          ROUND(AVG(NOTA), 1) AS media,
          COUNT(*) AS total
         FROM avaliacoes
        WHERE ID_EMPRESA = ?`,
      [idEmpresa]
    );
    const media = resumo?.media ? Number(resumo.media) : 0;
    const total = resumo?.total ? Number(resumo.total) : 0;

    // 3) Distribuição 1..5
    const [distRows] = await db.query(
      `SELECT 
          FLOOR(NOTA) AS estrelas,
          COUNT(*) AS qtd
         FROM avaliacoes
        WHERE ID_EMPRESA = ?
        GROUP BY FLOOR(NOTA)
        ORDER BY estrelas`,
      [idEmpresa]
    );
    const dist = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const r of distRows) {
      const e = String(r.estrelas);
      if (['1', '2', '3', '4', '5'].includes(e)) {
        dist[e] = Number(r.qtd);
      }
    }

    // 4) Lista paginada
    const [items] = await db.query(
      `SELECT 
          ID_AVALIACAO,
          DT_MOVTO,
          NOTA,
          COMENTARIO,
          COALESCE(CREATED_AT, NOW()) AS CREATED_AT
         FROM avaliacoes
        WHERE ID_EMPRESA = ?
        ORDER BY CREATED_AT DESC, ID_AVALIACAO DESC
        LIMIT ? OFFSET ?`,
      [idEmpresa, pageSize, offset]
    );

    const avaliacoes = items.map((it) => ({
      id: it.ID_AVALIACAO,
      data: it.DT_MOVTO,
      nota: Number(it.NOTA),
      comentario: it.COMENTARIO || null,
      criadoEm: it.CREATED_AT,
    }));

    const logoUrl = makePublicImageUrl(empresa.LOGO, req);

    return res.json({
      empresa: {
        id: empresa.ID_EMPRESA,
        nome: empresa.NOME_EMPRESA,
        logo: logoUrl
      },
      resumo: {
        media,
        total,
        dist
      },
      paginacao: { page, pageSize },
      avaliacoes
    });
  } catch (error) {
    console.error('[GET /public/empresa/:id] erro:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
      sql: error.sql
    });
    return res.status(500).json({ error: 'ERRO_INTERNO', detail: error.sqlMessage || error.message });
  }
};

/** Aceita tanto AV-<id>-TOKEN (avaliação) quanto PV-<id>-TOKEN (perfil) */
function parseEmpresaIdFromAnyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const m = token.match(/^(AV|PV)-(\d+)-TOKEN$/i);
  if (!m) return null;
  const id = Number(m[2]);
  return Number.isFinite(id) ? id : null;
}

/** GET /api/public/empresa/by-token/:token */
exports.getPerfilEmpresaByToken = async (req, res) => {
  const { token } = req.params;
  const idEmpresa = parseEmpresaIdFromAnyToken(token);
  if (!idEmpresa) {
    return res.status(400).json({ error: 'TOKEN_INVALIDO', detail: 'Formato esperado: AV-<ID_EMPRESA>-TOKEN ou PV-<ID_EMPRESA>-TOKEN.' });
  }
  req.params.id = String(idEmpresa);
  return exports.getPerfilEmpresaById(req, res);
};
