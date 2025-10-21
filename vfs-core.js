/**
 * ============================================================================
 * VIRTUAL FILE SYSTEM CORE - STAGE 3
 * ============================================================================
 * 
 * Этот модуль реализует полнофункциональную виртуальную файловую систему,
 * которая работает целиком в памяти браузера. Думайте о ней как о 
 * виртуальном жёстком диске, который существует только для вашего приложения.
 * 
 * Философия проектирования:
 * 
 * Традиционные файловые системы (как ext4, NTFS, HFS+) невероятно сложны,
 * потому что они должны обрабатывать реальное железо - физические диски,
 * секторы, сбои питания, фрагментацию. Наша виртуальная файловая система
 * работает в идеальном мире памяти JavaScript, поэтому мы можем
 * сосредоточиться на чистоте API и производительности, не беспокоясь о
 * низкоуровневых деталях железа.
 * 
 * Однако мы заимствуем проверенные концепции из реальных ФС:
 * 
 * 1. Inodes - каждый файл и папка имеет уникальный идентификатор (inode)
 *    и набор метаданных (размер, дата создания, права доступа)
 * 
 * 2. Иерархия путей - файлы организованы в древовидную структуру папок,
 *    как в любой современной ОС
 * 
 * 3. Разделение метаданных и данных - информация о файле хранится отдельно
 *    от содержимого файла, что позволяет быстро получать список файлов
 *    без загрузки их содержимого
 * 
 * 4. Кэширование - часто используемые данные кэшируются в памяти для
 *    мгновенного доступа
 * 
 * Интеграция с MicroISA:
 * 
 * Каждая файловая операция регистрируется в виртуальной машине как
 * отдельная инструкция. Это позволяет нам отслеживать паттерны доступа
 * к файлам, измерять производительность операций, и в будущем использовать
 * эту информацию для предсказательного кэширования.
 */

/**
 * Базовый класс для всех объектов файловой системы (файлов и директорий).
 * 
 * В Unix-подобных системах есть философия "всё есть файл" - и обычные файлы,
 * и директории, и даже устройства представлены как файлы. Мы следуем этому
 * принципу, создав базовый класс FSNode, от которого наследуются File и
 * Directory. Это даёт нам единообразный API для работы с любыми объектами
 * файловой системы.
 */
class FSNode {
    constructor(name, type, parent = null) {
        // Уникальный идентификатор этого узла (inode number в терминологии Unix)
        // Мы используем временную метку + случайное число для гарантии уникальности
        this.id = Date.now() + Math.random().toString(36).substr(2, 9);
        
        // Имя файла или директории
        this.name = name;
        
        // Тип узла: 'file' или 'directory'
        this.type = type;
        
        // Ссылка на родительскую директорию (null для корневой директории)
        this.parent = parent;
        
        // Метаданные - информация о файле, которая не является его содержимым
        this.metadata = {
            created: new Date(),      // Время создания
            modified: new Date(),     // Время последней модификации
            accessed: new Date(),     // Время последнего доступа
            size: 0,                  // Размер в байтах
            permissions: 0o755,       // Права доступа в восьмеричной системе (rwxr-xr-x)
            owner: 'user',           // Владелец файла
            group: 'staff',          // Группа
            hidden: false            // Скрыт ли файл
        };
        
        // Теги для организации и поиска (аналог macOS tags)
        this.tags = new Set();
    }
    
    /**
     * Возвращает полный путь от корня до этого узла.
     * 
     * Мы строим путь, поднимаясь по цепочке родителей до корня.
     * Это стандартная операция в древовидных структурах данных.
     * 
     * @returns {string} Полный путь, например "/Documents/Work/report.txt"
     */
    getPath() {
        if (this.parent === null) {
            // Корневая директория
            return '/';
        }
        
        // Рекурсивно строим путь, поднимаясь к родителям
        const parentPath = this.parent.getPath();
        
        // Если родитель - корень, не добавляем лишний слеш
        if (parentPath === '/') {
            return '/' + this.name;
        }
        
        return parentPath + '/' + this.name;
    }
    
    /**
     * Обновляет время последнего доступа к файлу.
     * 
     * Это важно для кэширования - файлы, к которым давно не обращались,
     * можно выгрузить из кэша. Также это полезная информация для пользователя.
     */
    touch() {
        this.metadata.accessed = new Date();
    }
    
    /**
     * Добавляет тег к файлу для организации.
     * 
     * @param {string} tag - Название тега
     */
    addTag(tag) {
        this.tags.add(tag.toLowerCase());
        this.metadata.modified = new Date();
    }
    
    /**
     * Удаляет тег.
     * 
     * @param {string} tag - Название тега
     */
    removeTag(tag) {
        this.tags.delete(tag.toLowerCase());
        this.metadata.modified = new Date();
    }
    
    /**
     * Проверяет, есть ли у файла определённый тег.
     * 
     * @param {string} tag - Название тега
     * @returns {boolean}
     */
    hasTag(tag) {
        return this.tags.has(tag.toLowerCase());
    }
    
    /**
     * Возвращает сериализуемое представление узла для сохранения.
     * 
     * JavaScript объекты с Set и Date не могут быть напрямую сохранены в JSON,
     * поэтому мы преобразуем их в простые типы данных.
     * 
     * @returns {Object} JSON-сериализуемый объект
     */
    serialize() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            metadata: {
                ...this.metadata,
                created: this.metadata.created.toISOString(),
                modified: this.metadata.modified.toISOString(),
                accessed: this.metadata.accessed.toISOString()
            },
            tags: Array.from(this.tags)
        };
    }
}

/**
 * Класс для представления файла в файловой системе.
 * 
 * Файл содержит данные - это может быть текст, JSON, бинарные данные,
 * всё что угодно. Мы храним содержимое как строку или ArrayBuffer.
 */
class File extends FSNode {
    constructor(name, content = '', mimeType = 'text/plain', parent = null) {
        super(name, 'file', parent);
        
        // Содержимое файла
        this._content = content;
        
        // MIME-тип определяет, какого рода данные содержит файл
        // Это важно для правильной обработки: text/plain, application/json, image/png и т.д.
        this.mimeType = mimeType;
        
        // Обновляем размер на основе содержимого
        this.updateSize();
    }
    
    /**
     * Получает содержимое файла.
     * 
     * Мы используем геттер, чтобы автоматически обновлять время доступа
     * каждый раз, когда кто-то читает файл.
     * 
     * @returns {string|ArrayBuffer} Содержимое файла
     */
    get content() {
        this.touch(); // Обновляем время доступа
        return this._content;
    }
    
    /**
     * Устанавливает содержимое файла.
     * 
     * Когда содержимое изменяется, мы обновляем метаданные - размер и
     * время модификации.
     * 
     * @param {string|ArrayBuffer} newContent - Новое содержимое
     */
    set content(newContent) {
        this._content = newContent;
        this.metadata.modified = new Date();
        this.updateSize();
    }
    
    /**
     * Вычисляет и обновляет размер файла на основе содержимого.
     * 
     * Для строк размер - это количество байт в UTF-8 кодировке.
     * Один символ может занимать от 1 до 4 байт в UTF-8.
     */
    updateSize() {
        if (typeof this._content === 'string') {
            // Используем TextEncoder для точного подсчёта байт
            this.metadata.size = new TextEncoder().encode(this._content).length;
        } else if (this._content instanceof ArrayBuffer) {
            this.metadata.size = this._content.byteLength;
        } else {
            this.metadata.size = 0;
        }
    }
    
    /**
     * Дописывает данные в конец файла.
     * 
     * Это эффективнее, чем каждый раз перезаписывать весь файл,
     * особенно для логов или больших файлов.
     * 
     * @param {string} data - Данные для добавления
     */
    append(data) {
        if (typeof this._content === 'string') {
            this._content += data;
        } else {
            // Для бинарных данных нужно создать новый буфер
            console.warn('Append not supported for binary files, use write instead');
        }
        this.metadata.modified = new Date();
        this.updateSize();
    }
    
    /**
     * Возвращает расширение файла (например, "txt", "json", "png").
     * 
     * @returns {string} Расширение файла или пустую строку
     */
    getExtension() {
        const parts = this.name.split('.');
        return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
    }
    
    /**
     * Проверяет, является ли файл текстовым на основе MIME-типа.
     * 
     * @returns {boolean}
     */
    isText() {
        return this.mimeType.startsWith('text/') || 
               this.mimeType === 'application/json' ||
               this.mimeType === 'application/javascript';
    }
    
    /**
     * Сериализует файл для сохранения.
     * 
     * @returns {Object}
     */
    serialize() {
        const base = super.serialize();
        return {
            ...base,
            content: this._content,
            mimeType: this.mimeType
        };
    }
}

/**
 * Класс для представления директории (папки) в файловой системе.
 * 
 * Директория - это контейнер для файлов и других директорий.
 * Она поддерживает древовидную структуру файловой системы.
 */
class Directory extends FSNode {
    constructor(name, parent = null) {
        super(name, 'directory', parent);
        
        // Map для быстрого доступа к дочерним элементам по имени
        // Map обеспечивает O(1) сложность для поиска, что критично для производительности
        this.children = new Map();
    }
    
    /**
     * Добавляет файл или директорию в эту директорию.
     * 
     * @param {FSNode} node - Узел для добавления
     * @throws {Error} Если узел с таким именем уже существует
     */
    addChild(node) {
        if (this.children.has(node.name)) {
            throw new Error(`Item '${node.name}' already exists in ${this.getPath()}`);
        }
        
        // Устанавливаем родителя
        node.parent = this;
        
        // Добавляем в Map
        this.children.set(node.name, node);
        
        // Обновляем время модификации директории
        this.metadata.modified = new Date();
        
        // Пересчитываем размер директории (сумма размеров всех детей)
        this.updateSize();
    }
    
    /**
     * Удаляет дочерний элемент по имени.
     * 
     * @param {string} name - Имя элемента для удаления
     * @returns {boolean} true если элемент был удалён
     */
    removeChild(name) {
        const removed = this.children.delete(name);
        
        if (removed) {
            this.metadata.modified = new Date();
            this.updateSize();
        }
        
        return removed;
    }
    
    /**
     * Получает дочерний элемент по имени.
     * 
     * @param {string} name - Имя элемента
     * @returns {FSNode|undefined}
     */
    getChild(name) {
        return this.children.get(name);
    }
    
    /**
     * Проверяет, существует ли дочерний элемент с данным именем.
     * 
     * @param {string} name - Имя элемента
     * @returns {boolean}
     */
    hasChild(name) {
        return this.children.has(name);
    }
    
    /**
     * Возвращает массив всех дочерних элементов.
     * 
     * @returns {Array<FSNode>}
     */
    getChildren() {
        return Array.from(this.children.values());
    }
    
    /**
     * Возвращает массив только файлов (без директорий).
     * 
     * @returns {Array<File>}
     */
    getFiles() {
        return this.getChildren().filter(child => child.type === 'file');
    }
    
    /**
     * Возвращает массив только директорий (без файлов).
     * 
     * @returns {Array<Directory>}
     */
    getDirectories() {
        return this.getChildren().filter(child => child.type === 'directory');
    }
    
    /**
     * Рекурсивно обходит все файлы в директории и поддиректориях.
     * 
     * Это важная операция для индексирования - нам нужно пройти по всем
     * файлам в системе и добавить их в индекс.
     * 
     * @param {Function} callback - Функция, вызываемая для каждого файла
     */
    walkFiles(callback) {
        for (const child of this.children.values()) {
            if (child.type === 'file') {
                callback(child);
            } else if (child.type === 'directory') {
                // Рекурсивно обходим поддиректории
                child.walkFiles(callback);
            }
        }
    }
    
    /**
     * Подсчитывает общее количество файлов в директории (рекурсивно).
     * 
     * @returns {number}
     */
    countFiles() {
        let count = 0;
        this.walkFiles(() => count++);
        return count;
    }
    
    /**
     * Обновляет размер директории (сумма размеров всех детей).
     */
    updateSize() {
        let totalSize = 0;
        
        for (const child of this.children.values()) {
            totalSize += child.metadata.size;
        }
        
        this.metadata.size = totalSize;
    }
    
    /**
     * Очищает директорию, удаляя все дочерние элементы.
     */
    clear() {
        this.children.clear();
        this.metadata.modified = new Date();
        this.updateSize();
    }
    
    /**
     * Проверяет, пуста ли директория.
     * 
     * @returns {boolean}
     */
    isEmpty() {
        return this.children.size === 0;
    }
    
    /**
     * Сериализует директорию и всех детей для сохранения.
     * 
     * @returns {Object}
     */
    serialize() {
        const base = super.serialize();
        return {
            ...base,
            children: Array.from(this.children.values()).map(child => child.serialize())
        };
    }
}

/**
 * ============================================================================
 * VIRTUAL FILE SYSTEM - Главный класс
 * ============================================================================
 * 
 * Это центральный интерфейс для работы с виртуальной файловой системой.
 * Он управляет корневой директорией и предоставляет высокоуровневый API
 * для всех файловых операций.
 */
class VirtualFileSystem {
    constructor(microISAVM = null) {
        // Ссылка на MicroISA VM для телеметрии
        this.vm = microISAVM;
        
        // Корневая директория - начало всей иерархии
        this.root = new Directory('root', null);
        
        // Текущая рабочая директория (current working directory)
        // По умолчанию это корень, но пользователь может менять её
        this.cwd = this.root;
        
        // Кэш для быстрого доступа к часто используемым файлам
        // Ключ - путь к файлу, значение - объект File
        this.cache = new Map();
        
        // Максимальный размер кэша в количестве файлов
        this.maxCacheSize = 100;
        
        // Статистика для телеметрии
        this.stats = {
            totalReads: 0,
            totalWrites: 0,
            totalDeletes: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        // Создаём базовую структуру директорий (как в macOS)
        this.initializeDefaultStructure();
        
        console.log('✓ Virtual File System initialized');
        console.log('  Root:', this.root.getPath());
        console.log('  Cache size limit:', this.maxCacheSize, 'files');
    }
    
    /**
     * Создаёт стандартную структуру директорий, как в macOS.
     * 
     * Это даёт пользователю знакомую отправную точку и организованное
     * пространство для файлов.
     */
    initializeDefaultStructure() {
        const defaultDirs = [
            'Desktop',
            'Documents',
            'Downloads',
            'Pictures',
            'Music',
            'Videos',
            'Applications'
        ];
        
        for (const dirName of defaultDirs) {
            this.root.addChild(new Directory(dirName, this.root));
        }
        
        console.log('  Created default directories:', defaultDirs.join(', '));
    }
    
    /**
     * Разбирает путь на компоненты.
     * 
     * Путь может быть абсолютным (/Documents/file.txt) или относительным
     * (./file.txt, ../other/file.txt). Эта функция нормализует путь и
     * разбивает его на части для навигации.
     * 
     * @param {string} path - Путь для разбора
     * @returns {Array<string>} Массив компонентов пути
     */
    parsePath(path) {
        // Удаляем лишние пробелы
        path = path.trim();
        
        // Разбиваем по слешам и фильтруем пустые компоненты
        let parts = path.split('/').filter(p => p.length > 0);
        
        // Обрабатываем относительные пути (. и ..)
        const normalized = [];
        
        for (const part of parts) {
            if (part === '.') {
                // Текущая директория - игнорируем
                continue;
            } else if (part === '..') {
                // Родительская директория - поднимаемся на уровень вверх
                if (normalized.length > 0) {
                    normalized.pop();
                }
            } else {
                normalized.push(part);
            }
        }
        
        return normalized;
    }
    
    /**
     * Находит узел файловой системы по пути.
     * 
     * Это базовая операция навигации - мы идём от корня (или текущей директории)
     * по цепочке имён, пока не найдём нужный узел.
     * 
     * @param {string} path - Путь к узлу
     * @param {Directory} startDir - Директория, с которой начинать (по умолчанию корень)
     * @returns {FSNode|null} Найденный узел или null
     */
    resolvePath(path, startDir = null) {
        // Регистрируем операцию в VM
        if (this.vm) {
            this.vm.executeInstruction('PATH_RESOLVE', { path });
        }
        
        // Определяем начальную директорию
        let current = path.startsWith('/') ? this.root : (startDir || this.cwd);
        
        // Разбираем путь
        const parts = this.parsePath(path);
        
        // Если путь пустой (корень), возвращаем начальную директорию
        if (parts.length === 0) {
            return current;
        }
        
        // Идём по компонентам пути
        for (const part of parts) {
            if (current.type !== 'directory') {
                // Пытаемся навигировать через файл - ошибка
                return null;
            }
            
            const next = current.getChild(part);
            
            if (!next) {
                // Компонент не найден
                return null;
            }
            
            current = next;
        }
        
        return current;
    }
    
    /**
     * Создаёт новый файл.
     * 
     * @param {string} path - Путь к файлу
     * @param {string} content - Содержимое файла
     * @param {string} mimeType - MIME-тип файла
     * @returns {File|null} Созданный файл или null в случае ошибки
     */
    createFile(path, content = '', mimeType = 'text/plain') {
        // Регистрируем операцию в VM
        if (this.vm) {
            this.vm.executeInstruction('FILE_CREATE', { path, size: content.length });
        }
        
        try {
            // Разделяем путь на директорию и имя файла
            const parts = this.parsePath(path);
            const fileName = parts.pop();
            
            if (!fileName) {
                console.error('Invalid file path:', path);
                return null;
            }
            
            // Находим родительскую директорию
            const parentPath = parts.length > 0 ? '/' + parts.join('/') : '/';
            const parentDir = this.resolvePath(parentPath);
            
            if (!parentDir || parentDir.type !== 'directory') {
                console.error('Parent directory not found:', parentPath);
                return null;
            }
            
            // Проверяем, не существует ли файл уже
            if (parentDir.hasChild(fileName)) {
                console.error('File already exists:', path);
                return null;
            }
            
            // Создаём файл
            const file = new File(fileName, content, mimeType, parentDir);
            parentDir.addChild(file);
            
            // Обновляем статистику
            this.stats.totalWrites++;
            
            console.log('✓ File created:', file.getPath(), `(${file.metadata.size} bytes)`);
            
            return file;
            
        } catch (error) {
            console.error('Failed to create file:', error);
            return null;
        }
    }
    
    /**
     * Читает содержимое файла.
     * 
     * @param {string} path - Путь к файлу
     * @returns {string|ArrayBuffer|null} Содержимое файла или null
     */
    readFile(path) {
        // Сначала проверяем кэш
        if (this.cache.has(path)) {
            this.stats.cacheHits++;
            const file = this.cache.get(path);
            
            // Регистрируем операцию в VM
            if (this.vm) {
                this.vm.executeInstruction('FILE_READ', { 
                    path, 
                    size: file.metadata.size,
                    cached: true 
                });
            }
            
            return file.content;
        }
        
        // Кэш промах - ищем файл в файловой системе
        this.stats.cacheMisses++;
        
        const node = this.resolvePath(path);
        
        if (!node) {
            console.error('File not found:', path);
            return null;
        }
        
        if (node.type !== 'file') {
            console.error('Path is not a file:', path);
            return null;
        }
        
        // Добавляем в кэш
        this.addToCache(path, node);
        
        // Регистрируем операцию в VM
        if (this.vm) {
            this.vm.executeInstruction('FILE_READ', { 
                path, 
                size: node.metadata.size,
                cached: false 
            });
        }
        
        // Обновляем статистику
        this.stats.totalReads++;
        
        return node.content;
    }
    
    /**
     * Записывает данные в файл (перезаписывает существующий или создаёт новый).
     * 
     * @param {string} path - Путь к файлу
     * @param {string} content - Новое содержимое
     * @param {string} mimeType - MIME-тип (используется только при создании нового файла)
     * @returns {boolean} true если успешно
     */
    writeFile(path, content, mimeType = 'text/plain') {
        const node = this.resolvePath(path);
        
        if (node) {
            // Файл существует - перезаписываем
            if (node.type !== 'file') {
                console.error('Path is not a file:', path);
                return false;
            }
            
            node.content = content;
            
            // Обновляем кэш
            this.cache.set(path, node);
            
            // Регистрируем операцию в VM
            if (this.vm) {
                this.vm.executeInstruction('FILE_WRITE', { 
                    path, 
                    size: content.length 
                });
            }
            
            this.stats.totalWrites++;
            
            console.log('✓ File updated:', path, `(${node.metadata.size} bytes)`);
            
            return true;
        } else {
            // Файл не существует - создаём новый
            const file = this.createFile(path, content, mimeType);
            return file !== null;
        }
    }
    
    /**
     * Создаёт новую директорию.
     * 
     * @param {string} path - Путь к директории
     * @returns {Directory|null} Созданная директория или null
     */
    createDirectory(path) {
        // Регистрируем операцию в VM
        if (this.vm) {
            this.vm.executeInstruction('DIR_CREATE', { path });
        }
        
        try {
            const parts = this.parsePath(path);
            const dirName = parts.pop();
            
            if (!dirName) {
                console.error('Invalid directory path:', path);
                return null;
            }
            
            // Находим родительскую директорию
            const parentPath = parts.length > 0 ? '/' + parts.join('/') : '/';
            const parentDir = this.resolvePath(parentPath);
            
            if (!parentDir || parentDir.type !== 'directory') {
                console.error('Parent directory not found:', parentPath);
                return null;
            }
            
            // Проверяем, не существует ли директория уже
            if (parentDir.hasChild(dirName)) {
                console.error('Directory already exists:', path);
                return null;
            }
            
            // Создаём директорию
            const dir = new Directory(dirName, parentDir);
            parentDir.addChild(dir);
            
            console.log('✓ Directory created:', dir.getPath());
            
            return dir;
            
        } catch (error) {
            console.error('Failed to create directory:', error);
            return null;
        }
    }
    
    /**
     * Удаляет файл или директорию.
     * 
     * @param {string} path - Путь к удаляемому объекту
     * @param {boolean} recursive - Рекурсивное удаление для непустых директорий
     * @returns {boolean} true если успешно
     */
    delete(path, recursive = false) {
        const node = this.resolvePath(path);
        
        if (!node) {
            console.error('Path not found:', path);
            return false;
        }
        
        if (node === this.root) {
            console.error('Cannot delete root directory');
            return false;
        }
        
        // Проверяем, не пустая ли директория
        if (node.type === 'directory' && !node.isEmpty() && !recursive) {
            console.error('Directory not empty, use recursive=true:', path);
            return false;
        }
        
        // Удаляем из родительской директории
        const parent = node.parent;
        parent.removeChild(node.name);
        
        // Удаляем из кэша
        this.cache.delete(path);
        
        // Регистрируем операцию в VM
        if (this.vm) {
            this.vm.executeInstruction('FILE_DELETE', { path });
        }
        
        this.stats.totalDeletes++;
        
        console.log('✓ Deleted:', path);
        
        return true;
    }
    
    /**
     * Добавляет файл в кэш, управляя размером кэша.
     * 
     * @param {string} path - Путь к файлу
     * @param {File} file - Объект файла
     */
    addToCache(path, file) {
        // Если кэш полон, удаляем самый старый элемент (FIFO стратегия)
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(path, file);
    }
    
    /**
     * Очищает кэш файлов.
     */
    clearCache() {
        this.cache.clear();
        console.log('✓ Cache cleared');
    }
    
    /**
     * Возвращает статистику файловой системы.
     * 
     * @returns {Object}
     */
    getStats() {
        return {
            ...this.stats,
            totalFiles: this.root.countFiles(),
            cacheSize: this.cache.size,
            cacheHitRate: this.stats.totalReads > 0 
                ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(1) + '%'
                : '0%'
        };
    }
    
    /**
     * Сериализует всю файловую систему для сохранения в IndexedDB или localStorage.
     * 
     * @returns {Object}
     */
    serialize() {
        return {
            root: this.root.serialize(),
            stats: this.stats,
            version: '1.0'
        };
    }
    
    /**
     * Восстанавливает файловую систему из сериализованных данных.
     * 
     * @param {Object} data - Сериализованные данные
     */
    deserialize(data) {
        // TODO: Реализовать восстановление файловой системы
        // Это будет важно для сохранения данных между сеансами
        console.log('Deserialize not implemented yet');
    }
}

// Экспорт классов
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FSNode,
        File,
        Directory,
        VirtualFileSystem
    };
}

if (typeof window !== 'undefined') {
    window.VFS = {
        FSNode,
        File,
        Directory,
        VirtualFileSystem
    };
}
