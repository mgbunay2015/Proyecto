const mongoose = require('mongoose');

const analisisCooperativaSchema = new mongoose.Schema({
    cedula_usuario: { 
        type: String, 
        required: true,
        trim: true 
    },
    nombre_usuario: { 
        type: String, 
        required: true,
        trim: true 
    },
    monto_inversion: { 
        type: Number, 
        required: true 
    },
    fecha_consulta: { 
        type: Date, 
        default: Date.now 
    },
    
    ruc: { 
        type: String, 
        required: true 
    },
    razon_social: { 
        type: String, 
        required: true 
    },
    segmento: { 
        type: String,
        default: 'General' 
    },
    posicion_ranking: Number,
    score_total: Number,
    fecha_corte: Date,
    
    indicadores: [{
        codigo: String,
        nombre: String,
        valor: Number,
        puntaje: Number,
        formula_original: String,
        formula_evaluada: String,
        cuentas_usadas: [String],
        resultado_calculado: Number
    }]
}, {
    timestamps: true,
    collection: 'analisis_cooperativas'
});

// Índices
analisisCooperativaSchema.index({ 
    cedula_usuario: 1, 
    fecha_consulta: -1,
    posicion_ranking: 1 
});

module.exports = mongoose.model('AnalisisCooperativa', analisisCooperativaSchema);