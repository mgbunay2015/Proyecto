// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    id: { 
        type: String, 
        required: true, 
        unique: true,
        minlength: 6  // Validación: más de 5 caracteres
    },
    name: { 
        type: String, 
        required: true 
    },
    email: { 
    type: String, 
    required: [true, 'El correo electrónico es obligatorio'],
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Por favor ingresa un correo electrónico válido.']
    },

    createdAt: { 
        type: Date, 
        default: Date.now 
    }
}, {
    timestamps: true  // Agrega createdAt y updatedAt automáticamente
});

// Evita que Mongoose cree una colección "users" con "s" al final
userSchema.set('collection', 'users');

module.exports = mongoose.model('User', userSchema);