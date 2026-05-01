// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    id: { 
        type: String, 
        required: true, 
        unique: true,
        minlength: 6  // Validación: más de 5 caracteres
    },
    name_banco: { 
        type: String, 
        required: true 
    },
    direction_banco: { 
        type: String, 
        required: true,
        lowercase: true,
        trim: true
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
}, {
    timestamps: true  // Agrega createdAt y updatedAt automáticamente
});

// Evita que Mongoose cree una colección "banco" con "s" al final
userSchema.set('collection', 'banco');

module.exports = mongoose.model('Banco', userSchema);