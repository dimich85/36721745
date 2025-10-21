/**
 * ============================================================================
 * SYNTAX ANALYZER (PARSER) - STAGE 5: REAL WASM COMPILATION
 * ============================================================================
 * 
 * Парсер - это вторая фаза компилятора, которая превращает плоский список
 * токенов в иерархическую структуру данных, называемую Abstract Syntax Tree
 * (AST) - абстрактное синтаксическое дерево.
 * 
 * МЕТАФОРА ПОНИМАНИЯ:
 * 
 * Представьте, что вы читаете предложение на естественном языке:
 * 
 *   "Кошка ест рыбу."
 * 
 * Лексер разбил это на слова: ["Кошка", "ест", "рыбу", "."]
 * 
 * Но для понимания смысла нам нужна структура. Парсер анализирует
 * грамматическую структуру:
 * 
 *   Предложение
 *   ├── Подлежащее: "Кошка"
 *   ├── Сказуемое: "ест"
 *   └── Дополнение: "рыбу"
 * 
 * То же самое с кодом. Для выражения "a + b * c" лексер даёт нам токены:
 * [a, +, b, *, c]. Но чтобы правильно вычислить это выражение, нам нужно
 * знать структуру - что умножение имеет более высокий приоритет, чем сложение:
 * 
 *   BinaryExpression(+)
 *   ├── left: Identifier(a)
 *   └── right: BinaryExpression(*)
 *       ├── left: Identifier(b)
 *       └── right: Identifier(c)
 * 
 * Это дерево явно показывает, что сначала нужно вычислить b * c, затем
 * добавить результат к a.
 * 
 * ГРАММАТИКА И РАЗБОР:
 * 
 * Парсер работает на основе грамматики языка - набора правил, описывающих,
 * какие конструкции допустимы. Грамматика обычно записывается в форме
 * Бэкуса-Наура (BNF) или расширенной BNF (EBNF).
 * 
 * Например, правило для функции в упрощённом виде:
 * 
 *   FunctionDeclaration = "function" Identifier "(" Parameters ")" Block
 *   Parameters = Identifier ("," Identifier)*
 *   Block = "{" Statement* "}"
 * 
 * Это читается как: "Объявление функции состоит из ключевого слова function,
 * за которым следует имя (идентификатор), затем открывающая скобка, список
 * параметров, закрывающая скобка, и тело функции в фигурных скобках."
 * 
 * Парсер реализует эти правила как взаимно рекурсивные функции. Когда мы
 * видим токен "function", вызываем функцию parseFunctionDeclaration(), которая
 * ожидает увидеть определённую последовательность токенов согласно грамматике.
 * 
 * RECURSIVE DESCENT PARSING:
 * 
 * Мы используем технику, называемую "recursive descent parsing" - рекурсивный
 * нисходящий разбор. Это самый интуитивный способ написания парсера. Для
 * каждого правила грамматики мы пишем функцию, которая:
 * 
 * 1. Проверяет, что текущий токен соответствует ожидаемому
 * 2. Продвигается к следующему токену
 * 3. Рекурсивно вызывает функции для вложенных конструкций
 * 4. Строит и возвращает узел AST
 * 
 * Например, для разбора выражения "a + b":
 * 
 *   parseExpression() видит идентификатор "a"
 *   → вызывает parsePrimaryExpression() для "a"
 *   → видит оператор "+"
 *   → вызывает parseExpression() для правой части
 *   → та вызывает parsePrimaryExpression() для "b"
 *   → возвращает BinaryExpression(+, a, b)
 * 
 * ПРИОРИТЕТ ОПЕРАТОРОВ:
 * 
 * Одна из сложностей разбора выражений - правильная обработка приоритетов
 * операторов. В математике умножение имеет более высокий приоритет, чем
 * сложение, поэтому 2 + 3 * 4 = 2 + 12 = 14, а не (2 + 3) * 4 = 20.
 * 
 * Мы обрабатываем это через иерархию функций разбора. Функция для операторов
 * с более низким приоритетом вызывает функцию для операторов с более высоким
 * приоритетом. Это гарантирует правильную структуру дерева.
 */

/**
 * AST Node Types - типы узлов абстрактного синтаксического дерева.
 * 
 * Каждый тип узла представляет определённую синтаксическую конструкцию
 * языка. Узел содержит всю информацию, необходимую для понимания и
 * компиляции этой конструкции.
 */
const ASTNodeType = {
    // Программа - корневой узел всего дерева
    PROGRAM: 'Program',
    
    // Объявления
    FUNCTION_DECLARATION: 'FunctionDeclaration',
    VARIABLE_DECLARATION: 'VariableDeclaration',
    
    // Операторы (statements)
    BLOCK_STATEMENT: 'BlockStatement',
    RETURN_STATEMENT: 'ReturnStatement',
    IF_STATEMENT: 'IfStatement',
    WHILE_STATEMENT: 'WhileStatement',
    FOR_STATEMENT: 'ForStatement',
    EXPRESSION_STATEMENT: 'ExpressionStatement',
    
    // Выражения (expressions)
    BINARY_EXPRESSION: 'BinaryExpression',
    UNARY_EXPRESSION: 'UnaryExpression',
    ASSIGNMENT_EXPRESSION: 'AssignmentExpression',
    CALL_EXPRESSION: 'CallExpression',
    MEMBER_EXPRESSION: 'MemberExpression',
    CONDITIONAL_EXPRESSION: 'ConditionalExpression',
    ARROW_FUNCTION_EXPRESSION: 'ArrowFunctionExpression',
    
    // Литералы и идентификаторы
    IDENTIFIER: 'Identifier',
    NUMBER_LITERAL: 'NumberLiteral',
    STRING_LITERAL: 'StringLiteral',
    BOOLEAN_LITERAL: 'BooleanLiteral',
    NULL_LITERAL: 'NullLiteral'
};

/**
 * Parser - синтаксический анализатор.
 * 
 * Берёт список токенов от лексера и строит AST. Парсер отслеживает текущую
 * позицию в списке токенов и предоставляет методы для проверки и потребления
 * токенов.
 * 
 * Парсер работает как автомат с состоянием. Состояние - это текущая позиция
 * в списке токенов. Каждый раз, когда мы успешно разбираем конструкцию,
 * позиция продвигается вперёд.
 */
class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.current = 0;  // Текущая позиция в списке токенов
    }
    
    /**
     * Возвращает текущий токен без продвижения позиции.
     * 
     * Это аналог peek() в лексере. Позволяет "заглянуть вперёд" и принять
     * решение о том, какое правило грамматики применить, не потребляя токен.
     */
    peek(offset = 0) {
        const pos = this.current + offset;
        if (pos >= this.tokens.length) {
            return this.tokens[this.tokens.length - 1]; // Токен EOF
        }
        return this.tokens[pos];
    }
    
    /**
     * Возвращает текущий токен и продвигает позицию.
     * 
     * Это основная операция потребления токена. После вызова advance()
     * текущий токен становится следующим в списке.
     */
    advance() {
        if (this.current < this.tokens.length - 1) {
            this.current++;
        }
        return this.tokens[this.current - 1];
    }
    
    /**
     * Проверяет, является ли текущий токен ожидаемого типа.
     * 
     * Возвращает true, если текущий токен имеет указанный тип, иначе false.
     * Не продвигает позицию - только проверяет.
     */
    check(type) {
        return this.peek().type === type;
    }
    
    /**
     * Проверяет и потребляет токен ожидаемого типа.
     * 
     * Если текущий токен имеет ожидаемый тип, продвигаем позицию и возвращаем
     * токен. Если нет - возвращаем null. Это "мягкий" способ потребления
     * токена, который не вызывает ошибку, если токен не соответствует.
     */
    match(...types) {
        for (const type of types) {
            if (this.check(type)) {
                return this.advance();
            }
        }
        return null;
    }
    
    /**
     * Требует, чтобы текущий токен был указанного типа.
     * 
     * Это "жёсткий" способ потребления токена. Если текущий токен не того
     * типа, который мы ожидаем, это синтаксическая ошибка, и мы выбрасываем
     * исключение. Используется, когда грамматика требует конкретный токен.
     */
    expect(type, message) {
        const token = this.peek();
        if (token.type !== type) {
            throw new Error(
                `${message || 'Неожиданный токен'}: ожидался ${type}, ` +
                `получен ${token.type} на строке ${token.line}:${token.column}`
            );
        }
        return this.advance();
    }
    
    /**
     * Проверяет, достигли ли мы конца файла.
     */
    isAtEnd() {
        return this.peek().type === 'EOF';
    }
    
    /**
     * Главная точка входа - разбирает программу целиком.
     * 
     * Программа состоит из последовательности объявлений (функций, переменных)
     * и операторов. Мы разбираем их один за другим, пока не достигнем конца файла.
     * 
     * @returns {Object} - Узел Program, корень всего AST
     */
    parse() {
        const body = [];
        
        while (!this.isAtEnd()) {
            try {
                body.push(this.parseDeclarationOrStatement());
            } catch (error) {
                // Обработка ошибок: пытаемся восстановиться и продолжить разбор
                console.error('Ошибка парсинга:', error.message);
                this.synchronize();
            }
        }
        
        return {
            type: ASTNodeType.PROGRAM,
            body: body
        };
    }
    
    /**
     * Синхронизация после ошибки.
     * 
     * Когда мы встречаем синтаксическую ошибку, мы не хотим останавливать
     * весь разбор. Вместо этого мы пытаемся "синхронизироваться" - найти
     * точку, где можем продолжить разбор. Обычно это граница операторов
     * (точка с запятой) или начало новой конструкции (ключевое слово).
     */
    synchronize() {
        this.advance();
        
        while (!this.isAtEnd()) {
            // Если предыдущий токен был точкой с запятой, мы на границе оператора
            if (this.tokens[this.current - 1].type === 'SEMICOLON') {
                return;
            }
            
            // Если текущий токен - начало новой конструкции
            const currentType = this.peek().type;
            if (['FUNCTION', 'VAR', 'LET', 'CONST', 'IF', 'WHILE', 'FOR', 'RETURN'].includes(currentType)) {
                return;
            }
            
            this.advance();
        }
    }
    
    /**
     * Разбирает объявление или оператор.
     * 
     * На верхнем уровне программы могут быть объявления функций, переменных,
     * или отдельные операторы. Мы смотрим на текущий токен и решаем, какую
     * функцию разбора вызвать.
     */
    parseDeclarationOrStatement() {
        // Объявление функции
        if (this.check('FUNCTION')) {
            return this.parseFunctionDeclaration();
        }
        
        // Объявление переменной
        if (this.check('VAR') || this.check('LET') || this.check('CONST')) {
            return this.parseVariableDeclaration();
        }
        
        // Иначе это оператор
        return this.parseStatement();
    }
    
    /**
     * Разбирает объявление функции.
     * 
     * Грамматика:
     *   function identifier(parameters) { body }
     * 
     * Где parameters - это список идентификаторов, разделённых запятыми,
     * а body - это блок операторов.
     */
    parseFunctionDeclaration() {
        this.expect('FUNCTION');
        
        const name = this.expect('IDENTIFIER', 'Ожидается имя функции');
        
        this.expect('LPAREN', 'Ожидается ( после имени функции');
        
        // Разбираем параметры
        const params = [];
        if (!this.check('RPAREN')) {
            do {
                const param = this.expect('IDENTIFIER', 'Ожидается имя параметра');
                params.push({
                    type: ASTNodeType.IDENTIFIER,
                    name: param.value
                });
            } while (this.match('COMMA'));
        }
        
        this.expect('RPAREN', 'Ожидается ) после параметров');
        
        // Разбираем тело функции
        const body = this.parseBlockStatement();
        
        return {
            type: ASTNodeType.FUNCTION_DECLARATION,
            name: name.value,
            params: params,
            body: body
        };
    }
    
    /**
     * Разбирает объявление переменной.
     * 
     * Грамматика:
     *   (var|let|const) identifier = expression;
     * 
     * В JavaScript переменная может быть объявлена без инициализации.
     * Для простоты мы требуем инициализацию для всех переменных.
     */
    parseVariableDeclaration() {
        const kind = this.advance(); // var, let или const
        const name = this.expect('IDENTIFIER', 'Ожидается имя переменной');
        
        let init = null;
        if (this.match('ASSIGN')) {
            init = this.parseExpression();
        }
        
        this.match('SEMICOLON'); // Точка с запятой опциональна в JS
        
        return {
            type: ASTNodeType.VARIABLE_DECLARATION,
            kind: kind.value,
            name: name.value,
            init: init
        };
    }
    
    /**
     * Разбирает оператор.
     * 
     * Операторы - это единицы исполнения программы. Функция, цикл, условие,
     * присваивание - всё это операторы. Мы смотрим на первый токен и решаем,
     * какой тип оператора разбирать.
     */
    parseStatement() {
        if (this.check('LBRACE')) {
            return this.parseBlockStatement();
        }
        
        if (this.check('RETURN')) {
            return this.parseReturnStatement();
        }
        
        if (this.check('IF')) {
            return this.parseIfStatement();
        }
        
        if (this.check('WHILE')) {
            return this.parseWhileStatement();
        }
        
        if (this.check('FOR')) {
            return this.parseForStatement();
        }
        
        // Если ничего из вышеперечисленного, это оператор-выражение
        return this.parseExpressionStatement();
    }
    
    /**
     * Разбирает блок операторов.
     * 
     * Блок - это последовательность операторов, заключённая в фигурные скобки.
     * Блоки создают новую область видимости в JavaScript.
     * 
     * Грамматика: { statement* }
     */
    parseBlockStatement() {
        this.expect('LBRACE');
        
        const statements = [];
        while (!this.check('RBRACE') && !this.isAtEnd()) {
            statements.push(this.parseDeclarationOrStatement());
        }
        
        this.expect('RBRACE', 'Ожидается } в конце блока');
        
        return {
            type: ASTNodeType.BLOCK_STATEMENT,
            body: statements
        };
    }
    
    /**
     * Разбирает оператор return.
     * 
     * Грамматика: return expression?;
     * 
     * Return может быть без выражения (возвращает undefined) или с выражением.
     */
    parseReturnStatement() {
        this.expect('RETURN');
        
        let value = null;
        if (!this.check('SEMICOLON') && !this.isAtEnd()) {
            value = this.parseExpression();
        }
        
        this.match('SEMICOLON');
        
        return {
            type: ASTNodeType.RETURN_STATEMENT,
            value: value
        };
    }
    
    /**
     * Разбирает условный оператор if.
     * 
     * Грамматика: if (condition) thenBranch else? elseBranch
     */
    parseIfStatement() {
        this.expect('IF');
        this.expect('LPAREN');
        
        const condition = this.parseExpression();
        
        this.expect('RPAREN');
        
        const thenBranch = this.parseStatement();
        
        let elseBranch = null;
        if (this.match('ELSE')) {
            elseBranch = this.parseStatement();
        }
        
        return {
            type: ASTNodeType.IF_STATEMENT,
            condition: condition,
            then: thenBranch,
            else: elseBranch
        };
    }
    
    /**
     * Разбирает цикл while.
     * 
     * Грамматика: while (condition) body
     */
    parseWhileStatement() {
        this.expect('WHILE');
        this.expect('LPAREN');
        
        const condition = this.parseExpression();
        
        this.expect('RPAREN');
        
        const body = this.parseStatement();
        
        return {
            type: ASTNodeType.WHILE_STATEMENT,
            condition: condition,
            body: body
        };
    }
    
    /**
     * Разбирает цикл for.
     * 
     * Упрощённая грамматика: for (init; condition; update) body
     * 
     * Полный JavaScript for имеет множество вариантов (for-in, for-of).
     * Для простоты мы поддерживаем только классический C-style for.
     */
    parseForStatement() {
        this.expect('FOR');
        this.expect('LPAREN');
        
        // Инициализация (может быть объявлением или выражением)
        let init = null;
        if (this.check('VAR') || this.check('LET') || this.check('CONST')) {
            init = this.parseVariableDeclaration();
        } else if (!this.check('SEMICOLON')) {
            init = this.parseExpression();
            this.expect('SEMICOLON');
        } else {
            this.advance(); // Пропускаем ;
        }
        
        // Условие
        let condition = null;
        if (!this.check('SEMICOLON')) {
            condition = this.parseExpression();
        }
        this.expect('SEMICOLON');
        
        // Обновление
        let update = null;
        if (!this.check('RPAREN')) {
            update = this.parseExpression();
        }
        
        this.expect('RPAREN');
        
        const body = this.parseStatement();
        
        return {
            type: ASTNodeType.FOR_STATEMENT,
            init: init,
            condition: condition,
            update: update,
            body: body
        };
    }
    
    /**
     * Разбирает оператор-выражение.
     * 
     * Это просто выражение, используемое как оператор. Например:
     *   x = 5;
     *   console.log("hello");
     *   arr.push(42);
     * 
     * Все это выражения, которые стоят сами по себе как операторы.
     */
    parseExpressionStatement() {
        const expr = this.parseExpression();
        this.match('SEMICOLON');
        
        return {
            type: ASTNodeType.EXPRESSION_STATEMENT,
            expression: expr
        };
    }
    
    /**
     * Разбирает выражение.
     * 
     * Это точка входа в иерархию разбора выражений. Выражения имеют
     * сложную структуру с приоритетами операторов. Мы начинаем с
     * самого низкого приоритета (присваивание) и спускаемся вниз.
     */
    parseExpression() {
        return this.parseAssignmentExpression();
    }
    
    /**
     * Разбирает выражение присваивания.
     * 
     * Присваивание имеет самый низкий приоритет среди бинарных операторов.
     * Грамматика: identifier = expression
     * 
     * Правоассоциативность: a = b = c разбирается как a = (b = c)
     */
    parseAssignmentExpression() {
        const left = this.parseLogicalOrExpression();
        
        if (this.match('ASSIGN')) {
            const right = this.parseAssignmentExpression(); // Правоассоциативность
            
            return {
                type: ASTNodeType.ASSIGNMENT_EXPRESSION,
                left: left,
                right: right
            };
        }
        
        return left;
    }
    
    /**
     * Разбирает логическое ИЛИ (||).
     * 
     * Приоритет: ниже, чем && (логическое И)
     */
    parseLogicalOrExpression() {
        let left = this.parseLogicalAndExpression();
        
        while (this.match('LOGICAL_OR')) {
            const operator = this.tokens[this.current - 1].value;
            const right = this.parseLogicalAndExpression();
            
            left = {
                type: ASTNodeType.BINARY_EXPRESSION,
                operator: operator,
                left: left,
                right: right
            };
        }
        
        return left;
    }
    
    /**
     * Разбирает логическое И (&&).
     * 
     * Приоритет: ниже, чем операторы сравнения
     */
    parseLogicalAndExpression() {
        let left = this.parseEqualityExpression();
        
        while (this.match('LOGICAL_AND')) {
            const operator = this.tokens[this.current - 1].value;
            const right = this.parseEqualityExpression();
            
            left = {
                type: ASTNodeType.BINARY_EXPRESSION,
                operator: operator,
                left: left,
                right: right
            };
        }
        
        return left;
    }
    
    /**
     * Разбирает операторы равенства (==, ===, !=, !==).
     * 
     * Приоритет: ниже, чем операторы отношения (<, >, <=, >=)
     */
    parseEqualityExpression() {
        let left = this.parseRelationalExpression();
        
        while (this.match('EQUAL', 'STRICT_EQUAL', 'NOT_EQUAL', 'STRICT_NOT_EQUAL')) {
            const operator = this.tokens[this.current - 1].value;
            const right = this.parseRelationalExpression();
            
            left = {
                type: ASTNodeType.BINARY_EXPRESSION,
                operator: operator,
                left: left,
                right: right
            };
        }
        
        return left;
    }
    
    /**
     * Разбирает операторы отношения (<, >, <=, >=).
     * 
     * Приоритет: ниже, чем арифметические операторы
     */
    parseRelationalExpression() {
        let left = this.parseAdditiveExpression();
        
        while (this.match('LESS_THAN', 'GREATER_THAN', 'LESS_EQUAL', 'GREATER_EQUAL')) {
            const operator = this.tokens[this.current - 1].value;
            const right = this.parseAdditiveExpression();
            
            left = {
                type: ASTNodeType.BINARY_EXPRESSION,
                operator: operator,
                left: left,
                right: right
            };
        }
        
        return left;
    }
    
    /**
     * Разбирает аддитивные выражения (+, -).
     * 
     * Приоритет: ниже, чем мультипликативные (* / %)
     */
    parseAdditiveExpression() {
        let left = this.parseMultiplicativeExpression();
        
        while (this.match('PLUS', 'MINUS')) {
            const operator = this.tokens[this.current - 1].value;
            const right = this.parseMultiplicativeExpression();
            
            left = {
                type: ASTNodeType.BINARY_EXPRESSION,
                operator: operator,
                left: left,
                right: right
            };
        }
        
        return left;
    }
    
    /**
     * Разбирает мультипликативные выражения (*, /, %).
     * 
     * Приоритет: ниже, чем унарные операторы
     */
    parseMultiplicativeExpression() {
        let left = this.parseUnaryExpression();
        
        while (this.match('MULTIPLY', 'DIVIDE', 'MODULO')) {
            const operator = this.tokens[this.current - 1].value;
            const right = this.parseUnaryExpression();
            
            left = {
                type: ASTNodeType.BINARY_EXPRESSION,
                operator: operator,
                left: left,
                right: right
            };
        }
        
        return left;
    }
    
    /**
     * Разбирает унарные выражения (!, -, +).
     * 
     * Унарные операторы применяются к одному операнду и имеют высокий приоритет.
     */
    parseUnaryExpression() {
        if (this.match('LOGICAL_NOT', 'MINUS', 'PLUS')) {
            const operator = this.tokens[this.current - 1].value;
            const argument = this.parseUnaryExpression(); // Рекурсия для цепочек унарных операторов
            
            return {
                type: ASTNodeType.UNARY_EXPRESSION,
                operator: operator,
                argument: argument
            };
        }
        
        return this.parsePostfixExpression();
    }
    
    /**
     * Разбирает постфиксные выражения (вызовы функций, доступ к членам).
     * 
     * foo.bar - доступ к члену
     * foo() - вызов функции
     * foo[bar] - индексация
     * 
     * Эти операторы могут быть цепочными: foo.bar().baz[0]
     */
    parsePostfixExpression() {
        let expr = this.parsePrimaryExpression();
        
        while (true) {
            if (this.match('LPAREN')) {
                // Вызов функции
                const args = [];
                
                if (!this.check('RPAREN')) {
                    do {
                        args.push(this.parseExpression());
                    } while (this.match('COMMA'));
                }
                
                this.expect('RPAREN', 'Ожидается ) после аргументов');
                
                expr = {
                    type: ASTNodeType.CALL_EXPRESSION,
                    callee: expr,
                    arguments: args
                };
            } else if (this.match('DOT')) {
                // Доступ к члену: obj.property
                const property = this.expect('IDENTIFIER', 'Ожидается имя свойства после .');
                
                expr = {
                    type: ASTNodeType.MEMBER_EXPRESSION,
                    object: expr,
                    property: {
                        type: ASTNodeType.IDENTIFIER,
                        name: property.value
                    },
                    computed: false // Не вычисляемое (obj.prop, не obj[prop])
                };
            } else if (this.match('LBRACKET')) {
                // Индексация: obj[index]
                const index = this.parseExpression();
                this.expect('RBRACKET', 'Ожидается ] после индекса');
                
                expr = {
                    type: ASTNodeType.MEMBER_EXPRESSION,
                    object: expr,
                    property: index,
                    computed: true // Вычисляемое (obj[prop])
                };
            } else {
                break;
            }
        }
        
        return expr;
    }
    
    /**
     * Разбирает первичные выражения (литералы, идентификаторы, скобки).
     * 
     * Это "листья" дерева выражений - базовые значения, которые не состоят
     * из более мелких выражений.
     */
    parsePrimaryExpression() {
        // Литералы
        if (this.check('NUMBER')) {
            const token = this.advance();
            return {
                type: ASTNodeType.NUMBER_LITERAL,
                value: token.value
            };
        }
        
        if (this.check('STRING')) {
            const token = this.advance();
            return {
                type: ASTNodeType.STRING_LITERAL,
                value: token.value
            };
        }
        
        if (this.check('TRUE') || this.check('FALSE')) {
            const token = this.advance();
            return {
                type: ASTNodeType.BOOLEAN_LITERAL,
                value: token.value
            };
        }
        
        if (this.check('NULL')) {
            this.advance();
            return {
                type: ASTNodeType.NULL_LITERAL,
                value: null
            };
        }
        
        // Идентификатор
        if (this.check('IDENTIFIER')) {
            const token = this.advance();
            return {
                type: ASTNodeType.IDENTIFIER,
                name: token.value
            };
        }
        
        // Выражение в скобках
        if (this.match('LPAREN')) {
            const expr = this.parseExpression();
            this.expect('RPAREN', 'Ожидается ) после выражения');
            return expr;
        }
        
        // Стрелочная функция (упрощённая версия)
        if (this.check('LPAREN') || this.check('IDENTIFIER')) {
            // Попытка разобрать как стрелочную функцию
            // Это упрощение - полный парсинг стрелочных функций сложнее
            return this.parseArrowFunction();
        }
        
        throw new Error(
            `Неожиданный токен: ${this.peek().type} ` +
            `на строке ${this.peek().line}:${this.peek().column}`
        );
    }
    
    /**
     * Разбирает стрелочную функцию (упрощённая версия).
     * 
     * Полный парсинг стрелочных функций в JavaScript очень сложный из-за
     * неоднозначности. Мы поддерживаем только простые случаи:
     * - x => x * 2
     * - (x, y) => x + y
     */
    parseArrowFunction() {
        const params = [];
        
        if (this.check('IDENTIFIER')) {
            // Один параметр без скобок
            const param = this.advance();
            params.push({
                type: ASTNodeType.IDENTIFIER,
                name: param.value
            });
        } else if (this.match('LPAREN')) {
            // Параметры в скобках
            if (!this.check('RPAREN')) {
                do {
                    const param = this.expect('IDENTIFIER', 'Ожидается имя параметра');
                    params.push({
                        type: ASTNodeType.IDENTIFIER,
                        name: param.value
                    });
                } while (this.match('COMMA'));
            }
            this.expect('RPAREN');
        }
        
        if (this.match('ARROW')) {
            // Тело может быть выражением или блоком
            let body;
            if (this.check('LBRACE')) {
                body = this.parseBlockStatement();
            } else {
                // Выражение автоматически возвращается
                const expr = this.parseExpression();
                body = {
                    type: ASTNodeType.BLOCK_STATEMENT,
                    body: [{
                        type: ASTNodeType.RETURN_STATEMENT,
                        value: expr
                    }]
                };
            }
            
            return {
                type: ASTNodeType.ARROW_FUNCTION_EXPRESSION,
                params: params,
                body: body
            };
        }
        
        // Если не стрелочная функция, возвращаем как идентификатор
        if (params.length === 1) {
            return params[0];
        }
        
        throw new Error('Неожиданная конструкция');
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Parser, ASTNodeType };
}

if (typeof window !== 'undefined') {
    window.CompilerStage5 = window.CompilerStage5 || {};
    window.CompilerStage5.Parser = Parser;
    window.CompilerStage5.ASTNodeType = ASTNodeType;
}
