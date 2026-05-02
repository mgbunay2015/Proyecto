const FinancialFormula = require('../models/FinancialFormula');

class FinancialFormulaRepository {
    
    /**
     * Obtener todas las fórmulas activas
     * @param {Object} filters - Filtros opcionales
     * @returns {Promise<Array>}
     */
    async findAll(filters = {}) {
        try {
            const { categoria, activo = true, search, limit = 100, page = 1 } = filters;
            
            const query = {};
            
            if (activo !== undefined) query.ACTIVO = activo;
            if (categoria) query.CATEGORIA = categoria;
            if (search) {
                query.$or = [
                    { CODIGO_FORMULA: { $regex: search, $options: 'i' } },
                    { NOMBRE_FORMULA: { $regex: search, $options: 'i' } }
                ];
            }
            
            const skip = (page - 1) * limit;
            
            const [data, total] = await Promise.all([
                FinancialFormula.find(query)
                    .sort({ CODIGO_FORMULA: 1 })
                    .skip(skip)
                    .limit(limit)
                    .select('-__v')
                    .lean(),
                FinancialFormula.countDocuments(query)
            ]);
            
            return {
                data,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error en findAll:', error);
            throw error;
        }
    }

    /**
     * Buscar fórmula por código
     * @param {string} codigo - Código de la fórmula
     * @returns {Promise<Object|null>}
     */
    async findByCodigo(codigo) {
        try {
            const formula = await FinancialFormula.findOne({ 
                CODIGO_FORMULA: codigo.toUpperCase() 
            })
            .select('-__v')
            .lean();
            
            return formula;
        } catch (error) {
            console.error('Error en findByCodigo:', error);
            throw error;
        }
    }

    /**
     * Buscar múltiples fórmulas por códigos
     * @param {Array<string>} codigos - Array de códigos
     * @returns {Promise<Array>}
     */
    async findByCodigos(codigos) {
        try {
            const formulas = await FinancialFormula.find({
                CODIGO_FORMULA: { $in: codigos.map(c => c.toUpperCase()) },
                ACTIVO: true
            })
            .select('-__v')
            .lean();
            
            return formulas;
        } catch (error) {
            console.error('Error en findByCodigos:', error);
            throw error;
        }
    }

    /**
     * Crear nueva fórmula
     * @param {Object} formulaData - Datos de la fórmula
     * @returns {Promise<Object>}
     */
    async create(formulaData) {
        try {
            const nuevaFormula = await FinancialFormula.create({
                ...formulaData,
                CODIGO_FORMULA: formulaData.CODIGO_FORMULA?.toUpperCase(),
                ACTIVO: formulaData.ACTIVO ?? true
            });
            
            return nuevaFormula.toObject();
        } catch (error) {
            console.error('Error en create:', error);
            throw error;
        }
    }

    /**
     * Actualizar fórmula por código
     * @param {string} codigo - Código de la fórmula
     * @param {Object} updates - Campos a actualizar
     * @returns {Promise<Object|null>}
     */
    async update(codigo, updates) {
        try {
            // No permitir cambiar el código principal
            if (updates.CODIGO_FORMULA) {
                delete updates.CODIGO_FORMULA;
            }
            
            const formulaActualizada = await FinancialFormula.findOneAndUpdate(
                { CODIGO_FORMULA: codigo.toUpperCase() },
                { $set: updates },
                { 
                    new: true, 
                    runValidators: true,
                    select: '-__v'
                }
            ).lean();
            
            return formulaActualizada;
        } catch (error) {
            console.error('Error en update:', error);
            throw error;
        }
    }

    /**
     * Eliminar fórmula (soft delete)
     * @param {string} codigo - Código de la fórmula
     * @returns {Promise<Object|null>}
     */
    async delete(codigo) {
        try {
            const formula = await FinancialFormula.findOneAndUpdate(
                { CODIGO_FORMULA: codigo.toUpperCase() },
                { $set: { ACTIVO: false } },
                { new: true, select: '-__v' }
            ).lean();
            
            return formula;
        } catch (error) {
            console.error('Error en delete:', error);
            throw error;
        }
    }

    /**
     * Eliminar fórmula físicamente
     * @param {string} codigo - Código de la fórmula
     * @returns {Promise<Object|null>}
     */
    async hardDelete(codigo) {
        try {
            const formula = await FinancialFormula.findOneAndDelete({
                CODIGO_FORMULA: codigo.toUpperCase()
            }).lean();
            
            return formula;
        } catch (error) {
            console.error('Error en hardDelete:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas básicas
     * @returns {Promise<Object>}
     */
    async getStats() {
        try {
            const [total, activas, porCategoria] = await Promise.all([
                FinancialFormula.countDocuments(),
                FinancialFormula.countDocuments({ ACTIVO: true }),
                FinancialFormula.aggregate([
                    { $match: { ACTIVO: true } },
                    { $group: { 
                        _id: '$CATEGORIA', 
                        count: { $sum: 1 },
                        pesoPromedio: { $avg: '$PESO' }
                    }},
                    { $sort: { count: -1 } }
                ])
            ]);
            
            return {
                total,
                activas,
                inactivas: total - activas,
                porCategoria: porCategoria.map(c => ({
                    categoria: c._id,
                    count: c.count,
                    pesoPromedio: parseFloat(c.pesoPromedio?.toFixed(2) || 0)
                }))
            };
        } catch (error) {
            console.error('Error en getStats:', error);
            throw error;
        }
    }

    /**
     * Importar/actualizar múltiples fórmulas (upsert)
     * @param {Array<Object>} formulas - Array de fórmulas
     * @returns {Promise<Object>}
     */
    async bulkUpsert(formulas) {
        try {
            if (!Array.isArray(formulas) || formulas.length === 0) {
                return { inserted: 0, modified: 0, errors: [] };
            }
            
            const operations = formulas.map(formula => ({
                updateOne: {
                    filter: { CODIGO_FORMULA: formula.CODIGO_FORMULA?.toUpperCase() },
                    update: {
                        $set: {
                            NOMBRE_FORMULA: formula.NOMBRE_FORMULA,
                            FORMULA: formula.FORMULA,
                            DESCRIPCION_FORMULA: formula.DESCRIPCION_FORMULA || '',
                            PESO: formula.PESO || 1,
                            VALOR_IDEAL: formula.VALOR_IDEAL || '',
                            SEÑAL_ALERTA: formula.SEÑAL_ALERTA || '',
                            CATEGORIA: formula.CATEGORIA || 'RENTABILIDAD',
                            ACTIVO: formula.ACTIVO !== false,
                            updatedAt: new Date()
                        }
                    },
                    upsert: true
                }
            }));
            
            const result = await FinancialFormula.bulkWrite(operations);
            
            return {
                inserted: result.upsertedCount,
                modified: result.modifiedCount,
                total: formulas.length
            };
        } catch (error) {
            console.error('Error en bulkUpsert:', error);
            throw error;
        }
    }

    /**
     * Buscar fórmulas por categoría
     * @param {string} categoria - Categoría de la fórmula
     * @param {boolean} soloActivas - Solo fórmulas activas
     * @returns {Promise<Array>}
     */
    async findByCategoria(categoria, soloActivas = true) {
        try {
            const query = { CATEGORIA: categoria };
            if (soloActivas) query.ACTIVO = true;
            
            const formulas = await FinancialFormula.find(query)
                .sort({ PESO: -1 })
                .select('-__v')
                .lean();
            
            return formulas;
        } catch (error) {
            console.error('Error en findByCategoria:', error);
            throw error;
        }
    }

    /**
     * Obtener fórmulas para evaluación (con fórmula y peso)
     * @param {Array<string>} codigos - Códigos a evaluar
     * @returns {Promise<Array>}
     */
    async getForEvaluation(codigos) {
        try {
            const formulas = await FinancialFormula.find({
                CODIGO_FORMULA: { $in: codigos.map(c => c.toUpperCase()) },
                ACTIVO: true,
                FORMULA: { $exists: true, $ne: '' }
            })
            .select('CODIGO_FORMULA NOMBRE_FORMULA FORMULA PESO VALOR_IDEAL SEÑAL_ALERTA CATEGORIA')
            .lean();
            
            return formulas;
        } catch (error) {
            console.error('Error en getForEvaluation:', error);
            throw error;
        }
    }
}

// Exportar instancia singleton
module.exports = new FinancialFormulaRepository();