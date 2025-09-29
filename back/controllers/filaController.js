const db = require('../database/connection');

// ----------------- Helpers -----------------
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

// ---------------------------------------------------------------------
// LISTA FILAS + CONFIG + QTDE_AGUARDANDO (SITUACAO IN (0,3))
// ---------------------------------------------------------------------
/**
 * GET /empresas/filas/:idEmpresa
 * GET /empresas/filas?idEmpresa=...
 *
 * Retorna:
 *  - ID_FILA, ID_EMPRESA, ID_CONF_FILA
 *  - DT_MOVTO, DT_INI
 *  - BLOCK (boolean), SITUACAO (boolean)
 *  - NOME_FILA (da ConfiguracaoFila)
 *  - FIM_VIG (da ConfiguracaoFila)  -> use como “Data Fim Fila”
 *  - QTDE_AGUARDANDO                -> clientes com SITUACAO 0 (Aguardando) OU 3 (Chamado)
 *
 * Obs.: compatível com ONLY_FULL_GROUP_BY (subselect agregado com GROUP BY).
 */
exports.listarFilasComConfiguracao = async (req, res) => {
  const idEmpresaParam = req.params.idEmpresa ?? req.query.idEmpresa;
  if (!idEmpresaParam) {
    return res.status(400).json({ erro: 'ID da Empresa é obrigatório para listar as filas.' });
  }
  const idEmpresa = parseInt(idEmpresaParam, 10);
  if (Number.isNaN(idEmpresa)) {
    return res.status(400).json({ erro: 'ID da Empresa deve ser um número válido.' });
  }

  // IMPORTANTE:
  // - Tabela de itens da fila: aqui usei "clientesfila" e coluna "SITUACAO" (0,1,2,3,4).
  //   Ajuste o nome se no seu schema for diferente.
  // - A contagem é por ID_FILA (do dia), então não é necessário filtrar data no subselect.
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
      COALESCE(w.QTDE_AGUARDANDO, 0) AS QTDE_AGUARDANDO
    FROM fila f
    INNER JOIN ConfiguracaoFila cf
            ON cf.ID_CONF_FILA = f.ID_CONF_FILA
    LEFT JOIN (
      SELECT
        fc.ID_FILA,
        COUNT(*) AS QTDE_AGUARDANDO
      FROM clientesfila fc
      WHERE fc.SITUACAO IN (0, 3)  -- 0=Aguardando, 3=Chamado
      GROUP BY fc.ID_FILA
    ) w
      ON w.ID_FILA = f.ID_FILA
    WHERE f.ID_EMPRESA = ?
    ORDER BY f.DT_MOVTO DESC, f.ID_FILA DESC
  `;

  try {
    const [rows] = await db.execute(sql, [idEmpresa]);

    const formatted = rows.map((r) => ({
      ID_FILA: r.ID_FILA,
      ID_EMPRESA: r.ID_EMPRESA,
      ID_CONF_FILA: r.ID_CONF_FILA,
      NOME_FILA: r.NOME_FILA,
      DT_MOVTO: r.DT_MOVTO,  // deixe o front formatar
      DT_INI: r.DT_INI,
      FIM_VIG: r.FIM_VIG,    // fim da vigência da configuração
      BLOCK: r.BLOCK === 1,
      SITUACAO: r.SITUACAO === 1,
      QTDE_AGUARDANDO: Number(r.QTDE_AGUARDANDO) || 0,
    }));

    return res.json(formatted);
  } catch (err) {
    console.error('Erro ao listar filas com configuração:', err);
    return res.status(500).json({ erro: 'Erro interno ao listar filas.' });
  }
};

// ----------------- Toggles por ID_FILA (BLOCK/SITUACAO) -----------------
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

// ----------------- STATUS / TOGGLE por ID_CONF_FILA -----------------
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
  if (!idConfFila) return res.status(400).json({ erro: 'idConfFila é obrigatório' });

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
// Função para listar as filas configuradas por empresa
exports.listarFilasPorEmpresa = async (req, res) => {
    const { id_empresa } = req.params; // ID da empresa passada como parâmetro

    if (!id_empresa) {
        return res.status(400).json({ erro: 'ID da empresa é obrigatório.' });
    }

    const sql = `
        SELECT 
            f.NOME_FILA, 
            COUNT(cf.ID_FILA) AS contagem, 
            COALESCE(f.DT_ALTERACAO, f.INI_VIG, NOW()) AS data_configuracao
        FROM 
            clientesfila cf
        JOIN 
            ConfiguracaoFila f ON f.ID_FILA = cf.ID_FILA
        WHERE 
            cf.ID_EMPRESA = ?
        GROUP BY 
            f.NOME_FILA
        ORDER BY 
            data_configuracao DESC
    `;

    try {
        const [results] = await db.execute(sql, [id_empresa]);
        res.status(200).json(results); // Retorna as filas encontradas
    } catch (err) {
        console.error('Erro ao listar filas por empresa:', err);
        res.status(500).json({ erro: 'Erro interno ao listar filas.', detalhes: err.message });
    }
};
