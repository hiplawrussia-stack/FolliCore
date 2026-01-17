# FolliCore

**Центр управления биологическим ресурсом волос и неинвазивного мониторинга стресса**

Платформа предиктивной трихологии на базе [CogniCore Engine](https://github.com/drugoy-put/cognicore-engine)

---

## Концепция

FolliCore — это интеллектуальная система управления здоровьем волос, которая:

- **Не просто диагностирует** — управляет долгосрочной стратегией лечения
- **Использует POMDP** — принимает решения в условиях неопределенности
- **Мультимодальна** — объединяет визуальный и акустический анализ
- **Персонализирована** — адаптируется к индивидуальным особенностям пациента

## Архитектура VBA (Vision-Brain-Action)

```
┌─────────────────┐   ┌─────────────────┐
│   VISION        │   │   ACOUSTIC      │
│   (ViT/CNN)     │   │   (Wav2Vec2)    │
│                 │   │                 │
│ • Морфометрия   │   │ • Пористость    │
│ • Плотность     │   │ • Гидратация    │
│ • Толщина       │   │ • Повреждения   │
└────────┬────────┘   └────────┬────────┘
         │                     │
         └──────────┬──────────┘
                    ▼
         ┌─────────────────────┐
         │  COGNICORE ENGINE   │
         │      (POMDP)        │
         │                     │
         │  Belief State →     │
         │  Optimal Policy →   │
         │  Intervention       │
         └──────────┬──────────┘
                    ▼
         ┌─────────────────────┐
         │   ACTION            │
         │                     │
         │ • Терапия           │
         │ • Мониторинг        │
         │ • Рекомендации      │
         └─────────────────────┘
```

## Научная база

| Компонент | Источник | Статус |
|-----------|----------|--------|
| Морфометрия волос | ПГМУ/ПНИПУ (2025) | Патент получен |
| Акустический анализ | arXiv:2506.14148 | Interspeech 2025 |
| POMDP Engine | CogniCore | Production-ready |
| Эпигенетика | GrimAge, DunedinPACE | Золотой стандарт |

## Структура проекта

```
FolliCore/
├── src/
│   ├── trichology/           # Domain model + Engine
│   │   ├── domain/
│   │   │   ├── TrichologyStates.ts      # States, Actions, PGMU norms
│   │   │   └── TrichologySafetyRules.ts # 9 safety rules
│   │   └── FolliCoreEngine.ts           # POMDP + Thompson Sampling
│   ├── vision/               # CV pipeline (DINOv2 + SAM)
│   │   ├── VisionTypes.ts               # Type definitions
│   │   ├── TrichoscopyAnalyzer.ts       # Main analyzer
│   │   ├── MorphometryExtractor.ts      # PGMU measurements
│   │   └── VisionBeliefAdapter.ts       # Vision → POMDP bridge
│   ├── integration/          # End-to-end orchestration
│   │   └── VisionEngineIntegration.ts   # Image → Recommendation
│   └── index.ts              # Main exports
├── research/                 # Scientific research reports
└── ROADMAP.md                # Development roadmap
```

## Roadmap

### Phase 1: Foundation ✅ COMPLETED
- [x] Интеграция CogniCore POMDP (FolliCoreEngine)
- [x] Адаптация BeliefState для трихологии (ITrichologyBeliefState)
- [x] Определение States/Actions/Rewards (10 states, 14 actions)
- [x] Safety Rules (9 правил безопасности)

### Phase 2: Vision Module ✅ COMPLETED
- [x] VisionTypes — типы для CV pipeline
- [x] TrichoscopyAnalyzer — DINOv2 + SAM архитектура
- [x] MorphometryExtractor — PGMU-совместимые измерения
- [x] VisionBeliefAdapter — мост Vision → POMDP
- [x] VisionEngineIntegration — end-to-end pipeline

**301 тест, 95.7% покрытие кода**

### Phase 3: Acoustic Module (Planned Q2-Q3 2025)
- [ ] Прототип акустического датчика
- [ ] Адаптация Wav2Vec2-Conformer
- [ ] Клиническая валидация

### Phase 4: Clinical Validation (Planned Q4 2025)
- [ ] IRB approval, пилотное исследование
- [ ] Сравнение ИИ vs экспертная оценка
- [ ] Регуляторная подготовка (CE/FDA)

📋 **Подробный roadmap:** [ROADMAP.md](./ROADMAP.md)

## Технологический стек

- **Core Engine:** CogniCore (TypeScript, POMDP)
- **Vision:** PyTorch, Vision Transformers
- **Acoustic:** Wav2Vec2-Conformer
- **Backend:** Node.js / Python
- **Frontend:** React / React Native (mobile)

## Связь с CogniCore

FolliCore использует CogniCore Engine как ядро принятия решений:

```typescript
import { CognitiveCoreAPI } from '@cognicore/engine';
import { BeliefStateAdapter } from '@cognicore/engine/belief';

// Адаптация для трихологии
const folliCore = new CognitiveCoreAPI({
  domain: 'trichology',
  states: ['healthy_anagen', 'early_catagen', 'miniaturization', 'inflammation'],
  actions: ['stimulate', 'block_dht', 'reduce_stress', 'observe']
});
```

## Контакты

- **Организация:** БФ "Другой путь"
- **Email:** tech@awfond.ru
- **Website:** https://awfond.ru

---

*Проект инициирован: Январь 2026*
