/**
 * ============================================================================
 * STAGE 9: ADAPTIVE LEARNING SYSTEM
 * ============================================================================
 *
 * Система адаптивного обучения, которая улучшает предсказания нейронной сети
 * на основе реальных бенчмарков. После каждого запуска бенчмарка, система
 * обновляет веса нейронной сети, делая следующие предсказания точнее.
 *
 * Компоненты:
 * - ExperienceReplayBuffer: Хранит историю обучения
 * - AdaptiveLearningSystem: Online learning + batch retraining
 * - TrainingDataGenerator: Генерация синтетических данных
 * - PerformanceTracker: Отслеживание улучшений модели
 */

// ============================================================================
// Experience Replay Buffer - Буфер опыта для обучения
// ============================================================================

class ExperienceReplayBuffer {
    constructor(maxSize = 1000) {
        this.maxSize = maxSize;
        this.buffer = [];
        this.insertIndex = 0;
    }

    /**
     * Добавить новый опыт
     */
    add(experience) {
        // experience = { features, actualSpeedups, timestamp, profile }

        if (this.buffer.length < this.maxSize) {
            this.buffer.push(experience);
        } else {
            // Circular buffer - перезаписываем старые данные
            this.buffer[this.insertIndex] = experience;
            this.insertIndex = (this.insertIndex + 1) % this.maxSize;
        }
    }

    /**
     * Получить случайный batch для обучения
     */
    sample(batchSize = 32) {
        if (this.buffer.length < batchSize) {
            return this.buffer;
        }

        const sampled = [];
        const indices = new Set();

        while (sampled.length < batchSize) {
            const index = Math.floor(Math.random() * this.buffer.length);
            if (!indices.has(index)) {
                indices.add(index);
                sampled.push(this.buffer[index]);
            }
        }

        return sampled;
    }

    /**
     * Получить все данные
     */
    getAll() {
        return this.buffer;
    }

    /**
     * Размер буфера
     */
    get size() {
        return this.buffer.length;
    }

    /**
     * Очистить буфер
     */
    clear() {
        this.buffer = [];
        this.insertIndex = 0;
    }

    /**
     * Получить последние N примеров
     */
    getRecent(n = 10) {
        return this.buffer.slice(-n);
    }

    /**
     * Получить лучшие N примеров (по speedup)
     */
    getTopN(n = 10) {
        return [...this.buffer]
            .sort((a, b) => {
                const avgA = Object.values(a.actualSpeedups).reduce((sum, s) => sum + s, 0) / 7;
                const avgB = Object.values(b.actualSpeedups).reduce((sum, s) => sum + s, 0) / 7;
                return avgB - avgA;
            })
            .slice(0, n);
    }
}

// ============================================================================
// Adaptive Learning System - Система адаптивного обучения
// ============================================================================

class AdaptiveLearningSystem {
    constructor(predictor) {
        this.predictor = predictor;
        this.experienceBuffer = new ExperienceReplayBuffer(1000);
        this.performanceTracker = new PerformanceTracker();

        // Online learning settings
        this.onlineLearningEnabled = true;
        this.batchRetrainingEnabled = true;
        this.batchRetrainingThreshold = 50; // Retrain after 50 examples
        this.batchSize = 32;

        // Adaptive learning rate
        this.initialLearningRate = 0.001;
        this.learningRateDecay = 0.95;
        this.minLearningRate = 0.0001;

        this.trainingIterations = 0;
    }

    /**
     * Обработка результата бенчмарка - главная функция обучения
     */
    async onBenchmarkComplete(profile, selectedOptimizations, benchmarkResults) {
        console.log('\n📊 Adaptive Learning: Processing benchmark results...');

        // 1. Извлекаем фактические ускорения
        const actualSpeedups = this.extractActualSpeedups(
            benchmarkResults,
            selectedOptimizations
        );

        // 2. Сохраняем в Experience Replay Buffer
        const experience = {
            profile: {
                name: profile.name,
                codeStats: profile.codeStats,
                metadata: profile.metadata
            },
            features: this.predictor.featureExtractor.extract(profile),
            selectedOptimizations,
            actualSpeedups,
            timestamp: Date.now()
        };

        this.experienceBuffer.add(experience);

        // 3. Online Learning - обновляем веса сразу
        if (this.onlineLearningEnabled) {
            await this.performOnlineLearning(experience);
        }

        // 4. Batch Retraining - переобучаем на batch периодически
        if (this.batchRetrainingEnabled &&
            this.experienceBuffer.size >= this.batchRetrainingThreshold &&
            this.experienceBuffer.size % this.batchRetrainingThreshold === 0) {
            await this.performBatchRetraining();
        }

        // 5. Отслеживаем улучшение производительности модели
        this.performanceTracker.recordPrediction(
            profile,
            selectedOptimizations,
            actualSpeedups
        );

        // 6. Адаптируем learning rate
        this.adaptLearningRate();

        console.log(`  ✓ Model updated. Buffer size: ${this.experienceBuffer.size}`);
        console.log(`  ✓ Current learning rate: ${this.predictor.neuralNetwork.learningRate.toFixed(6)}`);
    }

    /**
     * Online Learning - обучение на одном примере
     */
    async performOnlineLearning(experience) {
        const startTime = performance.now();

        // Конвертируем actualSpeedups в массив в правильном порядке
        const target = this.predictor.optimizationTypes.map(
            opt => experience.actualSpeedups[opt] || 1.0
        );

        // Обучаем нейронную сеть
        this.predictor.neuralNetwork.train(experience.features, target);

        const time = performance.now() - startTime;
        console.log(`  ✓ Online learning completed in ${time.toFixed(2)}ms`);

        this.trainingIterations++;
    }

    /**
     * Batch Retraining - переобучение на batch'е данных
     */
    async performBatchRetraining() {
        console.log('\n🔄 Batch Retraining: Starting batch training...');
        const startTime = performance.now();

        // Получаем batch из Experience Replay Buffer
        const batch = this.experienceBuffer.sample(this.batchSize);

        // Подготавливаем данные для обучения
        const trainingData = batch.map(exp => ({
            input: exp.features,
            target: this.predictor.optimizationTypes.map(
                opt => exp.actualSpeedups[opt] || 1.0
            )
        }));

        // Обучаем на batch
        this.predictor.neuralNetwork.trainBatch(trainingData, 10); // 10 epochs

        const time = performance.now() - startTime;
        console.log(`  ✓ Batch training completed in ${time.toFixed(2)}ms`);
        console.log(`  ✓ Batch size: ${batch.length}`);
    }

    /**
     * Извлечение фактических ускорений из результатов бенчмарка
     */
    extractActualSpeedups(benchmarkResults, selectedOptimizations) {
        const actualSpeedups = {};

        // Инициализируем все оптимизации с 1.0 (no speedup)
        for (const opt of this.predictor.optimizationTypes) {
            actualSpeedups[opt] = 1.0;
        }

        // Если есть результаты бенчмарка
        if (benchmarkResults) {
            // benchmarkResults = { baseline: 100ms, optimized: 50ms }
            const overallSpeedup = benchmarkResults.baseline / benchmarkResults.optimized;

            // Распределяем ускорение между использованными оптимизациями
            if (selectedOptimizations && selectedOptimizations.length > 0) {
                // Простая модель: равномерное распределение
                const perOptSpeedup = Math.pow(overallSpeedup, 1 / selectedOptimizations.length);

                for (const opt of selectedOptimizations) {
                    if (typeof opt === 'string') {
                        actualSpeedups[opt] = perOptSpeedup;
                    } else if (opt.opt) {
                        actualSpeedups[opt.opt] = opt.speedup || perOptSpeedup;
                    }
                }
            }
        }

        return actualSpeedups;
    }

    /**
     * Адаптация learning rate
     */
    adaptLearningRate() {
        // Decay learning rate со временем
        const newLearningRate = Math.max(
            this.minLearningRate,
            this.initialLearningRate * Math.pow(this.learningRateDecay, this.trainingIterations / 100)
        );

        this.predictor.neuralNetwork.learningRate = newLearningRate;
    }

    /**
     * Получить статистику обучения
     */
    getStats() {
        return {
            experienceBufferSize: this.experienceBuffer.size,
            trainingIterations: this.trainingIterations,
            currentLearningRate: this.predictor.neuralNetwork.learningRate,
            performanceStats: this.performanceTracker.getStats(),
            recentExamples: this.experienceBuffer.getRecent(5),
            topExamples: this.experienceBuffer.getTopN(5)
        };
    }

    /**
     * Экспорт модели и данных
     */
    export() {
        return {
            predictor: this.predictor.serialize(),
            experienceBuffer: this.experienceBuffer.getAll(),
            performanceStats: this.performanceTracker.getStats(),
            settings: {
                onlineLearningEnabled: this.onlineLearningEnabled,
                batchRetrainingEnabled: this.batchRetrainingEnabled,
                batchRetrainingThreshold: this.batchRetrainingThreshold,
                batchSize: this.batchSize,
                currentLearningRate: this.predictor.neuralNetwork.learningRate
            }
        };
    }

    /**
     * Импорт модели и данных
     */
    import(data) {
        this.predictor = OptimizationPredictor.deserialize(data.predictor);

        // Восстановление Experience Replay Buffer
        for (const exp of data.experienceBuffer) {
            this.experienceBuffer.add(exp);
        }

        // Восстановление настроек
        if (data.settings) {
            this.onlineLearningEnabled = data.settings.onlineLearningEnabled;
            this.batchRetrainingEnabled = data.settings.batchRetrainingEnabled;
            this.batchRetrainingThreshold = data.settings.batchRetrainingThreshold;
            this.batchSize = data.settings.batchSize;
            this.predictor.neuralNetwork.learningRate = data.settings.currentLearningRate;
        }

        console.log('✓ Model and data imported successfully');
    }
}

// ============================================================================
// Training Data Generator - Генерация синтетических данных
// ============================================================================

class TrainingDataGenerator {
    /**
     * Генерирует синтетические примеры для начального обучения
     */
    static generateSyntheticDataset(count = 1000) {
        console.log(`📦 Generating ${count} synthetic training examples...`);

        const dataset = [];

        for (let i = 0; i < count; i++) {
            const example = this.generateSyntheticExample();
            dataset.push(example);

            if ((i + 1) % 100 === 0) {
                console.log(`  Generated ${i + 1}/${count} examples`);
            }
        }

        console.log('✓ Synthetic dataset generated');
        return dataset;
    }

    /**
     * Генерирует один синтетический пример
     */
    static generateSyntheticExample() {
        // Случайные характеристики функции
        const profile = {
            name: `syntheticFunc${Math.random().toString(36).substr(2, 9)}`,
            code: '',
            codeStats: {
                lines: Math.floor(Math.random() * 100) + 1,
                cyclomaticComplexity: Math.floor(Math.random() * 20) + 1,
                conditionals: Math.floor(Math.random() * 10),
                loops: Math.floor(Math.random() * 5),
                functionCalls: Math.floor(Math.random() * 20),
                arrayOps: Math.floor(Math.random() * 30),
                objectOps: Math.floor(Math.random() * 20),
                arithmeticOps: Math.floor(Math.random() * 50),
                comparisonOps: Math.floor(Math.random() * 30),
                logicalOps: Math.floor(Math.random() * 20),
                hasLoop: Math.random() > 0.5,
                hasConditional: Math.random() > 0.3,
                hasAsync: Math.random() > 0.8
            },
            metadata: {
                hasRecursion: Math.random() > 0.9,
                isLeaf: Math.random() > 0.5,
                isHot: Math.random() > 0.7
            },
            callCount: Math.floor(Math.random() * 1000),
            avgTime: Math.random() * 10,
            totalTime: Math.random() * 100
        };

        // Симулируем реалистичные ускорения на основе характеристик
        const actualSpeedups = {
            inlining: this.predictInliningSpeedup(profile),
            loopUnrolling: this.predictLoopUnrollingSpeedup(profile),
            vectorization: this.predictVectorizationSpeedup(profile),
            constantFolding: this.predictConstantFoldingSpeedup(profile),
            tailCallOptimization: this.predictTailCallSpeedup(profile),
            commonSubexpressionElimination: this.predictCSESpeedup(profile),
            strengthReduction: this.predictStrengthReductionSpeedup(profile)
        };

        return { profile, actualSpeedups };
    }

    // Эвристические предсказания для синтетических данных

    static predictInliningSpeedup(profile) {
        if (profile.codeStats.lines < 10 && profile.callCount > 50) {
            return 1.03 + Math.random() * 0.05; // 1.03-1.08x
        }
        return 1.0;
    }

    static predictLoopUnrollingSpeedup(profile) {
        if (profile.codeStats.hasLoop && profile.metadata.isHot) {
            return 1.20 + Math.random() * 0.20; // 1.20-1.40x
        }
        return 1.0;
    }

    static predictVectorizationSpeedup(profile) {
        if (profile.codeStats.hasLoop && profile.codeStats.arrayOps > 10) {
            return 1.50 + Math.random() * 0.50; // 1.50-2.00x
        }
        return 1.0;
    }

    static predictConstantFoldingSpeedup(profile) {
        if (profile.codeStats.arithmeticOps > 20) {
            return 1.01 + Math.random() * 0.02; // 1.01-1.03x
        }
        return 1.0;
    }

    static predictTailCallSpeedup(profile) {
        if (profile.metadata.hasRecursion) {
            return 1.05 + Math.random() * 0.10; // 1.05-1.15x
        }
        return 1.0;
    }

    static predictCSESpeedup(profile) {
        if (profile.codeStats.arithmeticOps > 30) {
            return 1.04 + Math.random() * 0.08; // 1.04-1.12x
        }
        return 1.0;
    }

    static predictStrengthReductionSpeedup(profile) {
        if (profile.codeStats.arithmeticOps > 10) {
            return 1.02 + Math.random() * 0.05; // 1.02-1.07x
        }
        return 1.0;
    }

    /**
     * Начальное обучение модели на синтетических данных
     */
    static async pretrainModel(predictor, datasetSize = 1000) {
        console.log('\n🎓 Pretraining model on synthetic data...');

        const dataset = this.generateSyntheticDataset(datasetSize);
        const featureExtractor = new FeatureExtractor();

        // Подготавливаем training data
        const trainingData = dataset.map(example => ({
            input: featureExtractor.extract(example.profile),
            target: predictor.optimizationTypes.map(
                opt => example.actualSpeedups[opt] || 1.0
            )
        }));

        // Обучаем
        const startTime = performance.now();
        predictor.neuralNetwork.trainBatch(trainingData, 100); // 100 epochs
        const time = performance.now() - startTime;

        console.log(`✓ Pretraining completed in ${(time / 1000).toFixed(2)}s`);
        console.log(`  Trained on ${datasetSize} synthetic examples`);
    }
}

// ============================================================================
// Performance Tracker - Отслеживание улучшений модели
// ============================================================================

class PerformanceTracker {
    constructor() {
        this.predictions = [];
        this.errors = [];
    }

    /**
     * Записать предсказание и фактический результат
     */
    recordPrediction(profile, predictions, actualSpeedups) {
        const prediction = {
            timestamp: Date.now(),
            functionName: profile.name,
            predictions: { ...predictions },
            actual: { ...actualSpeedups }
        };

        this.predictions.push(prediction);

        // Вычисляем ошибку (MAE - Mean Absolute Error)
        let totalError = 0;
        let count = 0;

        for (const opt in actualSpeedups) {
            if (predictions[opt]) {
                const error = Math.abs(predictions[opt] - actualSpeedups[opt]);
                totalError += error;
                count++;
            }
        }

        const mae = count > 0 ? totalError / count : 0;
        this.errors.push(mae);

        // Ограничиваем размер истории
        if (this.predictions.length > 1000) {
            this.predictions.shift();
            this.errors.shift();
        }
    }

    /**
     * Получить статистику производительности
     */
    getStats() {
        if (this.errors.length === 0) {
            return {
                totalPredictions: 0,
                averageError: 0,
                recentError: 0,
                improvementTrend: 0
            };
        }

        const totalPredictions = this.predictions.length;
        const averageError = this.errors.reduce((sum, e) => sum + e, 0) / this.errors.length;

        // Последние 10 предсказаний
        const recent = this.errors.slice(-10);
        const recentError = recent.reduce((sum, e) => sum + e, 0) / recent.length;

        // Тренд улучшения (сравнение первой и второй половины)
        const mid = Math.floor(this.errors.length / 2);
        const firstHalf = this.errors.slice(0, mid);
        const secondHalf = this.errors.slice(mid);

        const firstHalfAvg = firstHalf.reduce((sum, e) => sum + e, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, e) => sum + e, 0) / secondHalf.length;

        const improvementTrend = ((firstHalfAvg - secondHalfAvg) / firstHalfAvg) * 100;

        return {
            totalPredictions,
            averageError: averageError.toFixed(4),
            recentError: recentError.toFixed(4),
            improvementTrend: improvementTrend.toFixed(2) + '%'
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ExperienceReplayBuffer,
        AdaptiveLearningSystem,
        TrainingDataGenerator,
        PerformanceTracker
    };
}

if (typeof window !== 'undefined') {
    if (!window.Stage9) window.Stage9 = {};

    window.Stage9.ExperienceReplayBuffer = ExperienceReplayBuffer;
    window.Stage9.AdaptiveLearningSystem = AdaptiveLearningSystem;
    window.Stage9.TrainingDataGenerator = TrainingDataGenerator;
    window.Stage9.PerformanceTracker = PerformanceTracker;
}
