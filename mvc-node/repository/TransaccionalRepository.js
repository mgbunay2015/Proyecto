// ✅ 1. Importar el Modelo Mongoose
const Transaccional = require("../models/Transaccional");
const mongoose = require("mongoose");

class TransaccionalRepository {

    // ✅ GET ALL - Obtener todos los registros (con paginación opcional)
    async getAll(page = 1, limit = 50, filters = {}) {
        try {
            const skip = (page - 1) * limit;
            
            // 🔹 Construir query dinámico con filtros opcionales
            const query = {};
            
            if (filters.ruc) query.ruc = filters.ruc;
            if (filters.segmento) query.segmento = filters.segmento.toLowerCase();
            if (filters.fechaDesde || filters.fechaHasta) {
                query.fecha_corte = {};
                if (filters.fechaDesde) query.fecha_corte.$gte = new Date(filters.fechaDesde);
                if (filters.fechaHasta) query.fecha_corte.$lte = new Date(filters.fechaHasta);
            }
            if (filters.saldoMin !== undefined || filters.saldoMax !== undefined) {
                query.saldo = {};
                // ⚠️ Decimal128 requiere conversión para comparaciones
                if (filters.saldoMin !== undefined) {
                    query.saldo.$gte = mongoose.Types.Decimal128.fromString(filters.saldoMin.toString());
                }
                if (filters.saldoMax !== undefined) {
                    query.saldo.$lte = mongoose.Types.Decimal128.fromString(filters.saldoMax.toString());
                }
            }

            // 🔹 Ejecutar consulta con paginación y ordenamiento
            const [data, total] = await Promise.all([
                Transaccional.find(query)
                    .sort({ fecha_corte: -1, createdAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit))
                    .lean(), // ✅ lean() para mejor rendimiento (objetos JS puros)
                
                Transaccional.countDocuments(query)
            ]);

            // 🔹 Convertir Decimal128 a número para respuesta JSON amigable
            const registros = data.map(reg => ({
                ...reg,
                _id: reg._id.toString(),
                saldo: reg.saldo ? parseFloat(reg.saldo.toString()) : 0
            }));

            return {
                data: registros,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalRecords: total,
                    hasNext: skip + data.length < total,
                    hasPrev: page > 1
                }
            };

        } catch (error) {
            console.error("Error en repository getAll:", error);
            throw new Error(`No se pudieron obtener los registros: ${error.message}`);
        }
    }

    // ✅ GET BY ID - Buscar por _id de MongoDB
    async getById(id) {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return null;
            }

            const registro = await Transaccional.findById(id).lean();
            
            if (!registro) return null;

            // 🔹 Convertir Decimal128 y _id para respuesta consistente
            return {
                ...registro,
                _id: registro._id.toString(),
                saldo: registro.saldo ? parseFloat(registro.saldo.toString()) : 0
            };

        } catch (error) {
            console.error("Error en repository getById:", error);
            throw new Error(`No se pudo obtener el registro: ${error.message}`);
        }
    }

    // ✅ GET BY RUC - Buscar todos los registros de un RUC (histórico)
    async getByRuc(ruc) {
        try {
            const registros = await Transaccional.find({ ruc: ruc.trim() })
                .sort({ fecha_corte: -1 })
                .lean();

            // 🔹 Transformar resultados para frontend
            return registros.map(reg => ({
                ...reg,
                _id: reg._id.toString(),
                saldo: reg.saldo ? parseFloat(reg.saldo.toString()) : 0
            }));

        } catch (error) {
            console.error("Error en repository getByRuc:", error);
            throw new Error(`No se pudieron buscar registros por RUC: ${error.message}`);
        }
    }

    // ✅ CREATE - Insertar nuevo registro
    async create(data) {
        try {
            // 🔹 Crear instancia del modelo (validaciones del schema se ejecutan aquí)
            const nuevoRegistro = new Transaccional(data);
            
            // 🔹 Guardar en MongoDB
            const registrado = await nuevoRegistro.save();

            // 🔹 Retornar objeto transformado para respuesta API
            return {
                ...registrado.toObject(),
                _id: registrado._id.toString(),
                saldo: parseFloat(registrado.saldo.toString())
            };

        } catch (error) {
            // 🔹 Propagar errores de validación o duplicados para manejar en controller
            console.error("Error en repository create:", error);
            throw error;
        }
    }

    // ✅ UPDATE - Actualizar registro existente
    async update(id, updateData) {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                throw new Error("ID de registro no válido");
            }

            // 🔹 Actualizar con: 
            // - new: true → retorna el documento actualizado
            // - runValidators: true → ejecuta validaciones del schema en update
            const registroActualizado = await Transaccional.findByIdAndUpdate(
                id, 
                updateData, 
                { 
                    new: true, 
                    runValidators: true,
                    context: 'query' // ✅ Necesario para validadores personalizados en update
                }
            ).lean();

            if (!registroActualizado) {
                return null;
            }

            // 🔹 Transformar para respuesta
            return {
                ...registroActualizado,
                _id: registroActualizado._id.toString(),
                saldo: registroActualizado.saldo ? parseFloat(registroActualizado.saldo.toString()) : 0
            };

        } catch (error) {
            console.error("Error en repository update:", error);
            throw error;
        }
    }

    // ✅ DELETE - Eliminar registro (hard delete)
    async delete(id) {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                throw new Error("ID de registro no válido");
            }

            const resultado = await Transaccional.findByIdAndDelete(id);
            
            if (!resultado) {
                return false;
            }

            return true;

        } catch (error) {
            console.error("Error en repository delete:", error);
            throw new Error(`No se pudo eliminar el registro: ${error.message}`);
        }
    }

    // ✅ SOFT DELETE - Marcar como eliminado (alternativa recomendada para auditoría)
    async softDelete(id) {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                throw new Error("ID de registro no válido");
            }

            const resultado = await Transaccional.findByIdAndUpdate(
                id,
                { 
                    eliminado: true, 
                    fechaEliminacion: new Date() 
                },
                { new: true, runValidators: true }
            );

            return !!resultado;

        } catch (error) {
            console.error("Error en repository softDelete:", error);
            throw error;
        }
    }

    // ✅ AGGREGATE - Consulta avanzada con agregaciones (ej: totales por segmento)
    async getTotalesPorSegmento(fechaInicio, fechaFin) {
        try {
            const matchStage = { eliminado: { $ne: true } }; // Excluir soft deletes si aplica
            
            if (fechaInicio || fechaFin) {
                matchStage.fecha_corte = {};
                if (fechaInicio) matchStage.fecha_corte.$gte = new Date(fechaInicio);
                if (fechaFin) matchStage.fecha_corte.$lte = new Date(fechaFin);
            }

            const resultados = await Transaccional.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: "$segmento",
                        totalRegistros: { $sum: 1 },
                        saldoTotal: { 
                            $sum: { $toDouble: "$saldo" } // ✅ Convertir Decimal128 a número para sumar
                        },
                        ultimoCorte: { $max: "$fecha_corte" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        segmento: "$_id",
                        totalRegistros: 1,
                        saldoTotal: { $round: ["$saldoTotal", 2] },
                        ultimoCorte: 1
                    }
                },
                { $sort: { saldoTotal: -1 } }
            ]);

            return resultados;

        } catch (error) {
            console.error("Error en repository getTotalesPorSegmento:", error);
            throw error;
        }
    }

    // ✅ VALIDAR RUC ÚNICO - Verificar si un RUC ya existe (útil antes de crear)
    async rucExists(ruc, excludeId = null) {
        try {
            const query = { ruc: ruc.trim() };
            
            // 🔹 Excluir el propio documento si es una actualización
            if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
                query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
            }

            const existente = await Transaccional.findOne(query).select("_id");
            return !!existente;

        } catch (error) {
            console.error("Error en repository rucExists:", error);
            throw error;
        }
    }

    // ✅ CREATE MANY - Insertar múltiples registros (bulk insert) ← MOVER AQUÍ, DENTRO DE LA CLASE
    async createMany(registros) {
        try {
            const resultado = await Transaccional.insertMany(registros, {
                ordered: false  // Continuar aunque haya errores
            });
            
            return {
                insertedCount: resultado.length,
                registros: resultado
            };

        } catch (error) {
            console.error("Error en createMany:", error);
            
            // Si hay writeErrors, significa que algunos fallaron
            if (error.writeErrors) {
                console.warn(`${error.writeErrors.length} registros fallaron`);
                return {
                    insertedCount: error.result?.nInserted || 0,
                    errores: error.writeErrors
                };
            }
            
            throw error;  // Propagar error si es crítico
        }
    }

} // ← ✅ EL CIERRE DE LA CLASE DEBE IR DESPUÉS DE createMany

module.exports = TransaccionalRepository;