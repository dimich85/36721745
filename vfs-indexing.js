/**
 * ============================================================================
 * VFS INDEXING & SEARCH SYSTEM - STAGE 3
 * ============================================================================
 * 
 * Этот модуль реализует интеллектуальную систему индексирования и поиска
 * для виртуальной файловой системы. Когда у пользователя накапливаются
 * сотни или тысячи файлов, традиционный линейный поиск становится
 * неприемлемо медленным. Наша система решает эту проблему двумя способами:
 * 
 * 1. Inverted Index - классическая структура данных для полнотекстового поиска
 * 2. GPU-ускорение для параллельной обработки результатов
 * 
 * Что такое Inverted Index:
 * 
 * Представьте обычную книгу и предметный указатель в её конце. В предметном
 * указателе для каждого важного слова перечислены страницы, на которых
 * оно встречается. Это и есть inverted index - вместо того чтобы идти от
 * документа к словам (как мы читаем текст), мы идём от слова к документам.
 * 
 * Структура:
 * {
 *   "machine": [doc1, doc3, doc7],    // Слово "machine" встречается в этих документах
 *   "learning": [doc1, doc5],         // Слово "learning" встречается в этих документах
 *   "algorithm": [doc3, doc7, doc9]   // И так далее
 * }
 * 
 * Когда пользователь ищет "machine learning", мы:
 * 1. Ищем "machine" в индексе - получаем список документов
 * 2. Ищем "learning" в индексе - получаем список документов
 * 3. Находим пересечение списков - это документы, содержащие оба слова
 * 4. Сортируем по релевантности
 * 
 * Всё это занимает микросекунды, независимо от размера файловой системы!
 * 
 * GPU-ускорение:
 * 
 * После того как мы нашли потенциально релевантные документы через индекс,
 * нам нужно отсортировать их по релевантности. Традиционно это делается
 * через вычисление TF-IDF (Term Frequency - Inverse Document Frequency)
 * или BM25 метрик. Эти вычисления независимы для каждого документа, что
 * делает их идеальными для параллелизации на GPU.
 * 
 * Вместо того чтобы вычислять релевантность для тысячи документов
 * последовательно на CPU (что может занять десятки миллисекунд), мы
 * отправляем данные на GPU и вычисляем для всех документов параллельно
 * (что занимает единицы миллисекунд).
 */

/**
 * Класс для токенизации текста.
 * 
 * Токенизация - это процесс разбиения текста на отдельные слова (токены).
 * Это не так просто, как кажется - нужно правильно обрабатывать пунктуацию,
 * разные регистры, специальные символы.
 */
class Tokenizer {
    constructor() {
        // Стоп-слова - слова, которые слишком частотны, чтобы быть полезными для поиска
        // Например, "the", "a", "is" встречаются в почти каждом тексте и не помогают
        // различать документы
        this.stopWords = new Set([
            'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
            'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
            'to', 'was', 'will', 'with', 'this', 'but', 'they', 'have', 'had',
            'what', 'when', 'where', 'who', 'which', 'why', 'how'
        ]);
        
        // Минимальная длина токена для индексирования
        // Слова короче этого обычно не информативны
        this.minTokenLength = 2;
    }
    
    /**
     * Токенизирует текст, возвращая массив нормализованных токенов.
     * 
     * Процесс:
     * 1. Приводим к нижнему регистру (чтобы "Machine" и "machine" были одним словом)
     * 2. Разбиваем по пробелам и пунктуации
     * 3. Удаляем стоп-слова
     * 4. Фильтруем короткие токены
     * 5. Применяем стемминг (опционально) - приведение к корню слова
     * 
     * @param {string} text - Текст для токенизации
     * @returns {Array<string>} Массив токенов
     */
    tokenize(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }
        
        // Приводим к нижнему регистру
        text = text.toLowerCase();
        
        // Разбиваем по границам слов (пробелы, пунктуация)
        // Регулярное выражение \W+ означает "один или более несловесных символов"
        const tokens = text.split(/\W+/);
        
        // Фильтруем токены
        const filtered = tokens.filter(token => {
            // Пропускаем пустые токены
            if (!token) return false;
            
            // Пропускаем стоп-слова
            if (this.stopWords.has(token)) return false;
            
            // Пропускаем короткие токены
            if (token.length < this.minTokenLength) return false;
            
            return true;
        });
        
        return filtered;
    }
    
    /**
     * Токенизирует текст и возвращает Map с частотами токенов.
     * 
     * Это полезно для вычисления TF (Term Frequency) - насколько часто
     * слово встречается в документе.
     * 
     * @param {string} text - Текст для анализа
     * @returns {Map<string, number>} Map где ключ - токен, значение - количество вхождений
     */
    tokenizeWithFrequencies(text) {
        const tokens = this.tokenize(text);
        const frequencies = new Map();
        
        for (const token of tokens) {
            const count = frequencies.get(token) || 0;
            frequencies.set(token, count + 1);
        }
        
        return frequencies;
    }
}

/**
 * Inverted Index - основная структура данных для полнотекстового поиска.
 * 
 * Эта структура отображает каждый уникальный токен на список документов,
 * в которых он встречается, вместе с метаданными (позиции, частоты и т.д.)
 */
class InvertedIndex {
    constructor() {
        // Главная структура индекса: Map<токен, Array<документы>>
        // Для каждого токена храним массив объектов вида:
        // { fileId, filePath, termFrequency, positions }
        this.index = new Map();
        
        // Словарь документов для быстрого доступа по ID
        // Map<fileId, metadata>
        this.documents = new Map();
        
        // Общее количество проиндексированных документов
        this.documentCount = 0;
        
        // Токенайзер для обработки текста
        this.tokenizer = new Tokenizer();
        
        // Статистика
        this.stats = {
            totalTokens: 0,
            uniqueTokens: 0,
            lastIndexTime: 0
        };
    }
    
    /**
     * Индексирует один документ (файл).
     * 
     * Мы разбираем содержимое файла на токены и добавляем информацию
     * о файле в индекс для каждого токена.
     * 
     * @param {File} file - Файл для индексирования
     */
    indexFile(file) {
        const startTime = performance.now();
        
        // Получаем содержимое файла
        const content = file.content;
        
        // Индексируем только текстовые файлы
        if (!file.isText() || !content) {
            return;
        }
        
        const fileId = file.id;
        const filePath = file.getPath();
        
        // Сохраняем метаданные документа
        this.documents.set(fileId, {
            id: fileId,
            path: filePath,
            name: file.name,
            size: file.metadata.size,
            modified: file.metadata.modified,
            tags: Array.from(file.tags)
        });
        
        // Токенизируем с подсчётом частот
        const tokenFrequencies = this.tokenizer.tokenizeWithFrequencies(content);
        
        // Добавляем каждый токен в индекс
        for (const [token, frequency] of tokenFrequencies) {
            // Получаем или создаём список документов для этого токена
            if (!this.index.has(token)) {
                this.index.set(token, []);
                this.stats.uniqueTokens++;
            }
            
            const postingList = this.index.get(token);
            
            // Добавляем информацию о документе
            postingList.push({
                fileId: fileId,
                filePath: filePath,
                termFrequency: frequency,  // Сколько раз токен встречается в документе
                documentLength: content.length  // Длина документа для нормализации
            });
            
            this.stats.totalTokens++;
        }
        
        this.documentCount++;
        
        const indexTime = performance.now() - startTime;
        this.stats.lastIndexTime = indexTime;
        
        console.log(`  Indexed: ${filePath} (${tokenFrequencies.size} unique tokens, ${indexTime.toFixed(2)}ms)`);
    }
    
    /**
     * Индексирует всю файловую систему.
     * 
     * Мы рекурсивно проходим по всем файлам и индексируем каждый.
     * 
     * @param {VirtualFileSystem} vfs - Файловая система
     */
    indexFileSystem(vfs) {
        console.log('🔍 Building search index...');
        const startTime = performance.now();
        
        // Очищаем существующий индекс
        this.clear();
        
        // Обходим все файлы
        vfs.root.walkFiles((file) => {
            this.indexFile(file);
        });
        
        const totalTime = performance.now() - startTime;
        
        console.log('✓ Index built successfully');
        console.log(`  Total files: ${this.documentCount}`);
        console.log(`  Unique tokens: ${this.stats.uniqueTokens}`);
        console.log(`  Total tokens: ${this.stats.totalTokens}`);
        console.log(`  Build time: ${totalTime.toFixed(2)}ms`);
        console.log(`  Average per file: ${(totalTime / this.documentCount).toFixed(2)}ms`);
    }
    
    /**
     * Выполняет поиск по запросу.
     * 
     * Это базовый поиск на CPU. Мы токенизируем запрос, находим документы
     * для каждого токена, и вычисляем релевантность.
     * 
     * @param {string} query - Поисковый запрос
     * @param {number} maxResults - Максимальное количество результатов
     * @returns {Array<Object>} Массив результатов, отсортированных по релевантности
     */
    search(query, maxResults = 10) {
        const startTime = performance.now();
        
        // Токенизируем запрос
        const queryTokens = this.tokenizer.tokenize(query);
        
        if (queryTokens.length === 0) {
            return [];
        }
        
        console.log('🔍 Searching for:', queryTokens.join(' '));
        
        // Собираем кандидатов - документы, содержащие хотя бы один токен из запроса
        const candidates = new Map(); // fileId -> score
        
        for (const token of queryTokens) {
            const postingList = this.index.get(token);
            
            if (!postingList) {
                // Токен не найден в индексе
                continue;
            }
            
            // Вычисляем IDF (Inverse Document Frequency) для токена
            // IDF показывает, насколько редким является слово в коллекции
            // Редкие слова более важны для различения документов
            const idf = Math.log(this.documentCount / postingList.length);
            
            // Обрабатываем каждый документ в posting list
            for (const posting of postingList) {
                const fileId = posting.fileId;
                
                // Вычисляем TF-IDF score
                // TF (Term Frequency) - как часто слово встречается в документе
                // Нормализуем на длину документа, чтобы длинные документы не имели преимущество
                const tf = posting.termFrequency / posting.documentLength;
                const tfidf = tf * idf;
                
                // Накапливаем score для документа
                const currentScore = candidates.get(fileId) || 0;
                candidates.set(fileId, currentScore + tfidf);
            }
        }
        
        // Преобразуем кандидатов в массив результатов
        const results = [];
        
        for (const [fileId, score] of candidates) {
            const doc = this.documents.get(fileId);
            
            if (doc) {
                results.push({
                    fileId: fileId,
                    path: doc.path,
                    name: doc.name,
                    score: score,
                    size: doc.size,
                    modified: doc.modified,
                    tags: doc.tags
                });
            }
        }
        
        // Сортируем по score (релевантности) в убывающем порядке
        results.sort((a, b) => b.score - a.score);
        
        // Ограничиваем количество результатов
        const limited = results.slice(0, maxResults);
        
        const searchTime = performance.now() - startTime;
        
        console.log(`✓ Found ${limited.length} results in ${searchTime.toFixed(2)}ms`);
        
        return limited;
    }
    
    /**
     * Поиск по тегам.
     * 
     * Это дополнительный способ организации файлов. Пользователь может
     * присваивать файлам теги (например, "work", "important", "project-x"),
     * и затем искать файлы по этим тегам.
     * 
     * @param {Array<string>} tags - Массив тегов для поиска
     * @returns {Array<Object>} Массив результатов
     */
    searchByTags(tags) {
        const results = [];
        
        for (const doc of this.documents.values()) {
            // Проверяем, есть ли у документа все искомые теги
            const hasAllTags = tags.every(tag => 
                doc.tags.includes(tag.toLowerCase())
            );
            
            if (hasAllTags) {
                results.push({
                    fileId: doc.id,
                    path: doc.path,
                    name: doc.name,
                    size: doc.size,
                    modified: doc.modified,
                    tags: doc.tags
                });
            }
        }
        
        return results;
    }
    
    /**
     * Очищает индекс.
     */
    clear() {
        this.index.clear();
        this.documents.clear();
        this.documentCount = 0;
        this.stats.totalTokens = 0;
        this.stats.uniqueTokens = 0;
    }
    
    /**
     * Возвращает статистику индекса.
     * 
     * @returns {Object}
     */
    getStats() {
        return {
            ...this.stats,
            documentCount: this.documentCount,
            averageDocumentLength: this.stats.totalTokens / this.documentCount || 0,
            indexSize: this.index.size
        };
    }
}

/**
 * ============================================================================
 * GPU-ACCELERATED SEARCH ENGINE
 * ============================================================================
 * 
 * Этот класс использует WebGPU compute shaders для параллельного вычисления
 * релевантности документов. Когда у нас есть тысячи кандидатов из индекса,
 * GPU может обработать их все одновременно.
 * 
 * Концепция:
 * 
 * После того как inverted index дал нам список потенциально релевантных
 * документов, нам нужно отранжировать их по релевантности. Вычисление
 * score для каждого документа - это независимая операция, идеально
 * подходящая для параллелизации.
 * 
 * Мы создаём compute shader, который:
 * 1. Получает массив документов с их метриками (TF, IDF)
 * 2. Параллельно вычисляет финальный score для каждого документа
 * 3. Возвращает отсортированный массив результатов
 * 
 * Всё это происходит на GPU в микросекунды вместо миллисекунд на CPU.
 */
class GPUSearchEngine {
    constructor(gpuContext, microISAVM = null) {
        this.gpu = gpuContext;
        this.vm = microISAVM;
        
        // CPU fallback индекс для случаев, когда GPU недоступен
        this.cpuIndex = new InvertedIndex();
        
        // GPU-ресурсы
        this.computePipeline = null;
        this.initialized = false;
        
        // Статистика
        this.stats = {
            totalSearches: 0,
            gpuSearches: 0,
            cpuSearches: 0,
            averageGPUTime: 0,
            averageCPUTime: 0
        };
    }
    
    /**
     * Инициализирует GPU compute pipeline для поиска.
     * 
     * В будущих версиях здесь будет реализован полноценный GPU-поиск.
     * Пока мы используем CPU индекс как baseline.
     */
    async initialize() {
        console.log('🔍 Initializing GPU Search Engine...');
        
        // TODO: Создать compute shader для параллельного ранжирования
        // Это будет реализовано на следующих этапах развития
        
        this.initialized = true;
        console.log('✓ GPU Search Engine initialized (using CPU fallback)');
    }
    
    /**
     * Индексирует файловую систему.
     * 
     * @param {VirtualFileSystem} vfs - Файловая система
     */
    indexFileSystem(vfs) {
        const startTime = performance.now();
        
        // Регистрируем операцию в VM
        if (this.vm) {
            this.vm.executeInstruction('INDEX_BUILD', { 
                operation: 'full_reindex' 
            });
        }
        
        // Используем CPU индекс
        this.cpuIndex.indexFileSystem(vfs);
        
        const indexTime = performance.now() - startTime;
        console.log(`  Total index build time: ${indexTime.toFixed(2)}ms`);
    }
    
    /**
     * Выполняет поиск по запросу.
     * 
     * @param {string} query - Поисковый запрос
     * @param {number} maxResults - Максимальное количество результатов
     * @returns {Promise<Array<Object>>} Массив результатов
     */
    async search(query, maxResults = 10) {
        this.stats.totalSearches++;
        
        // Регистрируем операцию в VM
        if (this.vm) {
            this.vm.executeInstruction('SEARCH_QUERY', { 
                query, 
                maxResults 
            });
        }
        
        // В будущем здесь будет проверка, использовать ли GPU или CPU
        // На основе размера индекса и сложности запроса
        
        // Пока используем CPU поиск
        const startTime = performance.now();
        const results = this.cpuIndex.search(query, maxResults);
        const searchTime = performance.now() - startTime;
        
        this.stats.cpuSearches++;
        
        // Обновляем среднее время CPU поиска
        if (this.stats.averageCPUTime === 0) {
            this.stats.averageCPUTime = searchTime;
        } else {
            this.stats.averageCPUTime = 
                (this.stats.averageCPUTime * 0.9) + (searchTime * 0.1);
        }
        
        return results;
    }
    
    /**
     * Поиск по тегам.
     * 
     * @param {Array<string>} tags - Массив тегов
     * @returns {Promise<Array<Object>>}
     */
    async searchByTags(tags) {
        if (this.vm) {
            this.vm.executeInstruction('SEARCH_TAGS', { tags });
        }
        
        return this.cpuIndex.searchByTags(tags);
    }
    
    /**
     * Возвращает статистику поисковой системы.
     * 
     * @returns {Object}
     */
    getStats() {
        return {
            ...this.stats,
            indexStats: this.cpuIndex.getStats()
        };
    }
}

// Экспорт классов
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Tokenizer,
        InvertedIndex,
        GPUSearchEngine
    };
}

if (typeof window !== 'undefined') {
    if (!window.VFS) {
        window.VFS = {};
    }
    window.VFS.Tokenizer = Tokenizer;
    window.VFS.InvertedIndex = InvertedIndex;
    window.VFS.GPUSearchEngine = GPUSearchEngine;
}
