/**
 * ============================================================================
 * GPU-ACCELERATED BLUR SYSTEM
 * ============================================================================
 * 
 * Этот модуль реализует высокопроизводительное размытие на GPU для создания
 * эффектов glassmorphism (матового стекла), характерных для macOS.
 * 
 * Проблема с CSS backdrop-filter:
 * 
 * Браузерный backdrop-filter работает, но создаёт значительную нагрузку,
 * особенно когда у вас много полупрозрачных элементов с размытием.
 * Браузер должен пересчитывать размытие каждый кадр для каждого элемента,
 * что быстро становится узким местом производительности.
 * 
 * Наше решение:
 * 
 * Мы реализуем двухпроходной Gaussian blur на GPU. Сначала размываем
 * горизонтально, затем вертикально. Это называется "separable blur" и
 * даёт качественное размытие с минимальными вычислениями. Вместо N×N
 * сэмплов для каждого пикселя, мы делаем N+N сэмплов, что гораздо быстрее.
 * 
 * Философия:
 * 
 * Представьте, что вам нужно размыть фотографию. Наивный подход - для
 * каждого пикселя взять все окружающие пиксели в радиусе R и усреднить.
 * Если радиус 10 пикселей, это 20×20 = 400 пикселей для каждого пикселя
 * изображения. Для изображения 1920×1080 это миллиарды операций!
 * 
 * Умный подход (separable blur) использует математическое свойство
 * Gaussian blur - его можно разделить на два одномерных прохода.
 * Сначала размываем только горизонтально (20 сэмплов на пиксель), сохраняем
 * результат. Потом размываем результат вертикально (ещё 20 сэмплов).
 * Итого 40 сэмплов вместо 400 - в 10 раз быстрее!
 */

class GPUBlurEffect {
    constructor(gpuContext, microISAVM = null) {
        this.gpu = gpuContext;
        this.vm = microISAVM;
        
        // Параметры размытия
        this.params = {
            radius: 15,           // Радиус размытия в пикселях
            strength: 1.0,        // Интенсивность эффекта (0-1)
            tintColor: [1, 1, 1], // Цветовой оттенок (RGB, 0-1)
            saturation: 1.1       // Насыщенность цвета
        };
        
        // GPU-ресурсы
        this.horizontalPipeline = null;  // Пайплайн для горизонтального размытия
        this.verticalPipeline = null;    // Пайплайн для вертикального размытия
        this.uniformBuffer = null;       // Буфер с параметрами
        this.tempTexture = null;         // Промежуточная текстура
        this.sampler = null;             // Семплер для чтения текстур
        this.bindGroupHorizontal = null; // Bind group для первого прохода
        this.bindGroupVertical = null;   // Bind group для второго прохода
        
        this.initialized = false;
    }
    
    /**
     * Инициализирует систему размытия.
     * 
     * Мы создаём два отдельных пайплайна - один для горизонтального размытия,
     * другой для вертикального. Они используют один и тот же shader code,
     * но с разными параметрами direction.
     */
    async initialize() {
        console.log('✨ Initializing GPU Blur Effect...');
        
        try {
            // Создаём uniform buffer для параметров
            const uniformBufferSize = 48; // 12 floats * 4 bytes
            this.uniformBuffer = this.gpu.createBuffer(
                new Float32Array(uniformBufferSize / 4),
                GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            );
            
            // Создаём sampler - объект, который определяет, как читать текстуры
            // linear filtering даёт плавную интерполяцию между пикселями
            // clamp-to-edge предотвращает артефакты на краях
            this.sampler = this.gpu.device.createSampler({
                magFilter: 'linear',  // Фильтр при увеличении
                minFilter: 'linear',  // Фильтр при уменьшении
                addressModeU: 'clamp-to-edge', // Режим адресации по U (горизонталь)
                addressModeV: 'clamp-to-edge'  // Режим адресации по V (вертикаль)
            });
            
            // Создаём промежуточную текстуру для хранения результата первого прохода
            // Размер равен размеру canvas
            this.tempTexture = this.gpu.createTexture(
                this.gpu.canvas.width,
                this.gpu.canvas.height,
                this.gpu.preferredFormat,
                GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
            );
            
            // Создаём shader module для размытия
            const blurShaderModule = this.gpu.device.createShaderModule({
                label: 'Blur Shader',
                code: this.getBlurShaderCode()
            });
            
            // Создаём пайплайн для горизонтального размытия
            this.horizontalPipeline = this.gpu.device.createRenderPipeline({
                label: 'Horizontal Blur Pipeline',
                layout: 'auto',
                vertex: {
                    module: blurShaderModule,
                    entryPoint: 'vertexMain'
                },
                fragment: {
                    module: blurShaderModule,
                    entryPoint: 'fragmentMain',
                    targets: [{ format: this.gpu.preferredFormat }]
                },
                primitive: {
                    topology: 'triangle-list',
                    cullMode: 'none'
                }
            });
            
            // Пайплайн для вертикального размытия идентичен горизонтальному
            // Разница только в параметрах, передаваемых через uniform buffer
            this.verticalPipeline = this.gpu.device.createRenderPipeline({
                label: 'Vertical Blur Pipeline',
                layout: 'auto',
                vertex: {
                    module: blurShaderModule,
                    entryPoint: 'vertexMain'
                },
                fragment: {
                    module: blurShaderModule,
                    entryPoint: 'fragmentMain',
                    targets: [{ format: this.gpu.preferredFormat }]
                },
                primitive: {
                    topology: 'triangle-list',
                    cullMode: 'none'
                }
            });
            
            this.initialized = true;
            console.log('✓ GPU Blur Effect initialized');
            console.log('  Blur radius:', this.params.radius, 'pixels');
            console.log('  Temp texture:', this.gpu.canvas.width, 'x', this.gpu.canvas.height);
            
        } catch (error) {
            console.error('❌ Failed to initialize GPU Blur Effect:', error);
        }
    }
    
    /**
     * Возвращает WGSL код для шейдера размытия.
     * 
     * Это реализация separable Gaussian blur. Мы используем предвычисленные
     * веса Gaussian функции для получения плавного, естественного размытия.
     */
    getBlurShaderCode() {
        return `
            // Uniform-данные для размытия
            struct BlurUniforms {
                direction: vec2<f32>,   // Направление размытия (1,0) или (0,1)
                radius: f32,            // Радиус размытия
                strength: f32,          // Интенсивность эффекта
                tintColor: vec3<f32>,   // Цветовой оттенок
                saturation: f32,        // Насыщенность
                texelSize: vec2<f32>,   // Размер одного пикселя в UV-координатах
                padding: vec2<f32>      // Выравнивание
            };
            
            @group(0) @binding(0) var<uniform> uniforms: BlurUniforms;
            @group(0) @binding(1) var inputTexture: texture_2d<f32>;
            @group(0) @binding(2) var textureSampler: sampler;
            
            struct VertexOutput {
                @builtin(position) position: vec4<f32>,
                @location(0) uv: vec2<f32>
            };
            
            /**
             * Vertex shader - создаёт полноэкранный квад
             */
            @vertex
            fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
                var output: VertexOutput;
                
                let pos = array<vec2<f32>, 6>(
                    vec2<f32>(-1.0, -1.0),
                    vec2<f32>( 1.0, -1.0),
                    vec2<f32>(-1.0,  1.0),
                    vec2<f32>(-1.0,  1.0),
                    vec2<f32>( 1.0, -1.0),
                    vec2<f32>( 1.0,  1.0)
                );
                
                let p = pos[vertexIndex];
                output.position = vec4<f32>(p, 0.0, 1.0);
                output.uv = (p + 1.0) * 0.5;
                
                return output;
            }
            
            /**
             * Вычисляет вес Gaussian функции для заданного расстояния.
             * 
             * Gaussian функция даёт плавное распределение весов, где
             * центральные пиксели имеют больший вес, чем далёкие.
             * Это создаёт естественное размытие без резких границ.
             * 
             * @param distance - расстояние от центра
             * @param sigma - стандартное отклонение Gaussian
             * @return вес для данного расстояния
             */
            fn gaussianWeight(distance: f32, sigma: f32) -> f32 {
                let sigmaSq = sigma * sigma;
                return exp(-(distance * distance) / (2.0 * sigmaSq));
            }
            
            /**
             * Применяет Gaussian blur в заданном направлении.
             * 
             * Это ядро алгоритма. Мы берём несколько сэмплов текстуры
             * вдоль заданного направления, умножаем каждый на вес Gaussian,
             * и суммируем результат. Чем больше сэмплов, тем качественнее
             * размытие, но и медленнее.
             * 
             * @param uv - UV-координаты текущего пикселя
             * @param direction - направление размытия
             * @param radius - радиус в пикселях
             * @return размытый цвет
             */
            fn blur(uv: vec2<f32>, direction: vec2<f32>, radius: f32) -> vec4<f32> {
                var color = vec4<f32>(0.0);
                var totalWeight = 0.0;
                
                // Sigma определяет "ширину" Gaussian функции
                // Большее sigma = более широкое, плавное размытие
                let sigma = radius / 3.0;
                
                // Количество сэмплов зависит от радиуса
                // Больший радиус = больше сэмплов для качественного размытия
                let sampleCount = i32(radius * 2.0 + 1.0);
                
                // Берём сэмплы в обе стороны от текущего пикселя
                for (var i = -sampleCount / 2; i <= sampleCount / 2; i++) {
                    let offset = f32(i);
                    let weight = gaussianWeight(offset, sigma);
                    
                    // Вычисляем UV-координаты для сэмпла
                    let sampleUV = uv + direction * uniforms.texelSize * offset;
                    
                    // Читаем цвет из текстуры
                    let sampleColor = textureSample(inputTexture, textureSampler, sampleUV);
                    
                    // Накапливаем взвешенный цвет
                    color += sampleColor * weight;
                    totalWeight += weight;
                }
                
                // Нормализуем результат делением на сумму весов
                // Это гарантирует, что яркость изображения не изменится
                return color / totalWeight;
            }
            
            /**
             * Конвертирует RGB в HSV для манипуляции насыщенностью.
             * 
             * HSV (Hue, Saturation, Value) - это цветовая модель, где
             * легче контролировать насыщенность цвета, чем в RGB.
             */
            fn rgb2hsv(c: vec3<f32>) -> vec3<f32> {
                let K = vec4<f32>(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
                let p = mix(vec4<f32>(c.bg, K.wz), vec4<f32>(c.gb, K.xy), step(c.b, c.g));
                let q = mix(vec4<f32>(p.xyw, c.r), vec4<f32>(c.r, p.yzx), step(p.x, c.r));
                
                let d = q.x - min(q.w, q.y);
                let e = 1.0e-10;
                return vec3<f32>(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
            }
            
            /**
             * Конвертирует HSV обратно в RGB.
             */
            fn hsv2rgb(c: vec3<f32>) -> vec3<f32> {
                let K = vec4<f32>(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                let p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
                return c.z * mix(K.xxx, clamp(p - K.xxx, vec3<f32>(0.0), vec3<f32>(1.0)), c.y);
            }
            
            /**
             * Fragment shader - применяет размытие к каждому пикселю.
             */
            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                // Применяем размытие в заданном направлении
                var blurredColor = blur(input.uv, uniforms.direction, uniforms.radius);
                
                // Применяем настройку насыщенности через HSV
                if (uniforms.saturation != 1.0) {
                    var hsv = rgb2hsv(blurredColor.rgb);
                    hsv.y *= uniforms.saturation; // Изменяем насыщенность
                    hsv.y = clamp(hsv.y, 0.0, 1.0);
                    blurredColor = vec4<f32>(hsv2rgb(hsv), blurredColor.a);
                }
                
                // Применяем цветовой оттенок
                blurredColor.rgb *= uniforms.tintColor;
                
                // Применяем интенсивность эффекта
                // strength = 1.0 означает полное размытие
                // strength = 0.0 означает оригинальное изображение
                if (uniforms.strength < 1.0) {
                    let originalColor = textureSample(inputTexture, textureSampler, input.uv);
                    blurredColor = mix(originalColor, blurredColor, uniforms.strength);
                }
                
                return blurredColor;
            }
        `;
    }
    
    /**
     * Обновляет параметры размытия в uniform buffer.
     * 
     * @param {vec2} direction - Направление размытия (1,0) или (0,1)
     */
    updateUniforms(direction) {
        const texelWidth = 1.0 / this.gpu.canvas.width;
        const texelHeight = 1.0 / this.gpu.canvas.height;
        
        const uniformData = new Float32Array([
            direction[0], direction[1],      // direction
            this.params.radius,              // radius
            this.params.strength,            // strength
            ...this.params.tintColor,        // tintColor (3 floats)
            this.params.saturation,          // saturation
            texelWidth, texelHeight,         // texelSize
            0, 0                             // padding
        ]);
        
        this.gpu.device.queue.writeBuffer(
            this.uniformBuffer,
            0,
            uniformData.buffer,
            uniformData.byteOffset,
            uniformData.byteLength
        );
    }
    
    /**
     * Применяет размытие к входной текстуре.
     * 
     * Это двухпроходной процесс:
     * 1. Размываем горизонтально, сохраняем в промежуточную текстуру
     * 2. Размываем промежуточную текстуру вертикально, сохраняем в выходную
     * 
     * @param {GPUCommandEncoder} encoder - Command encoder текущего кадра
     * @param {GPUTextureView} inputView - Входная текстура (что размывать)
     * @param {GPUTextureView} outputView - Выходная текстура (куда писать результат)
     */
    apply(encoder, inputView, outputView) {
        if (!this.initialized) return;
        
        // Регистрируем GPU-операцию в телеметрии
        if (this.vm) {
            this.vm.executeInstruction(
                window.MicroISA.InstructionType.GPU_COMPUTE,
                { operation: 'gaussian_blur', passes: 2 }
            );
        }
        
        const tempView = this.tempTexture.createView();
        
        // === ПРОХОД 1: Горизонтальное размытие ===
        // Обновляем uniforms для горизонтального направления
        this.updateUniforms([1.0, 0.0]);
        
        // Создаём bind group для первого прохода
        const bindGroupHorizontal = this.gpu.device.createBindGroup({
            label: 'Horizontal Blur Bind Group',
            layout: this.horizontalPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.uniformBuffer }
                },
                {
                    binding: 1,
                    resource: inputView // Читаем из входной текстуры
                },
                {
                    binding: 2,
                    resource: this.sampler
                }
            ]
        });
        
        // Рендерим горизонтальное размытие в промежуточную текстуру
        const horizontalPass = encoder.beginRenderPass({
            label: 'Horizontal Blur Pass',
            colorAttachments: [{
                view: tempView, // Пишем в промежуточную текстуру
                loadOp: 'clear',
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                storeOp: 'store'
            }]
        });
        
        horizontalPass.setPipeline(this.horizontalPipeline);
        horizontalPass.setBindGroup(0, bindGroupHorizontal);
        horizontalPass.draw(6, 1, 0, 0);
        horizontalPass.end();
        
        // === ПРОХОД 2: Вертикальное размытие ===
        // Обновляем uniforms для вертикального направления
        this.updateUniforms([0.0, 1.0]);
        
        // Создаём bind group для второго прохода
        const bindGroupVertical = this.gpu.device.createBindGroup({
            label: 'Vertical Blur Bind Group',
            layout: this.verticalPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.uniformBuffer }
                },
                {
                    binding: 1,
                    resource: tempView // Читаем из промежуточной текстуры
                },
                {
                    binding: 2,
                    resource: this.sampler
                }
            ]
        });
        
        // Рендерим вертикальное размытие в выходную текстуру
        const verticalPass = encoder.beginRenderPass({
            label: 'Vertical Blur Pass',
            colorAttachments: [{
                view: outputView, // Пишем в финальную выходную текстуру
                loadOp: 'load', // Сохраняем существующее содержимое
                storeOp: 'store'
            }]
        });
        
        verticalPass.setPipeline(this.verticalPipeline);
        verticalPass.setBindGroup(0, bindGroupVertical);
        verticalPass.draw(6, 1, 0, 0);
        verticalPass.end();
        
        // Обновляем статистику
        this.gpu.stats.totalComputePasses += 2;
    }
    
    /**
     * Устанавливает параметры размытия.
     * 
     * @param {Object} params - Объект с параметрами
     */
    setParams(params) {
        if (params.radius !== undefined) this.params.radius = params.radius;
        if (params.strength !== undefined) this.params.strength = params.strength;
        if (params.tintColor !== undefined) this.params.tintColor = params.tintColor;
        if (params.saturation !== undefined) this.params.saturation = params.saturation;
    }
    
    /**
     * Обновляет размер промежуточной текстуры при изменении размера canvas.
     */
    resize(width, height) {
        if (this.tempTexture) {
            // Уничтожаем старую текстуру
            this.tempTexture.destroy();
        }
        
        // Создаём новую текстуру нужного размера
        this.tempTexture = this.gpu.createTexture(
            width,
            height,
            this.gpu.preferredFormat,
            GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        );
        
        console.log(`🔄 Blur temp texture resized to ${width}x${height}`);
    }
    
    /**
     * Очищает ресурсы.
     */
    destroy() {
        if (this.tempTexture) {
            this.tempTexture.destroy();
        }
        
        this.initialized = false;
        console.log('✓ GPU Blur Effect destroyed');
    }
}

/**
 * Экспорт для использования в других модулях
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GPUBlurEffect
    };
}

if (typeof window !== 'undefined') {
    if (!window.WebGPURenderEngine) {
        window.WebGPURenderEngine = {};
    }
    window.WebGPURenderEngine.GPUBlurEffect = GPUBlurEffect;
}
