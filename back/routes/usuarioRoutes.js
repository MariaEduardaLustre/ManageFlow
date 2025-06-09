const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const db = require('../database/connection');

// ... (suas outras rotas como /login, /usuarios, etc. continuam aqui) ...
router.post('/usuarios', usuarioController.cadastrarUsuario);
router.post('/login', usuarioController.loginUsuario);
// ...

// Listar usuários de uma empresa (já corrigido anteriormente)
router.get('/empresa/:idEmpresa', async (req, res) => {
    const { idEmpresa } = req.params;
    try {
        // << NOVA QUERY >> Adicionamos um JOIN com a tabela de perfil para buscar o nome e o ID da permissão de cada usuário
        const [usuarios] = await db.query(`
            SELECT 
                u.ID, u.NOME, u.EMAIL, u.CPFCNPJ, u.CEP, u.DDI, u.DDD, u.TELEFONE,
                perf.ID_PERFIL, perf.NOME_PERFIL 
            FROM usuario u
            INNER JOIN permissoes p ON p.ID_USUARIO = u.ID
            INNER JOIN perfil perf ON perf.ID_PERFIL = p.ID_PERFIL
            WHERE p.ID_EMPRESA = ?
        `, [idEmpresa]);
        res.json(usuarios);
    } catch (error) {
        console.error('Erro ao buscar usuários da empresa:', error);
        res.status(500).json({ error: 'Erro ao buscar usuários da empresa' });
    }
});

// Adicionar um usuário existente a uma empresa
// << ROTA MODIFICADA >> Agora ela recebe o idPerfil no corpo da requisição
router.post('/empresa/:idEmpresa/adicionar-usuario', async (req, res) => {
    const { cpfOuEmail, idPerfil } = req.body; // << MUDANÇA AQUI: recebemos o idPerfil
    const { idEmpresa } = req.params;

    if (!idPerfil) {
        return res.status(400).json({ error: 'É necessário selecionar um perfil de permissão.' });
    }

    try {
        const [usuarioRows] = await db.query('SELECT ID FROM Usuario WHERE CPFCNPJ = ? OR EMAIL = ?', [cpfOuEmail, cpfOuEmail]);

        if (usuarioRows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado em nosso sistema.' });
        }
        const idUsuario = usuarioRows[0].ID;

        const [jaExiste] = await db.query('SELECT * FROM permissoes WHERE ID_EMPRESA = ? AND ID_USUARIO = ?', [idEmpresa, idUsuario]);
        if (jaExiste.length > 0) {
            return res.status(409).json({ error: 'Este usuário já faz parte da empresa.' });
        }

        // << MUDANÇA AQUI >> Usamos o idPerfil recebido, em vez de buscar o Leitor (nível 3)
        await db.query(
            'INSERT INTO permissoes (ID_EMPRESA, ID_PERFIL, ID_USUARIO) VALUES (?, ?, ?)',
            [idEmpresa, idPerfil, idUsuario]
        );

        res.json({ message: 'Usuário adicionado à empresa com sucesso.' });
    } catch (err) {
        console.error('Erro ao adicionar usuário à empresa:', err);
        res.status(500).json({ error: 'Erro interno ao adicionar usuário.' });
    }
});

// << NOVA ROTA >> Para editar a permissão de um usuário
router.put('/permissoes/:idEmpresa/:idUsuario', async (req, res) => {
    const { idEmpresa, idUsuario } = req.params;
    const { idPerfil } = req.body; // Novo ID do perfil

    if (!idPerfil) {
        return res.status(400).json({ error: 'É necessário fornecer um novo perfil.' });
    }

    try {
        const [result] = await db.query(
            'UPDATE permissoes SET ID_PERFIL = ? WHERE ID_EMPRESA = ? AND ID_USUARIO = ?',
            [idPerfil, idEmpresa, idUsuario]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Permissão não encontrada para este usuário e empresa.' });
        }

        res.json({ message: 'Permissão do usuário atualizada com sucesso.' });
    } catch (error) {
        console.error('Erro ao atualizar permissão:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar a permissão.' });
    }
});


// ... (sua rota de DELETE continua aqui)
router.delete('/empresa/:idEmpresa/remover-usuario/:idUsuario', async (req, res) => {
    const { idEmpresa, idUsuario } = req.params;
    try {
        await db.query('DELETE FROM permissoes WHERE ID_EMPRESA = ? AND ID_USUARIO = ?', [idEmpresa, idUsuario]);
        res.json({ message: 'Usuário removido da empresa com sucesso.' });
    } catch (err) {
        console.error('Erro ao remover usuário da empresa:', err);
        res.status(500).json({ error: 'Erro interno ao remover usuário.' });
    }
});

module.exports = router;