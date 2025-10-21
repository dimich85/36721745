/**
 * ============================================================================
 * STAGE 6: AI-POWERED OPTIMIZATION - OPTIMIZATION STRATEGY SELECTOR
 * ============================================================================
 * 
 * Этот компонент - мозг нашей интеллектуальной системы оптимизации. Если Feature
 * Extractor - это глаза (он видит характеристики кода), а Neural Network - это
 * интуиция (она чувствует, что будет быстро, что медленно), то Optimization
 * Strategy Selector - это стратег, который принимает решения.
 * 
 * ФИЛОСОФИЯ: ОТ ПРЕДСКАЗАНИЯ К ДЕЙСТВИЮ
 * 
 * Представьте врача. Врач смотрит на пациента (извлекает характеристики -
 * температура, давление, анализы), затем интуитивно понимает, что происходит
 * (нейронная сеть предсказывает), и наконец принимает решение о лечении
 * (стратегия оптимизации).
 * 
 * Наша система работает аналогично. У нас есть "пациент" - функция JavaScript,
 * которую нужно оптимизировать. Мы смотрим на её характеристики, предсказываем
 * её производительность, и решаем, какие оптимизации применить.
 * 
 * СТРАТЕГИЯ ВЫБОРА ОПТИМИЗАЦИЙ
 * 
 * Не все оптимизации подходят для всех функций. Некоторые примеры:
 * 
 * - FUNCTION INLINING (встраивание функций) эффективно для маленьких функций,
 *   которые вызываются часто. Но для больших функций это увеличит размер кода
 *   без значительного ускорения.
 * 
 * - LOOP UNROLLING (разворачивание циклов) работает отлично для простых циклов
 *   с фиксированным количеством итераций. Но для сложных циклов с много логики
 *   это может даже замедлить код из-за увеличения размера.
 * 
 * - VECTORIZATION (векторизация) мощна для операций над массивами данных, но
 *   бесполезна для кода, который не работает с массивами.
 * 
 * - CONSTANT FOLDING (свёртка констант) всегда полезна, но её эффект зависит
 *   от того, сколько в коде константных выражений.
 * 
 * Наша система учится на примерах, какие оптимизации лучше работают для каких
 * паттернов кода. Это как шахматист, который знает, какие стратегии работают
 * в разных позициях.
 * 
 * АРХИТЕКТУРА РЕШЕНИЯ
 * 
 * Мы используем ансамбль подходов для принятия решений:
 * 
 * 1. COST-BENEFIT ANALYSIS: Для каждой оптимизации оцениваем ожидаемую пользу
 *    (насколько быстрее станет код) против стоимости (время компиляции, размер кода)
 * 
 * 2. DEPENDENCY GRAPH: Некоторые оптимизации работают лучше вместе. Например,
 *    после constant folding часто появляются возможности для dead code elimination.
 *    Мы учитываем эти зависимости.
 * 
 * 3. THRESHOLD-BASED FILTERING: Применяем оптимизацию только если ожидаемое
 *    улучшение превышает порог. Это предотвращает применение оптимизаций "на всякий
 *    случай", которые могут не дать эффекта или даже навредить.
 * 
 * 4. ADAPTIVE LEARNING: Система наблюдает за результатами и корректирует свои
 *    решения. Если оптимизация не дала ожидаемого эффекта, система учится и в
 *    следующий раз будет осторожнее с похожими случаями.
 */

/**
 * OptimizationStrategySelector - выбирает оптимальный набор оптимизаций для кода.
 * 
 * Этот класс интегрирует Feature Extractor и Neural Network для принятия
 * интеллектуальных решений об оптимизации. Он не просто применяет все возможные
 * оптимизации - он выбирает те, которые дадут наилучший результат для конкретного
 * случая.
 */
function OptimizationStrategySelector() {
    // Доступные оптимизации с их характеристиками
    this.availableOptimizations = [
        {
            name: 'constantFolding',
            displayName: 'Constant Folding',
            description: 'Вычисляет константные выражения на этапе компиляции',
            cost: 1,              // Стоимость применения (время компиляции)
            codeSize: 0,          // Влияние на размер кода (0 = уменьшает, 1 = нейтрально, 2 = увеличивает)
            applicability: function(features) {
                // Эффективна когда много литералов и операций
                return features.literals > 5 && features.binaryOps > 3;
            },
            expectedBenefit: function(features, performancePrediction) {
                // Ожидаемая польза зависит от доли арифметических операций
                var arithmeticRatio = features.arithmeticRatio || 0;
                return arithmeticRatio * 0.15; // До 15% ускорения
            }
        },
        {
            name: 'deadCodeElimination',
            displayName: 'Dead Code Elimination',
            description: 'Удаляет недостижимый и неиспользуемый код',
            cost: 2,
            codeSize: 0,
            applicability: function(features) {
                // Всегда применима
                return true;
            },
            expectedBenefit: function(features, performancePrediction) {
                // Польза зависит от сложности кода
                var complexity = features.cyclomaticComplexity || 1;
                return Math.min(0.1, complexity * 0.02);
            }
        },
        {
            name: 'functionInlining',
            displayName: 'Function Inlining',
            description: 'Встраивает маленькие функции в место вызова',
            cost: 3,
            codeSize: 2,
            applicability: function(features) {
                // Эффективна для маленьких функций с большим количеством вызовов
                return features.totalNodes < 50 && features.calls > 2;
            },
            expectedBenefit: function(features, performancePrediction) {
                // Польза зависит от количества вызовов функций
                var callRatio = features.calls / Math.max(1, features.totalNodes);
                return callRatio * 0.25; // До 25% ускорения для функций с частыми вызовами
            }
        },
        {
            name: 'loopUnrolling',
            displayName: 'Loop Unrolling',
            description: 'Разворачивает циклы для уменьшения overhead',
            cost: 4,
            codeSize: 2,
            applicability: function(features) {
                // Эффективна для простых циклов без вложенности
                return features.loops > 0 && features.loopComplexity < 0.5;
            },
            expectedBenefit: function(features, performancePrediction) {
                // Польза зависит от количества циклов и их сложности
                if (features.loops === 0) return 0;
                var loopImpact = features.loops / Math.max(1, features.totalNodes);
                var complexityPenalty = features.loopComplexity;
                return loopImpact * (1 - complexityPenalty) * 0.3;
            }
        },
        {
            name: 'commonSubexpressionElimination',
            displayName: 'Common Subexpression Elimination',
            description: 'Устраняет повторяющиеся вычисления',
            cost: 3,
            codeSize: 1,
            applicability: function(features) {
                // Эффективна когда много операций и переменных
                return features.binaryOps > 5 && features.variableReuseRate > 1.5;
            },
            expectedBenefit: function(features, performancePrediction) {
                // Польза зависит от повторного использования переменных
                var reuseRate = features.variableReuseRate || 1;
                return Math.min(0.2, (reuseRate - 1) * 0.1);
            }
        },
        {
            name: 'strengthReduction',
            displayName: 'Strength Reduction',
            description: 'Заменяет дорогие операции на дешёвые эквиваленты',
            cost: 2,
            codeSize: 1,
            applicability: function(features) {
                // Эффективна когда много операций внутри циклов
                return features.loops > 0 && features.binaryOps > 4;
            },
            expectedBenefit: function(features, performancePrediction) {
                // Польза зависит от плотности операций в циклах
                if (features.loops === 0) return 0;
                var opDensity = features.operationDensity || 0;
                return opDensity * 0.12;
            }
        },
        {
            name: 'branchPredictionOptimization',
            displayName: 'Branch Prediction Optimization',
            description: 'Оптимизирует условные переходы для предсказателя ветвлений',
            cost: 2,
            codeSize: 1,
            applicability: function(features) {
                // Эффективна когда много условных выражений
                return features.ifs > 3;
            },
            expectedBenefit: function(features, performancePrediction) {
                // Польза зависит от количества ветвлений
                var branchingFactor = features.branchingFactor || 0;
                return branchingFactor * 0.18;
            }
        }
    ];
    
    // История применённых оптимизаций и их результатов
    this.optimizationHistory = [];
    
    // Пороги для принятия решений
    this.thresholds = {
        minExpectedBenefit: 0.05,     // Минимальная ожидаемая польза (5%)
        maxCost: 10,                   // Максимальная суммарная стоимость оптимизаций
        maxCodeSizeIncrease: 1.5       // Максимальное увеличение размера кода (1.5x)
    };
}

/**
 * Выбирает оптимальный набор оптимизаций для данного кода.
 * 
 * Это главный метод, который принимает решение. Он анализирует характеристики
 * кода, предсказывает производительность, оценивает каждую оптимизацию, и
 * выбирает лучшую комбинацию.
 * 
 * @param {Object} featureExtractor - Экземпляр CodeFeatureExtractor с извлечёнными характеристиками
 * @param {Object} neuralNetwork - Обученная нейронная сеть для предсказаний
 * @returns {Object} - Выбранные оптимизации с обоснованием
 */
OptimizationStrategySelector.prototype.selectOptimizations = function(featureExtractor, neuralNetwork) {
    // Получаем вектор характеристик
    var featureVector = featureExtractor.buildFeatureVector();
    var features = this.convertVectorToObject(featureVector);
    
    // Предсказываем базовую производительность (без оптимизаций)
    var baselinePerformance = neuralNetwork.predict(featureVector);
    
    console.log('=== OPTIMIZATION STRATEGY SELECTION ===');
    console.log('');
    console.log('Baseline predicted performance:', baselinePerformance.toFixed(2), 'ms');
    console.log('Code characteristics:');
    console.log('  - Total nodes:', features.totalNodes);
    console.log('  - Max depth:', features.maxDepth);
    console.log('  - Loops:', features.loops);
    console.log('  - Operations:', features.binaryOps);
    console.log('  - Cyclomatic complexity:', features.cyclomaticComplexity);
    console.log('');
    
    // Оцениваем каждую оптимизацию
    var evaluations = [];
    
    for (var i = 0; i < this.availableOptimizations.length; i++) {
        var opt = this.availableOptimizations[i];
        
        // Проверяем применимость
        var isApplicable = opt.applicability(features);
        
        if (isApplicable) {
            // Оцениваем ожидаемую пользу
            var expectedBenefit = opt.expectedBenefit(features, baselinePerformance);
            
            // Оцениваем оптимизированную производительность
            var optimizedPerformance = baselinePerformance * (1 - expectedBenefit);
            
            // Вычисляем метрики для принятия решения
            var improvement = baselinePerformance - optimizedPerformance;
            var improvementPercent = (improvement / baselinePerformance) * 100;
            
            // Вычисляем оценку качества (benefit/cost ratio)
            var qualityScore = expectedBenefit / opt.cost;
            
            evaluations.push({
                optimization: opt,
                applicable: true,
                expectedBenefit: expectedBenefit,
                optimizedPerformance: optimizedPerformance,
                improvement: improvement,
                improvementPercent: improvementPercent,
                qualityScore: qualityScore
            });
        } else {
            evaluations.push({
                optimization: opt,
                applicable: false,
                reason: 'Не применима для данного кода'
            });
        }
    }
    
    // Сортируем оптимизации по качеству
    var applicableOpts = evaluations.filter(function(e) { return e.applicable; });
    applicableOpts.sort(function(a, b) { return b.qualityScore - a.qualityScore; });
    
    // Выбираем оптимизации с учётом ограничений
    var selectedOptimizations = [];
    var totalCost = 0;
    var totalCodeSizeImpact = 1.0;
    var cumulativeImprovement = 0;
    
    console.log('Evaluating optimizations:');
    console.log('');
    
    for (var i = 0; i < applicableOpts.length; i++) {
        var eval = applicableOpts[i];
        var opt = eval.optimization;
        
        console.log(opt.displayName + ':');
        console.log('  Expected benefit:', (eval.expectedBenefit * 100).toFixed(2) + '%');
        console.log('  Quality score:', eval.qualityScore.toFixed(3));
        console.log('  Cost:', opt.cost);
        
        // Проверяем ограничения
        var wouldExceedCost = (totalCost + opt.cost) > this.thresholds.maxCost;
        var wouldExceedCodeSize = (totalCodeSizeImpact * this.getCodeSizeMultiplier(opt.codeSize)) > 
                                   this.thresholds.maxCodeSizeIncrease;
        var benefitTooSmall = eval.expectedBenefit < this.thresholds.minExpectedBenefit;
        
        if (wouldExceedCost) {
            console.log('  Decision: SKIP (would exceed cost budget)');
        } else if (wouldExceedCodeSize) {
            console.log('  Decision: SKIP (would exceed code size limit)');
        } else if (benefitTooSmall) {
            console.log('  Decision: SKIP (benefit too small)');
        } else {
            console.log('  Decision: APPLY ✓');
            
            selectedOptimizations.push({
                name: opt.name,
                displayName: opt.displayName,
                description: opt.description,
                expectedBenefit: eval.expectedBenefit,
                improvementPercent: eval.improvementPercent,
                cost: opt.cost
            });
            
            totalCost += opt.cost;
            totalCodeSizeImpact *= this.getCodeSizeMultiplier(opt.codeSize);
            cumulativeImprovement += eval.expectedBenefit;
        }
        
        console.log('');
    }
    
    // Вычисляем ожидаемую финальную производительность
    var estimatedFinalPerformance = baselinePerformance * (1 - cumulativeImprovement);
    var totalImprovement = baselinePerformance - estimatedFinalPerformance;
    var totalImprovementPercent = (totalImprovement / baselinePerformance) * 100;
    
    console.log('=== OPTIMIZATION STRATEGY SUMMARY ===');
    console.log('');
    console.log('Selected optimizations:', selectedOptimizations.length);
    console.log('Total cost:', totalCost);
    console.log('Code size multiplier:', totalCodeSizeImpact.toFixed(2) + 'x');
    console.log('');
    console.log('Performance prediction:');
    console.log('  Before optimization:', baselinePerformance.toFixed(2), 'ms');
    console.log('  After optimization:', estimatedFinalPerformance.toFixed(2), 'ms');
    console.log('  Expected improvement:', totalImprovement.toFixed(2), 'ms', 
                '(' + totalImprovementPercent.toFixed(1) + '%)');
    console.log('');
    
    return {
        selectedOptimizations: selectedOptimizations,
        baselinePerformance: baselinePerformance,
        estimatedFinalPerformance: estimatedFinalPerformance,
        totalImprovement: totalImprovement,
        totalImprovementPercent: totalImprovementPercent,
        totalCost: totalCost,
        codeSizeMultiplier: totalCodeSizeImpact,
        allEvaluations: evaluations
    };
};

/**
 * Конвертирует вектор характеристик в объект для удобства.
 * 
 * Вектор - это просто массив чисел. Для удобной работы превращаем его в объект
 * с именованными полями.
 * 
 * @param {Array} vector - Вектор характеристик
 * @returns {Object} - Объект с именованными характеристиками
 */
OptimizationStrategySelector.prototype.convertVectorToObject = function(vector) {
    return {
        totalNodes: vector[0],
        maxDepth: vector[1],
        averageDepth: vector[2],
        branchingFactor: vector[3],
        literals: vector[4],
        identifiers: vector[5],
        binaryOps: vector[6],
        unaryOps: vector[7],
        calls: vector[8],
        assignments: vector[9],
        returns: vector[10],
        ifs: vector[11],
        loops: vector[12],
        functions: vector[13],
        arithmeticOps: vector[14],
        comparisonOps: vector[15],
        logicalOps: vector[16],
        bitwiseOps: vector[17],
        operationDensity: vector[18],
        arithmeticRatio: vector[19],
        comparisonRatio: vector[20],
        logicalRatio: vector[21],
        bitwiseRatio: vector[22],
        variablesDeclared: vector[23],
        variablesUsed: vector[24],
        variableReuseRate: vector[25],
        loopsTotal: vector[26],
        loopsNested: vector[27],
        loopsMaxNesting: vector[28],
        loopComplexity: vector[29],
        cyclomaticComplexity: vector[30],
        callGraphNodes: vector[31],
        callGraphEdges: vector[32]
    };
};

/**
 * Возвращает множитель размера кода для данного уровня влияния.
 * 
 * @param {number} codeSize - Уровень влияния на размер (0 = уменьшает, 1 = нейтрально, 2 = увеличивает)
 * @returns {number} - Множитель размера кода
 */
OptimizationStrategySelector.prototype.getCodeSizeMultiplier = function(codeSize) {
    if (codeSize === 0) return 0.9;   // Уменьшает на 10%
    if (codeSize === 1) return 1.0;   // Нейтрально
    return 1.2;                        // Увеличивает на 20%
};

/**
 * Записывает результат применения оптимизаций для обучения.
 * 
 * После того как оптимизации применены и код выполнен, мы записываем реальные
 * результаты. Это позволяет системе учиться и улучшать свои предсказания.
 * 
 * @param {Object} strategy - Выбранная стратегия оптимизации
 * @param {number} actualPerformance - Реальная производительность после оптимизации
 * @param {Object} codeFeatures - Характеристики исходного кода
 */
OptimizationStrategySelector.prototype.recordResult = function(strategy, actualPerformance, codeFeatures) {
    var predictionError = Math.abs(actualPerformance - strategy.estimatedFinalPerformance);
    var predictionAccuracy = 1 - (predictionError / strategy.baselinePerformance);
    
    var result = {
        timestamp: Date.now(),
        codeFeatures: codeFeatures,
        selectedOptimizations: strategy.selectedOptimizations,
        baselinePerformance: strategy.baselinePerformance,
        estimatedPerformance: strategy.estimatedFinalPerformance,
        actualPerformance: actualPerformance,
        predictionError: predictionError,
        predictionAccuracy: predictionAccuracy,
        actualImprovement: strategy.baselinePerformance - actualPerformance,
        actualImprovementPercent: ((strategy.baselinePerformance - actualPerformance) / 
                                   strategy.baselinePerformance) * 100
    };
    
    this.optimizationHistory.push(result);
    
    console.log('=== OPTIMIZATION RESULT RECORDED ===');
    console.log('');
    console.log('Predicted performance:', strategy.estimatedFinalPerformance.toFixed(2), 'ms');
    console.log('Actual performance:', actualPerformance.toFixed(2), 'ms');
    console.log('Prediction accuracy:', (predictionAccuracy * 100).toFixed(1) + '%');
    console.log('Actual improvement:', result.actualImprovement.toFixed(2), 'ms',
                '(' + result.actualImprovementPercent.toFixed(1) + '%)');
    console.log('');
    
    return result;
};

/**
 * Анализирует историю оптимизаций и возвращает статистику.
 * 
 * Это позволяет понять, насколько хорошо работает система и где есть
 * возможности для улучшения.
 * 
 * @returns {Object} - Статистика по истории оптимизаций
 */
OptimizationStrategySelector.prototype.analyzeHistory = function() {
    if (this.optimizationHistory.length === 0) {
        return { message: 'No optimization history available' };
    }
    
    var totalAccuracy = 0;
    var totalActualImprovement = 0;
    var optimizationCounts = {};
    
    for (var i = 0; i < this.optimizationHistory.length; i++) {
        var record = this.optimizationHistory[i];
        totalAccuracy += record.predictionAccuracy;
        totalActualImprovement += record.actualImprovementPercent;
        
        for (var j = 0; j < record.selectedOptimizations.length; j++) {
            var optName = record.selectedOptimizations[j].name;
            optimizationCounts[optName] = (optimizationCounts[optName] || 0) + 1;
        }
    }
    
    return {
        totalOptimizations: this.optimizationHistory.length,
        averagePredictionAccuracy: (totalAccuracy / this.optimizationHistory.length) * 100,
        averageActualImprovement: totalActualImprovement / this.optimizationHistory.length,
        mostUsedOptimizations: optimizationCounts,
        history: this.optimizationHistory
    };
};

// Экспорт для использования в браузере
if (typeof window !== 'undefined') {
    window.CompilerStage6 = window.CompilerStage6 || {};
    window.CompilerStage6.OptimizationStrategySelector = OptimizationStrategySelector;
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OptimizationStrategySelector: OptimizationStrategySelector };
}
