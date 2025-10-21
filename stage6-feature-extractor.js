/**
 * ============================================================================
 * STAGE 6: AI-POWERED OPTIMIZATION - CODE FEATURE EXTRACTOR
 * ============================================================================
 * 
 * Это первый и критически важный компонент нашей системы машинного обучения.
 * Его задача - превратить код (в форме AST) в набор числовых характеристик,
 * которые могут обработать модели машинного обучения.
 * 
 * ПОЧЕМУ ЭТО ВАЖНО?
 * 
 * Представьте, что вы пытаетесь научить компьютер отличать яблоки от апельсинов.
 * Вы не можете просто показать фотографию и сказать "это яблоко". Компьютер не
 * понимает концепцию яблока. Вместо этого вы измеряете характеристики: цвет
 * (красный, зелёный, оранжевый), размер, форма, текстура кожуры. Эти числовые
 * характеристики компьютер может анализировать и находить паттерны.
 * 
 * С кодом та же ситуация. Нейронная сеть не может смотреть на Abstract Syntax
 * Tree и понимать, что это за код. Но мы можем извлечь характеристики:
 * 
 * - СТРУКТУРНЫЕ: сколько узлов в AST, какая глубина дерева, сколько веток
 * - ВЫЧИСЛИТЕЛЬНЫЕ: сколько операций, какого типа, как часто циклы
 * - ПОТОКИ УПРАВЛЕНИЯ: сколько условных переходов, насколько сложная логика
 * - ИСПОЛЬЗОВАНИЕ ПАМЯТИ: сколько переменных, как они используются
 * - ПАТТЕРНЫ ВЫЗОВОВ: какие функции вызывают какие, как часто
 * 
 * Эти характеристики формируют "отпечаток пальца" кода - уникальную числовую
 * сигнатуру, по которой ML модель может предсказывать поведение.
 * 
 * FEATURE VECTOR (ВЕКТОР ХАРАКТЕРИСТИК)
 * 
 * Результат работы этого модуля - вектор чисел фиксированной длины. Например:
 * 
 * [
 *   15,    // Количество узлов в AST
 *   4,     // Максимальная глубина дерева
 *   8,     // Количество арифметических операций
 *   2,     // Количество циклов
 *   3,     // Количество условных выражений
 *   5,     // Количество переменных
 *   0.4,   // Коэффициент ветвления (branch factor)
 *   0.7,   // Доля арифметических операций
 *   ...    // Всего около 50-100 характеристик
 * ]
 * 
 * Этот вектор - универсальный язык между кодом и машинным обучением. Любой
 * код, независимо от его конкретного содержания, можно представить вектором
 * чисел одинаковой длины. Это позволяет применять стандартные ML алгоритмы.
 */

/**
 * CodeFeatureExtractor - извлекает числовые характеристики из AST.
 * 
 * Этот класс принимает Abstract Syntax Tree и проходит по нему, собирая
 * статистику о различных аспектах кода. Результат - вектор чисел, который
 * описывает код в форме, пригодной для машинного обучения.
 */
function CodeFeatureExtractor() {
    // Результирующий вектор характеристик
    this.features = {};
    
    // Счётчики для различных типов узлов AST
    this.nodeCounts = {
        total: 0,
        literals: 0,
        identifiers: 0,
        binaryOps: 0,
        unaryOps: 0,
        calls: 0,
        assignments: 0,
        returns: 0,
        ifs: 0,
        loops: 0,
        functions: 0
    };
    
    // Операции по типам
    this.operationCounts = {
        arithmetic: 0,    // +, -, *, /, %
        comparison: 0,    // ==, !=, <, >, <=, >=
        logical: 0,       // &&, ||, !
        bitwise: 0        // &, |, ^, ~, <<, >>
    };
    
    // Статистика по глубине AST
    this.depthStats = {
        max: 0,
        average: 0,
        samples: []
    };
    
    // Статистика по переменным
    this.variableStats = {
        declared: 0,
        used: 0,
        usageMap: {}  // Имя -> количество использований
    };
    
    // Статистика по циклам
    this.loopStats = {
        total: 0,
        nested: 0,      // Вложенные циклы
        maxNesting: 0   // Максимальный уровень вложенности
    };
    
    // Граф вызовов функций
    this.callGraph = {
        nodes: [],       // Список функций
        edges: []        // Связи (кто кого вызывает)
    };
}

/**
 * Извлекает характеристики из AST.
 * 
 * Это главный метод, который запускает весь процесс извлечения характеристик.
 * Он проходит по AST рекурсивно, собирая статистику, затем вычисляет финальный
 * вектор характеристик.
 * 
 * @param {Object} ast - Abstract Syntax Tree для анализа
 * @returns {Array} - Вектор числовых характеристик
 */
CodeFeatureExtractor.prototype.extract = function(ast) {
    // Сбрасываем все счётчики
    this.reset();
    
    // Проходим по AST, собирая статистику
    this.traverseAST(ast, 0);
    
    // Вычисляем производные характеристики
    this.computeDerivedFeatures();
    
    // Формируем финальный вектор
    return this.buildFeatureVector();
};

/**
 * Сбрасывает все счётчики и статистику.
 */
CodeFeatureExtractor.prototype.reset = function() {
    this.nodeCounts = {
        total: 0,
        literals: 0,
        identifiers: 0,
        binaryOps: 0,
        unaryOps: 0,
        calls: 0,
        assignments: 0,
        returns: 0,
        ifs: 0,
        loops: 0,
        functions: 0
    };
    
    this.operationCounts = {
        arithmetic: 0,
        comparison: 0,
        logical: 0,
        bitwise: 0
    };
    
    this.depthStats = {
        max: 0,
        average: 0,
        samples: []
    };
    
    this.variableStats = {
        declared: 0,
        used: 0,
        usageMap: {}
    };
    
    this.loopStats = {
        total: 0,
        nested: 0,
        maxNesting: 0
    };
    
    this.callGraph = {
        nodes: [],
        edges: []
    };
    
    this.features = {};
};

/**
 * Рекурсивно проходит по AST, собирая статистику.
 * 
 * Это сердце процесса извлечения характеристик. Функция рекурсивно обходит
 * каждый узел дерева, идентифицирует его тип, и обновляет соответствующие
 * счётчики. Глубина отслеживается для вычисления структурных характеристик.
 * 
 * @param {Object} node - Текущий узел AST
 * @param {number} depth - Текущая глубина в дереве
 * @param {number} loopDepth - Глубина вложенности циклов
 */
CodeFeatureExtractor.prototype.traverseAST = function(node, depth, loopDepth) {
    if (!node || typeof node !== 'object') {
        return;
    }
    
    loopDepth = loopDepth || 0;
    
    // Увеличиваем общий счётчик узлов
    this.nodeCounts.total++;
    
    // Обновляем статистику глубины
    if (depth > this.depthStats.max) {
        this.depthStats.max = depth;
    }
    this.depthStats.samples.push(depth);
    
    // Анализируем узел в зависимости от типа
    var nodeType = node.type;
    
    if (nodeType === 'Program') {
        // Корневой узел программы
        if (node.body && Array.isArray(node.body)) {
            for (var i = 0; i < node.body.length; i++) {
                this.traverseAST(node.body[i], depth + 1, loopDepth);
            }
        }
    }
    else if (nodeType === 'FunctionDeclaration') {
        // Объявление функции
        this.nodeCounts.functions++;
        
        // Добавляем в граф вызовов
        if (node.name) {
            this.callGraph.nodes.push(node.name.value);
        }
        
        // Обрабатываем параметры
        if (node.params && Array.isArray(node.params)) {
            for (var i = 0; i < node.params.length; i++) {
                this.traverseAST(node.params[i], depth + 1, loopDepth);
            }
        }
        
        // Обрабатываем тело функции
        if (node.body) {
            this.traverseAST(node.body, depth + 1, loopDepth);
        }
    }
    else if (nodeType === 'BlockStatement') {
        // Блок операторов
        if (node.statements && Array.isArray(node.statements)) {
            for (var i = 0; i < node.statements.length; i++) {
                this.traverseAST(node.statements[i], depth + 1, loopDepth);
            }
        }
    }
    else if (nodeType === 'VariableDeclaration') {
        // Объявление переменной
        this.variableStats.declared++;
        
        if (node.id && node.id.value) {
            this.variableStats.usageMap[node.id.value] = 0;
        }
        
        if (node.init) {
            this.traverseAST(node.init, depth + 1, loopDepth);
        }
    }
    else if (nodeType === 'Identifier') {
        // Идентификатор (использование переменной)
        this.nodeCounts.identifiers++;
        
        if (node.value && this.variableStats.usageMap[node.value] !== undefined) {
            this.variableStats.usageMap[node.value]++;
            this.variableStats.used++;
        }
    }
    else if (nodeType === 'Literal') {
        // Литерал (число, строка, булево)
        this.nodeCounts.literals++;
    }
    else if (nodeType === 'BinaryExpression') {
        // Бинарная операция (a + b, a < b, и т.д.)
        this.nodeCounts.binaryOps++;
        
        // Классифицируем операцию
        this.classifyOperation(node.operator);
        
        // Рекурсивно обрабатываем левую и правую части
        if (node.left) {
            this.traverseAST(node.left, depth + 1, loopDepth);
        }
        if (node.right) {
            this.traverseAST(node.right, depth + 1, loopDepth);
        }
    }
    else if (nodeType === 'UnaryExpression') {
        // Унарная операция (!a, -a, и т.д.)
        this.nodeCounts.unaryOps++;
        
        if (node.argument) {
            this.traverseAST(node.argument, depth + 1, loopDepth);
        }
    }
    else if (nodeType === 'AssignmentExpression') {
        // Присваивание (a = b)
        this.nodeCounts.assignments++;
        
        if (node.left) {
            this.traverseAST(node.left, depth + 1, loopDepth);
        }
        if (node.right) {
            this.traverseAST(node.right, depth + 1, loopDepth);
        }
    }
    else if (nodeType === 'CallExpression') {
        // Вызов функции
        this.nodeCounts.calls++;
        
        // Добавляем связь в граф вызовов
        if (node.callee && node.callee.value) {
            this.callGraph.edges.push({
                from: 'current',  // Текущая функция
                to: node.callee.value
            });
        }
        
        // Обрабатываем аргументы
        if (node.arguments && Array.isArray(node.arguments)) {
            for (var i = 0; i < node.arguments.length; i++) {
                this.traverseAST(node.arguments[i], depth + 1, loopDepth);
            }
        }
    }
    else if (nodeType === 'ReturnStatement') {
        // Return statement
        this.nodeCounts.returns++;
        
        if (node.argument) {
            this.traverseAST(node.argument, depth + 1, loopDepth);
        }
    }
    else if (nodeType === 'IfStatement') {
        // Условное выражение
        this.nodeCounts.ifs++;
        
        // Условие
        if (node.test) {
            this.traverseAST(node.test, depth + 1, loopDepth);
        }
        
        // Then ветка
        if (node.consequent) {
            this.traverseAST(node.consequent, depth + 1, loopDepth);
        }
        
        // Else ветка
        if (node.alternate) {
            this.traverseAST(node.alternate, depth + 1, loopDepth);
        }
    }
    else if (nodeType === 'WhileStatement' || nodeType === 'ForStatement') {
        // Циклы
        this.nodeCounts.loops++;
        this.loopStats.total++;
        
        // Отслеживаем вложенность
        if (loopDepth > 0) {
            this.loopStats.nested++;
        }
        
        var newLoopDepth = loopDepth + 1;
        if (newLoopDepth > this.loopStats.maxNesting) {
            this.loopStats.maxNesting = newLoopDepth;
        }
        
        // Обрабатываем части цикла
        if (node.test) {
            this.traverseAST(node.test, depth + 1, newLoopDepth);
        }
        if (node.init) {
            this.traverseAST(node.init, depth + 1, newLoopDepth);
        }
        if (node.update) {
            this.traverseAST(node.update, depth + 1, newLoopDepth);
        }
        if (node.body) {
            this.traverseAST(node.body, depth + 1, newLoopDepth);
        }
    }
};

/**
 * Классифицирует операцию по типу.
 * 
 * Разные типы операций имеют разную производительность. Арифметические
 * операции обычно быстрые, операции сравнения тоже, логические могут быть
 * медленнее из-за ленивого вычисления. Эта информация полезна для ML модели.
 * 
 * @param {string} operator - Оператор для классификации
 */
CodeFeatureExtractor.prototype.classifyOperation = function(operator) {
    var arithmetic = ['+', '-', '*', '/', '%'];
    var comparison = ['==', '!=', '<', '>', '<=', '>='];
    var logical = ['&&', '||'];
    var bitwise = ['&', '|', '^', '<<', '>>', '>>>'];
    
    if (arithmetic.indexOf(operator) !== -1) {
        this.operationCounts.arithmetic++;
    } else if (comparison.indexOf(operator) !== -1) {
        this.operationCounts.comparison++;
    } else if (logical.indexOf(operator) !== -1) {
        this.operationCounts.logical++;
    } else if (bitwise.indexOf(operator) !== -1) {
        this.operationCounts.bitwise++;
    }
};

/**
 * Вычисляет производные характеристики.
 * 
 * После сбора базовой статистики мы вычисляем более сложные характеристики,
 * которые объединяют несколько базовых метрик. Эти производные характеристики
 * часто более информативны для ML моделей.
 */
CodeFeatureExtractor.prototype.computeDerivedFeatures = function() {
    // Средняя глубина AST
    if (this.depthStats.samples.length > 0) {
        var sum = 0;
        for (var i = 0; i < this.depthStats.samples.length; i++) {
            sum += this.depthStats.samples[i];
        }
        this.depthStats.average = sum / this.depthStats.samples.length;
    }
    
    // Коэффициент ветвления (сколько веток в среднем на узел)
    this.features.branchingFactor = this.nodeCounts.total > 0
        ? this.nodeCounts.ifs / this.nodeCounts.total
        : 0;
    
    // Плотность операций (сколько операций на узел)
    var totalOps = this.operationCounts.arithmetic + 
                   this.operationCounts.comparison + 
                   this.operationCounts.logical + 
                   this.operationCounts.bitwise;
    
    this.features.operationDensity = this.nodeCounts.total > 0
        ? totalOps / this.nodeCounts.total
        : 0;
    
    // Доля различных типов операций
    if (totalOps > 0) {
        this.features.arithmeticRatio = this.operationCounts.arithmetic / totalOps;
        this.features.comparisonRatio = this.operationCounts.comparison / totalOps;
        this.features.logicalRatio = this.operationCounts.logical / totalOps;
        this.features.bitwiseRatio = this.operationCounts.bitwise / totalOps;
    } else {
        this.features.arithmeticRatio = 0;
        this.features.comparisonRatio = 0;
        this.features.logicalRatio = 0;
        this.features.bitwiseRatio = 0;
    }
    
    // Коэффициент повторного использования переменных
    var totalUsages = 0;
    var variableNames = Object.keys(this.variableStats.usageMap);
    for (var i = 0; i < variableNames.length; i++) {
        totalUsages += this.variableStats.usageMap[variableNames[i]];
    }
    
    this.features.variableReuseRate = this.variableStats.declared > 0
        ? totalUsages / this.variableStats.declared
        : 0;
    
    // Сложность циклов (вложенность)
    this.features.loopComplexity = this.loopStats.total > 0
        ? (this.loopStats.nested + this.loopStats.maxNesting) / this.loopStats.total
        : 0;
    
    // Цикломатическая сложность (упрощённая версия)
    // Это мера сложности потока управления
    this.features.cyclomaticComplexity = 1 + this.nodeCounts.ifs + this.nodeCounts.loops;
};

/**
 * Формирует финальный вектор характеристик.
 * 
 * Собираем все вычисленные характеристики в один массив чисел фиксированной
 * длины. Порядок элементов важен - он должен быть одинаковым для всех векторов,
 * чтобы ML модель могла правильно их интерпретировать.
 * 
 * @returns {Array} - Вектор числовых характеристик
 */
CodeFeatureExtractor.prototype.buildFeatureVector = function() {
    return [
        // Структурные характеристики
        this.nodeCounts.total,
        this.depthStats.max,
        this.depthStats.average,
        this.features.branchingFactor,
        
        // Счётчики узлов
        this.nodeCounts.literals,
        this.nodeCounts.identifiers,
        this.nodeCounts.binaryOps,
        this.nodeCounts.unaryOps,
        this.nodeCounts.calls,
        this.nodeCounts.assignments,
        this.nodeCounts.returns,
        this.nodeCounts.ifs,
        this.nodeCounts.loops,
        this.nodeCounts.functions,
        
        // Характеристики операций
        this.operationCounts.arithmetic,
        this.operationCounts.comparison,
        this.operationCounts.logical,
        this.operationCounts.bitwise,
        this.features.operationDensity,
        this.features.arithmeticRatio,
        this.features.comparisonRatio,
        this.features.logicalRatio,
        this.features.bitwiseRatio,
        
        // Характеристики переменных
        this.variableStats.declared,
        this.variableStats.used,
        this.features.variableReuseRate,
        
        // Характеристики циклов
        this.loopStats.total,
        this.loopStats.nested,
        this.loopStats.maxNesting,
        this.features.loopComplexity,
        
        // Сложность
        this.features.cyclomaticComplexity,
        
        // Характеристики графа вызовов
        this.callGraph.nodes.length,
        this.callGraph.edges.length
    ];
};

/**
 * Возвращает человекочитаемое описание характеристик.
 * 
 * Для отладки и визуализации полезно видеть не просто массив чисел,
 * а понимать, что каждое число означает.
 * 
 * @returns {Object} - Объект с именованными характеристиками
 */
CodeFeatureExtractor.prototype.getFeatureDescription = function() {
    return {
        structural: {
            totalNodes: this.nodeCounts.total,
            maxDepth: this.depthStats.max,
            averageDepth: this.depthStats.average.toFixed(2),
            branchingFactor: this.features.branchingFactor.toFixed(3)
        },
        nodeCounts: this.nodeCounts,
        operations: {
            counts: this.operationCounts,
            density: this.features.operationDensity.toFixed(3),
            ratios: {
                arithmetic: this.features.arithmeticRatio.toFixed(3),
                comparison: this.features.comparisonRatio.toFixed(3),
                logical: this.features.logicalRatio.toFixed(3),
                bitwise: this.features.bitwiseRatio.toFixed(3)
            }
        },
        variables: {
            declared: this.variableStats.declared,
            used: this.variableStats.used,
            reuseRate: this.features.variableReuseRate.toFixed(2)
        },
        loops: {
            total: this.loopStats.total,
            nested: this.loopStats.nested,
            maxNesting: this.loopStats.maxNesting,
            complexity: this.features.loopComplexity.toFixed(3)
        },
        complexity: {
            cyclomatic: this.features.cyclomaticComplexity
        },
        callGraph: {
            functions: this.callGraph.nodes.length,
            calls: this.callGraph.edges.length
        }
    };
};

// Экспорт для использования в браузере
if (typeof window !== 'undefined') {
    window.CompilerStage6 = window.CompilerStage6 || {};
    window.CompilerStage6.CodeFeatureExtractor = CodeFeatureExtractor;
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CodeFeatureExtractor: CodeFeatureExtractor };
}
