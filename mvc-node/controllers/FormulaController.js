const FinancialFormula = require('../models/Formula');

// ============================================================================
// 🎯 CRUD BÁSICO
// ============================================================================

/**
 * @desc    Obtener todas las fórmulas
 * @route   GET /api/formulas
 * @access  Público
 */
exports.obtenerFormulas = async (req, res) => {
    try {
        const formulas = await FinancialFormula.find({}).select('-__v');
        
        res.status(200).json({
            success: true,
            count: formulas.length,
            data: formulas
        });
    } catch (error) {
        console.error('Error obteniendo fórmulas:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
};

/**
 * @desc    Obtener fórmula por código
 * @route   GET /api/formulas/:codigo
 * @access  Público
 */
exports.obtenerFormulaPorCodigo = async (req, res) => {
    try {
        const { codigo } = req.params;

        const formula = await FinancialFormula.findOne({ 
            CODIGO_FORMULA: codigo.toUpperCase() 
        }).select('-__v');

        if (!formula) {
            return res.status(404).json({
                success: false,
                message: `Fórmula "${codigo}" no encontrada`
            });
        }

        res.status(200).json({
            success: true,
            data: formula
        });
    } catch (error) {
        console.error('Error obteniendo fórmula:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
};

/**
 * @desc    Crear nueva fórmula
 * @route   POST /api/formulas
 * @access  Privado
 */
exports.crearFormula = async (req, res) => {
    try {
        const {
            CODIGO_FORMULA,
            NOMBRE_FORMULA,
            FORMULA,
            DESCRIPCION_FORMULA,
            PESO,
            VALOR_IDEAL,
            SEÑAL_ALERTA
        } = req.body;

        // Validar campos requeridos
        if (!CODIGO_FORMULA || !NOMBRE_FORMULA || !FORMULA) {
            return res.status(400).json({
                success: false,
                message: 'CODIGO_FORMULA, NOMBRE_FORMULA y FORMULA son obligatorios'
            });
        }

        // Crear fórmula
        const nuevaFormula = await FinancialFormula.create({
            CODIGO_FORMULA: CODIGO_FORMULA.toUpperCase(),
            NOMBRE_FORMULA,
            FORMULA,
            DESCRIPCION_FORMULA: DESCRIPCION_FORMULA || '',
            PESO: PESO || 1,
            VALOR_IDEAL: VALOR_IDEAL || '',
            SEÑAL_ALERTA: SEÑAL_ALERTA || ''
        });

        res.status(201).json({
            success: true,
            message: 'Fórmula creada exitosamente',
            data: nuevaFormula
        });
    } catch (error) {
        console.error('Error creando fórmula:', error);
        
        // Manejar error de duplicado
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'El código de fórmula ya existe'
            });
        }

        // Manejar errores de validación
        if (error.name === 'ValidationError') {
            const mensajes = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Error de validación',
                errors: mensajes
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
};

/**
 * @desc    Actualizar fórmula
 * @route   PUT /api/formulas/:codigo
 * @access  Privado
 */
exports.actualizarFormula = async (req, res) => {
    try {
        const { codigo } = req.params;
        const actualizaciones = req.body;

        // No permitir cambiar el código principal
        if (actualizaciones.CODIGO_FORMULA) {
            delete actualizaciones.CODIGO_FORMULA;
        }

        const formulaActualizada = await FinancialFormula.findOneAndUpdate(
            { CODIGO_FORMULA: codigo.toUpperCase() },
            actualizaciones,
            {
                new: true,
                runValidators: true,
                select: '-__v'
            }
        );

        if (!formulaActualizada) {
            return res.status(404).json({
                success: false,
                message: `Fórmula "${codigo}" no encontrada`
            });
        }

        res.status(200).json({
            success: true,
            message: 'Fórmula actualizada exitosamente',
            data: formulaActualizada
        });
    } catch (error) {
        console.error('Error actualizando fórmula:', error);
        
        if (error.name === 'ValidationError') {
            const mensajes = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Error de validación',
                errors: mensajes
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
};

/**
 * @desc    Eliminar fórmula (soft delete)
 * @route   DELETE /api/formulas/:codigo
 * @access  Privado
 */
exports.eliminarFormula = async (req, res) => {
    try {
        const { codigo } = req.params;

        const formula = await FinancialFormula.findOneAndDelete({ 
            CODIGO_FORMULA: codigo.toUpperCase() 
        });

        if (!formula) {
            return res.status(404).json({
                success: false,
                message: `Fórmula "${codigo}" no encontrada`
            });
        }

        res.status(200).json({
            success: true,
            message: 'Fórmula eliminada exitosamente',
            data: { CODIGO_FORMULA: formula.CODIGO_FORMULA }
        });
    } catch (error) {
        console.error('Error eliminando fórmula:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
};

// ============================================================================
// 📤 EXPORTAR
// ============================================================================

module.exports = exports;