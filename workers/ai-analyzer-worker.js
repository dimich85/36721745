/**
 * ============================================================================
 * AI ANALYZER WORKER - Stage 8 Enhanced
 * ============================================================================
 *
 * Этот Web Worker отвечает за AI-анализ профилей функций и принятие решений
 * об оптимизации. Он имеет ПОЛНУЮ видимость всей кодовой базы и может
 * делать глобальные решения.
 *
 * КЛЮЧЕВАЯ ОСОБЕННОСТЬ:
 * - Видит ВСЮ кодовую базу сразу (благодаря Progressive Loading)
 * - Может делать whole-program analysis
 * - Находит межпроцедурные оптимизации
 * - Обучается на паттернах использования
 */

// Состояние AI системы
const aiState = {
    profiles: null,         // Профили всех функций
    callGraph: null,        // Граф вызовов
    optimizations: new Map(), // История оптимизаций
    knowledgeBase: {
        patterns: [],        // Найденные паттерны
        rules: []           // Правила оптимизации
    }
};

/**
 * Класс для AI-анализа и принятия решений об оптимизации
 */
class AIOptimizationAnalyzer {
    constructor() {
        this.optimizationStrategies = this.initializeStrategies();
    }

    /**
     * Инициализирует стратегии оптимизации
     */
    initializeStrategies() {
        return {
            // Встраивание функций
            inlining: {
                name: 'Function Inlining',
                applicableWhen: (profile) => {
                    return (
                        profile.codeStats.lines < 10 &&           // Маленькая функция
                        profile.calledBy.length > 0 &&            // Вызывается откуда-то
                        !profile.metadata.hasRecursion &&         // Не рекурсивная
                        profile.callCount > 50                    // Вызывается часто
                    );
                },
                expectedBenefit: (profile) => {
                    // Выгода от устранения overhead вызова
                    const callOverhead = 0.01; // ~0.01ms на вызов
                    return profile.callCount * callOverhead;
                },
                cost: 2,  // Средняя сложность
                codeSizeImpact: 1.5  // Увеличит код
            },

            // Разворачивание циклов
            loopUnrolling: {
                name: 'Loop Unrolling',
                applicableWhen: (profile) => {
                    return (
                        profile.codeStats.hasLoop &&              // Есть циклы
                        !profile.codeStats.hasLoop === 'nested' && // Не вложенные
                        profile.metadata.isHot &&                 // Горячая функция
                        profile.codeStats.cyclomaticComplexity < 5 // Простая логика
                    );
                },
                expectedBenefit: (profile) => {
                    // До 30% ускорения для простых циклов
                    return profile.avgTime * 0.3;
                },
                cost: 4,  // Высокая сложность
                codeSizeImpact: 3  // Значительно увеличит код
            },

            // Свертка констант
            constantFolding: {
                name: 'Constant Folding',
                applicableWhen: (profile) => {
                    return profile.codeStats.arithmeticOps > 5;
                },
                expectedBenefit: (profile) => {
                    // Небольшое ускорение, но всегда полезно
                    return profile.avgTime * 0.05;
                },
                cost: 1,  // Низкая сложность
                codeSizeImpact: 0.9  // Уменьшит код
            },

            // Векторизация (SIMD)
            vectorization: {
                name: 'SIMD Vectorization',
                applicableWhen: (profile) => {
                    return (
                        profile.codeStats.hasLoop &&
                        profile.codeStats.arrayOps > 10 &&        // Работа с массивами
                        profile.metadata.isHot
                    );
                },
                expectedBenefit: (profile) => {
                    // 4-8x ускорение для векторизуемых операций
                    return profile.avgTime * 0.75;
                },
                cost: 5,  // Очень высокая сложность
                codeSizeImpact: 1.2
            },

            // Оптимизация хвостовой рекурсии
            tailCallOptimization: {
                name: 'Tail Call Optimization',
                applicableWhen: (profile) => {
                    return profile.metadata.hasRecursion;
                },
                expectedBenefit: (profile) => {
                    // Устраняет накладные расходы на стек
                    return profile.avgTime * 0.4;
                },
                cost: 3,
                codeSizeImpact: 1.0
            },

            // Удаление общих подвыражений
            commonSubexpressionElimination: {
                name: 'Common Subexpression Elimination',
                applicableWhen: (profile) => {
                    return profile.codeStats.arithmeticOps > 10;
                },
                expectedBenefit: (profile) => {
                    return profile.avgTime * 0.15;
                },
                cost: 2,
                codeSizeImpact: 0.95
            },

            // Strength reduction
            strengthReduction: {
                name: 'Strength Reduction',
                applicableWhen: (profile) => {
                    return (
                        profile.codeStats.hasLoop &&
                        profile.codeStats.arithmeticOps > 5
                    );
                },
                expectedBenefit: (profile) => {
                    // Замена дорогих операций на дешевые
                    return profile.avgTime * 0.2;
                },
                cost: 2,
                codeSizeImpact: 1.0
            }
        };
    }

    /**
     * Анализирует ВСЕ функции и выбирает оптимизации
     *
     * Это главный метод - здесь AI имеет ПОЛНУЮ видимость
     */
    analyzeFull(profiles, callGraph) {
        console.log('[AI Analyzer] Starting full analysis of', profiles.length, 'functions');

        const startTime = performance.now();

        // Сохраняем для межпроцедурного анализа
        aiState.profiles = profiles;
        aiState.callGraph = callGraph;

        const results = {
            functionOptimizations: [],    // Оптимизации для каждой функции
            globalOptimizations: [],      // Глобальные оптимизации
            hotPaths: [],                 // Найденные горячие пути
            interProceduralOpts: [],      // Межпроцедурные оптимизации
            statistics: {}
        };

        // 1. Анализируем каждую функцию отдельно
        for (const profile of profiles) {
            const functionOpts = this.analyzeSingleFunction(profile);
            if (functionOpts.optimizations.length > 0) {
                results.functionOptimizations.push(functionOpts);
            }
        }

        // 2. Whole-program analysis - находим глобальные паттерны
        results.globalOptimizations = this.findGlobalOptimizations(profiles, callGraph);

        // 3. Находим горячие пути для специальной оптимизации
        results.hotPaths = this.identifyHotPaths(profiles, callGraph);

        // 4. Межпроцедурная оптимизация
        results.interProceduralOpts = this.performInterProceduralAnalysis(profiles, callGraph);

        // 5. Собираем статистику
        results.statistics = this.calculateStatistics(results);

        const endTime = performance.now();
        results.analysisTime = endTime - startTime;

        console.log('[AI Analyzer] Analysis complete in', results.analysisTime.toFixed(2), 'ms');
        console.log('[AI Analyzer] Found', results.functionOptimizations.length, 'function optimizations');
        console.log('[AI Analyzer] Found', results.globalOptimizations.length, 'global optimizations');

        return results;
    }

    /**
     * Анализирует одну функцию и выбирает подходящие оптимизации
     */
    analyzeSingleFunction(profile) {
        const result = {
            function: profile.name,
            optimizations: [],
            estimatedSpeedup: 1.0,
            priority: 0
        };

        // Проверяем каждую стратегию оптимизации
        for (const [key, strategy] of Object.entries(this.optimizationStrategies)) {
            if (strategy.applicableWhen(profile)) {
                const benefit = strategy.expectedBenefit(profile);
                const quality = benefit / strategy.cost;

                result.optimizations.push({
                    type: key,
                    name: strategy.name,
                    expectedBenefit: benefit,
                    cost: strategy.cost,
                    codeSizeImpact: strategy.codeSizeImpact,
                    qualityScore: quality,
                    reason: this.explainWhy(key, profile)
                });
            }
        }

        // Сортируем по quality score
        result.optimizations.sort((a, b) => b.qualityScore - a.qualityScore);

        // Вычисляем общее ожидаемое ускорение
        if (result.optimizations.length > 0) {
            const totalBenefit = result.optimizations
                .reduce((sum, opt) => sum + opt.expectedBenefit, 0);
            result.estimatedSpeedup = 1 + (totalBenefit / Math.max(profile.avgTime, 0.1));

            // Приоритет = важность функции * потенциал ускорения
            result.priority = profile.hotness * result.estimatedSpeedup;
        }

        return result;
    }

    /**
     * Объясняет, почему выбрана конкретная оптимизация
     */
    explainWhy(optimizationType, profile) {
        const reasons = {
            inlining: `Function is small (${profile.codeStats.lines} lines) and called ${profile.callCount} times`,
            loopUnrolling: `Contains loops and is hot (${profile.callCount} calls)`,
            constantFolding: `Has ${profile.codeStats.arithmeticOps} arithmetic operations`,
            vectorization: `Loop with ${profile.codeStats.arrayOps} array operations - SIMD applicable`,
            tailCallOptimization: `Uses recursion - can eliminate stack overhead`,
            commonSubexpressionElimination: `Repeated expressions detected`,
            strengthReduction: `Can replace expensive operations with cheaper ones`
        };

        return reasons[optimizationType] || 'Applicable based on code analysis';
    }

    /**
     * WHOLE-PROGRAM ANALYSIS
     *
     * Это критично! AI видит ВСЮ кодовую базу и может находить
     * паттерны, которые невозможно увидеть локально.
     */
    findGlobalOptimizations(profiles, callGraph) {
        console.log('[AI Analyzer] Performing whole-program analysis...');

        const globalOpts = [];

        // 1. Находим функции, которые всегда вызываются вместе
        const sequences = this.findCallSequences(profiles, callGraph);
        for (const seq of sequences) {
            globalOpts.push({
                type: 'chain_inlining',
                name: 'Inline Call Chain',
                functions: seq.chain,
                reason: `These ${seq.chain.length} functions are always called together`,
                expectedBenefit: seq.totalTime * 0.4,
                priority: seq.frequency * seq.totalTime
            });
        }

        // 2. Escape analysis - объекты, которые не покидают WASM
        const escapeAnalysis = this.performEscapeAnalysis(profiles, callGraph);
        for (const result of escapeAnalysis) {
            globalOpts.push({
                type: 'stack_allocation',
                name: 'Stack Allocation',
                function: result.function,
                variable: result.variable,
                reason: 'Object never escapes - can allocate on stack',
                expectedBenefit: result.allocationCost * 0.8
            });
        }

        // 3. Находим возможности для pre-computation
        const precomputeOpts = this.findPrecomputationOpportunities(profiles);
        globalOpts.push(...precomputeOpts);

        return globalOpts;
    }

    /**
     * Находит последовательности вызовов функций
     */
    findCallSequences(profiles, callGraph) {
        const sequences = [];

        // Простая эвристика: ищем цепочки A→B→C
        for (const profile of profiles) {
            if (profile.metadata.isHot && profile.calls.length > 0) {
                const chain = [profile.name];
                const totalTime = profile.avgTime;
                const frequency = profile.callCount;

                // Исследуем вызовы
                for (const callee of profile.calls) {
                    const calleeProfile = profiles.find(p => p.name === callee);
                    if (calleeProfile && calleeProfile.calledBy.length === 1) {
                        // Вызывается только из одного места - кандидат на inline
                        chain.push(callee);
                    }
                }

                if (chain.length > 1) {
                    sequences.push({ chain, totalTime, frequency });
                }
            }
        }

        return sequences.sort((a, b) => (b.frequency * b.totalTime) - (a.frequency * a.totalTime));
    }

    /**
     * Escape analysis - определяет, какие объекты не покидают функцию
     */
    performEscapeAnalysis(profiles, callGraph) {
        console.log('[AI Analyzer] Performing escape analysis...');

        const results = [];

        // Упрощенный escape analysis для демонстрации
        for (const profile of profiles) {
            // Ищем создание объектов
            if (profile.code && profile.code.includes('return {')) {
                // Проверяем, используется ли возвращаемый объект только локально
                if (profile.calledBy.length === 1) {
                    results.push({
                        function: profile.name,
                        variable: 'returnValue',
                        allocationCost: 0.1  // Примерная стоимость аллокации
                    });
                }
            }
        }

        return results;
    }

    /**
     * Находит возможности для предвычисления
     */
    findPrecomputationOpportunities(profiles) {
        const opportunities = [];

        for (const profile of profiles) {
            // Если функция вызывается с одинаковыми аргументами часто
            if (profile.argTypes && profile.argTypes.length > 0) {
                const mostCommon = profile.argTypes.reduce((max, curr) =>
                    curr[1] > max[1] ? curr : max
                );

                if (mostCommon[1] / profile.callCount > 0.7) {  // 70%+ одинаковые аргументы
                    opportunities.push({
                        type: 'memoization',
                        name: 'Memoization',
                        function: profile.name,
                        pattern: mostCommon[0],
                        frequency: mostCommon[1],
                        reason: `Called with same args ${((mostCommon[1] / profile.callCount) * 100).toFixed(0)}% of the time`,
                        expectedBenefit: profile.avgTime * mostCommon[1] * 0.95  // Почти полное устранение вычислений
                    });
                }
            }
        }

        return opportunities;
    }

    /**
     * Находит горячие пути для создания fast paths
     */
    identifyHotPaths(profiles, callGraph) {
        console.log('[AI Analyzer] Identifying hot paths...');

        const hotPaths = [];

        // Находим самые частые последовательности вызовов
        for (const profile of profiles) {
            if (profile.metadata.isHot) {
                const path = this.tracePath(profile.name, callGraph, 5);
                if (path.length > 1) {
                    hotPaths.push({
                        start: profile.name,
                        path: path,
                        frequency: profile.callCount,
                        totalTime: this.calculatePathTime(path, profiles),
                        optimization: 'Create specialized fast path'
                    });
                }
            }
        }

        return hotPaths.sort((a, b) => (b.frequency * b.totalTime) - (a.frequency * a.totalTime))
            .slice(0, 5);  // Top 5 горячих путей
    }

    /**
     * Трассирует путь вызовов
     */
    tracePath(funcName, callGraph, maxDepth, visited = new Set()) {
        if (maxDepth <= 0 || visited.has(funcName)) {
            return [funcName];
        }

        visited.add(funcName);
        const path = [funcName];

        const callees = callGraph[funcName];
        if (callees && callees.length > 0) {
            // Берем первый вызов (в реальности нужен более умный выбор)
            const nextFunc = callees[0];
            const subPath = this.tracePath(nextFunc, callGraph, maxDepth - 1, visited);
            path.push(...subPath.slice(1));  // Убираем дубликат первого элемента
        }

        return path;
    }

    /**
     * Вычисляет общее время пути
     */
    calculatePathTime(path, profiles) {
        return path.reduce((total, funcName) => {
            const profile = profiles.find(p => p.name === funcName);
            return total + (profile ? profile.avgTime : 0);
        }, 0);
    }

    /**
     * Межпроцедурный анализ
     */
    performInterProceduralAnalysis(profiles, callGraph) {
        console.log('[AI Analyzer] Performing inter-procedural analysis...');

        const results = [];

        // Находим возможности для объединения аллокаций
        for (const profile of profiles) {
            if (profile.calls.length > 0) {
                const allocations = this.findAllocations(profile, profiles);
                if (allocations.length > 1) {
                    results.push({
                        type: 'allocation_fusion',
                        function: profile.name,
                        allocations: allocations,
                        reason: 'Multiple allocations can be combined',
                        expectedBenefit: allocations.length * 0.05  // 0.05ms на аллокацию
                    });
                }
            }
        }

        return results;
    }

    /**
     * Находит аллокации в функции и её вызовах
     */
    findAllocations(profile, allProfiles) {
        const allocations = [];

        // Простая эвристика: ищем создание объектов/массивов
        if (profile.code) {
            if (profile.code.includes('new ') || profile.code.includes('[')) {
                allocations.push({ in: profile.name, type: 'local' });
            }

            // Проверяем вызываемые функции
            for (const callee of profile.calls) {
                const calleeProfile = allProfiles.find(p => p.name === callee);
                if (calleeProfile && calleeProfile.code) {
                    if (calleeProfile.code.includes('new ') || calleeProfile.code.includes('[')) {
                        allocations.push({ in: callee, type: 'callee' });
                    }
                }
            }
        }

        return allocations;
    }

    /**
     * Вычисляет финальную статистику
     */
    calculateStatistics(results) {
        return {
            totalFunctions: aiState.profiles ? aiState.profiles.length : 0,
            functionsToOptimize: results.functionOptimizations.length,
            globalOptimizations: results.globalOptimizations.length,
            hotPaths: results.hotPaths.length,
            estimatedTotalSpeedup: this.calculateTotalSpeedup(results),
            optimizationCoverage: results.functionOptimizations.length / (aiState.profiles?.length || 1)
        };
    }

    /**
     * Вычисляет общее ожидаемое ускорение
     */
    calculateTotalSpeedup(results) {
        // Упрощенная модель: суммируем выгоды от всех оптимизаций
        let totalBenefit = 0;
        let totalTime = 0;

        if (aiState.profiles) {
            totalTime = aiState.profiles.reduce((sum, p) => sum + (p.avgTime * p.callCount), 0);

            // Выгоды от оптимизаций функций
            for (const funcOpt of results.functionOptimizations) {
                const profile = aiState.profiles.find(p => p.name === funcOpt.function);
                if (profile) {
                    const funcTotalTime = profile.avgTime * profile.callCount;
                    const funcBenefit = funcTotalTime * (funcOpt.estimatedSpeedup - 1);
                    totalBenefit += funcBenefit;
                }
            }

            // Выгоды от глобальных оптимизаций
            for (const globalOpt of results.globalOptimizations) {
                totalBenefit += globalOpt.expectedBenefit || 0;
            }
        }

        const speedup = totalTime > 0 ? 1 + (totalBenefit / totalTime) : 1;
        return Math.min(speedup, 10);  // Cap at 10x для реалистичности
    }
}

// Создаем экземпляр анализатора
const analyzer = new AIOptimizationAnalyzer();

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

self.onmessage = function(e) {
    const { command, data, id } = e.data;

    console.log(`[AI Analyzer Worker] Received command: ${command}`);

    try {
        let result;

        switch (command) {
            case 'analyze':
                result = analyzer.analyzeFull(data.profiles, data.callGraph);
                break;

            case 'analyzeFunction':
                result = analyzer.analyzeSingleFunction(data.profile);
                break;

            case 'getStrategies':
                result = Object.keys(analyzer.optimizationStrategies);
                break;

            default:
                throw new Error(`Unknown command: ${command}`);
        }

        // Отправляем результат
        self.postMessage({
            id: id,
            command: command,
            success: true,
            result: result
        });

    } catch (error) {
        console.error('[AI Analyzer Worker] Error:', error);

        self.postMessage({
            id: id,
            command: command,
            success: false,
            error: {
                message: error.message,
                stack: error.stack
            }
        });
    }
};

// Готовность
console.log('[AI Analyzer Worker] Initialized and ready');
self.postMessage({ type: 'ready' });
