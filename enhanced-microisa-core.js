/**
 * ============================================================================
 * ENHANCED MICROISA & TELEMETRY SYSTEM - STAGE 1
 * ============================================================================
 * 
 * Этот модуль представляет собой революционную вычислительную архитектуру,
 * которая работает на фундаментальном уровне абстракции. Вместо того чтобы
 * просто профилировать JavaScript-функции, мы создаём виртуальную машину,
 * которая понимает природу каждой операции.
 * 
 * Философия: Любое действие в веб-приложении можно разложить на набор
 * элементарных операций. Понимая эти операции на низком уровне, мы можем
 * оптимизировать систему способами, недоступными традиционным подходам.
 */

/**
 * Класс InstructionType определяет все типы элементарных операций,
 * которые могут происходить в веб-приложении. Это как периодическая таблица
 * элементов, но для вычислительных операций. Каждый тип представляет
 * фундаментальное действие, которое нельзя разложить на более простые части
 * в контексте нашей виртуальной машины.
 */
const InstructionType = {
    // === КАТЕГОРИЯ: Арифметические и логические операции ===
    // Базовые математические операции - фундамент всех вычислений
    ADD: 'ADD',           // Сложение двух значений
    SUB: 'SUB',           // Вычитание
    MUL: 'MUL',           // Умножение
    DIV: 'DIV',           // Деление
    MOD: 'MOD',           // Остаток от деления
    
    // Логические операции - основа условной логики
    AND: 'AND',           // Логическое И
    OR: 'OR',             // Логическое ИЛИ
    XOR: 'XOR',           // Исключающее ИЛИ
    NOT: 'NOT',           // Логическое НЕ
    
    // Операции сравнения - для принятия решений
    CMP: 'CMP',           // Сравнение двух значений
    JMP: 'JMP',           // Безусловный переход
    JE: 'JE',             // Переход если равно
    JNE: 'JNE',           // Переход если не равно
    
    // === КАТЕГОРИЯ: Операции с памятью ===
    // Эти операции управляют данными - чтение и запись
    LOAD: 'LOAD',         // Загрузить значение из памяти в регистр
    STORE: 'STORE',       // Сохранить значение из регистра в память
    MOVE: 'MOVE',         // Переместить данные между регистрами
    PUSH: 'PUSH',         // Положить значение на стек
    POP: 'POP',           // Взять значение со стека
    
    // === КАТЕГОРИЯ: DOM-операции ===
    // Специализированные операции для работы с веб-документом
    DOM_READ: 'DOM_READ',         // Чтение свойства DOM-элемента
    DOM_WRITE: 'DOM_WRITE',       // Изменение свойства DOM-элемента
    DOM_QUERY: 'DOM_QUERY',       // Поиск элемента в DOM
    DOM_CREATE: 'DOM_CREATE',     // Создание нового элемента
    DOM_REMOVE: 'DOM_REMOVE',     // Удаление элемента из DOM
    DOM_APPEND: 'DOM_APPEND',     // Добавление дочернего элемента
    
    // === КАТЕГОРИЯ: События и взаимодействие ===
    // Операции, связанные с пользовательским вводом
    EVENT_LISTEN: 'EVENT_LISTEN', // Установка обработчика события
    EVENT_FIRE: 'EVENT_FIRE',     // Генерация события
    INPUT_READ: 'INPUT_READ',     // Чтение пользовательского ввода
    MOUSE_READ: 'MOUSE_READ',     // Чтение позиции мыши
    KEY_READ: 'KEY_READ',         // Чтение состояния клавиатуры
    
    // === КАТЕГОРИЯ: Вычисления и рендеринг ===
    // Операции, связанные с визуализацией
    CALC_POSITION: 'CALC_POSITION', // Вычисление координат
    CALC_SIZE: 'CALC_SIZE',         // Вычисление размеров
    STYLE_UPDATE: 'STYLE_UPDATE',   // Обновление стилей элемента
    LAYOUT_CALC: 'LAYOUT_CALC',     // Расчёт layout (reflow)
    PAINT: 'PAINT',                 // Операция отрисовки (repaint)
    COMPOSITE: 'COMPOSITE',         // Композитинг слоёв
    
    // === КАТЕГОРИЯ: Асинхронные операции ===
    // Операции, связанные с асинхронностью и параллелизмом
    PROMISE_CREATE: 'PROMISE_CREATE', // Создание промиса
    PROMISE_RESOLVE: 'PROMISE_RESOLVE', // Разрешение промиса
    PROMISE_REJECT: 'PROMISE_REJECT',   // Отклонение промиса
    WORKER_POST: 'WORKER_POST',     // Отправка сообщения в Worker
    WORKER_RECEIVE: 'WORKER_RECEIVE', // Получение сообщения от Worker
    
    // === КАТЕГОРИЯ: Работа с данными ===
    // Операции с хранилищем и сетью
    STORAGE_READ: 'STORAGE_READ',   // Чтение из хранилища
    STORAGE_WRITE: 'STORAGE_WRITE', // Запись в хранилище
    NETWORK_REQUEST: 'NETWORK_REQUEST', // Сетевой запрос
    NETWORK_RESPONSE: 'NETWORK_RESPONSE', // Получение ответа
    
    // === КАТЕГОРИЯ: Системные операции ===
    // Операции управления выполнением
    CALL: 'CALL',         // Вызов функции
    RETURN: 'RETURN',     // Возврат из функции
    YIELD: 'YIELD',       // Передача управления (для генераторов)
    AWAIT: 'AWAIT',       // Ожидание асинхронной операции
};

/**
 * Класс ExecutionContext хранит контекстуальную информацию о выполнении
 * инструкции. Это критически важно для глубокого понимания производительности.
 * 
 * Почему это важно: Одна и та же операция может выполняться с разной скоростью
 * в зависимости от контекста. Например, обновление стиля элемента может быть
 * быстрым, если элемент невидим, но медленным, если это вызывает reflow
 * всей страницы. Сохраняя контекст, мы можем понять ЧТО влияет на производительность.
 */
class ExecutionContext {
    constructor() {
        this.timestamp = performance.now();      // Точное время выполнения
        this.stackDepth = 0;                     // Глубина стека вызовов
        this.activeWindows = 0;                  // Количество открытых окон
        this.domComplexity = 0;                  // Сложность DOM-дерева
        this.memoryUsed = 0;                     // Использованная память (МБ)
        this.cpuLoad = 0;                        // Текущая загрузка CPU (0-1)
        this.gpuActive = false;                  // Активен ли GPU
        this.workerCount = 0;                    // Количество активных Workers
        this.relatedInstructions = [];           // Связанные инструкции
        this.userAction = null;                  // Действие пользователя, вызвавшее это
        this.metadata = {};                      // Дополнительные метаданные
    }
    
    /**
     * Создаёт снимок текущего состояния системы.
     * Это даёт нам полную картину условий, в которых выполнялась операция.
     */
    snapshot() {
        return {
            timestamp: this.timestamp,
            stackDepth: this.stackDepth,
            activeWindows: this.activeWindows,
            domComplexity: document.querySelectorAll('*').length,
            memoryUsed: performance.memory ? 
                (performance.memory.usedJSHeapSize / 1048576).toFixed(2) : 0,
            cpuLoad: this.cpuLoad,
            gpuActive: this.gpuActive,
            workerCount: this.workerCount,
            userAction: this.userAction,
            metadata: {...this.metadata}
        };
    }
}

/**
 * Класс Instruction представляет единичную операцию в нашей виртуальной машине.
 * Каждая инструкция - это атомарное действие, которое можно измерить,
 * проанализировать и оптимизировать независимо от других.
 */
class Instruction {
    constructor(type, params = {}) {
        this.id = `instr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.type = type;                    // Тип инструкции из InstructionType
        this.params = params;                // Параметры инструкции
        this.context = new ExecutionContext(); // Контекст выполнения
        this.duration = 0;                   // Время выполнения (мс)
        this.executed = false;               // Была ли выполнена
        this.result = null;                  // Результат выполнения
        this.error = null;                   // Ошибка, если возникла
    }
    
    /**
     * Выполняет инструкцию и измеряет время выполнения.
     * Это центральный метод, через который проходят все операции.
     */
    async execute(vm) {
        const startTime = performance.now();
        
        try {
            // Обновляем контекст перед выполнением
            this.context.stackDepth = vm.callStack.length;
            this.context.activeWindows = vm.systemState.windowCount;
            this.context.workerCount = vm.systemState.workerCount;
            
            // Выполняем инструкцию в зависимости от типа
            this.result = await this._executeByType(vm);
            this.executed = true;
            
        } catch (error) {
            this.error = error;
            console.error(`Instruction ${this.type} failed:`, error);
        } finally {
            // Всегда измеряем время, даже если произошла ошибка
            this.duration = performance.now() - startTime;
        }
        
        return this.result;
    }
    
    /**
     * Внутренний метод выполнения, который диспетчеризует выполнение
     * в зависимости от типа инструкции. Это как большой switch statement,
     * но организованный для расширяемости.
     */
    async _executeByType(vm) {
        switch (this.type) {
            // Арифметические операции
            case InstructionType.ADD:
                return vm.registers[this.params.dest] = 
                    vm.registers[this.params.src1] + vm.registers[this.params.src2];
            
            case InstructionType.SUB:
                return vm.registers[this.params.dest] = 
                    vm.registers[this.params.src1] - vm.registers[this.params.src2];
            
            case InstructionType.MUL:
                return vm.registers[this.params.dest] = 
                    vm.registers[this.params.src1] * vm.registers[this.params.src2];
            
            case InstructionType.DIV:
                return vm.registers[this.params.dest] = 
                    vm.registers[this.params.src1] / vm.registers[this.params.src2];
            
            // Операции с памятью
            case InstructionType.LOAD:
                return vm.registers[this.params.dest] = vm.memory[this.params.addr];
            
            case InstructionType.STORE:
                return vm.memory[this.params.addr] = vm.registers[this.params.src];
            
            case InstructionType.MOVE:
                return vm.registers[this.params.dest] = vm.registers[this.params.src];
            
            // DOM-операции - это где происходит магия веб-приложений
            case InstructionType.DOM_READ:
                const element = this.params.element;
                return element ? element[this.params.property] : null;
            
            case InstructionType.DOM_WRITE:
                if (this.params.element) {
                    this.params.element[this.params.property] = this.params.value;
                }
                return this.params.value;
            
            case InstructionType.DOM_QUERY:
                return document.querySelector(this.params.selector);
            
            // Вычисления позиций - критично для оконной системы
            case InstructionType.CALC_POSITION:
                const { x, y, dx, dy, constraints } = this.params;
                let newX = x + dx;
                let newY = y + dy;
                
                // Применяем ограничения, если указаны
                if (constraints) {
                    newX = Math.max(constraints.minX, Math.min(newX, constraints.maxX));
                    newY = Math.max(constraints.minY, Math.min(newY, constraints.maxY));
                }
                
                return { x: newX, y: newY };
            
            // Обновление стилей - потенциально дорогая операция
            case InstructionType.STYLE_UPDATE:
                if (this.params.element) {
                    // Применяем несколько стилей за один проход для эффективности
                    const styles = this.params.styles;
                    for (const [prop, value] of Object.entries(styles)) {
                        this.params.element.style[prop] = value;
                    }
                }
                return true;
            
            // Worker-операции для параллелизма
            case InstructionType.WORKER_POST:
                if (this.params.worker) {
                    this.params.worker.postMessage(this.params.data);
                }
                return true;
            
            // Асинхронные операции
            case InstructionType.AWAIT:
                return await this.params.promise;
            
            default:
                console.warn(`Unimplemented instruction type: ${this.type}`);
                return null;
        }
    }
    
    /**
     * Сериализует инструкцию для сохранения в базе данных.
     * Важно: мы не сохраняем DOM-элементы напрямую, только их селекторы,
     * чтобы избежать утечек памяти.
     */
    serialize() {
        return {
            id: this.id,
            type: this.type,
            params: this._serializeParams(this.params),
            context: this.context.snapshot(),
            duration: this.duration,
            executed: this.executed,
            error: this.error ? this.error.message : null
        };
    }
    
    /**
     * Сериализует параметры, обрабатывая специальные случаи
     * вроде DOM-элементов и функций.
     */
    _serializeParams(params) {
        const serialized = {};
        for (const [key, value] of Object.entries(params)) {
            if (value instanceof HTMLElement) {
                // DOM-элементы заменяем на селектор
                serialized[key] = {
                    _type: 'DOMElement',
                    tagName: value.tagName,
                    id: value.id,
                    className: value.className
                };
            } else if (typeof value === 'function') {
                // Функции не сериализуем
                serialized[key] = { _type: 'Function', name: value.name };
            } else if (value && typeof value === 'object') {
                // Рекурсивно обрабатываем вложенные объекты
                serialized[key] = this._serializeParams(value);
            } else {
                serialized[key] = value;
            }
        }
        return serialized;
    }
}

/**
 * Класс TelemetryDatabase управляет сохранением и загрузкой телеметрических
 * данных в IndexedDB. Это персистентное хранилище позволяет системе
 * "помнить" прошлые сеансы и учиться со временем.
 * 
 * IndexedDB выбрана потому, что она:
 * 1. Асинхронная - не блокирует главный поток
 * 2. Может хранить большие объёмы данных
 * 3. Поддерживает индексы для быстрого поиска
 * 4. Персистентна между сеансами
 */
class TelemetryDatabase {
    constructor(dbName = 'MicroISA_Telemetry', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }
    
    /**
     * Инициализирует базу данных и создаёт необходимые хранилища.
     * Это асинхронная операция, которую нужно выполнить перед использованием БД.
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            // Обработчик обновления схемы БД
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Хранилище для инструкций
                // Каждая запись - это выполненная инструкция с полным контекстом
                if (!db.objectStoreNames.contains('instructions')) {
                    const instructionStore = db.createObjectStore('instructions', { 
                        keyPath: 'id' 
                    });
                    
                    // Индексы для быстрого поиска
                    instructionStore.createIndex('type', 'type', { unique: false });
                    instructionStore.createIndex('timestamp', 'context.timestamp', { unique: false });
                    instructionStore.createIndex('duration', 'duration', { unique: false });
                    instructionStore.createIndex('userAction', 'context.userAction', { unique: false });
                }
                
                // Хранилище для агрегированной статистики
                // Это предвычисленные метрики для быстрого доступа
                if (!db.objectStoreNames.contains('statistics')) {
                    const statsStore = db.createObjectStore('statistics', { 
                        keyPath: 'id' 
                    });
                    statsStore.createIndex('type', 'type', { unique: false });
                    statsStore.createIndex('date', 'date', { unique: false });
                }
                
                // Хранилище для паттернов использования
                // Здесь сохраняются обнаруженные паттерны поведения пользователя
                if (!db.objectStoreNames.contains('patterns')) {
                    const patternStore = db.createObjectStore('patterns', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    patternStore.createIndex('frequency', 'frequency', { unique: false });
                    patternStore.createIndex('confidence', 'confidence', { unique: false });
                }
                
                console.log('✓ Database schema initialized');
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✓ Database connection established');
                resolve(this.db);
            };
            
            request.onerror = (event) => {
                console.error('✗ Database initialization failed:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * Сохраняет инструкцию в базе данных.
     * Это происходит асинхронно, не блокируя выполнение программы.
     */
    async saveInstruction(instruction) {
        if (!this.db) {
            console.warn('Database not initialized');
            return;
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['instructions'], 'readwrite');
            const store = transaction.objectStore('instructions');
            const request = store.add(instruction.serialize());
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Сохраняет пакет инструкций одной транзакцией.
     * Это эффективнее, чем сохранять каждую инструкцию отдельно.
     */
    async saveBatch(instructions) {
        if (!this.db || instructions.length === 0) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['instructions'], 'readwrite');
            const store = transaction.objectStore('instructions');
            
            let completed = 0;
            instructions.forEach(instruction => {
                const request = store.add(instruction.serialize());
                request.onsuccess = () => {
                    completed++;
                    if (completed === instructions.length) {
                        resolve(completed);
                    }
                };
            });
            
            transaction.onerror = () => reject(transaction.error);
        });
    }
    
    /**
     * Получает инструкции по типу с возможностью ограничения количества.
     * Это используется для анализа конкретных операций.
     */
    async getInstructionsByType(type, limit = 100) {
        if (!this.db) return [];
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['instructions'], 'readonly');
            const store = transaction.objectStore('instructions');
            const index = store.index('type');
            const request = index.getAll(type, limit);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Вычисляет статистику для типа инструкций.
     * Это агрегирующая функция, которая анализирует сохранённые данные.
     */
    async computeStatistics(type) {
        const instructions = await this.getInstructionsByType(type, 1000);
        
        if (instructions.length === 0) {
            return {
                type,
                count: 0,
                avgDuration: 0,
                minDuration: 0,
                maxDuration: 0,
                stdDev: 0
            };
        }
        
        // Вычисляем базовые статистические метрики
        const durations = instructions.map(i => i.duration);
        const sum = durations.reduce((a, b) => a + b, 0);
        const avg = sum / durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);
        
        // Стандартное отклонение показывает вариативность
        const variance = durations.reduce((acc, val) => 
            acc + Math.pow(val - avg, 2), 0) / durations.length;
        const stdDev = Math.sqrt(variance);
        
        return {
            type,
            count: instructions.length,
            avgDuration: avg,
            minDuration: min,
            maxDuration: max,
            stdDev: stdDev,
            totalTime: sum
        };
    }
    
    /**
     * Находит самые медленные инструкции определённого типа.
     * Это "горячие точки" - кандидаты на оптимизацию.
     */
    async findHotspots(limit = 10) {
        if (!this.db) return [];
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['instructions'], 'readonly');
            const store = transaction.objectStore('instructions');
            const index = store.index('duration');
            
            // Получаем инструкции, отсортированные по длительности (от большего к меньшему)
            const request = index.openCursor(null, 'prev');
            const hotspots = [];
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && hotspots.length < limit) {
                    hotspots.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(hotspots);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Очищает старые записи для управления размером базы данных.
     * Мы храним только данные за последние N дней.
     */
    async cleanup(daysToKeep = 7) {
        if (!this.db) return;
        
        const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['instructions'], 'readwrite');
            const store = transaction.objectStore('instructions');
            const index = store.index('timestamp');
            const request = index.openCursor();
            
            let deleted = 0;
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.context.timestamp < cutoffTime) {
                        cursor.delete();
                        deleted++;
                    }
                    cursor.continue();
                } else {
                    console.log(`✓ Cleaned up ${deleted} old records`);
                    resolve(deleted);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }
}

/**
 * Класс EnhancedMicroISA - это сердце нашей вычислительной архитектуры.
 * Это полноценная виртуальная машина, которая исполняет инструкции,
 * собирает телеметрию и управляет оптимизациями.
 */
class EnhancedMicroISA {
    constructor() {
        // Регистры виртуальной машины - это быстрая память для временных данных
        this.registers = new Array(32).fill(0);
        
        // Основная память VM
        this.memory = new Array(4096).fill(0);
        
        // Стек вызовов для отслеживания выполнения
        this.callStack = [];
        
        // Программный счётчик - указывает на текущую инструкцию
        this.pc = 0;
        
        // Буфер инструкций для пакетного сохранения
        this.instructionBuffer = [];
        this.bufferSize = 50; // Сохраняем каждые 50 инструкций
        
        // База данных для телеметрии
        this.database = new TelemetryDatabase();
        
        // Состояние системы
        this.systemState = {
            windowCount: 0,
            workerCount: 0,
            gpuActive: false,
            optimizationLevel: 'baseline'
        };
        
        // Счётчики для статистики
        this.stats = {
            totalInstructions: 0,
            instructionsByType: new Map(),
            averageDurations: new Map()
        };
        
        // Флаг инициализации
        this.initialized = false;
    }
    
    /**
     * Инициализирует виртуальную машину и базу данных.
     * Это должно быть вызвано до начала использования VM.
     */
    async initialize() {
        console.log('🔧 Initializing Enhanced MicroISA...');
        
        try {
            await this.database.initialize();
            
            // Загружаем статистику из прошлых сеансов
            await this.loadHistoricalStats();
            
            // Запускаем периодическое сохранение
            this.startPeriodicSave();
            
            // Запускаем очистку старых данных
            this.startPeriodicCleanup();
            
            this.initialized = true;
            console.log('✓ Enhanced MicroISA initialized successfully');
            
        } catch (error) {
            console.error('✗ Failed to initialize MicroISA:', error);
            throw error;
        }
    }
    
    /**
     * Загружает исторические данные и вычисляет базовые статистики.
     * Это позволяет системе "помнить" прошлые сеансы.
     */
    async loadHistoricalStats() {
        console.log('📊 Loading historical statistics...');
        
        // Для каждого типа инструкций вычисляем статистику
        for (const type of Object.values(InstructionType)) {
            const stats = await this.database.computeStatistics(type);
            if (stats.count > 0) {
                this.stats.averageDurations.set(type, stats.avgDuration);
                this.stats.instructionsByType.set(type, stats.count);
            }
        }
        
        const totalTypes = this.stats.instructionsByType.size;
        console.log(`✓ Loaded statistics for ${totalTypes} instruction types`);
    }
    
    /**
     * Создаёт и выполняет инструкцию.
     * Это главный метод для взаимодействия с VM из внешнего кода.
     */
    async executeInstruction(type, params = {}) {
        const instruction = new Instruction(type, params);
        
        // Устанавливаем контекст системы
        instruction.context.workerCount = this.systemState.workerCount;
        instruction.context.gpuActive = this.systemState.gpuActive;
        
        // Выполняем инструкцию
        await instruction.execute(this);
        
        // Обновляем статистику
        this.updateStats(instruction);
        
        // Добавляем в буфер для сохранения
        this.instructionBuffer.push(instruction);
        
        // Сохраняем пакетом, когда буфер заполнится
        if (this.instructionBuffer.length >= this.bufferSize) {
            await this.flushBuffer();
        }
        
        return instruction.result;
    }
    
    /**
     * Обновляет внутреннюю статистику после выполнения инструкции.
     */
    updateStats(instruction) {
        this.stats.totalInstructions++;
        
        const type = instruction.type;
        const count = this.stats.instructionsByType.get(type) || 0;
        this.stats.instructionsByType.set(type, count + 1);
        
        // Обновляем скользящее среднее длительности
        const currentAvg = this.stats.averageDurations.get(type) || 0;
        const newAvg = (currentAvg * count + instruction.duration) / (count + 1);
        this.stats.averageDurations.set(type, newAvg);
    }
    
    /**
     * Сохраняет буфер инструкций в базу данных.
     */
    async flushBuffer() {
        if (this.instructionBuffer.length === 0) return;
        
        try {
            await this.database.saveBatch(this.instructionBuffer);
            console.log(`💾 Saved ${this.instructionBuffer.length} instructions to database`);
            this.instructionBuffer = [];
        } catch (error) {
            console.error('Failed to save instruction buffer:', error);
        }
    }
    
    /**
     * Запускает периодическое сохранение буфера каждые 10 секунд.
     */
    startPeriodicSave() {
        setInterval(async () => {
            await this.flushBuffer();
        }, 10000);
    }
    
    /**
     * Запускает очистку старых данных раз в час.
     */
    startPeriodicCleanup() {
        setInterval(async () => {
            await this.database.cleanup(7); // Храним данные за 7 дней
        }, 3600000); // Каждый час
    }
    
    /**
     * Возвращает текущую статистику виртуальной машины.
     */
    getStats() {
        return {
            totalInstructions: this.stats.totalInstructions,
            instructionsByType: Object.fromEntries(this.stats.instructionsByType),
            averageDurations: Object.fromEntries(this.stats.averageDurations),
            systemState: {...this.systemState}
        };
    }
    
    /**
     * Находит горячие точки - инструкции, требующие оптимизации.
     */
    async analyzeHotspots() {
        const hotspots = await this.database.findHotspots(20);
        
        // Группируем по типу инструкций
        const grouped = {};
        hotspots.forEach(instr => {
            if (!grouped[instr.type]) {
                grouped[instr.type] = [];
            }
            grouped[instr.type].push(instr);
        });
        
        // Вычисляем статистику для каждой группы
        const analysis = {};
        for (const [type, instructions] of Object.entries(grouped)) {
            const durations = instructions.map(i => i.duration);
            const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
            
            analysis[type] = {
                count: instructions.length,
                avgDuration: avgDuration,
                totalTime: durations.reduce((a, b) => a + b, 0),
                samples: instructions.slice(0, 5) // Первые 5 примеров
            };
        }
        
        return analysis;
    }
    
    /**
     * Генерирует отчёт о производительности.
     */
    async generatePerformanceReport() {
        const stats = this.getStats();
        const hotspots = await this.analyzeHotspots();
        
        // Находим самые частые операции
        const mostFrequent = Array.from(this.stats.instructionsByType.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        // Находим самые медленные операции
        const slowest = Array.from(this.stats.averageDurations.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        return {
            summary: {
                totalInstructions: stats.totalInstructions,
                uniqueTypes: this.stats.instructionsByType.size,
                optimizationLevel: this.systemState.optimizationLevel
            },
            mostFrequent,
            slowest,
            hotspots,
            recommendations: this.generateRecommendations(mostFrequent, slowest)
        };
    }
    
    /**
     * Генерирует рекомендации по оптимизации на основе анализа.
     */
    generateRecommendations(frequent, slow) {
        const recommendations = [];
        
        // Если часто выполняемые операции также медленные - это приоритет
        frequent.forEach(([type, count]) => {
            const avgDuration = this.stats.averageDurations.get(type);
            if (avgDuration > 5) { // Порог в 5мс
                recommendations.push({
                    priority: 'HIGH',
                    type: type,
                    reason: `Executed ${count} times with avg duration ${avgDuration.toFixed(2)}ms`,
                    suggestion: 'Consider WASM compilation or Worker offloading'
                });
            }
        });
        
        // DOM-операции всегда кандидаты на оптимизацию
        this.stats.instructionsByType.forEach((count, type) => {
            if (type.startsWith('DOM_') && count > 100) {
                recommendations.push({
                    priority: 'MEDIUM',
                    type: type,
                    reason: `High frequency DOM operation (${count} times)`,
                    suggestion: 'Consider batching DOM updates or using virtual DOM'
                });
            }
        });
        
        return recommendations;
    }
}

/**
 * Экспортируем классы для использования в других модулях.
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        InstructionType,
        ExecutionContext,
        Instruction,
        TelemetryDatabase,
        EnhancedMicroISA
    };
}

// Для использования в браузере через глобальный объект
if (typeof window !== 'undefined') {
    window.MicroISA = {
        InstructionType,
        ExecutionContext,
        Instruction,
        TelemetryDatabase,
        EnhancedMicroISA
    };
}
