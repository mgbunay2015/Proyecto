// repository/UserRepository.js
const User = require("../models/User");

class UserRepository {
    
    async getAll() {
        // Mongoose: usa find() en lugar de collection().find()
        return await User.find();
    }
    
    async getById(id) {
        return await User.findOne({ id: id });
    }
    
    async create(userData) {
        const user = new User(userData);
        return await user.save();
    }
    
 // repository/UserRepository.js
    async update(id, userData) {
    const updatedUser = await User.findOneAndUpdate(
        { id: id },              // Busca por el campo 'id' (no _id)
        { $set: userData },      // Usa $set para actualizar solo los campos
        { 
            new: true,           // ✅ Retorna el documento ACTUALIZADO
            runValidators: true, // ✅ Ejecuta validaciones
            lean: true          // ✅ Retorna objeto plano (sin metadata)
        }
    );
    return updatedUser;
    }

    async delete(id) {
        return await User.findOneAndDelete({ id: id });
    }
}

module.exports = UserRepository;