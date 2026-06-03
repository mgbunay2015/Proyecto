-- =============================================
-- RANKING INSTITUCIONES FINANCIERAS - OPTIMIZADO
-- Versión optimizada del script original
-- =============================================

SET NOCOUNT ON;
SET ANSI_WARNINGS OFF;
SET ARITHABORT OFF;

OPEN MASTER KEY DECRYPTION BY PASSWORD = 'db39MC_1'
OPEN SYMMETRIC KEY ClaveMIS02
DECRYPTION BY CERTIFICATE Certi01

-- =============================================
-- PARÁMETROS
-- =============================================

DECLARE @medida NVARCHAR(30) = 'SIMPLES'
DECLARE @constante INT = 12
DECLARE @constanteCuenta NVARCHAR(4) = '5690'
DECLARE @constanteInstitucionFinanciera INT = 1023
DECLARE @BANCO VARCHAR(30) = ''
DECLARE @Particion INT = 1
DECLARE @IndicadorInicio INT = 1001
DECLARE @IndicadorFin INT = 1017
DECLARE @ifTipoInstitucionFinanciera VARCHAR(30) = 'BANCOS PRIVADOS NACIONALES'
DECLARE @ifEstadoInstitucionFinanciera VARCHAR(2) = 'AC'

DECLARE @fechaHoy INT, @fechaHaceUnMes INT, @feIdFecha3AnioAnt INT, @fechaIniRank INT, @AnioActual INT

SELECT 
    @fechaHoy = feIdFecha,
    @fechaHaceUnMes = feMesAntCierr,
    @feIdFecha3AnioAnt = CONVERT(CHAR(8), DATEADD(MM, -60, feFecha), 112),
    @AnioActual = feCalAnio
FROM DWDFecha
WHERE feDiaActual = 1

SELECT @fechaIniRank = MIN(rifIdFecha) 
FROM DWHCORPORATIVOHISTORICO.dbo.DWHRankingInstitucionFinanciera

-- =============================================
-- 1. INSTITUCIONES FINANCIERAS (optimizado)
-- =============================================

DROP TABLE IF EXISTS #DWDInstitucionFinanciera;

SELECT * 
INTO #DWDInstitucionFinanciera 
FROM DWDInstitucionFinanciera 
WHERE ifTipoInstitucionFinanciera = @ifTipoInstitucionFinanciera 
AND ifEstadoInstitucionFinanciera = @ifEstadoInstitucionFinanciera;

-- Agregar SISTEMA, PEER GROUP, OTROS BANCOS en un solo INSERT
INSERT INTO #DWDInstitucionFinanciera
SELECT TOP 1 -10, ifTipoInstitucionFinanciera, ifEstadoInstitucionFinanciera, 'SISTEMA', 
    ifCodigoInternacional, ifEsNacional, ifFechaCarga, ifAgrupacion, ifAgrupacionSistema 
FROM #DWDInstitucionFinanciera
UNION ALL
SELECT TOP 1 -20, ifTipoInstitucionFinanciera, ifEstadoInstitucionFinanciera, 'PEER GROUP', 
    ifCodigoInternacional, ifEsNacional, ifFechaCarga, ifAgrupacion, ifAgrupacionSistema 
FROM #DWDInstitucionFinanciera
UNION ALL
SELECT TOP 1 -30, ifTipoInstitucionFinanciera, ifEstadoInstitucionFinanciera, 'OTROS BANCOS', 
    ifCodigoInternacional, ifEsNacional, ifFechaCarga, ifAgrupacion, ifAgrupacionSistema 
FROM #DWDInstitucionFinanciera;

-- =============================================
-- 2. PARTICIÓN POR AÑO (optimizado con CTE)
-- =============================================

DROP TABLE IF EXISTS #FECHA_PROCESAMIENTO;

;WITH FechasUnicas AS (
    SELECT DISTINCT rifIdFecha,
        DENSE_RANK() OVER (ORDER BY LEFT(CAST(rifIdFecha AS VARCHAR(8)), 4) DESC) AS Partition_Anio
    FROM DWHCORPORATIVOHISTORICO.dbo.DWHRankingInstitucionFinanciera
)
SELECT Partition_Anio, rifIdFecha
INTO #FECHA_PROCESAMIENTO
FROM FechasUnicas
WHERE Partition_Anio = @Particion
UNION
SELECT Partition_Anio, MAX(rifIdFecha)
FROM FechasUnicas
WHERE Partition_Anio = @Particion + 1
GROUP BY Partition_Anio;

-- =============================================
-- 3. CUENTAS CONTABLES (optimizado - un solo JOIN)
-- =============================================

DROP TABLE IF EXISTS #DWHRankingInstitucionFinanciera;

-- Cargar solo las fechas de la partición
SELECT a.* 
INTO #DWHRankingInstitucionFinanciera
FROM DWHCORPORATIVOHISTORICO.dbo.DWHRankingInstitucionFinanciera a
INNER JOIN #FECHA_PROCESAMIENTO b ON a.rifIdFecha = b.rifIdFecha
WHERE a.rifIdInstitucion IN (
    SELECT ifIdInstitucionFinanciera 
    FROM DWDInstitucionFinanciera 
    WHERE ifTipoInstitucionFinanciera = @ifTipoInstitucionFinanciera 
    AND ifEstadoInstitucionFinanciera = @ifEstadoInstitucionFinanciera
);

-- Agregar consolidados SISTEMA/PEER/OTROS en un solo INSERT con UNION ALL
INSERT INTO #DWHRankingInstitucionFinanciera
SELECT rifIdFecha, -10, rifIdCuentaContable, SUM(rifSaldo), GETDATE()
FROM #DWHRankingInstitucionFinanciera
WHERE rifIdInstitucion IN (
    SELECT ifIdInstitucionFinanciera FROM DWDInstitucionFinanciera 
    WHERE ifTipoInstitucionFinanciera = @ifTipoInstitucionFinanciera 
    AND ifEstadoInstitucionFinanciera = @ifEstadoInstitucionFinanciera 
    AND ifAgrupacionSistema = 'SISTEMA'
)
GROUP BY rifIdFecha, rifIdCuentaContable
UNION ALL
SELECT rifIdFecha, -20, rifIdCuentaContable, SUM(rifSaldo), GETDATE()
FROM #DWHRankingInstitucionFinanciera
WHERE rifIdInstitucion IN (
    SELECT ifIdInstitucionFinanciera FROM DWDInstitucionFinanciera 
    WHERE ifTipoInstitucionFinanciera = @ifTipoInstitucionFinanciera 
    AND ifEstadoInstitucionFinanciera = @ifEstadoInstitucionFinanciera 
    AND ifAgrupacion = 'PEER GROUP'
)
GROUP BY rifIdFecha, rifIdCuentaContable
UNION ALL
SELECT rifIdFecha, -30, rifIdCuentaContable, SUM(rifSaldo), GETDATE()
FROM #DWHRankingInstitucionFinanciera
WHERE rifIdInstitucion IN (
    SELECT ifIdInstitucionFinanciera FROM DWDInstitucionFinanciera 
    WHERE ifTipoInstitucionFinanciera = @ifTipoInstitucionFinanciera 
    AND ifEstadoInstitucionFinanciera = @ifEstadoInstitucionFinanciera 
    AND ifAgrupacion = 'OTROS BANCOS'
)
GROUP BY rifIdFecha, rifIdCuentaContable;

-- Índice optimizado
CREATE NONCLUSTERED INDEX IX_Ranking_Principal
ON #DWHRankingInstitucionFinanciera (rifIdFecha, rifIdInstitucion, rifIdCuentaContable)
INCLUDE (rifSaldo);

-- =============================================
-- 4. ACUMULADOS CUENTA 1 (optimizado sin cursor)
-- =============================================

DROP TABLE IF EXISTS #saldosFinalesAcumulados1001;

;WITH Saldos AS (
    SELECT 
        rifIdFecha,
        rifIdInstitucion,
        rifSaldo AS resultado_operacion,
        CAST(CONVERT(VARCHAR(8), rifIdFecha) AS DATE) AS rifFecha
    FROM #DWHRankingInstitucionFinanciera
    WHERE rifIdCuentaContable IN (
        SELECT ccrIdCuentaContable FROM DWPCuentaCodigoRanking WHERE ccrCodigo IN (1)
    )
),
ConInicioDiciembre AS (
    SELECT *,
        DATEFROMPARTS(
            YEAR(rifFecha) - CASE WHEN MONTH(rifFecha) < 12 THEN 1 ELSE 0 END, 12, 1
        ) AS inicio_diciembre
    FROM Saldos
),
Filtrado AS (
    SELECT * FROM ConInicioDiciembre WHERE rifFecha >= inicio_diciembre
)
SELECT
    rifFecha AS rifIdFecha,
    rifIdInstitucion,
    resultado_operacion,
    SUM(resultado_operacion) OVER (
        PARTITION BY rifIdInstitucion, inicio_diciembre
        ORDER BY rifFecha
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS suma_acumulada,
    AVG(resultado_operacion) OVER (
        PARTITION BY rifIdInstitucion, inicio_diciembre
        ORDER BY rifFecha
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS promedio_acumulado
INTO #saldosFinalesAcumulados1001
FROM Filtrado;

-- =============================================
-- 5. ACUMULADOS CUENTAS 3,4,5 (optimizado)
-- =============================================

DROP TABLE IF EXISTS #saldosFinalesAcumulados1002;

;WITH Saldos2 AS (
    SELECT
        rifIdInstitucion,
        CAST(CONVERT(DATE, CONVERT(VARCHAR(8), rifIdFecha)) AS DATE) AS rifFecha,
        MAX(CASE WHEN rifIdCuentaContable = 18226 THEN rifSaldo END) AS saldo_18226,
        MAX(CASE WHEN rifIdCuentaContable = 803 THEN rifSaldo END) AS saldo_803,
        MAX(CASE WHEN rifIdCuentaContable = 159 THEN rifSaldo END) AS saldo_159,
        MAX(CASE WHEN rifIdCuentaContable = 18226 THEN rifSaldo END)
        + (MAX(CASE WHEN rifIdCuentaContable = 159 THEN rifSaldo END)
        - MAX(CASE WHEN rifIdCuentaContable = 803 THEN rifSaldo END)) AS resultado_operacion
    FROM #DWHRankingInstitucionFinanciera
    WHERE rifIdCuentaContable IN (
        SELECT ccrIdCuentaContable FROM DWPCuentaCodigoRanking WHERE ccrCodigo IN (3, 4, 5)
    )
    GROUP BY rifIdInstitucion, CAST(CONVERT(DATE, CONVERT(VARCHAR(8), rifIdFecha)) AS DATE)
),
ConInicioDiciembre AS (
    SELECT *,
        DATEFROMPARTS(YEAR(rifFecha) - 1, 12, 1) AS inicio_diciembre
    FROM Saldos2
),
Filtrado AS (
    SELECT * FROM ConInicioDiciembre WHERE rifFecha > inicio_diciembre
)
SELECT
    rifFecha AS rifIdFecha,
    rifIdInstitucion,
    resultado_operacion,
    SUM(resultado_operacion) OVER (
        PARTITION BY rifIdInstitucion, inicio_diciembre
        ORDER BY rifFecha
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS suma_acumulada,
    AVG(resultado_operacion) OVER (
        PARTITION BY rifIdInstitucion, inicio_diciembre
        ORDER BY rifFecha
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS promedio_acumulado
INTO #saldosFinalesAcumulados1002
FROM Filtrado;

-- Ajustar con diciembre anterior (optimizado sin cursores)
UPDATE b
SET b.suma_acumulada = b.suma_acumulada + a.rifSaldo
FROM (
    SELECT 
        rif.rifIdFecha AS fechaOriginal,
        dic.rifIdFecha AS fechaDiciembre,
        rif.rifIdInstitucion,
        rif.rifSaldo
    FROM #DWHRankingInstitucionFinanciera rif
    INNER JOIN (
        SELECT rifIdFecha,
            LEAD(rifIdFecha) OVER (ORDER BY rifIdFecha) AS fechaSiguiente
        FROM (SELECT DISTINCT rifIdFecha FROM #saldosFinalesAcumulados1002) f
        WHERE MONTH(CAST(CONVERT(VARCHAR(8), rifIdFecha) AS DATE)) = 12
    ) dic ON rif.rifIdFecha = dic.rifIdFecha
    WHERE rif.rifIdCuentaContable = 18226
) a
INNER JOIN #saldosFinalesAcumulados1002 b 
    ON REPLACE(CAST(a.fechaOriginal AS VARCHAR), '-', '') = REPLACE(CAST(b.rifIdFecha AS VARCHAR), '-', '')
    AND a.rifIdInstitucion = b.rifIdInstitucion;

UPDATE #saldosFinalesAcumulados1002
SET promedio_acumulado = suma_acumulada / (MONTH(rifIdFecha) + 1);

-- =============================================
-- 6. PREPARAR FÓRMULAS Y CUENTAS (optimizado)
-- =============================================

DROP TABLE IF EXISTS #DWPFormulaFinancieraRanking;
DROP TABLE IF EXISTS #tmpRankingInstitucionFinanciera;

-- Fórmulas con cuentas contables mapeadas
SELECT DISTINCT
    ffr.*,
    IdCuentaContable = CASE 
        WHEN ffr.ffrCodigoOperacion LIKE '%N%R%' THEN ffr.ffrCodigoOperacion
        ELSE CAST(ccr.ccrIdCuentaContable AS VARCHAR(25)) 
    END
INTO #DWPFormulaFinancieraRanking
FROM DWPFormulaFinancieraRanking ffr
LEFT JOIN DWPCuentaCodigoRanking ccr ON ffr.ffrCodigoOperacion = ccr.ccrCodigo
WHERE ffrCodigoMedidaFinanciera IN (
    SELECT DISTINCT ffrCodigoMedidaFinanciera 
    FROM DWPFormulaFinancieraRanking 
    WHERE ffrTipoMedidaFinanciera = @medida
)
AND ffrTipoMedidaFinanciera = @medida;

-- =============================================
-- 7. SALDOS POR INDICADOR (optimizado - un solo paso)
-- =============================================

;WITH CuentasFormula AS (
    SELECT DISTINCT ffrCodigoMedidaFinanciera, IdCuentaContable, ccr.ccrCodigo
    FROM #DWPFormulaFinancieraRanking ffr
    INNER JOIN DWPCuentaCodigoRanking ccr 
        ON CONVERT(VARCHAR(30), ffr.IdCuentaContable) = CONVERT(VARCHAR(30), ccr.ccrIdCuentaContable)
)
SELECT 
    rif.rifIdFecha,
    cf.ffrCodigoMedidaFinanciera,
    cf.ccrCodigo,
    rifIdCuentaContable = CAST(rif.rifIdCuentaContable AS VARCHAR(25)),
    ffrNivelOperacion = CAST(-1 AS INT),
    rif.rifIdInstitucion,
    rifSaldo = SUM(rif.rifSaldo)
INTO #tmpRankingInstitucionFinanciera
FROM #DWHRankingInstitucionFinanciera rif
INNER JOIN (SELECT DISTINCT feIdFecha FROM #DWDFecha) fe ON rif.rifIdFecha = fe.feIdFecha
INNER JOIN CuentasFormula cf ON CAST(rif.rifIdCuentaContable AS VARCHAR(25)) = cf.IdCuentaContable
WHERE rif.rifIdFecha >= @fechaIniRank
GROUP BY rif.rifIdFecha, cf.ffrCodigoMedidaFinanciera, CAST(rif.rifIdCuentaContable AS VARCHAR(25)),
    rif.rifIdInstitucion, cf.ccrCodigo;

-- Índice para búsqueda rápida
CREATE NONCLUSTERED INDEX IX_TmpRanking_Lookup
ON #tmpRankingInstitucionFinanciera (rifIdFecha, ffrCodigoMedidaFinanciera, rifIdInstitucion, ccrCodigo)
INCLUDE (rifSaldo);

-- =============================================
-- 8. CONSTANTE 5690 Y AJUSTES (optimizado - batch updates)
-- =============================================

-- Copiar 5690 para indicadores 1007, 1008, 1009, 1016
INSERT INTO #tmpRankingInstitucionFinanciera
SELECT rifIdFecha, dest.ffrCodigo, CONCAT(ccrCodigo, 'T'), CONCAT(ccrCodigo, 'T'), 
    ffrNivelOperacion, rifIdInstitucion, rifSaldo
FROM #tmpRankingInstitucionFinanciera
CROSS JOIN (VALUES (1007, 1004), (1008, 1005)) AS dest(ffrCodigo, ffrOrigen)
WHERE ffrCodigoMedidaFinanciera = dest.ffrOrigen
AND ccrCodigo = @constanteCuenta 
AND ffrNivelOperacion = -1;

-- Batch update: poner 0 donde no es la institución constante
UPDATE #tmpRankingInstitucionFinanciera
SET rifSaldo = 0
WHERE rifIdInstitucion <> @constanteInstitucionFinanciera 
AND ccrCodigo = @constanteCuenta
AND ffrCodigoMedidaFinanciera IN (1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012);

-- =============================================
-- 9. VARIABLES @mes, @constante, @acum (optimizado - batch insert)
-- =============================================

;WITH InstFecha AS (
    SELECT DISTINCT rifIdFecha, rifIdInstitucion FROM #DWHRankingInstitucionFinanciera
),
Indicadores AS (
    SELECT DISTINCT ffrCodigoMedidaFinanciera FROM #tmpRankingInstitucionFinanciera
)
INSERT INTO #tmpRankingInstitucionFinanciera
SELECT f.rifIdFecha, i.ffrCodigoMedidaFinanciera, '@mes', '@mes', -1, f.rifIdInstitucion,
    CONVERT(INT, SUBSTRING(CONVERT(NVARCHAR(8), f.rifIdFecha), 5, 2))
FROM InstFecha f CROSS JOIN Indicadores i
UNION ALL
SELECT f.rifIdFecha, i.ffrCodigoMedidaFinanciera, '@constante', '@constante', -1, f.rifIdInstitucion,
    @constante
FROM InstFecha f CROSS JOIN Indicadores i;

-- Actualizar cuenta 1 con promedio acumulado
UPDATE a
SET a.rifSaldo = b.promedio_acumulado
FROM #tmpRankingInstitucionFinanciera a
INNER JOIN #saldosFinalesAcumulados1001 b
    ON a.rifIdFecha = REPLACE(b.rifIdFecha, '-', '') 
    AND a.rifIdInstitucion = b.rifIdInstitucion
WHERE a.ccrCodigo = '1';

-- @acum desde acumulados 1002
INSERT INTO #tmpRankingInstitucionFinanciera
SELECT REPLACE(rifIdFecha, '-', ''), 1001, '@acum', '@acum', -1, rifIdInstitucion, promedio_acumulado
FROM #saldosFinalesAcumulados1002;

-- =============================================
-- 10. CUENTA 5690 INTERNACIONAL (optimizado)
-- =============================================

DROP TABLE IF EXISTS #DWPFormulaFinanciera5690X;

SELECT 
    bsIdFecha,
    @constanteCuenta AS ccrIdCuentaContable,
    SUM(c.bsSaldoDolarizado) AS bsSaldoDolarizado,
    (SELECT ifIdInstitucionFinanciera FROM DWDInstitucionFinanciera 
     WHERE ifNombreInstitucionFinanciera = 'BP INTERNACIONAL') AS rifIdInstitucion
INTO #DWPFormulaFinanciera5690X
FROM DWPCuentaInternacionalRanking a
INNER JOIN DWDCuentaContable b ON a.CCCodigoCuentaContable = CAST(DECRYPTBYKEY(b.ccCodigoNivel7) AS VARCHAR(12))
INNER JOIN DWHBalanceSaldo c ON c.bsIdCuentaContable = b.ccIdCuentaContable
GROUP BY bsIdFecha;

UPDATE a
SET a.rifSaldo = b.bsSaldoDolarizado
FROM #tmpRankingInstitucionFinanciera a
INNER JOIN #DWPFormulaFinanciera5690X b
    ON a.rifIdFecha = b.bsIdFecha 
    AND a.ccrCodigo = b.ccrIdCuentaContable 
    AND a.rifIdInstitucion = b.rifIdInstitucion
WHERE ISNUMERIC(a.ccrCodigo) = 1;

-- Copiar 5690 para indicadores adicionales
INSERT INTO #tmpRankingInstitucionFinanciera
SELECT rifIdFecha, dest.ffrCodigo, ccrCodigo, rifIdCuentaContable, ffrNivelOperacion, rifIdInstitucion, rifSaldo
FROM #tmpRankingInstitucionFinanciera
CROSS JOIN (VALUES (1009), (1016)) AS dest(ffrCodigo)
WHERE ccrCodigo = @constanteCuenta 
AND ffrCodigoMedidaFinanciera = 1008 
AND rifIdInstitucion = @constanteInstitucionFinanciera 
AND ISNUMERIC(rifIdCuentaContable) = 1;

-- =============================================
-- 11. DESCOMPONER FÓRMULAS (optimizado - sin cursor individual)
-- =============================================

DROP TABLE IF EXISTS #FormulaTokens;
DROP TABLE IF EXISTS #FormulaTokensAnadir;

CREATE TABLE #FormulaTokens (
    CodigoMedidaFinanciera INT,
    Token NVARCHAR(50),
    Orden INT
);

-- Tokenizar todas las fórmulas
DECLARE @Formula NVARCHAR(MAX), @Codigo INT;
DECLARE @i INT, @len INT, @char NCHAR(1), @token NVARCHAR(50), @orden INT;

DECLARE formula_cur CURSOR FAST_FORWARD FOR
    SELECT DISTINCT ffrCodigoMedidaFinanciera, ffrFormulaMedidaFinanciera 
    FROM DWPFormulaFinancieraRanking
    WHERE ffrCodigoMedidaFinanciera BETWEEN @IndicadorInicio AND @IndicadorFin
    AND ffrTipoMedidaFinanciera = @medida;

OPEN formula_cur;
FETCH NEXT FROM formula_cur INTO @Codigo, @Formula;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @i = 1;
    SET @orden = 1;
    SET @len = LEN(@Formula);
    SET @token = '';

    WHILE @i <= @len
    BEGIN
        SET @char = SUBSTRING(@Formula, @i, 1);

        IF @char IN ('(', ')', '+', '-', '*', '/', '^')
        BEGIN
            IF @token <> '' BEGIN INSERT INTO #FormulaTokens VALUES (@Codigo, @token, @orden); SET @orden += 1; SET @token = ''; END
            INSERT INTO #FormulaTokens VALUES (@Codigo, @char, @orden);
            SET @orden += 1;
        END
        ELSE IF @char LIKE '[A-Za-z0-9_@]' SET @token += @char;
        ELSE IF @token <> '' BEGIN INSERT INTO #FormulaTokens VALUES (@Codigo, @token, @orden); SET @orden += 1; SET @token = ''; END

        SET @i += 1;
    END

    IF @token <> '' INSERT INTO #FormulaTokens VALUES (@Codigo, @token, @orden);

    FETCH NEXT FROM formula_cur INTO @Codigo, @Formula;
END
CLOSE formula_cur;
DEALLOCATE formula_cur;

-- =============================================
-- 12. CRUZAR TOKENS CON SALDOS (optimizado)
-- =============================================

;WITH InstFecha AS (
    SELECT DISTINCT rifIdFecha, rifIdInstitucion FROM #DWHRankingInstitucionFinanciera
)
SELECT 
    ft.*,
    if2.rifIdFecha,
    if2.rifIdInstitucion,
    Token2 = CASE WHEN ISNUMERIC(ft.Token) = 1 THEN TRY_CAST(ft.Token AS FLOAT) ELSE NULL END
INTO #FormulaTokensAnadir
FROM #FormulaTokens ft
CROSS JOIN InstFecha if2;

-- Índice antes de los updates
CREATE NONCLUSTERED INDEX IX_Tokens_Lookup 
ON #FormulaTokensAnadir (rifIdFecha, CodigoMedidaFinanciera, rifIdInstitucion, Token)
INCLUDE (Token2, Orden);

-- Actualizar tokens con saldos reales (batch)
UPDATE a
SET a.Token2 = b.rifSaldo
FROM #FormulaTokensAnadir a
INNER JOIN #tmpRankingInstitucionFinanciera b
    ON a.CodigoMedidaFinanciera = b.ffrCodigoMedidaFinanciera 
    AND a.rifIdFecha = b.rifIdFecha
    AND a.rifIdInstitucion = b.rifIdInstitucion 
    AND a.Token = b.ccrCodigo;

-- @acum separado
UPDATE a
SET a.Token2 = b.rifSaldo
FROM #FormulaTokensAnadir a
INNER JOIN #tmpRankingInstitucionFinanciera b
    ON a.rifIdFecha = b.rifIdFecha 
    AND a.Token = b.ccrCodigo 
    AND b.ccrCodigo = '@acum'
    AND a.rifIdInstitucion = b.rifIdInstitucion;

-- Cuentas no encontradas = 0
UPDATE #FormulaTokensAnadir
SET Token2 = 0
WHERE Token2 IS NOT NULL 
AND CONVERT(VARCHAR(30), Token) = CONVERT(VARCHAR(30), Token2);

-- =============================================
-- 13. CONSTRUIR Y EVALUAR FÓRMULAS (optimizado)
-- =============================================

DECLARE @Resultados TABLE (
    rifIdFecha INT,
    CodigoMedidaFinanciera INT,
    rifIdInstitucion INT,
    Formula NVARCHAR(MAX),
    Resultado FLOAT
);

-- Construir fórmulas como cadena (un solo STRING_AGG)
DECLARE @Formulas_ TABLE (
    Id INT IDENTITY(1,1),
    rifIdFecha INT,
    CodigoMedidaFinanciera INT,
    rifIdInstitucion INT,
    Formula NVARCHAR(MAX)
);

INSERT INTO @Formulas_ (rifIdFecha, CodigoMedidaFinanciera, rifIdInstitucion, Formula)
SELECT
    rifIdFecha,
    CodigoMedidaFinanciera,
    rifIdInstitucion,
    STRING_AGG(
        CASE WHEN Token2 IS NOT NULL THEN FORMAT(Token2, 'G', 'en-US') ELSE Token END, ''
    ) WITHIN GROUP (ORDER BY Orden)
FROM #FormulaTokensAnadir
GROUP BY rifIdFecha, CodigoMedidaFinanciera, rifIdInstitucion;

-- =============================================
-- EVALUACIÓN POR LOTES MASIVA
-- Genera un solo bloque SQL que evalúa N fórmulas
-- y las inserta en una tabla temporal de golpe.
-- Reduce llamadas a sp_executesql de N a N/BatchSize
-- =============================================

DECLARE @BatchSize INT = 100;
DECLARE @TotalFormulas INT = (SELECT MAX(Id) FROM @Formulas_);
DECLARE @BatchStart INT = 1;
DECLARE @BatchEnd INT;

DROP TABLE IF EXISTS #BatchResults;
CREATE TABLE #BatchResults (
    Id INT PRIMARY KEY,
    rifIdFecha INT,
    CodigoMedidaFinanciera INT,
    rifIdInstitucion INT,
    Formula NVARCHAR(MAX),
    Resultado FLOAT
);

INSERT INTO #BatchResults (Id, rifIdFecha, CodigoMedidaFinanciera, rifIdInstitucion, Formula)
SELECT Id, rifIdFecha, CodigoMedidaFinanciera, rifIdInstitucion, Formula
FROM @Formulas_;

WHILE @BatchStart <= ISNULL(@TotalFormulas, 0)
BEGIN
    SET @BatchEnd = @BatchStart + @BatchSize - 1;
    IF @BatchEnd > @TotalFormulas SET @BatchEnd = @TotalFormulas;

    -- Construir SQL masivo: un SELECT con UNION ALL que evalúa todas las fórmulas del lote
    DECLARE @MassSQL NVARCHAR(MAX) = N'';
    DECLARE @IdLoop INT = @BatchStart;
    DECLARE @FormulaActual NVARCHAR(MAX);
    DECLARE @First BIT = 1;

    WHILE @IdLoop <= @BatchEnd
    BEGIN
        SELECT @FormulaActual = Formula FROM #BatchResults WHERE Id = @IdLoop;

        IF @FormulaActual IS NOT NULL AND LEN(@FormulaActual) > 0 
           AND LEN(@FormulaActual) < 4000
        BEGIN
            IF @First = 0 SET @MassSQL += N' UNION ALL ';
            
            SET @MassSQL += N'SELECT ' + CAST(@IdLoop AS NVARCHAR(10)) 
                + N' AS Id, CAST((' + @FormulaActual + N') AS FLOAT) AS Resultado';
            SET @First = 0;
        END

        SET @IdLoop += 1;
    END

    -- Ejecutar todo el lote en una sola llamada
    IF LEN(@MassSQL) > 0
    BEGIN
        DECLARE @WrapSQL NVARCHAR(MAX) = N'
            DECLARE @TempRes TABLE (Id INT, Resultado FLOAT);
            BEGIN TRY
                INSERT INTO @TempRes ' + @MassSQL + N';
                UPDATE b SET b.Resultado = t.Resultado
                FROM #BatchResults b INNER JOIN @TempRes t ON b.Id = t.Id;
            END TRY
            BEGIN CATCH
                -- Si el lote falla, evaluar una por una (fallback)
                DECLARE @i INT = ' + CAST(@BatchStart AS NVARCHAR(10)) + N';
                DECLARE @e INT = ' + CAST(@BatchEnd AS NVARCHAR(10)) + N';
                WHILE @i <= @e
                BEGIN
                    DECLARE @f NVARCHAR(MAX), @r FLOAT;
                    SELECT @f = Formula FROM #BatchResults WHERE Id = @i;
                    IF @f IS NOT NULL AND LEN(@f) > 0
                    BEGIN
                        BEGIN TRY
                            DECLARE @s NVARCHAR(MAX) = N''SET @r = '' + @f;
                            EXEC sp_executesql @s, N''@r FLOAT OUTPUT'', @r = @r OUTPUT;
                            UPDATE #BatchResults SET Resultado = @r WHERE Id = @i;
                        END TRY
                        BEGIN CATCH
                            UPDATE #BatchResults SET Resultado = NULL WHERE Id = @i;
                        END CATCH
                    END
                    SET @i += 1;
                END
            END CATCH';

        BEGIN TRY
            EXEC sp_executesql @WrapSQL;
        END TRY
        BEGIN CATCH
            -- Fallback final: evaluar una por una
            DECLARE @fb INT = @BatchStart;
            WHILE @fb <= @BatchEnd
            BEGIN
                DECLARE @fbF NVARCHAR(MAX), @fbR FLOAT;
                SELECT @fbF = Formula FROM #BatchResults WHERE Id = @fb;
                IF @fbF IS NOT NULL AND LEN(@fbF) > 0
                BEGIN
                    SET @fbR = NULL;
                    BEGIN TRY
                        DECLARE @fbSQL NVARCHAR(MAX) = N'SET @R = ' + @fbF;
                        EXEC sp_executesql @fbSQL, N'@R FLOAT OUTPUT', @R = @fbR OUTPUT;
                    END TRY
                    BEGIN CATCH
                        SET @fbR = NULL;
                    END CATCH
                    UPDATE #BatchResults SET Resultado = @fbR WHERE Id = @fb;
                END
                SET @fb += 1;
            END
        END CATCH
    END

    SET @BatchStart = @BatchEnd + 1;
END

-- Pasar a @Resultados
INSERT INTO @Resultados (rifIdFecha, CodigoMedidaFinanciera, rifIdInstitucion, Formula, Resultado)
SELECT rifIdFecha, CodigoMedidaFinanciera, rifIdInstitucion, Formula, Resultado
FROM #BatchResults;

-- =============================================
-- 14. RESULTADO FINAL (optimizado - un solo SELECT)
-- =============================================

DROP TABLE IF EXISTS #TablaFinal;

SELECT DISTINCT
    rif.rifIdFecha AS bsfIdFecha,
    rif.CodigoMedidaFinanciera AS bsfIdIndicadorMedidaFinanciera,
    rif.rifIdInstitucion,
    ABS(ISNULL(ROUND(
        CASE 
            WHEN rif.CodigoMedidaFinanciera IN (1001, 1002, 1009, 1010, 1011, 1012, 1013, 1014, 1015, 1016, 1017) 
            THEN rif.Resultado * 100
            ELSE rif.Resultado
        END, 2), 0)) AS bsfValorReal,
    b.ifNombreInstitucionFinanciera,
    ffr.ffrMedidaFinanciera
INTO #TablaFinal
FROM @Resultados rif
INNER JOIN #DWPFormulaFinancieraRanking ffr ON rif.CodigoMedidaFinanciera = ffr.ffrCodigoMedidaFinanciera
INNER JOIN #DWDInstitucionFinanciera b ON rif.rifIdInstitucion = b.ifIdInstitucionFinanciera
INNER JOIN DWDFecha rife ON rif.rifIdFecha = rife.feIdFecha
WHERE rif.rifIdFecha NOT IN (SELECT MIN(rifIdFecha) FROM #FECHA_PROCESAMIENTO);

-- Resultado
SELECT DISTINCT 
    bsfIdFecha,
    bsfIdIndicadorMedidaFinanciera,
    rifIdInstitucion,
    bsfValorReal,
    ifNombreInstitucionFinanciera,
    ffrMedidaFinanciera
FROM #TablaFinal
ORDER BY bsfIdIndicadorMedidaFinanciera, bsfValorReal DESC;

-- =============================================
-- 15. LIMPIEZA
-- =============================================

DROP TABLE IF EXISTS #DWPFormulaFinancieraRanking;
DROP TABLE IF EXISTS #DWDFecha;
DROP TABLE IF EXISTS #tmpRankingInstitucionFinanciera;
DROP TABLE IF EXISTS #DWDInstitucionFinanciera;
DROP TABLE IF EXISTS #FECHA_PROCESAMIENTO;
DROP TABLE IF EXISTS #DWHRankingInstitucionFinanciera;
DROP TABLE IF EXISTS #saldosFinalesAcumulados1001;
DROP TABLE IF EXISTS #saldosFinalesAcumulados1002;
DROP TABLE IF EXISTS #DWPFormulaFinanciera5690X;
DROP TABLE IF EXISTS #FormulaTokens;
DROP TABLE IF EXISTS #FormulaTokensAnadir;
DROP TABLE IF EXISTS #TablaFinal;
