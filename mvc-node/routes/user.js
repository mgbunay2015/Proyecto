// ./routes/user.js
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');

// Rutas
router.get('/', UserController.getAll);           // GET /api/users
router.get('/:id', UserController.getById);       // GET /api/users/:id
router.post('/', UserController.create);          // POST /api/users
router.put('/:id', UserController.update);        // PUT /api/users/:id
router.delete('/:id', UserController.delete);     // DELETE /api/users/:id

module.exports = router;