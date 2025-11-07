// back/src/controllers/filaController.js
const db = require('../database/connection');

/* ----------------- Helpers ----------------- */
function toIntOrNull(v) {
  if (v == null || v === '') return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function isWithinRange(ini_vig, fim_vig) {
  const today = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''), 10);
  const ini = toIntOrNull(ini_vig);
  const fim = toIntOrNull(fim_vig);
  return (ini == null || today >= ini) && (fim == null || today <= fim);
}

function yyyymmddFromDate(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${yy}${mm}${dd}`;
}

/* ---------------------------------------------------------------------
   LISTA FILAS + CONFIG
   - QTDE_AGUARDANDO (SIT=0)
   - QTDE_CHAMADAS   (SIT=3)
--------------------------------------------------------------------- */
exports.listarFilasComConfiguracao = async (req, res) => {
  const idEmpresaParam = req.params.idEmpresa ?? req.query.idEmpresa;
  if (!idEmpresaParam) {
    return res.status(400).json({ erro: 'ID da Empresa é obrigatório para listar as filas.' });
  }
  const idEmpresa = parseInt(idEmpresaParam, 10);
  if (Number.isNaN(idEmpresa)) {
    return res.status(400).json({ erro: 'ID da Empresa deve ser um número válido.' });
  }

  const all = String(req.query.all || '0') === '1';
  const hojeFlag = all ? false : (String(req.query.hoje || '1') === '1');
  const apenasAtivas = all ? false : (String(req.query.apenasAtivas || '1') === '1');

  const whereParts = ['f.ID_EMPRESA = ?'];
  const whereParams = [idEmpresa];

  if (hojeFlag) {
    whereParts.push('f.DT_MOVTO >= CURDATE() AND f.DT_MOVTO < CURDATE() + INTERVAL 1 DAY');
  }
  if (apenasAtivas) {
    whereParts.push('f.SITUACAO = 1');
    whereParts.push('f.BLOCK = 0');
  }

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  const sql = `
    SELECT
      f.ID_FILA,
      f.ID_EMPRESA,
      f.ID_CONF_FILA,
      f.DT_MOVTO,
      f.DT_INI,
      f.BLOCK,
      f.SITUACAO,
      cf.NOME_FILA,
      cf.FIM_VIG,
      COALESCE(w.QTDE_AGUARDANDO, 0) AS QTDE_AGUARDANDO,
      COALESCE(w2.QTDE_CHAMADAS, 0)   AS QTDE_CHAMADAS
    FROM fila f
    INNER JOIN ConfiguracaoFila cf
            ON cf.ID_CONF_FILA = f.ID_CONF_FILA
    LEFT JOIN (
      SELECT
        fc.ID_FILA,
        COUNT(*) AS QTDE_AGUARDANDO
      FROM clientesfila fc
      WHERE fc.SITUACAO = 0
      GROUP BY fc.ID_FILA
    ) w
      ON w.ID_FILA = f.ID_FILA
    LEFT JOIN (
      SELECT
        fc2.ID_FILA,
        COUNT(*) AS QTDE_CHAMADAS
      FROM clientesfila fc2
      WHERE fc2.SITUACAO = 3
      GROUP BY fc2.ID_FILA
    ) w2
      ON w2.ID_FILA = f.ID_FILA
    ${whereSql}
    ORDER BY f.DT_MOVTO DESC, f.ID_FILA DESC
  `;

  try {
    const [rows] = await db.execute(sql, whereParams);

    const formatted = rows.map((r) => ({
      ID_FILA: r.ID_FILA,
      ID_EMPRESA: r.ID_EMPRESA,
      ID_CONF_FILA: r.ID_CONF_FILA,
      NOME_FILA: r.NOME_FILA,
      DT_MOVTO: r.DT_MOVTO,
      DT_INI: r.DT_INI,
      FIM_VIG: r.FIM_VIG,
      BLOCK: r.BLOCK === 1,
      SITUACAO: r.SITUACAO === 1,
      QTDE_AGUARDANDO: Number(r.QTDE_AGUARDANDO) || 0,
      QTDE_CHAMADAS: Number(r.QTDE_CHAMADAS) || 0,
    }));

    return res.json(formatted);
  } catch (err) {
    console.error('Erro ao listar filas com configuração:', err);
    return res.status(500).json({ erro: 'Erro interno ao listar filas.' });
  }
};

/* ---------------------------------------------------------------------
   COUNT por fila (endpoint dedicado)
   GET /filas/:idFila/count?status=aguardando|chamadas&data=YYYYMMDD
   - aguardando => SIT=0
   - chamadas   => SIT=3
--------------------------------------------------------------------- */
exports.countByFila = async (req, res) => {
  const idFila = parseInt(req.params.idFila, 10);
  if (Number.isNaN(idFila)) return res.status(400).json({ erro: 'idFila inválido' });

  const status = String(req.query.status || 'aguardando').toLowerCase();
  const dataYmd = req.query.data ? String(req.query.data) : null;

  const statusMap = {
    aguardando: 0,
    chamadas: 3,
    chamada: 3,
    'chamadas_nao_apresentadas': 3,
  };
  const situacaoCode = statusMap[status];
  if (situacaoCode === undefined) {
    return res.status(400).json({ erro: 'status inválido' });
  }

  try {
    if (dataYmd && /^\d{8}$/.test(dataYmd)) {
      const [[f]] = await db.query(
        `SELECT DATE_FORMAT(DT_MOVTO, '%Y%m%d') AS YMD FROM fila WHERE ID_FILA = ? LIMIT 1`,
        [idFila]
      );
      if (!f) return res.status(404).json({ erro: 'fila_not_found' });
      if (String(f.YMD) !== dataYmd) {
        return res.status(409).json({ erro: 'fila_nao_pertence_a_data' });
      }
    }

    const [[row]] = await db.query(
      `SELECT COUNT(*) AS QTD
         FROM clientesfila
        WHERE ID_FILA = ? AND SITUACAO = ?`,
      [idFila, situacaoCode]
    );
    const count = Number(row?.QTD ?? 0);
    return res.json({ count });
  } catch (e) {
    console.error('[filas/count] ERRO:', e);
    return res.status(500).json({ erro: 'internal_error' });
  }
};

/* ----------------- Toggles por ID_FILA (BLOCK/SITUACAO) ----------------- */
exports.toggleFilaBlock = async (req, res) => {
  const { id_fila } = req.params;
  const { block } = req.body;
  if (typeof block !== 'boolean') {
    return res.status(400).json({ erro: 'Status de bloqueio inválido. Esperado true ou false.' });
  }
  try {
    const [result] = await db.execute(`UPDATE fila SET BLOCK = ? WHERE ID_FILA = ?`, [block ? 1 : 0, id_fila]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: 'Fila não encontrada para atualizar o status de bloqueio.' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao atualizar bloqueio:', err);
    return res.status(500).json({ erro: 'Erro interno ao atualizar bloqueio.' });
  }
};

exports.toggleFilaSituacao = async (req, res) => {
  const { id_fila } = req.params;
  const { situacao } = req.body;
  if (typeof situacao !== 'boolean') {
    return res.status(400).json({ erro: 'Status de situação inválido. Esperado true ou false.' });
  }
  const situacaoValue = situacao ? 1 : 0;
  const dtInativ = situacaoValue === 0 ? new Date() : null;

  try {
    const [result] = await db.execute(
      `UPDATE fila SET SITUACAO = ?, DT_INATIV = ? WHERE ID_FILA = ?`,
      [situacaoValue, dtInativ, id_fila]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: 'Fila não encontrada para atualizar o status de situação.' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao atualizar situação:', err);
    return res.status(500).json({ erro: 'Erro interno ao atualizar situação.' });
  }
};

/* ----------------- STATUS / TOGGLE por ID_CONF_FILA ----------------- */
exports.statusByConf = async (req, res) => {
  const idConfFila = Number(req.query.idConfFila);
  if (!idConfFila) return res.status(400).json({ erro: 'idConfFila é obrigatório' });

  try {
    const [[cfg]] = await db.query(
      `SELECT ID_EMPRESA, INI_VIG, FIM_VIG, SITUACAO AS SITUACAO_CONFIG
         FROM ConfiguracaoFila
        WHERE ID_CONF_FILA = ?
        LIMIT 1`,
      [idConfFila]
    );
    if (!cfg) return res.status(404).json({ erro: 'config_not_found' });

    const withinRange = isWithinRange(cfg.INI_VIG, cfg.FIM_VIG);
    const effectiveActive = cfg.SITUACAO_CONFIG === 1 && withinRange;

    const [rows] = await db.query(
      `SELECT BLOCK, SITUACAO
         FROM fila
        WHERE ID_EMPRESA = ?
          AND ID_CONF_FILA = ?
          AND DT_MOVTO >= CURDATE()
          AND DT_MOVTO <  CURDATE() + INTERVAL 1 DAY
        ORDER BY ID_FILA DESC
        LIMIT 1`,
      [cfg.ID_EMPRESA, idConfFila]
    );

    const blockFlag = rows.length ? rows[0].BLOCK === 1 : false;
    const situacaoFila = rows.length ? rows[0].SITUACAO : 1;
    const filaInativa = situacaoFila === 0;
    const effectiveBlocked = !effectiveActive || blockFlag || filaInativa;

    return res.json({
      blocked: effectiveBlocked,
      situacaoConfig: cfg.SITUACAO_CONFIG,
      withinRange,
      effectiveActive,
    });
  } catch (e) {
    console.error('[filas/status] ERRO:', e);
    return res.status(500).json({ erro: 'internal_error' });
  }
};

exports.toggleBlockByConf = async (req, res) => {
  const { idConfFila, blocked } = req.body || {};
  if (!idConfFila || typeof blocked !== 'boolean') {
    return res.status(400).json({ erro: 'idConfFila e blocked são obrigatórios' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[cfg]] = await conn.query(
      `SELECT ID_EMPRESA, INI_VIG, FIM_VIG, SITUACAO AS SITUACAO_CONFIG
         FROM ConfiguracaoFila
        WHERE ID_CONF_FILA = ?
        LIMIT 1`,
      [idConfFila]
    );
    if (!cfg) {
      await conn.rollback();
      return res.status(404).json({ erro: 'config_not_found' });
    }

    const withinRange = isWithinRange(cfg.INI_VIG, cfg.FIM_VIG);
    const effectiveActive = cfg.SITUACAO_CONFIG === 1 && withinRange;
    if (!effectiveActive) {
      await conn.rollback();
      return res.status(409).json({
        erro: 'inactive_or_out_of_range',
        situacaoConfig: cfg.SITUACAO_CONFIG,
        withinRange,
      });
    }

    const [rows] = await conn.query(
      `SELECT ID_FILA
         FROM fila
        WHERE ID_EMPRESA = ?
          AND ID_CONF_FILA = ?
          AND DT_MOVTO >= CURDATE()
          AND DT_MOVTO <  CURDATE() + INTERVAL 1 DAY
        ORDER BY ID_FILA DESC
        LIMIT 1`,
      [cfg.ID_EMPRESA, idConfFila]
    );

    const blockVal = blocked ? 1 : 0;
    const situacaoVal = blocked ? 0 : 1;

    if (rows.length) {
      await conn.query(
        `UPDATE fila SET BLOCK = ?, SITUACAO = ? WHERE ID_FILA = ?`,
        [blockVal, situacaoVal, rows[0].ID_FILA]
      );
    } else {
      await conn.query(
        `INSERT INTO fila (ID_EMPRESA, ID_CONF_FILA, DT_MOVTO, DT_INI, BLOCK, SITUACAO)
         VALUES (?, ?, CURDATE(), NOW(), ?, ?)`,
        [cfg.ID_EMPRESA, idConfFila, blockVal, situacaoVal]
      );
    }

    await conn.commit();
    return res.json({ ok: true, blocked });
  } catch (e) {
    await conn.rollback();
    console.error('[filas/toggle-block] ERRO:', e);
    return res.status(500).json({ erro: 'internal_error' });
  } finally {
    conn.release();
  }
};

exports.applyConfigToToday = async (req, res) => {
  const { idConfFila, bloquearHoje } = req.body || {};
  if (!idConfila && idConfFila !== 0) { // pequena proteção caso chegue undefined
    return res.status(400).json({ erro: 'idConfFila é obrigatório' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[cfg]] = await conn.query(
      `SELECT ID_EMPRESA, INI_VIG, FIM_VIG, SITUACAO AS SITUACAO_CONFIG
         FROM ConfiguracaoFila
        WHERE ID_CONF_FILA = ?
        LIMIT 1`,
      [idConfFila]
    );
    if (!cfg) {
      await conn.rollback();
      return res.status(404).json({ erro: 'config_not_found' });
    }

    const withinRange = isWithinRange(cfg.INI_VIG, cfg.FIM_VIG);
    const effectiveActive = (cfg.SITUACAO_CONFIG === 1) && withinRange;

    const targetSituacao = effectiveActive ? 1 : 0;
    const targetBlock    = effectiveActive ? (bloquearHoje ? 1 : 0) : 1;

    const [rows] = await conn.query(
      `SELECT ID_FILA
         FROM fila
        WHERE ID_EMPRESA = ?
          AND ID_CONF_FILA = ?
          AND DT_MOVTO >= CURDATE()
          AND DT_MOVTO <  CURDATE() + INTERVAL 1 DAY
        ORDER BY ID_FILA DESC
        LIMIT 1`,
      [cfg.ID_EMPRESA, idConfFila]
    );

    if (rows.length) {
      await conn.query(
        `UPDATE fila SET BLOCK = ?, SITUACAO = ? WHERE ID_FILA = ?`,
        [targetBlock, targetSituacao, rows[0].ID_FILA]
      );
    } else {
      await conn.query(
        `INSERT INTO fila (ID_EMPRESA, ID_CONF_FILA, DT_MOVTO, DT_INI, BLOCK, SITUACAO)
         VALUES (?, ?, CURDATE(), NOW(), ?, ?)`,
        [cfg.ID_EMPRESA, idConfFila, targetBlock, targetSituacao]
      );
    }

    await conn.commit();
    return res.json({
      ok: true,
      effectiveActive,
      applied: { BLOCK: targetBlock, SITUACAO: targetSituacao }
    });
  } catch (e) {
    await conn.rollback();
    console.error('[filas/apply-config] ERRO:', e);
    return res.status(500).json({ erro: 'internal_error' });
  } finally {
    conn.release();
  }
};

/* ---------------------------------------------------------------------
   Listar configurações por empresa
--------------------------------------------------------------------- */
exports.listarFilasPorEmpresa = async (req, res) => {
  const { id_empresa } = req.params;
  if (!id_empresa) {
    return res.status(400).json({ erro: 'ID da empresa é obrigatório.' });
  }

  const sql = `
    SELECT
      cf.ID_CONF_FILA,
      cf.ID_EMPRESA,
      cf.NOME_FILA,
      cf.INI_VIG,
      cf.FIM_VIG,
      cf.SITUACAO
    FROM ConfiguracaoFila cf
    WHERE cf.ID_EMPRESA = ?
    ORDER BY cf.NOME_FILA ASC, cf.ID_CONF_FILA DESC
  `;

  try {
    const [rows] = await db.execute(sql, [id_empresa]);
    return res.status(200).json(rows);
  } catch (err) {
    console.error('Erro ao listar filas por empresa:', err);
    return res.status(500).json({ erro: 'Erro interno ao listar filas.', detalhes: err.message });
  }
};
