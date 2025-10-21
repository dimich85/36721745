/**
 * WAT Generator Web Worker
 *
 * Generates optimized WebAssembly Text Format (WAT) from JavaScript functions
 * based on AI analysis and optimization strategies.
 *
 * This worker receives:
 * - Function profiles from Profiler Worker
 * - Optimization strategies from AI Analyzer Worker
 *
 * And produces:
 * - Optimized WAT code for each function
 * - Applied optimizations metadata
 * - Performance estimates
 */

class WATTypeMapper {
    constructor() {
        // Map JavaScript types to WASM types
        this.typeMap = new Map([
            ['number', 'f64'],
            ['int', 'i32'],
            ['float', 'f64'],
            ['boolean', 'i32'],
            ['i32', 'i32'],
            ['i64', 'i64'],
            ['f32', 'f32'],
            ['f64', 'f64']
        ]);

        // Default type for unknowns
        this.defaultType = 'f64';
    }

    mapType(jsType) {
        return this.typeMap.get(jsType) || this.defaultType;
    }

    inferTypeFromValue(value) {
        if (Number.isInteger(value)) {
            return value >= -2147483648 && value <= 2147483647 ? 'i32' : 'i64';
        }
        if (typeof value === 'number') return 'f64';
        if (typeof value === 'boolean') return 'i32';
        return this.defaultType;
    }

    inferTypeFromOperation(op) {
        const intOps = new Set([
            '+', '-', '*', '/', '%', '&', '|', '^', '<<', '>>', '>>>',
            '==', '!=', '<', '>', '<=', '>='
        ]);

        // Most operations preserve numeric type
        return 'f64'; // Default to float64 for mixed operations
    }
}

class WATTemplate {
    constructor() {
        this.templates = {
            // Basic function template
            function: `(func ${{name}} {{params}} {{result}}
  {{locals}}
  {{body}}
)`,

            // Parameter template
            param: `(param ${{name}} {{type}})`,

            // Result template
            result: `(result {{type}})`,

            // Local variable template
            local: `(local ${{name}} {{type}})`,

            // Simple arithmetic
            add: `{{left}}
  {{right}}
  {{type}}.add`,

            subtract: `{{left}}
  {{right}}
  {{type}}.sub`,

            multiply: `{{left}}
  {{right}}
  {{type}}.mul`,

            divide: `{{left}}
  {{right}}
  {{type}}.div`,

            // Comparisons
            equal: `{{left}}
  {{right}}
  {{type}}.eq`,

            less: `{{left}}
  {{right}}
  {{type}}.lt`,

            greater: `{{left}}
  {{right}}
  {{type}}.gt`,

            // Control flow
            ifThen: `{{condition}}
  (if (then
    {{thenBody}}
  ))`,

            ifElse: `{{condition}}
  (if (then
    {{thenBody}}
  ) (else
    {{elseBody}}
  ))`,

            loop: `(block $break
  (loop $continue
    {{condition}}
    (br_if $break)
    {{body}}
    (br $continue)
  )
)`,

            // SIMD vectorization (for array operations)
            simdLoad: `(v128.load (i32.const {{offset}}))`,
            simdAdd: `(f32x4.add)`,
            simdMul: `(f32x4.mul)`,
            simdStore: `(v128.store (i32.const {{offset}}))`,

            // Constant
            const: `({{type}}.const {{value}})`,

            // Local get/set
            getLocal: `(local.get ${{name}})`,
            setLocal: `(local.set ${{name}})`,

            // Call function
            call: `{{args}}
  (call ${{name}})`,

            // Return
            return: `{{value}}
  return`
        };
    }

    render(templateName, vars) {
        let template = this.templates[templateName];
        if (!template) {
            throw new Error(`Template '${templateName}' not found`);
        }

        // Replace all {{varName}} with actual values
        for (const [key, value] of Object.entries(vars)) {
            const pattern = new RegExp(`{{${key}}}`, 'g');
            template = template.replace(pattern, value || '');
        }

        return template;
    }
}

class WATOptimizer {
    constructor() {
        this.template = new WATTemplate();
        this.typeMapper = new WATTypeMapper();
    }

    /**
     * Apply function inlining optimization
     */
    applyInlining(callerWAT, calleeProfile, callSite) {
        // Extract callee body
        const calleeBody = this.extractFunctionBody(calleeProfile.watCode);

        // Replace function call with inline body
        const inlinedWAT = callerWAT.replace(
            callSite.watCode,
            `
  ;; Inlined ${calleeProfile.name}
  ${calleeBody}
  ;; End inline`
        );

        return {
            wat: inlinedWAT,
            savedCost: 10, // Approximate cost of function call
            codeIncrease: calleeBody.length
        };
    }

    /**
     * Apply loop unrolling optimization
     */
    applyLoopUnrolling(loopWAT, unrollFactor = 4) {
        // Extract loop body
        const bodyMatch = loopWAT.match(/\(loop[^)]*\)([\s\S]*)\)/);
        if (!bodyMatch) return loopWAT;

        const body = bodyMatch[1];

        // Unroll loop body N times
        let unrolledBody = '';
        for (let i = 0; i < unrollFactor; i++) {
            unrolledBody += `
    ;; Iteration ${i}
    ${body}`;
        }

        // Wrap in loop with adjusted iteration count
        return `
  ;; Unrolled loop (factor ${unrollFactor})
  (local $unroll_count i32)
  (local.set $unroll_count
    (i32.div_u (local.get $count) (i32.const ${unrollFactor}))
  )
  (block $break
    (loop $continue
      (local.get $unroll_count)
      (i32.const 0)
      (i32.eq)
      (br_if $break)
      ${unrolledBody}
      (local.set $unroll_count
        (i32.sub (local.get $unroll_count) (i32.const 1))
      )
      (br $continue)
    )
  )`;
    }

    /**
     * Apply SIMD vectorization for array operations
     */
    applyVectorization(arrayOpWAT, vectorWidth = 4) {
        // Detect array operations that can be vectorized
        const scalarPattern = /\(f64\.load.*?\)\s*\(f64\.load.*?\)\s*f64\.(add|mul|sub)/g;

        return arrayOpWAT.replace(scalarPattern, (match, op) => {
            return `
    ;; Vectorized ${op} (SIMD)
    (v128.load (local.get $addr1))
    (v128.load (local.get $addr2))
    (f32x4.${op})
    (v128.store (local.get $result_addr))`;
        });
    }

    /**
     * Apply constant folding
     */
    applyConstantFolding(wat) {
        // Find constant arithmetic operations
        const patterns = [
            // (i32.const X) (i32.const Y) i32.add -> (i32.const X+Y)
            {
                pattern: /\(i32\.const (\d+)\)\s*\(i32\.const (\d+)\)\s*i32\.add/g,
                replace: (_, a, b) => `(i32.const ${parseInt(a) + parseInt(b)})`
            },
            // Same for subtract
            {
                pattern: /\(i32\.const (\d+)\)\s*\(i32\.const (\d+)\)\s*i32\.sub/g,
                replace: (_, a, b) => `(i32.const ${parseInt(a) - parseInt(b)})`
            },
            // Same for multiply
            {
                pattern: /\(i32\.const (\d+)\)\s*\(i32\.const (\d+)\)\s*i32\.mul/g,
                replace: (_, a, b) => `(i32.const ${parseInt(a) * parseInt(b)})`
            },
            // Float operations
            {
                pattern: /\(f64\.const ([\d.]+)\)\s*\(f64\.const ([\d.]+)\)\s*f64\.add/g,
                replace: (_, a, b) => `(f64.const ${parseFloat(a) + parseFloat(b)})`
            }
        ];

        let optimized = wat;
        for (const {pattern, replace} of patterns) {
            optimized = optimized.replace(pattern, replace);
        }

        return optimized;
    }

    /**
     * Apply tail call optimization
     */
    applyTailCallOptimization(wat, functionName) {
        // Replace tail recursive call with loop
        const tailCallPattern = new RegExp(
            `\\(call \\$${functionName}\\)\\s*return`,
            'g'
        );

        return wat.replace(tailCallPattern, `
      ;; Tail call optimized to jump
      (br $tail_call_loop)`);
    }

    /**
     * Apply common subexpression elimination
     */
    applyCSE(wat) {
        const expressions = new Map();
        let counter = 0;

        // Find repeated expressions
        const exprPattern = /\([if]\d+\.[a-z]+[^)]*\)/g;
        const matches = wat.match(exprPattern) || [];

        // Count occurrences
        for (const expr of matches) {
            expressions.set(expr, (expressions.get(expr) || 0) + 1);
        }

        // Extract common expressions to locals
        let optimized = wat;
        const locals = [];

        for (const [expr, count] of expressions.entries()) {
            if (count > 1) {
                const localName = `$cse_${counter++}`;
                const type = expr.match(/\(([if]\d+)/)?.[1] || 'f64';

                locals.push(`(local ${localName} ${type})`);

                // Replace first occurrence with local.set
                optimized = optimized.replace(
                    expr,
                    `(local.tee ${localName} ${expr})`
                );

                // Replace remaining occurrences with local.get
                optimized = optimized.replace(
                    new RegExp(expr.replace(/[()]/g, '\\$&'), 'g'),
                    `(local.get ${localName})`
                );
            }
        }

        // Insert locals at function start
        if (locals.length > 0) {
            optimized = optimized.replace(
                /(\(func [^)]+\))/,
                `$1\n  ${locals.join('\n  ')}`
            );
        }

        return optimized;
    }

    /**
     * Apply strength reduction (replace expensive ops with cheaper ones)
     */
    applyStrengthReduction(wat) {
        const reductions = [
            // x * 2 -> x << 1 (only for integers)
            {
                pattern: /\(local\.get \$([a-z_]+)\)\s*\(i32\.const 2\)\s*i32\.mul/g,
                replace: '(local.get $$1) (i32.const 1) i32.shl'
            },
            // x * 4 -> x << 2
            {
                pattern: /\(local\.get \$([a-z_]+)\)\s*\(i32\.const 4\)\s*i32\.mul/g,
                replace: '(local.get $$1) (i32.const 2) i32.shl'
            },
            // x / 2 -> x >> 1
            {
                pattern: /\(local\.get \$([a-z_]+)\)\s*\(i32\.const 2\)\s*i32\.div_u/g,
                replace: '(local.get $$1) (i32.const 1) i32.shr_u'
            },
            // x % 2 -> x & 1
            {
                pattern: /\(local\.get \$([a-z_]+)\)\s*\(i32\.const 2\)\s*i32\.rem_u/g,
                replace: '(local.get $$1) (i32.const 1) i32.and'
            }
        ];

        let optimized = wat;
        for (const {pattern, replace} of reductions) {
            optimized = optimized.replace(pattern, replace);
        }

        return optimized;
    }

    extractFunctionBody(watCode) {
        const match = watCode.match(/\(func[^)]*\)([\s\S]*)\)/);
        return match ? match[1].trim() : '';
    }
}

class WATCodeGenerator {
    constructor() {
        this.template = new WATTemplate();
        this.typeMapper = new WATTypeMapper();
        this.optimizer = new WATOptimizer();
        this.generatedFunctions = new Map();
    }

    /**
     * Generate WAT code from JavaScript function
     */
    generateFromJS(profile, optimizations = []) {
        const { name, code, metadata } = profile;

        // Parse function signature
        const signature = this.parseFunctionSignature(code);

        // Generate basic WAT structure
        let wat = this.generateBasicWAT(name, signature, code);

        // Apply optimizations in order
        for (const opt of optimizations) {
            wat = this.applyOptimization(wat, opt, profile);
        }

        // Final cleanup and formatting
        wat = this.cleanupWAT(wat);

        this.generatedFunctions.set(name, wat);

        return {
            name,
            wat,
            optimizationsApplied: optimizations.map(o => o.type),
            estimatedSpeedup: this.estimateSpeedup(optimizations),
            codeSize: wat.length
        };
    }

    parseFunctionSignature(code) {
        // Extract function parameters
        const paramMatch = code.match(/function\s+\w+\s*\(([^)]*)\)/);
        const params = paramMatch
            ? paramMatch[1].split(',').map(p => p.trim()).filter(p => p)
            : [];

        // Infer types from usage (simplified - would need full analysis)
        return {
            params: params.map(p => ({
                name: p,
                type: 'f64' // Default to f64, real impl would analyze usage
            })),
            returnType: 'f64' // Default, would analyze return statements
        };
    }

    generateBasicWAT(name, signature, code) {
        // Generate parameters
        const params = signature.params
            .map(p => this.template.render('param', p))
            .join('\n  ');

        // Generate result
        const result = signature.returnType
            ? this.template.render('result', { type: signature.returnType })
            : '';

        // Generate function body from code
        const body = this.generateBody(code, signature);

        // Combine into function
        return this.template.render('function', {
            name,
            params,
            result,
            locals: '',
            body
        });
    }

    generateBody(code, signature) {
        // This is a simplified version - real implementation would need
        // full JavaScript AST parsing and translation

        // For demo purposes, generate simple body
        const lines = code.split('\n');
        const bodyLines = [];

        for (const line of lines) {
            // Skip function declaration and closing brace
            if (line.includes('function') || line.trim() === '}' || line.trim() === '{') {
                continue;
            }

            // Simple return statement
            const returnMatch = line.match(/return\s+(.+);/);
            if (returnMatch) {
                const expr = this.generateExpression(returnMatch[1], signature);
                bodyLines.push(expr);
                continue;
            }

            // Variable declaration
            const varMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*(.+);/);
            if (varMatch) {
                const [, varName, expr] = varMatch;
                bodyLines.push(`(local $${varName} f64)`);
                bodyLines.push(this.generateExpression(expr, signature));
                bodyLines.push(`(local.set $${varName})`);
                continue;
            }
        }

        return bodyLines.join('\n  ');
    }

    generateExpression(expr, signature) {
        expr = expr.trim();

        // Number literal
        if (/^[\d.]+$/.test(expr)) {
            const type = expr.includes('.') ? 'f64' : 'i32';
            return this.template.render('const', { type, value: expr });
        }

        // Variable reference
        if (/^[a-zA-Z_]\w*$/.test(expr)) {
            // Check if it's a parameter
            const param = signature.params.find(p => p.name === expr);
            if (param) {
                return this.template.render('getLocal', { name: expr });
            }
            return this.template.render('getLocal', { name: expr });
        }

        // Binary operation
        const binaryMatch = expr.match(/(.+)\s*([+\-*/])\s*(.+)/);
        if (binaryMatch) {
            const [, left, op, right] = binaryMatch;
            const opMap = {
                '+': 'add',
                '-': 'subtract',
                '*': 'multiply',
                '/': 'divide'
            };

            return this.template.render(opMap[op], {
                left: this.generateExpression(left, signature),
                right: this.generateExpression(right, signature),
                type: 'f64'
            });
        }

        // Default: return as const 0
        return '(f64.const 0)';
    }

    applyOptimization(wat, optimization, profile) {
        const { type, params } = optimization;

        switch (type) {
            case 'inlining':
                // Would need callee info - skip for now
                return wat;

            case 'loopUnrolling':
                return this.optimizer.applyLoopUnrolling(wat, params?.factor || 4);

            case 'vectorization':
                return this.optimizer.applyVectorization(wat, params?.width || 4);

            case 'constantFolding':
                return this.optimizer.applyConstantFolding(wat);

            case 'tailCallOptimization':
                return this.optimizer.applyTailCallOptimization(wat, profile.name);

            case 'commonSubexpressionElimination':
                return this.optimizer.applyCSE(wat);

            case 'strengthReduction':
                return this.optimizer.applyStrengthReduction(wat);

            default:
                return wat;
        }
    }

    cleanupWAT(wat) {
        // Remove empty lines
        wat = wat.replace(/\n\s*\n/g, '\n');

        // Normalize indentation
        const lines = wat.split('\n');
        let indent = 0;
        const formatted = [];

        for (let line of lines) {
            line = line.trim();

            // Decrease indent for closing parens
            if (line.startsWith(')')) {
                indent = Math.max(0, indent - 2);
            }

            formatted.push(' '.repeat(indent) + line);

            // Increase indent for opening parens
            if (line.includes('(') && !line.includes(')')) {
                indent += 2;
            }
        }

        return formatted.join('\n');
    }

    estimateSpeedup(optimizations) {
        let speedup = 1.0;

        for (const opt of optimizations) {
            switch (opt.type) {
                case 'inlining':
                    speedup *= 1.05; // 5% improvement
                    break;
                case 'loopUnrolling':
                    speedup *= 1.30; // 30% improvement
                    break;
                case 'vectorization':
                    speedup *= 1.75; // 75% improvement (SIMD)
                    break;
                case 'constantFolding':
                    speedup *= 1.02; // 2% improvement
                    break;
                case 'tailCallOptimization':
                    speedup *= 1.10; // 10% improvement
                    break;
                case 'commonSubexpressionElimination':
                    speedup *= 1.08; // 8% improvement
                    break;
                case 'strengthReduction':
                    speedup *= 1.05; // 5% improvement
                    break;
            }
        }

        return speedup;
    }

    /**
     * Generate complete WASM module with all functions
     */
    generateModule(functionResults) {
        const functions = functionResults.map(r => r.wat).join('\n\n  ');

        // Generate exports for all functions
        const exports = functionResults
            .map(r => `(export "${r.name}" (func $${r.name}))`)
            .join('\n  ');

        return `(module
  ;; Generated by WAT Generator Worker
  ;; Total functions: ${functionResults.length}

  ${functions}

  ;; Exports
  ${exports}
)`;
    }
}

// ============================================================================
// Worker State and Message Handling
// ============================================================================

const generator = new WATCodeGenerator();
let profiles = null;
let optimizationPlan = null;

/**
 * Process all functions and generate optimized WAT
 */
function generateAll(profilesData, optimizations) {
    profiles = profilesData;
    optimizationPlan = optimizations;

    const results = [];
    const startTime = performance.now();

    for (const profile of profiles) {
        // Get optimizations for this function
        const funcOpts = optimizations.functionOpts?.find(
            f => f.functionName === profile.name
        );

        const optsToApply = funcOpts?.optimizations || [];

        // Generate WAT with optimizations
        const result = generator.generateFromJS(profile, optsToApply);
        results.push(result);
    }

    // Generate complete module
    const module = generator.generateModule(results);

    const totalTime = performance.now() - startTime;

    return {
        results,
        module,
        statistics: {
            totalFunctions: results.length,
            totalOptimizations: results.reduce(
                (sum, r) => sum + r.optimizationsApplied.length,
                0
            ),
            averageSpeedup: results.reduce(
                (sum, r) => sum + r.estimatedSpeedup,
                0
            ) / results.length,
            totalCodeSize: module.length,
            generationTime: totalTime
        }
    };
}

/**
 * Generate WAT for a single function
 */
function generateSingle(profile, optimizations = []) {
    return generator.generateFromJS(profile, optimizations);
}

/**
 * Get statistics about generated code
 */
function getStatistics() {
    const functions = Array.from(generator.generatedFunctions.values());

    return {
        totalFunctions: functions.length,
        totalCodeSize: functions.reduce((sum, wat) => sum + wat.length, 0),
        averageSize: functions.length > 0
            ? functions.reduce((sum, wat) => sum + wat.length, 0) / functions.length
            : 0,
        functions: Array.from(generator.generatedFunctions.entries()).map(
            ([name, wat]) => ({
                name,
                size: wat.length,
                lines: wat.split('\n').length
            })
        )
    };
}

// ============================================================================
// Message Handler
// ============================================================================

self.onmessage = function(e) {
    const { command, data, id } = e.data;

    let result;
    let error = null;

    try {
        switch (command) {
            case 'generateAll':
                result = generateAll(data.profiles, data.optimizations);
                break;

            case 'generateSingle':
                result = generateSingle(data.profile, data.optimizations || []);
                break;

            case 'getStatistics':
                result = getStatistics();
                break;

            case 'reset':
                generator.generatedFunctions.clear();
                profiles = null;
                optimizationPlan = null;
                result = { success: true };
                break;

            default:
                throw new Error(`Unknown command: ${command}`);
        }
    } catch (e) {
        error = {
            message: e.message,
            stack: e.stack
        };
    }

    self.postMessage({
        id,
        command,
        result,
        error
    });
};

// Worker ready signal
self.postMessage({
    type: 'ready',
    worker: 'wat-generator',
    timestamp: Date.now()
});
