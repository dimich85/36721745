/**
 * ============================================================================
 * STAGE 9: AI-DRIVEN WAT SYNTHESIS - NEURAL OPTIMIZER
 * ============================================================================
 *
 * Нейронная сеть для предсказания оптимальных оптимизаций на основе
 * характеристик функций. Вместо фиксированных эвристик (Stage 8),
 * использует машинное обучение для адаптивного выбора оптимизаций.
 *
 * Компоненты:
 * - Matrix: Линейная алгебра для нейронной сети
 * - Activation functions: ReLU, Sigmoid, Tanh
 * - NeuralNetwork: Многослойная нейронная сеть
 * - FeatureExtractor: Извлечение 50+ признаков из профиля функции
 * - OptimizationPredictor: Предсказание ускорений
 * - AdaptiveLearningSystem: Online learning на основе бенчмарков
 */

// ============================================================================
// Matrix Operations - Линейная алгебра
// ============================================================================

class Matrix {
    constructor(rows, cols, data = null) {
        this.rows = rows;
        this.cols = cols;
        this.data = data || Array(rows).fill(0).map(() => Array(cols).fill(0));
    }

    /**
     * Матричное умножение: A × B
     */
    static multiply(a, b) {
        if (a.cols !== b.rows) {
            throw new Error(`Matrix dimensions don't match: ${a.cols} !== ${b.rows}`);
        }

        const result = new Matrix(a.rows, b.cols);

        for (let i = 0; i < a.rows; i++) {
            for (let j = 0; j < b.cols; j++) {
                let sum = 0;
                for (let k = 0; k < a.cols; k++) {
                    sum += a.data[i][k] * b.data[k][j];
                }
                result.data[i][j] = sum;
            }
        }

        return result;
    }

    /**
     * Поэлементное умножение (Hadamard product)
     */
    static hadamard(a, b) {
        if (a.rows !== b.rows || a.cols !== b.cols) {
            throw new Error('Matrix dimensions must match');
        }

        const result = new Matrix(a.rows, a.cols);

        for (let i = 0; i < a.rows; i++) {
            for (let j = 0; j < a.cols; j++) {
                result.data[i][j] = a.data[i][j] * b.data[i][j];
            }
        }

        return result;
    }

    /**
     * Transpose матрицы
     */
    transpose() {
        const result = new Matrix(this.cols, this.rows);

        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                result.data[j][i] = this.data[i][j];
            }
        }

        return result;
    }

    /**
     * Сложение матриц
     */
    static add(a, b) {
        if (a.rows !== b.rows || a.cols !== b.cols) {
            throw new Error('Matrix dimensions must match');
        }

        const result = new Matrix(a.rows, a.cols);

        for (let i = 0; i < a.rows; i++) {
            for (let j = 0; j < a.cols; j++) {
                result.data[i][j] = a.data[i][j] + b.data[i][j];
            }
        }

        return result;
    }

    /**
     * Вычитание матриц
     */
    static subtract(a, b) {
        if (a.rows !== b.rows || a.cols !== b.cols) {
            throw new Error('Matrix dimensions must match');
        }

        const result = new Matrix(a.rows, a.cols);

        for (let i = 0; i < a.rows; i++) {
            for (let j = 0; j < a.cols; j++) {
                result.data[i][j] = a.data[i][j] - b.data[i][j];
            }
        }

        return result;
    }

    /**
     * Умножение на скаляр
     */
    scale(scalar) {
        const result = new Matrix(this.rows, this.cols);

        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                result.data[i][j] = this.data[i][j] * scalar;
            }
        }

        return result;
    }

    /**
     * Применить функцию к каждому элементу
     */
    map(func) {
        const result = new Matrix(this.rows, this.cols);

        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                result.data[i][j] = func(this.data[i][j], i, j);
            }
        }

        return result;
    }

    /**
     * Создать матрицу из массива
     */
    static fromArray(arr) {
        const result = new Matrix(arr.length, 1);
        for (let i = 0; i < arr.length; i++) {
            result.data[i][0] = arr[i];
        }
        return result;
    }

    /**
     * Преобразовать в массив
     */
    toArray() {
        const arr = [];
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                arr.push(this.data[i][j]);
            }
        }
        return arr;
    }

    /**
     * Случайная инициализация (Xavier initialization)
     */
    randomize(inputSize) {
        const limit = Math.sqrt(6 / (inputSize + this.cols));

        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                this.data[i][j] = Math.random() * 2 * limit - limit;
            }
        }

        return this;
    }

    /**
     * Клонирование матрицы
     */
    clone() {
        const result = new Matrix(this.rows, this.cols);
        for (let i = 0; i < this.rows; i++) {
            result.data[i] = [...this.data[i]];
        }
        return result;
    }
}

// ============================================================================
// Activation Functions - Функции активации
// ============================================================================

const Activation = {
    /**
     * ReLU: max(0, x)
     */
    relu(x) {
        return Math.max(0, x);
    },

    reluDerivative(x) {
        return x > 0 ? 1 : 0;
    },

    /**
     * Sigmoid: 1 / (1 + e^(-x))
     */
    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    },

    sigmoidDerivative(x) {
        const s = Activation.sigmoid(x);
        return s * (1 - s);
    },

    /**
     * Tanh: (e^x - e^(-x)) / (e^x + e^(-x))
     */
    tanh(x) {
        return Math.tanh(x);
    },

    tanhDerivative(x) {
        const t = Math.tanh(x);
        return 1 - t * t;
    },

    /**
     * Linear: x (для output layer)
     */
    linear(x) {
        return x;
    },

    linearDerivative(x) {
        return 1;
    }
};

// ============================================================================
// Neural Network - Многослойная нейронная сеть
// ============================================================================

class NeuralNetwork {
    constructor(architecture) {
        // architecture = [inputSize, hidden1, hidden2, ..., outputSize]
        this.architecture = architecture;
        this.layers = [];
        this.biases = [];
        this.activations = [];

        // Инициализируем веса и смещения
        for (let i = 0; i < architecture.length - 1; i++) {
            const inputSize = architecture[i];
            const outputSize = architecture[i + 1];

            // Weights: outputSize × inputSize
            const weights = new Matrix(outputSize, inputSize).randomize(inputSize);
            this.layers.push(weights);

            // Biases: outputSize × 1
            const bias = new Matrix(outputSize, 1).randomize(inputSize);
            this.biases.push(bias);

            // Activation functions (ReLU for hidden, Linear for output)
            const activation = i < architecture.length - 2 ? 'relu' : 'linear';
            this.activations.push(activation);
        }

        // Training parameters
        this.learningRate = 0.001;
    }

    /**
     * Forward pass - предсказание
     */
    predict(inputArray) {
        let activation = Matrix.fromArray(inputArray);

        const layerOutputs = [activation];

        // Проходим через все слои
        for (let i = 0; i < this.layers.length; i++) {
            // Z = W × A + B
            activation = Matrix.multiply(this.layers[i], activation);
            activation = Matrix.add(activation, this.biases[i]);

            // Применяем функцию активации
            const activationFunc = this.activations[i];
            if (activationFunc === 'relu') {
                activation = activation.map(Activation.relu);
            } else if (activationFunc === 'sigmoid') {
                activation = activation.map(Activation.sigmoid);
            } else if (activationFunc === 'tanh') {
                activation = activation.map(Activation.tanh);
            }
            // linear - не применяем функцию

            layerOutputs.push(activation);
        }

        this.lastLayerOutputs = layerOutputs;

        return activation.toArray();
    }

    /**
     * Train - обучение на одном примере (online learning)
     */
    train(inputArray, targetArray) {
        // Forward pass
        const output = this.predict(inputArray);

        // Convert target to matrix
        const target = Matrix.fromArray(targetArray);
        const predicted = Matrix.fromArray(output);

        // Calculate error
        let error = Matrix.subtract(target, predicted);

        // Backward pass - сначала вычисляем все дельты, потом обновляем веса
        const weightDeltas = [];
        const biasDeltas = [];

        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layerOutput = this.lastLayerOutputs[i + 1];
            const layerInput = this.lastLayerOutputs[i];

            // Calculate gradient
            let gradient;
            const activationFunc = this.activations[i];

            if (activationFunc === 'relu') {
                gradient = layerOutput.map(Activation.reluDerivative);
            } else if (activationFunc === 'sigmoid') {
                gradient = layerOutput.map(Activation.sigmoidDerivative);
            } else if (activationFunc === 'tanh') {
                gradient = layerOutput.map(Activation.tanhDerivative);
            } else {
                gradient = layerOutput.map(Activation.linearDerivative);
            }

            gradient = Matrix.hadamard(gradient, error);
            gradient = gradient.scale(this.learningRate);

            // Gradient clipping для предотвращения explosion
            gradient = gradient.map(g => {
                if (!isFinite(g) || isNaN(g)) return 0;
                if (g > 1.0) return 1.0;
                if (g < -1.0) return -1.0;
                return g;
            });

            // Calculate deltas
            const inputTranspose = layerInput.transpose();
            const weightDelta = Matrix.multiply(gradient, inputTranspose);

            // Сохраняем дельты (добавляем в начало, т.к. идем с конца)
            weightDeltas.unshift(weightDelta);
            biasDeltas.unshift(gradient);

            // Calculate error for previous layer (используем СТАРЫЕ веса!)
            const weightsTranspose = this.layers[i].transpose();
            error = Matrix.multiply(weightsTranspose, error);
        }

        // Теперь обновляем все веса и смещения
        for (let i = 0; i < this.layers.length; i++) {
            this.layers[i] = Matrix.add(this.layers[i], weightDeltas[i]);
            this.biases[i] = Matrix.add(this.biases[i], biasDeltas[i]);
        }
    }

    /**
     * Batch training
     */
    trainBatch(dataset, epochs = 100) {
        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalLoss = 0;

            for (const example of dataset) {
                this.train(example.input, example.target);

                // Calculate loss
                const predicted = this.predict(example.input);
                const loss = this.calculateMSE(predicted, example.target);
                totalLoss += loss;
            }

            if (epoch % 10 === 0) {
                const avgLoss = totalLoss / dataset.length;
                console.log(`Epoch ${epoch}: Loss = ${avgLoss.toFixed(6)}`);
            }
        }
    }

    /**
     * Mean Squared Error
     */
    calculateMSE(predicted, target) {
        let sum = 0;
        for (let i = 0; i < predicted.length; i++) {
            const diff = predicted[i] - target[i];
            sum += diff * diff;
        }
        return sum / predicted.length;
    }

    /**
     * Serialize для сохранения
     */
    serialize() {
        return {
            architecture: this.architecture,
            layers: this.layers.map(l => l.data),
            biases: this.biases.map(b => b.data),
            activations: this.activations,
            learningRate: this.learningRate
        };
    }

    /**
     * Deserialize для загрузки
     */
    static deserialize(data) {
        const nn = new NeuralNetwork(data.architecture);

        nn.layers = data.layers.map((layerData, i) =>
            new Matrix(layerData.length, layerData[0].length, layerData)
        );

        nn.biases = data.biases.map((biasData, i) =>
            new Matrix(biasData.length, biasData[0].length, biasData)
        );

        nn.activations = data.activations;
        nn.learningRate = data.learningRate;

        return nn;
    }
}

// ============================================================================
// Feature Extractor - Извлечение признаков из профиля функции
// ============================================================================

class FeatureExtractor {
    /**
     * Извлекает 50+ признаков из профиля функции
     */
    extract(profile) {
        const features = [];

        // === Статические признаки (из кода) ===

        // 1-5: Размерные характеристики
        features.push(profile.codeStats.lines || 0);
        features.push(profile.codeStats.cyclomaticComplexity || 0);
        features.push(profile.codeStats.nestingDepth || this.estimateNestingDepth(profile.code));
        features.push(profile.codeStats.totalOps || this.countTotalOperations(profile.code));
        features.push(profile.code.length); // Длина кода в символах

        // 6-10: Структурные характеристики
        features.push(profile.codeStats.conditionals || 0);
        features.push(profile.codeStats.loops || 0);
        features.push(profile.codeStats.functionCalls || 0);
        features.push(profile.codeStats.arrayOps || 0);
        features.push(profile.codeStats.objectOps || 0);

        // 11-15: Типы операций
        features.push(profile.codeStats.arithmeticOps || 0);
        features.push(profile.codeStats.comparisonOps || 0);
        features.push(profile.codeStats.logicalOps || 0);
        features.push(profile.codeStats.bitwiseOps || 0);
        features.push(profile.codeStats.assignmentOps || 0);

        // 16-20: Булевы характеристики (0 или 1)
        features.push(profile.codeStats.hasLoop ? 1 : 0);
        features.push(profile.codeStats.hasConditional ? 1 : 0);
        features.push(profile.codeStats.hasAsync ? 1 : 0);
        features.push(profile.metadata.hasRecursion ? 1 : 0);
        features.push(profile.metadata.isLeaf ? 1 : 0);

        // === Динамические признаки (из профилирования) ===

        // 21-25: Частота вызовов
        features.push(Math.log10((profile.callCount || 0) + 1)); // Log scale
        features.push(profile.avgTime || 0);
        features.push(profile.totalTime || 0);
        features.push(profile.minTime || 0);
        features.push(profile.maxTime || 0);

        // 26-30: Статистические метрики
        const variance = this.calculateVariance(profile.timings || []);
        features.push(variance);
        features.push(Math.sqrt(variance)); // Standard deviation
        features.push(profile.metadata.isHot ? 1 : 0);
        features.push(this.calculatePercentile(profile.timings || [], 95));
        features.push(this.calculatePercentile(profile.timings || [], 99));

        // === Контекстуальные признаки (call graph) ===

        // 31-35: Позиция в call graph
        features.push((profile.calls?.size || 0)); // Сколько функций вызывает
        features.push((profile.calledBy?.size || 0)); // Сколько функций вызывают эту
        features.push(this.calculateCallDepth(profile));
        features.push(this.isInHotPath(profile) ? 1 : 0);
        features.push(this.calculateFanOut(profile));

        // 36-40: Паттерны аргументов
        const argPatterns = this.analyzeArgumentPatterns(profile);
        features.push(argPatterns.typeConsistency);
        features.push(argPatterns.valueRepetition);
        features.push(argPatterns.avgArgCount);
        features.push(argPatterns.hasConstantArgs ? 1 : 0);
        features.push(argPatterns.argumentVariance);

        // === Дополнительные признаки для улучшения точности ===

        // 41-45: Сложность вычислений
        features.push(profile.codeStats.mathOps || 0);
        features.push(profile.codeStats.stringOps || 0);
        features.push(profile.codeStats.regexOps || 0);
        features.push(profile.codeStats.domOps || 0);
        features.push(profile.complexity || 0);

        // 46-50: Оптимизационные хинты
        features.push(this.hasVectorizableLoop(profile) ? 1 : 0);
        features.push(this.hasInlinableSize(profile) ? 1 : 0);
        features.push(this.hasTailRecursion(profile) ? 1 : 0);
        features.push(this.hasCommonSubexpressions(profile) ? 1 : 0);
        features.push(this.hasStrengthReductionOps(profile) ? 1 : 0);

        // Normalize features to [0, 1] range
        return this.normalizeFeatures(features);
    }

    // Helper methods

    estimateNestingDepth(code) {
        let maxDepth = 0;
        let currentDepth = 0;

        for (const char of code) {
            if (char === '{') {
                currentDepth++;
                maxDepth = Math.max(maxDepth, currentDepth);
            } else if (char === '}') {
                currentDepth--;
            }
        }

        return maxDepth;
    }

    countTotalOperations(code) {
        // Simplified - count all operators
        const operators = ['+', '-', '*', '/', '%', '==', '!=', '<', '>', '<=', '>=', '&&', '||'];
        let count = 0;

        for (const op of operators) {
            const regex = new RegExp(op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            const matches = code.match(regex);
            count += matches ? matches.length : 0;
        }

        return count;
    }

    calculateVariance(timings) {
        if (timings.length === 0) return 0;

        const mean = timings.reduce((sum, t) => sum + t, 0) / timings.length;
        const squaredDiffs = timings.map(t => (t - mean) ** 2);
        return squaredDiffs.reduce((sum, d) => sum + d, 0) / timings.length;
    }

    calculatePercentile(timings, percentile) {
        if (timings.length === 0) return 0;

        const sorted = [...timings].sort((a, b) => a - b);
        const index = Math.floor((percentile / 100) * sorted.length);
        return sorted[index] || 0;
    }

    calculateCallDepth(profile) {
        // Simplified - would need full call graph
        return profile.calls?.size || 0;
    }

    isInHotPath(profile) {
        // Check if function is in a hot path
        return profile.metadata?.inHotPath || false;
    }

    calculateFanOut(profile) {
        // Number of unique functions called
        return profile.calls?.size || 0;
    }

    analyzeArgumentPatterns(profile) {
        return {
            typeConsistency: 0.5, // Placeholder
            valueRepetition: 0.3,
            avgArgCount: 2,
            hasConstantArgs: false,
            argumentVariance: 0.2
        };
    }

    hasVectorizableLoop(profile) {
        return profile.codeStats?.hasLoop && profile.codeStats?.arrayOps > 5;
    }

    hasInlinableSize(profile) {
        return (profile.codeStats?.lines || 0) < 10;
    }

    hasTailRecursion(profile) {
        return profile.metadata?.hasRecursion && profile.code?.includes('return') && profile.code?.includes(profile.name);
    }

    hasCommonSubexpressions(profile) {
        // Simplified heuristic
        return (profile.codeStats?.arithmeticOps || 0) > 10;
    }

    hasStrengthReductionOps(profile) {
        // Check for * 2, * 4, / 2 patterns
        return profile.code?.match(/\*\s*[24]|\/ \s*2/) !== null;
    }

    normalizeFeatures(features) {
        // Simple min-max normalization (in production, use learned parameters)
        return features.map(f => {
            // Защита от NaN, Infinity и undefined
            if (!isFinite(f) || isNaN(f) || f === null || f === undefined) return 0;
            if (f === 0) return 0;
            if (f < 0) return 0;
            if (f > 1000) return Math.log10(f + 1) / 3; // +1 для защиты от log10(0)
            if (f > 100) return f / 100;
            if (f > 10) return f / 10;
            return f;
        });
    }
}

// ============================================================================
// Optimization Predictor - Предсказание ускорений
// ============================================================================

class OptimizationPredictor {
    constructor() {
        // Neural Network: 50 input → 128 → 64 → 32 → 7 output
        this.neuralNetwork = new NeuralNetwork([50, 128, 64, 32, 7]);
        this.featureExtractor = new FeatureExtractor();

        this.optimizationTypes = [
            'inlining',
            'loopUnrolling',
            'vectorization',
            'constantFolding',
            'tailCallOptimization',
            'commonSubexpressionElimination',
            'strengthReduction'
        ];

        // Cost of each optimization (compilation time)
        this.optimizationCosts = {
            'inlining': 2,
            'loopUnrolling': 4,
            'vectorization': 5,
            'constantFolding': 1,
            'tailCallOptimization': 3,
            'commonSubexpressionElimination': 3,
            'strengthReduction': 2
        };

        // Code size impact
        this.codeSizeImpact = {
            'inlining': 1.5,
            'loopUnrolling': 3.0,
            'vectorization': 1.2,
            'constantFolding': 0.9,
            'tailCallOptimization': 1.0,
            'commonSubexpressionElimination': 1.1,
            'strengthReduction': 1.0
        };
    }

    /**
     * Предсказать ускорения для всех оптимизаций
     */
    predict(profile) {
        // Extract features
        const features = this.featureExtractor.extract(profile);

        // Neural network prediction
        const predictions = this.neuralNetwork.predict(features);

        // Convert to object
        const result = {};
        for (let i = 0; i < this.optimizationTypes.length; i++) {
            result[this.optimizationTypes[i]] = Math.max(1.0, predictions[i]);
        }

        return result;
    }

    /**
     * Выбрать оптимальную комбинацию оптимизаций
     */
    selectOptimizations(profile, budget = 10) {
        const predictions = this.predict(profile);

        const candidates = [];

        for (const [opt, speedup] of Object.entries(predictions)) {
            const cost = this.optimizationCosts[opt];
            const codeSize = this.codeSizeImpact[opt];

            // Score = benefit / cost
            const benefit = speedup - 1.0; // Convert speedup to gain
            const score = benefit / (cost * Math.pow(codeSize, 0.5));

            candidates.push({ opt, speedup, cost, score });
        }

        // Sort by score
        candidates.sort((a, b) => b.score - a.score);

        // Greedy selection with budget
        const selected = [];
        let totalCost = 0;

        for (const candidate of candidates) {
            if (totalCost + candidate.cost <= budget) {
                selected.push(candidate);
                totalCost += candidate.cost;
            }
        }

        return {
            optimizations: selected,
            totalCost,
            expectedSpeedup: this.calculateExpectedSpeedup(selected)
        };
    }

    calculateExpectedSpeedup(selected) {
        // Multiplicative model (optimizations compound)
        let totalSpeedup = 1.0;

        for (const opt of selected) {
            totalSpeedup *= opt.speedup;
        }

        return totalSpeedup;
    }

    /**
     * Train on a single example (online learning)
     */
    trainOnExample(profile, actualSpeedups) {
        const features = this.featureExtractor.extract(profile);

        // actualSpeedups = {inlining: 1.05, loopUnrolling: 1.32, ...}
        const target = this.optimizationTypes.map(opt => actualSpeedups[opt] || 1.0);

        this.neuralNetwork.train(features, target);
    }

    /**
     * Save model
     */
    serialize() {
        return {
            neuralNetwork: this.neuralNetwork.serialize(),
            optimizationTypes: this.optimizationTypes,
            optimizationCosts: this.optimizationCosts,
            codeSizeImpact: this.codeSizeImpact
        };
    }

    /**
     * Load model
     */
    static deserialize(data) {
        const predictor = new OptimizationPredictor();
        predictor.neuralNetwork = NeuralNetwork.deserialize(data.neuralNetwork);
        predictor.optimizationTypes = data.optimizationTypes;
        predictor.optimizationCosts = data.optimizationCosts;
        predictor.codeSizeImpact = data.codeSizeImpact;
        return predictor;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Matrix,
        Activation,
        NeuralNetwork,
        FeatureExtractor,
        OptimizationPredictor
    };
}

if (typeof window !== 'undefined') {
    window.Stage9 = {
        Matrix,
        Activation,
        NeuralNetwork,
        FeatureExtractor,
        OptimizationPredictor
    };
}
