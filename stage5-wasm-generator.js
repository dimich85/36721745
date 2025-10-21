/**
 * ============================================================================
 * WASM CODE GENERATOR - STAGE 5: REAL WASM COMPILATION
 * ============================================================================
 * 
 * Генератор кода - это финальная фаза компилятора. Мы прошли долгий путь:
 * текст → токены → AST → типизированный AST. Теперь нужно превратить это
 * в реальный исполняемый WebAssembly код.
 * 
 * ТЕКСТОВЫЙ ФОРМАТ WASM (.wat):
 * 
 * WebAssembly имеет два формата:
 * 1. Бинарный (.wasm) - компактный, для исполнения
 * 2. Текстовый (.wat) - человеко-читаемый, для разработки
 * 
 * Мы генерируем текстовый формат, потому что:
 * - Его легче понять и отлаживать
 * - Можно визуализировать промежуточные результаты
 * - Браузеры принимают оба формата
 * - Текстовый формат легко конвертировать в бинарный
 * 
 * Пример WAT кода для функции add:
 * 
 *   (func $add (param $a i32) (param $b i32) (result i32)
 *     local.get $a
 *     local.get $b
 *     i32.add
 *   )
 * 
 * Этот код на стековой машине:
 * 1. Загружаем параметр $a на стек
 * 2. Загружаем параметр $b на стек
 * 3. Выполняем i32.add - снимаем два значения со стека, складываем, кладём результат
 * 
 * СТЕКОВАЯ МАШИНА:
 * 
 * WASM - это стековая виртуальная машина. Все операции работают со стеком:
 * 
 *   Команда         Стек до      Стек после
 *   local.get $a    []           [5]          (если $a = 5)
 *   local.get $b    [5]          [5, 3]       (если $b = 3)
 *   i32.add         [5, 3]       [8]          (снимает 5 и 3, кладёт 8)
 * 
 * Наша задача - превратить дерево выражений в последовательность стековых
 * операций. Для этого мы используем обход дерева в постфиксном порядке
 * (left-right-root), что естественным образом даёт правильный порядок
 * для стековой машины.
 * 
 * МАПИРОВАНИЕ ТИПОВ:
 * 
 * JavaScript типы → WASM типы:
 * - number/integer → i32 или f64
 * - boolean → i32 (0 или 1)
 * - string → externref (остаётся в JS)
 * - object → externref
 * - function → funcref
 */

const WasmType = {
    I32: 'i32',     // 32-битное целое
    I64: 'i64',     // 64-битное целое
    F32: 'f32',     // 32-битное float
    F64: 'f64',     // 64-битное float (double)
    EXTERNREF: 'externref', // Ссылка на JS объект
    FUNCREF: 'funcref'      // Ссылка на функцию
};

/**
 * WasmCodeGenerator - генератор WebAssembly кода.
 * 
 * Проходит по типизированному AST и генерирует текстовый WASM код (.wat).
 * Генератор отслеживает локальные переменные, параметры функций, и управляет
 * стеком операций.
 */
class WasmCodeGenerator {
    constructor() {
        // Аккумулятор для генерируемого кода
        this.output = [];
        
        // Отступы для форматирования
        this.indentLevel = 0;
        
        // Таблица локальных переменных: имя → индекс
        this.locals = new Map();
        
        // Счётчик для уникальных имён
        this.labelCounter = 0;
        this.funcCounter = 0;
        
        // Текущая функция (для генерации return)
        this.currentFunction = null;
    }
    
    /**
     * Генерирует WASM модуль из типизированного AST.
     * 
     * @param {Object} ast - Корневой узел (Program)
     * @returns {string} - WASM текстовый код
     */
    generate(ast) {
        this.output = [];
        this.indentLevel = 0;
        
        // Начинаем модуль
        this.emit('(module');
        this.indent();
        
        // Генерируем импорты (для взаимодействия с JavaScript)
        this.generateImports();
        
        // Генерируем функции
        for (const node of ast.body) {
            if (node.type === 'FunctionDeclaration') {
                this.generateFunction(node);
            }
        }
        
        // Генерируем экспорты
        this.generateExports(ast);
        
        // Закрываем модуль
        this.dedent();
        this.emit(')');
        
        return this.output.join('\n');
    }
    
    /**
     * Генерирует секцию импортов.
     * 
     * WASM модули могут импортировать функции из JavaScript. Это позволяет
     * WASM коду вызывать console.log, работать с DOM и так далее.
     */
    generateImports() {
        // Импортируем console.log для отладки
        this.emit('(import "env" "log" (func $log (param externref)))');
        this.emit('');
    }
    
    /**
     * Генерирует секцию экспортов.
     * 
     * Экспорты делают функции WASM видимыми для JavaScript. Без экспорта
     * JavaScript не сможет вызвать функцию WASM.
     */
    generateExports(ast) {
        this.emit('');
        for (const node of ast.body) {
            if (node.type === 'FunctionDeclaration') {
                this.emit(`(export "${node.name}" (func $${node.name}))`);
            }
        }
    }
    
    /**
     * Генерирует функцию.
     * 
     * Функция в WASM имеет сигнатуру (параметры и результат) и тело.
     * Тело состоит из последовательности инструкций, работающих со стеком.
     */
    generateFunction(node) {
        this.currentFunction = node;
        this.locals.clear();
        
        // Определяем параметры
        let nextLocalIndex = 0;
        for (const param of node.params) {
            this.locals.set(param.name, nextLocalIndex++);
        }
        
        // Собираем все локальные переменные из тела функции
        const localVars = this.collectLocalVariables(node.body);
        for (const varName of localVars) {
            if (!this.locals.has(varName)) {
                this.locals.set(varName, nextLocalIndex++);
            }
        }
        
        // Начинаем объявление функции
        this.emit('');
        this.emit(`(func $${node.name}`);
        this.indent();
        
        // Генерируем параметры
        for (const param of node.params) {
            const wasmType = this.jsTypeToWasm(param.inferredType);
            this.emit(`(param $${param.name} ${wasmType})`);
        }
        
        // Генерируем тип возвращаемого значения
        if (node.inferredType && node.inferredType.returnType) {
            const returnWasmType = this.jsTypeToWasm(node.inferredType.returnType);
            if (returnWasmType !== 'void') {
                this.emit(`(result ${returnWasmType})`);
            }
        }
        
        // Генерируем объявления локальных переменных
        for (const [varName, index] of this.locals) {
            // Пропускаем параметры
            if (index >= node.params.length) {
                // Находим объявление переменной для определения типа
                const varDecl = this.findVariableDeclaration(node.body, varName);
                if (varDecl && varDecl.inferredType) {
                    const wasmType = this.jsTypeToWasm(varDecl.inferredType);
                    this.emit(`(local $${varName} ${wasmType})`);
                }
            }
        }
        
        // Генерируем тело функции
        this.generateStatement(node.body);
        
        this.dedent();
        this.emit(')');
        
        this.currentFunction = null;
    }
    
    /**
     * Собирает все локальные переменные из тела функции.
     */
    collectLocalVariables(node) {
        const vars = new Set();
        
        const visit = (n) => {
            if (!n) return;
            
            if (n.type === 'VariableDeclaration') {
                vars.add(n.name);
            }
            
            // Рекурсивно обходим дерево
            for (const key in n) {
                const child = n[key];
                if (child && typeof child === 'object') {
                    if (Array.isArray(child)) {
                        child.forEach(visit);
                    } else {
                        visit(child);
                    }
                }
            }
        };
        
        visit(node);
        return vars;
    }
    
    /**
     * Находит объявление переменной по имени.
     */
    findVariableDeclaration(node, name) {
        if (!node) return null;
        
        if (node.type === 'VariableDeclaration' && node.name === name) {
            return node;
        }
        
        for (const key in node) {
            const child = node[key];
            if (child && typeof child === 'object') {
                if (Array.isArray(child)) {
                    for (const item of child) {
                        const result = this.findVariableDeclaration(item, name);
                        if (result) return result;
                    }
                } else {
                    const result = this.findVariableDeclaration(child, name);
                    if (result) return result;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Конвертирует JavaScript тип в WASM тип.
     */
    jsTypeToWasm(type) {
        if (!type) return WasmType.I32;
        
        const { TypeKind } = window.CompilerStage5;
        
        switch (type.kind) {
            case TypeKind.INTEGER:
                return WasmType.I32;
            case TypeKind.NUMBER:
                return WasmType.F64;
            case TypeKind.BOOLEAN:
                return WasmType.I32; // 0 или 1
            case TypeKind.STRING:
            case TypeKind.OBJECT:
            case TypeKind.ARRAY:
                return WasmType.EXTERNREF;
            case TypeKind.FUNCTION:
                return WasmType.FUNCREF;
            case TypeKind.VOID:
                return 'void';
            default:
                return WasmType.I32; // По умолчанию
        }
    }
    
    /**
     * Генерирует оператор.
     */
    generateStatement(node) {
        if (!node) return;
        
        switch (node.type) {
            case 'BlockStatement':
                for (const stmt of node.body) {
                    this.generateStatement(stmt);
                }
                break;
            
            case 'ReturnStatement':
                if (node.value) {
                    this.generateExpression(node.value);
                }
                this.emit('return');
                break;
            
            case 'VariableDeclaration':
                if (node.init) {
                    this.generateExpression(node.init);
                    this.emit(`local.set $${node.name}`);
                }
                break;
            
            case 'ExpressionStatement':
                this.generateExpression(node.expression);
                // Если выражение оставило значение на стеке, удаляем его
                if (node.expression.inferredType && 
                    node.expression.inferredType.kind !== 'void') {
                    this.emit('drop');
                }
                break;
            
            case 'IfStatement':
                this.generateIfStatement(node);
                break;
            
            case 'WhileStatement':
                this.generateWhileStatement(node);
                break;
            
            default:
                console.warn(`Неподдерживаемый тип оператора: ${node.type}`);
        }
    }
    
    /**
     * Генерирует условный оператор if.
     * 
     * WASM имеет структурированные управляющие конструкции:
     * (if (condition) (then ...) (else ...))
     */
    generateIfStatement(node) {
        this.emit('(if');
        this.indent();
        
        // Генерируем условие (должно оставить i32 на стеке)
        this.generateExpression(node.condition);
        
        // Then ветка
        this.emit('(then');
        this.indent();
        this.generateStatement(node.then);
        this.dedent();
        this.emit(')');
        
        // Else ветка (если есть)
        if (node.else) {
            this.emit('(else');
            this.indent();
            this.generateStatement(node.else);
            this.dedent();
            this.emit(')');
        }
        
        this.dedent();
        this.emit(')');
    }
    
    /**
     * Генерирует цикл while.
     * 
     * WASM не имеет while напрямую, но имеет block и loop с br_if (условный переход).
     * Мы переводим while в эквивалентную конструкцию с block/loop.
     */
    generateWhileStatement(node) {
        const loopLabel = `$loop_${this.labelCounter++}`;
        const blockLabel = `$block_${this.labelCounter++}`;
        
        this.emit(`(block ${blockLabel}`);
        this.indent();
        this.emit(`(loop ${loopLabel}`);
        this.indent();
        
        // Проверяем условие
        this.generateExpression(node.condition);
        this.emit('i32.eqz'); // Инвертируем (eqz = equal to zero)
        this.emit(`br_if ${blockLabel}`); // Выходим из блока если условие false
        
        // Тело цикла
        this.generateStatement(node.body);
        
        // Возвращаемся к началу цикла
        this.emit(`br ${loopLabel}`);
        
        this.dedent();
        this.emit(')'); // Закрываем loop
        this.dedent();
        this.emit(')'); // Закрываем block
    }
    
    /**
     * Генерирует выражение.
     * 
     * Выражения оставляют значение на стеке. Мы генерируем код в постфиксном
     * порядке, что естественным образом соответствует стековой машине.
     */
    generateExpression(node) {
        if (!node) return;
        
        switch (node.type) {
            case 'NumberLiteral':
                this.generateNumberLiteral(node);
                break;
            
            case 'BooleanLiteral':
                this.emit(`i32.const ${node.value ? 1 : 0}`);
                break;
            
            case 'Identifier':
                this.emit(`local.get $${node.name}`);
                break;
            
            case 'BinaryExpression':
                this.generateBinaryExpression(node);
                break;
            
            case 'UnaryExpression':
                this.generateUnaryExpression(node);
                break;
            
            case 'AssignmentExpression':
                this.generateExpression(node.right);
                this.emit(`local.set $${node.left.name}`);
                this.emit(`local.get $${node.left.name}`); // Присваивание возвращает значение
                break;
            
            case 'CallExpression':
                this.generateCallExpression(node);
                break;
            
            default:
                console.warn(`Неподдерживаемый тип выражения: ${node.type}`);
        }
    }
    
    /**
     * Генерирует числовой литерал.
     */
    generateNumberLiteral(node) {
        const { TypeKind } = window.CompilerStage5;
        
        if (node.inferredType && node.inferredType.kind === TypeKind.INTEGER) {
            this.emit(`i32.const ${Math.floor(node.value)}`);
        } else {
            this.emit(`f64.const ${node.value}`);
        }
    }
    
    /**
     * Генерирует бинарное выражение.
     * 
     * Для бинарной операции:
     * 1. Генерируем левый операнд (оставляет значение на стеке)
     * 2. Генерируем правый операнд (добавляет значение на стек)
     * 3. Генерируем операцию (снимает два значения, кладёт результат)
     */
    generateBinaryExpression(node) {
        const { TypeKind } = window.CompilerStage5;
        
        // Генерируем операнды
        this.generateExpression(node.left);
        this.generateExpression(node.right);
        
        // Определяем, какой тип операции генерировать
        const isInteger = node.inferredType && 
                         node.inferredType.kind === TypeKind.INTEGER;
        const prefix = isInteger ? 'i32' : 'f64';
        
        // Генерируем операцию
        switch (node.operator) {
            case '+':
                this.emit(`${prefix}.add`);
                break;
            case '-':
                this.emit(`${prefix}.sub`);
                break;
            case '*':
                this.emit(`${prefix}.mul`);
                break;
            case '/':
                if (isInteger) {
                    this.emit('i32.div_s'); // Signed division
                } else {
                    this.emit('f64.div');
                }
                break;
            case '%':
                if (isInteger) {
                    this.emit('i32.rem_s'); // Remainder (signed)
                } else {
                    // f64 не имеет rem, нужно использовать формулу
                    console.warn('Modulo для float не реализовано');
                }
                break;
            
            // Операторы сравнения
            case '<':
                this.emit(isInteger ? 'i32.lt_s' : 'f64.lt');
                break;
            case '>':
                this.emit(isInteger ? 'i32.gt_s' : 'f64.gt');
                break;
            case '<=':
                this.emit(isInteger ? 'i32.le_s' : 'f64.le');
                break;
            case '>=':
                this.emit(isInteger ? 'i32.ge_s' : 'f64.ge');
                break;
            case '==':
            case '===':
                this.emit(isInteger ? 'i32.eq' : 'f64.eq');
                break;
            case '!=':
            case '!==':
                this.emit(isInteger ? 'i32.ne' : 'f64.ne');
                break;
            
            // Логические операторы (уже работают с i32)
            case '&&':
                this.emit('i32.and');
                break;
            case '||':
                this.emit('i32.or');
                break;
            
            default:
                console.warn(`Неподдерживаемый оператор: ${node.operator}`);
        }
    }
    
    /**
     * Генерирует унарное выражение.
     */
    generateUnaryExpression(node) {
        this.generateExpression(node.argument);
        
        if (node.operator === '-') {
            const isInteger = node.inferredType && 
                             node.inferredType.kind === 'integer';
            // Унарный минус = 0 - значение
            if (isInteger) {
                this.emit('i32.const 0');
                this.emit('i32.sub');
            } else {
                this.emit('f64.const 0');
                this.emit('f64.sub');
            }
        } else if (node.operator === '!') {
            // Логическое НЕ
            this.emit('i32.eqz');
        }
    }
    
    /**
     * Генерирует вызов функции.
     * 
     * В простейшем случае - просто генерируем аргументы и инструкцию call.
     * Для вызовов импортированных функций или методов объектов нужна
     * более сложная логика.
     */
    generateCallExpression(node) {
        // Генерируем аргументы (они окажутся на стеке)
        for (const arg of node.arguments) {
            this.generateExpression(arg);
        }
        
        // Генерируем вызов
        if (node.callee.type === 'Identifier') {
            this.emit(`call $${node.callee.name}`);
        } else {
            console.warn('Сложные вызовы функций не реализованы');
        }
    }
    
    /**
     * Вспомогательные методы для форматирования.
     */
    emit(code) {
        const indent = '  '.repeat(this.indentLevel);
        this.output.push(indent + code);
    }
    
    indent() {
        this.indentLevel++;
    }
    
    dedent() {
        this.indentLevel = Math.max(0, this.indentLevel - 1);
    }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WasmCodeGenerator, WasmType };
}

if (typeof window !== 'undefined') {
    window.CompilerStage5 = window.CompilerStage5 || {};
    window.CompilerStage5.WasmCodeGenerator = WasmCodeGenerator;
    window.CompilerStage5.WasmType = WasmType;
}
