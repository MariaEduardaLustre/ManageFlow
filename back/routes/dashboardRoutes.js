// routes/dashboardRoutes.js
const express = require("express");
const db = require("../database/connection");

module.exports = function dashboardRoutes(io) {
  const router = express.Router();

  // clientes entram na sala da empresa
  if (io && !io._dashboardHooked) {
    io._dashboardHooked = true;
    io.on("connection", (socket) => {
      socket.on("dashboard:join", (empresaId) => {
        if (!empresaId) return;
        socket.join(`empresa:${empresaId}`);
      });
    });

    // "tick" global a cada 10s (clients refazem GET /summary)
    setInterval(() => io.emit("dashboard:tick"), 10000);
  }

  router.get("/summary", async (req, res) => {
    const idEmpresa = Number(req.query.idEmpresa || req.headers["x-empresa-id"]);
    if (!idEmpresa) return res.status(400).json({ erro: "idEmpresa é obrigatório." });

    try {
      // total filas + ativas
      const [[tot]] = await db.query(
        `SELECT
           COUNT(*) AS totalQueues,
           SUM(CASE WHEN SITUACAO=1 THEN 1 ELSE 0 END) AS activeQueues
         FROM ConfiguracaoFila
         WHERE ID_EMPRESA = ?`,
        [idEmpresa]
      );

      // bloqueadas hoje (fila BLOCK=1 hoje) — usando intervalo para usar índice
      const [[blk]] = await db.query(
        `SELECT COUNT(*) AS blockedQueues
           FROM fila
          WHERE ID_EMPRESA = ?
            AND DT_MOVTO >= CURDATE()
            AND DT_MOVTO <  CURDATE() + INTERVAL 1 DAY
            AND BLOCK = 1`,
        [idEmpresa]
      );

      // pessoas hoje
      const [[ppl]] = await db.query(
        `SELECT COUNT(*) AS peopleToday
           FROM clientesfila
          WHERE ID_EMPRESA = ?
            AND DT_MOVTO >= CURDATE()
            AND DT_MOVTO <  CURDATE() + INTERVAL 1 DAY`,
        [idEmpresa]
      );

      // espera média (min) dos que estão aguardando (SITUACAO 0,3) hoje
      const [[avg]] = await db.query(
        `SELECT AVG(TIMESTAMPDIFF(MINUTE, DT_ENTRA, NOW())) AS avgWaitMinutes
           FROM clientesfila
          WHERE ID_EMPRESA = ?
            AND DT_MOVTO >= CURDATE()
            AND DT_MOVTO <  CURDATE() + INTERVAL 1 DAY
            AND SITUACAO IN (0,3)`,
        [idEmpresa]
      );

      // por fila (nome + aguardando agora) hoje
      const [perQueue] = await db.query(
        `SELECT
            cf.ID_CONF_FILA,
            cf.NOME_FILA,
            COALESCE(f.BLOCK,0) AS blocked,
            COALESCE(qtd.waiting,0) AS waiting,
            MAX(cl.DT_ENTRA) AS lastUpdateISO
         FROM ConfiguracaoFila cf
         LEFT JOIN fila f
           ON f.ID_EMPRESA   = cf.ID_EMPRESA
          AND f.ID_CONF_FILA = cf.ID_CONF_FILA
          AND f.DT_MOVTO    >= CURDATE()
          AND f.DT_MOVTO    <  CURDATE() + INTERVAL 1 DAY
         LEFT JOIN (
           SELECT ID_EMPRESA, ID_FILA, COUNT(*) AS waiting
             FROM clientesfila
            WHERE DT_MOVTO >= CURDATE()
              AND DT_MOVTO <  CURDATE() + INTERVAL 1 DAY
              AND SITUACAO IN (0,3)
            GROUP BY ID_EMPRESA, ID_FILA
         ) qtd
           ON qtd.ID_EMPRESA = f.ID_EMPRESA
          AND qtd.ID_FILA    = f.ID_FILA
         LEFT JOIN clientesfila cl
           ON cl.ID_EMPRESA = f.ID_EMPRESA
          AND cl.ID_FILA    = f.ID_FILA
          AND cl.DT_MOVTO  >= CURDATE()
          AND cl.DT_MOVTO  <  CURDATE() + INTERVAL 1 DAY
         WHERE cf.ID_EMPRESA = ?
         GROUP BY cf.ID_CONF_FILA, cf.NOME_FILA, blocked, waiting
         ORDER BY waiting DESC, cf.NOME_FILA ASC`,
        [idEmpresa]
      );

      // entradas por hora (hoje) — compatível com ONLY_FULL_GROUP_BY
      const [hours] = await db.query(
        `SELECT
           CONCAT(LPAD(h,2,'0'), ':00') AS label,
           cnt AS count
         FROM (
           SELECT HOUR(DT_ENTRA) AS h, COUNT(*) AS cnt
             FROM clientesfila
            WHERE ID_EMPRESA = ?
              AND DT_MOVTO  >= CURDATE()
              AND DT_MOVTO  <  CURDATE() + INTERVAL 1 DAY
            GROUP BY HOUR(DT_ENTRA)
         ) t
         ORDER BY h`,
        [idEmpresa]
      );

      res.json({
        totals: {
          totalQueues: Number(tot.totalQueues || 0),
          activeQueues: Number(tot.activeQueues || 0),
          blockedQueues: Number(blk.blockedQueues || 0),
          avgWaitMinutes: Math.round(avg?.avgWaitMinutes || 0),
          peopleToday: Number(ppl.peopleToday || 0),
        },
        perQueue: perQueue.map((r) => ({
          id_conf_fila: r.ID_CONF_FILA,
          nome_fila: r.NOME_FILA,
          waiting: Number(r.waiting || 0),
          blocked: Number(r.blocked || 0) === 1,
          lastUpdateISO: r.lastUpdateISO,
        })),
        joinsLastHours: hours.map((h) => ({ label: h.label, count: Number(h.count || 0) })),
      });
    } catch (e) {
      console.error("[dashboard/summary] ERRO:", e);
      res.status(500).json({ erro: "internal_error" });
    }
  });

  return router;
};
