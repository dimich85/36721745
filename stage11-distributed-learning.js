/**
 * ============================================================================
 * STAGE 11: DISTRIBUTED LEARNING SYSTEM
 * ============================================================================
 *
 * Федеративное обучение ML модели на агрегированных данных от всех пользователей.
 * Глобальная модель становится умнее с каждым новым пользователем!
 *
 * Компоненты:
 * - TelemetryCollector: Сбор анонимной телеметрии (privacy-preserving)
 * - ModelUpdater: Автоматическое обновление ML модели
 * - DistributedLearningClient: Главный координатор
 * - ServerSimulator: Симуляция централизованного сервера (для демо)
 */

// ============================================================================
// Telemetry Collector - Privacy-Preserving Data Collection
// ============================================================================

class TelemetryCollector {
    constructor() {
        this.enabled = false;  // Opt-in by default
        this.buffer = [];      // Локальный буфер перед отправкой
        this.batchSize = 10;   // Отправляем батчами
        this.privacyBudget = 0.1;  // Epsilon для differential privacy
    }

    /**
     * Включить/выключить телеметрию (opt-in)
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`📊 Telemetry ${enabled ? 'enabled' : 'disabled'}`);

        if (!enabled) {
            this.buffer = [];  // Очищаем буфер при отключении
        }
    }

    /**
     * Собрать телеметрию после бенчмарка
     */
    async collect(profile, actualSpeedups, context = {}) {
        if (!this.enabled) return;

        // Создаём анонимный пакет телеметрии
        const packet = {
            // Хэш профиля (не исходный код!)
            profileSignature: this.hashProfile(profile),

            // Фактические результаты оптимизаций
            actualSpeedups: this.sanitizeSpeedups(actualSpeedups),

            // Контекст использования (хэш паттерна)
            contextHash: this.hashContext(context),

            // Метаданные окружения (не личные данные)
            environment: this.getEnvironmentInfo(),

            // Временная метка
            timestamp: Date.now(),

            // ID пакета для отслеживания
            packetId: this.generatePacketId()
        };

        // Применяем differential privacy
        const privatizedPacket = this.addDifferentialPrivacy(packet);

        // Добавляем в буфер
        this.buffer.push(privatizedPacket);

        console.log(`📦 Telemetry collected (buffer: ${this.buffer.length}/${this.batchSize})`);

        // Если накопилось достаточно - отправляем батч
        if (this.buffer.length >= this.batchSize) {
            await this.flush();
        }
    }

    /**
     * Хэширование профиля функции (необратимое)
     */
    hashProfile(profile) {
        // Извлекаем только структурные характеристики, не код
        const features = {
            lines: profile.codeStats?.lines || 0,
            complexity: profile.codeStats?.cyclomaticComplexity || 0,
            loops: profile.codeStats?.loops || 0,
            hasLoop: profile.codeStats?.hasLoop || false,
            hasRecursion: profile.metadata?.hasRecursion || false,
            callCount: profile.callCount || 0,
            avgTime: Math.round(profile.avgTime || 0)
        };

        // Простой хэш (в продакшене использовать crypto.subtle.digest)
        return this.simpleHash(JSON.stringify(features));
    }

    /**
     * Хэширование контекста использования
     */
    hashContext(context) {
        const contextFeatures = {
            argTypes: context.argTypes || [],
            executionPattern: context.executionPattern || 'unknown',
            hotPath: context.hotPath || false
        };

        return this.simpleHash(JSON.stringify(contextFeatures));
    }

    /**
     * Простой хэш (для демо, в продакшене использовать SHA-256)
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * Санитизация speedups (удаление аномалий)
     */
    sanitizeSpeedups(speedups) {
        const sanitized = {};

        for (const [opt, speedup] of Object.entries(speedups)) {
            // Удаляем явно некорректные значения
            if (!isFinite(speedup) || isNaN(speedup) || speedup < 1.0) {
                sanitized[opt] = 1.0;
            } else if (speedup > 10.0) {
                // Ограничиваем максимум (защита от outliers)
                sanitized[opt] = 10.0;
            } else {
                sanitized[opt] = Math.round(speedup * 100) / 100;  // 2 знака
            }
        }

        return sanitized;
    }

    /**
     * Добавление Differential Privacy noise
     */
    addDifferentialPrivacy(packet) {
        const epsilon = this.privacyBudget;

        return {
            ...packet,
            actualSpeedups: Object.fromEntries(
                Object.entries(packet.actualSpeedups).map(([opt, speedup]) => {
                    // Laplace noise для differential privacy
                    const noise = this.laplaceNoise(0, 1 / epsilon);
                    const noisySpeedup = Math.max(1.0, speedup + noise);
                    return [opt, Math.round(noisySpeedup * 100) / 100];
                })
            )
        };
    }

    /**
     * Генерация Laplace noise (differential privacy)
     */
    laplaceNoise(mu, b) {
        const u = Math.random() - 0.5;
        return mu - b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    }

    /**
     * Информация об окружении (не личные данные)
     */
    getEnvironmentInfo() {
        return {
            // Только общая информация о браузере
            browser: this.getBrowserFamily(),
            platform: navigator.platform,
            // Не точный userAgent, только семейство
            engine: this.getEngineFamily(),
            // Количество ядер CPU (performance hint)
            cores: navigator.hardwareConcurrency || 4,
            // Поддержка WASM features
            wasmFeatures: this.detectWASMFeatures()
        };
    }

    getBrowserFamily() {
        const ua = navigator.userAgent;
        if (ua.includes('Chrome')) return 'chromium';
        if (ua.includes('Firefox')) return 'firefox';
        if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari';
        return 'other';
    }

    getEngineFamily() {
        // V8, SpiderMonkey, JavaScriptCore
        const ua = navigator.userAgent;
        if (ua.includes('Chrome')) return 'v8';
        if (ua.includes('Firefox')) return 'spidermonkey';
        if (ua.includes('Safari')) return 'jsc';
        return 'unknown';
    }

    detectWASMFeatures() {
        const features = {
            basic: typeof WebAssembly !== 'undefined',
            simd: false,
            threads: false
        };

        // Проверка SIMD support
        try {
            features.simd = WebAssembly.validate(new Uint8Array([
                0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0
            ]));
        } catch (e) {}

        // Проверка Threads support
        features.threads = typeof SharedArrayBuffer !== 'undefined';

        return features;
    }

    /**
     * Генерация уникального ID пакета
     */
    generatePacketId() {
        return `pkt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Отправка батча на сервер
     */
    async flush() {
        if (this.buffer.length === 0) return;

        console.log(`📤 Sending telemetry batch (${this.buffer.length} packets)...`);

        try {
            // В продакшене это будет реальный API endpoint
            const response = await this.sendToServer(this.buffer);

            console.log(`✓ Telemetry sent successfully:`, response);

            // Очищаем буфер после успешной отправки
            this.buffer = [];
        } catch (error) {
            console.warn('⚠ Failed to send telemetry:', error);
            // Оставляем в буфере для повторной попытки
        }
    }

    /**
     * Отправка на сервер (в демо - симуляция)
     */
    async sendToServer(packets) {
        // В продакшене:
        // return fetch('/api/telemetry', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ packets })
        // });

        // Для демо - симулируем задержку сети
        await new Promise(resolve => setTimeout(resolve, 100));

        return {
            status: 'ok',
            received: packets.length,
            timestamp: Date.now()
        };
    }

    /**
     * Получить статистику телеметрии
     */
    getStats() {
        return {
            enabled: this.enabled,
            buffered: this.buffer.length,
            batchSize: this.batchSize,
            privacyBudget: this.privacyBudget
        };
    }
}

// ============================================================================
// Model Updater - Automatic Model Updates
// ============================================================================

class ModelUpdater {
    constructor(predictor) {
        this.predictor = predictor;
        this.currentVersion = null;
        this.checkInterval = 3600000;  // Проверяем каждый час
        this.autoCheckEnabled = true;
        this.lastCheck = null;
    }

    /**
     * Начать автоматические проверки обновлений
     */
    startAutoCheck() {
        if (!this.autoCheckEnabled) return;

        console.log('🔄 Auto-update checker started');

        // Первая проверка сразу
        this.checkForUpdates();

        // Затем периодически
        this.checkTimer = setInterval(() => {
            this.checkForUpdates();
        }, this.checkInterval);
    }

    /**
     * Остановить автоматические проверки
     */
    stopAutoCheck() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
        }
        console.log('⏸ Auto-update checker stopped');
    }

    /**
     * Проверить наличие обновлений модели
     */
    async checkForUpdates() {
        console.log('🔍 Checking for model updates...');
        this.lastCheck = Date.now();

        try {
            const update = await this.fetchLatestModel();

            if (update.upToDate) {
                console.log(`✓ Model is up to date (v${this.currentVersion})`);
                return { updated: false };
            }

            console.log(`📦 New model available: v${update.version} (current: v${this.currentVersion || 'none'})`);

            // Применяем обновление
            await this.applyUpdate(update);

            return { updated: true, version: update.version };
        } catch (error) {
            console.error('❌ Failed to check for updates:', error);
            return { updated: false, error };
        }
    }

    /**
     * Запрос последней версии модели с сервера
     */
    async fetchLatestModel() {
        // В продакшене:
        // return fetch(`/api/model/latest?version=${this.currentVersion}`);

        // Для демо - симулируем ответ сервера
        await new Promise(resolve => setTimeout(resolve, 200));

        // Симулируем, что есть новая версия если currentVersion === null
        if (!this.currentVersion) {
            return {
                upToDate: false,
                updateType: 'full',
                version: '1.0',
                model: this.generateMockModel(),
                metadata: {
                    trainedOn: new Date(),
                    sampleCount: 10000,
                    trainingLoss: 0.045,
                    accuracy: 0.89
                }
            };
        }

        return {
            upToDate: true,
            version: this.currentVersion
        };
    }

    /**
     * Применить обновление модели
     */
    async applyUpdate(update) {
        console.log(`⬇️  Applying model update v${update.version}...`);

        if (update.updateType === 'full') {
            // Полное обновление - заменяем модель
            await this.applyFullUpdate(update);
        } else if (update.updateType === 'incremental') {
            // Инкрементальное - только изменённые веса
            await this.applyIncrementalUpdate(update);
        }

        this.currentVersion = update.version;

        console.log(`✓ Model updated to v${update.version}`);
        console.log(`  Sample count: ${update.metadata.sampleCount}`);
        console.log(`  Training loss: ${update.metadata.trainingLoss.toFixed(4)}`);
        console.log(`  Accuracy: ${(update.metadata.accuracy * 100).toFixed(1)}%`);
    }

    /**
     * Полное обновление модели
     */
    async applyFullUpdate(update) {
        // Десериализация модели
        const model = update.model;

        // Заменяем нейронную сеть
        this.predictor.neuralNetwork = model;
    }

    /**
     * Инкрементальное обновление (только изменённые веса)
     */
    async applyIncrementalUpdate(update) {
        const delta = update.delta;

        // Применяем дельту к текущим весам
        for (let i = 0; i < delta.length; i++) {
            const layerDelta = delta[i];

            for (let row = 0; row < layerDelta.length; row++) {
                for (let col = 0; col < layerDelta[row].length; col++) {
                    this.predictor.neuralNetwork.layers[i].data[row][col] += layerDelta[row][col];
                }
            }
        }
    }

    /**
     * Генерация mock модели для демо
     */
    generateMockModel() {
        // Возвращаем сериализованную нейронную сеть
        // В продакшене это была бы реальная обученная модель с сервера
        return {
            architecture: [50, 128, 64, 32, 7],
            layers: [],  // Веса
            biases: []   // Смещения
        };
    }

    /**
     * Статистика обновлений
     */
    getStats() {
        return {
            currentVersion: this.currentVersion,
            autoCheckEnabled: this.autoCheckEnabled,
            lastCheck: this.lastCheck,
            nextCheck: this.lastCheck ? this.lastCheck + this.checkInterval : null
        };
    }
}

// ============================================================================
// Distributed Learning Client - Main Coordinator
// ============================================================================

class DistributedLearningClient {
    constructor(predictor) {
        this.predictor = predictor;
        this.telemetryCollector = new TelemetryCollector();
        this.modelUpdater = new ModelUpdater(predictor);
        this.stats = {
            telemetrySent: 0,
            modelsReceived: 0,
            startTime: Date.now()
        };
    }

    /**
     * Инициализация системы
     */
    async initialize() {
        console.log('🌐 Initializing Distributed Learning...');

        // Проверяем и загружаем последнюю модель
        const updateResult = await this.modelUpdater.checkForUpdates();

        if (updateResult.updated) {
            this.stats.modelsReceived++;
        }

        console.log('✓ Distributed Learning initialized');

        return this;
    }

    /**
     * Включить телеметрию (opt-in)
     */
    enableTelemetry() {
        this.telemetryCollector.setEnabled(true);
        this.modelUpdater.startAutoCheck();

        console.log('✅ Distributed Learning enabled');
        console.log('   - Telemetry: ON');
        console.log('   - Auto-updates: ON');
    }

    /**
     * Выключить телеметрию
     */
    disableTelemetry() {
        this.telemetryCollector.setEnabled(false);
        this.modelUpdater.stopAutoCheck();

        console.log('⏸ Distributed Learning disabled');
    }

    /**
     * Записать результат бенчмарка (для телеметрии)
     */
    async recordBenchmark(profile, actualSpeedups, context = {}) {
        // Собираем телеметрию
        await this.telemetryCollector.collect(profile, actualSpeedups, context);

        this.stats.telemetrySent++;
    }

    /**
     * Ручная проверка обновлений
     */
    async checkForModelUpdates() {
        const result = await this.modelUpdater.checkForUpdates();

        if (result.updated) {
            this.stats.modelsReceived++;
        }

        return result;
    }

    /**
     * Отправить текущий буфер телеметрии
     */
    async flushTelemetry() {
        await this.telemetryCollector.flush();
    }

    /**
     * Получить общую статистику
     */
    getStats() {
        return {
            ...this.stats,
            uptime: Date.now() - this.stats.startTime,
            telemetry: this.telemetryCollector.getStats(),
            modelUpdater: this.modelUpdater.getStats()
        };
    }
}

// ============================================================================
// Server Simulator - Simulated Centralized Server (For Demo)
// ============================================================================

class ServerSimulator {
    constructor() {
        this.telemetryBuffer = [];
        this.globalModel = null;
        this.modelVersion = '0.0';
        this.stats = {
            totalSamplesReceived: 0,
            totalClientsServed: 0,
            retrainingCount: 0,
            lastRetraining: null
        };
    }

    /**
     * Принять телеметрию от клиента
     */
    async receiveTelemetry(packets) {
        console.log(`[Server] Received ${packets.length} telemetry packets`);

        this.telemetryBuffer.push(...packets);
        this.stats.totalSamplesReceived += packets.length;
        this.stats.totalClientsServed++;

        // Если накопилось достаточно - переобучаем
        if (this.telemetryBuffer.length >= 100) {
            await this.retrainGlobalModel();
        }

        return {
            status: 'ok',
            received: packets.length,
            bufferSize: this.telemetryBuffer.length
        };
    }

    /**
     * Переобучение глобальной модели
     */
    async retrainGlobalModel() {
        console.log(`[Server] 🧠 Retraining global model on ${this.telemetryBuffer.length} samples...`);

        // Симулируем обучение
        await new Promise(resolve => setTimeout(resolve, 500));

        // Агрегируем данные
        const aggregated = this.aggregateData(this.telemetryBuffer);

        console.log(`[Server] Aggregated to ${aggregated.length} unique patterns`);

        // Обновляем версию модели
        const oldVersion = this.modelVersion;
        this.modelVersion = this.incrementVersion(this.modelVersion);

        console.log(`[Server] ✓ Model retrained: v${oldVersion} → v${this.modelVersion}`);

        // Очищаем буфер
        this.telemetryBuffer = [];

        this.stats.retrainingCount++;
        this.stats.lastRetraining = Date.now();
    }

    /**
     * Агрегация данных (группировка по signature)
     */
    aggregateData(telemetry) {
        const grouped = new Map();

        for (const packet of telemetry) {
            const key = packet.profileSignature;

            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(packet);
        }

        // Агрегируем каждую группу (медиана speedups)
        return Array.from(grouped.entries()).map(([signature, packets]) => {
            return {
                profileSignature: signature,
                actualSpeedups: this.medianSpeedups(packets.map(p => p.actualSpeedups)),
                sampleCount: packets.length,
                confidence: packets.length / telemetry.length
            };
        });
    }

    /**
     * Медиана speedups (устойчива к outliers)
     */
    medianSpeedups(speedupsArray) {
        const result = {};

        // Для каждого типа оптимизации
        const optimizations = Object.keys(speedupsArray[0]);

        for (const opt of optimizations) {
            const values = speedupsArray.map(s => s[opt]).sort((a, b) => a - b);
            const mid = Math.floor(values.length / 2);

            result[opt] = values.length % 2 === 0
                ? (values[mid - 1] + values[mid]) / 2
                : values[mid];
        }

        return result;
    }

    /**
     * Инкремент версии
     */
    incrementVersion(version) {
        const parts = version.split('.');
        parts[1] = parseInt(parts[1]) + 1;
        return parts.join('.');
    }

    /**
     * Получить последнюю версию модели
     */
    getLatestModel(clientVersion) {
        if (clientVersion === this.modelVersion) {
            return {
                upToDate: true,
                version: this.modelVersion
            };
        }

        return {
            upToDate: false,
            updateType: 'full',
            version: this.modelVersion,
            model: { /* mock model */ },
            metadata: {
                trainedOn: new Date(),
                sampleCount: this.stats.totalSamplesReceived,
                trainingLoss: 0.045,
                accuracy: 0.89
            }
        };
    }

    /**
     * Статистика сервера
     */
    getStats() {
        return this.stats;
    }
}

// ============================================================================
// Export для использования в других модулях
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TelemetryCollector,
        ModelUpdater,
        DistributedLearningClient,
        ServerSimulator
    };
}
