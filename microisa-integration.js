/**
 * ============================================================================
 * MICROISA INTEGRATION MODULE & TELEMETRY VISUALIZER
 * ============================================================================
 * 
 * Этот модуль соединяет расширенную MicroISA с реальным веб-приложением.
 * Он перехватывает ключевые операции приложения и транслирует их в
 * инструкции виртуальной машины, создавая детальную картину того,
 * что происходит "под капотом".
 * 
 * Философия интеграции: Вместо того чтобы переписывать всё приложение,
 * мы создаём тонкий слой инструментирования, который оборачивает существующие
 * функции. Это позволяет постепенно внедрять систему без разрушения
 * работающего кода.
 */

class MicroISAIntegration {
    constructor(vm) {
        this.vm = vm; // Ссылка на виртуальную машину
        this.instrumentedFunctions = new Map(); // Карта инструментированных функций
        this.operationHistory = []; // История последних операций
        this.historySize = 100; // Храним последние 100 операций
        
        // Привязываем контекст для использования в обработчиках событий
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleClick = this.handleClick.bind(this);
    }
    
    /**
     * Инструментирует функцию, оборачивая её в слой телеметрии.
     * 
     * Как это работает: Представьте, что у вас есть функция, которая открывает
     * окно. Мы берём эту функцию и создаём вокруг неё "обёртку" - новую функцию,
     * которая сначала записывает в телеметрию "начинаем открывать окно",
     * затем вызывает оригинальную функцию, а после записывает "закончили
     * открывать окно и вот сколько времени это заняло". Для внешнего кода
     * всё выглядит так же, но внутри система собирает детальную информацию.
     * 
     * @param {Function} originalFn - Оригинальная функция для инструментирования
     * @param {string} fnName - Имя функции для идентификации
     * @param {string} instructionType - Тип инструкции из InstructionType
     * @returns {Function} Инструментированная функция
     */
    instrument(originalFn, fnName, instructionType) {
        const self = this;
        
        // Создаём обёртку, которая сохраняет поведение оригинальной функции
        const instrumented = async function(...args) {
            // Записываем начало операции
            const startTime = performance.now();
            
            // Создаём инструкцию с контекстом
            const instruction = {
                type: instructionType,
                function: fnName,
                args: self._serializeArgs(args),
                timestamp: startTime
            };
            
            let result;
            let error = null;
            
            try {
                // Выполняем оригинальную функцию через VM
                result = await self.vm.executeInstruction(instructionType, {
                    originalFn: originalFn,
                    args: args,
                    context: self._captureContext()
                });
                
                // Если функция возвращает промис, дожидаемся его
                if (result && typeof result.then === 'function') {
                    result = await result;
                }
                
            } catch (e) {
                error = e;
                throw e; // Пробрасываем ошибку дальше
            } finally {
                // Всегда записываем завершение, даже если была ошибка
                const endTime = performance.now();
                instruction.duration = endTime - startTime;
                instruction.error = error;
                
                // Добавляем в историю операций
                self.operationHistory.push(instruction);
                if (self.operationHistory.length > self.historySize) {
                    self.operationHistory.shift(); // Удаляем самую старую
                }
            }
            
            return result;
        };
        
        // Сохраняем связь между инструментированной и оригинальной функцией
        this.instrumentedFunctions.set(fnName, {
            original: originalFn,
            instrumented: instrumented,
            callCount: 0
        });
        
        return instrumented;
    }
    
    /**
     * Захватывает текущий контекст приложения.
     * Это как сделать снимок состояния системы в момент выполнения операции.
     */
    _captureContext() {
        return {
            windowCount: document.querySelectorAll('.window').length,
            domComplexity: document.querySelectorAll('*').length,
            activeElement: document.activeElement ? document.activeElement.tagName : null,
            timestamp: performance.now(),
            memory: performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize
            } : null
        };
    }
    
    /**
     * Сериализует аргументы функции для безопасного логирования.
     * DOM-элементы и функции заменяются на их описания.
     */
    _serializeArgs(args) {
        return Array.from(args).map(arg => {
            if (arg instanceof HTMLElement) {
                return {
                    type: 'HTMLElement',
                    tag: arg.tagName,
                    id: arg.id,
                    class: arg.className
                };
            } else if (typeof arg === 'function') {
                return { type: 'Function', name: arg.name };
            } else if (arg && typeof arg === 'object') {
                try {
                    return JSON.parse(JSON.stringify(arg));
                } catch (e) {
                    return { type: 'Object', error: 'Not serializable' };
                }
            }
            return arg;
        });
    }
    
    /**
     * Устанавливает глобальные обработчики событий для отслеживания
     * пользовательского взаимодействия. Каждое движение мыши, клик,
     * нажатие клавиши транслируется в инструкции VM.
     * 
     * Почему это важно: Пользовательские действия - это первопричина
     * всех вычислений в интерактивном приложении. Отслеживая их на
     * низком уровне, мы можем построить полную картину того, какие
     * действия пользователя приводят к каким вычислительным затратам.
     */
    setupEventTracking() {
        // Отслеживание движения мыши
        // Мы используем throttling, чтобы не создавать тысячи инструкций в секунду
        let lastMouseMove = 0;
        const mouseMoveThrottle = 16; // ~60 FPS
        
        document.addEventListener('mousemove', (e) => {
            const now = performance.now();
            if (now - lastMouseMove >= mouseMoveThrottle) {
                this.handleMouseMove(e);
                lastMouseMove = now;
            }
        });
        
        document.addEventListener('mousedown', this.handleMouseDown);
        document.addEventListener('mouseup', this.handleMouseUp);
        document.addEventListener('click', this.handleClick);
        
        // Отслеживание клавиатуры
        document.addEventListener('keydown', (e) => {
            this.vm.executeInstruction(window.MicroISA.InstructionType.KEY_READ, {
                key: e.key,
                code: e.code,
                ctrlKey: e.ctrlKey,
                shiftKey: e.shiftKey,
                altKey: e.altKey
            });
        });
        
        console.log('✓ Event tracking established');
    }
    
    /**
     * Обработчики событий мыши транслируют действия пользователя
     * в инструкции виртуальной машины.
     */
    handleMouseMove(e) {
        this.vm.executeInstruction(window.MicroISA.InstructionType.MOUSE_READ, {
            x: e.clientX,
            y: e.clientY,
            movementX: e.movementX,
            movementY: e.movementY,
            buttons: e.buttons
        });
    }
    
    handleMouseDown(e) {
        this.vm.executeInstruction(window.MicroISA.InstructionType.INPUT_READ, {
            type: 'mousedown',
            button: e.button,
            x: e.clientX,
            y: e.clientY
        });
    }
    
    handleMouseUp(e) {
        this.vm.executeInstruction(window.MicroISA.InstructionType.INPUT_READ, {
            type: 'mouseup',
            button: e.button,
            x: e.clientX,
            y: e.clientY
        });
    }
    
    handleClick(e) {
        this.vm.executeInstruction(window.MicroISA.InstructionType.INPUT_READ, {
            type: 'click',
            target: e.target.tagName,
            targetId: e.target.id,
            x: e.clientX,
            y: e.clientY
        });
    }
    
    /**
     * Оборачивает объект менеджера окон для отслеживания всех операций с окнами.
     * Это критически важная часть, так как оконная система - это основа
     * взаимодействия в macOS-подобном интерфейсе.
     */
    instrumentWindowManager(wm) {
        const InstructionType = window.MicroISA.InstructionType;
        
        // Оборачиваем метод открытия окна
        const originalOpenApp = wm.openApp;
        wm.openApp = async (appName) => {
            // Начинаем трассировку операции открытия окна
            const traceId = `open_${appName}_${Date.now()}`;
            
            // Записываем намерение открыть окно
            await this.vm.executeInstruction(InstructionType.CALL, {
                function: 'openApp',
                traceId: traceId,
                appName: appName
            });
            
            // Создаём DOM-элементы для окна
            await this.vm.executeInstruction(InstructionType.DOM_CREATE, {
                type: 'window',
                traceId: traceId
            });
            
            // Вычисляем позицию окна
            const windowWidth = 600;
            const windowHeight = 400;
            await this.vm.executeInstruction(InstructionType.CALC_POSITION, {
                x: (window.innerWidth - windowWidth) / 2,
                y: (window.innerHeight - windowHeight) / 2,
                dx: Math.random() * 100,
                dy: Math.random() * 50,
                traceId: traceId
            });
            
            // Вызываем оригинальную функцию
            const result = originalOpenApp.call(wm, appName);
            
            // Записываем завершение операции
            await this.vm.executeInstruction(InstructionType.RETURN, {
                function: 'openApp',
                traceId: traceId,
                success: true
            });
            
            return result;
        };
        
        // Оборачиваем метод закрытия окна
        const originalCloseWindow = wm.closeWindow;
        wm.closeWindow = async (winId) => {
            await this.vm.executeInstruction(InstructionType.DOM_REMOVE, {
                function: 'closeWindow',
                windowId: winId
            });
            
            return originalCloseWindow.call(wm, winId);
        };
        
        // Оборачиваем метод перемещения окна
        const originalFocusWindow = wm.focusWindow;
        wm.focusWindow = async (winId) => {
            await this.vm.executeInstruction(InstructionType.STYLE_UPDATE, {
                function: 'focusWindow',
                windowId: winId,
                operation: 'z-index'
            });
            
            return originalFocusWindow.call(wm, winId);
        };
        
        console.log('✓ Window Manager instrumented');
    }
    
    /**
     * Возвращает последние операции для отображения в UI.
     */
    getRecentOperations(count = 10) {
        return this.operationHistory.slice(-count);
    }
}

/**
 * ============================================================================
 * TELEMETRY VISUALIZER - Визуализация данных телеметрии
 * ============================================================================
 * 
 * Этот класс создаёт интерактивный интерфейс для просмотра данных,
 * собираемых виртуальной машиной. Это как приборная панель в автомобиле,
 * которая показывает скорость, обороты двигателя, температуру и так далее.
 */
class TelemetryVisualizer {
    constructor(vm, containerId) {
        this.vm = vm;
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            console.error(`Container ${containerId} not found`);
            return;
        }
        
        this.charts = {}; // Хранилище для графиков
        this.updateInterval = null;
        this.isVisible = true;
        
        this.initialize();
    }
    
    /**
     * Инициализирует визуализатор и создаёт UI-элементы.
     */
    initialize() {
        this.container.innerHTML = `
            <div class="telemetry-visualizer">
                <div class="telemetry-header">
                    <h2>📊 MicroISA Telemetry Dashboard</h2>
                    <div class="telemetry-controls">
                        <button id="telemetry-refresh">Refresh</button>
                        <button id="telemetry-export">Export Data</button>
                        <button id="telemetry-analyze">Analyze Hotspots</button>
                    </div>
                </div>
                
                <div class="telemetry-grid">
                    <!-- Панель статистики -->
                    <div class="telemetry-panel stats-panel">
                        <h3>System Statistics</h3>
                        <div id="stats-content"></div>
                    </div>
                    
                    <!-- Панель инструкций -->
                    <div class="telemetry-panel instructions-panel">
                        <h3>Instruction Breakdown</h3>
                        <canvas id="instructions-chart"></canvas>
                    </div>
                    
                    <!-- Панель производительности -->
                    <div class="telemetry-panel performance-panel">
                        <h3>Performance Timeline</h3>
                        <canvas id="performance-chart"></canvas>
                    </div>
                    
                    <!-- Панель горячих точек -->
                    <div class="telemetry-panel hotspots-panel">
                        <h3>Performance Hotspots</h3>
                        <div id="hotspots-content"></div>
                    </div>
                    
                    <!-- Панель недавних операций -->
                    <div class="telemetry-panel operations-panel">
                        <h3>Recent Operations</h3>
                        <div id="operations-content"></div>
                    </div>
                    
                    <!-- Панель рекомендаций -->
                    <div class="telemetry-panel recommendations-panel">
                        <h3>Optimization Recommendations</h3>
                        <div id="recommendations-content"></div>
                    </div>
                </div>
            </div>
        `;
        
        this.addStyles();
        this.attachEventListeners();
        this.startAutoUpdate();
        
        console.log('✓ Telemetry Visualizer initialized');
    }
    
    /**
     * Добавляет стили для визуализатора.
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .telemetry-visualizer {
                width: 100%;
                height: 100%;
                overflow: auto;
                background: rgba(10, 10, 12, 0.95);
                color: #e0e0e0;
                font-family: 'Courier New', monospace;
                padding: 20px;
            }
            
            .telemetry-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid #0f0;
            }
            
            .telemetry-header h2 {
                margin: 0;
                color: #0f0;
                font-size: 24px;
            }
            
            .telemetry-controls {
                display: flex;
                gap: 10px;
            }
            
            .telemetry-controls button {
                background: #222;
                color: #0f0;
                border: 1px solid #0f0;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-family: 'Courier New', monospace;
                transition: all 0.2s;
            }
            
            .telemetry-controls button:hover {
                background: #0f0;
                color: #000;
            }
            
            .telemetry-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 20px;
            }
            
            .telemetry-panel {
                background: rgba(20, 20, 22, 0.8);
                border: 1px solid #333;
                border-radius: 8px;
                padding: 15px;
                min-height: 200px;
            }
            
            .telemetry-panel h3 {
                margin: 0 0 15px 0;
                color: #0f0;
                font-size: 16px;
                border-bottom: 1px solid #333;
                padding-bottom: 8px;
            }
            
            .stat-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #222;
            }
            
            .stat-label {
                color: #888;
            }
            
            .stat-value {
                color: #0f0;
                font-weight: bold;
            }
            
            .hotspot-item {
                background: rgba(255, 0, 0, 0.1);
                border-left: 3px solid #f00;
                padding: 10px;
                margin-bottom: 10px;
                border-radius: 4px;
            }
            
            .hotspot-type {
                color: #ff0;
                font-weight: bold;
            }
            
            .hotspot-duration {
                color: #f00;
                font-size: 12px;
            }
            
            .operation-item {
                padding: 8px;
                margin-bottom: 5px;
                background: rgba(0, 255, 0, 0.05);
                border-left: 2px solid #0f0;
                font-size: 11px;
            }
            
            .operation-type {
                color: #0ff;
                font-weight: bold;
            }
            
            .operation-duration {
                color: #ff0;
                float: right;
            }
            
            .recommendation-item {
                background: rgba(255, 255, 0, 0.1);
                border-left: 3px solid #ff0;
                padding: 10px;
                margin-bottom: 10px;
                border-radius: 4px;
            }
            
            .recommendation-priority {
                color: #f00;
                font-weight: bold;
                text-transform: uppercase;
            }
            
            .recommendation-suggestion {
                color: #0f0;
                font-style: italic;
                margin-top: 5px;
            }
            
            canvas {
                width: 100%;
                height: 200px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 4px;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Подключает обработчики событий для кнопок управления.
     */
    attachEventListeners() {
        document.getElementById('telemetry-refresh')?.addEventListener('click', () => {
            this.update();
        });
        
        document.getElementById('telemetry-export')?.addEventListener('click', () => {
            this.exportData();
        });
        
        document.getElementById('telemetry-analyze')?.addEventListener('click', async () => {
            await this.analyzeAndDisplay();
        });
    }
    
    /**
     * Запускает автоматическое обновление данных каждую секунду.
     */
    startAutoUpdate() {
        this.update(); // Первое обновление сразу
        this.updateInterval = setInterval(() => {
            if (this.isVisible) {
                this.update();
            }
        }, 1000);
    }
    
    /**
     * Останавливает автоматическое обновление.
     */
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    /**
     * Обновляет все панели визуализатора.
     */
    async update() {
        await this.updateStats();
        await this.updateInstructionsChart();
        await this.updatePerformanceChart();
        await this.updateHotspots();
        await this.updateOperations();
        await this.updateRecommendations();
    }
    
    /**
     * Обновляет панель статистики.
     */
    async updateStats() {
        const stats = this.vm.getStats();
        const statsContent = document.getElementById('stats-content');
        
        if (!statsContent) return;
        
        // Вычисляем дополнительные метрики
        const avgInstructionsPerSecond = stats.totalInstructions / 
            ((performance.now() - (window.appStartTime || 0)) / 1000);
        
        statsContent.innerHTML = `
            <div class="stat-row">
                <span class="stat-label">Total Instructions:</span>
                <span class="stat-value">${stats.totalInstructions.toLocaleString()}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Unique Instruction Types:</span>
                <span class="stat-value">${Object.keys(stats.instructionsByType).length}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Avg Instructions/sec:</span>
                <span class="stat-value">${avgInstructionsPerSecond.toFixed(2)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Optimization Level:</span>
                <span class="stat-value">${stats.systemState.optimizationLevel}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Active Windows:</span>
                <span class="stat-value">${stats.systemState.windowCount}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Worker Threads:</span>
                <span class="stat-value">${stats.systemState.workerCount}</span>
            </div>
        `;
    }
    
    /**
     * Обновляет график распределения инструкций.
     */
    async updateInstructionsChart() {
        const canvas = document.getElementById('instructions-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const stats = this.vm.getStats();
        
        // Получаем топ-10 типов инструкций
        const entries = Object.entries(stats.instructionsByType)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        if (entries.length === 0) {
            ctx.fillStyle = '#888';
            ctx.font = '14px Courier New';
            ctx.fillText('No data yet...', 20, 100);
            return;
        }
        
        // Простая bar chart
        const maxCount = entries[0][1];
        const barHeight = 15;
        const barSpacing = 5;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        entries.forEach(([type, count], index) => {
            const y = index * (barHeight + barSpacing);
            const barWidth = (count / maxCount) * (canvas.width - 150);
            
            // Рисуем бар
            ctx.fillStyle = '#0f0';
            ctx.fillRect(0, y, barWidth, barHeight);
            
            // Подпись типа
            ctx.fillStyle = '#fff';
            ctx.font = '10px Courier New';
            ctx.fillText(type, barWidth + 5, y + 12);
            
            // Значение
            ctx.fillStyle = '#ff0';
            ctx.fillText(count.toString(), 5, y + 12);
        });
    }
    
    /**
     * Обновляет график производительности во времени.
     */
    async updatePerformanceChart() {
        const canvas = document.getElementById('performance-chart');
        if (!canvas || !window.microISAIntegration) return;
        
        const ctx = canvas.getContext('2d');
        const operations = window.microISAIntegration.getRecentOperations(50);
        
        if (operations.length === 0) {
            ctx.fillStyle = '#888';
            ctx.font = '14px Courier New';
            ctx.fillText('No operations yet...', 20, 100);
            return;
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Рисуем линию производительности
        const maxDuration = Math.max(...operations.map(op => op.duration || 0));
        const stepX = canvas.width / operations.length;
        
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        operations.forEach((op, index) => {
            const x = index * stepX;
            const y = canvas.height - ((op.duration || 0) / maxDuration) * canvas.height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Добавляем сетку
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const y = (canvas.height / 5) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }
    
    /**
     * Обновляет список горячих точек производительности.
     */
    async updateHotspots() {
        const hotspotsContent = document.getElementById('hotspots-content');
        if (!hotspotsContent) return;
        
        const hotspots = await this.vm.analyzeHotspots();
        
        if (Object.keys(hotspots).length === 0) {
            hotspotsContent.innerHTML = '<div style="color: #888;">No hotspots detected yet</div>';
            return;
        }
        
        let html = '';
        for (const [type, data] of Object.entries(hotspots)) {
            html += `
                <div class="hotspot-item">
                    <div class="hotspot-type">${type}</div>
                    <div class="hotspot-duration">
                        Avg: ${data.avgDuration.toFixed(2)}ms | 
                        Total: ${data.totalTime.toFixed(2)}ms | 
                        Count: ${data.count}
                    </div>
                </div>
            `;
        }
        
        hotspotsContent.innerHTML = html;
    }
    
    /**
     * Обновляет список недавних операций.
     */
    async updateOperations() {
        const operationsContent = document.getElementById('operations-content');
        if (!operationsContent || !window.microISAIntegration) return;
        
        const operations = window.microISAIntegration.getRecentOperations(15);
        
        if (operations.length === 0) {
            operationsContent.innerHTML = '<div style="color: #888;">No operations yet</div>';
            return;
        }
        
        let html = '';
        operations.reverse().forEach(op => {
            const duration = op.duration ? op.duration.toFixed(2) : '?';
            html += `
                <div class="operation-item">
                    <span class="operation-type">${op.type}</span>
                    <span class="operation-duration">${duration}ms</span>
                    <div style="font-size: 9px; color: #666; margin-top: 2px;">
                        ${new Date(op.timestamp).toLocaleTimeString()}
                    </div>
                </div>
            `;
        });
        
        operationsContent.innerHTML = html;
    }
    
    /**
     * Обновляет рекомендации по оптимизации.
     */
    async updateRecommendations() {
        const recommendationsContent = document.getElementById('recommendations-content');
        if (!recommendationsContent) return;
        
        const report = await this.vm.generatePerformanceReport();
        const recommendations = report.recommendations;
        
        if (recommendations.length === 0) {
            recommendationsContent.innerHTML = '<div style="color: #0f0;">✓ System is optimized</div>';
            return;
        }
        
        let html = '';
        recommendations.forEach(rec => {
            html += `
                <div class="recommendation-item">
                    <div class="recommendation-priority">[${rec.priority}]</div>
                    <div style="color: #0ff; margin: 5px 0;">${rec.type}</div>
                    <div style="color: #888; font-size: 11px;">${rec.reason}</div>
                    <div class="recommendation-suggestion">${rec.suggestion}</div>
                </div>
            `;
        });
        
        recommendationsContent.innerHTML = html;
    }
    
    /**
     * Выполняет глубокий анализ и отображает результаты.
     */
    async analyzeAndDisplay() {
        console.log('🔍 Performing deep analysis...');
        
        const report = await this.vm.generatePerformanceReport();
        
        console.log('=== PERFORMANCE REPORT ===');
        console.log('Summary:', report.summary);
        console.log('Most Frequent:', report.mostFrequent);
        console.log('Slowest:', report.slowest);
        console.log('Recommendations:', report.recommendations);
        
        // Обновляем UI
        await this.update();
        
        alert('Analysis complete! Check console for detailed report.');
    }
    
    /**
     * Экспортирует собранные данные в JSON.
     */
    async exportData() {
        const report = await this.vm.generatePerformanceReport();
        const stats = this.vm.getStats();
        
        const exportData = {
            timestamp: new Date().toISOString(),
            report: report,
            stats: stats,
            operations: window.microISAIntegration ? 
                window.microISAIntegration.getRecentOperations(100) : []
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `microisa-telemetry-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        console.log('✓ Telemetry data exported');
    }
    
    /**
     * Уничтожает визуализатор и очищает ресурсы.
     */
    destroy() {
        this.stopAutoUpdate();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MicroISAIntegration,
        TelemetryVisualizer
    };
}

// Для браузера
if (typeof window !== 'undefined') {
    window.MicroISAIntegration = MicroISAIntegration;
    window.TelemetryVisualizer = TelemetryVisualizer;
}
