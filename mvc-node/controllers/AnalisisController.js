// controllers/AnalisisController.js

const CalculadoraService = require('../services/CalculadoraService');
const AnalisisRepository = require('../repository/AnalisisRepository');

exports.generarAnalisis = async (req, res) => {
    try {
        const { cedula, nombre, monto } = req.body;

        if (!cedula || !nombre || !monto || monto <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Cédula, nombre y monto son obligatorios (monto > 0)'
            });
        }

        console.log(`📥 Iniciando análisis: ${nombre} - $${monto}`);

        // 1. Obtener datos
        const formulas = await AnalisisRepository.getActiveFormulas();
        const cooperativas = await AnalisisRepository.getCooperativasConFechaCorte();

        console.log(`🏦 ${cooperativas.length} cooperativas encontradas`);

        const resultados = [];
        const fechaConsulta = new Date();

        // 2. Procesar cada cooperativa
        for (const coop of cooperativas) {
            const { _id: ruc, maxFecha, razon_social, segmento } = coop;
            
            const mapaSaldos = await AnalisisRepository.getSaldosPorRucYFecha(ruc, maxFecha);
            
            if (Object.keys(mapaSaldos).length === 0) continue;

            const indicadores = [];
            let scoreTotal = 0;

            for (const formula of formulas) {
                if (!formula.FORMULA) continue;

                const { resultado, formulaEvaluada, formulaOriginal } = 
                    CalculadoraService.evaluarFormulaConTrazabilidad(
                        formula.FORMULA,
                        mapaSaldos
                    );

                const puntaje = typeof CalculadoraService.calcularPuntaje === 'function'
                    ? CalculadoraService.calcularPuntaje(resultado, formula.CODIGO_FORMULA)
                    : resultado > 0 ? 5 : 0;

                indicadores.push({
                    codigo: formula.CODIGO_FORMULA,
                    nombre: formula.NOMBRE_FORMULA,
                    valor: parseFloat(resultado.toFixed(4)),
                    puntaje,
                    formula_original: formulaOriginal,
                    formula_evaluada: formulaEvaluada,
                    cuentas_usadas: Object.keys(mapaSaldos).filter(c => 
                        formulaOriginal && formulaOriginal.includes(String(c))
                    ),
                    resultado_calculado: resultado,
                    expresion_evaluada: formulaEvaluada
                });

                scoreTotal += puntaje;
            }

            if (indicadores.length > 0) {
                resultados.push({
                    ruc,
                    razon_social: razon_social || 'Sin nombre',
                    segmento: segmento || 'General',
                    indicadores,
                    score_total: parseFloat(scoreTotal.toFixed(2)),
                    fecha_corte: maxFecha
                });
            }
        }

        // 3. Ordenar
        resultados.sort((a, b) => b.score_total - a.score_total);
        
        const ranking = resultados.map((r, index) => ({
            posicion: index + 1,
            ...r
        }));

        console.log(`✅ Ranking generado: ${ranking.length} cooperativas`);

        // 4. ✅ GUARDAR - Elige una opción:
        
        // Opción A: Documentos separados (requiere modelo AnalisisCooperativa)
        try {
            await AnalisisRepository.guardarAnalisisSeparado({
                cedula,
                nombre,
                monto_inversion: monto,
                fecha_consulta: fechaConsulta
            }, resultados);
        } catch (saveError) {
            console.warn('⚠️ No se pudo guardar en docs separados, usando método alternativo');
            // Fallback: guardar en un solo documento
            await AnalisisRepository.guardarAnalisis({
                cedula,
                nombre,
                monto_inversion: monto,
                fecha_consulta: fechaConsulta,
                ranking_cooperativas: ranking,
                total_cooperativas: ranking.length
            });
        }

        // 5. Respuesta
        res.json({
            success: true,
            mensaje: `Análisis completado. ${ranking.length} cooperativas procesadas`,
            usuario: { 
                cedula, 
                nombre, 
                monto_inversion: parseFloat(monto) 
            },
            metadata: {
                fecha_consulta: fechaConsulta,
                total_cooperativas: ranking.length,
                total_formulas: formulas.length
            },
            ranking: ranking.slice(0, 20)
        });

    } catch (error) {
        console.error('❌ Error CRÍTICO en generarAnalisis:', error);
        
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al procesar el análisis',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};