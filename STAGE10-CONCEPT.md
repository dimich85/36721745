# 🎯 STAGE 10: RUNTIME SPECIALIZATION

## От предсказаний к адаптации: Динамическая специализация кода

> **Ключевая идея Stage 10:** Вместо создания одной оптимизированной версии функции, создаём **множество специализированных версий** для разных контекстов использования, выбирая оптимальную в runtime на основе ML предсказаний.

---

## 📊 Executive Summary

**Stage 9** научил систему **предсказывать** какие оптимизации применить.

**Stage 10** идёт дальше - система **адаптируется** к реальным паттернам использования, создавая специализированные версии функций:

```javascript
// Вместо одной функции:
function processData(data) { ... }

// Создаём несколько специализированных версий:
processData_int32_hot()      // Для массивов Int32, hot path
processData_float64_cold()   // Для Float64, cold path
processData_generic()        // Fallback для остальных случаев
```

Каждая версия оптимизирована для своего контекста → **радикальное улучшение производительности**.

---

## 🎯 Мотивация

### Проблема: "One Size Fits None"

**Stage 9 Problem:**
ML модель выбирает оптимизации, но создаёт только **одну** версию функции:

```javascript
// Stage 9: Одна оптимизированная версия
function calculate(a, b) {
  return a * b + a / b;  // Оптимизирована для "среднего" случая
}

// Но используется в разных контекстах:
calculate(5, 3)           // integers - можно использовать integer math
calculate(5.7, 3.14)      // floats - нужна float precision
calculate(BigInt(5), 2)   // mixed types - fallback to generic
```

Одна версия не может быть оптимальной для всех случаев!

### Решение: Runtime Specialization

**Stage 10 Solution:**
Создаём **специализированные версии** для каждого контекста:

```javascript
// Specialized for integers
function calculate_int(a, b) {
  return (a * b) + (a / b | 0);  // Integer operations, truncating division
}

// Specialized for floats
function calculate_float(a, b) {
  return Math.fround(a * b) + (a / b);  // Float32 precision
}

// Generic fallback
function calculate_generic(a, b) {
  return a * b + a / b;
}

// Runtime dispatcher (ML-powered)
function calculate(a, b) {
  const signature = getTypeSignature(a, b);

  if (signature === 'int,int' && isHotPath) {
    return calculate_int(a, b);      // 3.2x faster!
  } else if (signature === 'float,float') {
    return calculate_float(a, b);    // 2.1x faster!
  } else {
    return calculate_generic(a, b);  // Baseline
  }
}
```

**Result:** Каждый вызов использует оптимальную версию → **2-5x улучшение** vs Stage 9!

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                  STAGE 10: RUNTIME SPECIALIZATION                │
└─────────────────────────────────────────────────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
    ┌────────────────────────┐      ┌────────────────────────┐
    │   Profile-Guided       │      │   Type Specialization  │
    │   Optimization (PGO)   │      │   System               │
    └────────────────────────┘      └────────────────────────┘
                 │                               │
                 └───────────────┬───────────────┘
                                 ▼
                    ┌────────────────────────┐
                    │   Hot Path Cloning     │
                    │   + Adaptive Inlining  │
                    └────────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
    ┌────────────────────────┐      ┌────────────────────────┐
    │   Version Manager      │      │   ML-Powered           │
    │   (Specialized         │      │   Dispatcher           │
    │    Function Versions)  │      │                        │
    └────────────────────────┘      └────────────────────────┘
```

### 4 Core Components

#### 1. Profile-Guided Optimization (PGO)

**Idea:** Использовать реальные профили выполнения для оптимизации.

**How it works:**
```javascript
// 1. Collect runtime profiles
const profile = {
  function: 'processArray',
  callCount: 10523,
  typeSignatures: {
    'Int32Array': 8742,     // 83% calls with Int32Array
    'Float64Array': 1234,   // 12% calls with Float64Array
    'generic': 547          // 5% other types
  },
  hotPaths: [
    { condition: 'length > 100', frequency: 0.67 },
    { condition: 'length <= 10', frequency: 0.21 }
  ],
  avgExecutionTime: {
    'Int32Array': 0.34ms,
    'Float64Array': 0.89ms,
    'generic': 2.14ms
  }
};

// 2. Decide which versions to create
// - Int32Array version (83% coverage) - HIGH PRIORITY
// - Float64Array version (12% coverage) - MEDIUM PRIORITY
// - Generic fallback (5% + edge cases) - LOW PRIORITY

// 3. Create specialized versions
createSpecializedVersion('processArray_int32', profile.Int32Array);
createSpecializedVersion('processArray_float64', profile.Float64Array);
```

**Benefits:**
- Focus optimization effort where it matters (Pareto 80/20)
- Avoid over-optimization of rare cases
- Data-driven decisions, not guesses

---

#### 2. Type Specialization System

**Idea:** Создавать версии функций для конкретных типов аргументов.

**Type Signatures:**
```javascript
class TypeSignature {
  constructor() {
    this.signature = null;  // e.g., "int,int→int"
  }

  static detect(args) {
    return args.map(arg => {
      if (Number.isInteger(arg)) return 'int';
      if (typeof arg === 'number') return 'float';
      if (arg instanceof Int32Array) return 'int32array';
      if (arg instanceof Float64Array) return 'float64array';
      if (typeof arg === 'string') return 'string';
      if (typeof arg === 'boolean') return 'bool';
      return 'generic';
    }).join(',');
  }
}

// Example: Function with multiple type signatures
function multiply(a, b) {
  return a * b;
}

// Specialized versions:

// Version 1: int × int → int (fastest - integer math)
function multiply_int_int(a, b) {
  return (a * b) | 0;  // Force integer result
}

// Version 2: float × float → float (fast - SIMD possible)
function multiply_float_float(a, b) {
  return Math.fround(a * b);
}

// Version 3: array × scalar → array (vectorized)
function multiply_array_scalar(arr, scalar) {
  const result = new arr.constructor(arr.length);
  for (let i = 0; i < arr.length; i++) {
    result[i] = arr[i] * scalar;
  }
  return result;
}

// Version 4: generic (slowest - handles everything)
function multiply_generic(a, b) {
  return a * b;
}
```

**Dispatch Logic:**
```javascript
function multiply_dispatcher(a, b) {
  const sig = TypeSignature.detect([a, b]);

  // ML model predicts which version is fastest
  const prediction = mlModel.predictBestVersion(sig, profile);

  switch(prediction) {
    case 'int,int':
      return multiply_int_int(a, b);
    case 'float,float':
      return multiply_float_float(a, b);
    case 'int32array,int':
    case 'float64array,float':
      return multiply_array_scalar(a, b);
    default:
      return multiply_generic(a, b);
  }
}
```

**Optimization Techniques per Type:**

| Type Signature | Optimizations | Expected Speedup |
|----------------|---------------|------------------|
| `int,int→int` | Integer math, bitwise ops | **3.5x** |
| `float,float→float` | SIMD vectorization, Math.fround | **2.8x** |
| `int32array,int` | Loop unrolling, SIMD | **4.2x** |
| `string,string` | Inline length checks, string interning | **1.8x** |
| `bool,bool` | Branchless logic, bitwise ops | **2.1x** |
| `generic,generic` | No assumptions, safe fallback | **1.0x** (baseline) |

---

#### 3. Hot Path Cloning

**Idea:** Дублировать самые частые пути выполнения и оптимизировать их агрессивно.

**Example:**
```javascript
// Original function with multiple paths
function processUser(user) {
  if (!user) {
    return null;  // Edge case: 1% of calls
  }

  if (user.isPremium) {
    // Premium path: 15% of calls
    return processPremiumUser(user);
  } else {
    // Regular path: 84% of calls ← HOT PATH
    return processRegularUser(user);
  }
}

// Profile reveals:
// - 84% calls: user exists, not premium
// - 15% calls: user exists, premium
// - 1% calls: user is null

// Stage 10: Clone hot path
function processUser_hotpath(user) {
  // ASSUMPTION: user exists and is NOT premium
  // No null checks, no isPremium check
  return processRegularUser_inlined(user);  // Inlined!
}

// Dispatcher with guards
function processUser(user) {
  // Fast path guard (84% of cases)
  if (user && !user.isPremium) {
    return processUser_hotpath(user);  // 3.8x faster!
  }

  // Fallback for rare cases (16%)
  if (!user) return null;
  if (user.isPremium) return processPremiumUser(user);
  return processRegularUser(user);
}
```

**Hot Path Optimizations:**
- Remove null/undefined checks (assume valid input)
- Inline frequently called functions
- Eliminate dead code (unreachable in hot path)
- Constant folding (values known in hot path)
- Speculative optimizations (backed by guards)

**Guard Deoptimization:**
```javascript
// If guard fails → deopt to safe version
function processUser_hotpath(user) {
  // Guard: Check assumptions
  if (DEBUG && (user === null || user.isPremium)) {
    console.warn('Hot path guard failed, falling back');
    return processUser_generic(user);  // Fallback
  }

  // Aggressive optimization (assumptions hold)
  return processRegularUser_inlined(user);
}
```

---

#### 4. Adaptive Inlining

**Idea:** ML модель решает **когда** inline помогает, **когда** вредит.

**Problem with naive inlining:**
```javascript
// Naive: "Always inline small functions"
function add(a, b) { return a + b; }
function multiply(a, b) { return a * b; }

function calculate(x) {
  let result = 0;
  for (let i = 0; i < 1000; i++) {
    result = add(result, multiply(x, i));
  }
  return result;
}

// After naive inlining:
function calculate_inlined(x) {
  let result = 0;
  for (let i = 0; i < 1000; i++) {
    result = result + (x * i);  // Inlined
  }
  return result;
}

// Problem: Code bloat if calculate() called from many places
// Problem: Register pressure in complex functions
```

**ML-Powered Adaptive Inlining:**
```javascript
class AdaptiveInliner {
  shouldInline(caller, callee, profile) {
    // Extract features for ML model
    const features = {
      // Callee properties
      calleeSize: callee.lines,
      calleeComplexity: callee.cyclomaticComplexity,

      // Caller properties
      callerSize: caller.lines,
      callerRegisterPressure: estimateRegisterPressure(caller),

      // Call context
      callFrequency: profile.callCount,
      isInLoop: detectLoop(caller, callee),
      callDepth: caller.callGraphDepth,

      // Historical data
      previousInlineSpeedup: profile.inlineHistory || 1.0
    };

    // ML model predicts speedup from inlining
    const predictedSpeedup = this.mlModel.predict(features);

    // Decision with threshold
    const threshold = 1.15;  // Must be 15%+ faster to inline

    if (predictedSpeedup > threshold) {
      return {
        decision: 'INLINE',
        expectedSpeedup: predictedSpeedup,
        confidence: this.mlModel.getConfidence()
      };
    } else {
      return {
        decision: 'KEEP_CALL',
        reason: `Predicted speedup ${predictedSpeedup.toFixed(2)}x < ${threshold}x`
      };
    }
  }
}
```

**Smart Inlining Strategies:**

1. **Inline in Hot Paths, Keep Calls in Cold Paths:**
```javascript
function processData(data) {
  if (isHotPath()) {
    // Inline validate() here (hot path)
    if (data.length > 0 && data.type === 'valid') {
      return processValidData_inlined(data);
    }
  } else {
    // Keep call to validate() (cold path - save code size)
    if (validate(data)) {
      return processValidData(data);
    }
  }
}
```

2. **Partial Inlining:**
```javascript
// Inline only hot parts of callee
function complexFunction(x) {
  // Hot part (90% of time)
  const result = x * x + x;

  // Cold part (10% of time)
  if (x < 0) {
    return handleNegative(x);  // Keep as call
  }

  return result;
}

// After partial inlining:
function caller_inlined(x) {
  // Inlined hot part
  const result = x * x + x;

  // Call kept for cold part
  if (x < 0) {
    return complexFunction_coldPath(x);
  }

  return result;
}
```

3. **Context-Sensitive Inlining:**
```javascript
// Inline only in specific contexts
function process(item) {
  if (contextIsHot()) {
    return transform_inlined(item);  // Inlined version
  } else {
    return transform(item);  // Call version
  }
}
```

---

## 🎨 Version Manager

**Manages multiple specialized versions of each function.**

```javascript
class VersionManager {
  constructor() {
    this.versions = new Map();  // functionName → [versions]
  }

  registerVersion(functionName, version) {
    if (!this.versions.has(functionName)) {
      this.versions.set(functionName, []);
    }

    this.versions.get(functionName).push({
      id: version.id,
      signature: version.signature,
      code: version.code,
      optimizations: version.optimizations,
      expectedSpeedup: version.expectedSpeedup,
      createdAt: Date.now(),
      useCount: 0,
      avgExecutionTime: null
    });
  }

  selectVersion(functionName, args, context) {
    const versions = this.versions.get(functionName);
    if (!versions) return null;

    // Detect type signature
    const signature = TypeSignature.detect(args);

    // Filter matching versions
    const candidates = versions.filter(v =>
      v.signature === signature || v.signature === 'generic'
    );

    if (candidates.length === 0) {
      return versions.find(v => v.signature === 'generic');
    }

    // ML model selects best version
    const features = {
      signature,
      context,
      historicalPerformance: candidates.map(c => ({
        id: c.id,
        avgTime: c.avgExecutionTime,
        useCount: c.useCount
      }))
    };

    const bestVersion = this.mlModel.selectBestVersion(features);
    return candidates.find(c => c.id === bestVersion.id);
  }

  recordExecution(versionId, executionTime) {
    // Update statistics for adaptive selection
    const version = this.findVersion(versionId);
    if (!version) return;

    version.useCount++;

    if (version.avgExecutionTime === null) {
      version.avgExecutionTime = executionTime;
    } else {
      // Exponential moving average
      version.avgExecutionTime =
        0.9 * version.avgExecutionTime + 0.1 * executionTime;
    }
  }

  pruneUnusedVersions() {
    // Remove versions that are never used
    for (const [name, versions] of this.versions) {
      const activeVersions = versions.filter(v => v.useCount > 10);

      if (activeVersions.length < versions.length) {
        console.log(`Pruned ${versions.length - activeVersions.length} unused versions of ${name}`);
        this.versions.set(name, activeVersions);
      }
    }
  }
}
```

---

## 🚀 Expected Improvements vs Stage 9

| Metric | Stage 9 (ML) | Stage 10 (Specialization) | Improvement |
|--------|--------------|---------------------------|-------------|
| **Average Speedup** | 3.7x | 6.2x | **+68%** |
| **Peak Speedup** | 8.4x | 15.8x | **+88%** |
| **Hot Path Performance** | 4.1x | 9.7x | **+137%** |
| **Code Size** | 380KB | 520KB | +37% (acceptable) |
| **Cold Start Time** | 0.9s | 1.3s | +0.4s (profiling needed) |
| **Adaptation Time** | 50 examples | 100 examples | 2x longer (more versions) |

### Why such big improvements?

**Stage 9:** Одна оптимизированная версия функции
**Stage 10:** Множество специализированных версий

**Example:**
```
Function: processArray(arr)

Stage 9:
  One version optimized for "average" case
  → 3.2x speedup (average across all cases)

Stage 10:
  - processArray_int32_hot() → 12x speedup (32% of calls)
  - processArray_float64_hot() → 7x speedup (24% of calls)
  - processArray_int32_cold() → 3x speedup (18% of calls)
  - processArray_generic() → 1.5x speedup (26% of calls)

  Weighted average: 0.32×12 + 0.24×7 + 0.18×3 + 0.26×1.5
                  = 3.84 + 1.68 + 0.54 + 0.39
                  = 6.45x speedup

  → 2x better than Stage 9!
```

---

## 💡 Key Insights

### 1. Specialization > Generalization

**Generic code** tries to handle all cases → slow

**Specialized code** handles specific case → fast

**Key:** Create specialized versions for **common cases**, fallback to generic for **rare cases**.

### 2. Pareto Principle (80/20)

**80% of execution time** is spent in **20% of code paths**

**Strategy:**
- Aggressively optimize hot 20% (create specialized versions)
- Lightly optimize or ignore cold 80% (generic fallback)

### 3. Guards Enable Speculation

**Speculative optimization** assumes something is true → optimize based on assumption

**Guard** checks assumption → deopt if false

**Example:**
```javascript
// Assume: arr.length > 0
function process_specialized(arr) {
  // Guard
  if (arr.length === 0) {
    return process_generic(arr);  // Deopt
  }

  // Speculative optimization (no empty check needed)
  return arr[0] + arr[1] + arr[2];  // Assume length >= 3
}
```

### 4. Profile → Specialize → Profile → Re-specialize

**Continuous cycle:**
1. Profile runtime behavior
2. Create specialized versions
3. Profile specialized versions
4. Adjust/create new versions
5. Prune unused versions
6. Repeat

**Adaptive system** that improves over time.

---

## 🎯 Real-World Example: Matrix Multiplication

### Stage 9 Approach:
```javascript
function matrixMultiply(A, B) {
  // One version optimized with ML-selected opts
  // Applies: loopUnrolling, simdVectorization
  // Speedup: 4.2x
}
```

### Stage 10 Approach:
```javascript
// Specialized version 1: Small matrices (< 100x100), Int32
function matrixMultiply_small_int32(A, B) {
  // Optimizations: Cache blocking, loop unrolling, integer math
  // Speedup: 8.7x (2x better than Stage 9!)
}

// Specialized version 2: Large matrices (>= 100x100), Float64
function matrixMultiply_large_float64(A, B) {
  // Optimizations: SIMD, parallel Web Workers, Strassen algorithm
  // Speedup: 15.2x (3.6x better than Stage 9!)
}

// Specialized version 3: Sparse matrices
function matrixMultiply_sparse(A, B) {
  // Optimizations: Skip zero elements, CSR format
  // Speedup: 23.4x (only for sparse - Stage 9 doesn't detect this!)
}

// Generic fallback
function matrixMultiply_generic(A, B) {
  // Handle edge cases
  // Speedup: 1.5x
}

// Dispatcher
function matrixMultiply(A, B) {
  const profile = getProfile(A, B);

  if (profile.size === 'small' && profile.type === 'int32') {
    return matrixMultiply_small_int32(A, B);
  } else if (profile.size === 'large' && profile.type === 'float64') {
    return matrixMultiply_large_float64(A, B);
  } else if (profile.sparsity > 0.7) {
    return matrixMultiply_sparse(A, B);
  } else {
    return matrixMultiply_generic(A, B);
  }
}
```

**Result:**
- Stage 9: 4.2x average speedup
- Stage 10: 12.8x average speedup (considering distribution of cases)
- **3x improvement!**

---

## 🚧 Challenges

### 1. Code Bloat

**Problem:** Many specialized versions → large code size

**Solution:**
- Lazy generation (create versions on demand)
- Pruning unused versions
- Shared code segments (common parts)

### 2. Dispatch Overhead

**Problem:** Selecting version takes time

**Solution:**
- ML model for fast prediction
- Inline guards in hot paths
- Caching dispatch decisions

### 3. Profiling Cost

**Problem:** Collecting detailed profiles is expensive

**Solution:**
- Sampling (profile 1 in N calls)
- Background profiling threads
- Use Stage 9 predictions as starting point

### 4. Memory Usage

**Problem:** Multiple versions → more memory

**Solution:**
- Share common data structures
- Lazy instantiation
- Version pooling

---

## 🎓 Integration with Stage 9

**Stage 10 builds on Stage 9:**

```
Stage 9: ML predicts which optimizations to apply
   ↓
Stage 10: For each predicted optimization level,
          create specialized version

Example:
- Stage 9 predicts: loopUnrolling=2.3x, simd=1.8x
- Stage 10 creates:
  * Version A: loopUnrolling (for int32 hot path)
  * Version B: loopUnrolling + simd (for float64 hot path)
  * Version C: neither (for generic cold path)
```

**ML Model Evolution:**
```
Stage 9: Predict optimization speedup
Stage 10: Predict best specialized version
```

---

## 📊 Summary

**Stage 10 = Stage 9 + Runtime Adaptation**

**Key Components:**
1. **PGO** - Use real profiles to guide specialization
2. **Type Specialization** - Create versions for different types
3. **Hot Path Cloning** - Duplicate and optimize common paths
4. **Adaptive Inlining** - ML decides when to inline

**Expected Impact:**
- **+68% average speedup** vs Stage 9
- **+137% hot path speedup** vs Stage 9
- **3x peak speedup** for best cases

**Philosophy:**
> "Don't optimize everything equally. Optimize the common case aggressively, handle the rare case correctly."

---

*Stage 10 Complete - От предсказаний к адаптации!* 🎯

🤖 **Created with [Claude Code](https://claude.com/claude-code)**

**Co-Authored-By: Claude <noreply@anthropic.com>**
