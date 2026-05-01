const Banco = require("../models/Banco");  // ✅ Importar Banco

class BancoRepository {
    async getAll() {
        return await Banco.find();
    }
    
    async getById(id) {
        return await Banco.findOne({ id: id });
    }
    
    async create(bancoData) {
        const banco = new Banco(bancoData);  // ✅ Usar Banco
        return await banco.save();
    }
    
    async update(id, bancoData) {
        return await Banco.findOneAndUpdate(
            { id: id }, 
            bancoData, 
            { new: true, lean: true }
        );
    }
    
    async delete(id) {
        return await Banco.findOneAndDelete({ id: id });
    }
}

module.exports = BancoRepository;