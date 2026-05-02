// 📄 routes/transaccional.js
const express = require('express');
const router = express.Router();

// ✅ AGREGAR ESTA LÍNEA (importar el controller)
const TransaccionalController = require('../controllers/TransaccionalController');

// O si usas destructuring:
// const { getAll, getById, create, update, delete: remove, getByRuc, uploadMasivo } = require('../controllers/TransaccionalController');

const upload = require('../middleware/upload');  // ← Asegúrate que esta línea exista

// Rutas
router.get('/', TransaccionalController.getAll);
router.get('/:id', TransaccionalController.getById);
router.get('/ruc/:ruc', TransaccionalController.getByRuc);
router.post('/', TransaccionalController.create);
router.put('/:id', TransaccionalController.update);
router.delete('/:id', TransaccionalController.delete);
router.post('/upload', upload.single('archivo'), TransaccionalController.uploadMasivo);

module.exports = router;