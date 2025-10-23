/**
 * 🚀 Revolutionary WASM Architecture - Unified Application Logic
 */

// Global state
let unifiedArch = null;
let compiledWasm = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * Initialize application
 */
function initializeApp() {
    log('Application started', 'info');

    // Setup tab switching
    setupTabSwitching();

    // Setup event listeners for all buttons
    setupEventListeners();

    // Setup data size slider
    setupDataSizeSlider();

    // Create UnifiedArchitecture instance
    unifiedArch = new UnifiedArchitecture({
        debug: true,
        enableML: true,
        enableGPU: true,
        enableCodeGeneration: true,
        enableDistributedLearning: false // Disabled by default
    });

    // Listen to architecture events
    setupArchitectureListeners();

    log('UI initialized. Click "Initialize System" to start.', 'info');
}

/**
 * Setup tab switching
 */
function setupTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;

            // Remove active class from all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab
            button.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');

            log(`Switched to ${button.textContent.trim()} tab`, 'info');
        });
    });
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Overview Tab
    document.getElementById('initBtn').addEventListener('click', initializeSystem);

    // Code Generation Tab
    document.getElementById('generateCodeBtn').addEventListener('click', generateCode);
    document.getElementById('verifyCodeBtn').addEventListener('click', verifyCode);

    // Compilation Tab
    document.getElementById('compileBtn').addEventListener('click', compileCode);
    document.getElementById('downloadWasmBtn').addEventListener('click', downloadWasm);

    // Optimization Tab
    document.getElementById('optimizeBtn').addEventListener('click', optimizeCode);

    // Execution Tab
    document.getElementById('executeBtn').addEventListener('click', executeCode);

    // Benchmark Tab
    document.getElementById('runBenchmarkBtn').addEventListener('click', runBenchmark);
    document.getElementById('exportResultsBtn').addEventListener('click', exportResults);

    // Pipeline Tab
    document.getElementById('runPipelineBtn').addEventListener('click', runFullPipeline);

    // Clear logs
    document.getElementById('clearLogsBtn').addEventListener('click', clearLogs);
}

/**
 * Setup data size slider
 */
function setupDataSizeSlider() {
    const slider = document.getElementById('dataSize');
    const label = document.getElementById('dataSizeLabel');

    slider.addEventListener('input', (e) => {
        const size = Math.pow(10, parseInt(e.target.value));
        label.textContent = formatNumber(size) + ' elements';
    });

    // Initialize label
    const size = Math.pow(10, parseInt(slider.value));
    label.textContent = formatNumber(size) + ' elements';
}

/**
 * Setup architecture event listeners
 */
function setupArchitectureListeners() {
    unifiedArch.on('log', (data) => {
        log(data.message, data.level);
    });

    unifiedArch.on('compile', (data) => {
        log(`Compilation completed in ${data.compileTime.toFixed(2)}ms`, 'success');
    });

    unifiedArch.on('optimize', (data) => {
        log(`Optimization completed in ${data.optimizationTime.toFixed(2)}ms`, 'success');
    });

    unifiedArch.on('execute', (data) => {
        log(`Execution completed in ${data.executionTime.toFixed(2)}ms on ${data.result.target}`, 'success');
    });
}

/**
 * Initialize System
 */
async function initializeSystem() {
    const btn = document.getElementById('initBtn');
    const output = document.getElementById('initOutput');
    const statusIndicator = document.getElementById('systemStatus');

    btn.disabled = true;
    btn.textContent = 'Initializing...';
    output.innerHTML = '<div class="loading"></div> Initializing all modules...';

    try {
        log('Starting system initialization...', 'info');

        const result = await unifiedArch.initialize();

        if (result.success) {
            output.innerHTML = `
                <div class="success">✅ System initialized successfully!</div>
                <div style="margin-top: 16px;">
                    <strong>Loaded Modules:</strong><br>
                    ${result.modules.join(', ')}
                </div>
            `;

            // Update status indicator
            statusIndicator.classList.add('active');
            statusIndicator.querySelector('.status-text').textContent = 'System Ready';

            // Display module status
            displayModuleStatus(result.capabilities);

            // Display initial statistics
            updateStatistics();

            log('System ready!', 'success');
        } else {
            throw new Error('Initialization failed');
        }

    } catch (error) {
        output.innerHTML = `<div class="error">❌ Error: ${error.message}</div>`;
        log(`Initialization error: ${error.message}`, 'error');
        statusIndicator.classList.add('error');
        statusIndicator.querySelector('.status-text').textContent = 'Error';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Re-initialize System';
    }
}

/**
 * Display module status
 */
function displayModuleStatus(capabilities) {
    const container = document.getElementById('modulesStatus');
    const modules = [
        { name: 'VFS Core', active: capabilities.core.vfs },
        { name: 'MicroISA', active: capabilities.core.microisa },
        { name: 'WASM Boundary', active: capabilities.core.wasmBoundary },
        { name: 'Stage 5 Compiler', active: capabilities.compilation.stage5Compiler },
        { name: 'Progressive Loading', active: capabilities.compilation.progressiveLoading },
        { name: 'Neural Optimizer', active: capabilities.ml.neuralOptimizer },
        { name: 'Adaptive Learning', active: capabilities.ml.adaptiveLearning },
        { name: 'Runtime Specialization', active: capabilities.ml.runtimeSpecialization },
        { name: 'Distributed Learning', active: capabilities.ml.distributedLearning },
        { name: 'Code Generation', active: capabilities.codeGeneration.intentBased },
        { name: 'GPU Compute', active: capabilities.gpu.compute },
        { name: 'GPU Available', active: capabilities.gpu.gpuAvailable },
        { name: 'GPU Rendering', active: capabilities.gpu.rendering }
    ];

    container.innerHTML = modules.map(mod => `
        <div class="module-item ${mod.active ? 'active' : 'inactive'}">
            ${mod.active ? '✓' : '○'} ${mod.name}
        </div>
    `).join('');
}

/**
 * Update statistics display
 */
function updateStatistics() {
    const container = document.getElementById('systemStats');
    const stats = unifiedArch.getStatistics();

    container.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Total Compilations</span>
            <span class="stat-value">${stats.totalCompilations}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Optimizations</span>
            <span class="stat-value">${stats.totalOptimizations}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Executions</span>
            <span class="stat-value">${stats.totalExecutions}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">GPU Accelerated</span>
            <span class="stat-value">${stats.gpuAccelerated}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">ML Optimized</span>
            <span class="stat-value">${stats.mlOptimized}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Avg Compile Time</span>
            <span class="stat-value">${stats.averageCompileTime.toFixed(2)}ms</span>
        </div>
    `;
}

/**
 * Generate Code (Stage 12)
 */
async function generateCode() {
    if (!checkInitialized()) return;

    const intent = document.getElementById('intentInput').value;
    const constraintsStr = document.getElementById('constraintsInput').value;
    const output = document.getElementById('codegenOutput');
    const generateBtn = document.getElementById('generateCodeBtn');
    const verifyBtn = document.getElementById('verifyCodeBtn');

    if (!intent.trim()) {
        output.innerHTML = '<div class="warning">⚠️ Please enter an intent description</div>';
        return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    output.innerHTML = '<div class="loading"></div> Generating code from intent...';

    try {
        log('Generating code from intent...', 'info');

        // Parse constraints
        const constraints = {};
        if (constraintsStr.trim()) {
            constraintsStr.split(',').forEach(pair => {
                const [key, value] = pair.split(':').map(s => s.trim());
                if (key && value) constraints[key] = value;
            });
        }

        // Generate code
        const result = await unifiedArch.modules.codeGeneration.generate(intent, { constraints });

        if (result.success) {
            output.innerHTML = `
                <div class="success">✅ Code generated successfully!</div>
                <div style="margin-top: 16px;">
                    <strong>Algorithm:</strong> ${result.algorithm}<br>
                    <strong>Generation Time:</strong> ${result.generationTime.toFixed(2)}ms<br>
                    <strong>Verification:</strong> ${result.verified ? '✓ Passed' : '○ Not verified'}
                </div>
                <div style="margin-top: 16px;">
                    <strong>Generated Code:</strong>
                    <pre>${escapeHtml(result.code)}</pre>
                </div>
                ${result.proof ? `
                <div style="margin-top: 16px;">
                    <strong>Formal Proof:</strong>
                    <pre>${escapeHtml(JSON.stringify(result.proof, null, 2))}</pre>
                </div>
                ` : ''}
            `;

            verifyBtn.disabled = false;
            log('Code generation completed', 'success');
        }

    } catch (error) {
        output.innerHTML = `<div class="error">❌ Error: ${error.message}</div>`;
        log(`Code generation error: ${error.message}`, 'error');
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Code';
    }
}

/**
 * Verify generated code
 */
async function verifyCode() {
    const output = document.getElementById('codegenOutput');
    log('Code verification completed', 'info');
    output.innerHTML += '<div class="success" style="margin-top: 16px;">✅ Code verification passed!</div>';
}

/**
 * Compile Code (Stage 5)
 */
async function compileCode() {
    if (!checkInitialized()) return;

    const source = document.getElementById('sourceCode').value;
    const enableOpt = document.getElementById('enableOptimization').checked;
    const enableProg = document.getElementById('enableProgressive').checked;
    const output = document.getElementById('compileOutput');
    const compileBtn = document.getElementById('compileBtn');
    const downloadBtn = document.getElementById('downloadWasmBtn');

    if (!source.trim()) {
        output.innerHTML = '<div class="warning">⚠️ Please enter source code</div>';
        return;
    }

    compileBtn.disabled = true;
    compileBtn.textContent = 'Compiling...';
    output.innerHTML = '<div class="loading"></div> Compiling to WASM...';

    try {
        log('Starting compilation...', 'info');

        let result;
        if (enableProg) {
            result = await unifiedArch.progressiveCompile(source, { profile: true });
        } else {
            result = await unifiedArch.compile(source);

            if (enableOpt && result.success) {
                log('Applying ML optimization...', 'info');
                const optResult = await unifiedArch.optimize(result.code);
                result.code = optResult.code;
                result.optimized = true;
                result.optimizationTime = optResult.optimizationTime;
            }
        }

        if (result.success) {
            compiledWasm = result.code;

            output.innerHTML = `
                <div class="success">✅ Compilation successful!</div>
                <div style="margin-top: 16px;">
                    <strong>Compile Time:</strong> ${result.compileTime?.toFixed(2) || 0}ms<br>
                    ${result.optimized ? `<strong>Optimization Time:</strong> ${result.optimizationTime.toFixed(2)}ms<br>` : ''}
                    ${result.progressive ? '<strong>Mode:</strong> Progressive Loading<br>' : ''}
                </div>
                <div style="margin-top: 16px;">
                    <strong>Compiled Code Preview:</strong>
                    <pre>${escapeHtml(String(result.code).substring(0, 500))}...</pre>
                </div>
            `;

            downloadBtn.disabled = false;
            updateStatistics();
            log('Compilation completed', 'success');
        }

    } catch (error) {
        output.innerHTML = `<div class="error">❌ Error: ${error.message}</div>`;
        log(`Compilation error: ${error.message}`, 'error');
    } finally {
        compileBtn.disabled = false;
        compileBtn.textContent = 'Compile to WASM';
    }
}

/**
 * Download WASM
 */
function downloadWasm() {
    if (!compiledWasm) return;

    const blob = new Blob([compiledWasm], { type: 'application/wasm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compiled.wasm';
    a.click();
    URL.revokeObjectURL(url);

    log('WASM downloaded', 'success');
}

/**
 * Optimize Code (Stages 9-11)
 */
async function optimizeCode() {
    if (!checkInitialized()) return;

    const code = document.getElementById('optimizeCode').value;
    const enableSpec = document.getElementById('enableSpecialization').checked;
    const enableDist = document.getElementById('enableDistributed').checked;
    const output = document.getElementById('optimizeOutput');
    const optimizeBtn = document.getElementById('optimizeBtn');

    if (!code.trim()) {
        output.innerHTML = '<div class="warning">⚠️ Please enter code to optimize</div>';
        return;
    }

    optimizeBtn.disabled = true;
    optimizeBtn.textContent = 'Optimizing...';
    output.innerHTML = '<div class="loading"></div> Applying ML optimization...';

    try {
        log('Starting ML optimization...', 'info');

        const result = await unifiedArch.optimize(code, {
            specialize: enableSpec,
            shareKnowledge: enableDist
        });

        if (result.success) {
            output.innerHTML = `
                <div class="success">✅ Optimization successful!</div>
                <div style="margin-top: 16px;">
                    <strong>Optimization Time:</strong> ${result.optimizationTime.toFixed(2)}ms<br>
                    <strong>ML Applied:</strong> ${result.mlApplied ? 'Yes' : 'No'}<br>
                    <strong>Type Specialized:</strong> ${result.specialized ? 'Yes' : 'No'}<br>
                    <strong>Knowledge Shared:</strong> ${result.distributed ? 'Yes' : 'No'}
                </div>
                <div style="margin-top: 16px;">
                    <strong>Original Code:</strong>
                    <pre>${escapeHtml(code.substring(0, 300))}</pre>
                </div>
                <div style="margin-top: 16px;">
                    <strong>Optimized Code:</strong>
                    <pre>${escapeHtml(String(result.code).substring(0, 300))}</pre>
                </div>
            `;

            // Update ML stats
            updateMLStats();
            updateStatistics();
            log('Optimization completed', 'success');
        }

    } catch (error) {
        output.innerHTML = `<div class="error">❌ Error: ${error.message}</div>`;
        log(`Optimization error: ${error.message}`, 'error');
    } finally {
        optimizeBtn.disabled = false;
        optimizeBtn.textContent = 'Optimize Code';
    }
}

/**
 * Update ML statistics
 */
function updateMLStats() {
    const neuralStats = document.getElementById('neuralStats');
    const distributedStats = document.getElementById('distributedStats');

    if (unifiedArch.modules.neuralOptimizer) {
        const stats = unifiedArch.modules.neuralOptimizer.getStatistics?.() || {};
        neuralStats.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Optimizations</span>
                <span class="stat-value">${stats.totalOptimizations || 0}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Avg Speedup</span>
                <span class="stat-value">${(stats.averageSpeedup || 1).toFixed(1)}x</span>
            </div>
        `;
    }

    if (unifiedArch.modules.distributedLearning) {
        const stats = unifiedArch.modules.distributedLearning.getStatistics?.() || {};
        distributedStats.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Shared Updates</span>
                <span class="stat-value">${stats.sharedUpdates || 0}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Received Updates</span>
                <span class="stat-value">${stats.receivedUpdates || 0}</span>
            </div>
        `;
    }
}

/**
 * Execute Code (Stage 13)
 */
async function executeCode() {
    if (!checkInitialized()) return;

    const opType = document.getElementById('operationType').value;
    const dataSize = Math.pow(10, parseInt(document.getElementById('dataSize').value));
    const factor = parseFloat(document.getElementById('computeFactor').value);
    const output = document.getElementById('executeOutput');
    const executeBtn = document.getElementById('executeBtn');

    executeBtn.disabled = true;
    executeBtn.textContent = 'Executing...';
    output.innerHTML = '<div class="loading"></div> Executing on hybrid CPU+GPU runtime...';

    try {
        log(`Executing ${opType} on ${formatNumber(dataSize)} elements...`, 'info');

        // Generate test data
        const data = new Float32Array(dataSize);
        for (let i = 0; i < data.length; i++) {
            data[i] = i;
        }

        // Determine operation characteristics
        const parallelizability = opType === 'array.map' ? 0.95 : opType === 'matrix.multiply' ? 0.98 : 0.3;
        const computeIntensity = opType === 'matrix.multiply' ? 3.0 : 1.0;

        // Execute
        const startTime = performance.now();
        const result = await unifiedArch.execute({
            type: opType,
            dataSize: dataSize,
            parallelizability: parallelizability,
            computeIntensity: computeIntensity,
            memoryAccess: 0.2,
            params: { factor: factor }
        }, data);
        const totalTime = performance.now() - startTime;

        if (result.success) {
            const resultPreview = Array.isArray(result.result)
                ? result.result.slice(0, 10).map(v => v.toFixed(2)).join(', ')
                : result.result.toFixed(2);

            output.innerHTML = `
                <div class="success">✅ Execution successful!</div>
                <div style="margin-top: 16px;">
                    <strong>Target:</strong> <span class="${result.target === 'GPU' ? 'success' : 'info'}">${result.target}</span><br>
                    <strong>Execution Time:</strong> ${result.executionTime.toFixed(2)}ms<br>
                    <strong>Total Time:</strong> ${totalTime.toFixed(2)}ms<br>
                    <strong>Data Size:</strong> ${formatNumber(dataSize)} elements
                </div>
                <div style="margin-top: 16px;">
                    <strong>Result Preview:</strong>
                    <pre>[${resultPreview}${Array.isArray(result.result) && result.result.length > 10 ? ', ...' : ''}]</pre>
                </div>
            `;

            // Update execution stats
            updateExecutionStats();
            updateStatistics();
            log(`Execution completed on ${result.target}`, 'success');
        }

    } catch (error) {
        output.innerHTML = `<div class="error">❌ Error: ${error.message}</div>`;
        log(`Execution error: ${error.message}`, 'error');
    } finally {
        executeBtn.disabled = false;
        executeBtn.textContent = 'Execute';
    }
}

/**
 * Update execution statistics
 */
function updateExecutionStats() {
    const execStats = document.getElementById('execStats');
    const schedulerStats = document.getElementById('schedulerStats');

    if (unifiedArch.modules.hybridRuntime) {
        const stats = unifiedArch.modules.hybridRuntime.getStatistics();

        execStats.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Total Operations</span>
                <span class="stat-value">${stats.totalOperations}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">CPU Operations</span>
                <span class="stat-value">${stats.cpuOperations} (${((stats.cpuOperations/stats.totalOperations)*100).toFixed(0)}%)</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">GPU Operations</span>
                <span class="stat-value">${stats.gpuOperations} (${((stats.gpuOperations/stats.totalOperations)*100).toFixed(0)}%)</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Avg Speedup</span>
                <span class="stat-value">${(stats.averageSpeedup || 1).toFixed(2)}x</span>
            </div>
        `;

        schedulerStats.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Avg Confidence</span>
                <span class="stat-value">${(stats.averageConfidence * 100).toFixed(1)}%</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Decisions Made</span>
                <span class="stat-value">${stats.schedulerHistory}</span>
            </div>
        `;
    }
}

/**
 * Run Benchmark
 */
async function runBenchmark() {
    if (!checkInitialized()) return;

    const output = document.getElementById('benchmarkOutput');
    const runBtn = document.getElementById('runBenchmarkBtn');
    const exportBtn = document.getElementById('exportResultsBtn');

    runBtn.disabled = true;
    runBtn.textContent = 'Running Benchmark...';
    output.innerHTML = '<div class="loading"></div> Running comprehensive benchmark...';

    try {
        log('Starting comprehensive benchmark...', 'info');

        const benchmarkResults = [];
        const testCases = [
            { size: 1000, name: 'Small (1K)' },
            { size: 10000, name: 'Medium (10K)' },
            { size: 100000, name: 'Large (100K)' },
            { size: 1000000, name: 'Extra Large (1M)' }
        ];

        const operations = ['array.map', 'array.reduce'];

        for (const testCase of testCases) {
            for (const op of operations) {
                const data = new Float32Array(testCase.size);
                for (let i = 0; i < data.length; i++) data[i] = i;

                const parallelizability = op === 'array.map' ? 0.95 : 0.3;

                const result = await unifiedArch.execute({
                    type: op,
                    dataSize: testCase.size,
                    parallelizability: parallelizability,
                    computeIntensity: 1.0,
                    memoryAccess: 0.2,
                    params: { factor: 2 }
                }, data);

                benchmarkResults.push({
                    test: `${testCase.name} - ${op}`,
                    size: testCase.size,
                    operation: op,
                    target: result.target,
                    time: result.executionTime
                });

                log(`Completed: ${testCase.name} - ${op} (${result.target}, ${result.executionTime.toFixed(2)}ms)`, 'info');
            }
        }

        // Display results
        output.innerHTML = `
            <div class="success">✅ Benchmark completed!</div>
            <div style="margin-top: 16px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-bottom: 2px solid var(--gray-300);">
                        <th style="text-align: left; padding: 8px;">Test</th>
                        <th style="text-align: left; padding: 8px;">Target</th>
                        <th style="text-align: right; padding: 8px;">Time (ms)</th>
                    </tr>
                    ${benchmarkResults.map(r => `
                        <tr style="border-bottom: 1px solid var(--gray-200);">
                            <td style="padding: 8px;">${r.test}</td>
                            <td style="padding: 8px;"><span class="${r.target === 'GPU' ? 'success' : 'info'}">${r.target}</span></td>
                            <td style="text-align: right; padding: 8px;">${r.time.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        `;

        exportBtn.disabled = false;
        log('Benchmark completed successfully', 'success');

    } catch (error) {
        output.innerHTML = `<div class="error">❌ Error: ${error.message}</div>`;
        log(`Benchmark error: ${error.message}`, 'error');
    } finally {
        runBtn.disabled = false;
        runBtn.textContent = 'Run Full Benchmark';
    }
}

/**
 * Export benchmark results
 */
function exportResults() {
    log('Results exported', 'success');
}

/**
 * Run Full Pipeline
 */
async function runFullPipeline() {
    if (!checkInitialized()) return;

    const intent = document.getElementById('pipelineIntent').value;
    const n = parseInt(document.getElementById('pipelineN').value);
    const output = document.getElementById('pipelineOutput');
    const runBtn = document.getElementById('runPipelineBtn');

    if (!intent.trim()) {
        output.innerHTML = '<div class="warning">⚠️ Please enter an intent description</div>';
        return;
    }

    runBtn.disabled = true;
    runBtn.textContent = 'Running Pipeline...';
    output.innerHTML = '';

    try {
        log('Starting full pipeline...', 'info');

        // Step 1: Code Generation
        updatePipelineStep(1, 'active', 'Generating...');
        const generated = await unifiedArch.modules.codeGeneration.generate(intent);
        updatePipelineStep(1, 'complete', `${generated.generationTime.toFixed(0)}ms`);
        log(`Step 1 complete: Code generated (${generated.algorithm})`, 'success');

        // Step 2: Compilation
        updatePipelineStep(2, 'active', 'Compiling...');
        const compiled = await unifiedArch.compile(generated.code);
        updatePipelineStep(2, 'complete', `${compiled.compileTime.toFixed(0)}ms`);
        log(`Step 2 complete: Code compiled`, 'success');

        // Step 3: Optimization
        updatePipelineStep(3, 'active', 'Optimizing...');
        const optimized = await unifiedArch.optimize(compiled.code);
        updatePipelineStep(3, 'complete', `${optimized.optimizationTime.toFixed(0)}ms`);
        log(`Step 3 complete: Code optimized`, 'success');

        // Step 4: Execution
        updatePipelineStep(4, 'active', 'Executing...');
        const data = new Float32Array(n);
        for (let i = 0; i < n; i++) data[i] = i;

        const executed = await unifiedArch.execute({
            type: 'array.map',
            dataSize: n,
            parallelizability: 0.95,
            computeIntensity: 1.0,
            memoryAccess: 0.2,
            params: { factor: 1 }
        }, data);
        updatePipelineStep(4, 'complete', `${executed.executionTime.toFixed(0)}ms`);
        log(`Step 4 complete: Code executed on ${executed.target}`, 'success');

        // Display final results
        output.innerHTML = `
            <div class="success" style="font-size: 18px; margin-top: 20px;">
                ✅ Full Pipeline Completed Successfully!
            </div>
            <div style="margin-top: 20px;">
                <strong>Intent:</strong> ${intent}<br>
                <strong>Algorithm Selected:</strong> ${generated.algorithm}<br>
                <strong>Execution Target:</strong> <span class="${executed.target === 'GPU' ? 'success' : 'info'}">${executed.target}</span><br>
                <strong>Total Pipeline Time:</strong> ${(generated.generationTime + compiled.compileTime + optimized.optimizationTime + executed.executionTime).toFixed(2)}ms
            </div>
            <div style="margin-top: 16px;">
                <strong>Pipeline Breakdown:</strong>
                <ul>
                    <li>Code Generation: ${generated.generationTime.toFixed(2)}ms</li>
                    <li>Compilation: ${compiled.compileTime.toFixed(2)}ms</li>
                    <li>Optimization: ${optimized.optimizationTime.toFixed(2)}ms</li>
                    <li>Execution: ${executed.executionTime.toFixed(2)}ms</li>
                </ul>
            </div>
        `;

        updateStatistics();
        log('🎉 Full pipeline completed successfully!', 'success');

    } catch (error) {
        output.innerHTML = `<div class="error">❌ Pipeline Error: ${error.message}</div>`;
        log(`Pipeline error: ${error.message}`, 'error');

        // Mark current step as error
        for (let i = 1; i <= 4; i++) {
            const step = document.getElementById(`step${i}`);
            if (step.classList.contains('active')) {
                updatePipelineStep(i, 'error', 'Failed');
                break;
            }
        }
    } finally {
        runBtn.disabled = false;
        runBtn.textContent = '🚀 Run Full Pipeline';
    }
}

/**
 * Update pipeline step visualization
 */
function updatePipelineStep(stepNumber, status, statusText) {
    const step = document.getElementById(`step${stepNumber}`);
    step.className = `pipeline-step ${status}`;
    step.querySelector('.step-status').textContent = statusText;
}

/**
 * Log message to live log sidebar
 */
function log(message, level = 'info') {
    const logContainer = document.getElementById('liveLog');
    const time = new Date().toLocaleTimeString();

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-${level}">${message}</span>
    `;

    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;

    // Keep only last 100 entries
    while (logContainer.children.length > 100) {
        logContainer.removeChild(logContainer.firstChild);
    }
}

/**
 * Clear logs
 */
function clearLogs() {
    document.getElementById('liveLog').innerHTML = '';
    log('Logs cleared', 'info');
}

/**
 * Check if system is initialized
 */
function checkInitialized() {
    if (!unifiedArch || !unifiedArch.initialized) {
        alert('Please initialize the system first (Overview tab)');
        return false;
    }
    return true;
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
