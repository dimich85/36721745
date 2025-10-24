/**
 * ============================================================================
 * PROFILER WORKER - Stage 8 Enhanced
 * ============================================================================
 *
 * Этот Web Worker отвечает за профилирование JavaScript кода в фоновом режиме.
 * Он анализирует функции, собирает метрики и строит граф вызовов.
 *
 * ЗАЧЕМ ЭТО В ОТДЕЛЬНОМ WORKER:
 * - Не блокирует главный поток (UI остается отзывчивым)
 * - Может обрабатывать большие объемы кода параллельно
 * - Изолирован от основного приложения (безопасность)
 */

// Состояние профилировщика
const profilerState = {
    functions: new Map(),      // Карта профилей функций
    callGraph: new Map(),      // Граф вызовов
    globalStats: {
        totalFunctions: 0,
        totalCalls: 0,
        totalTime: 0
    }
};

/**
 * Класс для хранения профиля функции
 */
class FunctionProfile {
    constructor(name, code) {
        this.name = name;
        this.code = code;
        this.callCount = 0;
        this.totalTime = 0;
        this.avgTime = 0;
        this.minTime = Infinity;
        this.maxTime = 0;

        // Анализ кода
        this.codeStats = this.analyzeCode(code);

        // Граф вызовов
        this.calls = new Set();      // Какие функции эта вызывает
        this.calledBy = new Set();   // Какими функциями вызывается

        // Паттерны аргументов
        this.argTypes = new Map();   // Типы аргументов и их частота

        // Метаданные для AI
        this.metadata = {
            isHot: false,           // Часто вызываемая функция
            isLeaf: false,          // Не вызывает другие функции
            hasLoop: false,
            hasRecursion: false,
            complexity: 0
        };
    }

    /**
     * Анализирует код функции и извлекает статистику
     */
    analyzeCode(code) {
        const stats = {
            length: code.length,
            lines: code.split('\n').length,

            // Синтаксические элементы
            hasLoop: /\b(for|while|do)\b/.test(code),
            hasConditional: /\bif\b/.test(code),
            hasSwitch: /\bswitch\b/.test(code),
            hasTryCatch: /\btry\b/.test(code),
            hasAsync: /\basync\b/.test(code) || /\bawait\b/.test(code),

            // Операции
            arithmeticOps: (code.match(/[+\-*/%]/g) || []).length,
            comparisonOps: (code.match(/[<>=!]+/g) || []).length,
            logicalOps: (code.match(/&&|\|\|/g) || []).length,

            // Вызовы
            functionCalls: (code.match(/\w+\s*\(/g) || []).length,

            // Структуры данных
            arrayOps: (code.match(/\[|\]|\.push|\.pop|\.shift|\.unshift/g) || []).length,
            objectOps: (code.match(/\{|\}|\./g) || []).length,

            // Возвраты
            returnStatements: (code.match(/\breturn\b/g) || []).length
        };

        // Вычисляем цикломатическую сложность (упрощенно)
        stats.cyclomaticComplexity = 1 +
            (code.match(/\bif\b/g) || []).length +
            (code.match(/\bfor\b/g) || []).length +
            (code.match(/\bwhile\b/g) || []).length +
            (code.match(/\bcase\b/g) || []).length +
            (code.match(/&&|\|\|/g) || []).length;

        return stats;
    }

    /**
     * Обновляет статистику после выполнения
     */
    updateStats(executionTime, args) {
        this.callCount++;
        this.totalTime += executionTime;
        this.avgTime = this.totalTime / this.callCount;
        this.minTime = Math.min(this.minTime, executionTime);
        this.maxTime = Math.max(this.maxTime, executionTime);

        // Обновляем паттерны аргументов
        if (args && args.length > 0) {
            const argSignature = args.map(arg => typeof arg).join(',');
            const count = this.argTypes.get(argSignature) || 0;
            this.argTypes.set(argSignature, count + 1);
        }

        // Обновляем метаданные
        this.metadata.isHot = this.callCount > 100;
        this.metadata.hasLoop = this.codeStats.hasLoop;
        this.metadata.complexity = this.codeStats.cyclomaticComplexity;
    }

    /**
     * Возвращает сериализуемое представление
     */
    serialize() {
        return {
            name: this.name,
            callCount: this.callCount,
            avgTime: this.avgTime,
            minTime: this.minTime,
            maxTime: this.maxTime,
            codeStats: this.codeStats,
            calls: Array.from(this.calls),
            calledBy: Array.from(this.calledBy),
            argTypes: Array.from(this.argTypes.entries()),
            metadata: this.metadata,

            // Важные метрики для AI
            hotness: this.callCount * this.avgTime,  // Общее время в функции
            optimizationPotential: this.calculateOptimizationPotential()
        };
    }

    /**
     * Вычисляет потенциал для оптимизации
     */
    calculateOptimizationPotential() {
        let potential = 0;

        // Чем чаще вызывается, тем больше потенциал
        potential += Math.min(this.callCount / 1000, 1) * 30;

        // Чем дольше выполняется, тем больше потенциал
        potential += Math.min(this.avgTime / 10, 1) * 30;

        // Циклы дают больший потенциал
        if (this.codeStats.hasLoop) potential += 20;

        // Рекурсия дает большой потенциал
        if (this.metadata.hasRecursion) potential += 15;

        // Высокая сложность = больше возможностей
        potential += Math.min(this.codeStats.cyclomaticComplexity / 10, 1) * 5;

        return Math.min(potential, 100);
    }
}

/**
 * Профилирует все функции из переданного кода
 */
function profileAllFunctions(businessLogic) {
    console.log('[Profiler Worker] Starting to profile all functions...');

    const startTime = performance.now();
    const profiles = new Map();

    // Обрабатываем каждую функцию
    for (const [name, funcCode] of Object.entries(businessLogic)) {
        if (typeof funcCode === 'string') {
            const profile = new FunctionProfile(name, funcCode);
            profiles.set(name, profile);

            // Симулируем некоторые метрики (в реальности собирались бы во время выполнения)
            profile.updateStats(Math.random() * 10, []);

            profilerState.functions.set(name, profile);
        }
    }

    // Строим граф вызовов
    buildCallGraph(profiles);

    // Обновляем глобальную статистику
    profilerState.globalStats.totalFunctions = profiles.size;
    profilerState.globalStats.totalCalls = Array.from(profiles.values())
        .reduce((sum, p) => sum + p.callCount, 0);
    profilerState.globalStats.totalTime = Array.from(profiles.values())
        .reduce((sum, p) => sum + p.totalTime, 0);

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`[Profiler Worker] Profiled ${profiles.size} functions in ${duration.toFixed(2)}ms`);

    return {
        profiles: Array.from(profiles.values()).map(p => p.serialize()),
        callGraph: serializeCallGraph(),
        globalStats: profilerState.globalStats,
        profilingTime: duration
    };
}

/**
 * Строит граф вызовов между функциями
 */
function buildCallGraph(profiles) {
    console.log('[Profiler Worker] Building call graph...');

    profilerState.callGraph.clear();

    for (const [name, profile] of profiles.entries()) {
        const code = profile.code;

        // Ищем вызовы других функций в коде
        for (const [otherName, otherProfile] of profiles.entries()) {
            if (name !== otherName) {
                // Простая проверка: есть ли вызов функции в коде
                const callPattern = new RegExp(`\\b${otherName}\\s*\\(`, 'g');
                if (callPattern.test(code)) {
                    profile.calls.add(otherName);
                    otherProfile.calledBy.add(name);

                    // Добавляем ребро в граф
                    if (!profilerState.callGraph.has(name)) {
                        profilerState.callGraph.set(name, new Set());
                    }
                    profilerState.callGraph.get(name).add(otherName);
                }
            }
        }

        // Проверяем на рекурсию
        const recursionPattern = new RegExp(`\\b${name}\\s*\\(`, 'g');
        const matches = code.match(recursionPattern) || [];
        if (matches.length > 1) {  // Больше одного = рекурсия
            profile.metadata.hasRecursion = true;
        }

        // Проверяем, является ли leaf функцией
        profile.metadata.isLeaf = profile.calls.size === 0;
    }
}

/**
 * Сериализует граф вызовов
 */
function serializeCallGraph() {
    const serialized = {};
    for (const [from, toSet] of profilerState.callGraph.entries()) {
        serialized[from] = Array.from(toSet);
    }
    return serialized;
}

/**
 * Находит горячие пути в графе вызовов
 */
function findHotPaths(maxDepth = 5) {
    console.log('[Profiler Worker] Finding hot paths...');

    const hotPaths = [];

    // Начинаем с самых "горячих" функций
    const hotFunctions = Array.from(profilerState.functions.values())
        .filter(p => p.metadata.isHot)
        .sort((a, b) => b.callCount - a.callCount)
        .slice(0, 10);

    for (const startFunc of hotFunctions) {
        const path = [startFunc.name];
        explorePath(startFunc.name, path, hotPaths, maxDepth);
    }

    return hotPaths;
}

/**
 * Рекурсивно исследует пути в графе
 */
function explorePath(currentFunc, currentPath, allPaths, maxDepth) {
    if (currentPath.length >= maxDepth) {
        allPaths.push([...currentPath]);
        return;
    }

    const callees = profilerState.callGraph.get(currentFunc);
    if (!callees || callees.size === 0) {
        allPaths.push([...currentPath]);
        return;
    }

    for (const callee of callees) {
        // Избегаем циклов
        if (!currentPath.includes(callee)) {
            currentPath.push(callee);
            explorePath(callee, currentPath, allPaths, maxDepth);
            currentPath.pop();
        }
    }
}

/**
 * Генерирует рекомендации по оптимизации
 */
function generateOptimizationRecommendations(profiles) {
    console.log('[Profiler Worker] Generating optimization recommendations...');

    const recommendations = [];

    for (const profile of profiles) {
        const rec = {
            function: profile.name,
            priority: 0,
            reasons: [],
            suggestedOptimizations: []
        };

        // Анализируем профиль
        if (profile.metadata.isHot) {
            rec.priority += 50;
            rec.reasons.push('Hot function (called frequently)');
        }

        if (profile.avgTime > 5) {
            rec.priority += 30;
            rec.reasons.push('Slow execution time');
        }

        if (profile.codeStats.hasLoop) {
            rec.priority += 20;
            rec.reasons.push('Contains loops');
            rec.suggestedOptimizations.push('loop_unrolling');
            rec.suggestedOptimizations.push('vectorization');
        }

        if (profile.metadata.hasRecursion) {
            rec.priority += 15;
            rec.reasons.push('Uses recursion');
            rec.suggestedOptimizations.push('tail_call_optimization');
        }

        if (profile.calls.size > 3) {
            rec.priority += 10;
            rec.reasons.push('Makes many function calls');
            rec.suggestedOptimizations.push('inlining');
        }

        if (profile.codeStats.cyclomaticComplexity > 10) {
            rec.priority += 10;
            rec.reasons.push('High complexity');
            rec.suggestedOptimizations.push('simplification');
        }

        // Добавляем только если есть потенциал
        if (rec.priority > 20) {
            recommendations.push(rec);
        }
    }

    // Сортируем по приоритету
    recommendations.sort((a, b) => b.priority - a.priority);

    return recommendations;
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

self.onmessage = function(e) {
    const { command, data, id } = e.data;

    console.log(`[Profiler Worker] Received command: ${command}`);

    try {
        let result;

        switch (command) {
            case 'profile':
                result = profileAllFunctions(data.businessLogic);
                break;

            case 'findHotPaths':
                result = findHotPaths(data.maxDepth || 5);
                break;

            case 'getRecommendations':
                const profiles = Array.from(profilerState.functions.values())
                    .map(p => p.serialize());
                result = generateOptimizationRecommendations(profiles);
                break;

            case 'getStats':
                result = {
                    globalStats: profilerState.globalStats,
                    functionCount: profilerState.functions.size,
                    callGraphSize: profilerState.callGraph.size
                };
                break;

            default:
                throw new Error(`Unknown command: ${command}`);
        }

        // Отправляем результат обратно
        self.postMessage({
            id: id,
            command: command,
            success: true,
            result: result
        });

    } catch (error) {
        console.error('[Profiler Worker] Error:', error);

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

// Сообщаем о готовности
console.log('[Profiler Worker] Initialized and ready');
self.postMessage({ type: 'ready' });
