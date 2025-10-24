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

    // Реалистичные предсказания для синтетических данных (на основе реальных бенчмарков)

    static predictInliningSpeedup(profile) {
        // Inlining очень эффективен для маленьких горячих функций
        if (profile.codeStats.lines < 10 && profile.callCount > 100) {
            return 1.4 + Math.random() * 0.8; // 1.4-2.2x для очень горячих
        } else if (profile.codeStats.lines < 20 && profile.callCount > 50) {
            return 1.2 + Math.random() * 0.4; // 1.2-1.6x для умеренных
        } else if (profile.codeStats.lines < 5) {
            return 1.05 + Math.random() * 0.15; // 1.05-1.20x для маленьких
        }
        return 1.0;
    }

    static predictLoopUnrollingSpeedup(profile) {
        // Loop unrolling зависит от сложности цикла
        if (profile.codeStats.hasLoop && profile.metadata.isHot) {
            const loopComplexity = profile.codeStats.loops;
            if (loopComplexity === 1 && profile.codeStats.arrayOps > 5) {
                // Простой цикл с array ops - идеален для unrolling
                return 2.5 + Math.random() * 1.5; // 2.5-4.0x
            } else if (loopComplexity <= 2) {
                return 1.8 + Math.random() * 0.7; // 1.8-2.5x
            } else {
                return 1.3 + Math.random() * 0.4; // 1.3-1.7x
            }
        }
        return 1.0;
    }

    static predictVectorizationSpeedup(profile) {
        // SIMD vectorization - самая мощная для array operations
        if (profile.codeStats.hasLoop && profile.codeStats.arrayOps > 10) {
            const arrayIntensity = profile.codeStats.arrayOps / (profile.codeStats.lines || 1);
            if (arrayIntensity > 0.5) {
                // Очень array-intensive - отличный кандидат для SIMD
                return 3.5 + Math.random() * 2.5; // 3.5-6.0x
            } else if (arrayIntensity > 0.2) {
                return 2.0 + Math.random() * 1.5; // 2.0-3.5x
            } else {
                return 1.3 + Math.random() * 0.7; // 1.3-2.0x
            }
        }
        return 1.0;
    }

    static predictConstantFoldingSpeedup(profile) {
        // Constant folding - скромный но стабильный выигрыш
        const arithmeticDensity = profile.codeStats.arithmeticOps / (profile.codeStats.lines || 1);
        if (arithmeticDensity > 2.0) {
            return 1.3 + Math.random() * 0.5; // 1.3-1.8x для math-heavy
        } else if (profile.codeStats.arithmeticOps > 10) {
            return 1.1 + Math.random() * 0.2; // 1.1-1.3x
        }
        return 1.0;
    }

    static predictTailCallSpeedup(profile) {
        // Tail call optimization критична для рекурсии (предотвращает stack overflow)
        if (profile.metadata.hasRecursion) {
            const callDepth = Math.min(profile.callCount / 10, 100);
            if (callDepth > 50) {
                // Глубокая рекурсия - огромный выигрыш
                return 3.0 + Math.random() * 2.0; // 3.0-5.0x
            } else if (callDepth > 20) {
                return 1.8 + Math.random() * 1.0; // 1.8-2.8x
            } else {
                return 1.2 + Math.random() * 0.4; // 1.2-1.6x
            }
        }
        return 1.0;
    }

    static predictCSESpeedup(profile) {
        // Common Subexpression Elimination - зависит от повторяющихся вычислений
        const expressionDensity = (profile.codeStats.arithmeticOps + profile.codeStats.comparisonOps) /
                                 (profile.codeStats.lines || 1);
        if (expressionDensity > 3.0) {
            // Много повторяющихся вычислений
            return 1.6 + Math.random() * 0.8; // 1.6-2.4x
        } else if (profile.codeStats.arithmeticOps > 20) {
            return 1.2 + Math.random() * 0.4; // 1.2-1.6x
        } else if (profile.codeStats.arithmeticOps > 10) {
            return 1.05 + Math.random() * 0.15; // 1.05-1.20x
        }
        return 1.0;
    }

    static predictStrengthReductionSpeedup(profile) {
        // Strength Reduction - замена дорогих операций на дешевые (div→shift, mul→shift, etc)
        const hasExpensiveOps = profile.codeStats.arithmeticOps > 15;
        if (hasExpensiveOps && profile.codeStats.hasLoop) {
            // В циклах особенно эффективно
            return 1.4 + Math.random() * 0.8; // 1.4-2.2x
        } else if (hasExpensiveOps) {
            return 1.1 + Math.random() * 0.3; // 1.1-1.4x
        } else if (profile.codeStats.arithmeticOps > 5) {
            return 1.02 + Math.random() * 0.08; // 1.02-1.10x
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
