// backend/routes/authRoutes.js
const { Router } = require('express')
const AuthController = require('../controllers/authController');
const autenticado = require('../middleware/autenticado');

const router = Router()

router.post('/auth/login', AuthController.login);

module.exports = router;