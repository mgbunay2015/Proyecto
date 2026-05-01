// ✅ 1. Importar la CLASE del repositorio
const BancoRepositoryClass = require("../repository/BancoRepository");
// ✅ 2. Crear una INSTANCIA con nombre diferente (evita conflicto de nombres)
const bancoRepository = new BancoRepositoryClass();

// ✅ GET /api/bancos - Listar todos los bancos
const getAll = async (req, res) => {
    try {
        const bancos = await bancoRepository.getAll();
        res.status(200).json(bancos);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener bancos", error: error.message });
    }
};

// ✅ GET /api/bancos/:id - Obtener banco por ID
const getById = async (req, res) => {
    try {
        const { id } = req.params;
        const banco = await bancoRepository.getById(id);
        
        if (!banco) {
            return res.status(404).json({ message: "Banco no encontrado" });
        }
        
        res.status(200).json(banco);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener el Banco", error: error.message });
    }
};

// ✅ POST /api/bancos - Crear nuevo banco
const create = async (req, res) => {
    try {
        const { id, name_banco, direction_banco, createdAt } = req.body;
        
        // Validaciones básicas
        if (!id || id.length <= 5) {
            return res.status(400).json({ message: "El ID debe tener más de 5 caracteres" });
        }
        if (!name_banco || !direction_banco) {
            return res.status(400).json({ message: "Nombre y dirección son obligatorios" });
        }
        
        const newBanco = {
            id,
            name_banco,
            direction_banco,
            createdAt: createdAt ? new Date(createdAt) : new Date()
        };
        
        await bancoRepository.create(newBanco);
        
        // ✅ CORREGIDO: newBanco en lugar de newUser
        res.status(201).json({ 
            message: "Banco creado exitosamente", 
            banco: newBanco 
        });
    } catch (error) {
        res.status(500).json({ message: "Error al crear el Banco", error: error.message });
    }
};

// ✅ PUT /api/bancos/:id - Actualizar banco
const update = async (req, res) => {
    try {
        const { id } = req.params;
        // ✅ CORREGIDO: direction_banco (consistente con create)
        const { name_banco, direction_banco, createdAt } = req.body;
        
        // 1️⃣ Verificar si existe el banco
        const bancoExists = await bancoRepository.getById(id);
        if (!bancoExists) {
            return res.status(404).json({ message: "Banco no encontrado" });
        }
        
        // 2️⃣ Preparar solo los campos a actualizar
        const updateData = {};
        // ✅ CORREGIDO: name_banco en lugar de name
        if (name_banco) updateData.name_banco = name_banco;
        // ✅ CORREGIDO: direction_banco en lugar de direccion_banco
        if (direction_banco) updateData.direction_banco = direction_banco;
        if (createdAt) updateData.createdAt = createdAt;
        updateData.updatedAt = new Date();
        
        // 3️⃣ Actualizar
        const updatedBanco = await bancoRepository.update(id, updateData);
        
        res.status(200).json({ 
            message: "Banco actualizado exitosamente", 
            banco: updatedBanco
        });
    } catch (error) {
        console.error("Error en update:", error);
        res.status(500).json({ 
            message: "Error al actualizar el Banco", 
            error: error.message 
        });
    }
};

// ✅ DELETE /api/bancos/:id - Eliminar banco
const remove = async (req, res) => {
    try {
        const { id } = req.params;
        
        const bancoExists = await bancoRepository.getById(id);
        if (!bancoExists) {
            return res.status(404).json({ message: "Banco no encontrado" });
        }
        
        await bancoRepository.delete(id);
        res.status(200).json({ message: "Banco eliminado exitosamente" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar el Banco", error: error.message });
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: remove
};