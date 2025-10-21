/**
 * ============================================================================
 * BUSINESS LOGIC MODULE - STAGE 4 REVOLUTIONARY DEMO
 * ============================================================================
 * 
 * Это бизнес-логика нашего приложения - та самая часть, которую мы компилируем
 * целиком в WASM. Представьте этот модуль как ядро операционной системы файлов,
 * написанное на JavaScript, но предназначенное для превращения в чистый,
 * оптимизированный машинный код через WASM.
 * 
 * АРХИТЕКТУРНОЕ РЕШЕНИЕ:
 * 
 * Обратите внимание на дизайн этого модуля. Здесь нет ни одного обращения к DOM,
 * ни одного вызова браузерных API. Это чистая бизнес-логика - алгоритмы,
 * структуры данных, вычисления. Именно такой код идеально подходит для
 * компиляции в WASM.
 * 
 * Когда мы говорим о разделении на "граничный слой" и "бизнес-логику", вот
 * что мы имеем в виду:
 * 
 * ГРАНИЧНЫЙ СЛОЙ (остаётся в JavaScript):
 * - document.getElementById()
 * - element.addEventListener()
 * - fetch() для загрузки данных
 * - Всё, что взаимодействует с браузером напрямую
 * 
 * БИЗНЕС-ЛОГИКА (компилируется в WASM):
 * - Алгоритмы поиска и индексирования
 * - Управление структурами данных
 * - Математические вычисления
 * - Обработка строк и массивов
 * - Логика принятия решений
 * 
 * Этот модуль демонстрирует второй тип - чистая бизнес-логика, которая
 * получает максимальную выгоду от компиляции в WASM.
 */

/**
 * VirtualFileSystem - виртуальная файловая система в памяти.
 * 
 * Представьте это как миниатюрную версию файловой системы Linux или Windows,
 * но существующую полностью в памяти браузера. У нас есть файлы, директории,
 * пути, разрешения - всё, что нужно для полноценной файловой системы.
 * 
 * Это отличный пример кода для компиляции в WASM, потому что:
 * 1. Много операций с памятью и указателями (в JS это объекты и ссылки)
 * 2. Частые вызовы функций друг друга (хорошо оптимизируется вместе)
 * 3. Предсказуемые типы данных (легко типизировать для WASM)
 * 4. Нет взаимодействия с браузерными API
 */
class VirtualFileSystem {
    constructor() {
        // Корневая директория - начало всей файловой системы
        this.root = {
            type: 'directory',
            name: '/',
            children: new Map(),
            metadata: {
                created: Date.now(),
                modified: Date.now(),
                size: 0
            }
        };
        
        // Текущая рабочая директория (как pwd в Unix)
        this.currentPath = '/';
        
        // Статистика для телеметрии
        this.stats = {
            totalFiles: 0,
            totalDirectories: 1, // Корень
            totalSize: 0,
            operations: {
                create: 0,
                read: 0,
                write: 0,
                delete: 0
            }
        };
    }
    
    /**
     * Создаёт новый файл в файловой системе.
     * 
     * Это одна из самых частых операций. Когда пользователь создаёт файл
     * через UI, граничный слой вызывает эту функцию (или её WASM эквивалент
     * после компиляции). Функция проходит по пути, создаёт необходимые
     * промежуточные директории, и добавляет файл в нужное место.
     * 
     * @param {string} path - Полный путь к файлу (например, '/docs/readme.txt')
     * @param {string} content - Содержимое файла
     * @returns {boolean} - true если успешно создан
     */
    createFile(path, content = '') {
        // Увеличиваем счётчик операций для телеметрии
        this.stats.operations.create++;
        
        // Разбиваем путь на компоненты
        const parts = this.parsePath(path);
        if (parts.length === 0) {
            return false;
        }
        
        // Находим или создаём родительскую директорию
        const parent = this.ensureDirectory(parts.slice(0, -1));
        if (!parent) {
            return false;
        }
        
        const fileName = parts[parts.length - 1];
        
        // Проверяем, не существует ли уже файл с таким именем
        if (parent.children.has(fileName)) {
            return false;
        }
        
        // Создаём новый файл
        const file = {
            type: 'file',
            name: fileName,
            content: content,
            metadata: {
                created: Date.now(),
                modified: Date.now(),
                size: content.length
            }
        };
        
        // Добавляем файл в родительскую директорию
        parent.children.set(fileName, file);
        
        // Обновляем статистику
        this.stats.totalFiles++;
        this.stats.totalSize += content.length;
        
        return true;
    }
    
    /**
     * Читает содержимое файла.
     * 
     * Это тоже очень частая операция - при каждом открытии файла пользователем
     * вызывается эта функция. В WASM версии она будет невероятно быстрой,
     * потому что все структуры данных хранятся в линейной памяти WASM с
     * прямым доступом.
     * 
     * @param {string} path - Путь к файлу
     * @returns {string|null} - Содержимое файла или null если не найден
     */
    readFile(path) {
        this.stats.operations.read++;
        
        const file = this.findNode(path);
        
        if (!file || file.type !== 'file') {
            return null;
        }
        
        return file.content;
    }
    
    /**
     * Записывает данные в файл.
     * 
     * Обновляет содержимое существующего файла. Это операция, которая
     * выигрывает от WASM компиляции, особенно если файлы большие - мы
     * можем использовать эффективное копирование памяти и избежать
     * накладных расходов на сборку мусора в JavaScript.
     * 
     * @param {string} path - Путь к файлу
     * @param {string} content - Новое содержимое
     * @returns {boolean} - true если успешно записан
     */
    writeFile(path, content) {
        this.stats.operations.write++;
        
        const file = this.findNode(path);
        
        if (!file || file.type !== 'file') {
            return false;
        }
        
        // Обновляем статистику размера
        const sizeDiff = content.length - file.content.length;
        this.stats.totalSize += sizeDiff;
        
        // Обновляем файл
        file.content = content;
        file.metadata.modified = Date.now();
        file.metadata.size = content.length;
        
        return true;
    }
    
    /**
     * Удаляет файл или директорию.
     * 
     * @param {string} path - Путь к удаляемому элементу
     * @returns {boolean} - true если успешно удалён
     */
    deleteNode(path) {
        this.stats.operations.delete++;
        
        const parts = this.parsePath(path);
        if (parts.length === 0) {
            return false;
        }
        
        const parent = this.findNode(parts.slice(0, -1).join('/'));
        if (!parent || parent.type !== 'directory') {
            return false;
        }
        
        const nodeName = parts[parts.length - 1];
        const node = parent.children.get(nodeName);
        
        if (!node) {
            return false;
        }
        
        // Рекурсивно обновляем статистику
        this.updateStatsForDeletion(node);
        
        // Удаляем узел
        parent.children.delete(nodeName);
        
        return true;
    }
    
    /**
     * Создаёт директорию.
     * 
     * @param {string} path - Путь к новой директории
     * @returns {boolean} - true если успешно создана
     */
    createDirectory(path) {
        const parts = this.parsePath(path);
        if (parts.length === 0) {
            return false;
        }
        
        const parent = this.ensureDirectory(parts.slice(0, -1));
        if (!parent) {
            return false;
        }
        
        const dirName = parts[parts.length - 1];
        
        if (parent.children.has(dirName)) {
            return false;
        }
        
        const directory = {
            type: 'directory',
            name: dirName,
            children: new Map(),
            metadata: {
                created: Date.now(),
                modified: Date.now(),
                size: 0
            }
        };
        
        parent.children.set(dirName, directory);
        this.stats.totalDirectories++;
        
        return true;
    }
    
    /**
     * Возвращает список файлов в директории.
     * 
     * @param {string} path - Путь к директории
     * @returns {Array} - Массив объектов с информацией о файлах
     */
    listDirectory(path) {
        const dir = this.findNode(path);
        
        if (!dir || dir.type !== 'directory') {
            return [];
        }
        
        const result = [];
        
        for (const [name, node] of dir.children) {
            result.push({
                name: name,
                type: node.type,
                size: node.metadata.size,
                created: node.metadata.created,
                modified: node.metadata.modified
            });
        }
        
        return result;
    }
    
    /**
     * Находит узел файловой системы по пути.
     * 
     * Это внутренняя функция, которая проходит по дереву файловой системы,
     * следуя указанному пути. В WASM версии это будет просто серия
     * арифметических операций с указателями - невероятно быстро.
     * 
     * @param {string} path - Путь для поиска
     * @returns {Object|null} - Найденный узел или null
     */
    findNode(path) {
        if (path === '/' || path === '') {
            return this.root;
        }
        
        const parts = this.parsePath(path);
        let current = this.root;
        
        for (const part of parts) {
            if (current.type !== 'directory') {
                return null;
            }
            
            current = current.children.get(part);
            
            if (!current) {
                return null;
            }
        }
        
        return current;
    }
    
    /**
     * Гарантирует существование директории, создавая промежуточные если нужно.
     * 
     * Это как команда 'mkdir -p' в Unix - создаёт все промежуточные директории
     * в пути, если они не существуют.
     * 
     * @param {Array} parts - Компоненты пути
     * @returns {Object|null} - Директория или null при ошибке
     */
    ensureDirectory(parts) {
        let current = this.root;
        
        for (const part of parts) {
            if (!current.children.has(part)) {
                const newDir = {
                    type: 'directory',
                    name: part,
                    children: new Map(),
                    metadata: {
                        created: Date.now(),
                        modified: Date.now(),
                        size: 0
                    }
                };
                
                current.children.set(part, newDir);
                this.stats.totalDirectories++;
            }
            
            current = current.children.get(part);
            
            if (current.type !== 'directory') {
                return null;
            }
        }
        
        return current;
    }
    
    /**
     * Разбирает путь на компоненты.
     * 
     * Превращает '/docs/projects/readme.txt' в ['docs', 'projects', 'readme.txt'].
     * Простая функция, но вызывается очень часто, так что выигрывает от WASM.
     * 
     * @param {string} path - Путь для разбора
     * @returns {Array} - Массив компонентов пути
     */
    parsePath(path) {
        return path
            .split('/')
            .filter(part => part.length > 0);
    }
    
    /**
     * Обновляет статистику при удалении узла.
     * 
     * При удалении директории нужно рекурсивно пройти по всем вложенным
     * файлам и директориям и обновить счётчики. Это хороший пример функции,
     * которая выигрывает от встраивания и других оптимизаций WASM.
     * 
     * @param {Object} node - Удаляемый узел
     */
    updateStatsForDeletion(node) {
        if (node.type === 'file') {
            this.stats.totalFiles--;
            this.stats.totalSize -= node.metadata.size;
        } else if (node.type === 'directory') {
            this.stats.totalDirectories--;
            
            for (const child of node.children.values()) {
                this.updateStatsForDeletion(child);
            }
        }
    }
    
    /**
     * Возвращает статистику файловой системы.
     */
    getStats() {
        return { ...this.stats };
    }
}

/**
 * ============================================================================
 * SEARCH INDEX
 * ============================================================================
 * 
 * Поисковый индекс - это вторая критическая часть бизнес-логики. Он позволяет
 * быстро находить файлы по содержимому. Представьте это как миниатюрную
 * версию того, что делает Google - индексирование и ранжирование результатов.
 * 
 * Это идеальный кандидат для WASM компиляции, потому что:
 * 1. Много операций со строками (токенизация, нормализация)
 * 2. Интенсивная работа с массивами и хеш-таблицами
 * 3. Математические вычисления для ранжирования
 * 4. Всё детерминированно и легко типизируется
 */
class SearchIndex {
    constructor(vfs) {
        this.vfs = vfs;
        
        // Инвертированный индекс: токен -> список файлов, где встречается
        // Это основная структура данных для быстрого поиска
        this.invertedIndex = new Map();
        
        // Метаданные документов для ранжирования
        this.documentMetadata = new Map();
        
        // Статистика индекса
        this.stats = {
            totalTokens: 0,
            totalDocuments: 0,
            indexSize: 0,
            lastIndexTime: 0
        };
    }
    
    /**
     * Индексирует файл.
     * 
     * Берёт содержимое файла, разбивает его на токены (слова), и добавляет
     * каждый токен в инвертированный индекс с ссылкой на файл. Это позволяет
     * позже быстро найти все файлы, содержащие определённое слово.
     * 
     * @param {string} path - Путь к файлу
     * @returns {boolean} - true если успешно проиндексирован
     */
    indexFile(path) {
        const startTime = performance.now();
        
        const content = this.vfs.readFile(path);
        if (content === null) {
            return false;
        }
        
        // Токенизация - разбиваем текст на слова
        const tokens = this.tokenize(content);
        
        // Нормализация - приводим к единому виду
        const normalizedTokens = tokens.map(t => this.normalize(t));
        
        // Вычисляем TF (Term Frequency) для каждого токена в документе
        const termFrequencies = this.calculateTermFrequencies(normalizedTokens);
        
        // Сохраняем метаданные документа
        this.documentMetadata.set(path, {
            path: path,
            tokenCount: tokens.length,
            uniqueTokens: termFrequencies.size,
            termFrequencies: termFrequencies,
            indexed: Date.now()
        });
        
        // Добавляем токены в инвертированный индекс
        for (const [token, frequency] of termFrequencies) {
            if (!this.invertedIndex.has(token)) {
                this.invertedIndex.set(token, []);
                this.stats.totalTokens++;
            }
            
            this.invertedIndex.get(token).push({
                path: path,
                frequency: frequency
            });
        }
        
        this.stats.totalDocuments++;
        this.stats.lastIndexTime = performance.now() - startTime;
        
        return true;
    }
    
    /**
     * Выполняет поиск по индексу.
     * 
     * Это самая важная функция - то, ради чего существует индекс. Пользователь
     * вводит поисковый запрос, мы находим все файлы, содержащие эти слова,
     * и ранжируем результаты по релевантности.
     * 
     * В WASM версии это будет молниеносно быстро, даже для больших индексов.
     * 
     * @param {string} query - Поисковый запрос
     * @returns {Array} - Массив результатов, отсортированных по релевантности
     */
    search(query) {
        const startTime = performance.now();
        
        // Токенизируем и нормализуем запрос
        const queryTokens = this.tokenize(query).map(t => this.normalize(t));
        
        if (queryTokens.length === 0) {
            return [];
        }
        
        // Находим все документы, содержащие хотя бы один токен запроса
        const candidateDocuments = new Map();
        
        for (const token of queryTokens) {
            const postings = this.invertedIndex.get(token);
            
            if (postings) {
                for (const posting of postings) {
                    if (!candidateDocuments.has(posting.path)) {
                        candidateDocuments.set(posting.path, {
                            path: posting.path,
                            matchedTokens: 0,
                            totalFrequency: 0
                        });
                    }
                    
                    const doc = candidateDocuments.get(posting.path);
                    doc.matchedTokens++;
                    doc.totalFrequency += posting.frequency;
                }
            }
        }
        
        // Вычисляем скор релевантности для каждого документа
        const results = Array.from(candidateDocuments.values())
            .map(doc => {
                const metadata = this.documentMetadata.get(doc.path);
                const score = this.calculateRelevanceScore(
                    doc,
                    queryTokens.length,
                    metadata
                );
                
                return {
                    path: doc.path,
                    score: score,
                    matchedTokens: doc.matchedTokens,
                    totalQueryTokens: queryTokens.length
                };
            });
        
        // Сортируем по релевантности
        results.sort((a, b) => b.score - a.score);
        
        const searchTime = performance.now() - startTime;
        
        return {
            results: results,
            searchTime: searchTime,
            totalResults: results.length
        };
    }
    
    /**
     * Токенизирует текст.
     * 
     * Разбивает текст на отдельные слова (токены). Это базовая операция для
     * любого текстового поиска. В реальной системе здесь были бы более
     * сложные правила, но концепция та же.
     * 
     * @param {string} text - Текст для токенизации
     * @returns {Array} - Массив токенов
     */
    tokenize(text) {
        // Простая токенизация по пробелам и знакам препинания
        return text
            .toLowerCase()
            .split(/[\s,.:;!?()[\]{}"']+/)
            .filter(token => token.length > 0);
    }
    
    /**
     * Нормализует токен.
     * 
     * Приводит слово к канонической форме. Например, "running" -> "run",
     * "cats" -> "cat". Это позволяет найти документы с разными формами
     * одного слова.
     * 
     * @param {string} token - Токен для нормализации
     * @returns {string} - Нормализованный токен
     */
    normalize(token) {
        // Упрощённая нормализация для демо
        // В реальной системе здесь был бы stemming или lemmatization
        
        // Удаляем распространённые окончания
        token = token.replace(/ing$/, '');
        token = token.replace(/ed$/, '');
        token = token.replace(/s$/, '');
        
        return token;
    }
    
    /**
     * Вычисляет частоты терминов в документе.
     * 
     * Подсчитывает, сколько раз каждое слово встречается в документе.
     * Это нужно для ранжирования - документы, где искомое слово встречается
     * чаще, обычно более релевантны.
     * 
     * @param {Array} tokens - Массив токенов
     * @returns {Map} - Мапа токен -> частота
     */
    calculateTermFrequencies(tokens) {
        const frequencies = new Map();
        
        for (const token of tokens) {
            frequencies.set(token, (frequencies.get(token) || 0) + 1);
        }
        
        return frequencies;
    }
    
    /**
     * Вычисляет скор релевантности документа к запросу.
     * 
     * Это упрощённая версия алгоритмов ранжирования, используемых поисковыми
     * системами. Учитываем несколько факторов:
     * - Сколько слов из запроса нашлись в документе
     * - Как часто они встречаются
     * - Длина документа (короткие документы с совпадениями часто релевантнее)
     * 
     * @param {Object} doc - Информация о документе-кандидате
     * @param {number} queryLength - Количество токенов в запросе
     * @param {Object} metadata - Метаданные документа
     * @returns {number} - Скор релевантности
     */
    calculateRelevanceScore(doc, queryLength, metadata) {
        // Базовый скор - процент совпавших токенов запроса
        let score = doc.matchedTokens / queryLength;
        
        // Усиление за частоту встречаемости
        score *= (1 + Math.log(1 + doc.totalFrequency));
        
        // Нормализация по длине документа
        // Короткие документы с совпадениями обычно релевантнее длинных
        if (metadata) {
            score *= (1 / Math.log(2 + metadata.tokenCount));
        }
        
        return score;
    }
    
    /**
     * Возвращает статистику индекса.
     */
    getStats() {
        return {
            ...this.stats,
            indexSize: this.invertedIndex.size
        };
    }
}

/**
 * ============================================================================
 * BUSINESS LOGIC CONTAINER
 * ============================================================================
 * 
 * Это контейнер, который объединяет всю бизнес-логику в один модуль.
 * Именно этот объект мы передадим компилятору для трансформации в WASM.
 * 
 * Обратите внимание на структуру - это чистая бизнес-логика без каких-либо
 * зависимостей от браузерных API. Всё самодостаточно и изолировано.
 */
class BusinessLogicModule {
    constructor() {
        this.vfs = new VirtualFileSystem();
        this.searchIndex = new SearchIndex(this.vfs);
        
        // Инициализируем демо-данные
        this.initializeDemoData();
    }
    
    /**
     * Создаёт демонстрационные данные.
     * 
     * Для тестирования системы создаём несколько файлов с разным содержимым.
     * Это позволит продемонстрировать работу поиска и индексирования.
     */
    initializeDemoData() {
        // Создаём структуру директорий
        this.vfs.createDirectory('/documents');
        this.vfs.createDirectory('/projects');
        this.vfs.createDirectory('/notes');
        
        // Создаём файлы с содержимым
        this.vfs.createFile('/documents/readme.txt', 
            'Welcome to the revolutionary WASM-powered virtual file system. ' +
            'This system demonstrates how entire business logic can be compiled ' +
            'to WebAssembly for maximum performance.'
        );
        
        this.vfs.createFile('/documents/guide.txt',
            'This guide explains how to use the file system. You can create, ' +
            'read, write, and delete files. The search functionality allows ' +
            'finding files by content.'
        );
        
        this.vfs.createFile('/projects/proposal.txt',
            'Project proposal for implementing AI-optimized WASM compilation. ' +
            'The system will analyze code performance and automatically compile ' +
            'hot paths to WebAssembly for better performance.'
        );
        
        this.vfs.createFile('/notes/ideas.txt',
            'Ideas for future improvements: better search ranking algorithms, ' +
            'support for binary files, implement file permissions system.'
        );
        
        // Индексируем все файлы
        const files = [
            '/documents/readme.txt',
            '/documents/guide.txt',
            '/projects/proposal.txt',
            '/notes/ideas.txt'
        ];
        
        for (const file of files) {
            this.searchIndex.indexFile(file);
        }
    }
    
    /**
     * Возвращает статус всей системы.
     */
    getSystemStatus() {
        return {
            vfs: this.vfs.getStats(),
            search: this.searchIndex.getStats()
        };
    }
}

// Экспорт классов
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        VirtualFileSystem,
        SearchIndex,
        BusinessLogicModule
    };
}

if (typeof window !== 'undefined') {
    window.BusinessLogic = {
        VirtualFileSystem,
        SearchIndex,
        BusinessLogicModule
    };
}
