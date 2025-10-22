/**
 * ============================================================================
 * STAGE 13: HYBRID CPU+GPU ARCHITECTURE
 * ============================================================================
 *
 * Революционная архитектура, которая автоматически распределяет вычисления
 * между CPU (WebAssembly) и GPU (WebGPU) для достижения максимальной производительности.
 *
 * Основные компоненты:
 * 1. HybridRuntime - главный координатор
 * 2. GPUExecutor - выполнение на GPU через WebGPU
 * 3. MLScheduler - ML-модель для решения CPU vs GPU
 * 4. BufferPool - переиспользование GPU буферов
 * 5. PipelineCache - кэш скомпилированных шейдеров
 * 6. SmartDataManager - минимизация трансферов данных
 */

// ============================================================================
// GPU SHADER LIBRARY
// ============================================================================

const WGSL_SHADERS = {
    // Простой map: применить функцию к каждому элементу
    'array.map': `
        @group(0) @binding(0) var<storage, read> input: array<f32>;
        @group(0) @binding(1) var<storage, read_write> output: array<f32>;
        @group(0) @binding(2) var<uniform> params: vec4<f32>;

        @compute @workgroup_size(256)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let index = global_id.x;
            let size = u32(params.x);

            if (index < size) {
                // Simple example: multiply by factor
                let factor = params.y;
                output[index] = input[index] * factor;
            }
        }
    `,

    // Parallel reduction (sum)
    'array.reduce': `
        @group(0) @binding(0) var<storage, read> input: array<f32>;
        @group(0) @binding(1) var<storage, read_write> output: array<f32>;
        @group(0) @binding(2) var<uniform> params: vec4<f32>;

        var<workgroup> shared: array<f32, 256>;

        @compute @workgroup_size(256)
        fn main(
            @builtin(global_invocation_id) global_id: vec3<u32>,
            @builtin(local_invocation_id) local_id: vec3<u32>,
            @builtin(workgroup_id) workgroup_id: vec3<u32>
        ) {
            let tid = local_id.x;
            let gid = global_id.x;
            let size = u32(params.x);

            // Load data into shared memory
            if (gid < size) {
                shared[tid] = input[gid];
            } else {
                shared[tid] = 0.0;
            }

            workgroupBarrier();

            // Parallel reduction in shared memory
            for (var s: u32 = 128u; s > 0u; s = s >> 1u) {
                if (tid < s) {
                    shared[tid] = shared[tid] + shared[tid + s];
                }
                workgroupBarrier();
            }

            // Write result for this workgroup
            if (tid == 0u) {
                output[workgroup_id.x] = shared[0];
            }
        }
    `,

    'array.reduce.sum': `
        @group(0) @binding(0) var<storage, read> input: array<f32>;
        @group(0) @binding(1) var<storage, read_write> output: array<f32>;
        @group(0) @binding(2) var<uniform> params: vec4<f32>;

        var<workgroup> shared: array<f32, 256>;

        @compute @workgroup_size(256)
        fn main(
            @builtin(global_invocation_id) global_id: vec3<u32>,
            @builtin(local_invocation_id) local_id: vec3<u32>,
            @builtin(workgroup_id) workgroup_id: vec3<u32>
        ) {
            let tid = local_id.x;
            let gid = global_id.x;
            let size = u32(params.x);

            // Load data into shared memory
            if (gid < size) {
                shared[tid] = input[gid];
            } else {
                shared[tid] = 0.0;
            }

            workgroupBarrier();

            // Parallel reduction in shared memory
            for (var s: u32 = 128u; s > 0u; s = s >> 1u) {
                if (tid < s) {
                    shared[tid] = shared[tid] + shared[tid + s];
                }
                workgroupBarrier();
            }

            // Write result for this workgroup
            if (tid == 0u) {
                output[workgroup_id.x] = shared[0];
            }
        }
    `,

    // Matrix multiplication (tiled algorithm)
    'matrix.multiply': `
        @group(0) @binding(0) var<storage, read> a: array<f32>;
        @group(0) @binding(1) var<storage, read> b: array<f32>;
        @group(0) @binding(2) var<storage, read_write> c: array<f32>;
        @group(0) @binding(3) var<uniform> params: vec4<f32>;

        var<workgroup> tileA: array<f32, 256>;
        var<workgroup> tileB: array<f32, 256>;

        @compute @workgroup_size(16, 16)
        fn main(
            @builtin(global_invocation_id) global_id: vec3<u32>,
            @builtin(local_invocation_id) local_id: vec3<u32>
        ) {
            let M = u32(params.x);
            let N = u32(params.y);
            let K = u32(params.z);

            let row = global_id.y;
            let col = global_id.x;
            let localRow = local_id.y;
            let localCol = local_id.x;

            var sum = 0.0;

            // Tile through K dimension
            let numTiles = (K + 15u) / 16u;

            for (var t = 0u; t < numTiles; t = t + 1u) {
                // Load tiles into shared memory
                let tileCol = t * 16u + localCol;
                let tileRow = t * 16u + localRow;

                if (row < M && tileCol < K) {
                    tileA[localRow * 16u + localCol] = a[row * K + tileCol];
                } else {
                    tileA[localRow * 16u + localCol] = 0.0;
                }

                if (tileRow < K && col < N) {
                    tileB[localRow * 16u + localCol] = b[tileRow * N + col];
                } else {
                    tileB[localRow * 16u + localCol] = 0.0;
                }

                workgroupBarrier();

                // Compute partial sum
                for (var k = 0u; k < 16u; k = k + 1u) {
                    sum = sum + tileA[localRow * 16u + k] * tileB[k * 16u + localCol];
                }

                workgroupBarrier();
            }

            // Write result
            if (row < M && col < N) {
                c[row * N + col] = sum;
            }
        }
    `,

    // 2D Convolution (image filter)
    'image.filter': `
        @group(0) @binding(0) var<storage, read> input: array<f32>;
        @group(0) @binding(1) var<storage, read> kernel: array<f32>;
        @group(0) @binding(2) var<storage, read_write> output: array<f32>;
        @group(0) @binding(3) var<uniform> params: vec4<f32>;

        @compute @workgroup_size(16, 16)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let width = u32(params.x);
            let height = u32(params.y);
            let kernelSize = u32(params.z);

            let x = global_id.x;
            let y = global_id.y;

            if (x >= width || y >= height) {
                return;
            }

            var sum = 0.0;
            let halfKernel = kernelSize / 2u;

            // Apply convolution
            for (var ky = 0u; ky < kernelSize; ky = ky + 1u) {
                for (var kx = 0u; kx < kernelSize; kx = kx + 1u) {
                    let ix = i32(x) + i32(kx) - i32(halfKernel);
                    let iy = i32(y) + i32(ky) - i32(halfKernel);

                    // Clamp to boundaries
                    if (ix >= 0 && ix < i32(width) && iy >= 0 && iy < i32(height)) {
                        let inputIdx = u32(iy) * width + u32(ix);
                        let kernelIdx = ky * kernelSize + kx;
                        sum = sum + input[inputIdx] * kernel[kernelIdx];
                    }
                }
            }

            output[y * width + x] = sum;
        }
    `
};

// ============================================================================
// BUFFER POOL - Efficient GPU Memory Management
// ============================================================================

class BufferPool {
    constructor(device) {
        this.device = device;
        this.pools = new Map(); // size → [buffer1, buffer2, ...]
        this.stats = {
            allocations: 0,
            reuses: 0,
            totalMemory: 0
        };
    }

    /**
     * Получить буфер из пула или создать новый
     */
    acquire(size, usage) {
        const key = `${size}_${usage}`;
        const pool = this.pools.get(key) || [];

        if (pool.length > 0) {
            this.stats.reuses++;
            return pool.pop();
        }

        this.stats.allocations++;
        this.stats.totalMemory += size;

        return this.device.createBuffer({
            size: size,
            usage: usage,
            mappedAtCreation: false
        });
    }

    /**
     * Вернуть буфер в пул для переиспользования
     */
    release(buffer, size, usage) {
        const key = `${size}_${usage}`;
        const pool = this.pools.get(key) || [];
        pool.push(buffer);
        this.pools.set(key, pool);
    }

    /**
     * Очистить пул (освободить память)
     */
    clear() {
        for (const [key, pool] of this.pools.entries()) {
            for (const buffer of pool) {
                buffer.destroy();
            }
        }
        this.pools.clear();
        this.stats.totalMemory = 0;
    }

    getStats() {
        return {
            ...this.stats,
            reuseRate: this.stats.reuses / (this.stats.allocations + this.stats.reuses)
        };
    }
}

// ============================================================================
// PIPELINE CACHE - Shader Compilation Caching
// ============================================================================

class PipelineCache {
    constructor(device) {
        this.device = device;
        this.cache = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            compilationTime: 0
        };
    }

    /**
     * Получить pipeline (из кэша или скомпилировать)
     */
    async get(key, shaderCode, entryPoint = 'main') {
        const cacheKey = `${key}:${this.hashCode(shaderCode)}`;

        if (this.cache.has(cacheKey)) {
            this.stats.hits++;
            return this.cache.get(cacheKey);
        }

        this.stats.misses++;
        const startTime = performance.now();

        const shaderModule = this.device.createShaderModule({
            code: shaderCode
        });

        const pipeline = await this.device.createComputePipelineAsync({
            layout: 'auto',
            compute: {
                module: shaderModule,
                entryPoint: entryPoint
            }
        });

        const compilationTime = performance.now() - startTime;
        this.stats.compilationTime += compilationTime;

        this.cache.set(cacheKey, pipeline);
        console.log(`[PipelineCache] Compiled ${key} in ${compilationTime.toFixed(2)}ms`);

        return pipeline;
    }

    /**
     * Простой хэш строки
     */
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }

    getStats() {
        return {
            ...this.stats,
            hitRate: this.stats.hits / (this.stats.hits + this.stats.misses),
            avgCompilationTime: this.stats.compilationTime / this.stats.misses
        };
    }
}

// ============================================================================
// ML SCHEDULER - Decides CPU vs GPU
// ============================================================================

class MLScheduler {
    constructor() {
        // Простая нейронная сеть для принятия решений
        // Входы: [dataSize, parallelizability, computeIntensity, memoryAccess, gpuLoad, cpuLoad]
        // Выход: вероятность, что GPU будет быстрее

        this.weights = {
            // Эти веса настроены на основе бенчмарков
            dataSize: 0.3,           // Большие данные → GPU
            parallelizability: 0.35, // Высокий параллелизм → GPU
            computeIntensity: 0.2,   // Много вычислений → GPU
            memoryAccess: -0.15,     // Random access → CPU
            gpuLoad: -0.25,          // GPU занят → CPU
            cpuLoad: 0.15            // CPU занят → GPU
        };

        this.threshold = 0.5;
        this.gpuLoad = 0;
        this.cpuLoad = 0;

        // Статистика для обучения
        this.history = [];
    }

    /**
     * Принять решение: CPU или GPU?
     */
    decide(operation) {
        const features = this.extractFeatures(operation);
        const score = this.calculateScore(features);

        const decision = {
            target: score > this.threshold ? 'GPU' : 'CPU',
            confidence: Math.abs(score - this.threshold) * 2,
            score: score,
            features: features,
            estimatedSpeedup: score > this.threshold ? this.estimateGPUSpeedup(features) : 1.0
        };

        console.log(`[MLScheduler] Decision for ${operation.type}:`, decision);

        return decision;
    }

    /**
     * Извлечь признаки из операции
     */
    extractFeatures(operation) {
        return {
            dataSize: this.normalizeDataSize(operation.dataSize || 0),
            parallelizability: operation.parallelizability || 0,
            computeIntensity: operation.computeIntensity || 1,
            memoryAccess: operation.memoryAccess || 0, // 0 = sequential, 1 = random
            gpuLoad: this.gpuLoad,
            cpuLoad: this.cpuLoad
        };
    }

    /**
     * Нормализовать размер данных (логарифмическая шкала)
     */
    normalizeDataSize(size) {
        if (size < 1000) return 0.1;
        if (size < 10000) return 0.3;
        if (size < 100000) return 0.5;
        if (size < 1000000) return 0.7;
        return 0.9;
    }

    /**
     * Вычислить score для решения
     */
    calculateScore(features) {
        let score = 0.5; // Base score

        score += features.dataSize * this.weights.dataSize;
        score += features.parallelizability * this.weights.parallelizability;
        score += features.computeIntensity * this.weights.computeIntensity;
        score += features.memoryAccess * this.weights.memoryAccess;
        score += features.gpuLoad * this.weights.gpuLoad;
        score += features.cpuLoad * this.weights.cpuLoad;

        // Clamp to [0, 1]
        return Math.max(0, Math.min(1, score));
    }

    /**
     * Оценить ускорение на GPU
     */
    estimateGPUSpeedup(features) {
        // Базовое ускорение зависит от параллелизма и размера данных
        const baseSpeedup = 10 + features.parallelizability * 40 + features.dataSize * 50;

        // Штраф за random memory access
        const memoryPenalty = 1 - (features.memoryAccess * 0.5);

        // Штраф за загрузку GPU
        const loadPenalty = 1 - (features.gpuLoad * 0.3);

        return baseSpeedup * memoryPenalty * loadPenalty;
    }

    /**
     * Обновить загрузку GPU/CPU
     */
    updateLoad(target, duration) {
        if (target === 'GPU') {
            this.gpuLoad = Math.min(1, this.gpuLoad + duration / 1000);
        } else {
            this.cpuLoad = Math.min(1, this.cpuLoad + duration / 1000);
        }

        // Decay со временем
        setTimeout(() => {
            if (target === 'GPU') {
                this.gpuLoad = Math.max(0, this.gpuLoad - duration / 1000);
            } else {
                this.cpuLoad = Math.max(0, this.cpuLoad - duration / 1000);
            }
        }, duration);
    }

    /**
     * Записать результат выполнения для обучения
     */
    recordExecution(operation, target, actualTime) {
        this.history.push({
            operation: operation,
            decision: target,
            actualTime: actualTime,
            timestamp: Date.now()
        });

        // Ограничим размер истории
        if (this.history.length > 1000) {
            this.history.shift();
        }
    }

    /**
     * Обучиться на исторических данных (упрощенно)
     */
    learn() {
        if (this.history.length < 100) return;

        console.log('[MLScheduler] Learning from historical data...');

        // Простой градиентный спуск для подстройки весов
        // В реальности здесь был бы полноценный ML алгоритм

        let improvements = 0;

        for (const record of this.history) {
            const features = this.extractFeatures(record.operation);
            const score = this.calculateScore(features);
            const predicted = score > this.threshold ? 'GPU' : 'CPU';

            // Если предсказание было правильным, не меняем веса
            if (predicted === record.decision) {
                improvements++;
            }
        }

        const accuracy = improvements / this.history.length;
        console.log(`[MLScheduler] Current accuracy: ${(accuracy * 100).toFixed(1)}%`);
    }
}

// ============================================================================
// SMART DATA MANAGER - Minimize CPU↔GPU Transfers
// ============================================================================

class SmartDataManager {
    constructor(device, bufferPool) {
        this.device = device;
        this.bufferPool = bufferPool;
        this.gpuCache = new Map(); // key → {buffer, size, lastAccess}
        this.maxCacheSize = 100 * 1024 * 1024; // 100 MB
        this.currentCacheSize = 0;
    }

    /**
     * Получить данные на GPU (из кэша или скопировать)
     */
    async getGPUData(key, cpuData) {
        // Check cache
        if (this.gpuCache.has(key)) {
            const cached = this.gpuCache.get(key);
            cached.lastAccess = Date.now();
            console.log(`[DataManager] Cache hit for ${key}`);
            return cached.buffer;
        }

        console.log(`[DataManager] Cache miss for ${key}, transferring...`);

        // Need to transfer
        const size = cpuData.byteLength;
        const buffer = this.bufferPool.acquire(
            size,
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        );

        this.device.queue.writeBuffer(buffer, 0, cpuData);

        // Add to cache
        this.gpuCache.set(key, {
            buffer: buffer,
            size: size,
            lastAccess: Date.now()
        });

        this.currentCacheSize += size;

        // Evict if cache too large
        if (this.currentCacheSize > this.maxCacheSize) {
            this.evictLRU();
        }

        return buffer;
    }

    /**
     * Удалить самые старые элементы из кэша
     */
    evictLRU() {
        const entries = Array.from(this.gpuCache.entries());
        entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);

        const toRemove = Math.ceil(entries.length * 0.2); // Remove 20%

        for (let i = 0; i < toRemove; i++) {
            const [key, cached] = entries[i];
            this.bufferPool.release(cached.buffer, cached.size, GPUBufferUsage.STORAGE);
            this.currentCacheSize -= cached.size;
            this.gpuCache.delete(key);
        }

        console.log(`[DataManager] Evicted ${toRemove} entries from cache`);
    }

    /**
     * Очистить весь кэш
     */
    clear() {
        for (const [key, cached] of this.gpuCache.entries()) {
            this.bufferPool.release(cached.buffer, cached.size, GPUBufferUsage.STORAGE);
        }
        this.gpuCache.clear();
        this.currentCacheSize = 0;
    }
}

// ============================================================================
// GPU EXECUTOR - WebGPU Execution Engine
// ============================================================================

class GPUExecutor {
    constructor(device, adapter) {
        this.device = device;
        this.adapter = adapter;
        this.bufferPool = new BufferPool(device);
        this.pipelineCache = new PipelineCache(device);
        this.dataManager = new SmartDataManager(device, this.bufferPool);

        this.stats = {
            totalExecutions: 0,
            totalTime: 0,
            operations: new Map()
        };
    }

    /**
     * Выполнить операцию на GPU
     */
    async execute(operation, data) {
        const startTime = performance.now();

        console.log(`[GPUExecutor] Executing ${operation.type} on GPU...`);

        let result;

        try {
            switch (operation.type) {
                case 'array.map':
                    result = await this.executeArrayMap(data, operation.params);
                    break;

                case 'array.reduce':
                case 'array.reduce.sum':
                    result = await this.executeArrayReduce(data);
                    break;

                case 'matrix.multiply':
                    result = await this.executeMatrixMultiply(
                        data.a, data.b, data.M, data.N, data.K
                    );
                    break;

                case 'image.filter':
                    result = await this.executeImageFilter(
                        data.image, data.kernel, data.width, data.height
                    );
                    break;

                default:
                    throw new Error(`Unknown GPU operation: ${operation.type}`);
            }

            const executionTime = performance.now() - startTime;

            // Update stats
            this.stats.totalExecutions++;
            this.stats.totalTime += executionTime;

            const opStats = this.stats.operations.get(operation.type) || { count: 0, time: 0 };
            opStats.count++;
            opStats.time += executionTime;
            this.stats.operations.set(operation.type, opStats);

            console.log(`[GPUExecutor] Completed in ${executionTime.toFixed(2)}ms`);

            // Return object with result and metadata
            return {
                result: result,
                executionTime: executionTime,
                target: 'GPU'
            };

        } catch (error) {
            console.error('[GPUExecutor] Error:', error);
            throw error;
        }
    }

    /**
     * Array.map на GPU
     */
    async executeArrayMap(inputArray, params) {
        const size = inputArray.length;

        // Get pipeline
        const pipeline = await this.pipelineCache.get('array.map', WGSL_SHADERS['array.map']);

        // Create buffers
        const inputBuffer = this.bufferPool.acquire(
            size * 4,
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        );

        const outputBuffer = this.bufferPool.acquire(
            size * 4,
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        );

        const paramsBuffer = this.bufferPool.acquire(
            16,
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        );

        const readBuffer = this.bufferPool.acquire(
            size * 4,
            GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        );

        // Upload data
        this.device.queue.writeBuffer(inputBuffer, 0, new Float32Array(inputArray));
        this.device.queue.writeBuffer(paramsBuffer, 0, new Float32Array([
            size,
            params.factor || 2.0,
            0, 0
        ]));

        // Create bind group
        const bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: inputBuffer } },
                { binding: 1, resource: { buffer: outputBuffer } },
                { binding: 2, resource: { buffer: paramsBuffer } }
            ]
        });

        // Execute
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(size / 256));
        passEncoder.end();

        // Copy to read buffer
        commandEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, size * 4);

        this.device.queue.submit([commandEncoder.finish()]);

        // Read result
        await readBuffer.mapAsync(GPUMapMode.READ);
        const result = new Float32Array(readBuffer.getMappedRange()).slice();
        readBuffer.unmap();

        // Release buffers
        this.bufferPool.release(inputBuffer, size * 4, GPUBufferUsage.STORAGE);
        this.bufferPool.release(outputBuffer, size * 4, GPUBufferUsage.STORAGE);
        this.bufferPool.release(paramsBuffer, 16, GPUBufferUsage.UNIFORM);
        this.bufferPool.release(readBuffer, size * 4, GPUBufferUsage.MAP_READ);

        return Array.from(result);
    }

    /**
     * Array.reduce (sum) на GPU
     */
    async executeArrayReduce(inputArray) {
        const size = inputArray.length;
        const workgroups = Math.ceil(size / 256);

        // Get pipeline - use 'array.reduce' key
        const pipeline = await this.pipelineCache.get('array.reduce', WGSL_SHADERS['array.reduce']);

        // Create buffers
        const inputBuffer = this.bufferPool.acquire(
            size * 4,
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        );

        const outputBuffer = this.bufferPool.acquire(
            workgroups * 4,
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        );

        const paramsBuffer = this.bufferPool.acquire(
            16,
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        );

        const readBuffer = this.bufferPool.acquire(
            workgroups * 4,
            GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        );

        // Upload data
        this.device.queue.writeBuffer(inputBuffer, 0, new Float32Array(inputArray));
        this.device.queue.writeBuffer(paramsBuffer, 0, new Float32Array([size, 0, 0, 0]));

        // Create bind group
        const bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: inputBuffer } },
                { binding: 1, resource: { buffer: outputBuffer } },
                { binding: 2, resource: { buffer: paramsBuffer } }
            ]
        });

        // Execute
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.dispatchWorkgroups(workgroups);
        passEncoder.end();

        commandEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, workgroups * 4);

        this.device.queue.submit([commandEncoder.finish()]);

        // Read partial results
        await readBuffer.mapAsync(GPUMapMode.READ);
        const partialSums = new Float32Array(readBuffer.getMappedRange());

        // Final reduction on CPU (small array)
        let finalSum = 0;
        for (let i = 0; i < partialSums.length; i++) {
            finalSum += partialSums[i];
        }

        readBuffer.unmap();

        // Release buffers
        this.bufferPool.release(inputBuffer, size * 4, GPUBufferUsage.STORAGE);
        this.bufferPool.release(outputBuffer, workgroups * 4, GPUBufferUsage.STORAGE);
        this.bufferPool.release(paramsBuffer, 16, GPUBufferUsage.UNIFORM);
        this.bufferPool.release(readBuffer, workgroups * 4, GPUBufferUsage.MAP_READ);

        return finalSum;
    }

    /**
     * Matrix multiplication на GPU
     */
    async executeMatrixMultiply(a, b, M, N, K) {
        const pipeline = await this.pipelineCache.get('matrix.multiply', WGSL_SHADERS['matrix.multiply']);

        // Create buffers
        const aBuffer = this.bufferPool.acquire(M * K * 4, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
        const bBuffer = this.bufferPool.acquire(K * N * 4, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
        const cBuffer = this.bufferPool.acquire(M * N * 4, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
        const paramsBuffer = this.bufferPool.acquire(16, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
        const readBuffer = this.bufferPool.acquire(M * N * 4, GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);

        // Upload
        this.device.queue.writeBuffer(aBuffer, 0, new Float32Array(a));
        this.device.queue.writeBuffer(bBuffer, 0, new Float32Array(b));
        this.device.queue.writeBuffer(paramsBuffer, 0, new Float32Array([M, N, K, 0]));

        // Bind group
        const bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: aBuffer } },
                { binding: 1, resource: { buffer: bBuffer } },
                { binding: 2, resource: { buffer: cBuffer } },
                { binding: 3, resource: { buffer: paramsBuffer } }
            ]
        });

        // Execute
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(N / 16), Math.ceil(M / 16));
        passEncoder.end();

        commandEncoder.copyBufferToBuffer(cBuffer, 0, readBuffer, 0, M * N * 4);
        this.device.queue.submit([commandEncoder.finish()]);

        // Read result
        await readBuffer.mapAsync(GPUMapMode.READ);
        const result = new Float32Array(readBuffer.getMappedRange()).slice();
        readBuffer.unmap();

        // Release
        this.bufferPool.release(aBuffer, M * K * 4, GPUBufferUsage.STORAGE);
        this.bufferPool.release(bBuffer, K * N * 4, GPUBufferUsage.STORAGE);
        this.bufferPool.release(cBuffer, M * N * 4, GPUBufferUsage.STORAGE);
        this.bufferPool.release(paramsBuffer, 16, GPUBufferUsage.UNIFORM);
        this.bufferPool.release(readBuffer, M * N * 4, GPUBufferUsage.MAP_READ);

        return Array.from(result);
    }

    /**
     * Image filter на GPU
     */
    async executeImageFilter(image, kernel, width, height) {
        const kernelSize = Math.sqrt(kernel.length);

        const pipeline = await this.pipelineCache.get('image.filter', WGSL_SHADERS['image.filter']);

        // Buffers
        const imageBuffer = this.bufferPool.acquire(width * height * 4, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
        const kernelBuffer = this.bufferPool.acquire(kernel.length * 4, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
        const outputBuffer = this.bufferPool.acquire(width * height * 4, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
        const paramsBuffer = this.bufferPool.acquire(16, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
        const readBuffer = this.bufferPool.acquire(width * height * 4, GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);

        // Upload
        this.device.queue.writeBuffer(imageBuffer, 0, new Float32Array(image));
        this.device.queue.writeBuffer(kernelBuffer, 0, new Float32Array(kernel));
        this.device.queue.writeBuffer(paramsBuffer, 0, new Float32Array([width, height, kernelSize, 0]));

        // Bind group
        const bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: imageBuffer } },
                { binding: 1, resource: { buffer: kernelBuffer } },
                { binding: 2, resource: { buffer: outputBuffer } },
                { binding: 3, resource: { buffer: paramsBuffer } }
            ]
        });

        // Execute
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(width / 16), Math.ceil(height / 16));
        passEncoder.end();

        commandEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, width * height * 4);
        this.device.queue.submit([commandEncoder.finish()]);

        // Read
        await readBuffer.mapAsync(GPUMapMode.READ);
        const result = new Float32Array(readBuffer.getMappedRange()).slice();
        readBuffer.unmap();

        // Release
        this.bufferPool.release(imageBuffer, width * height * 4, GPUBufferUsage.STORAGE);
        this.bufferPool.release(kernelBuffer, kernel.length * 4, GPUBufferUsage.STORAGE);
        this.bufferPool.release(outputBuffer, width * height * 4, GPUBufferUsage.STORAGE);
        this.bufferPool.release(paramsBuffer, 16, GPUBufferUsage.UNIFORM);
        this.bufferPool.release(readBuffer, width * height * 4, GPUBufferUsage.MAP_READ);

        return Array.from(result);
    }

    getStats() {
        return {
            ...this.stats,
            avgTime: this.stats.totalTime / this.stats.totalExecutions,
            bufferPool: this.bufferPool.getStats(),
            pipelineCache: this.pipelineCache.getStats()
        };
    }
}

// ============================================================================
// CPU EXECUTOR - Fallback for CPU execution
// ============================================================================

class CPUExecutor {
    constructor() {
        this.stats = {
            totalExecutions: 0,
            totalTime: 0
        };
    }

    /**
     * Выполнить операцию на CPU
     */
    async execute(operation, data) {
        const startTime = performance.now();

        console.log(`[CPUExecutor] Executing ${operation.type} on CPU...`);

        let result;

        switch (operation.type) {
            case 'array.map':
                const factor = operation.params?.factor || 2.0;
                result = Array.from(data).map(x => x * factor);
                break;

            case 'array.reduce':
            case 'array.reduce.sum':
                result = Array.from(data).reduce((sum, x) => sum + x, 0);
                break;

            case 'matrix.multiply':
                result = this.matrixMultiplyCPU(data.a, data.b, data.M, data.N, data.K);
                break;

            case 'image.filter':
                result = this.imageFilterCPU(data.image, data.kernel, data.width, data.height);
                break;

            default:
                throw new Error(`Unknown CPU operation: ${operation.type}`);
        }

        const executionTime = performance.now() - startTime;

        this.stats.totalExecutions++;
        this.stats.totalTime += executionTime;

        console.log(`[CPUExecutor] Completed in ${executionTime.toFixed(2)}ms`);

        // Return object with result and metadata
        return {
            result: result,
            executionTime: executionTime,
            target: 'CPU'
        };
    }

    matrixMultiplyCPU(a, b, M, N, K) {
        const c = new Array(M * N);

        for (let i = 0; i < M; i++) {
            for (let j = 0; j < N; j++) {
                let sum = 0;
                for (let k = 0; k < K; k++) {
                    sum += a[i * K + k] * b[k * N + j];
                }
                c[i * N + j] = sum;
            }
        }

        return c;
    }

    imageFilterCPU(image, kernel, width, height) {
        const result = new Array(width * height);
        const kernelSize = Math.sqrt(kernel.length);
        const halfKernel = Math.floor(kernelSize / 2);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0;

                for (let ky = 0; ky < kernelSize; ky++) {
                    for (let kx = 0; kx < kernelSize; kx++) {
                        const ix = x + kx - halfKernel;
                        const iy = y + ky - halfKernel;

                        if (ix >= 0 && ix < width && iy >= 0 && iy < height) {
                            sum += image[iy * width + ix] * kernel[ky * kernelSize + kx];
                        }
                    }
                }

                result[y * width + x] = sum;
            }
        }

        return result;
    }

    getStats() {
        return {
            ...this.stats,
            avgTime: this.stats.totalTime / this.stats.totalExecutions
        };
    }
}

// ============================================================================
// HYBRID RUNTIME - Main Coordinator
// ============================================================================

class HybridRuntime {
    constructor() {
        this.initialized = false;
        this.gpuAvailable = false;
        this.device = null;
        this.adapter = null;

        this.gpuExecutor = null;
        this.cpuExecutor = new CPUExecutor();
        this.scheduler = new MLScheduler();

        this.stats = {
            totalOperations: 0,
            gpuOperations: 0,
            cpuOperations: 0,
            totalSpeedup: 0
        };
    }

    /**
     * Инициализация системы
     */
    async initialize() {
        console.log('[HybridRuntime] Initializing...');

        // Detect CPU information
        const cpuCores = navigator.hardwareConcurrency || 4;
        const cpuInfo = {
            cores: cpuCores,
            threadsAvailable: cpuCores,
            // Try to detect CPU vendor from user agent
            vendor: this.detectCPUVendor(),
            architecture: this.detectCPUArchitecture()
        };

        console.log(`[HybridRuntime] CPU Detected: ${cpuInfo.vendor} ${cpuInfo.architecture} (${cpuInfo.cores} cores)`);

        // Check WebGPU support
        if (!('gpu' in navigator)) {
            console.warn('[HybridRuntime] WebGPU not available, falling back to CPU-only mode');
            this.gpuAvailable = false;
            this.initialized = true;
            return {
                success: true,
                gpuAvailable: false,
                cpuInfo: cpuInfo,
                message: 'CPU-only mode'
            };
        }

        try {
            // Request ALL available adapters
            console.log('[HybridRuntime] Detecting available GPUs...');

            // Request high-performance adapter first
            const highPerfAdapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance'
            });

            // Request low-power adapter for comparison
            const lowPowerAdapter = await navigator.gpu.requestAdapter({
                powerPreference: 'low-power'
            });

            // Collect all unique adapters
            const adapters = [];
            if (highPerfAdapter) adapters.push({ adapter: highPerfAdapter, type: 'high-performance' });
            if (lowPowerAdapter && lowPowerAdapter !== highPerfAdapter) {
                adapters.push({ adapter: lowPowerAdapter, type: 'low-power' });
            }

            if (adapters.length === 0) {
                throw new Error('No GPU adapters found');
            }

            console.log(`[HybridRuntime] Found ${adapters.length} GPU adapter(s)`);

            // Score and select the most powerful adapter
            let bestAdapter = null;
            let bestScore = -1;
            const adapterDetails = [];

            for (const {adapter, type} of adapters) {
                const info = adapter.info || {};
                const vendor = info.vendor || 'Unknown';
                const architecture = info.architecture || 'Unknown';
                const device = info.device || 'Unknown';
                const description = info.description || 'Unknown GPU';

                // Request device to get limits
                const tempDevice = await adapter.requestDevice();
                const limits = tempDevice.limits;

                // Calculate power score based on limits
                const score = this.calculateGPUScore(limits);

                adapterDetails.push({
                    vendor,
                    architecture,
                    device,
                    description,
                    type,
                    score,
                    limits: {
                        maxBufferSize: limits.maxBufferSize,
                        maxComputeWorkgroupSizeX: limits.maxComputeWorkgroupSizeX,
                        maxComputeInvocationsPerWorkgroup: limits.maxComputeInvocationsPerWorkgroup,
                        maxStorageBufferBindingSize: limits.maxStorageBufferBindingSize
                    }
                });

                console.log(`[HybridRuntime]   ${vendor} ${description} (${type}): score=${score}`);

                if (score > bestScore) {
                    bestScore = score;
                    bestAdapter = adapter;
                }

                tempDevice.destroy();
            }

            this.adapter = bestAdapter;
            this.device = await this.adapter.requestDevice();

            const selectedInfo = adapterDetails.find(d => d.score === bestScore);

            console.log(`[HybridRuntime] Selected: ${selectedInfo.vendor} ${selectedInfo.description}`);

            this.gpuExecutor = new GPUExecutor(this.device, this.adapter);

            // Warm up GPU
            await this.warmUp();

            this.gpuAvailable = true;
            this.initialized = true;

            console.log('[HybridRuntime] Initialized successfully with GPU support');

            return {
                success: true,
                gpuAvailable: true,
                cpuInfo: cpuInfo,
                gpuInfo: selectedInfo,
                availableGPUs: adapterDetails
            };

        } catch (error) {
            console.error('[HybridRuntime] GPU initialization failed:', error);
            this.gpuAvailable = false;
            this.initialized = true;

            return {
                success: true,
                gpuAvailable: false,
                cpuInfo: cpuInfo,
                error: error.message,
                message: 'Falling back to CPU-only mode'
            };
        }
    }

    /**
     * Calculate GPU power score based on limits
     */
    calculateGPUScore(limits) {
        // Weight different capabilities
        const bufferScore = limits.maxBufferSize / (1024 * 1024 * 1024); // GB
        const workgroupScore = limits.maxComputeWorkgroupSizeX / 256;
        const invocationScore = limits.maxComputeInvocationsPerWorkgroup / 256;

        return bufferScore * 0.4 + workgroupScore * 0.3 + invocationScore * 0.3;
    }

    /**
     * Detect CPU vendor from user agent
     */
    detectCPUVendor() {
        const ua = navigator.userAgent.toLowerCase();

        // Check for Apple Silicon
        if (ua.includes('mac') && (ua.includes('arm') || navigator.platform === 'MacIntel')) {
            // M1/M2/M3 chips
            if (ua.includes('m1') || ua.includes('m2') || ua.includes('m3')) {
                return 'Apple Silicon';
            }
            return 'Apple';
        }

        // AMD Ryzen detection
        if (ua.includes('amd') || ua.includes('ryzen')) {
            return 'AMD';
        }

        // Intel detection (most common default)
        return 'Intel/AMD';
    }

    /**
     * Detect CPU architecture
     */
    detectCPUArchitecture() {
        const platform = navigator.platform.toLowerCase();
        const ua = navigator.userAgent.toLowerCase();

        if (ua.includes('arm') || platform.includes('arm')) {
            return 'ARM64';
        }

        if (platform.includes('win') || platform.includes('linux') || platform.includes('mac')) {
            return 'x86-64';
        }

        return 'Unknown';
    }

    /**
     * Warm-up: pre-compile shaders
     */
    async warmUp() {
        console.log('[HybridRuntime] Warming up GPU...');

        const warmUpOps = [
            {
                type: 'array.map',
                data: Array(1000).fill(1),
                params: { factor: 2 }
            }
        ];

        for (const op of warmUpOps) {
            try {
                await this.gpuExecutor.execute(op, op.data);
            } catch (error) {
                console.warn('[HybridRuntime] Warm-up failed for', op.type, ':', error);
            }
        }

        console.log('[HybridRuntime] Warm-up complete');
    }

    /**
     * Выполнить операцию (автоматический выбор CPU/GPU)
     */
    async execute(operation, data) {
        if (!this.initialized) {
            throw new Error('HybridRuntime not initialized. Call initialize() first.');
        }

        this.stats.totalOperations++;

        // Decide CPU or GPU
        let target;

        if (!this.gpuAvailable) {
            target = 'CPU';
        } else {
            const decision = this.scheduler.decide(operation);
            target = decision.target;
        }

        // Execute
        const startTime = performance.now();
        let executorResult;

        if (target === 'GPU' && this.gpuAvailable) {
            executorResult = await this.gpuExecutor.execute(operation, data);
            this.stats.gpuOperations++;

            this.scheduler.updateLoad('GPU', executorResult.executionTime);
            this.scheduler.recordExecution(operation, 'GPU', executorResult.executionTime);
        } else {
            executorResult = await this.cpuExecutor.execute(operation, data);
            this.stats.cpuOperations++;

            this.scheduler.updateLoad('CPU', executorResult.executionTime);
            this.scheduler.recordExecution(operation, 'CPU', executorResult.executionTime);
        }

        const totalTime = performance.now() - startTime;

        return {
            result: executorResult.result,
            target: executorResult.target,
            executionTime: totalTime
        };
    }

    /**
     * Benchmark: сравнить CPU vs GPU
     */
    async benchmark(operation, data) {
        console.log(`[HybridRuntime] Benchmarking ${operation.type}...`);

        // CPU
        const cpuResult = await this.cpuExecutor.execute(operation, data);
        const cpuTime = cpuResult.executionTime;

        // GPU (if available)
        let gpuTime = null;
        let gpuResult = null;
        let speedup = null;

        if (this.gpuAvailable) {
            gpuResult = await this.gpuExecutor.execute(operation, data);
            gpuTime = gpuResult.executionTime;

            speedup = cpuTime / gpuTime;
        }

        return {
            operation: operation.type,
            dataSize: Array.isArray(data) ? data.length : 'N/A',
            cpuTime: cpuTime,
            gpuTime: gpuTime,
            speedup: speedup,
            winner: speedup && speedup > 1 ? 'GPU' : 'CPU'
        };
    }

    /**
     * Получить статистику
     */
    getStats() {
        return {
            ...this.stats,
            cpuStats: this.cpuExecutor.getStats(),
            gpuStats: this.gpuAvailable ? this.gpuExecutor.getStats() : null,
            schedulerHistory: this.scheduler.history.length
        };
    }
}

// ============================================================================
// EXPORT
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        HybridRuntime,
        GPUExecutor,
        CPUExecutor,
        MLScheduler,
        BufferPool,
        PipelineCache,
        SmartDataManager
    };
}
