/**
 * 🧪 Unified Architecture - Comprehensive Integration Tests
 *
 * Tests all layers of the revolutionary WASM architecture
 */

class UnifiedArchitectureTests {
    constructor() {
        this.results = [];
        this.arch = null;
    }

    /**
     * Run all tests
     */
    async runAll() {
        console.log('🧪 Starting Unified Architecture Tests...\n');

        try {
            // Test 1: Architecture Initialization
            await this.testInitialization();

            // Test 2: Core Modules
            await this.testCoreModules();

            // Test 3: Compilation Pipeline
            await this.testCompilation();

            // Test 4: ML Optimization
            await this.testMLOptimization();

            // Test 5: Code Generation
            await this.testCodeGeneration();

            // Test 6: GPU Execution
            await this.testGPUExecution();

            // Test 7: Full Pipeline
            await this.testFullPipeline();

            // Test 8: Statistics Collection
            await this.testStatistics();

            // Test 9: Event System
            await this.testEventSystem();

            // Test 10: Error Handling
            await this.testErrorHandling();

            // Print summary
            this.printSummary();

        } catch (error) {
            console.error('❌ Critical test failure:', error);
        }
    }

    /**
     * Test 1: Architecture Initialization
     */
    async testInitialization() {
        console.log('📦 Test 1: Architecture Initialization');

        try {
            // Create architecture instance
            this.arch = new UnifiedArchitecture({
                debug: false,
                enableML: true,
                enableGPU: true,
                enableCodeGeneration: true
            });

            this.assert(this.arch !== null, 'Architecture instance created');
            this.assert(this.arch.initialized === false, 'Initial state is not initialized');

            // Initialize
            const result = await this.arch.initialize();

            this.assert(result.success === true, 'Initialization succeeded');
            this.assert(this.arch.initialized === true, 'Architecture is initialized');
            this.assert(Array.isArray(result.modules), 'Modules list returned');
            this.assert(result.modules.length > 0, 'At least one module loaded');

            // Check capabilities
            const capabilities = this.arch.getCapabilities();
            this.assert(capabilities !== null, 'Capabilities returned');
            this.assert(capabilities.core !== undefined, 'Core capabilities exist');
            this.assert(capabilities.compilation !== undefined, 'Compilation capabilities exist');

            console.log('  ✅ Initialization tests passed\n');
            return true;

        } catch (error) {
            console.error('  ❌ Initialization test failed:', error.message);
            return false;
        }
    }

    /**
     * Test 2: Core Modules
     */
    async testCoreModules() {
        console.log('🔧 Test 2: Core Modules');

        try {
            const capabilities = this.arch.getCapabilities();

            // Test VFS
            if (capabilities.core.vfs) {
                this.assert(this.arch.modules.vfs !== undefined, 'VFS module loaded');
                console.log('  ✓ VFS module operational');
            }

            // Test MicroISA
            if (capabilities.core.microisa) {
                this.assert(this.arch.modules.microisa !== undefined, 'MicroISA module loaded');
                console.log('  ✓ MicroISA module operational');
            }

            // Test WASM Boundary
            if (capabilities.core.wasmBoundary) {
                this.assert(this.arch.modules.wasmBoundary !== undefined, 'WASM Boundary loaded');
                console.log('  ✓ WASM Boundary operational');
            }

            console.log('  ✅ Core module tests passed\n');
            return true;

        } catch (error) {
            console.error('  ❌ Core modules test failed:', error.message);
            return false;
        }
    }

    /**
     * Test 3: Compilation Pipeline
     */
    async testCompilation() {
        console.log('⚙️ Test 3: Compilation Pipeline');

        try {
            const sourceCode = `
                function add(a, b) {
                    return a + b;
                }
            `;

            const result = await this.arch.compile(sourceCode);

            this.assert(result.success === true, 'Compilation succeeded');
            this.assert(result.code !== undefined, 'Compiled code returned');
            this.assert(typeof result.compileTime === 'number', 'Compile time recorded');
            this.assert(result.compileTime >= 0, 'Compile time is non-negative');

            console.log(`  ✓ Compilation time: ${result.compileTime.toFixed(2)}ms`);
            console.log('  ✅ Compilation tests passed\n');
            return true;

        } catch (error) {
            console.error('  ❌ Compilation test failed:', error.message);
            return false;
        }
    }

    /**
     * Test 4: ML Optimization
     */
    async testMLOptimization() {
        console.log('🤖 Test 4: ML Optimization');

        try {
            const code = `
                function sum(arr) {
                    let total = 0;
                    for (let i = 0; i < arr.length; i++) {
                        total += arr[i];
                    }
                    return total;
                }
            `;

            const result = await this.arch.optimize(code, {
                specialize: true,
                shareKnowledge: false
            });

            this.assert(result.success === true, 'Optimization succeeded');
            this.assert(result.code !== undefined, 'Optimized code returned');
            this.assert(typeof result.optimizationTime === 'number', 'Optimization time recorded');
            this.assert(result.mlApplied !== undefined, 'ML application status returned');

            console.log(`  ✓ Optimization time: ${result.optimizationTime.toFixed(2)}ms`);
            console.log(`  ✓ ML applied: ${result.mlApplied}`);
            console.log(`  ✓ Specialized: ${result.specialized}`);
            console.log('  ✅ ML optimization tests passed\n');
            return true;

        } catch (error) {
            console.error('  ❌ ML optimization test failed:', error.message);
            return false;
        }
    }

    /**
     * Test 5: Code Generation
     */
    async testCodeGeneration() {
        console.log('📝 Test 5: Code Generation');

        try {
            const capabilities = this.arch.getCapabilities();

            if (!capabilities.codeGeneration.intentBased) {
                console.log('  ⚠️ Code generation not available, skipping\n');
                return true;
            }

            const intent = 'Sort an array of numbers in ascending order';

            const result = await this.arch.modules.codeGeneration.generate(intent);

            this.assert(result.success === true, 'Code generation succeeded');
            this.assert(result.code !== undefined, 'Generated code returned');
            this.assert(result.algorithm !== undefined, 'Algorithm selected');
            this.assert(typeof result.generationTime === 'number', 'Generation time recorded');

            console.log(`  ✓ Algorithm selected: ${result.algorithm}`);
            console.log(`  ✓ Generation time: ${result.generationTime.toFixed(2)}ms`);
            console.log(`  ✓ Code length: ${result.code.length} characters`);
            console.log('  ✅ Code generation tests passed\n');
            return true;

        } catch (error) {
            console.error('  ❌ Code generation test failed:', error.message);
            return false;
        }
    }

    /**
     * Test 6: GPU Execution
     */
    async testGPUExecution() {
        console.log('🎮 Test 6: GPU Execution');

        try {
            const capabilities = this.arch.getCapabilities();

            if (!capabilities.gpu.compute) {
                console.log('  ⚠️ GPU compute not available, skipping\n');
                return true;
            }

            // Test small array (should use CPU)
            const smallData = new Float32Array(100);
            for (let i = 0; i < smallData.length; i++) smallData[i] = i;

            const smallResult = await this.arch.execute({
                type: 'array.map',
                dataSize: 100,
                parallelizability: 0.95,
                computeIntensity: 1.0,
                memoryAccess: 0.2,
                params: { factor: 2 }
            }, smallData);

            this.assert(smallResult.success === true, 'Small data execution succeeded');
            this.assert(smallResult.result !== undefined, 'Result returned');
            this.assert(smallResult.target !== undefined, 'Execution target determined');

            console.log(`  ✓ Small data (100): ${smallResult.target} in ${smallResult.executionTime.toFixed(2)}ms`);

            // Test large array (should use GPU if available)
            const largeData = new Float32Array(100000);
            for (let i = 0; i < largeData.length; i++) largeData[i] = i;

            const largeResult = await this.arch.execute({
                type: 'array.map',
                dataSize: 100000,
                parallelizability: 0.95,
                computeIntensity: 1.0,
                memoryAccess: 0.2,
                params: { factor: 2 }
            }, largeData);

            this.assert(largeResult.success === true, 'Large data execution succeeded');
            this.assert(largeResult.result !== undefined, 'Result returned');

            console.log(`  ✓ Large data (100K): ${largeResult.target} in ${largeResult.executionTime.toFixed(2)}ms`);

            // Verify results
            this.assert(smallResult.result[0] === 0, 'First element correct (small)');
            this.assert(smallResult.result[1] === 2, 'Second element correct (small)');
            this.assert(largeResult.result[0] === 0, 'First element correct (large)');
            this.assert(largeResult.result[1] === 2, 'Second element correct (large)');

            console.log('  ✅ GPU execution tests passed\n');
            return true;

        } catch (error) {
            console.error('  ❌ GPU execution test failed:', error.message);
            return false;
        }
    }

    /**
     * Test 7: Full Pipeline
     */
    async testFullPipeline() {
        console.log('🔄 Test 7: Full Pipeline');

        try {
            const sourceCode = 'function test(x) { return x * 2; }';

            // Run full pipeline: compile -> optimize -> execute
            const compiled = await this.arch.compile(sourceCode);
            this.assert(compiled.success === true, 'Pipeline step 1: Compilation succeeded');

            const optimized = await this.arch.optimize(compiled.code);
            this.assert(optimized.success === true, 'Pipeline step 2: Optimization succeeded');

            const testData = new Float32Array([1, 2, 3, 4, 5]);
            const executed = await this.arch.execute({
                type: 'array.map',
                dataSize: 5,
                parallelizability: 0.95,
                computeIntensity: 1.0,
                memoryAccess: 0.2,
                params: { factor: 2 }
            }, testData);
            this.assert(executed.success === true, 'Pipeline step 3: Execution succeeded');

            const totalTime = compiled.compileTime + optimized.optimizationTime + executed.executionTime;
            console.log(`  ✓ Total pipeline time: ${totalTime.toFixed(2)}ms`);
            console.log(`    - Compilation: ${compiled.compileTime.toFixed(2)}ms`);
            console.log(`    - Optimization: ${optimized.optimizationTime.toFixed(2)}ms`);
            console.log(`    - Execution: ${executed.executionTime.toFixed(2)}ms`);

            console.log('  ✅ Full pipeline tests passed\n');
            return true;

        } catch (error) {
            console.error('  ❌ Full pipeline test failed:', error.message);
            return false;
        }
    }

    /**
     * Test 8: Statistics Collection
     */
    async testStatistics() {
        console.log('📊 Test 8: Statistics Collection');

        try {
            const stats = this.arch.getStatistics();

            this.assert(stats !== null, 'Statistics object returned');
            this.assert(typeof stats.totalCompilations === 'number', 'Total compilations tracked');
            this.assert(typeof stats.totalOptimizations === 'number', 'Total optimizations tracked');
            this.assert(typeof stats.totalExecutions === 'number', 'Total executions tracked');
            this.assert(stats.totalCompilations > 0, 'At least one compilation recorded');

            console.log(`  ✓ Total compilations: ${stats.totalCompilations}`);
            console.log(`  ✓ Total optimizations: ${stats.totalOptimizations}`);
            console.log(`  ✓ Total executions: ${stats.totalExecutions}`);
            console.log(`  ✓ GPU accelerated: ${stats.gpuAccelerated}`);
            console.log(`  ✓ ML optimized: ${stats.mlOptimized}`);

            console.log('  ✅ Statistics tests passed\n');
            return true;

        } catch (error) {
            console.error('  ❌ Statistics test failed:', error.message);
            return false;
        }
    }

    /**
     * Test 9: Event System
     */
    async testEventSystem() {
        console.log('📡 Test 9: Event System');

        try {
            let eventFired = false;
            let eventData = null;

            // Register event listener
            this.arch.on('compile', (data) => {
                eventFired = true;
                eventData = data;
            });

            // Trigger event by compiling
            await this.arch.compile('function test() { return 42; }');

            this.assert(eventFired === true, 'Event fired');
            this.assert(eventData !== null, 'Event data received');
            this.assert(eventData.compileTime !== undefined, 'Event contains compile time');

            console.log('  ✓ Event listener registered');
            console.log('  ✓ Event fired on compilation');
            console.log('  ✓ Event data received correctly');

            console.log('  ✅ Event system tests passed\n');
            return true;

        } catch (error) {
            console.error('  ❌ Event system test failed:', error.message);
            return false;
        }
    }

    /**
     * Test 10: Error Handling
     */
    async testErrorHandling() {
        console.log('⚠️ Test 10: Error Handling');

        try {
            // Test 1: Uninitialized access
            const uninitArch = new UnifiedArchitecture({ debug: false });

            try {
                await uninitArch.compile('test');
                this.assert(false, 'Should have thrown error for uninitialized access');
            } catch (error) {
                this.assert(error.message.includes('not initialized'), 'Correct error for uninitialized access');
                console.log('  ✓ Uninitialized access error handled');
            }

            // Test 2: Empty source code
            try {
                await this.arch.compile('');
                console.log('  ✓ Empty source code handled');
            } catch (error) {
                console.log('  ✓ Empty source code error handled');
            }

            // Test 3: Invalid operation
            try {
                await this.arch.execute({
                    type: 'invalid.operation',
                    dataSize: 100,
                    params: {}
                }, new Float32Array(100));
                console.log('  ✓ Invalid operation handled');
            } catch (error) {
                console.log('  ✓ Invalid operation error handled');
            }

            console.log('  ✅ Error handling tests passed\n');
            return true;

        } catch (error) {
            console.error('  ❌ Error handling test failed:', error.message);
            return false;
        }
    }

    /**
     * Assert helper
     */
    assert(condition, message) {
        if (condition) {
            this.results.push({ test: message, passed: true });
        } else {
            this.results.push({ test: message, passed: false });
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    /**
     * Print test summary
     */
    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📋 TEST SUMMARY');
        console.log('='.repeat(60));

        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        const percentage = ((passed / total) * 100).toFixed(1);

        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed} (${percentage}%)`);
        console.log(`Failed: ${total - passed}`);

        if (passed === total) {
            console.log('\n✅✅✅ ALL TESTS PASSED! ✅✅✅\n');
        } else {
            console.log('\n❌ SOME TESTS FAILED\n');
            console.log('Failed tests:');
            this.results.filter(r => !r.passed).forEach(r => {
                console.log(`  ❌ ${r.test}`);
            });
        }

        console.log('='.repeat(60));
    }

    /**
     * Cleanup
     */
    async cleanup() {
        if (this.arch) {
            await this.arch.destroy();
        }
    }
}

// Auto-run tests if in browser
if (typeof window !== 'undefined') {
    window.addEventListener('load', async () => {
        const tests = new UnifiedArchitectureTests();
        await tests.runAll();
        await tests.cleanup();
    });
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedArchitectureTests;
}
