const express = require('express');
const router = express.Router();
const AnalisisController = require('../controllers/AnalisisController');

// ✅ Asegúrate de que TODAS las rutas tengan callback
router.post('/', AnalisisController.generarAnalisis);
router.get('/:cedula', AnalisisController.consultarAnalisis);

module.exports = router;