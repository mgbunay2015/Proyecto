// ./routes/formulas.js
const express = require('express');
const router = express.Router();
const FormulaController = require('../controllers/FormulaController');

// ✅ Rutas CRUD
router.get('/', FormulaController.obtenerFormulas);                 // GET /api/formulas
router.get('/:codigo', FormulaController.obtenerFormulaPorCodigo);  // GET /api/formulas/:codigo
router.post('/', FormulaController.crearFormula);                   // POST /api/formulas
router.put('/:codigo', FormulaController.actualizarFormula);        // PUT /api/formulas/:codigo
router.delete('/:codigo', FormulaController.eliminarFormula);       // DELETE /api/formulas/:codigo

module.exports = router;