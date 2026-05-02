// services/CalculadoraService.js

class CalculadoraService {
    
    static evaluarFormulaConTrazabilidad(formulaStr, saldos) {
        if (!formulaStr || typeof formulaStr !== 'string') {
            return { 
                resultado: 0, 
                formulaEvaluada: formulaStr || '', 
                formulaOriginal: formulaStr || '' 
            };
        }

        let expresion = formulaStr.trim();
        let formulaConValores = formulaStr.trim();

        // ✅ Extraer códigos de la fórmula original
        const codigosEnFormula = formulaStr.match(/\b\d+\b/g) || [];
        const codigosUnicos = [...new Set(codigosEnFormula)];

        // ✅ Filtrar y ordenar por longitud descendente
        const codigosOrdenados = codigosUnicos
            .filter(codigo => saldos.hasOwnProperty(codigo))
            .sort((a, b) => b.length - a.length);
        
        console.log('🔧 Códigos a reemplazar:', codigosOrdenados);

        // ✅ MARCAR posiciones ya reemplazadas
        const posicionesOcupadas = new Set();

        for (const codigo of codigosOrdenados) {
            const valor = saldos[codigo];
            
            // ✅ Encontrar TODAS las coincidencias
            const regex = new RegExp(`\\b${codigo}\\b`, 'g');
            let match;
            const matches = [];
            
            while ((match = regex.exec(expresion)) !== null) {
                const inicio = match.index;
                const fin = inicio + match[0].length;
                
                // ✅ Verificar que no esté dentro de un decimal
                const charAntes = inicio > 0 ? expresion[inicio - 1] : '';
                const charDespues = fin < expresion.length ? expresion[fin] : '';
                
                // Si está precedido o seguido por punto, es parte de un decimal
                if (charAntes === '.' || charDespues === '.') {
                    console.log(`   ⏭️ Saltando ${codigo} en posición ${inicio} (es decimal)`);
                    continue;
                }
                
                // Verificar que la posición no esté ocupada
                let ocupada = false;
                for (let i = inicio; i < fin; i++) {
                    if (posicionesOcupadas.has(i)) {
                        ocupada = true;
                        break;
                    }
                }
                
                if (!ocupada) {
                    matches.push({ inicio, fin, match: match[0] });
                }
            }
            
            // ✅ Reemplazar de atrás hacia adelante para no alterar índices
            for (let i = matches.length - 1; i >= 0; i--) {
                const { inicio, fin } = matches[i];
                const valorFormateado = typeof valor === 'number' && !Number.isInteger(valor)
                    ? `(${valor.toFixed(2)})`
                    : valor;
                
                expresion = 
                    expresion.substring(0, inicio) + 
                    valorFormateado + 
                    expresion.substring(fin);
                
                formulaConValores = formulaConValores.replace(
                    new RegExp(`\\b${codigo}\\b`), 
                    `(${valor})`
                );
                
                // Marcar posiciones como ocupadas
                for (let j = inicio; j < inicio + valorFormateado.length; j++) {
                    posicionesOcupadas.add(j);
                }
                
                console.log(`   ✅ ${codigo} → ${valorFormateado}`);
            }
        }

        // ✅ Reemplazar códigos no encontrados por 0
        const codigosNoEncontrados = codigosUnicos.filter(c => !saldos.hasOwnProperty(c));
        
        for (const codigo of codigosNoEncontrados) {
            const regex = new RegExp(`\\b${codigo}\\b`, 'g');
            expresion = expresion.replace(regex, '0');
            formulaConValores = formulaConValores.replace(regex, '(0)');
            console.log(`   ⚠️ ${codigo} no encontrado → 0`);
        }

        console.log('📝 Expresión final:', expresion);

        try {
            if (!/^[0-9+\-*/().\s]+$/.test(expresion)) {
                throw new Error('Caracteres inválidos');
            }

            if (/\d\.\d+\.\d/.test(expresion)) {
                throw new Error('Decimales inválidos');
            }

            // eslint-disable-next-line no-new-func
            const resultado = new Function(`return ${expresion}`)();
            
            return {
                resultado: isFinite(resultado) ? parseFloat(resultado.toFixed(6)) : 0,
                formulaEvaluada: formulaConValores,
                formulaOriginal: formulaStr
            };
        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
            console.error(`   Expresión: ${expresion}`);
            
            return {
                resultado: 0,
                formulaEvaluada: `ERROR: ${error.message}`,
                formulaOriginal: formulaStr
            };
        }
    }

    static evaluarFormula(formulaStr, saldos) {
        const { resultado } = this.evaluarFormulaConTrazabilidad(formulaStr, saldos);
        return resultado;
    }

    static calcularPuntaje(valor, codigoFormula) {
        if (['519', '611', '530', '612'].includes(codigoFormula)) {
            if (valor >= 0.10) return 10;
            if (valor >= 0.05) return 7;
            if (valor >= 0) return 4;
            return 0;
        }
        if (['505', '527', '606'].includes(codigoFormula)) {
            if (valor <= 0.03) return 10;
            if (valor <= 0.05) return 7;
            if (valor <= 0.08) return 4;
            return 0;
        }
        return valor > 0 ? 5 : 0;
    }
}

module.exports = CalculadoraService;