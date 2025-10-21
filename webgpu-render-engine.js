/**
 * ============================================================================
 * WEBGPU RENDER ENGINE - STAGE 2
 * ============================================================================
 * 
 * Этот модуль представляет собой революционную систему GPU-ускорения для
 * веб-приложений. Вместо того чтобы полагаться исключительно на CPU для
 * всех визуальных эффектов, мы используем специализированное графическое
 * оборудование, которое может обрабатывать миллионы операций параллельно.
 * 
 * Философия архитектуры:
 * 
 * Представьте традиционный подход к рендерингу как художника, который
 * рисует картину пиксель за пикселем последовательно. Это работает, но
 * медленно. GPU-подход похож на то, как если бы у вас была армия художников,
 * каждый из которых рисует свой пиксель одновременно. Картина завершается
 * в тысячи раз быстрее.
 * 
 * Ключевые компоненты:
 * 
 * 1. WebGPUContext - Управляет инициализацией GPU и ресурсами
 * 2. ComputeShader - Выполняет вычисления на GPU (частицы, физика, данные)
 * 3. RenderPipeline - Рисует результаты на экране
 * 4. ProceduralBackground - Живой динамический фон
 * 5. BlurEffect - GPU-ускоренное размытие для glassmorphism эффектов
 * 
 * Интеграция с MicroISA:
 * 
 * Каждая GPU-операция регистрируется как инструкция в нашей виртуальной
 * машине. Это позволяет нам измерять производительность, сравнивать
 * GPU vs CPU подходы, и принимать интеллектуальные решения об оптимизации.
 */

/**
 * Класс WebGPUContext управляет жизненным циклом GPU-ресурсов.
 * 
 * Это центральная точка для всех GPU-операций. Думайте о нём как о менеджере,
 * который следит за тем, чтобы у каждого процесса были необходимые ресурсы
 * (память на GPU, текстуры, буферы), и чтобы эти ресурсы правильно очищались
 * после использования, предотвращая утечки памяти.
 * 
 * Почему это важно: GPU имеет ограниченную память, и если мы будем создавать
 * ресурсы без их освобождения, мы быстро исчерпаем доступную память и
 * приложение упадёт. Централизованное управление ресурсами предотвращает это.
 */
class WebGPUContext {
    constructor() {
        // GPU-адаптер - это абстракция физической видеокарты
        // Можно думать о нём как о "драйвере" для GPU
        this.adapter = null;
        
        // Device - это виртуальное представление GPU для нашего приложения
        // Через него мы создаём все ресурсы и выполняем команды
        this.device = null;
        
        // Context связывает GPU с canvas элементом на странице
        // Это "окно", через которое GPU рисует на экран
        this.context = null;
        
        // Canvas элемент, на котором мы будем рисовать
        this.canvas = null;
        
        // Формат текстуры, который будет использоваться для рендеринга
        // Это определяет, как пиксели кодируются в памяти
        this.preferredFormat = null;
        
        // Флаг готовности - true когда всё инициализировано
        this.isReady = false;
        
        // Статистика для телеметрии
        this.stats = {
            totalComputePasses: 0,    // Сколько вычислительных проходов выполнено
            totalRenderPasses: 0,     // Сколько рендер-проходов выполнено
            gpuMemoryUsed: 0,         // Сколько GPU-памяти используется
            lastFrameTime: 0          // Время последнего кадра
        };
    }
    
    /**
     * Инициализирует WebGPU и подготавливает все необходимые ресурсы.
     * 
     * Это асинхронный процесс, потому что браузер должен запросить доступ
     * к GPU, что может занять время. Это похоже на то, как вы просите
     * разрешение использовать камеру или микрофон - пользователь должен
     * дать согласие, и система должна выделить ресурсы.
     * 
     * @param {HTMLCanvasElement} canvas - Элемент canvas для рендеринга
     * @returns {Promise<boolean>} - true если инициализация успешна
     */
    async initialize(canvas) {
        console.log('🎨 Initializing WebGPU Render Engine...');
        
        this.canvas = canvas;
        
        try {
            // Шаг 1: Проверяем, поддерживает ли браузер WebGPU
            // Не все браузеры поддерживают это API, особенно старые версии
            if (!navigator.gpu) {
                console.warn('❌ WebGPU is not supported in this browser');
                return false;
            }
            
            // Шаг 2: Запрашиваем адаптер GPU
            // Это асинхронная операция, потому что браузер должен
            // обнаружить доступные GPU и выбрать подходящий
            this.adapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance' // Предпочитаем дискретную GPU
            });
            
            if (!this.adapter) {
                console.warn('❌ Failed to get GPU adapter');
                return false;
            }
            
            console.log('✓ GPU adapter acquired:', this.adapter);
            
            // Шаг 3: Запрашиваем устройство
            // Устройство - это наш интерфейс для взаимодействия с GPU
            // Мы можем запросить определённые возможности (features) и лимиты
            this.device = await this.adapter.requestDevice({
                // Здесь мы могли бы запросить дополнительные возможности
                // Например, поддержку текстур определённых форматов
                // или увеличенные лимиты для буферов
            });
            
            if (!this.device) {
                console.warn('❌ Failed to get GPU device');
                return false;
            }
            
            console.log('✓ GPU device acquired');
            
            // Шаг 4: Получаем контекст canvas для WebGPU
            // Это связывает наш canvas элемент с GPU
            this.context = this.canvas.getContext('webgpu');
            
            if (!this.context) {
                console.warn('❌ Failed to get WebGPU context');
                return false;
            }
            
            // Шаг 5: Определяем предпочтительный формат текстуры
            // Разные платформы могут предпочитать разные форматы
            // Например, некоторые используют BGRA вместо RGBA
            this.preferredFormat = navigator.gpu.getPreferredCanvasFormat();
            
            // Шаг 6: Настраиваем контекст
            // Это говорит GPU, как мы будем использовать canvas
            this.context.configure({
                device: this.device,
                format: this.preferredFormat,
                // alphaMode определяет, как обрабатывается прозрачность
                // 'premultiplied' означает, что цвета умножены на альфа-канал
                // Это стандартный режим для композитинга в веб
                alphaMode: 'premultiplied'
            });
            
            console.log('✓ WebGPU context configured');
            console.log('  Format:', this.preferredFormat);
            console.log('  Canvas size:', canvas.width, 'x', canvas.height);
            
            // Устанавливаем обработчик ошибок устройства
            // Это критически важно для отладки - GPU-ошибки могут быть
            // сложными для диагностики без правильного логирования
            this.device.addEventListener('uncapturederror', (event) => {
                console.error('❌ WebGPU uncaptured error:', event.error);
            });
            
            this.isReady = true;
            console.log('✓ WebGPU Render Engine ready!');
            
            return true;
            
        } catch (error) {
            console.error('❌ WebGPU initialization failed:', error);
            return false;
        }
    }
    
    /**
     * Создаёт буфер на GPU для хранения данных.
     * 
     * Буфер - это блок памяти на GPU. Представьте его как массив в оперативной
     * памяти, но находящийся на видеокарте. Мы можем записывать в него данные
     * с CPU и читать обратно, или использовать его как источник данных для
     * GPU-программ (шейдеров).
     * 
     * @param {ArrayBuffer|TypedArray} data - Данные для загрузки в буфер
     * @param {number} usage - Флаги использования буфера
     * @returns {GPUBuffer} - Созданный буфер
     */
    createBuffer(data, usage) {
        // Создаём буфер нужного размера с указанным использованием
        const buffer = this.device.createBuffer({
            size: data.byteLength,
            usage: usage,
            // mappedAtCreation позволяет записать данные сразу при создании
            // Это эффективнее, чем создавать буфер и потом отдельно писать в него
            mappedAtCreation: true
        });
        
        // Получаем доступ к памяти буфера для записи
        const arrayBuffer = buffer.getMappedRange();
        
        // Копируем данные из нашего JavaScript массива в GPU-память
        // Мы используем правильный TypedArray в зависимости от типа данных
        if (data instanceof Float32Array) {
            new Float32Array(arrayBuffer).set(data);
        } else if (data instanceof Uint32Array) {
            new Uint32Array(arrayBuffer).set(data);
        } else {
            new Uint8Array(arrayBuffer).set(new Uint8Array(data));
        }
        
        // Отключаем mapping - теперь буфер доступен для GPU
        buffer.unmap();
        
        // Обновляем статистику использования памяти
        this.stats.gpuMemoryUsed += data.byteLength;
        
        return buffer;
    }
    
    /**
     * Создаёт текстуру на GPU.
     * 
     * Текстура - это двумерный (или трёхмерный) массив данных на GPU.
     * Чаще всего используется для хранения изображений, но может хранить
     * любые данные - например, результаты вычислений или карты высот для
     * процедурной генерации.
     * 
     * @param {number} width - Ширина текстуры
     * @param {number} height - Высота текстуры
     * @param {string} format - Формат пикселей
     * @param {number} usage - Флаги использования
     * @returns {GPUTexture} - Созданная текстура
     */
    createTexture(width, height, format = this.preferredFormat, usage) {
        const texture = this.device.createTexture({
            size: { width, height, depthOrArrayLayers: 1 },
            format: format,
            usage: usage
        });
        
        // Примерная оценка используемой памяти
        // Для RGBA8 каждый пиксель занимает 4 байта
        const bytesPerPixel = 4;
        this.stats.gpuMemoryUsed += width * height * bytesPerPixel;
        
        return texture;
    }
    
    /**
     * Начинает новый кадр рендеринга.
     * 
     * Это создаёт command encoder - объект, который записывает команды для GPU.
     * Думайте о нём как о списке инструкций, которые мы хотим, чтобы GPU выполнил.
     * Мы записываем все команды, а потом отправляем их на выполнение одним батчем.
     * Это гораздо эффективнее, чем отправлять каждую команду отдельно.
     * 
     * @returns {GPUCommandEncoder} - Энкодер команд
     */
    beginFrame() {
        this.stats.lastFrameTime = performance.now();
        
        return this.device.createCommandEncoder({
            label: 'Frame Command Encoder'
        });
    }
    
    /**
     * Завершает кадр и отправляет команды на GPU для выполнения.
     * 
     * Это критический момент - мы берём все команды, которые записали,
     * и отправляем их на GPU. GPU выполнит их все последовательно
     * (или параллельно, если это возможно), и когда закончит, результат
     * появится на экране.
     * 
     * @param {GPUCommandEncoder} encoder - Энкодер с записанными командами
     */
    submitFrame(encoder) {
        // Финализируем энкодер - преобразуем записанные команды в command buffer
        const commandBuffer = encoder.finish();
        
        // Отправляем command buffer в очередь GPU на выполнение
        // Очередь (queue) - это как конвейер на заводе, команды выполняются
        // в том порядке, в котором были отправлены
        this.device.queue.submit([commandBuffer]);
        
        // Обновляем статистику
        const frameTime = performance.now() - this.stats.lastFrameTime;
        
        // Логируем, если кадр занял слишком много времени
        // 16.67мс = 60 FPS, если мы дольше, значит падаем ниже 60 FPS
        if (frameTime > 16.67) {
            console.warn(`⚠️ Slow frame: ${frameTime.toFixed(2)}ms`);
        }
    }
    
    /**
     * Изменяет размер canvas и обновляет GPU-ресурсы.
     * 
     * Когда размер окна браузера меняется, нам нужно обновить canvas
     * и пересоздать некоторые GPU-ресурсы. Это важно для того, чтобы
     * рендеринг всегда соответствовал актуальному размеру окна.
     * 
     * @param {number} width - Новая ширина
     * @param {number} height - Новая высота
     */
    resize(width, height) {
        // Обновляем размер canvas
        this.canvas.width = width;
        this.canvas.height = height;
        
        console.log(`🔄 Canvas resized to ${width}x${height}`);
        
        // Текстуры, зависящие от размера canvas, нужно пересоздать
        // Это будет сделано в компонентах, которые используют эти текстуры
    }
    
    /**
     * Возвращает текущую статистику GPU для телеметрии.
     */
    getStats() {
        return {
            ...this.stats,
            isReady: this.isReady,
            deviceLimits: this.device ? {
                maxBufferSize: this.device.limits.maxBufferSize,
                maxTextureSize: this.device.limits.maxTextureDimension2D
            } : null
        };
    }
    
    /**
     * Очищает все GPU-ресурсы.
     * 
     * Это критически важно для предотвращения утечек памяти.
     * Когда мы закончили работу с GPU, мы должны явно освободить
     * все ресурсы, которые создали. В противном случае они будут
     * продолжать занимать драгоценную GPU-память.
     */
    destroy() {
        if (this.device) {
            this.device.destroy();
            this.device = null;
        }
        
        this.adapter = null;
        this.context = null;
        this.isReady = false;
        
        console.log('✓ WebGPU context destroyed');
    }
}

/**
 * ============================================================================
 * PROCEDURAL BACKGROUND GENERATOR
 * ============================================================================
 * 
 * Этот класс создаёт живой, динамический фон, который реагирует на действия
 * пользователя. Вместо статичного градиента мы генерируем сложные визуальные
 * эффекты прямо на GPU.
 * 
 * Концепция: Мы используем compute shader для симуляции частиц или волн.
 * Каждый пиксель фона вычисляется независимо на GPU, что позволяет
 * создавать сложные эффекты без нагрузки на CPU.
 * 
 * Примеры эффектов:
 * - Волны, расходящиеся от точки клика
 * - Частицы, притягивающиеся к курсору
 * - Процедурный шум для органичных паттернов
 * - Реактивные цветовые переходы
 */
class ProceduralBackground {
    constructor(gpuContext, microISAVM = null) {
        this.gpu = gpuContext;
        this.vm = microISAVM; // Ссылка на виртуальную машину для телеметрии
        
        // Параметры симуляции
        this.params = {
            time: 0,              // Время для анимации
            mouseX: 0.5,          // Позиция мыши (нормализованная 0-1)
            mouseY: 0.5,
            clickX: 0.5,          // Последний клик
            clickY: 0.5,
            waveIntensity: 0,     // Интенсивность волны от клика
            colorShift: 0         // Сдвиг цвета для разнообразия
        };
        
        // GPU-ресурсы
        this.renderPipeline = null;
        this.uniformBuffer = null;
        this.bindGroup = null;
        
        // Флаг инициализации
        this.initialized = false;
    }
    
    /**
     * Инициализирует рендер-пайплайн для процедурного фона.
     * 
     * Пайплайн - это как конвейер на заводе. Мы определяем последовательность
     * операций, которые GPU выполнит для каждого пикселя. В случае фона
     * это просто vertex shader (определяет положение вершин прямоугольника,
     * покрывающего весь экран) и fragment shader (вычисляет цвет каждого пикселя).
     */
    async initialize() {
        console.log('🎨 Initializing Procedural Background...');
        
        try {
            // Создаём uniform buffer для параметров симуляции
            // Uniform buffer - это буфер с данными, которые одинаковы для всех
            // пикселей в одном кадре. Например, время или позиция мыши.
            // Размер должен быть кратен 16 байтам (требование WebGPU)
            const uniformBufferSize = 64; // 16 floats = 64 bytes
            
            this.uniformBuffer = this.gpu.createBuffer(
                new Float32Array(uniformBufferSize / 4),
                GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            );
            
            // Создаём shader module
            // Шейдер - это программа, которая выполняется на GPU
            // Написана на WGSL (WebGPU Shading Language)
            const shaderModule = this.gpu.device.createShaderModule({
                label: 'Procedural Background Shader',
                code: this.getShaderCode()
            });
            
            // Создаём render pipeline
            // Это определяет весь процесс рендеринга от начала до конца
            this.renderPipeline = this.gpu.device.createRenderPipeline({
                label: 'Procedural Background Pipeline',
                layout: 'auto', // Автоматически определить layout из шейдера
                
                // Vertex stage - обрабатывает вершины
                vertex: {
                    module: shaderModule,
                    entryPoint: 'vertexMain' // Имя функции в шейдере
                },
                
                // Fragment stage - обрабатывает пиксели
                fragment: {
                    module: shaderModule,
                    entryPoint: 'fragmentMain',
                    targets: [{
                        format: this.gpu.preferredFormat,
                        // Включаем блендинг для плавных переходов
                        blend: {
                            color: {
                                srcFactor: 'src-alpha',
                                dstFactor: 'one-minus-src-alpha',
                                operation: 'add'
                            },
                            alpha: {
                                srcFactor: 'one',
                                dstFactor: 'one-minus-src-alpha',
                                operation: 'add'
                            }
                        }
                    }]
                },
                
                // Определяем как рисовать примитивы
                primitive: {
                    topology: 'triangle-list', // Рисуем треугольниками
                    cullMode: 'none' // Не отбрасываем задние грани
                }
            });
            
            // Создаём bind group - связывает uniform buffer с шейдером
            // Это как подключение данных к входам программы
            this.bindGroup = this.gpu.device.createBindGroup({
                label: 'Background Bind Group',
                layout: this.renderPipeline.getBindGroupLayout(0),
                entries: [{
                    binding: 0, // Соответствует @binding(0) в шейдере
                    resource: {
                        buffer: this.uniformBuffer
                    }
                }]
            });
            
            this.initialized = true;
            console.log('✓ Procedural Background initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Procedural Background:', error);
        }
    }
    
    /**
     * Возвращает код шейдера для процедурного фона.
     * 
     * Это WGSL код - язык шейдеров для WebGPU. Он похож на C, но специально
     * разработан для параллельных вычислений на GPU. Каждая функция выполняется
     * тысячи раз параллельно - по одному разу для каждого пикселя или вершины.
     */
    getShaderCode() {
        return `
            // Структура для uniform-данных (параметров, которые одинаковы для всех пикселей)
            struct Uniforms {
                time: f32,          // Текущее время для анимации
                mouseX: f32,        // Позиция курсора X (0-1)
                mouseY: f32,        // Позиция курсора Y (0-1)
                clickX: f32,        // Позиция последнего клика X
                clickY: f32,        // Позиция последнего клика Y
                waveIntensity: f32, // Интенсивность волны от клика
                colorShift: f32,    // Сдвиг цветовой схемы
                padding: f32        // Выравнивание до 16 байт
            };
            
            // Декларируем uniform buffer, доступный в шейдере
            @group(0) @binding(0) var<uniform> uniforms: Uniforms;
            
            // Структура для данных, передаваемых от vertex к fragment shader
            struct VertexOutput {
                @builtin(position) position: vec4<f32>,  // Позиция на экране
                @location(0) uv: vec2<f32>               // UV-координаты (0-1)
            };
            
            /**
             * Vertex Shader - выполняется для каждой вершины
             * 
             * Мы рисуем полноэкранный прямоугольник (квад) из двух треугольников.
             * Это стандартная техника для пост-обработки и процедурной генерации.
             * 
             * @param vertex_index - индекс вершины (0-5 для двух треугольников)
             * @return VertexOutput с позицией и UV-координатами
             */
            @vertex
            fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
                var output: VertexOutput;
                
                // Создаём позиции для полноэкранного квада
                // Два треугольника покрывают весь экран от -1 до 1
                let pos = array<vec2<f32>, 6>(
                    vec2<f32>(-1.0, -1.0),  // Нижний левый
                    vec2<f32>( 1.0, -1.0),  // Нижний правый
                    vec2<f32>(-1.0,  1.0),  // Верхний левый
                    vec2<f32>(-1.0,  1.0),  // Верхний левый (второй треугольник)
                    vec2<f32>( 1.0, -1.0),  // Нижний правый
                    vec2<f32>( 1.0,  1.0)   // Верхний правый
                );
                
                let p = pos[vertexIndex];
                output.position = vec4<f32>(p, 0.0, 1.0);
                
                // UV координаты от 0 до 1
                output.uv = (p + 1.0) * 0.5;
                
                return output;
            }
            
            /**
             * Простая hash-функция для генерации псевдослучайных чисел.
             * Используется для создания шума и вариаций.
             */
            fn hash(p: vec2<f32>) -> f32 {
                let h = dot(p, vec2<f32>(127.1, 311.7));
                return fract(sin(h) * 43758.5453123);
            }
            
            /**
             * Генерирует плавный шум (noise) для органичных паттернов.
             * Это основа для многих процедурных эффектов.
             */
            fn noise(p: vec2<f32>) -> f32 {
                let i = floor(p);
                let f = fract(p);
                
                // Плавная интерполяция (smoothstep)
                let u = f * f * (3.0 - 2.0 * f);
                
                // Билинейная интерполяция между углами ячейки
                return mix(
                    mix(hash(i + vec2<f32>(0.0, 0.0)), 
                        hash(i + vec2<f32>(1.0, 0.0)), u.x),
                    mix(hash(i + vec2<f32>(0.0, 1.0)), 
                        hash(i + vec2<f32>(1.0, 1.0)), u.x),
                    u.y
                );
            }
            
            /**
             * Fragment Shader - выполняется для каждого пикселя
             * 
             * Это сердце процедурной генерации. Мы вычисляем цвет каждого
             * пикселя на основе его позиции, времени и интерактивных параметров.
             * 
             * @param input - данные от vertex shader
             * @return цвет пикселя в формате RGBA
             */
            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                let uv = input.uv;
                
                // Базовый градиент, похожий на оригинальный macOS фон
                // Используем UV-координаты для создания плавного перехода
                let gradientColor1 = vec3<f32>(0.65, 0.16, 0.96); // Фиолетовый
                let gradientColor2 = vec3<f32>(0.34, 0.14, 0.84); // Тёмно-синий
                let gradientColor3 = vec3<f32>(0.04, 0.15, 0.46); // Глубокий синий
                let gradientColor4 = vec3<f32>(0.11, 0.44, 0.61); // Циан
                
                // Создаём многослойный градиент с использованием UV-координат
                var baseColor = mix(
                    mix(gradientColor1, gradientColor2, uv.x),
                    mix(gradientColor3, gradientColor4, uv.x),
                    uv.y
                );
                
                // Добавляем анимированный шум для живости
                let noiseScale = 3.0;
                let noiseSpeed = 0.3;
                let noiseValue = noise(uv * noiseScale + uniforms.time * noiseSpeed);
                
                // Применяем шум к цвету
                baseColor += vec3<f32>(noiseValue * 0.05);
                
                // Добавляем эффект волны от клика
                if (uniforms.waveIntensity > 0.01) {
                    // Расстояние от точки клика
                    let clickPos = vec2<f32>(uniforms.clickX, uniforms.clickY);
                    let dist = distance(uv, clickPos);
                    
                    // Волна расходится от точки клика
                    let wavePhase = dist * 10.0 - uniforms.time * 5.0;
                    let wave = sin(wavePhase) * 0.5 + 0.5;
                    
                    // Затухание волны с расстоянием и временем
                    let attenuation = exp(-dist * 3.0) * uniforms.waveIntensity;
                    
                    // Добавляем волну к цвету
                    baseColor += vec3<f32>(wave * attenuation * 0.3);
                }
                
                // Добавляем свечение вокруг курсора
                let mousePos = vec2<f32>(uniforms.mouseX, uniforms.mouseY);
                let mouseDist = distance(uv, mousePos);
                let mouseGlow = exp(-mouseDist * 8.0) * 0.2;
                baseColor += vec3<f32>(mouseGlow);
                
                // Применяем цветовой сдвиг для разнообразия
                baseColor = mix(
                    baseColor,
                    baseColor.zxy, // Циклический сдвиг RGB каналов
                    sin(uniforms.colorShift * 0.5) * 0.5 + 0.5
                );
                
                // Возвращаем финальный цвет с полной непрозрачностью
                return vec4<f32>(baseColor, 1.0);
            }
        `;
    }
    
    /**
     * Обновляет параметры симуляции перед рендерингом.
     * 
     * @param {number} deltaTime - Время с последнего кадра в секундах
     */
    update(deltaTime) {
        // Обновляем время для анимации
        this.params.time += deltaTime;
        
        // Затухание интенсивности волны
        this.params.waveIntensity *= 0.95;
        
        // Медленное изменение цветового сдвига
        this.params.colorShift += deltaTime * 0.5;
        
        // Записываем обновлённые параметры в uniform buffer
        // Это копирует данные из JavaScript в GPU-память
        const uniformData = new Float32Array([
            this.params.time,
            this.params.mouseX,
            this.params.mouseY,
            this.params.clickX,
            this.params.clickY,
            this.params.waveIntensity,
            this.params.colorShift,
            0 // padding
        ]);
        
        // writeBuffer - эффективный способ обновить буфер
        // Это асинхронная операция, но не блокирующая
        this.gpu.device.queue.writeBuffer(
            this.uniformBuffer,
            0,
            uniformData.buffer,
            uniformData.byteOffset,
            uniformData.byteLength
        );
    }
    
    /**
     * Обрабатывает движение мыши для интерактивных эффектов.
     * 
     * @param {number} x - Координата X в пикселях
     * @param {number} y - Координата Y в пикселях
     */
    onMouseMove(x, y) {
        // Нормализуем координаты от 0 до 1
        this.params.mouseX = x / this.gpu.canvas.width;
        this.params.mouseY = 1.0 - (y / this.gpu.canvas.height); // Инвертируем Y
    }
    
    /**
     * Обрабатывает клики для создания волнового эффекта.
     * 
     * @param {number} x - Координата X в пикселях
     * @param {number} y - Координата Y в пикселях
     */
    onClick(x, y) {
        // Сохраняем позицию клика
        this.params.clickX = x / this.gpu.canvas.width;
        this.params.clickY = 1.0 - (y / this.gpu.canvas.height);
        
        // Запускаем волну с полной интенсивностью
        this.params.waveIntensity = 1.0;
        
        console.log(`🌊 Wave triggered at (${this.params.clickX.toFixed(2)}, ${this.params.clickY.toFixed(2)})`);
    }
    
    /**
     * Рендерит процедурный фон.
     * 
     * @param {GPUCommandEncoder} encoder - Command encoder текущего кадра
     */
    render(encoder) {
        if (!this.initialized) return;
        
        // Регистрируем GPU-операцию в MicroISA для телеметрии
        if (this.vm) {
            this.vm.executeInstruction(
                window.MicroISA.InstructionType.PAINT,
                { operation: 'procedural_background' }
            );
        }
        
        // Получаем текущую текстуру canvas для рендеринга
        const textureView = this.gpu.context.getCurrentTexture().createView();
        
        // Начинаем render pass
        // Render pass - это последовательность команд рисования
        const renderPass = encoder.beginRenderPass({
            label: 'Background Render Pass',
            colorAttachments: [{
                view: textureView,
                // loadOp определяет, что делать с существующим содержимым
                // 'clear' очищает текстуру заданным цветом
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                loadOp: 'clear',
                // storeOp определяет, что делать с результатом
                // 'store' сохраняет результат в текстуру
                storeOp: 'store'
            }]
        });
        
        // Устанавливаем пайплайн для рендеринга
        renderPass.setPipeline(this.renderPipeline);
        
        // Привязываем uniform buffer
        renderPass.setBindGroup(0, this.bindGroup);
        
        // Рисуем 6 вершин (два треугольника для полноэкранного квада)
        renderPass.draw(6, 1, 0, 0);
        
        // Завершаем render pass
        renderPass.end();
        
        // Обновляем статистику
        this.gpu.stats.totalRenderPasses++;
    }
}

/**
 * Экспорт классов для использования в других модулях
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        WebGPUContext,
        ProceduralBackground
    };
}

// Для использования в браузере
if (typeof window !== 'undefined') {
    window.WebGPURenderEngine = {
        WebGPUContext,
        ProceduralBackground
    };
}
