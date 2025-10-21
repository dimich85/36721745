/**
 * ============================================================================
 * STAGE 6: AI-POWERED OPTIMIZATION - PERFORMANCE PREDICTOR NEURAL NETWORK
 * ============================================================================
 * 
 * Это второй компонент нашей AI системы - нейронная сеть, которая предсказывает
 * производительность кода без его выполнения. Представьте опытного программиста,
 * который может посмотреть на код и сказать: "Эта функция будет медленной, потому
 * что у неё три вложенных цикла и много операций в памяти". Наша нейросеть учится
 * делать похожие предсказания, но на основе математических паттернов в данных.
 * 
 * ЧТО ТАКОЕ НЕЙРОННАЯ СЕТЬ?
 * 
 * Представьте сеть нейронов в мозге. Каждый нейрон получает сигналы от других
 * нейронов, обрабатывает их, и передаёт дальше. Искусственная нейронная сеть
 * работает аналогично, но с числами.
 * 
 * Структура нашей сети:
 * 
 * INPUT LAYER (Входной слой)
 *   ↓ [вектор характеристик кода, ~34 числа]
 * HIDDEN LAYER 1 (Первый скрытый слой, 64 нейрона)
 *   ↓ [каждый нейрон комбинирует входные значения]
 * HIDDEN LAYER 2 (Второй скрытый слой, 32 нейрона)
 *   ↓ [еще больше абстракции и комбинирования]
 * OUTPUT LAYER (Выходной слой, 1 нейрон)
 *   ↓ [предсказанное время выполнения в миллисекундах]
 * 
 * КАК РАБОТАЕТ ОДИН НЕЙРОН?
 * 
 * Каждый нейрон делает простую операцию:
 * 1. Берёт входные значения (x1, x2, x3, ...)
 * 2. Умножает каждое на свой вес (w1, w2, w3, ...)
 * 3. Суммирует: sum = x1*w1 + x2*w2 + x3*w3 + ... + bias
 * 4. Применяет функцию активации: output = activation(sum)
 * 
 * Веса - это то, что сеть "учит". В начале они случайные, но через обучение
 * на примерах сеть находит правильные веса, которые дают точные предсказания.
 * 
 * КАК СЕТЬ УЧИТСЯ?
 * 
 * Процесс обучения называется backpropagation (обратное распространение):
 * 
 * 1. FORWARD PASS: Подаём входные данные, получаем предсказание
 * 2. COMPUTE ERROR: Сравниваем предсказание с реальным значением
 * 3. BACKWARD PASS: Вычисляем, как нужно изменить каждый вес, чтобы уменьшить ошибку
 * 4. UPDATE WEIGHTS: Корректируем веса в нужном направлении
 * 5. Повторяем тысячи раз на разных примерах
 * 
 * Постепенно сеть находит паттерны: "Когда много циклов + много операций,
 * время выполнения обычно большое", "Когда мало веток + много арифметики,
 * время выполнения обычно маленькое", и так далее.
 * 
 * ЗАЧЕМ ЭТО НУЖНО ДЛЯ КОМПИЛЯТОРА?
 * 
 * Традиционные компиляторы не могут предсказать производительность без выполнения
 * кода. Они применяют оптимизации на основе эвристик. Но с нейросетью мы можем:
 * 
 * - Предсказать, будет ли функция медленной, ДО компиляции
 * - Решить, какие оптимизации применять, на основе ожидаемого эффекта
 * - Приоритезировать функции для оптимизации по важности
 * - Учиться на реальных данных, становясь точнее со временем
 */

/**
 * NeuralNetwork - простая полносвязная нейронная сеть для регрессии.
 * 
 * Это базовая реализация нейронной сети с возможностью обучения. Для простоты
 * и образовательных целей мы реализуем всё с нуля, без внешних библиотек. Это
 * позволяет полностью понять, как работает каждый компонент.
 * 
 * @param {Array} layerSizes - Размеры слоёв, например [34, 64, 32, 1]
 *                              означает: 34 входа, 2 скрытых слоя (64 и 32), 1 выход
 */
function NeuralNetwork(layerSizes) {
    this.layerSizes = layerSizes;
    this.numLayers = layerSizes.length;
    
    // Веса между слоями
    // weights[i] содержит матрицу весов между слоем i и слоем i+1
    this.weights = [];
    
    // Смещения (biases) для каждого слоя (кроме входного)
    this.biases = [];
    
    // Активации для каждого слоя (заполняется во время forward pass)
    this.activations = [];
    
    // Взвешенные суммы перед активацией (нужны для backprop)
    this.zValues = [];
    
    // Гиперпараметры обучения
    this.learningRate = 0.001;  // Скорость обучения
    this.momentum = 0.9;         // Моментум для более стабильного обучения
    
    // История обучения
    this.trainingHistory = {
        losses: [],
        epochs: 0
    };
    
    // Инициализируем веса
    this.initializeWeights();
}

/**
 * Инициализирует веса случайными значениями.
 * 
 * Правильная инициализация весов критична для успешного обучения. Мы используем
 * Xavier инициализацию, которая масштабирует веса в зависимости от размера слоёв.
 * Это помогает избежать проблем с исчезающими или взрывающимися градиентами.
 */
NeuralNetwork.prototype.initializeWeights = function() {
    for (var i = 0; i < this.numLayers - 1; i++) {
        var inputSize = this.layerSizes[i];
        var outputSize = this.layerSizes[i + 1];
        
        // Матрица весов размера [outputSize x inputSize]
        var layerWeights = [];
        var scale = Math.sqrt(2.0 / (inputSize + outputSize));  // Xavier инициализация
        
        for (var j = 0; j < outputSize; j++) {
            var neuronWeights = [];
            for (var k = 0; k < inputSize; k++) {
                // Случайное значение в диапазоне [-scale, scale]
                neuronWeights.push((Math.random() * 2 - 1) * scale);
            }
            layerWeights.push(neuronWeights);
        }
        
        this.weights.push(layerWeights);
        
        // Смещения инициализируем нулями
        var layerBiases = [];
        for (var j = 0; j < outputSize; j++) {
            layerBiases.push(0);
        }
        
        this.biases.push(layerBiases);
    }
};

/**
 * Forward pass - проход данных через сеть для получения предсказания.
 * 
 * Это процесс, когда мы подаём входные данные в сеть и получаем выход.
 * Данные "текут" через слои, трансформируясь на каждом слое.
 * 
 * @param {Array} input - Входной вектор (характеристики кода)
 * @returns {number} - Предсказанное значение (время выполнения)
 */
NeuralNetwork.prototype.forward = function(input) {
    // Очищаем предыдущие активации
    this.activations = [];
    this.zValues = [];
    
    // Первая активация - это входные данные
    this.activations.push(input);
    
    // Проходим через каждый слой
    for (var layer = 0; layer < this.weights.length; layer++) {
        var prevActivation = this.activations[layer];
        var layerWeights = this.weights[layer];
        var layerBiases = this.biases[layer];
        
        var z = [];  // Взвешенные суммы
        var a = [];  // Активации
        
        // Для каждого нейрона в текущем слое
        for (var neuron = 0; neuron < layerWeights.length; neuron++) {
            var neuronWeights = layerWeights[neuron];
            var neuronBias = layerBiases[neuron];
            
            // Вычисляем взвешенную сумму: sum(w * x) + bias
            var sum = neuronBias;
            for (var i = 0; i < prevActivation.length; i++) {
                sum += neuronWeights[i] * prevActivation[i];
            }
            
            z.push(sum);
            
            // Применяем функцию активации
            // Для скрытых слоёв используем ReLU, для выходного - линейную
            var activation;
            if (layer < this.weights.length - 1) {
                activation = this.relu(sum);
            } else {
                activation = sum;  // Линейная активация для выходного слоя
            }
            
            a.push(activation);
        }
        
        this.zValues.push(z);
        this.activations.push(a);
    }
    
    // Возвращаем выход последнего слоя
    var output = this.activations[this.activations.length - 1];
    return output[0];  // У нас один выходной нейрон
};

/**
 * ReLU (Rectified Linear Unit) функция активации.
 * 
 * ReLU - одна из самых популярных функций активации. Она простая:
 * если вход положительный, возвращаем его, если отрицательный - возвращаем 0.
 * 
 * f(x) = max(0, x)
 * 
 * Преимущества ReLU:
 * - Очень быстрая вычислительно
 * - Решает проблему исчезающих градиентов
 * - Создаёт разреженность в сети (многие нейроны = 0)
 * 
 * @param {number} x - Входное значение
 * @returns {number} - max(0, x)
 */
NeuralNetwork.prototype.relu = function(x) {
    return Math.max(0, x);
};

/**
 * Производная ReLU для backpropagation.
 * 
 * Производная ReLU тоже простая:
 * - Если x > 0, производная = 1
 * - Если x <= 0, производная = 0
 * 
 * @param {number} x - Значение (до активации)
 * @returns {number} - Производная
 */
NeuralNetwork.prototype.reluDerivative = function(x) {
    return x > 0 ? 1 : 0;
};

/**
 * Вычисляет ошибку (loss) между предсказанием и реальным значением.
 * 
 * Мы используем Mean Squared Error (MSE) - среднеквадратичную ошибку.
 * Это стандартная функция потерь для задач регрессии.
 * 
 * MSE = (predicted - actual)^2
 * 
 * Квадрат нужен, чтобы:
 * 1. Ошибка всегда была положительной
 * 2. Большие ошибки штрафовались сильнее, чем маленькие
 * 
 * @param {number} predicted - Предсказанное значение
 * @param {number} actual - Реальное значение
 * @returns {number} - Ошибка
 */
NeuralNetwork.prototype.computeLoss = function(predicted, actual) {
    var diff = predicted - actual;
    return diff * diff;
};

/**
 * Обучает сеть на одном примере (online learning / stochastic gradient descent).
 * 
 * Это ключевой метод, где происходит обучение. Мы используем backpropagation
 * для вычисления градиентов и обновляем веса в направлении, которое уменьшает ошибку.
 * 
 * @param {Array} input - Входной вектор (характеристики кода)
 * @param {number} target - Целевое значение (реальное время выполнения)
 * @returns {number} - Ошибка на этом примере
 */
NeuralNetwork.prototype.trainOnce = function(input, target) {
    // Forward pass - получаем предсказание
    var predicted = this.forward(input);
    
    // Вычисляем ошибку
    var loss = this.computeLoss(predicted, target);
    
    // Backward pass - вычисляем градиенты
    this.backward(target);
    
    // Обновляем веса
    this.updateWeights();
    
    return loss;
};

/**
 * Backward pass - вычисление градиентов через backpropagation.
 * 
 * Это самая сложная часть нейронной сети, но концептуально простая:
 * мы идём от выхода к входу, вычисляя, как нужно изменить каждый вес,
 * чтобы уменьшить ошибку.
 * 
 * Используем правило цепочки из математического анализа для вычисления
 * градиентов на каждом слое.
 * 
 * @param {number} target - Целевое значение
 */
NeuralNetwork.prototype.backward = function(target) {
    // Инициализируем массивы для градиентов
    this.weightGradients = [];
    this.biasGradients = [];
    
    for (var i = 0; i < this.weights.length; i++) {
        var layerWeightGrads = [];
        var layerBiasGrads = [];
        
        for (var j = 0; j < this.weights[i].length; j++) {
            var neuronGrads = [];
            for (var k = 0; k < this.weights[i][j].length; k++) {
                neuronGrads.push(0);
            }
            layerWeightGrads.push(neuronGrads);
            layerBiasGrads.push(0);
        }
        
        this.weightGradients.push(layerWeightGrads);
        this.biasGradients.push(layerBiasGrads);
    }
    
    // Вычисляем градиент выходного слоя
    var outputLayer = this.weights.length - 1;
    var predicted = this.activations[this.activations.length - 1][0];
    var outputError = 2 * (predicted - target);  // Производная MSE
    
    // Начинаем backpropagation с выходного слоя
    var delta = [outputError];  // Ошибка выходного слоя
    
    // Идём от выходного слоя к входному
    for (var layer = this.weights.length - 1; layer >= 0; layer--) {
        var prevActivation = this.activations[layer];
        var layerWeights = this.weights[layer];
        
        // Вычисляем градиенты весов для этого слоя
        for (var neuron = 0; neuron < layerWeights.length; neuron++) {
            this.biasGradients[layer][neuron] = delta[neuron];
            
            for (var weight = 0; weight < layerWeights[neuron].length; weight++) {
                this.weightGradients[layer][neuron][weight] = 
                    delta[neuron] * prevActivation[weight];
            }
        }
        
        // Вычисляем delta для предыдущего слоя (если не входной слой)
        if (layer > 0) {
            var nextDelta = [];
            
            for (var i = 0; i < prevActivation.length; i++) {
                var error = 0;
                
                for (var j = 0; j < layerWeights.length; j++) {
                    error += delta[j] * layerWeights[j][i];
                }
                
                // Применяем производную функции активации
                var z = this.zValues[layer - 1][i];
                error *= this.reluDerivative(z);
                
                nextDelta.push(error);
            }
            
            delta = nextDelta;
        }
    }
};

/**
 * Обновляет веса на основе вычисленных градиентов.
 * 
 * Используем простой gradient descent с learning rate:
 * weight_new = weight_old - learning_rate * gradient
 * 
 * Learning rate контролирует размер шага. Слишком большой - сеть не сходится,
 * слишком маленький - обучение идёт медленно.
 */
NeuralNetwork.prototype.updateWeights = function() {
    for (var layer = 0; layer < this.weights.length; layer++) {
        for (var neuron = 0; neuron < this.weights[layer].length; neuron++) {
            // Обновляем bias
            this.biases[layer][neuron] -= 
                this.learningRate * this.biasGradients[layer][neuron];
            
            // Обновляем веса
            for (var weight = 0; weight < this.weights[layer][neuron].length; weight++) {
                this.weights[layer][neuron][weight] -= 
                    this.learningRate * this.weightGradients[layer][neuron][weight];
            }
        }
    }
};

/**
 * Обучает сеть на наборе данных несколько эпох.
 * 
 * Эпоха - это один проход через весь тренировочный набор.
 * Обычно нужно много эпох (сотни или тысячи) для хорошего обучения.
 * 
 * @param {Array} trainingData - Массив объектов {input: [], target: number}
 * @param {number} epochs - Количество эпох обучения
 * @returns {Object} - Статистика обучения
 */
NeuralNetwork.prototype.train = function(trainingData, epochs) {
    console.log('Starting training...');
    console.log('Training samples:', trainingData.length);
    console.log('Epochs:', epochs);
    console.log('');
    
    for (var epoch = 0; epoch < epochs; epoch++) {
        var totalLoss = 0;
        
        // Перемешиваем данные для лучшего обучения
        var shuffled = this.shuffleArray(trainingData.slice());
        
        // Обучаемся на каждом примере
        for (var i = 0; i < shuffled.length; i++) {
            var sample = shuffled[i];
            var loss = this.trainOnce(sample.input, sample.target);
            totalLoss += loss;
        }
        
        var avgLoss = totalLoss / shuffled.length;
        this.trainingHistory.losses.push(avgLoss);
        this.trainingHistory.epochs++;
        
        // Логируем прогресс каждые 10% эпох
        if ((epoch + 1) % Math.max(1, Math.floor(epochs / 10)) === 0) {
            console.log('Epoch ' + (epoch + 1) + '/' + epochs + 
                       ', Loss: ' + avgLoss.toFixed(6));
        }
    }
    
    console.log('');
    console.log('Training complete!');
    console.log('Final loss:', this.trainingHistory.losses[this.trainingHistory.losses.length - 1].toFixed(6));
    
    return {
        finalLoss: this.trainingHistory.losses[this.trainingHistory.losses.length - 1],
        history: this.trainingHistory
    };
};

/**
 * Предсказывает значение для нового входа.
 * 
 * После обучения мы используем сеть для предсказаний.
 * Просто forward pass без обновления весов.
 * 
 * @param {Array} input - Входной вектор
 * @returns {number} - Предсказанное значение
 */
NeuralNetwork.prototype.predict = function(input) {
    return this.forward(input);
};

/**
 * Перемешивает массив (Fisher-Yates shuffle).
 * 
 * Перемешивание данных важно для обучения - это предотвращает
 * "запоминание" порядка примеров сетью.
 */
NeuralNetwork.prototype.shuffleArray = function(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
};

/**
 * Сохраняет веса сети в JSON формате.
 * 
 * Это позволяет сохранить обученную сеть и загрузить позже,
 * не переобучая с нуля.
 * 
 * @returns {string} - JSON строка с весами
 */
NeuralNetwork.prototype.saveWeights = function() {
    return JSON.stringify({
        layerSizes: this.layerSizes,
        weights: this.weights,
        biases: this.biases,
        trainingHistory: this.trainingHistory
    });
};

/**
 * Загружает веса из JSON.
 * 
 * @param {string} json - JSON строка с весами
 */
NeuralNetwork.prototype.loadWeights = function(json) {
    var data = JSON.parse(json);
    this.layerSizes = data.layerSizes;
    this.weights = data.weights;
    this.biases = data.biases;
    this.trainingHistory = data.trainingHistory || { losses: [], epochs: 0 };
};

// Экспорт для использования в браузере
if (typeof window !== 'undefined') {
    window.CompilerStage6 = window.CompilerStage6 || {};
    window.CompilerStage6.NeuralNetwork = NeuralNetwork;
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NeuralNetwork: NeuralNetwork };
}
