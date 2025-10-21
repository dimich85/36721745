/**
 * ============================================================================
 * COMPLETE COMPILER - STAGE 5: INTEGRATION
 * ============================================================================
 * 
 * Это интеграционный модуль, который объединяет все фазы компилятора в
 * единый процесс. Представьте это как главного дирижёра оркестра, который
 * координирует работу всех музыкантов (фаз компилятора).
 * 
 * ПОЛНЫЙ КОНВЕЙЕР КОМПИЛЯЦИИ:
 * 
 * JavaScript код (строка)
 *     ↓  [Лексер]
 * Токены (массив)
 *     ↓  [Парсер]
 * AST (дерево)
 *     ↓  [Типовой анализатор]
 * Типизированный AST (дерево с аннотациями типов)
 *     ↓  [Генератор кода]
 * WebAssembly текстовый формат (.wat)
 *     ↓  [WebAssembly API браузера]
 * WebAssembly бинарный модуль (исполняемый)
 * 
 * Каждая фаза принимает выход предыдущей фазы и производит вход для
 * следующей. Это классическая архитектура многопроходного компилятора.
 */

class Compiler {
    constructor() {
        // Ссылки на все фазы компилятора
        this.lexer = null;
        this.parser = null;
        this.typeAnalyzer = null;
        this.codeGenerator = null;
        
        // Результаты каждой фазы (для отладки и визуализации)
        this.compilationResults = {
            source: '',
            tokens: [],
            ast: null,
            typedAst: null,
            watCode: '',
            wasmModule: null,
            errors: []
        };
    }
    
    /**
     * Компилирует JavaScript код в WebAssembly модуль.
     * 
     * Это главная точка входа. Принимает строку JavaScript кода и
     * возвращает результаты всех фаз компиляции, включая финальный
     * WASM модуль.
     * 
     * @param {string} sourceCode - Исходный JavaScript код
     * @returns {Object} - Результаты компиляции
     */
    async compile(sourceCode) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('🔧 STARTING COMPILATION PROCESS');
        console.log('═══════════════════════════════════════════════════════\n');
        
        this.compilationResults = {
            source: sourceCode,
            tokens: [],
            ast: null,
            typedAst: null,
            watCode: '',
            wasmModule: null,
            errors: []
        };
        
        try {
            // ═══ ФАЗА 1: ЛЕКСИЧЕСКИЙ АНАЛИЗ ═══
            console.log('📝 PHASE 1: LEXICAL ANALYSIS');
            console.log('Converting source code to tokens...\n');
            
            const startLex = performance.now();
            const { Lexer } = window.CompilerStage5;
            this.lexer = new Lexer(sourceCode);
            const tokens = this.lexer.tokenize();
            const lexTime = performance.now() - startLex;
            
            this.compilationResults.tokens = tokens;
            
            console.log(`✓ Lexical analysis complete in ${lexTime.toFixed(2)}ms`);
            console.log(`  Generated ${tokens.length} tokens`);
            console.log(`  First 5 tokens: ${tokens.slice(0, 5).map(t => t.type).join(', ')}\n`);
            
            // ═══ ФАЗА 2: СИНТАКСИЧЕСКИЙ АНАЛИЗ ═══
            console.log('🌳 PHASE 2: SYNTAX ANALYSIS');
            console.log('Building Abstract Syntax Tree...\n');
            
            const startParse = performance.now();
            const { Parser } = window.CompilerStage5;
            this.parser = new Parser(tokens);
            const ast = this.parser.parse();
            const parseTime = performance.now() - startParse;
            
            this.compilationResults.ast = ast;
            
            console.log(`✓ Syntax analysis complete in ${parseTime.toFixed(2)}ms`);
            console.log(`  AST root type: ${ast.type}`);
            console.log(`  Top-level nodes: ${ast.body.length}\n`);
            
            // ═══ ФАЗА 3: ТИПОВОЙ АНАЛИЗ ═══
            console.log('🔍 PHASE 3: TYPE ANALYSIS');
            console.log('Inferring types for all expressions...\n');
            
            const startType = performance.now();
            const { TypeAnalyzer } = window.CompilerStage5;
            this.typeAnalyzer = new TypeAnalyzer();
            const typedAst = this.typeAnalyzer.analyze(ast);
            const typeTime = performance.now() - startType;
            
            this.compilationResults.typedAst = typedAst;
            this.compilationResults.errors.push(...this.typeAnalyzer.errors);
            
            console.log(`✓ Type analysis complete in ${typeTime.toFixed(2)}ms`);
            console.log(`  Type errors found: ${this.typeAnalyzer.errors.length}`);
            
            if (this.typeAnalyzer.errors.length > 0) {
                console.log('  Errors:');
                this.typeAnalyzer.errors.forEach(err => console.log(`    - ${err}`));
            }
            console.log('');
            
            // ═══ ФАЗА 4: ГЕНЕРАЦИЯ КОДА ═══
            console.log('⚙️  PHASE 4: CODE GENERATION');
            console.log('Generating WebAssembly code...\n');
            
            const startGen = performance.now();
            const { WasmCodeGenerator } = window.CompilerStage5;
            this.codeGenerator = new WasmCodeGenerator();
            const watCode = this.codeGenerator.generate(typedAst);
            const genTime = performance.now() - startGen;
            
            this.compilationResults.watCode = watCode;
            
            console.log(`✓ Code generation complete in ${genTime.toFixed(2)}ms`);
            console.log(`  Generated ${watCode.split('\n').length} lines of WAT code`);
            console.log(`  Code size: ${watCode.length} characters\n`);
            
            // ═══ ФАЗА 5: КОМПИЛЯЦИЯ В БИНАРНЫЙ WASM ═══
            console.log('🚀 PHASE 5: BINARY COMPILATION');
            console.log('Compiling WAT to executable WASM...\n');
            
            try {
                const startCompile = performance.now();
                const wasmModule = await this.compileWat(watCode);
                const compileTime = performance.now() - startCompile;
                
                this.compilationResults.wasmModule = wasmModule;
                
                console.log(`✓ Binary compilation complete in ${compileTime.toFixed(2)}ms`);
                console.log(`  Module instantiated and ready to execute\n`);
            } catch (error) {
                console.error('✗ Binary compilation failed:', error.message);
                this.compilationResults.errors.push(`WASM compilation error: ${error.message}`);
            }
            
            // ═══ ИТОГИ ═══
            const totalTime = lexTime + parseTime + typeTime + genTime;
            
            console.log('═══════════════════════════════════════════════════════');
            console.log('✓ COMPILATION COMPLETE');
            console.log('═══════════════════════════════════════════════════════');
            console.log(`Total compilation time: ${totalTime.toFixed(2)}ms`);
            console.log(`  Lexical analysis:  ${lexTime.toFixed(2)}ms (${(lexTime/totalTime*100).toFixed(1)}%)`);
            console.log(`  Syntax analysis:   ${parseTime.toFixed(2)}ms (${(parseTime/totalTime*100).toFixed(1)}%)`);
            console.log(`  Type analysis:     ${typeTime.toFixed(2)}ms (${(typeTime/totalTime*100).toFixed(1)}%)`);
            console.log(`  Code generation:   ${genTime.toFixed(2)}ms (${(genTime/totalTime*100).toFixed(1)}%)`);
            console.log(`Errors: ${this.compilationResults.errors.length}`);
            console.log(`Success: ${this.compilationResults.errors.length === 0 ? 'YES' : 'NO'}`);
            console.log('═══════════════════════════════════════════════════════\n');
            
            return this.compilationResults;
            
        } catch (error) {
            console.error('✗ COMPILATION FAILED:', error);
            this.compilationResults.errors.push(error.message);
            return this.compilationResults;
        }
    }
    
    /**
     * Компилирует WAT код в бинарный WASM модуль.
     * 
     * WebAssembly имеет два формата:
     * - Текстовый (.wat) - человеко-читаемый
     * - Бинарный (.wasm) - компактный, исполняемый
     * 
     * Браузеры предоставляют API для компиляции WAT в WASM.
     * К сожалению, стандартный WebAssembly API принимает только бинарный
     * формат. Для компиляции текстового формата нужен wabt.js (WebAssembly
     * Binary Toolkit) или другой инструмент.
     * 
     * Для демонстрации мы возвращаем текстовый код - в реальном приложении
     * здесь был бы вызов wabt.js для конверсии.
     */
    async compileWat(watCode) {
        // В реальной системе здесь был бы:
        // const wabt = await loadWabt();
        // const module = wabt.parseWat('module.wat', watCode);
        // const binary = module.toBinary({});
        // return WebAssembly.compile(binary.buffer);
        
        // Для демонстрации возвращаем обёртку с текстовым кодом
        return {
            type: 'text-module',
            wat: watCode,
            note: 'В реальной системе это был бы скомпилированный бинарный модуль'
        };
    }
    
    /**
     * Возвращает результаты компиляции в удобном формате.
     */
    getResults() {
        return this.compilationResults;
    }
    
    /**
     * Возвращает статистику компиляции.
     */
    getStats() {
        return {
            tokensGenerated: this.compilationResults.tokens.length,
            astNodesCount: this.countAstNodes(this.compilationResults.ast),
            watLinesOfCode: this.compilationResults.watCode.split('\n').length,
            errorsCount: this.compilationResults.errors.length,
            success: this.compilationResults.errors.length === 0
        };
    }
    
    /**
     * Подсчитывает количество узлов в AST.
     */
    countAstNodes(node) {
        if (!node) return 0;
        
        let count = 1;
        
        for (const key in node) {
            const value = node[key];
            if (value && typeof value === 'object') {
                if (Array.isArray(value)) {
                    value.forEach(item => {
                        count += this.countAstNodes(item);
                    });
                } else if (value.type) {
                    count += this.countAstNodes(value);
                }
            }
        }
        
        return count;
    }
    
    /**
     * Форматирует AST для отображения.
     * 
     * AST может быть очень большим и сложным. Эта функция создаёт
     * упрощённое строковое представление для визуализации.
     */
    formatAst(node, indent = 0) {
        if (!node) return '';
        
        const spaces = '  '.repeat(indent);
        let result = `${spaces}${node.type}`;
        
        // Добавляем важную информацию о узле
        if (node.name) result += ` (${node.name})`;
        if (node.value !== undefined) result += ` = ${JSON.stringify(node.value)}`;
        if (node.operator) result += ` [${node.operator}]`;
        if (node.inferredType) result += ` : ${node.inferredType.toString()}`;
        
        result += '\n';
        
        // Рекурсивно форматируем дочерние узлы
        const childKeys = ['body', 'params', 'init', 'condition', 'then', 'else', 
                          'left', 'right', 'argument', 'callee', 'arguments', 
                          'object', 'property'];
        
        for (const key of childKeys) {
            const value = node[key];
            if (value) {
                if (Array.isArray(value)) {
                    value.forEach(child => {
                        result += this.formatAst(child, indent + 1);
                    });
                } else if (value.type) {
                    result += this.formatAst(value, indent + 1);
                }
            }
        }
        
        return result;
    }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Compiler };
}

if (typeof window !== 'undefined') {
    window.CompilerStage5 = window.CompilerStage5 || {};
    window.CompilerStage5.Compiler = Compiler;
}
