/**
 * ============================================================================
 * TYPE ANALYZER - STAGE 5: REAL WASM COMPILATION
 * ============================================================================
 * 
 * Типовой анализатор решает одну из самых сложных проблем компиляции JavaScript
 * в WebAssembly: JavaScript динамически типизирован, а WASM статически типизирован.
 * 
 * ПРОБЛЕМА ТИПОВ:
 * 
 * Представьте, что вы переводите книгу с одного языка на другой. В исходном
 * языке нет рода у существительных, а в целевом языке род обязателен для
 * каждого слова. Вам нужно каким-то образом определить род для каждого слова,
 * основываясь на контексте использования.
 * 
 * Аналогично с JavaScript и WASM. В JavaScript переменная может содержать
 * что угодно:
 * 
 *   let x = 42;        // Число
 *   x = "hello";       // Теперь строка!
 *   x = { foo: 'bar' }; // Теперь объект!
 * 
 * В WASM каждая переменная имеет фиксированный тип на всё время жизни:
 * 
 *   (local $x i32)  ;; x - это ВСЕГДА 32-битное целое
 * 
 * Наша задача - проанализировать, как используется каждая переменная в
 * JavaScript коде, и вывести её тип. Если переменная используется непоследовательно
 * (то как число, то как строка), нам нужно либо отказаться от компиляции
 * этого кода, либо использовать более сложные техники (union types, boxing).
 * 
 * СИСТЕМА ТИПОВ WASM:
 * 
 * WebAssembly поддерживает следующие примитивные типы:
 * - i32: 32-битное целое со знаком
 * - i64: 64-битное целое со знаком
 * - f32: 32-битное число с плавающей точкой (IEEE 754)
 * - f64: 64-битное число с плавающей точкой (IEEE 754)
 * - v128: 128-битный вектор для SIMD операций
 * - funcref: ссылка на функцию
 * - externref: ссылка на внешний объект (например, JavaScript объект)
 * 
 * Для наших целей мы будем использовать в основном:
 * - i32 для целых чисел и булевых значений (0 = false, 1 = true)
 * - f64 для чисел с плавающей точкой
 * - externref для строк и объектов (они остаются в JavaScript)
 * 
 * АЛГОРИТМ ВЫВОДА ТИПОВ:
 * 
 * Мы используем подход, называемый "constraint-based type inference" - вывод
 * типов на основе ограничений. Идея проста:
 * 
 * 1. Проходим по AST и для каждого выражения создаём переменную типа
 * 2. На основе операций создаём ограничения между типами
 *    Например, если видим x + y, мы знаем, что результат того же типа,
 *    что и операнды (если они одного типа)
 * 3. Решаем систему ограничений, находя конкретные типы
 * 
 * Например, для кода:
 * 
 *   function add(a, b) {
 *     return a + b;
 *   }
 *   let x = add(5, 10);
 * 
 * Мы создаём ограничения:
 * - a используется в +, значит a - число
 * - b используется в +, значит b - число
 * - a + b даёт число, значит add возвращает число
 * - x = add(...), значит x - число
 * 
 * Решая эту систему, мы выводим: a: number, b: number, x: number
 */

/**
 * TypeKind - виды типов в нашей системе.
 * 
 * Мы используем упрощённую систему типов. В реальном компиляторе TypeScript
 * или Flow система типов намного богаче (дженерики, union types, intersection
 * types, conditional types и так далее).
 */
const TypeKind = {
    // Примитивные типы
    NUMBER: 'number',       // JavaScript number (может быть i32 или f64 в WASM)
    STRING: 'string',       // Строка (externref в WASM)
    BOOLEAN: 'boolean',     // Булево значение (i32 в WASM, 0 или 1)
    NULL: 'null',           // null
    UNDEFINED: 'undefined', // undefined
    
    // Сложные типы
    FUNCTION: 'function',   // Функция
    ARRAY: 'array',         // Массив
    OBJECT: 'object',       // Объект
    
    // Специальные типы для вывода
    UNKNOWN: 'unknown',     // Тип ещё неизвестен
    ANY: 'any',             // Любой тип (используется когда не можем вывести)
    VOID: 'void',           // Отсутствие значения (для функций, не возвращающих значение)
    
    // Целочисленный подтип number
    INTEGER: 'integer'      // Целое число (будет i32 в WASM)
};

/**
 * Type - представление типа.
 * 
 * Тип содержит вид (kind) и дополнительную информацию в зависимости от вида.
 * Например, для функции это типы параметров и возвращаемого значения.
 */
class Type {
    constructor(kind, extra = {}) {
        this.kind = kind;
        
        // Для функций
        this.paramTypes = extra.paramTypes || [];
        this.returnType = extra.returnType || null;
        
        // Для массивов
        this.elementType = extra.elementType || null;
        
        // Для объектов
        this.properties = extra.properties || {};
    }
    
    /**
     * Проверяет, совместим ли этот тип с другим типом.
     * 
     * Совместимость типов важна для проверки корректности присваиваний и
     * вызовов функций. Например, нельзя присвоить строку переменной типа number.
     */
    isCompatibleWith(other) {
        // ANY совместим со всем
        if (this.kind === TypeKind.ANY || other.kind === TypeKind.ANY) {
            return true;
        }
        
        // UNKNOWN пока неизвестен, считаем совместимым
        if (this.kind === TypeKind.UNKNOWN || other.kind === TypeKind.UNKNOWN) {
            return true;
        }
        
        // Простые типы должны совпадать
        if (this.kind === other.kind) {
            return true;
        }
        
        // NUMBER и INTEGER совместимы (INTEGER - подтип NUMBER)
        if ((this.kind === TypeKind.NUMBER && other.kind === TypeKind.INTEGER) ||
            (this.kind === TypeKind.INTEGER && other.kind === TypeKind.NUMBER)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Возвращает строковое представление типа.
     */
    toString() {
        if (this.kind === TypeKind.FUNCTION) {
            const params = this.paramTypes.map(t => t.toString()).join(', ');
            const ret = this.returnType ? this.returnType.toString() : 'void';
            return `(${params}) => ${ret}`;
        }
        
        if (this.kind === TypeKind.ARRAY) {
            const elem = this.elementType ? this.elementType.toString() : 'any';
            return `Array<${elem}>`;
        }
        
        return this.kind;
    }
    
    /**
     * Создаёт копию типа.
     */
    clone() {
        return new Type(this.kind, {
            paramTypes: this.paramTypes.map(t => t.clone()),
            returnType: this.returnType ? this.returnType.clone() : null,
            elementType: this.elementType ? this.elementType.clone() : null,
            properties: { ...this.properties }
        });
    }
}

/**
 * TypeEnvironment - окружение типов.
 * 
 * Окружение - это таблица, которая хранит типы всех переменных в текущей
 * области видимости. Когда мы входим в новый блок (например, тело функции),
 * мы создаём новое окружение, вложенное в текущее. Когда выходим из блока,
 * возвращаемся к предыдущему окружению.
 * 
 * Это реализует лексическую область видимости - внутренний блок может видеть
 * переменные внешнего блока, но не наоборот.
 */
class TypeEnvironment {
    constructor(parent = null) {
        this.parent = parent;      // Родительское окружение
        this.bindings = new Map(); // Переменная -> Тип
    }
    
    /**
     * Определяет новую переменную в текущем окружении.
     */
    define(name, type) {
        this.bindings.set(name, type);
    }
    
    /**
     * Ищет тип переменной.
     * 
     * Если переменная не найдена в текущем окружении, ищем в родительском,
     * и так далее вверх по цепочке. Это реализует лексический скоуп.
     */
    lookup(name) {
        if (this.bindings.has(name)) {
            return this.bindings.get(name);
        }
        
        if (this.parent) {
            return this.parent.lookup(name);
        }
        
        return null; // Переменная не найдена
    }
    
    /**
     * Обновляет тип существующей переменной.
     * 
     * В отличие от define, которая создаёт новую переменную, update изменяет
     * тип существующей. Это используется, когда мы узнаём больше о типе
     * переменной по мере анализа.
     */
    update(name, type) {
        if (this.bindings.has(name)) {
            this.bindings.set(name, type);
            return true;
        }
        
        if (this.parent) {
            return this.parent.update(name, type);
        }
        
        return false;
    }
    
    /**
     * Создаёт дочернее окружение.
     * 
     * Используется при входе в новый блок (функция, цикл, условие).
     */
    extend() {
        return new TypeEnvironment(this);
    }
}

/**
 * TypeAnalyzer - анализатор типов.
 * 
 * Проходит по AST и выводит типы для всех переменных и выражений. После
 * работы анализатора каждый узел AST аннотирован типовой информацией.
 */
class TypeAnalyzer {
    constructor() {
        // Глобальное окружение с встроенными функциями
        this.globalEnv = new TypeEnvironment();
        this.initializeGlobalEnvironment();
        
        // Текущее окружение (изменяется при входе/выходе из блоков)
        this.currentEnv = this.globalEnv;
        
        // Ошибки типов, найденные во время анализа
        this.errors = [];
    }
    
    /**
     * Инициализирует глобальное окружение встроенными функциями.
     * 
     * JavaScript имеет множество встроенных функций и объектов (console, Math,
     * Array и т.д.). Мы добавляем некоторые из них в глобальное окружение,
     * чтобы анализатор знал их типы.
     */
    initializeGlobalEnvironment() {
        // console.log принимает любые аргументы и ничего не возвращает
        this.globalEnv.define('console', new Type(TypeKind.OBJECT, {
            properties: {
                log: new Type(TypeKind.FUNCTION, {
                    paramTypes: [new Type(TypeKind.ANY)],
                    returnType: new Type(TypeKind.VOID)
                })
            }
        }));
        
        // Math объект с математическими функциями
        this.globalEnv.define('Math', new Type(TypeKind.OBJECT, {
            properties: {
                abs: new Type(TypeKind.FUNCTION, {
                    paramTypes: [new Type(TypeKind.NUMBER)],
                    returnType: new Type(TypeKind.NUMBER)
                }),
                floor: new Type(TypeKind.FUNCTION, {
                    paramTypes: [new Type(TypeKind.NUMBER)],
                    returnType: new Type(TypeKind.INTEGER)
                }),
                sqrt: new Type(TypeKind.FUNCTION, {
                    paramTypes: [new Type(TypeKind.NUMBER)],
                    returnType: new Type(TypeKind.NUMBER)
                })
            }
        }));
    }
    
    /**
     * Анализирует AST и аннотирует узлы типами.
     * 
     * Это главная точка входа в анализатор. После вызова этого метода каждый
     * узел AST будет иметь свойство inferredType с выведенным типом.
     * 
     * @param {Object} ast - Корневой узел AST (обычно Program)
     * @returns {Object} - Аннотированный AST
     */
    analyze(ast) {
        this.errors = [];
        this.analyzeNode(ast);
        
        if (this.errors.length > 0) {
            console.warn(`Найдено ${this.errors.length} ошибок типов:`);
            this.errors.forEach(err => console.warn(`  - ${err}`));
        }
        
        return ast;
    }
    
    /**
     * Анализирует отдельный узел AST.
     * 
     * Это диспетчер, который вызывает соответствующий метод анализа в
     * зависимости от типа узла.
     */
    analyzeNode(node) {
        if (!node) return new Type(TypeKind.VOID);
        
        switch (node.type) {
            case 'Program':
                return this.analyzeProgram(node);
            
            case 'FunctionDeclaration':
                return this.analyzeFunctionDeclaration(node);
            
            case 'VariableDeclaration':
                return this.analyzeVariableDeclaration(node);
            
            case 'BlockStatement':
                return this.analyzeBlockStatement(node);
            
            case 'ReturnStatement':
                return this.analyzeReturnStatement(node);
            
            case 'IfStatement':
                return this.analyzeIfStatement(node);
            
            case 'WhileStatement':
                return this.analyzeWhileStatement(node);
            
            case 'ForStatement':
                return this.analyzeForStatement(node);
            
            case 'ExpressionStatement':
                return this.analyzeNode(node.expression);
            
            case 'BinaryExpression':
                return this.analyzeBinaryExpression(node);
            
            case 'UnaryExpression':
                return this.analyzeUnaryExpression(node);
            
            case 'AssignmentExpression':
                return this.analyzeAssignmentExpression(node);
            
            case 'CallExpression':
                return this.analyzeCallExpression(node);
            
            case 'MemberExpression':
                return this.analyzeMemberExpression(node);
            
            case 'Identifier':
                return this.analyzeIdentifier(node);
            
            case 'NumberLiteral':
                return this.analyzeNumberLiteral(node);
            
            case 'StringLiteral':
                return this.analyzeStringLiteral(node);
            
            case 'BooleanLiteral':
                return this.analyzeBooleanLiteral(node);
            
            case 'NullLiteral':
                node.inferredType = new Type(TypeKind.NULL);
                return node.inferredType;
            
            case 'ArrowFunctionExpression':
                return this.analyzeArrowFunction(node);
            
            default:
                console.warn(`Неизвестный тип узла: ${node.type}`);
                return new Type(TypeKind.UNKNOWN);
        }
    }
    
    /**
     * Анализирует программу (корневой узел).
     */
    analyzeProgram(node) {
        for (const statement of node.body) {
            this.analyzeNode(statement);
        }
        return new Type(TypeKind.VOID);
    }
    
    /**
     * Анализирует объявление функции.
     * 
     * Для функции нам нужно:
     * 1. Определить типы параметров (изначально UNKNOWN)
     * 2. Проанализировать тело функции в новом окружении
     * 3. Вывести тип возвращаемого значения из return операторов
     */
    analyzeFunctionDeclaration(node) {
        // Создаём тип функции с неизвестными типами параметров
        const paramTypes = node.params.map(() => new Type(TypeKind.UNKNOWN));
        const funcType = new Type(TypeKind.FUNCTION, {
            paramTypes: paramTypes,
            returnType: new Type(TypeKind.UNKNOWN)
        });
        
        // Определяем функцию в текущем окружении
        this.currentEnv.define(node.name, funcType);
        
        // Создаём новое окружение для тела функции
        const functionEnv = this.currentEnv.extend();
        const previousEnv = this.currentEnv;
        this.currentEnv = functionEnv;
        
        // Определяем параметры в окружении функции
        for (let i = 0; i < node.params.length; i++) {
            const param = node.params[i];
            functionEnv.define(param.name, paramTypes[i]);
            param.inferredType = paramTypes[i];
        }
        
        // Анализируем тело функции
        this.analyzeNode(node.body);
        
        // Пытаемся вывести тип возвращаемого значения
        // Это упрощённая версия - в реальности нужно собрать все return операторы
        // и объединить их типы
        funcType.returnType = this.inferReturnType(node.body);
        
        // Возвращаемся к предыдущему окружению
        this.currentEnv = previousEnv;
        
        node.inferredType = funcType;
        return funcType;
    }
    
    /**
     * Выводит тип возвращаемого значения из тела функции.
     * 
     * Ищет все return операторы и определяет общий тип.
     */
    inferReturnType(body) {
        const returnTypes = [];
        this.collectReturnTypes(body, returnTypes);
        
        if (returnTypes.length === 0) {
            return new Type(TypeKind.VOID);
        }
        
        // Если все return возвращают один и тот же тип, используем его
        const firstType = returnTypes[0];
        const allSame = returnTypes.every(t => t.kind === firstType.kind);
        
        if (allSame) {
            return firstType;
        }
        
        // Разные типы - используем ANY (в реальности нужен union type)
        return new Type(TypeKind.ANY);
    }
    
    /**
     * Рекурсивно собирает типы всех return операторов.
     */
    collectReturnTypes(node, types) {
        if (!node) return;
        
        if (node.type === 'ReturnStatement' && node.value) {
            if (node.value.inferredType) {
                types.push(node.value.inferredType);
            }
        }
        
        // Рекурсивно обходим дерево
        if (node.body) {
            if (Array.isArray(node.body)) {
                node.body.forEach(child => this.collectReturnTypes(child, types));
            } else {
                this.collectReturnTypes(node.body, types);
            }
        }
        
        if (node.then) this.collectReturnTypes(node.then, types);
        if (node.else) this.collectReturnTypes(node.else, types);
    }
    
    /**
     * Анализирует объявление переменной.
     */
    analyzeVariableDeclaration(node) {
        let type;
        
        if (node.init) {
            // Если есть инициализация, тип выводится из инициализирующего выражения
            type = this.analyzeNode(node.init);
        } else {
            // Без инициализации тип неизвестен
            type = new Type(TypeKind.UNKNOWN);
        }
        
        this.currentEnv.define(node.name, type);
        node.inferredType = type;
        
        return type;
    }
    
    /**
     * Анализирует блок операторов.
     */
    analyzeBlockStatement(node) {
        // Создаём новое окружение для блока
        const blockEnv = this.currentEnv.extend();
        const previousEnv = this.currentEnv;
        this.currentEnv = blockEnv;
        
        for (const statement of node.body) {
            this.analyzeNode(statement);
        }
        
        this.currentEnv = previousEnv;
        
        return new Type(TypeKind.VOID);
    }
    
    /**
     * Анализирует оператор return.
     */
    analyzeReturnStatement(node) {
        if (node.value) {
            node.inferredType = this.analyzeNode(node.value);
        } else {
            node.inferredType = new Type(TypeKind.VOID);
        }
        
        return node.inferredType;
    }
    
    /**
     * Анализирует условный оператор if.
     */
    analyzeIfStatement(node) {
        // Условие должно быть булевым
        const condType = this.analyzeNode(node.condition);
        if (condType.kind !== TypeKind.BOOLEAN && 
            condType.kind !== TypeKind.UNKNOWN && 
            condType.kind !== TypeKind.ANY) {
            this.errors.push(
                `Условие if должно быть булевым, получено: ${condType.kind}`
            );
        }
        
        this.analyzeNode(node.then);
        if (node.else) {
            this.analyzeNode(node.else);
        }
        
        return new Type(TypeKind.VOID);
    }
    
    /**
     * Анализирует цикл while.
     */
    analyzeWhileStatement(node) {
        const condType = this.analyzeNode(node.condition);
        if (condType.kind !== TypeKind.BOOLEAN && 
            condType.kind !== TypeKind.UNKNOWN) {
            this.errors.push(
                `Условие while должно быть булевым, получено: ${condType.kind}`
            );
        }
        
        this.analyzeNode(node.body);
        
        return new Type(TypeKind.VOID);
    }
    
    /**
     * Анализирует цикл for.
     */
    analyzeForStatement(node) {
        if (node.init) this.analyzeNode(node.init);
        if (node.condition) {
            const condType = this.analyzeNode(node.condition);
            if (condType.kind !== TypeKind.BOOLEAN && 
                condType.kind !== TypeKind.UNKNOWN) {
                this.errors.push(
                    `Условие for должно быть булевым, получено: ${condType.kind}`
                );
            }
        }
        if (node.update) this.analyzeNode(node.update);
        
        this.analyzeNode(node.body);
        
        return new Type(TypeKind.VOID);
    }
    
    /**
     * Анализирует бинарное выражение.
     * 
     * Для каждого оператора есть правила о типах операндов и результата.
     * Например, + для чисел даёт число, для строк даёт строку. Сравнения
     * дают булево значение.
     */
    analyzeBinaryExpression(node) {
        const leftType = this.analyzeNode(node.left);
        const rightType = this.analyzeNode(node.right);
        
        const op = node.operator;
        
        // Арифметические операторы: +, -, *, /, %
        if (['+', '-', '*', '/', '%'].includes(op)) {
            // Специальный случай: + может быть конкатенацией строк
            if (op === '+' && 
                (leftType.kind === TypeKind.STRING || rightType.kind === TypeKind.STRING)) {
                node.inferredType = new Type(TypeKind.STRING);
                return node.inferredType;
            }
            
            // Иначе это арифметическая операция
            if (leftType.kind === TypeKind.NUMBER || leftType.kind === TypeKind.INTEGER) {
                if (rightType.kind === TypeKind.NUMBER || rightType.kind === TypeKind.INTEGER) {
                    // Оба числа - результат число
                    // Если оба целые и операция не деление, результат целый
                    if (leftType.kind === TypeKind.INTEGER && 
                        rightType.kind === TypeKind.INTEGER && 
                        op !== '/') {
                        node.inferredType = new Type(TypeKind.INTEGER);
                    } else {
                        node.inferredType = new Type(TypeKind.NUMBER);
                    }
                    return node.inferredType;
                }
            }
            
            // Если типы неизвестны, результат неизвестен
            if (leftType.kind === TypeKind.UNKNOWN || rightType.kind === TypeKind.UNKNOWN) {
                node.inferredType = new Type(TypeKind.UNKNOWN);
                return node.inferredType;
            }
            
            // Несовместимые типы для арифметики
            this.errors.push(
                `Оператор ${op} не применим к типам ${leftType.kind} и ${rightType.kind}`
            );
            node.inferredType = new Type(TypeKind.ANY);
            return node.inferredType;
        }
        
        // Операторы сравнения: ==, ===, !=, !==, <, >, <=, >=
        if (['==', '===', '!=', '!==', '<', '>', '<=', '>='].includes(op)) {
            node.inferredType = new Type(TypeKind.BOOLEAN);
            return node.inferredType;
        }
        
        // Логические операторы: &&, ||
        if (['&&', '||'].includes(op)) {
            node.inferredType = new Type(TypeKind.BOOLEAN);
            return node.inferredType;
        }
        
        node.inferredType = new Type(TypeKind.UNKNOWN);
        return node.inferredType;
    }
    
    /**
     * Анализирует унарное выражение.
     */
    analyzeUnaryExpression(node) {
        const argType = this.analyzeNode(node.argument);
        
        if (node.operator === '!') {
            node.inferredType = new Type(TypeKind.BOOLEAN);
        } else if (node.operator === '-' || node.operator === '+') {
            node.inferredType = argType; // Унарный минус/плюс сохраняет тип
        } else {
            node.inferredType = new Type(TypeKind.UNKNOWN);
        }
        
        return node.inferredType;
    }
    
    /**
     * Анализирует присваивание.
     */
    analyzeAssignmentExpression(node) {
        const rightType = this.analyzeNode(node.right);
        
        if (node.left.type === 'Identifier') {
            const leftType = this.currentEnv.lookup(node.left.name);
            
            if (leftType) {
                // Проверяем совместимость типов
                if (!leftType.isCompatibleWith(rightType)) {
                    this.errors.push(
                        `Несовместимые типы при присваивании: ` +
                        `${leftType.kind} = ${rightType.kind}`
                    );
                }
                
                // Если левая часть была UNKNOWN, обновляем её тип
                if (leftType.kind === TypeKind.UNKNOWN) {
                    this.currentEnv.update(node.left.name, rightType);
                }
            }
        }
        
        node.inferredType = rightType;
        return rightType;
    }
    
    /**
     * Анализирует вызов функции.
     */
    analyzeCallExpression(node) {
        const calleeType = this.analyzeNode(node.callee);
        
        // Анализируем аргументы
        const argTypes = node.arguments.map(arg => this.analyzeNode(arg));
        
        if (calleeType.kind === TypeKind.FUNCTION) {
            // Проверяем количество аргументов
            if (argTypes.length !== calleeType.paramTypes.length) {
                this.errors.push(
                    `Неверное количество аргументов: ожидается ${calleeType.paramTypes.length}, ` +
                    `получено ${argTypes.length}`
                );
            }
            
            // Проверяем типы аргументов
            for (let i = 0; i < Math.min(argTypes.length, calleeType.paramTypes.length); i++) {
                if (!argTypes[i].isCompatibleWith(calleeType.paramTypes[i])) {
                    this.errors.push(
                        `Несовместимый тип аргумента ${i + 1}: ` +
                        `ожидается ${calleeType.paramTypes[i].kind}, ` +
                        `получено ${argTypes[i].kind}`
                    );
                }
            }
            
            node.inferredType = calleeType.returnType || new Type(TypeKind.VOID);
        } else {
            node.inferredType = new Type(TypeKind.UNKNOWN);
        }
        
        return node.inferredType;
    }
    
    /**
     * Анализирует доступ к члену (obj.property).
     */
    analyzeMemberExpression(node) {
        const objectType = this.analyzeNode(node.object);
        
        if (objectType.kind === TypeKind.OBJECT && node.property.type === 'Identifier') {
            const propName = node.property.name;
            if (objectType.properties[propName]) {
                node.inferredType = objectType.properties[propName];
                return node.inferredType;
            }
        }
        
        node.inferredType = new Type(TypeKind.UNKNOWN);
        return node.inferredType;
    }
    
    /**
     * Анализирует идентификатор.
     */
    analyzeIdentifier(node) {
        const type = this.currentEnv.lookup(node.name);
        
        if (!type) {
            this.errors.push(`Неопределённая переменная: ${node.name}`);
            node.inferredType = new Type(TypeKind.UNKNOWN);
        } else {
            node.inferredType = type;
        }
        
        return node.inferredType;
    }
    
    /**
     * Анализирует числовой литерал.
     */
    analyzeNumberLiteral(node) {
        // Проверяем, целое ли это число
        if (Number.isInteger(node.value)) {
            node.inferredType = new Type(TypeKind.INTEGER);
        } else {
            node.inferredType = new Type(TypeKind.NUMBER);
        }
        
        return node.inferredType;
    }
    
    /**
     * Анализирует строковый литерал.
     */
    analyzeStringLiteral(node) {
        node.inferredType = new Type(TypeKind.STRING);
        return node.inferredType;
    }
    
    /**
     * Анализирует булев литерал.
     */
    analyzeBooleanLiteral(node) {
        node.inferredType = new Type(TypeKind.BOOLEAN);
        return node.inferredType;
    }
    
    /**
     * Анализирует стрелочную функцию.
     */
    analyzeArrowFunction(node) {
        const paramTypes = node.params.map(() => new Type(TypeKind.UNKNOWN));
        
        const functionEnv = this.currentEnv.extend();
        const previousEnv = this.currentEnv;
        this.currentEnv = functionEnv;
        
        for (let i = 0; i < node.params.length; i++) {
            functionEnv.define(node.params[i].name, paramTypes[i]);
            node.params[i].inferredType = paramTypes[i];
        }
        
        this.analyzeNode(node.body);
        
        const returnType = this.inferReturnType(node.body);
        
        this.currentEnv = previousEnv;
        
        node.inferredType = new Type(TypeKind.FUNCTION, {
            paramTypes: paramTypes,
            returnType: returnType
        });
        
        return node.inferredType;
    }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TypeAnalyzer, Type, TypeKind, TypeEnvironment };
}

if (typeof window !== 'undefined') {
    window.CompilerStage5 = window.CompilerStage5 || {};
    window.CompilerStage5.TypeAnalyzer = TypeAnalyzer;
    window.CompilerStage5.Type = Type;
    window.CompilerStage5.TypeKind = TypeKind;
    window.CompilerStage5.TypeEnvironment = TypeEnvironment;
}
