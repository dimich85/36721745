/**
 * ============================================================================
 * STAGE 7: INTELLIGENT OPTIMIZATION STRATEGY SELECTOR
 * ============================================================================
 * 
 * Это мозг нашей системы оптимизации - компонент, который решает, КАКИЕ
 * оптимизации применить к конкретному коду. Это не просто набор правил,
 * а интеллектуальная система, которая учится на опыте и адаптируется.
 * 
 * ФИЛОСОФИЯ СИСТЕМЫ
 * 
 * Представьте опытного повара, который готовит блюдо. У него есть множество
 * техник: жарка, варка, тушение, запекание, каждая со своими вариациями.
 * Он не применяет все техники к каждому ингредиенту. Он ВЫБИРАЕТ подходящие
 * техники на основе:
 * 
 * 1. Характеристик ингредиента (что это: мясо, овощи, рыба?)
 * 2. Желаемого результата (быстро приготовить или максимальный вкус?)
 * 3. Контекста (какие ингредиенты рядом, какое блюдо готовим?)
 * 4. Опыта (что работало раньше в похожих ситуациях?)
 * 
 * Наша система работает аналогично с кодом. У нас есть арсенал оптимизаций:
 * 
 * - INLINING (Встраивание функций): Заменяем вызов функции её телом
 * - LOOP_UNROLLING (Разворачивание циклов): Дублируем тело цикла
 * - CONSTANT_FOLDING (Свёртка констант): Вычисляем константные выражения
 * - DEAD_CODE_ELIMINATION (Удаление мёртвого кода): Убираем неиспользуемый код
 * - COMMON_SUBEXPRESSION (Общие подвыражения): Вычисляем повторяющиеся выражения раз
 * - VECTORIZATION (Векторизация): Используем SIMD инструкции для массивов
 * - STRENGTH_REDUCTION (Упрощение операций): Заменяем дорогие операции дешёвыми
 * 
 * Для каждой функции мы анализируем её характеристики (вектор из Feature Extractor)
 * и решаем, какие оптимизации применить. Но как мы принимаем это решение?
 * 
 * ПОДХОД 1: МАШИННОЕ ОБУЧЕНИЕ ДЛЯ РАНЖИРОВАНИЯ
 * 
 * Мы обучаем модель предсказывать "полезность" каждой оптимизации для данного
 * кода. Полезность - это ожидаемое улучшение производительности. Например:
 * 
 * Код A: [характеристики] → Инлайнинг: +20%, Разворачивание: +5%, Векторизация: +2%
 * Код B: [характеристики] → Инлайнинг: +2%, Разворачивание: +15%, Векторизация: +30%
 * 
 * Видите разницу? Для кода A лучше всего инлайнинг, для кода B - векторизация.
 * Модель учится находить эти паттерны.
 * 
 * ПОДХОД 2: ПРАВИЛА С ПОРОГАМИ
 * 
 * Некоторые решения можно принять на основе чётких критериев:
 * 
 * - Если функция меньше 50 узлов AST И вызывается > 5 раз → Инлайнинг
 * - Если цикл < 4 итераций И тело простое → Разворачивание
 * - Если много арифметики на массивах → Векторизация
 * - Если есть мёртвый код (недостижимые ветки) → Удаление
 * 
 * ГИБРИДНЫЙ ПОДХОД
 * 
 * Мы используем комбинацию: ML модель для сложных решений, правила для очевидных
 * случаев. Это даёт лучшие результаты, чем каждый подход по отдельности.
 * 
 * ОБУЧЕНИЕ СИСТЕМЫ
 * 
 * Система учится на данных вида:
 * 
 * {
 *   codeFeatures: [вектор характеристик],
 *   appliedOptimizations: ["inlining", "loop_unrolling"],
 *   performanceImprovement: 1.35  // Ускорение в 1.35 раза
 * }
 * 
 * Мы пробуем разные комбинации оптимизаций на тренировочном коде, измеряем
 * эффект, и учим модель предсказывать, какие комбинации работают лучше.
 * 
 * Это называется REINFORCEMENT LEARNING (обучение с подкреплением) - мы
 * исследуем пространство возможных действий, получаем награду (улучшение
 * производительности), и учимся выбирать действия, которые дают больше наград.
 */

/**
 * OptimizationSelector - интеллектуальная система выбора оптимизаций.
 * 
 * Этот класс анализирует характеристики кода и решает, какие оптимизации
 * применить для максимального улучшения производительности.
 */
function OptimizationSelector() {
    // Доступные оптимизации с их параметрами
    this.availableOptimizations = {
        'inlining': {
            name: 'Function Inlining',
            description: 'Встраивает тела функций вместо вызовов',
            cost: 'medium',  // Стоимость применения (компиляция)
            benefit: 'high', // Потенциальная польза
            sideEffects: ['code_size_increase']  // Побочные эффекты
        },
        'loop_unrolling': {
            name: 'Loop Unrolling',
            description: 'Разворачивает циклы для уменьшения накладных расходов',
            cost: 'medium',
            benefit: 'medium',
            sideEffects: ['code_size_increase', 'instruction_cache_pressure']
        },
        'constant_folding': {
            name: 'Constant Folding',
            description: 'Вычисляет константные выражения на этапе компиляции',
            cost: 'low',
            benefit: 'low',
            sideEffects: []
        },
        'dead_code_elimination': {
            name: 'Dead Code Elimination',
            description: 'Удаляет недостижимый и неиспользуемый код',
            cost: 'low',
            benefit: 'medium',
            sideEffects: ['code_size_decrease']
        },
        'common_subexpression': {
            name: 'Common Subexpression Elimination',
            description: 'Вычисляет повторяющиеся выражения только один раз',
            cost: 'medium',
            benefit: 'medium',
            sideEffects: ['register_pressure']
        },
        'vectorization': {
            name: 'Auto-vectorization',
            description: 'Использует SIMD инструкции для параллельных операций',
            cost: 'high',
            benefit: 'high',
            sideEffects: ['alignment_requirements']
        },
        'strength_reduction': {
            name: 'Strength Reduction',
            description: 'Заменяет дорогие операции эквивалентными дешёвыми',
            cost: 'low',
            benefit: 'low',
            sideEffects: []
        }
    };
    
    // Нейронная сеть для предсказания эффективности оптимизаций
    // Вход: 33 характеристики кода + 1 ID оптимизации (one-hot encoded)
    // Выход: ожидаемое улучшение производительности (коэффициент ускорения)
    this.effectivenessPredictor = null;
    
    // История решений для обучения
    this.decisionHistory = [];
    
    // Статистика применения оптимизаций
    this.statistics = {
        totalDecisions: 0,
        optimizationsApplied: {},
        averageImprovement: {}
    };
    
    this.initializeStatistics();
}

/**
 * Инициализирует статистику для всех оптимизаций.
 */
OptimizationSelector.prototype.initializeStatistics = function() {
    var optimizations = Object.keys(this.availableOptimizations);
    for (var i = 0; i < optimizations.length; i++) {
        var opt = optimizations[i];
        this.statistics.optimizationsApplied[opt] = 0;
        this.statistics.averageImprovement[opt] = 0;
    }
};

/**
 * Выбирает оптимизации для данного кода на основе его характеристик.
 * 
 * Это главная функция селектора. Она принимает вектор характеристик кода
 * (из CodeFeatureExtractor) и возвращает список рекомендуемых оптимизаций
 * с приоритетами.
 * 
 * АЛГОРИТМ РАБОТЫ:
 * 
 * 1. Применяем эвристические правила для очевидных случаев
 * 2. Если есть обученная модель, используем её для остальных решений
 * 3. Ранжируем оптимизации по ожидаемой эффективности
 * 4. Учитываем взаимодействия и побочные эффекты
 * 5. Возвращаем топ-N оптимизаций
 * 
 * @param {Array} features - Вектор характеристик кода (33 элемента)
 * @param {Object} options - Дополнительные параметры (maxOptimizations, mode)
 * @returns {Array} - Список рекомендованных оптимизаций с оценками
 */
OptimizationSelector.prototype.selectOptimizations = function(features, options) {
    options = options || {};
    var maxOptimizations = options.maxOptimizations || 3;
    var mode = options.mode || 'balanced'; // 'aggressive', 'balanced', 'conservative'
    
    // Массив для хранения оценок каждой оптимизации
    var optimizationScores = [];
    
    // Извлекаем ключевые характеристики для упрощения логики
    var stats = this.extractKeyStats(features);
    
    // ========================================================================
    // ЭВРИСТИЧЕСКИЕ ПРАВИЛА - Быстрые решения для очевидных случаев
    // ========================================================================
    
    // Правило 1: INLINING для маленьких функций с частыми вызовами
    if (stats.totalNodes < 50 && stats.calls > 5) {
        optimizationScores.push({
            name: 'inlining',
            score: 0.9,
            confidence: 'high',
            reason: 'Маленькая функция с частыми вызовами - отличный кандидат для инлайнинга'
        });
    }
    
    // Правило 2: LOOP_UNROLLING для простых циклов с малым числом итераций
    if (stats.loops > 0 && stats.loops <= 3 && stats.loopComplexity < 2) {
        optimizationScores.push({
            name: 'loop_unrolling',
            score: 0.8,
            confidence: 'high',
            reason: 'Простые циклы с малым числом итераций эффективно разворачиваются'
        });
    }
    
    // Правило 3: CONSTANT_FOLDING всегда полезна и дешёва
    if (stats.literals > 3 && stats.arithmeticOps > 5) {
        optimizationScores.push({
            name: 'constant_folding',
            score: 0.6,
            confidence: 'medium',
            reason: 'Много литералов и арифметических операций - можно свернуть константы'
        });
    }
    
    // Правило 4: DEAD_CODE_ELIMINATION если есть недостижимый код
    // (Упрощённая эвристика: много веток, которые могут не выполняться)
    if (stats.ifs > 5 || (stats.returns > 2 && stats.totalNodes > 50)) {
        optimizationScores.push({
            name: 'dead_code_elimination',
            score: 0.5,
            confidence: 'medium',
            reason: 'Сложная логика ветвления может содержать мёртвый код'
        });
    }
    
    // Правило 5: VECTORIZATION для кода с массивами и арифметикой
    if (stats.loops > 0 && stats.arithmeticOps > 15 && stats.arithmeticRatio > 0.5) {
        optimizationScores.push({
            name: 'vectorization',
            score: 0.85,
            confidence: 'high',
            reason: 'Много арифметики в циклах - идеально для векторизации SIMD'
        });
    }
    
    // Правило 6: COMMON_SUBEXPRESSION для кода с повторяющимися вычислениями
    if (stats.binaryOps > 10 && stats.totalNodes > 40) {
        optimizationScores.push({
            name: 'common_subexpression',
            score: 0.7,
            confidence: 'medium',
            reason: 'Много операций - вероятно есть общие подвыражения'
        });
    }
    
    // Правило 7: STRENGTH_REDUCTION для дорогих операций
    if (stats.multiplications > 5 || stats.divisions > 2) {
        optimizationScores.push({
            name: 'strength_reduction',
            score: 0.65,
            confidence: 'medium',
            reason: 'Дорогие операции умножения/деления можно упростить'
        });
    }
    
    // ========================================================================
    // МАШИННОЕ ОБУЧЕНИЕ - Для сложных случаев
    // ========================================================================
    
    // Если есть обученная модель, используем её для дополнительных оценок
    if (this.effectivenessPredictor) {
        var predictions = this.predictOptimizationEffectiveness(features);
        
        // Объединяем ML предсказания с эвристическими оценками
        for (var i = 0; i < predictions.length; i++) {
            var pred = predictions[i];
            
            // Ищем, есть ли уже эта оптимизация в списке
            var found = false;
            for (var j = 0; j < optimizationScores.length; j++) {
                if (optimizationScores[j].name === pred.name) {
                    // Комбинируем эвристическую оценку и ML предсказание
                    optimizationScores[j].score = (optimizationScores[j].score + pred.score) / 2;
                    optimizationScores[j].confidence = 'very_high';
                    optimizationScores[j].reason += ' (подтверждено ML моделью)';
                    found = true;
                    break;
                }
            }
            
            // Если оптимизация не была найдена эвристиками, добавляем её
            if (!found && pred.score > 0.3) {
                optimizationScores.push({
                    name: pred.name,
                    score: pred.score,
                    confidence: 'ml_based',
                    reason: 'Рекомендовано ML моделью на основе схожих паттернов'
                });
            }
        }
    }
    
    // ========================================================================
    // КОРРЕКТИРОВКА НА ОСНОВЕ РЕЖИМА
    // ========================================================================
    
    if (mode === 'aggressive') {
        // В агрессивном режиме повышаем оценки всех оптимизаций
        for (var i = 0; i < optimizationScores.length; i++) {
            optimizationScores[i].score *= 1.2;
        }
    } else if (mode === 'conservative') {
        // В консервативном режиме применяем только самые уверенные оптимизации
        optimizationScores = optimizationScores.filter(function(opt) {
            return opt.confidence === 'high' || opt.confidence === 'very_high';
        });
    }
    
    // ========================================================================
    // УЧЁТ ВЗАИМОДЕЙСТВИЙ И ПОБОЧНЫХ ЭФФЕКТОВ
    // ========================================================================
    
    // Некоторые оптимизации плохо сочетаются друг с другом
    // Например, инлайнинг + разворачивание циклов могут слишком раздуть код
    
    var hasInlining = false;
    var hasUnrolling = false;
    
    for (var i = 0; i < optimizationScores.length; i++) {
        if (optimizationScores[i].name === 'inlining') hasInlining = true;
        if (optimizationScores[i].name === 'loop_unrolling') hasUnrolling = true;
    }
    
    // Если обе оптимизации присутствуют, снижаем оценку той, что слабее
    if (hasInlining && hasUnrolling) {
        for (var i = 0; i < optimizationScores.length; i++) {
            if (optimizationScores[i].name === 'loop_unrolling') {
                optimizationScores[i].score *= 0.7;
                optimizationScores[i].reason += ' (снижено из-за конфликта с инлайнингом)';
            }
        }
    }
    
    // ========================================================================
    // РАНЖИРОВАНИЕ И ВЫБОР ФИНАЛЬНЫХ ОПТИМИЗАЦИЙ
    // ========================================================================
    
    // Сортируем по оценке
    optimizationScores.sort(function(a, b) {
        return b.score - a.score;
    });
    
    // Берём топ-N оптимизаций
    var selected = optimizationScores.slice(0, maxOptimizations);
    
    // Обновляем статистику
    this.statistics.totalDecisions++;
    for (var i = 0; i < selected.length; i++) {
        this.statistics.optimizationsApplied[selected[i].name]++;
    }
    
    // Добавляем полную информацию об оптимизациях
    for (var i = 0; i < selected.length; i++) {
        var optName = selected[i].name;
        selected[i].details = this.availableOptimizations[optName];
    }
    
    return selected;
};

/**
 * Извлекает ключевые статистики из вектора характеристик.
 * 
 * Вектор характеристик - это массив из 33 чисел. Эта функция превращает
 * его в удобный объект с именованными полями для упрощения логики.
 * 
 * @param {Array} features - Вектор характеристик
 * @returns {Object} - Объект с ключевыми статистиками
 */
OptimizationSelector.prototype.extractKeyStats = function(features) {
    // Структура вектора (из CodeFeatureExtractor):
    // [0-3]: структурные (total, maxDepth, avgDepth, branchingFactor)
    // [4-13]: счётчики узлов
    // [14-22]: операции
    // [23-25]: переменные
    // [26-29]: циклы
    // [30]: сложность
    // [31-32]: граф вызовов
    
    return {
        totalNodes: features[0],
        maxDepth: features[1],
        avgDepth: features[2],
        branchingFactor: features[3],
        
        literals: features[4],
        identifiers: features[5],
        binaryOps: features[6],
        unaryOps: features[7],
        calls: features[8],
        assignments: features[9],
        returns: features[10],
        ifs: features[11],
        loops: features[12],
        functions: features[13],
        
        arithmeticOps: features[14],
        comparisonOps: features[15],
        logicalOps: features[16],
        bitwiseOps: features[17],
        operationDensity: features[18],
        arithmeticRatio: features[19],
        comparisonRatio: features[20],
        logicalRatio: features[21],
        bitwiseRatio: features[22],
        
        variablesDeclared: features[23],
        variablesUsed: features[24],
        variableReuseRate: features[25],
        
        totalLoops: features[26],
        nestedLoops: features[27],
        maxLoopNesting: features[28],
        loopComplexity: features[29],
        
        cyclomaticComplexity: features[30],
        
        functionsCount: features[31],
        callsCount: features[32],
        
        // Вычисленные вспомогательные поля
        multiplications: features[14] * features[19], // Примерная оценка
        divisions: features[14] * 0.1 // Примерная оценка
    };
};

/**
 * Предсказывает эффективность каждой оптимизации с помощью ML модели.
 * 
 * Эта функция работает только если модель обучена. Она проходит через все
 * доступные оптимизации и предсказывает ожидаемое улучшение для каждой.
 * 
 * @param {Array} features - Вектор характеристик кода
 * @returns {Array} - Массив объектов {name, score} для каждой оптимизации
 */
OptimizationSelector.prototype.predictOptimizationEffectiveness = function(features) {
    if (!this.effectivenessPredictor) {
        return [];
    }
    
    var predictions = [];
    var optimizations = Object.keys(this.availableOptimizations);
    
    // Для каждой оптимизации предсказываем эффективность
    for (var i = 0; i < optimizations.length; i++) {
        var optName = optimizations[i];
        
        // Кодируем оптимизацию как one-hot вектор и добавляем к характеристикам
        var input = features.slice(); // Копируем массив
        
        // Добавляем one-hot encoding для типа оптимизации (7 оптимизаций)
        for (var j = 0; j < optimizations.length; j++) {
            input.push(j === i ? 1 : 0);
        }
        
        // Получаем предсказание от модели
        var effectiveness = this.effectivenessPredictor.predict(input);
        
        predictions.push({
            name: optName,
            score: Math.max(0, Math.min(1, effectiveness)) // Нормализуем в [0, 1]
        });
    }
    
    return predictions;
};

/**
 * Обучает ML модель предсказывать эффективность оптимизаций.
 * 
 * Эта функция создаёт и обучает нейросеть, которая предсказывает, насколько
 * эффективной будет данная оптимизация для данного кода.
 * 
 * @param {Array} trainingData - Массив объектов с полями:
 *                                - features: вектор характеристик кода
 *                                - optimization: название оптимизации
 *                                - improvement: измеренное улучшение производительности
 * @param {number} epochs - Количество эпох обучения
 */
OptimizationSelector.prototype.trainEffectivenessPredictor = function(trainingData, epochs) {
    // Создаём нейросеть: 33 характеристики + 7 one-hot для оптимизации → 1 выход
    var inputSize = 33 + 7; // 33 характеристики + 7 типов оптимизаций (one-hot)
    
    // Архитектура: умеренно глубокая сеть для поиска сложных паттернов
    this.effectivenessPredictor = new NeuralNetwork([inputSize, 48, 24, 1]);
    
    // Подготавливаем данные для обучения
    var preparedData = [];
    var optimizations = Object.keys(this.availableOptimizations);
    
    for (var i = 0; i < trainingData.length; i++) {
        var sample = trainingData[i];
        var features = sample.features.slice();
        
        // Добавляем one-hot encoding для оптимизации
        var optIndex = optimizations.indexOf(sample.optimization);
        for (var j = 0; j < optimizations.length; j++) {
            features.push(j === optIndex ? 1 : 0);
        }
        
        preparedData.push({
            input: features,
            target: sample.improvement
        });
    }
    
    console.log('Training optimization effectiveness predictor...');
    console.log('Training samples:', preparedData.length);
    console.log('Input size:', inputSize);
    
    // Обучаем модель
    var result = this.effectivenessPredictor.train(preparedData, epochs, function(epoch, total, loss) {
        if (epoch % Math.max(1, Math.floor(total / 10)) === 0) {
            console.log('Epoch ' + epoch + '/' + total + ', Loss: ' + loss.toFixed(6));
        }
    });
    
    console.log('Training complete! Final loss:', result.finalLoss.toFixed(6));
    
    return result;
};

/**
 * Возвращает статистику использования оптимизаций.
 * 
 * Полезно для анализа: какие оптимизации применяются чаще всего,
 * какие дают наибольшее улучшение в среднем, и так далее.
 * 
 * @returns {Object} - Статистика
 */
OptimizationSelector.prototype.getStatistics = function() {
    return this.statistics;
};

/**
 * Объясняет, почему была выбрана данная комбинация оптимизаций.
 * 
 * Это важно для прозрачности системы. Пользователь должен понимать,
 * ПОЧЕМУ компилятор принял те или иные решения.
 * 
 * @param {Array} selectedOptimizations - Выбранные оптимизации (из selectOptimizations)
 * @param {Array} features - Характеристики кода
 * @returns {string} - Человекочитаемое объяснение
 */
OptimizationSelector.prototype.explainDecision = function(selectedOptimizations, features) {
    var stats = this.extractKeyStats(features);
    var explanation = 'АНАЛИЗ РЕШЕНИЯ ПО ОПТИМИЗАЦИИ\n\n';
    
    explanation += 'Характеристики кода:\n';
    explanation += '  • Размер: ' + stats.totalNodes + ' узлов AST\n';
    explanation += '  • Глубина: ' + stats.maxDepth + ' уровней\n';
    explanation += '  • Циклы: ' + stats.loops + ' (вложенность: ' + stats.maxLoopNesting + ')\n';
    explanation += '  • Условия: ' + stats.ifs + '\n';
    explanation += '  • Вызовы функций: ' + stats.calls + '\n';
    explanation += '  • Цикломатическая сложность: ' + stats.cyclomaticComplexity + '\n\n';
    
    explanation += 'Выбранные оптимизации:\n\n';
    
    for (var i = 0; i < selectedOptimizations.length; i++) {
        var opt = selectedOptimizations[i];
        explanation += (i + 1) + '. ' + opt.details.name + ' (оценка: ' + opt.score.toFixed(2) + ')\n';
        explanation += '   Причина: ' + opt.reason + '\n';
        explanation += '   Уверенность: ' + opt.confidence + '\n';
        explanation += '   Описание: ' + opt.details.description + '\n\n';
    }
    
    return explanation;
};

// Экспорт для использования в браузере
if (typeof window !== 'undefined') {
    window.CompilerStage7 = window.CompilerStage7 || {};
    window.CompilerStage7.OptimizationSelector = OptimizationSelector;
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OptimizationSelector: OptimizationSelector };
}
