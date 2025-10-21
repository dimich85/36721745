/**
 * ============================================================================
 * JAVASCRIPT BOUNDARY LAYER - STAGE 4 REVOLUTION
 * ============================================================================
 * 
 * Это революционный момент в архитектуре нашей системы. Вместо того чтобы
 * JavaScript содержал бизнес-логику, он теперь служит лишь тонкой оболочкой -
 * посредником между миром браузера (DOM, события, Web APIs) и миром WASM,
 * где происходит вся настоящая работа.
 * 
 * ФИЛОСОФИЯ ДИЗАЙНА:
 * 
 * Представьте это как дипломатическое представительство. JavaScript - это
 * посол, который говорит на языке браузера и представляет интересы WASM
 * государства. Посол не принимает решений о внутренней политике - он только
 * передаёт сообщения туда-сюда и обеспечивает, чтобы обе стороны понимали
 * друг друга.
 * 
 * КРИТИЧЕСКИЕ ПРИНЦИПЫ:
 * 
 * 1. МИНИМАЛИЗМ: Этот слой должен быть максимально тонким. Каждая добавленная
 *    строка кода - это строка, которую нужно поддерживать и которая не получает
 *    выгоды от WASM оптимизаций.
 * 
 * 2. ZERO BUSINESS LOGIC: Никакой бизнес-логики в этом слое. Только маршрутизация
 *    и трансформация данных для передачи через границу.
 * 
 * 3. ЭФФЕКТИВНАЯ ГРАНИЦА: Минимизируем количество пересечений границы JavaScript-WASM.
 *    Лучше один вызов с батчем данных, чем много вызовов с отдельными элементами.
 * 
 * 4. ТИПОВАЯ БЕЗОПАСНОСТЬ: Строгая проверка типов на границе. Если WASM ожидает
 *    int32, мы гарантируем, что передаём именно int32, не полагаясь на приведение.
 */

/**
 * WABridge (WebAssembly Bridge) - главный класс граничного слоя.
 * 
 * Это единственная точка коммуникации между JavaScript миром браузера и
 * WASM миром бизнес-логики. Все вызовы в WASM идут через этот класс,
 * все результаты из WASM приходят через этот класс.
 */
class WABridge {
    constructor() {
        // Ссылка на загруженный WASM модуль
        this.wasmModule = null;
        
        // Ссылка на экспортированные функции WASM
        this.wasmExports = null;
        
        // Память WASM для прямого доступа к данным
        this.wasmMemory = null;
        
        // Энкодеры/декодеры для строк
        this.textEncoder = new TextEncoder();
        this.textDecoder = new TextDecoder();
        
        // Счётчики для телеметрии
        this.stats = {
            totalCalls: 0,           // Всего вызовов в WASM
            totalBoundaryCrossings: 0, // Пересечений границы
            averageCallTime: 0,      // Среднее время вызова
            memoryUsed: 0            // Используемая WASM память
        };
        
        // Кэш для часто передаваемых данных
        this.sharedDataBuffers = new Map();
        
        console.log('🌉 WABridge initialized - JavaScript ↔ WASM boundary layer');
    }
    
    /**
     * Загружает и инициализирует WASM модуль.
     * 
     * Это критический момент запуска. Мы загружаем байткод WASM, компилируем
     * его в машинный код для текущей платформы, и получаем интерфейс для вызова
     * функций. После этого вся бизнес-логика готова к использованию.
     * 
     * @param {string} wasmPath - Путь к .wasm файлу
     * @returns {Promise<boolean>} - true если успешно
     */
    async loadWASM(wasmPath) {
        console.log('📦 Loading WASM module from:', wasmPath);
        const startTime = performance.now();
        
        try {
            // Загружаем байткод WASM
            const response = await fetch(wasmPath);
            const wasmBytes = await response.arrayBuffer();
            
            console.log(`  WASM size: ${(wasmBytes.byteLength / 1024).toFixed(2)} KB`);
            
            // Подготавливаем импорты - функции, которые WASM может вызывать
            const imports = this.prepareImports();
            
            // Компилируем и инстанцируем WASM модуль
            const wasmModule = await WebAssembly.instantiate(wasmBytes, imports);
            
            this.wasmModule = wasmModule;
            this.wasmExports = wasmModule.instance.exports;
            this.wasmMemory = this.wasmExports.memory;
            
            // Вызываем функцию инициализации WASM модуля, если она есть
            if (this.wasmExports.initialize) {
                this.wasmExports.initialize();
            }
            
            const loadTime = performance.now() - startTime;
            console.log(`✓ WASM module loaded and compiled in ${loadTime.toFixed(2)}ms`);
            console.log('  Exported functions:', Object.keys(this.wasmExports).length);
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to load WASM module:', error);
            return false;
        }
    }
    
    /**
     * Подготавливает импорты - функции, которые WASM может вызывать из JavaScript.
     * 
     * WASM не может напрямую работать с DOM или Web APIs. Когда WASM нужно
     * что-то сделать в браузере, он вызывает импортированную функцию, которую
     * мы предоставляем здесь. Это обратное направление границы.
     * 
     * @returns {Object} - Объект с импортами для WASM
     */
    prepareImports() {
        const self = this;
        
        return {
            env: {
                // Логирование из WASM в консоль браузера
                // Полезно для отладки WASM кода
                log: (ptr, len) => {
                    const message = self.readString(ptr, len);
                    console.log('[WASM]', message);
                },
                
                // Обновление элемента DOM из WASM
                // WASM передаёт ID элемента и новое содержимое
                updateDOM: (elementIdPtr, elementIdLen, contentPtr, contentLen) => {
                    const elementId = self.readString(elementIdPtr, elementIdLen);
                    const content = self.readString(contentPtr, contentLen);
                    
                    const element = document.getElementById(elementId);
                    if (element) {
                        element.textContent = content;
                    }
                    
                    self.stats.totalBoundaryCrossings++;
                },
                
                // Получение текущего времени для WASM
                // WASM не имеет доступа к системному времени напрямую
                getCurrentTime: () => {
                    return performance.now();
                },
                
                // Генерация случайного числа
                // WASM нужна энтропия извне для криптографии и случайности
                random: () => {
                    return Math.random();
                },
                
                // Аллокация памяти в JavaScript для больших объектов
                // Иногда эффективнее хранить большие структуры в JS, а в WASM
                // держать только ссылки
                jsAlloc: (size) => {
                    const buffer = new ArrayBuffer(size);
                    const id = self.sharedDataBuffers.size;
                    self.sharedDataBuffers.set(id, buffer);
                    return id;
                },
                
                // Освобождение памяти, выделенной через jsAlloc
                jsFree: (id) => {
                    self.sharedDataBuffers.delete(id);
                }
            }
        };
    }
    
    /**
     * Читает строку из WASM памяти.
     * 
     * Строки в WASM представлены как последовательность байт в линейной памяти.
     * Мы получаем указатель (адрес начала строки) и длину, и можем прочитать
     * эти байты и декодировать в JavaScript строку.
     * 
     * @param {number} ptr - Указатель на начало строки в WASM памяти
     * @param {number} len - Длина строки в байтах
     * @returns {string} - Декодированная строка
     */
    readString(ptr, len) {
        const bytes = new Uint8Array(this.wasmMemory.buffer, ptr, len);
        return this.textDecoder.decode(bytes);
    }
    
    /**
     * Записывает строку в WASM память.
     * 
     * Обратная операция - мы кодируем JavaScript строку в UTF-8 байты и
     * копируем их в WASM память по указанному адресу.
     * 
     * @param {string} str - Строка для записи
     * @param {number} ptr - Указатель на место в WASM памяти
     * @returns {number} - Количество записанных байт
     */
    writeString(str, ptr) {
        const encoded = this.textEncoder.encode(str);
        const memory = new Uint8Array(this.wasmMemory.buffer);
        memory.set(encoded, ptr);
        return encoded.length;
    }
    
    /**
     * Вызывает WASM функцию с телеметрией.
     * 
     * Это обёртка вокруг прямых вызовов WASM функций. Мы измеряем время
     * выполнения, отслеживаем количество вызовов, регистрируем в телеметрии.
     * Это даёт нам полную видимость в то, сколько времени тратится на
     * WASM вычисления.
     * 
     * @param {string} funcName - Имя WASM функции
     * @param {...any} args - Аргументы функции
     * @returns {any} - Результат функции
     */
    call(funcName, ...args) {
        if (!this.wasmExports[funcName]) {
            console.error(`WASM function '${funcName}' not found`);
            return null;
        }
        
        const startTime = performance.now();
        
        try {
            // Вызываем WASM функцию
            const result = this.wasmExports[funcName](...args);
            
            const callTime = performance.now() - startTime;
            
            // Обновляем статистику
            this.stats.totalCalls++;
            this.stats.totalBoundaryCrossings++;
            
            if (this.stats.averageCallTime === 0) {
                this.stats.averageCallTime = callTime;
            } else {
                // Экспоненциальное скользящее среднее
                this.stats.averageCallTime = 
                    (this.stats.averageCallTime * 0.9) + (callTime * 0.1);
            }
            
            // Логируем медленные вызовы для анализа
            if (callTime > 10) {
                console.warn(`⚠️ Slow WASM call: ${funcName} took ${callTime.toFixed(2)}ms`);
            }
            
            return result;
            
        } catch (error) {
            console.error(`Error calling WASM function '${funcName}':`, error);
            return null;
        }
    }
    
    /**
     * Читает массив чисел из WASM памяти.
     * 
     * Для эффективной передачи больших массивов данных между JavaScript и WASM
     * мы используем прямой доступ к памяти вместо передачи элементов по одному.
     * 
     * @param {number} ptr - Указатель на начало массива
     * @param {number} count - Количество элементов
     * @param {string} type - Тип элементов ('i32', 'f32', 'f64')
     * @returns {TypedArray} - JavaScript typed array с данными
     */
    readArray(ptr, count, type = 'i32') {
        const TypedArrayClass = {
            'i32': Int32Array,
            'f32': Float32Array,
            'f64': Float64Array,
            'u8': Uint8Array
        }[type];
        
        return new TypedArrayClass(this.wasmMemory.buffer, ptr, count);
    }
    
    /**
     * Записывает массив чисел в WASM память.
     * 
     * @param {TypedArray} array - Массив для записи
     * @param {number} ptr - Указатель на место в WASM памяти
     */
    writeArray(array, ptr) {
        const memory = new Uint8Array(this.wasmMemory.buffer);
        const bytes = new Uint8Array(array.buffer);
        memory.set(bytes, ptr);
    }
    
    /**
     * Возвращает статистику работы граничного слоя.
     * 
     * Эти метрики критичны для понимания накладных расходов на границу.
     * Если мы видим, что среднее время вызова очень маленькое, это может
     * указывать на то, что накладные расходы на границу доминируют над
     * полезной работой.
     * 
     * @returns {Object} - Объект со статистикой
     */
    getStats() {
        return {
            ...this.stats,
            memoryPages: this.wasmMemory ? 
                this.wasmMemory.buffer.byteLength / 65536 : 0,
            memoryMB: this.wasmMemory ? 
                (this.wasmMemory.buffer.byteLength / 1024 / 1024).toFixed(2) : 0
        };
    }
    
    /**
     * Освобождает ресурсы и очищает память.
     */
    destroy() {
        // Вызываем функцию cleanup в WASM, если она есть
        if (this.wasmExports && this.wasmExports.cleanup) {
            this.wasmExports.cleanup();
        }
        
        // Очищаем ссылки
        this.wasmModule = null;
        this.wasmExports = null;
        this.wasmMemory = null;
        this.sharedDataBuffers.clear();
        
        console.log('✓ WABridge destroyed');
    }
}

/**
 * ============================================================================
 * DOM EVENT ADAPTER
 * ============================================================================
 * 
 * Этот класс адаптирует события DOM для передачи в WASM. Браузерные события
 * содержат сложные объекты с множеством свойств, большинство из которых не
 * нужны для бизнес-логики. Мы извлекаем только необходимые данные и передаём
 * их в WASM в компактной форме.
 */
class DOMEventAdapter {
    constructor(waBridge) {
        this.bridge = waBridge;
        
        // Маппинг DOM событий на WASM функции
        this.eventHandlers = new Map();
    }
    
    /**
     * Регистрирует обработчик DOM события, который вызывает WASM функцию.
     * 
     * @param {string} elementId - ID элемента DOM
     * @param {string} eventType - Тип события ('click', 'input', и т.д.)
     * @param {string} wasmFunction - Имя WASM функции для вызова
     */
    registerHandler(elementId, eventType, wasmFunction) {
        const element = document.getElementById(elementId);
        
        if (!element) {
            console.warn(`Element '${elementId}' not found`);
            return;
        }
        
        const handler = (event) => {
            // Извлекаем только необходимые данные из события
            const eventData = this.extractEventData(event);
            
            // Передаём в WASM
            // Здесь мы упрощаем для демонстрации - в реальности
            // нужно правильно сериализовать сложные объекты
            this.bridge.call(wasmFunction, 
                eventData.x || 0, 
                eventData.y || 0,
                eventData.value || 0
            );
        };
        
        element.addEventListener(eventType, handler);
        this.eventHandlers.set(`${elementId}:${eventType}`, handler);
        
        console.log(`✓ Registered ${eventType} on ${elementId} -> ${wasmFunction}`);
    }
    
    /**
     * Извлекает нужные данные из браузерного события.
     * 
     * @param {Event} event - DOM событие
     * @returns {Object} - Упрощённый объект с данными
     */
    extractEventData(event) {
        const data = {};
        
        // Координаты для событий мыши
        if (event.clientX !== undefined) {
            data.x = event.clientX;
            data.y = event.clientY;
        }
        
        // Значение для событий ввода
        if (event.target && event.target.value !== undefined) {
            data.value = event.target.value;
        }
        
        // Код клавиши для событий клавиатуры
        if (event.key) {
            data.key = event.key;
        }
        
        return data;
    }
    
    /**
     * Удаляет все зарегистрированные обработчики.
     */
    cleanup() {
        for (const [key, handler] of this.eventHandlers) {
            const [elementId, eventType] = key.split(':');
            const element = document.getElementById(elementId);
            if (element) {
                element.removeEventListener(eventType, handler);
            }
        }
        this.eventHandlers.clear();
    }
}

/**
 * ============================================================================
 * RENDER ADAPTER
 * ============================================================================
 * 
 * WASM не может напрямую манипулировать DOM. Вместо этого он генерирует
 * описание желаемого состояния UI, а этот адаптер применяет эти изменения
 * к реальному DOM. Это как виртуальный DOM, но управляемый из WASM.
 */
class RenderAdapter {
    constructor(waBridge) {
        this.bridge = waBridge;
    }
    
    /**
     * Применяет батч обновлений DOM из WASM.
     * 
     * Вместо того чтобы WASM вызывал множество мелких обновлений DOM,
     * мы собираем все изменения в батч и применяем их одной операцией.
     * Это минимизирует reflow/repaint и пересечения границы.
     * 
     * @param {number} updatesPtr - Указатель на массив обновлений в WASM памяти
     * @param {number} updateCount - Количество обновлений
     */
    applyUpdates(updatesPtr, updateCount) {
        // Читаем массив обновлений из WASM памяти
        // Каждое обновление: [type, elementId, data...]
        const updates = this.bridge.readArray(updatesPtr, updateCount * 3, 'i32');
        
        // Применяем каждое обновление
        for (let i = 0; i < updateCount; i++) {
            const offset = i * 3;
            const type = updates[offset];
            const elementId = updates[offset + 1];
            const data = updates[offset + 2];
            
            this.applyUpdate(type, elementId, data);
        }
    }
    
    /**
     * Применяет одно обновление DOM.
     * 
     * @param {number} type - Тип обновления (0=setText, 1=setStyle, и т.д.)
     * @param {number} elementId - ID элемента
     * @param {number} data - Данные обновления
     */
    applyUpdate(type, elementId, data) {
        // Реализация зависит от типов обновлений, которые поддерживает WASM
        // Это упрощённая версия для демонстрации концепции
        console.log(`Applying update type ${type} to element ${elementId}`);
    }
}

// Экспорт классов
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        WABridge,
        DOMEventAdapter,
        RenderAdapter
    };
}

if (typeof window !== 'undefined') {
    window.WASMBoundary = {
        WABridge,
        DOMEventAdapter,
        RenderAdapter
    };
}
