// auth/jwt.js
const jwt = require('jsonwebtoken');
// <-- CORREÇÃO 1: Precisamos do 'db' aqui agora
const db = require('../database/connection'); 

// <-- CORREÇÃO 2: A função agora é 'async'
module.exports = async function authMiddleware(req, res, next) {
  const hdr = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(hdr);
  let token = m ? m[1] : null;

  if (token) {
    token = token.trim().replace(/^"|"$/g, '');
  }

  if (!token) {
    return res.status(401).json('missing_token');
  }

  try {
    // 1. Verificar o token (síncrono)
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // 'payload' SÓ TEM { id, email, nome }

    // 2. BUSCAR A EMPRESA (A MÁGICA ACONTECE AQUI)
    // Usamos o 'payload.id' (ID_USUARIO) para buscar o 'ID_EMPRESA'
    const [permissoes] = await db.query(
        'SELECT ID_EMPRESA FROM permissoes WHERE ID_USUARIO = ? LIMIT 1',
        [payload.id]
    );

    // 3. VERIFICAR SE O USUÁRIO TEM EMPRESA
    // Se 'permissoes' estiver vazio ou o ID_EMPRESA for nulo,
    // o usuário é válido, mas não pode ver os relatórios.
    if (permissoes.length === 0 || !permissoes[0].ID_EMPRESA) {
        console.warn(`[auth] Acesso negado: Usuário ${payload.id} não tem empresa associada.`);
        // 403 Forbidden = Autenticado (token ok), mas Não Autorizado (sem empresa)
        return res.status(403).json('no_company_associated');
    }

    // 4. CRIAR O req.user COMPLETO
    // Agora 'req.user' terá tudo o que o 'relatorioController' precisa
    req.user = { 
        id: payload.id, 
        email: payload.email, 
        nome: payload.nome,
        id_empresa: permissoes[0].ID_EMPRESA // <--- AQUI ESTÁ A INFORMAÇÃO
    };
    
    next(); // Envia para o controller (agora com req.user.id_empresa)

  } catch (e) {
    console.error('[auth] invalid_token:', e.message);
    return res.status(401).json('invalid_token');
  }
};