// routes/empresaRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../database/connection');

router.post('/criar-empresa', async (req, res) => {
    console.log('Dados recebidos:', req.body);

  const {
    nomeEmpresa,
    cnpj,
    email,
    ddi,
    ddd,
    telefone,
    endereco,
    numero,
    logo,
    idUsuario
  } = req.body;

  const connection = await db.getConnection(); // cria uma conexão dedicada para transação

  try {
    await connection.beginTransaction();

    // 1. Cria a empresa
     const [empresaResult] = await connection.query(`
       INSERT INTO empresa (
         NOME_EMPRESA, CNPJ, EMAIL, DDI, DDD, TELEFONE, ENDERECO, NUMERO, LOGO
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     `, [nomeEmpresa, cnpj, email, ddi, ddd, telefone, endereco, numero, logo]);

     const idEmpresa = empresaResult.insertId;

    // 2. Cria os 3 perfis padrão
    const perfis = [
      { nome: 'Administrador', nivel: 1 },
      { nome: 'Editor', nivel: 2 },
      { nome: 'Leitor', nivel: 3 }
    ];

    for (const perfil of perfis) {
      await connection.query(`
        INSERT INTO perfil (NOME_PERFIL, ID_EMPRESA, NIVEL)
        VALUES (?, ?, ?)
      `, [perfil.nome, idEmpresa, perfil.nivel]);
    }

    // 3. Busca o ID_PERFIL do Administrador recém-criado
    const [[perfilAdmin]] = await connection.query(`
      SELECT ID_PERFIL FROM perfil
      WHERE ID_EMPRESA = ? AND NIVEL = 1
    `, [idEmpresa]);

    // 4. Cria a permissão do usuário como administrador
    await connection.query(`
      INSERT INTO permissoes (ID_EMPRESA, ID_PERFIL, ID_USUARIO)
      VALUES (?, ?, ?)
    `, [idEmpresa, perfilAdmin.ID_PERFIL, idUsuario]);

    // 5. Confirma a transação
    await connection.commit();
    res.json({ message: 'Empresa criada com sucesso!', idEmpresa });

  } catch (error) {
    await connection.rollback();
    console.error('Erro ao criar empresa:', error);
    res.status(500).json({ error: 'Erro ao criar empresa' });
  } finally {
    connection.release();
  }
});

// Buscar empresas que o usuário tem acesso
router.get('/empresas-do-usuario/:idUsuario', async (req, res) => {
  const { idUsuario } = req.params;

  try {
  const [results] = await db.query(`
    SELECT 
      e.ID_EMPRESA,
      e.NOME_EMPRESA,
      p.NOME_PERFIL,
      p.NIVEL
    FROM permissoes pe
    JOIN empresa e ON e.ID_EMPRESA = pe.ID_EMPRESA
    JOIN perfil p ON p.ID_PERFIL = pe.ID_PERFIL
    WHERE pe.ID_USUARIO = ?
  `, [idUsuario]);


    res.json(results);
  } catch (err) {
    console.error('Erro ao buscar empresas do usuário:', err);
    res.status(500).json({ error: 'Erro interno ao buscar empresas.' });
  }
});

// >>> INÍCIO DA NOVA ROTA PARA DETALHES DA EMPRESA <<<
router.get('/detalhes/:idEmpresa', async (req, res) => {
    const { idEmpresa } = req.params;

    try {
        const [empresa] = await db.query(
            `SELECT
                ID_EMPRESA,
                NOME_EMPRESA,
                CNPJ,
                EMAIL,
                DDI,
                DDD,
                TELEFONE,
                ENDERECO,
                NUMERO,
                LOGO
            FROM empresa
            WHERE ID_EMPRESA = ?
            `, [idEmpresa]);

        if (empresa.length === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada.' });
        }

        res.json(empresa[0]); // Retorna apenas o primeiro resultado, pois é por ID
    } catch (err) {
        console.error('Erro ao buscar detalhes da empresa:', err);
        res.status(500).json({ error: 'Erro interno ao buscar detalhes da empresa.' });
    }
});

// Buscar perfis de uma empresa específica
router.get('/perfis/:idEmpresa', async (req, res) => {
    const { idEmpresa } = req.params;
    try {
        const [perfis] = await db.query(
            `SELECT ID_PERFIL, NOME_PERFIL, NIVEL FROM perfil WHERE ID_EMPRESA = ? ORDER BY NIVEL`,
            [idEmpresa]
        );
        res.json(perfis);
    } catch (err) {
        console.error('Erro ao buscar perfis da empresa:', err);
        res.status(500).json({ error: 'Erro interno ao buscar perfis.' });
    }
});

module.exports = router;
