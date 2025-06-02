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
// >>> FIM DA NOVA ROTA PARA DETALHES DA EMPRESA <<<




// >>> INÍCIO DA NOVA ROTA PARA BUSCAR FILAS DA EMPRESA <<<
router.get('/filas/:idEmpresa', async (req, res) => {
    const { idEmpresa } = req.params;
 
    try {
        // Consulta SQL para buscar as filas da empresa
        const [filas] = await db.query(`
          SELECT
              f.ID_FILA,
              f.ID_EMPRESA, -- <<<<<<< ADICIONE ESTA LINHA AQUI!
              f.DT_MOVTO,
              f.DT_INI,
              f.DT_FIM,
              f.DT_INATIV,
              f.BLOCK,
              f.SITUACAO,
              cf.NOME_FILA,
              cf.TOKEN_FILA,
              cf.MENSAGEM,
              cf.TEMP_TOL,
              cf.QDTE_MIN,
              cf.QTDE_MAX
          FROM Fila f
          JOIN ConfiguracaoFila cf ON f.ID_CONF_FILA = cf.ID_CONF_FILA AND f.ID_EMPRESA = cf.ID_EMPRESA
          WHERE f.ID_EMPRESA = ?
          ORDER BY f.DT_INI DESC, cf.NOME_FILA ASC
        `, [idEmpresa]);




      // Verifica se encontrou filas
      if (filas.length === 0) {
          return res.status(404).json({ message: 'Nenhuma fila encontrada para esta empresa.' });
      }




      // Retorna as filas como JSON
      res.json(filas);




  } catch (err) {
      console.error('Erro ao buscar filas da empresa:', err);
      res.status(500).json({ error: 'Erro interno ao buscar filas da empresa.' });
  }
});
// >>> FIM DA NOVA ROTA PARA BUSCAR FILAS DA EMPRESA <<<




// >>> INÍCIO DA NOVA ROTA PARA BUSCAR CLIENTES DE UMA FILA ESPECÍFICA <<<
router.get('/fila/:idEmpresa/:dtMovto/:idFila/clientes', async (req, res) => {
    const { idEmpresa, dtMovto, idFila } = req.params;




    try {
        const [clientes] = await db.query(`
            SELECT
                ID_EMPRESA,
                DT_MOVTO,
                ID_FILA,
                ID_CLIENTE,
                CPFCNPJ,
                RG,
                NOME,
                DT_NASC,
                EMAIL,
                NR_QTDPES,
                DDDCEL,
                NR_CEL,
                CAMPOS,
                DT_ENTRA,
                DT_CHAMA,
                DT_LIMAPRE,
                DT_APRE,
                DT_SAIDA,
                DV133_NR_USRDEL,
                DV133_NR_LAT,
                DV133_NR_LNG,
                SITUACAO
            FROM
                clientes_fila
            WHERE
                ID_EMPRESA = ? AND DT_MOVTO = ? AND ID_FILA = ?
            ORDER BY
                DT_ENTRA ASC
        `, [idEmpresa, dtMovto, idFila]);




        if (clientes.length === 0) {
            return res.status(404).json({ message: 'Nenhum cliente encontrado para esta fila.' });
        }




        res.json(clientes);
    } catch (err) {
        console.error('Erro ao buscar clientes da fila:', err);
        res.status(500).json({ error: 'Erro interno ao buscar clientes da fila.' });
    }
});
// >>> FIM DA NOVA ROTA PARA BUSCAR CLIENTES DE UMA FILA ESPECÍFICA <<<




// >>> INÍCIO DA ROTA PARA ATUALIZAR STATUS DO CLIENTE NA FILA <<<
router.put('/fila/:idEmpresa/:dtMovto/:idFila/cliente/:idCliente/atualizar-situacao', async (req, res) => {
    const { idEmpresa, dtMovto, idFila, idCliente } = req.params;
    const { novaSituacao } = req.body; // Espera a nova situação (código) no corpo da requisição




    // Validar novaSituacao se necessário, por exemplo, garantir que seja um dos valores esperados (ex: 1 para presente, 2 para não compareceu)
    if (typeof novaSituacao === 'undefined' || novaSituacao === null) {
        return res.status(400).json({ error: 'Nova situação não fornecida.' });
    }




    // Obter a data e hora atual no formato MySQL DATETIME/TIMESTAMP
    const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');




    let updateField = '';
    // SITUACAO: 0 = Aguardando, 1 = Confirmado Presença, 2 = Não Compareceu
    switch (novaSituacao) {
        case 1: // Confirmado Presença
            updateField = 'DT_APRE = ?'; // Data de apresentação
            break;
        case 2: // Não Compareceu
            updateField = 'DT_SAIDA = ?'; // Data de saída (ou inativação da entrada)
            break;
        default:
            return res.status(400).json({ error: 'Situação inválida fornecida.' });
    }




    try {
        const [result] = await db.query(`
            UPDATE clientes_fila
            SET SITUACAO = ?, ${updateField}
            WHERE ID_EMPRESA = ? AND DT_MOVTO = ? AND ID_FILA = ? AND ID_CLIENTE = ?
        `, [novaSituacao, currentTimestamp, idEmpresa, dtMovto, idFila, idCliente]);




        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cliente da fila não encontrado ou dados já atualizados.' });
        }




        res.json({ message: 'Situação do cliente atualizada com sucesso!' });




    } catch (err) {
        console.error('Erro ao atualizar situação do cliente na fila:', err);
        res.status(500).json({ error: 'Erro interno ao atualizar situação do cliente na fila.' });
    }
});
// >>> FIM DA ROTA PARA ATUALIZAR STATUS DO CLIENTE NA FILA <<<




module.exports = router;





