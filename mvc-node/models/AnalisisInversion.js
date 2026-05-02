const mongoose = require('mongoose');

const analisisInversionSchema = new mongoose.Schema({
    // Datos del usuario (hacer opcionales o cambiar nombres)
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false  // ← Hacer opcional
    },
    cedula: {
        type: String,
        required: true,
        trim: true
    },
    nombre: {
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
    // Ranking de cooperativas
    ranking_cooperativas: [{
        ruc: String,
        razon_social: String,
        segmento: String,
        score_total: Number,
        posicion: Number,
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
    }],
    total_cooperativas: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    collection: 'analisis_inversion'
});

// Índices
analisisInversionSchema.index({ cedula: 1, fecha_consulta: -1 });

module.exports = mongoose.model('AnalisisInversion', analisisInversionSchema);