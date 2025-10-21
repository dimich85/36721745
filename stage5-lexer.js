/**
 * ============================================================================
 * STAGE 5: REAL WASM COMPILER - LEXER (BROWSER-COMPATIBLE VERSION)
 * ============================================================================
 * 
 * Это версия лексера, написанная для максимальной совместимости с различными
 * браузерами. Не использует современные JavaScript фичи, которые могут не
 * поддерживаться в некоторых окружениях.
 */

// Типы токенов
var TokenType = {
    // Ключевые слова
    FUNCTION: 'FUNCTION',
    RETURN: 'RETURN',
    IF: 'IF',
    ELSE: 'ELSE',
    FOR: 'FOR',
    WHILE: 'WHILE',
    LET: 'LET',
    CONST: 'CONST',
    
    // Литералы
    IDENTIFIER: 'IDENTIFIER',
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    TRUE: 'TRUE',
    FALSE: 'FALSE',
    
    // Операторы
    PLUS: 'PLUS',
    MINUS: 'MINUS',
    MULTIPLY: 'MULTIPLY',
    DIVIDE: 'DIVIDE',
    MODULO: 'MODULO',
    
    ASSIGN: 'ASSIGN',
    EQUAL: 'EQUAL',
    NOT_EQUAL: 'NOT_EQUAL',
    LESS_THAN: 'LESS_THAN',
    GREATER_THAN: 'GREATER_THAN',
    LESS_EQUAL: 'LESS_EQUAL',
    GREATER_EQUAL: 'GREATER_EQUAL',
    
    LOGICAL_AND: 'LOGICAL_AND',
    LOGICAL_OR: 'LOGICAL_OR',
    LOGICAL_NOT: 'LOGICAL_NOT',
    
    // Пунктуация
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    LBRACE: 'LBRACE',
    RBRACE: 'RBRACE',
    SEMICOLON: 'SEMICOLON',
    COMMA: 'COMMA',
    
    // Специальные
    EOF: 'EOF',
    NEWLINE: 'NEWLINE'
};

/**
 * Token - представляет один токен в исходном коде
 */
function Token(type, value, line, column) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.column = column;
}

Token.prototype.toString = function() {
    if (this.value !== null && this.value !== undefined) {
        return 'Token(' + this.type + ', "' + this.value + '", ' + this.line + ':' + this.column + ')';
    }
    return 'Token(' + this.type + ', ' + this.line + ':' + this.column + ')';
};

/**
 * Lexer - лексический анализатор
 */
function Lexer(source) {
    this.source = source;
    this.position = 0;
    this.line = 1;
    this.column = 1;
    
    // Ключевые слова
    this.keywords = {
        'function': TokenType.FUNCTION,
        'return': TokenType.RETURN,
        'if': TokenType.IF,
        'else': TokenType.ELSE,
        'for': TokenType.FOR,
        'while': TokenType.WHILE,
        'let': TokenType.LET,
        'const': TokenType.CONST,
        'true': TokenType.TRUE,
        'false': TokenType.FALSE
    };
}

/**
 * Возвращает текущий символ без продвижения позиции
 */
Lexer.prototype.peek = function() {
    if (this.position >= this.source.length) {
        return null;
    }
    return this.source[this.position];
};

/**
 * Возвращает символ на N позиций вперёд
 */
Lexer.prototype.peekAhead = function(n) {
    var pos = this.position + n;
    if (pos >= this.source.length) {
        return null;
    }
    return this.source[pos];
};

/**
 * Продвигает позицию на один символ вперёд
 */
Lexer.prototype.advance = function() {
    if (this.position >= this.source.length) {
        return null;
    }
    
    var char = this.source[this.position];
    this.position++;
    
    if (char === '\n') {
        this.line++;
        this.column = 1;
    } else {
        this.column++;
    }
    
    return char;
};

/**
 * Пропускает пробельные символы
 */
Lexer.prototype.skipWhitespace = function() {
    while (this.peek() !== null) {
        var char = this.peek();
        if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
            this.advance();
        } else {
            break;
        }
    }
};

/**
 * Пропускает однострочный комментарий
 */
Lexer.prototype.skipSingleLineComment = function() {
    this.advance();  // Первый /
    this.advance();  // Второй /
    
    while (this.peek() !== null && this.peek() !== '\n') {
        this.advance();
    }
};

/**
 * Проверяет, является ли символ цифрой
 */
Lexer.prototype.isDigit = function(char) {
    return char >= '0' && char <= '9';
};

/**
 * Проверяет, является ли символ буквой или подчёркиванием
 */
Lexer.prototype.isLetter = function(char) {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
};

/**
 * Проверяет, является ли символ буквой, цифрой или подчёркиванием
 */
Lexer.prototype.isAlphanumeric = function(char) {
    return this.isLetter(char) || this.isDigit(char);
};

/**
 * Читает число
 */
Lexer.prototype.readNumber = function() {
    var startLine = this.line;
    var startColumn = this.column;
    var numStr = '';
    
    // Читаем цифры до точки
    while (this.peek() !== null && this.isDigit(this.peek())) {
        numStr += this.advance();
    }
    
    // Проверяем десятичную часть
    if (this.peek() === '.' && this.peekAhead(1) && this.isDigit(this.peekAhead(1))) {
        numStr += this.advance();  // Добавляем точку
        
        while (this.peek() !== null && this.isDigit(this.peek())) {
            numStr += this.advance();
        }
    }
    
    return new Token(TokenType.NUMBER, parseFloat(numStr), startLine, startColumn);
};

/**
 * Читает идентификатор или ключевое слово
 */
Lexer.prototype.readIdentifier = function() {
    var startLine = this.line;
    var startColumn = this.column;
    var identifier = '';
    
    identifier += this.advance();
    
    while (this.peek() !== null && this.isAlphanumeric(this.peek())) {
        identifier += this.advance();
    }
    
    var tokenType = this.keywords[identifier] || TokenType.IDENTIFIER;
    
    return new Token(tokenType, identifier, startLine, startColumn);
};

/**
 * Читает строковый литерал
 */
Lexer.prototype.readString = function() {
    var startLine = this.line;
    var startColumn = this.column;
    var quote = this.advance();
    var str = '';
    
    while (this.peek() !== null && this.peek() !== quote) {
        var char = this.advance();
        
        if (char === '\\') {
            var nextChar = this.advance();
            if (nextChar === 'n') {
                str += '\n';
            } else if (nextChar === 't') {
                str += '\t';
            } else if (nextChar === 'r') {
                str += '\r';
            } else if (nextChar === '\\') {
                str += '\\';
            } else if (nextChar === quote) {
                str += quote;
            } else {
                str += nextChar;
            }
        } else {
            str += char;
        }
    }
    
    if (this.peek() === quote) {
        this.advance();
    } else {
        throw new Error('Незакрытая строка на строке ' + startLine + ':' + startColumn);
    }
    
    return new Token(TokenType.STRING, str, startLine, startColumn);
};

/**
 * Возвращает следующий токен
 */
Lexer.prototype.nextToken = function() {
    while (true) {
        this.skipWhitespace();
        
        if (this.peek() === '/' && this.peekAhead(1) === '/') {
            this.skipSingleLineComment();
        } else {
            break;
        }
    }
    
    if (this.peek() === null) {
        return new Token(TokenType.EOF, null, this.line, this.column);
    }
    
    var startLine = this.line;
    var startColumn = this.column;
    var char = this.peek();
    
    // Числа
    if (this.isDigit(char)) {
        return this.readNumber();
    }
    
    // Идентификаторы и ключевые слова
    if (this.isLetter(char)) {
        return this.readIdentifier();
    }
    
    // Строки
    if (char === '"' || char === "'") {
        return this.readString();
    }
    
    // Двухсимвольные операторы
    if (char === '=' && this.peekAhead(1) === '=') {
        this.advance();
        this.advance();
        return new Token(TokenType.EQUAL, '==', startLine, startColumn);
    }
    
    if (char === '!' && this.peekAhead(1) === '=') {
        this.advance();
        this.advance();
        return new Token(TokenType.NOT_EQUAL, '!=', startLine, startColumn);
    }
    
    if (char === '<' && this.peekAhead(1) === '=') {
        this.advance();
        this.advance();
        return new Token(TokenType.LESS_EQUAL, '<=', startLine, startColumn);
    }
    
    if (char === '>' && this.peekAhead(1) === '=') {
        this.advance();
        this.advance();
        return new Token(TokenType.GREATER_EQUAL, '>=', startLine, startColumn);
    }
    
    if (char === '&' && this.peekAhead(1) === '&') {
        this.advance();
        this.advance();
        return new Token(TokenType.LOGICAL_AND, '&&', startLine, startColumn);
    }
    
    if (char === '|' && this.peekAhead(1) === '|') {
        this.advance();
        this.advance();
        return new Token(TokenType.LOGICAL_OR, '||', startLine, startColumn);
    }
    
    // Односимвольные операторы и пунктуация
    this.advance();
    
    if (char === '+') return new Token(TokenType.PLUS, '+', startLine, startColumn);
    if (char === '-') return new Token(TokenType.MINUS, '-', startLine, startColumn);
    if (char === '*') return new Token(TokenType.MULTIPLY, '*', startLine, startColumn);
    if (char === '/') return new Token(TokenType.DIVIDE, '/', startLine, startColumn);
    if (char === '%') return new Token(TokenType.MODULO, '%', startLine, startColumn);
    if (char === '=') return new Token(TokenType.ASSIGN, '=', startLine, startColumn);
    if (char === '<') return new Token(TokenType.LESS_THAN, '<', startLine, startColumn);
    if (char === '>') return new Token(TokenType.GREATER_THAN, '>', startLine, startColumn);
    if (char === '!') return new Token(TokenType.LOGICAL_NOT, '!', startLine, startColumn);
    if (char === '(') return new Token(TokenType.LPAREN, '(', startLine, startColumn);
    if (char === ')') return new Token(TokenType.RPAREN, ')', startLine, startColumn);
    if (char === '{') return new Token(TokenType.LBRACE, '{', startLine, startColumn);
    if (char === '}') return new Token(TokenType.RBRACE, '}', startLine, startColumn);
    if (char === ';') return new Token(TokenType.SEMICOLON, ';', startLine, startColumn);
    if (char === ',') return new Token(TokenType.COMMA, ',', startLine, startColumn);
    
    throw new Error('Неизвестный символ "' + char + '" на строке ' + startLine + ':' + startColumn);
};

/**
 * Возвращает все токены как массив
 */
Lexer.prototype.tokenize = function() {
    var tokens = [];
    
    while (true) {
        var token = this.nextToken();
        tokens.push(token);
        
        if (token.type === TokenType.EOF) {
            break;
        }
    }
    
    return tokens;
};

// Экспорт для использования в браузере
if (typeof window !== 'undefined') {
    window.CompilerStage5 = window.CompilerStage5 || {};
    window.CompilerStage5.Lexer = Lexer;
    window.CompilerStage5.Token = Token;
    window.CompilerStage5.TokenType = TokenType;
}

// Экспорт для Node.js (если используется)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Lexer: Lexer, Token: Token, TokenType: TokenType };
}
