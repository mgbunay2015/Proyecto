const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({

    fecha_corte: { 
        type: Date, 
        required: [true, 'La fecha de corte es obligatoria'],
        default: Date.now 
    },
    
    segmento: { 
        type: String, 
        required: [true, 'El segmento es obligatorio'],
        lowercase: true,
        trim: true
    },
    
    ruc: { 
        type: String, 
        required: [true, 'El RUC es obligatorio'], 
        //unique: true,
        trim: true, // Elimina espacios antes de validar
        validate: {
            validator: function(v) {
                // Acepta exactamente 10 o 13 dígitos numéricos
                return /^\d{10}|\d{13}$/.test(v);
            },
            message: props => `${props.value} no es un RUC válido (debe tener 10 o 13 dígitos)`
        }
    },
    
    razon_social: { 
        type: String, 
        uppercase: true,
        trim: true, // Buenas prácticas: siempre trim en strings
        required: [true, 'La razón social es obligatoria'] 
    },
    
    cuenta: { 
        type: String, 
        required: [true, 'El número de cuenta es obligatorio'],
        trim: true 
    },
    
    descripcion_cuenta: { 
        type: String, 
        required: [true, 'La descripción es obligatoria'],
        uppercase: true,
        trim: true
    },

    saldo: { 
        type: mongoose.Types.Decimal128, 
        required: true,
        // Validador personalizado para Decimal128 (min no funciona nativamente)
        validate: {
            validator: function(v) {
                if (!v) return true; // Permite que 'default' actúe
                return parseFloat(v.toString()) >= 0;
            },
            message: 'El saldo no puede ser negativo'
        },
        default: () => mongoose.Types.Decimal128.fromString('0')
    }
    
    // createdAt eliminado: timestamps: true lo maneja automáticamente
}, {
    timestamps: true,  // Agrega createdAt y updatedAt automáticamente
    collection: 'transaccional' // Definir colección directamente en opciones es más limpio
});

module.exports = mongoose.model('Transaccional', userSchema);