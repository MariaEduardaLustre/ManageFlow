// routes/configuracaoPublicRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/configuracaoController');

module.exports = (io) => {
  // Rotas que não precisam do IO diretamente
  router.get('/public/info/:token', ctrl.getPublicInfoByToken);
  router.get('/public/status/:token', ctrl.getPublicStatusByToken);

  // Rotas que precisam do IO para emitir eventos
  router.post('/public/join/:token', (req, res) => ctrl.publicJoinByToken(req, res, io));
  router.post('/public/leave/:token', (req, res) => ctrl.publicLeaveByToken(req, res, io));
  router.post('/public/confirm/:token', (req, res) => ctrl.publicConfirmByToken(req, res, io));

  return router;
};