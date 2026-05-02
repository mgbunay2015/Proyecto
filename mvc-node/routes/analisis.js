const express = require('express');
const router = express.Router();
const AnalisisController = require('../controllers/AnalisisController');

// ✅ Asegúrate de que TODAS las rutas tengan callback
router.post('/', AnalisisController.generarAnalisis);

// Si tienes un GET, debe tener callback:
// router.get('/historial', (req, res) => { ... });
// o
// router.get('/historial', AnalisisController.obtenerHistorial);

module.exports = router;