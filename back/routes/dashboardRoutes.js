// routes/dashboardRoutes.js

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/dados-graficos/:idFila', dashboardController.obterDadosGraficos);

module.exports = router;
