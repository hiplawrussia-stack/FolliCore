# FolliCore Capabilities
## Полная карта возможностей системы

> Что реализовано, что планируется, что возможно

---

## 1. Текущее состояние

### 1.1 Статус проекта

| Метрика | Значение |
|---------|----------|
| **Версия** | 0.3.0 |
| **Тесты** | 482 passing |
| **Coverage** | 96.7% statements, 81.33% branches |
| **Core готовность** | 100% |
| **Production готовность** | ~30% |

### 1.2 Что готово

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         IMPLEMENTED (v0.3.0)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ████████████████████████████████████████████████████████████████████████   │
│                                                                              │
│  TRICHOLOGY CORE                                                            │
│  ├── TrichologyStates.ts      10 состояний фолликул                        │
│  ├── TrichologyActions        14 лечебных действий                          │
│  ├── TrichologySafetyRules    9 правил безопасности                        │
│  ├── FolliCoreEngine          POMDP + Thompson Sampling                     │
│  └── PGMU Norms               Референсные значения по возрастам            │
│                                                                              │
│  VISION MODULE                                                               │
│  ├── VisionTypes.ts           Типы для CV pipeline                          │
│  ├── TrichoscopyAnalyzer      DINOv2 + MedSAM orchestration                │
│  ├── MorphometryExtractor     Измерение bulb/shaft                         │
│  └── VisionBeliefAdapter      Vision → POMDP bridge                        │
│                                                                              │
│  ACOUSTIC MODULE                                                             │
│  ├── AcousticTypes.ts         Типы для audio pipeline                       │
│  ├── AcousticAnalyzer         Wav2Vec2 orchestration                        │
│  └── Porosity/Hydration/Structure analysis heads                            │
│                                                                              │
│  INTEGRATION LAYER                                                           │
│  ├── VisionEngineIntegration      Image → Recommendation                    │
│  ├── AcousticEngineIntegration    Recording → Recommendation                │
│  └── MultimodalIntegration        Vision + Acoustic fusion                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Capabilities Matrix

### 2.1 Core Capabilities (✅ Реализовано)

| Capability | Описание | Файл | Статус |
|------------|----------|------|--------|
| **Belief State Management** | Байесовское обновление убеждений | `FolliCoreEngine.ts` | ✅ |
| **Thompson Sampling** | Балансировка exploration/exploitation | `FolliCoreEngine.ts` | ✅ |
| **Safety Rules** | 9 медицинских ограничений | `TrichologySafetyRules.ts` | ✅ |
| **Trajectory Prediction** | Прогноз на 6-12 месяцев | `FolliCoreEngine.ts` | ✅ |
| **Treatment Recommendation** | Выбор оптимального лечения | `FolliCoreEngine.ts` | ✅ |
| **Outcome Learning** | Обучение от результатов | `FolliCoreEngine.ts` | ✅ |

### 2.2 Vision Capabilities (✅ Реализовано)

| Capability | Описание | Модель | Статус |
|------------|----------|--------|--------|
| **Feature Extraction** | 1024-dim embeddings | DINOv2-Large | ✅ Interface |
| **Segmentation** | Маски волос и фолликулов | MedSAM | ✅ Interface |
| **Morphometry** | Ширина луковицы, толщина стержня | Custom head | ✅ Interface |
| **Density Analysis** | Волос/см², FU distribution | Custom head | ✅ Interface |
| **Cycle Analysis** | Anagen/Telogen/Vellus ratios | Custom head | ✅ Interface |
| **Batch Processing** | Обработка нескольких изображений | - | ✅ |
| **Interactive Segmentation** | SAM point prompts | MedSAM | ✅ Interface |

### 2.3 Acoustic Capabilities (✅ Реализовано)

| Capability | Описание | Модель | Статус |
|------------|----------|--------|--------|
| **Feature Extraction** | 768-dim embeddings | Wav2Vec2-Conformer | ✅ Interface |
| **Spectral Analysis** | Mel, MFCC, spectral features | Librosa-style | ✅ Interface |
| **Porosity Detection** | Acoustic impedance analysis | Custom head | ✅ Interface |
| **Hydration Estimation** | Wave velocity / damping | Custom head | ✅ Interface |
| **Structure Classification** | healthy/weathered/damaged | Custom head | ✅ Interface |
| **Similarity Search** | Поиск похожих случаев | Vector DB | ✅ Interface |
| **Multi-zone Analysis** | Scalp mapping | - | ✅ |

### 2.4 Fusion Capabilities (✅ Реализовано)

| Capability | Описание | Статус |
|------------|----------|--------|
| **Late Fusion** | Объединение на уровне решений | ✅ |
| **Configurable Weights** | 60/40 по умолчанию, настраиваемо | ✅ |
| **Modality Agreement** | Оценка согласованности модальностей | ✅ |
| **Discrepancy Detection** | Выявление расхождений | ✅ |
| **Cross-modal Validation** | Перекрёстная проверка | ✅ |
| **Scalp Mapping** | Анализ 5 зон с агрегацией | ✅ |

---

## 3. Capabilities Roadmap

### 3.1 Infrastructure (❌ Не реализовано)

| Capability | Описание | Приоритет | Сложность |
|------------|----------|-----------|-----------|
| **Patient Database** | Хранение данных пациентов | P0 | Средняя |
| **File Storage** | Хранение изображений/записей | P0 | Средняя |
| **User Authentication** | JWT/OAuth авторизация | P0 | Средняя |
| **Role-based Access** | Врач, пациент, админ | P1 | Средняя |
| **Audit Logging** | Логирование действий | P1 | Низкая |
| **Data Encryption** | Шифрование данных | P0 | Средняя |
| **Backup & Recovery** | Резервное копирование | P1 | Средняя |

```typescript
// Будущий интерфейс
interface IPatientRepository {
  create(patient: IPatient): Promise<string>;
  findById(id: string): Promise<IPatient | null>;
  update(id: string, data: Partial<IPatient>): Promise<void>;
  findByClinic(clinicId: string): Promise<IPatient[]>;
  getVisitHistory(patientId: string): Promise<IVisit[]>;
}

interface IFileStorage {
  uploadImage(patientId: string, image: Buffer): Promise<string>;
  uploadRecording(patientId: string, audio: Buffer): Promise<string>;
  getImage(fileId: string): Promise<Buffer>;
  getRecording(fileId: string): Promise<Buffer>;
}
```

### 3.2 API Layer (❌ Не реализовано)

| Capability | Описание | Приоритет | Сложность |
|------------|----------|-----------|-----------|
| **REST API** | HTTP endpoints | P0 | Средняя |
| **WebSocket** | Real-time updates | P2 | Средняя |
| **GraphQL** | Гибкие запросы | P2 | Высокая |
| **API Versioning** | v1, v2, etc. | P1 | Низкая |
| **Rate Limiting** | Защита от DDoS | P1 | Низкая |
| **API Documentation** | OpenAPI/Swagger | P1 | Низкая |

```typescript
// Будущие endpoints
POST   /api/v1/patients                    // Создать пациента
GET    /api/v1/patients/:id                // Получить пациента
POST   /api/v1/patients/:id/visits         // Создать визит
POST   /api/v1/analysis/vision             // Vision анализ
POST   /api/v1/analysis/acoustic           // Acoustic анализ
POST   /api/v1/analysis/multimodal         // Multimodal анализ
GET    /api/v1/patients/:id/recommendations // Получить рекомендации
GET    /api/v1/patients/:id/trajectory     // Получить прогноз
POST   /api/v1/outcomes                    // Записать результат лечения
```

### 3.3 Frontend Applications (❌ Не реализовано)

| Capability | Описание | Приоритет | Технология |
|------------|----------|-----------|------------|
| **Web Dashboard (Clinic)** | Интерфейс для врача | P0 | React/Vue |
| **Patient Portal (Web)** | Личный кабинет пациента | P1 | React/Vue |
| **Mobile App (Patient)** | Мобильное приложение | P1 | React Native |
| **Desktop App** | Standalone приложение | P2 | Electron |
| **Admin Panel** | Управление системой | P1 | React |

**Web Dashboard функции:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CLINIC DASHBOARD                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  📋 ПАЦИЕНТЫ                                                                 │
│  ├── Список пациентов с поиском и фильтрами                                │
│  ├── Карточка пациента (история, визиты, результаты)                       │
│  ├── Создание нового пациента                                               │
│  └── Экспорт данных                                                         │
│                                                                              │
│  🔬 АНАЛИЗ                                                                   │
│  ├── Загрузка изображений (drag & drop)                                    │
│  ├── Запись аудио (интеграция с устройством)                               │
│  ├── Просмотр результатов в реальном времени                               │
│  ├── Сравнение с предыдущими визитами                                      │
│  └── Карта скальпа (5 зон)                                                 │
│                                                                              │
│  💊 РЕКОМЕНДАЦИИ                                                             │
│  ├── Текущая рекомендация с обоснованием                                   │
│  ├── Альтернативные варианты                                               │
│  ├── Safety alerts                                                          │
│  └── Прогноз (график)                                                       │
│                                                                              │
│  📊 АНАЛИТИКА                                                                │
│  ├── Статистика по клинике                                                 │
│  ├── Эффективность лечений                                                 │
│  └── Тренды                                                                 │
│                                                                              │
│  📄 ОТЧЁТЫ                                                                   │
│  ├── Генерация PDF для пациента                                            │
│  ├── Отчёт для врача                                                       │
│  └── Экспорт в МИС                                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Reporting (❌ Не реализовано)

| Capability | Описание | Приоритет | Формат |
|------------|----------|-----------|--------|
| **Patient Report** | Отчёт для пациента | P0 | PDF |
| **Clinical Report** | Отчёт для врача | P0 | PDF |
| **Progress Report** | Сравнение визитов | P1 | PDF |
| **Export to CSV** | Экспорт данных | P1 | CSV |
| **DICOM Export** | Медицинский формат | P2 | DICOM |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PATIENT REPORT (PDF)                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  FOLLICORE                                          Дата: 17.01.2026 │   │
│  │  Отчёт о состоянии волос                                             │   │
│  │                                                                      │   │
│  │  Пациент: Иван Петров, 42 года                                      │   │
│  │  Врач: Д-р Сидорова А.В.                                            │   │
│  │  Клиника: МедЦентр "Здоровье"                                       │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ                                            │   │
│  │                                                                      │   │
│  │  Плотность волос:     142 волос/см² (норма: 150-200)               │   │
│  │  Толщина стержня:     31 мкм (норма: 30-35)                        │   │
│  │  Соотношение фаз:     Anagen 68% / Telogen 32%                     │   │
│  │  Пористость:          Умеренная (35%)                              │   │
│  │  Гидратация:          Субоптимальная (62%)                         │   │
│  │                                                                      │   │
│  │  [Карта скальпа с цветовой индикацией]                             │   │
│  │                                                                      │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  ЗАКЛЮЧЕНИЕ                                                         │   │
│  │                                                                      │   │
│  │  Выявлены признаки начальной стадии андрогенетической              │   │
│  │  алопеции с умеренным истончением волос в теменной                 │   │
│  │  и лобной зонах.                                                    │   │
│  │                                                                      │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  РЕКОМЕНДАЦИИ                                                       │   │
│  │                                                                      │   │
│  │  1. Миноксидил 5% — наружно 2 раза в день                          │   │
│  │  2. Контроль через 3 месяца                                        │   │
│  │  3. Управление стрессом                                            │   │
│  │                                                                      │   │
│  │  [QR-код для доступа к полным результатам онлайн]                  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.5 Analytics (❌ Не реализовано)

| Capability | Описание | Приоритет |
|------------|----------|-----------|
| **Clinic Dashboard** | KPIs клиники | P1 |
| **Treatment Effectiveness** | Анализ эффективности | P1 |
| **Population Analytics** | Демографический анализ | P2 |
| **Predictive Analytics** | Прогнозирование трендов | P2 |
| **Benchmarking** | Сравнение с другими клиниками | P3 |

### 3.6 Integrations (❌ Не реализовано)

| Capability | Описание | Приоритет |
|------------|----------|-----------|
| **EHR/МИС Integration** | Интеграция с мед. системами | P1 |
| **Lab Systems** | Результаты анализов | P2 |
| **Pharmacy Integration** | Рецепты и назначения | P2 |
| **Telemedicine** | Видеоконсультации | P2 |
| **Payment Systems** | Оплата | P2 |

### 3.7 Hardware (⏳ В разработке)

| Capability | Описание | Timeline |
|------------|----------|----------|
| **Acoustic Sensor Device** | Физический сенсор | Q2 2026 |
| **Device Driver** | USB/BLE коммуникация | Q2 2026 |
| **Calibration System** | Калибровка сенсора | Q2-Q3 2026 |
| **Edge Inference** | Локальный ML inference | Q3 2026 |

---

## 4. Technical Architecture

### 4.1 Current Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CURRENT ARCHITECTURE (v0.3.0)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                         TypeScript Library                                   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      @follicore/platform                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │ trichology/ │  │  vision/    │  │  acoustic/  │                  │   │
│  │  │             │  │             │  │             │                  │   │
│  │  │ Engine      │  │ Analyzer    │  │ Analyzer    │                  │   │
│  │  │ States      │  │ Types       │  │ Types       │                  │   │
│  │  │ Safety      │  │ Adapter     │  │             │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  │                           │                                          │   │
│  │                           ▼                                          │   │
│  │                   ┌─────────────┐                                   │   │
│  │                   │integration/ │                                   │   │
│  │                   │             │                                   │   │
│  │                   │ Multimodal  │                                   │   │
│  │                   │ Vision      │                                   │   │
│  │                   │ Acoustic    │                                   │   │
│  │                   └─────────────┘                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│                     Pluggable ML Backends                                   │
│                     (DINOv2, Wav2Vec2, etc.)                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TARGET ARCHITECTURE (v1.0)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CLIENTS                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│  │ Web App  │  │ Mobile   │  │ Desktop  │  │ Device   │                    │
│  │ (React)  │  │ (RN)     │  │(Electron)│  │ (RPi)    │                    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘                    │
│       │             │             │             │                           │
│       └─────────────┴─────────────┴─────────────┘                           │
│                           │                                                  │
│                           ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        API GATEWAY                                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │    Auth     │  │ Rate Limit  │  │   Routing   │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                  │
│                           ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      MICROSERVICES                                   │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │  Patient    │  │  Analysis   │  │  Reporting  │                  │   │
│  │  │  Service    │  │  Service    │  │  Service    │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │  ML         │  │  Storage    │  │  Analytics  │                  │   │
│  │  │  Service    │  │  Service    │  │  Service    │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                  │
│                           ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      @follicore/platform                             │   │
│  │                         (Core Library)                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                  │
│                           ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        DATA LAYER                                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │ PostgreSQL  │  │ MinIO/S3    │  │ Redis       │                  │   │
│  │  │ (patients)  │  │ (files)     │  │ (cache)     │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Deployment Options

### 5.1 Cloud Deployment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CLOUD DEPLOYMENT                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Для клиник без собственной IT-инфраструктуры                              │
│                                                                              │
│  Pros:                           Cons:                                      │
│  + Нет затрат на сервера        - Зависимость от интернета                 │
│  + Автоматические обновления    - Данные в облаке                          │
│  + Масштабируемость             - Подписочная модель                       │
│  + GPU для inference                                                        │
│                                                                              │
│  Варианты:                                                                  │
│  • AWS / GCP / Azure                                                        │
│  • Yandex Cloud (для России)                                               │
│  • Dedicated European cloud (GDPR)                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 On-Premise Deployment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ON-PREMISE DEPLOYMENT                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Для клиник с требованиями к локальному хранению данных                    │
│                                                                              │
│  Pros:                           Cons:                                      │
│  + Полный контроль данных       - Требуется IT-специалист                  │
│  + Работает без интернета       - Затраты на оборудование                  │
│  + Одноразовая оплата           - Самостоятельные обновления               │
│                                                                              │
│  Требования:                                                                │
│  • Сервер: 32GB RAM, GPU (RTX 3080+)                                       │
│  • Storage: 1TB+ SSD                                                        │
│  • OS: Ubuntu 22.04 / Windows Server                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Hybrid Deployment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      HYBRID DEPLOYMENT                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Локальный сбор данных + облачный inference                                │
│                                                                              │
│  ┌──────────────────┐              ┌──────────────────┐                    │
│  │  CLINIC (Local)  │              │  CLOUD           │                    │
│  │                  │              │                  │                    │
│  │  • Device        │   ────────▶  │  • ML Inference  │                    │
│  │  • Data capture  │   Encrypted  │  • Analytics     │                    │
│  │  • Local cache   │   ◀────────  │  • Storage       │                    │
│  │                  │              │                  │                    │
│  └──────────────────┘              └──────────────────┘                    │
│                                                                              │
│  Pros:                           Cons:                                      │
│  + Быстрый capture              - Сложность настройки                      │
│  + GPU в облаке                 - Требуется интернет для анализа           │
│  + Работа офлайн (базовая)                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Edge Deployment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EDGE DEPLOYMENT                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Всё на устройстве (для мобильных клиник, удалённых регионов)              │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  FOLLICORE DEVICE                                                    │  │
│  │                                                                      │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐                     │  │
│  │  │ Acoustic   │  │ RPi 5 +    │  │ Touchscreen│                     │  │
│  │  │ Sensor     │  │ Coral TPU  │  │ Display    │                     │  │
│  │  └────────────┘  └────────────┘  └────────────┘                     │  │
│  │                        │                                             │  │
│  │                        ▼                                             │  │
│  │              ┌────────────────────┐                                  │  │
│  │              │ FolliCore Edge     │                                  │  │
│  │              │ • Optimized models │                                  │  │
│  │              │ • Local storage    │                                  │  │
│  │              │ • Offline capable  │                                  │  │
│  │              └────────────────────┘                                  │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Ограничения:                                                               │
│  • Упрощённые модели (INT8 quantization)                                   │
│  • Только базовая аналитика                                                │
│  • Синхронизация при подключении к сети                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Summary

### 6.1 Capability Coverage

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CAPABILITY COVERAGE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Category              Coverage    Status                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Core Algorithm        ████████████████████  100%    ✅ Complete            │
│  Vision Pipeline       ████████████████████  100%    ✅ Complete            │
│  Acoustic Pipeline     ████████████████████  100%    ✅ Complete            │
│  Multimodal Fusion     ████████████████████  100%    ✅ Complete            │
│  Safety Rules          ████████████████████  100%    ✅ Complete            │
│                                                                              │
│  ML Models             ░░░░░░░░░░░░░░░░░░░░    0%    ❌ Need training       │
│  Infrastructure        ░░░░░░░░░░░░░░░░░░░░    0%    ❌ Not started         │
│  API Layer             ░░░░░░░░░░░░░░░░░░░░    0%    ❌ Not started         │
│  Frontend              ░░░░░░░░░░░░░░░░░░░░    0%    ❌ Not started         │
│  Reporting             ░░░░░░░░░░░░░░░░░░░░    0%    ❌ Not started         │
│                                                                              │
│  Hardware              ████░░░░░░░░░░░░░░░░   20%    ⏳ Planning done       │
│  Documentation         ████████████████░░░░   80%    ⏳ In progress         │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  OVERALL PRODUCTION READINESS:  ████████░░░░░░░░░░░░  ~35%                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Next Steps Priority

| Priority | Capability | Effort | Impact |
|----------|------------|--------|--------|
| **P0** | ML Models (training/fine-tuning) | High | Critical |
| **P0** | Database + Storage | Medium | Critical |
| **P0** | Basic API | Medium | Critical |
| **P0** | MVP Web UI | High | Critical |
| **P1** | Hardware Prototype | High | High |
| **P1** | Patient Reports (PDF) | Medium | High |
| **P1** | Authentication | Medium | High |
| **P2** | Mobile App | High | Medium |
| **P2** | Analytics Dashboard | Medium | Medium |
| **P3** | EHR Integration | High | Low |

---

**Версия документа:** 1.0
**Дата:** 2026-01-17

---

**© 2026 Благотворительный фонд "Другой путь"**
**FolliCore | awfond.ru**
