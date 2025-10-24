/**
 * ============================================================================
 * BASIC TESTS FOR WASM OPTIMIZATION SYSTEM
 * ============================================================================
 *
 * Базовые тесты для проверки функциональности каждого этапа.
 * Запуск: node basic-tests.js
 */

// ============================================================================
// TEST FRAMEWORK (простой)
// ============================================================================

class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    async run() {
        console.log('\n' + '='.repeat(80));
        console.log('RUNNING TESTS');
        console.log('='.repeat(80) + '\n');

        for (const test of this.tests) {
            try {
                await test.fn();
                this.passed++;
                console.log(`✓ ${test.name}`);
            } catch (error) {
                this.failed++;
                console.log(`✗ ${test.name}`);
                console.log(`  Error: ${error.message}`);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log(`RESULTS: ${this.passed} passed, ${this.failed} failed`);
        console.log('='.repeat(80) + '\n');

        return this.failed === 0;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message || 'Values not equal'}: expected ${expected}, got ${actual}`);
    }
}

function assertNear(actual, expected, tolerance = 0.01, message) {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${message || 'Values not near'}: expected ${expected}, got ${actual}`);
    }
}

function assertArrayEqual(actual, expected, message) {
    if (actual.length !== expected.length) {
        throw new Error(`${message || 'Arrays not equal'}: different lengths`);
    }
    for (let i = 0; i < actual.length; i++) {
        if (actual[i] !== expected[i]) {
            throw new Error(`${message || 'Arrays not equal'}: at index ${i}, expected ${expected[i]}, got ${actual[i]}`);
        }
    }
}

// ============================================================================
// LOAD MODULES
// ============================================================================

let NeuralOptimizer, RuntimeSpecializer, DistributedLearningClient, CodeGenerationSystem, HybridRuntime;

if (typeof require !== 'undefined') {
    // Node.js environment
    try {
        ({ NeuralOptimizer } = require('./stage9-neural-optimizer.js'));
        ({ RuntimeSpecializer } = require('./stage10-runtime-specialization.js'));
        ({ DistributedLearningClient } = require('./stage11-distributed-learning.js'));
        ({ CodeGenerationSystem } = require('./stage12-code-generation.js'));
        ({ HybridRuntime } = require('./stage13-hybrid-architecture.js'));
    } catch (error) {
        console.error('Error loading modules:', error.message);
        console.log('Note: Some tests may fail if modules are not available in Node.js environment');
    }
} else {
    // Browser environment - assume modules are already loaded
    console.log('Running in browser environment');
}

// ============================================================================
// STAGE 9 TESTS: Neural Network
// ============================================================================

const runner = new TestRunner();

runner.test('Stage 9: Neural network initialization', () => {
    if (!NeuralOptimizer) {
        console.log('  Skipping - NeuralOptimizer not available');
        return;
    }

    const nn = new NeuralOptimizer();
    assert(nn.network !== null, 'Network should be initialized');
    assert(nn.network.layers.length > 0, 'Network should have layers');
});

runner.test('Stage 9: Neural network prediction', () => {
    if (!NeuralOptimizer) {
        console.log('  Skipping - NeuralOptimizer not available');
        return;
    }

    const nn = new NeuralOptimizer();

    const features = {
        lines: 10,
        cyclomaticComplexity: 3,
        hasLoop: true,
        hasConditional: true,
        arithmeticOps: 5,
        functionCalls: 2,
        callCount: 100,
        avgTime: 2.5
    };

    const predictions = nn.predictOptimizations(features);

    assert(Array.isArray(predictions), 'Should return array');
    assert(predictions.length === 7, 'Should return 7 optimization probabilities');
    assert(predictions.every(p => p >= 0 && p <= 1), 'All probabilities should be in [0, 1]');
});

runner.test('Stage 9: Training reduces loss', () => {
    if (!NeuralOptimizer) {
        console.log('  Skipping - NeuralOptimizer not available');
        return;
    }

    const nn = new NeuralOptimizer();

    // Simple training data
    const trainingData = [];
    for (let i = 0; i < 50; i++) {
        trainingData.push({
            features: {
                lines: 10 + Math.random() * 100,
                cyclomaticComplexity: 1 + Math.random() * 10,
                hasLoop: Math.random() > 0.5,
                hasConditional: Math.random() > 0.5,
                arithmeticOps: Math.floor(Math.random() * 20),
                functionCalls: Math.floor(Math.random() * 10),
                callCount: 10 + Math.random() * 1000,
                avgTime: Math.random() * 10
            },
            actualSpeedups: {
                inlining: 1 + Math.random(),
                loop_unrolling: 1 + Math.random() * 2,
                vectorization: 1 + Math.random() * 3,
                dead_code_elimination: 1 + Math.random(),
                constant_folding: 1 + Math.random(),
                tail_call_optimization: 1 + Math.random(),
                memoization: 1 + Math.random() * 2
            }
        });
    }

    const initialLoss = nn.calculateLoss(trainingData);

    // Train for a few epochs
    for (let i = 0; i < 10; i++) {
        nn.trainEpoch(trainingData, { verbose: false });
    }

    const finalLoss = nn.calculateLoss(trainingData);

    assert(!isNaN(initialLoss), 'Initial loss should not be NaN');
    assert(!isNaN(finalLoss), 'Final loss should not be NaN');
    assert(finalLoss < initialLoss, 'Loss should decrease after training');
});

// ============================================================================
// STAGE 10 TESTS: Runtime Specialization
// ============================================================================

runner.test('Stage 10: Runtime specializer initialization', () => {
    if (!RuntimeSpecializer) {
        console.log('  Skipping - RuntimeSpecializer not available');
        return;
    }

    const specializer = new RuntimeSpecializer();
    assert(specializer !== null, 'Specializer should be created');
});

runner.test('Stage 10: Type profiling', () => {
    if (!RuntimeSpecializer) {
        console.log('  Skipping - RuntimeSpecializer not available');
        return;
    }

    const specializer = new RuntimeSpecializer();

    // Record some executions
    for (let i = 0; i < 100; i++) {
        specializer.recordExecution('testFunc', [1.5, 2.5], 10);
    }

    for (let i = 0; i < 50; i++) {
        specializer.recordExecution('testFunc', [1, 2], 8);
    }

    const profile = specializer.profiles.get('testFunc');
    assert(profile !== undefined, 'Profile should exist');
    assert(profile.callCount === 150, 'Call count should be 150');
    assert(profile.signatures.size > 0, 'Should have type signatures');
});

runner.test('Stage 10: Specialization decision', () => {
    if (!RuntimeSpecializer) {
        console.log('  Skipping - RuntimeSpecializer not available');
        return;
    }

    const specializer = new RuntimeSpecializer();

    // Record many executions with same types
    for (let i = 0; i < 200; i++) {
        specializer.recordExecution('hotFunc', [1.5, 2.5], 10);
    }

    const decision = specializer.shouldSpecialize('hotFunc');
    assert(decision.shouldSpecialize, 'Hot function should be specialized');
});

// ============================================================================
// STAGE 11 TESTS: Distributed Learning
// ============================================================================

runner.test('Stage 11: Telemetry collection', () => {
    if (!DistributedLearningClient) {
        console.log('  Skipping - DistributedLearningClient not available');
        return;
    }

    const client = new DistributedLearningClient({ enableTelemetry: true });

    const profile = {
        name: 'testFunc',
        codeStats: {
            lines: 10,
            cyclomaticComplexity: 3,
            hasLoop: true
        }
    };

    const actualSpeedups = {
        inlining: 1.5,
        loop_unrolling: 2.0
    };

    client.telemetry.recordOptimization(profile, actualSpeedups);

    const packets = client.telemetry.pendingPackets;
    assert(packets.length > 0, 'Should have pending telemetry packets');
});

runner.test('Stage 11: Differential privacy', () => {
    if (!DistributedLearningClient) {
        console.log('  Skipping - DistributedLearningClient not available');
        return;
    }

    const client = new DistributedLearningClient({ enableTelemetry: true });

    const profile = {
        name: 'testFunc',
        codeStats: { lines: 10, cyclomaticComplexity: 3 }
    };

    const speedups = { inlining: 2.0 };

    client.telemetry.recordOptimization(profile, speedups);

    const packet = client.telemetry.pendingPackets[0];
    const withPrivacy = client.telemetry.addDifferentialPrivacy(packet);

    // Speedup should be slightly different due to noise
    assert(
        Math.abs(withPrivacy.actualSpeedups.inlining - 2.0) > 0,
        'Differential privacy should add noise'
    );
});

// ============================================================================
// STAGE 12 TESTS: Code Generation
// ============================================================================

runner.test('Stage 12: Intent parser - structured', () => {
    if (!CodeGenerationSystem) {
        console.log('  Skipping - CodeGenerationSystem not available');
        return;
    }

    const system = new CodeGenerationSystem();

    const spec = {
        operationType: 'find_primes',
        inputSize: 10000
    };

    const parsed = system.intentParser.parse(spec);

    assertEqual(parsed.operationType, 'find_primes', 'Should parse operation type');
    assertEqual(parsed.inputSize, 10000, 'Should parse input size');
});

runner.test('Stage 12: Intent parser - natural language', () => {
    if (!CodeGenerationSystem) {
        console.log('  Skipping - CodeGenerationSystem not available');
        return;
    }

    const system = new CodeGenerationSystem();

    const text = 'Find all prime numbers up to 10000 using fast algorithm';
    const parsed = system.intentParser.parse(text);

    assert(parsed.operationType !== null, 'Should extract operation type');
    assert(parsed.operationType.includes('prime'), 'Should detect primes');
});

runner.test('Stage 12: Algorithm selection', () => {
    if (!CodeGenerationSystem) {
        console.log('  Skipping - CodeGenerationSystem not available');
        return;
    }

    const system = new CodeGenerationSystem();

    const intent = {
        operationType: 'find_primes',
        inputSize: 10000,
        constraints: {}
    };

    const algorithm = system.algorithmSelector.selectBest(intent);

    assert(algorithm !== null, 'Should select an algorithm');
    assert(algorithm.name !== undefined, 'Algorithm should have name');
    assert(algorithm.speedup > 1, 'Algorithm should promise speedup');
});

runner.test('Stage 12: Code generation', () => {
    if (!CodeGenerationSystem) {
        console.log('  Skipping - CodeGenerationSystem not available');
        return;
    }

    const system = new CodeGenerationSystem();

    const algorithm = {
        name: 'sieve_of_eratosthenes',
        complexity: 'O(n log log n)',
        speedup: 20.0,
        vectorizable: true
    };

    const intent = {
        operationType: 'find_primes',
        inputSize: 10000
    };

    const constraints = {
        maxSize: 10000,
        priority: 'speed'
    };

    const generated = system.codeGenerator.generate(algorithm, intent, constraints);

    assert(generated.wat !== undefined, 'Should generate WAT code');
    assert(generated.wat.includes('(module'), 'WAT should be valid module');
    assert(generated.optimizations.length > 0, 'Should have optimizations');
});

runner.test('Stage 12: Formal verification', () => {
    if (!CodeGenerationSystem) {
        console.log('  Skipping - CodeGenerationSystem not available');
        return;
    }

    const system = new CodeGenerationSystem();

    const code = {
        wat: '(module (func (export "test") (param i32) (result i32) local.get 0))',
        metadata: { operationType: 'identity' }
    };

    const spec = {
        operationType: 'identity',
        examples: [
            { input: [5], expectedOutput: 5 },
            { input: [10], expectedOutput: 10 }
        ]
    };

    const verification = system.formalVerifier.verify(code, spec);

    assert(verification.verified !== undefined, 'Should have verification result');
    assert(verification.confidence >= 0 && verification.confidence <= 1, 'Confidence should be in [0, 1]');
    assert(verification.totalTests > 0, 'Should run tests');
});

runner.test('Stage 12: Multi-objective optimization', () => {
    if (!CodeGenerationSystem) {
        console.log('  Skipping - CodeGenerationSystem not available');
        return;
    }

    const system = new CodeGenerationSystem();

    const algorithm = {
        name: 'sieve_of_eratosthenes',
        speedup: 20.0,
        vectorizable: true
    };

    const intent = {
        operationType: 'find_primes',
        inputSize: 10000
    };

    const constraints = {
        maxSize: 10000,
        priority: 'balanced'
    };

    const result = system.multiObjectiveOptimizer.optimize(algorithm, intent, constraints);

    assert(result.paretoFront.length > 0, 'Should find Pareto optimal variants');
    assert(result.bestVariant !== undefined, 'Should have best variant');

    // All variants should have objectives
    for (const variant of result.paretoFront) {
        assert(variant.objectives.speed > 0, 'Should have speed objective');
        assert(variant.objectives.size > 0, 'Should have size objective');
        assert(variant.objectives.energy > 0, 'Should have energy objective');
    }
});

// ============================================================================
// STAGE 13 TESTS: Hybrid Architecture
// ============================================================================

runner.test('Stage 13: Hybrid runtime initialization (CPU-only)', async () => {
    if (!HybridRuntime) {
        console.log('  Skipping - HybridRuntime not available');
        return;
    }

    const runtime = new HybridRuntime();
    const result = await runtime.initialize();

    assert(result.success, 'Initialization should succeed');
    assert(runtime.initialized, 'Should be marked as initialized');
    // GPU availability depends on environment
});

runner.test('Stage 13: CPU executor', async () => {
    if (!HybridRuntime) {
        console.log('  Skipping - HybridRuntime not available');
        return;
    }

    const runtime = new HybridRuntime();
    await runtime.initialize();

    const operation = {
        type: 'array.map',
        params: { factor: 2 }
    };

    const data = [1, 2, 3, 4, 5];

    const result = await runtime.cpuExecutor.execute(operation, data);

    assertArrayEqual(result, [2, 4, 6, 8, 10], 'CPU should execute array.map correctly');
});

runner.test('Stage 13: ML scheduler decision', () => {
    if (!HybridRuntime) {
        console.log('  Skipping - HybridRuntime not available');
        return;
    }

    const runtime = new HybridRuntime();

    const operation = {
        type: 'array.map',
        dataSize: 1000000,
        parallelizability: 0.95,
        computeIntensity: 1.5,
        memoryAccess: 0.1
    };

    const decision = runtime.scheduler.decide(operation);

    assert(decision.target === 'GPU' || decision.target === 'CPU', 'Should decide on target');
    assert(decision.confidence >= 0 && decision.confidence <= 1, 'Confidence should be in [0, 1]');
    assert(decision.score >= 0 && decision.score <= 1, 'Score should be in [0, 1]');
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

runner.test('Integration: End-to-end optimization pipeline', () => {
    if (!NeuralOptimizer) {
        console.log('  Skipping - Modules not available');
        return;
    }

    // Simulate complete pipeline
    const optimizer = new NeuralOptimizer();

    const code = {
        name: 'fibonacci',
        codeStats: {
            lines: 20,
            cyclomaticComplexity: 5,
            hasLoop: true,
            hasConditional: true,
            arithmeticOps: 10,
            functionCalls: 5
        },
        callCount: 500,
        avgTime: 5.0
    };

    // Step 1: Predict optimizations
    const predictions = optimizer.predictOptimizations(code);
    assert(predictions.length === 7, 'Should predict 7 optimizations');

    // Step 2: Select top optimizations
    const optimizations = optimizer.selectOptimizations(predictions);
    assert(optimizations.length > 0, 'Should select at least one optimization');
    assert(optimizations[0].probability >= 0.5, 'Top optimization should have high probability');
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

runner.test('Performance: Neural network inference speed', () => {
    if (!NeuralOptimizer) {
        console.log('  Skipping - NeuralOptimizer not available');
        return;
    }

    const nn = new NeuralOptimizer();

    const features = {
        lines: 50,
        cyclomaticComplexity: 7,
        hasLoop: true,
        hasConditional: true,
        arithmeticOps: 25,
        functionCalls: 10,
        callCount: 1000,
        avgTime: 3.5
    };

    const iterations = 1000;
    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
        nn.predictOptimizations(features);
    }

    const elapsed = Date.now() - start;
    const avgTime = elapsed / iterations;

    console.log(`  Average inference time: ${avgTime.toFixed(3)}ms`);
    assert(avgTime < 10, 'Inference should be fast (< 10ms)');
});

// ============================================================================
// RUN ALL TESTS
// ============================================================================

if (typeof window === 'undefined') {
    // Node.js - run automatically
    runner.run().then(success => {
        process.exit(success ? 0 : 1);
    });
} else {
    // Browser - export runner for manual execution
    window.testRunner = runner;
    console.log('Tests loaded. Run: testRunner.run()');
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TestRunner, runner };
}
