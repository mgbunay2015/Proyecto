// repository/AnalisisRepository.js

const Formula = require('../models/Formula');
const Transaccional = require('../models/Transaccional');
const AnalisisInversion = require('../models/AnalisisInversion');

class AnalisisRepository {

    /**
     * Obtiene todas las fórmulas activas
     */
    static async getActiveFormulas() {
        try {
            const formulas = await Formula.find({ 
                FORMULA: { $exists: true, $ne: null, $ne: '' }
            })
            .select('CODIGO_FORMULA NOMBRE_FORMULA FORMULA PESO')
            .lean();
            
            console.log(`📊 Repository: ${formulas.length} fórmulas activas`);
            return formulas;
            
        } catch (error) {
            console.error('❌ Repository: Error obteniendo fórmulas:', error.message);
            throw new Error(`No se pudieron cargar las fórmulas: ${error.message}`);
        }
    }

    /**
     * Obtiene cooperativas con fecha de corte más reciente
     */
    static async getCooperativasConFechaCorte() {
        try {
            const cooperativas = await Transaccional.aggregate([
                {
                    $group: {
                        _id: "$RUC",
                        maxFecha: { $max: "$FECHA_DE_CORTE" },
                        razon_social: { $first: "$RAZON_SOCIAL" },
                        segmento: { $first: "$SEGMENTO" }
                    }
                },
                { $sort: { razon_social: 1 } }
            ]);
            
            console.log(`🏦 Repository: ${cooperativas.length} cooperativas encontradas`);
            return cooperativas;
            
        } catch (error) {
            console.error('❌ Repository: Error obteniendo cooperativas:', error.message);
            throw new Error(`No se pudieron cargar las cooperativas: ${error.message}`);
        }
    }

    /**
     * Obtiene saldos de una cooperativa
     */
    static async getSaldosPorRucYFecha(ruc, fechaCorte) {
        try {
            const saldosDoc = await Transaccional.find({ 
                RUC: ruc,
                FECHA_DE_CORTE: fechaCorte 
            })
            .select('CUENTA SALDO')
            .lean();

            if (saldosDoc.length === 0) {
                return {};
            }

            const mapaSaldos = {};
            
            for (const s of saldosDoc) {
                if (!s.CUENTA) continue;
                
                let saldoValor = 0;
                
                if (typeof s.SALDO === 'number') {
                    saldoValor = s.SALDO;
                } else if (typeof s.SALDO === 'string') {
                    const saldoLimpio = s.SALDO.replace(/\./g, '').replace(',', '.');
                    saldoValor = parseFloat(saldoLimpio) || 0;
                }
                
                if (saldoValor !== 0) {
                    mapaSaldos[String(s.CUENTA)] = saldoValor;
                }
            }
            
            console.log(`   💰 Repository: ${Object.keys(mapaSaldos).length} cuentas con saldo`);
            return mapaSaldos;
            
        } catch (error) {
            console.error(`❌ Repository: Error obteniendo saldos:`, error.message);
            throw new Error(`No se pudieron cargar los saldos: ${error.message}`);
        }
    }


    /**
     * Guarda análisis en BD
     */
       /**
     * Guarda análisis en un solo documento
     */
    static async guardarAnalisis(analisisData) {
        try {
            const AnalisisInversion = require('../models/AnalisisInversion');
            
            console.log('📝 Guardando análisis:', {
                cedula: analisisData.cedula,
                nombre: analisisData.nombre,
                cooperativas: analisisData.ranking_cooperativas?.length || 0
            });
            
            const analisis = new AnalisisInversion({
                cedula: analisisData.cedula,
                nombre: analisisData.nombre,
                monto_inversion: parseFloat(analisisData.monto_inversion),
                fecha_consulta: analisisData.fecha_consulta || new Date(),
                ranking_cooperativas: analisisData.ranking_cooperativas || [],
                total_cooperativas: analisisData.total_cooperativas || 0,
                usuario: null  // ← Null o eliminar si no se usa
            });
            
            const guardado = await analisis.save();
            console.log('✅ Repository: Análisis guardado con ID:', guardado._id);
            return guardado;
            
        } catch (error) {
            console.error('❌ Repository: Error guardando análisis:', error.message);
            console.error('Datos recibidos:', analisisData);
            throw error;
        }
    }
}

// ✅ EXPORTAR LA CLASE CORRECTAMENTE
module.exports = AnalisisRepository;