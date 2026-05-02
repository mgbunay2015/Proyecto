const mongoose = require('mongoose');

const financialFormulaSchema = new mongoose.Schema({
    CODIGO_FORMULA: { 
        type: String, 
        required: [true, 'El código de fórmula es obligatorio'],
        unique: true,  // ✅ Crea índice único automáticamente
        minlength: [6, 'El código debe tener al menos 6 caracteres'],
        uppercase: true,
        trim: true
    },
    NOMBRE_FORMULA: { 
        type: String, 
        required: [true, 'El nombre de la fórmula es obligatorio'],
        trim: true,
        maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    },
    FORMULA: { 
        type: String, 
        required: [true, 'La expresión de la fórmula es obligatoria'],
        trim: true
    },
    DESCRIPCION_FORMULA: { 
        type: String, 
        required: [true, 'La descripción es obligatoria'],
        trim: true,
        maxlength: [500, 'La descripción no puede exceder 500 caracteres']
    },
    PESO: { 
        type: Number,
        required: [true, 'El peso es obligatorio'],
        min: [0, 'El peso no puede ser negativo'],
        max: [100, 'El peso no puede exceder 100%'],
        default: 1
    },
    VALOR_IDEAL: { 
        type: String,
        required: [true, 'El valor ideal es obligatorio'],
        trim: true
    },
    SEÑAL_ALERTA: { 
        type: String, 
        required: [true, 'La señal de alerta es obligatoria'],
        trim: true
    },
}, {
    timestamps: true,
    collection: 'formula'
});

// ✅ Solo índices adicionales si los necesitas:
// financialFormulaSchema.index({ CATEGORIA: 1, PESO: -1 });

module.exports = mongoose.model('FinancialFormula', financialFormulaSchema);