const UserRepository = require("../repository/UserRepository");
const userRepository = new UserRepository();

// ✅ GET /api/users - Listar todos los usuarios
const getAll = async (req, res) => {
    try {
        const users = await userRepository.getAll();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener usuarios", error: error.message });
    }
};

// ✅ GET /api/users/:id - Obtener usuario por ID
const getById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userRepository.getById(id);
        
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener el usuario", error: error.message });
    }
};

// ✅ POST /api/users - Crear nuevo usuario
const create = async (req, res) => {
    try {
        const { id, name, email, createdAt } = req.body;
        
        // Validaciones básicas
        if (!id || id.length <= 5) {
            return res.status(400).json({ message: "El ID debe tener más de 5 caracteres" });
        }
        if (!name || !email) {
            return res.status(400).json({ message: "Nombre y email son obligatorios" });
        }
        
        const newUser = {
            id,
            name,
            email,
            createdAt: createdAt ? new Date(createdAt) : new Date()
        };
        
        await userRepository.create(newUser);
        res.status(201).json({ message: "Usuario creado exitosamente", user: newUser });
    } catch (error) {
        res.status(500).json({ message: "Error al crear el usuario", error: error.message });
    }
};

// controllers/UserController.js
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, createdAt } = req.body;
        
        // 1️⃣ Verificar si existe el usuario
        const userExists = await userRepository.getById(id);
        if (!userExists) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        
        // 2️⃣ Preparar solo los campos a actualizar (NO incluir id ni _id)
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (createdAt) updateData.createdAt = createdAt;
        updateData.updatedAt = new Date();
        
        // 3️⃣ Actualizar
        const updatedUser = await userRepository.update(id, updateData);
        
        res.status(200).json({ 
            message: "Usuario actualizado exitosamente", 
            user: updatedUser
        });
    } catch (error) {
        console.error("Error en update:", error);
        res.status(500).json({ 
            message: "Error al actualizar el usuario", 
            error: error.message 
        });
    }
};
// ✅ DELETE /api/users/:id - Eliminar usuario
const remove = async (req, res) => {
    try {
        const { id } = req.params;
        
        const userExists = await userRepository.getById(id);
        if (!userExists) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        
        await userRepository.delete(id);
        res.status(200).json({ message: "Usuario eliminado exitosamente" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar el usuario", error: error.message });
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: remove  // "delete" es palabra reservada en JS, usamos "remove"
};