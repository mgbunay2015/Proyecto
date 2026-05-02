 

// ✅ IMPORTS (SOLO UNA VEZ)
const mongoose = require('mongoose');
const fs = require('fs');
const TransaccionalRepositoryClass = require("../repository/TransaccionalRepository");
const transaccionalRepository = new TransaccionalRepositoryClass();

// ✅ GET /api/transaccional - Listar todos los registros
const getAll = async (req, res) => {
    try {
        const registros = await transaccionalRepository.getAll();
        res.status(200).json(registros);
    } catch (error) {
        console.error("Error en getAll:", error);
        res.status(500).json({ 
            message: "Error al obtener los registros transaccionales", 
            error: error.message 
        });
    }
};

// ✅ GET /api/transaccional/:id - Obtener registro por ID
const getById = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID de registro no válido" });
        }
        
        const registro = await transaccionalRepository.getById(id);
        
        if (!registro) {
            return res.status(404).json({ message: "Registro transaccional no encontrado" });
        }
        
        res.status(200).json(registro);
    } catch (error) {
        console.error("Error en getById:", error);
        res.status(500).json({ 
            message: "Error al obtener el registro", 
            error: error.message 
        });
    }
};

// ✅ POST /api/transaccional - Crear nuevo registro transaccional
const create = async (req, res) => {
    try {
        const { 
            fecha_corte, 
            segmento, 
            ruc, 
            razon_social, 
            cuenta, 
            descripcion_cuenta, 
            saldo 
        } = req.body;
        
        // 🔹 Validaciones básicas de campos requeridos
        // ✅ CORREGIDO: Regex con paréntesis para agrupar alternativas
        if (!ruc || !/^(\d{10}|\d{13})$/.test(ruc.trim().replace(/"/g, ''))) {
            return res.status(400).json({ 
                message: "El RUC es obligatorio y debe tener 10 o 13 dígitos numéricos" 
            });
        }
        
        if (!razon_social || razon_social.trim().length < 3) {
            return res.status(400).json({ 
                message: "La razón social es obligatoria (mínimo 3 caracteres)" 
            });
        }
        
        if (!cuenta || cuenta.trim().length < 5) {
            return res.status(400).json({ 
                message: "El número de cuenta es obligatorio (mínimo 5 caracteres)" 
            });
        }
        
        if (!descripcion_cuenta || descripcion_cuenta.trim().length < 3) {
            return res.status(400).json({ 
                message: "La descripción de cuenta es obligatoria" 
            });
        }
        
        // 🔹 Procesar saldo: aceptar string con coma, null, o número
        let saldoProcesado = '0';
        if (saldo !== undefined && saldo !== null && saldo !== '') {
            // Si viene como string con coma, convertir a punto para Decimal128
            saldoProcesado = typeof saldo === 'string' 
                ? saldo.replace(',', '.') 
                : saldo.toString();
        }
        
        // 🔹 Preparar objeto para guardar
        const nuevoRegistro = {
            fecha_corte: fecha_corte ? new Date(fecha_corte) : new Date(),
            segmento: segmento ? segmento.trim().toLowerCase() : 'general',
            // ✅ CORREGIDO: Limpiar comillas del RUC
            ruc: ruc.trim().replace(/"/g, ''),
            razon_social: razon_social.trim().toUpperCase(),
            cuenta: cuenta.trim(),
            descripcion_cuenta: descripcion_cuenta.trim().toUpperCase(),
            saldo: mongoose.Types.Decimal128.fromString(saldoProcesado)
        };
        
        const registroCreado = await transaccionalRepository.create(nuevoRegistro);
        
        res.status(201).json({ 
            message: "Registro transaccional creado exitosamente", 
            data: registroCreado 
        });
        
    } catch (error) {
        console.error("Error en create:", error);
        
        // 🔹 Manejo de error por RUC duplicado (código 11000 de MongoDB)
        if (error.code === 11000) {
            return res.status(409).json({ 
                message: "Ya existe un registro con este RUC", 
                ruc: error.keyValue?.ruc 
            });
        }
        
        res.status(500).json({ 
            message: "Error al crear el registro transaccional", 
            error: error.message 
        });
    }
};

// ✅ PUT /api/transaccional/:id - Actualizar registro
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            fecha_corte, 
            segmento, 
            ruc, 
            razon_social, 
            cuenta, 
            descripcion_cuenta, 
            saldo 
        } = req.body;
        
        // 🔹 Verificar si existe el registro
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID de registro no válido" });
        }
        
        const registroExists = await transaccionalRepository.getById(id);
        if (!registroExists) {
            return res.status(404).json({ message: "Registro transaccional no encontrado" });
        }
        
        // 🔹 Preparar solo los campos a actualizar
        const updateData = {};
        
        if (fecha_corte) updateData.fecha_corte = new Date(fecha_corte);
        if (segmento) updateData.segmento = segmento.trim().toLowerCase();
        
        if (ruc) {
            // ✅ CORREGIDO: Limpiar comillas y validar con regex corregido
            const rucLimpio = ruc.trim().replace(/"/g, '');
            if (!/^(\d{10}|\d{13})$/.test(rucLimpio)) {
                return res.status(400).json({ 
                    message: "El RUC debe tener 10 o 13 dígitos numéricos" 
                });
            }
            updateData.ruc = rucLimpio;
        }
        
        if (razon_social) updateData.razon_social = razon_social.trim().toUpperCase();
        if (cuenta) updateData.cuenta = cuenta.trim();
        if (descripcion_cuenta) updateData.descripcion_cuenta = descripcion_cuenta.trim().toUpperCase();
        
        if (saldo !== undefined && saldo !== null) {
            const saldoValor = typeof saldo === 'string' 
                ? saldo.replace(',', '.') 
                : saldo.toString();
            updateData.saldo = mongoose.Types.Decimal128.fromString(saldoValor);
        }
        
        // ✅ updatedAt se maneja automáticamente con timestamps: true
        
        // 🔹 Actualizar en el repositorio
        const registroActualizado = await transaccionalRepository.update(id, updateData);
        
        res.status(200).json({ 
            message: "Registro transaccional actualizado exitosamente", 
            data: registroActualizado 
        });
        
    } catch (error) {
        console.error("Error en update:", error);
        
        if (error.code === 11000) {
            return res.status(409).json({ 
                message: "El RUC ya está registrado en otro documento", 
                ruc: error.keyValue?.ruc 
            });
        }
        
        res.status(500).json({ 
            message: "Error al actualizar el registro", 
            error: error.message 
        });
    }
};

// ✅ DELETE /api/transaccional/:id - Eliminar registro
const remove = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID de registro no válido" });
        }
        
        // 🔹 Verificar existencia antes de eliminar
        const registroExists = await transaccionalRepository.getById(id);
        if (!registroExists) {
            return res.status(404).json({ message: "Registro transaccional no encontrado" });
        }
        
        await transaccionalRepository.delete(id);
        
        res.status(200).json({ 
            message: "Registro transaccional eliminado exitosamente" 
        });
        
    } catch (error) {
        console.error("Error en remove:", error);
        res.status(500).json({ 
            message: "Error al eliminar el registro", 
            error: error.message 
        });
    }
};

// ✅ GET /api/transaccional/ruc/:ruc - Buscar por RUC
const getByRuc = async (req, res) => {
    try {
        const { ruc } = req.params;
        
        // ✅ CORREGIDO: Limpiar comillas y usar regex con paréntesis
        const rucLimpio = ruc.trim().replace(/"/g, '');
        if (!rucLimpio || !/^(\d{10}|\d{13})$/.test(rucLimpio)) {
            return res.status(400).json({ 
                message: "RUC inválido. Debe tener 10 o 13 dígitos numéricos" 
            });
        }
        
        const registros = await transaccionalRepository.getByRuc(rucLimpio);
        
        if (!registros || registros.length === 0) {
            return res.status(404).json({ 
                message: "No se encontraron registros para este RUC" 
            });
        }
        
        res.status(200).json(registros);
        
    } catch (error) {
        console.error("Error en getByRuc:", error);
        res.status(500).json({ 
            message: "Error al buscar por RUC", 
            error: error.message 
        });
    }
};

// ✅ POST /api/transaccional/upload - Carga masiva desde archivo
const uploadMasivo = async (req, res) => {
    try {
        // 🔹 Verificar que se haya subido un archivo
        if (!req.file) {
            return res.status(400).json({ 
                message: "No se ha subido ningún archivo" 
            });
        }

        const filePath = req.file.path;
        
        // 🔹 Leer el archivo
        const fileContent = fs.readFileSync(filePath, 'utf8');
        
        // 🔹 Parsear el contenido (tab-separated según tu archivo)
        const lines = fileContent.split('\n').filter(line => line.trim() !== '');
        
        // 🔹 Saltar la primera línea (headers)
        const headers = lines[0].split('\t').map(h => h.trim().toLowerCase().replace(/"/g, ''));
        const dataLines = lines.slice(1);
        
        // 🔹 Validar que haya datos
        if (dataLines.length === 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ 
                message: "El archivo no contiene datos" 
            });
        }

        // 🔹 Procesar cada línea
        const registrosProcesados = [];
        const errores = [];
        
        for (let i = 0; i < dataLines.length; i++) {
            try {
                const line = dataLines[i];
                // ✅ CORREGIDO: Limpiar comillas de todos los valores
                const values = line.split('\t').map(v => v.trim().replace(/"/g, ''));
                
                // 🔹 Mapear valores según estructura de tu archivo:
                // [0]FECHA, [1]SEGMENTO, [2]RUC, [3]RAZON_SOCIAL, [4]CUENTA, [5]DESCRIPCION, [6]SALDO
                const rucLimpio = values[2] ? values[2].trim() : null;
                
                const registro = {
                    fecha_corte: values[0] ? new Date(values[0]) : new Date(),
                    segmento: values[1] ? values[1].trim().toLowerCase() : 'general',
                    // ✅ CORREGIDO: Usar RUC limpio
                    ruc: rucLimpio,
                    razon_social: values[3] ? values[3].trim().toUpperCase() : null,
                    cuenta: values[4] ? values[4].trim() : null,
                    descripcion_cuenta: values[5] ? values[5].trim().toUpperCase() : null,
                    saldo: values[6] ? values[6].replace(',', '.') : '0'
                };
                
                // 🔹 Validaciones mínimas con regex corregido
                if (!registro.ruc || !/^(\d{10}|\d{13})$/.test(registro.ruc)) {
                    throw new Error(`RUC inválido en línea ${i + 2}: "${values[2]}"`);
                }
                
                if (!registro.razon_social || registro.razon_social.length < 3) {
                    throw new Error(`Razón social inválida en línea ${i + 2}`);
                }
                
                // 🔹 Convertir saldo a Decimal128
                registro.saldo = mongoose.Types.Decimal128.fromString(registro.saldo);
                
                registrosProcesados.push(registro);
                
            } catch (error) {
                errores.push({
                    linea: i + 2,
                    error: error.message
                });
            }
        }

        // 🔹 Insertar registros válidos en la base de datos
        let registrosInsertados = 0;
        if (registrosProcesados.length > 0) {
            const resultado = await transaccionalRepository.createMany(registrosProcesados);
            registrosInsertados = resultado.insertedCount || registrosProcesados.length;
        }

        // 🔹 Eliminar archivo temporal
        fs.unlinkSync(filePath);

        // 🔹 Respuesta
        res.status(201).json({
            message: "Proceso de carga masiva completado",
            resumen: {
                totalLineas: dataLines.length,
                registrosExitosos: registrosInsertados,
                registrosFallidos: errores.length,
                errores: errores.length > 0 ? errores : undefined
            }
        });

    } catch (error) {
        console.error("Error en uploadMasivo:", error);
        
        // 🔹 Limpiar archivo en caso de error
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {
                // Ignorar error al eliminar
            }
        }
        
        res.status(500).json({ 
            message: "Error al procesar el archivo masivo", 
            error: error.message 
        });
    }
};

// ✅ Exportar métodos
module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: remove,
    getByRuc,
    uploadMasivo
};