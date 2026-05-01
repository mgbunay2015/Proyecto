// ./routes/banco.js
const express = require('express');
const router = express.Router();

//  almacenan las direcciones de las API
const BancoController = require('../controllers/BancoController');

// Rutas
router.get('/', BancoController.getAll);           // GET /api/bancos
router.get('/:id', BancoController.getById);       // GET /api/bancos/:id
router.post('/', BancoController.create);          // POST /api/bancos
router.put('/:id', BancoController.update);        // PUT /api/bancos/:id
router.delete('/:id', BancoController.delete);     // DELETE /api/bancos/:id

module.exports = router;