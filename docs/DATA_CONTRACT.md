# Контракт данных: data/products_clean.csv

Сгенерирован из реального файла. Это спецификация для `scripts/build-catalog.ts`. Если файл изменится, пересоздай контракт или сверь числа.

## Источник
- UTF-8, CSV с переводами строк внутри кавычек (поэтому строк в файле больше, чем записей). Возможен BOM.
- 304 записей, из них 1 хвостовая пустая (индекс 303) → **303 модели**. Имена уникальны (303), без лишних пробелов.

## Колонки → ключи
| Колонка CSV | Ключ | Заполнено |
|---|---|---|
| Назва моделі | `name` | 303 из 303 |
| Тип обладнання | `category` | 303 из 303 |
| Сфера застосування | `sectors` | 303 из 303 |
| Завантаження (кг) | `loadKg` | 219 из 303 |
| Завантаження (л) | `volumeL` | 22 из 303 |
| Бойлер (л) | `boilerL` | 5 из 303 |
| Потужність (кВт) | `powerKw` | 280 из 303 |
| Потужність бойлера (кВт) | `boilerPowerKw` | 5 из 303 |
| G-фактор | `gFactor` | 90 из 303 |
| Віджим (об/хв) | `spinRpm` | 90 из 303 |
| Діаметр валу (мм) | `shaftDiameterMm` | 50 из 303 |
| Робоча ширина (мм) | `workingWidthMm` | 50 из 303 |
| Робоча швидкість (м/хв) | `workingSpeedMpm` | 50 из 303 |
| Габарити (ШхГхВ) | `dimensionsMm` | 303 из 303 |
| Тип нагріву | `heating` | 278 из 303 |
| Напруга живлення | `voltage` | 281 из 303 |
| Витяжка (мм) | `exhaustMm` | 163 из 303 |
| Максимальний потік повітря (м3/год) | `airflowM3h` | 163 из 303 |
| Рівень шуму (дб) | `noiseDb` | 268 из 303 |
| Короткий опис | `shortDescription` | 302 из 303 |
| Повний опис | `fullDescription` | 290 из 303 |
| Зображення | `imageKey` | 303 из 303 |
| Short description (EN) | `shortDescriptionEn` | необязательная; отсутствие колонки не ошибка |
| Full description (EN) | `fullDescriptionEn` | необязательная; отсутствие колонки не ошибка |

Заголовки EN-колонок сравниваются без учёта регистра и лишних пробелов (`Short description (EN)` ≡ ` short  DESCRIPTION (en) `). Пустые ячейки допустимы.

## Категории и какие поля у них есть
EN-названия — рабочие, **needs-review** (проверить у заказчика). Таблица, колонки и карточка зависят от набора полей категории.

| Категория (CSV) | slug | EN | Моделей | Поля (непустых) |
|---|---|---|---|---|
| Пральні машини | `washers` | Washers | 88 | `sectors` 88, `loadKg` 88, `powerKw` 88, `gFactor` 88, `spinRpm` 88, `dimensionsMm` 88, `heating` 88, `voltage` 88, `noiseDb` 88, `shortDescription` 88, `fullDescription` 88 |
| Сушильні машини | `dryers` | Dryers | 129 | `sectors` 129, `loadKg` 129, `powerKw` 129, `dimensionsMm` 129, `heating` 129, `voltage` 129, `exhaustMm` 125, `airflowM3h` 125, `noiseDb` 118, `shortDescription` 129, `fullDescription` 129 |
| Прасувальні каландри | `flatwork-ironers` | Flatwork ironers | 36 | `sectors` 36, `powerKw` 36, `shaftDiameterMm` 36, `workingWidthMm` 36, `workingSpeedMpm` 36, `dimensionsMm` 36, `heating` 36, `voltage` 36, `exhaustMm` 36, `airflowM3h` 36, `noiseDb` 36, `shortDescription` 36, `fullDescription` 36 |
| Візки для пральні | `laundry-carts` | Laundry carts | 15 | `sectors` 15, `volumeL` 15, `dimensionsMm` 15, `shortDescription` 15, `fullDescription` 3 |
| Прасувальні катки | `ironing-rollers` | Ironing rollers | 14 | `sectors` 14, `powerKw` 14, `shaftDiameterMm` 14, `workingWidthMm` 14, `workingSpeedMpm` 14, `dimensionsMm` 14, `heating` 14, `voltage` 14, `exhaustMm` 2, `airflowM3h` 2, `noiseDb` 14, `shortDescription` 14, `fullDescription` 14 |
| Фінішна обробка | `finishing` | Finishing equipment | 12 | `sectors` 12, `boilerL` 5, `powerKw` 11, `boilerPowerKw` 5, `dimensionsMm` 12, `heating` 9, `voltage` 12, `noiseDb` 10, `shortDescription` 12, `fullDescription` 11 |
| Система регенерації води | `water-recovery` | Water recovery systems | 7 | `sectors` 7, `volumeL` 7, `dimensionsMm` 7, `shortDescription` 6, `fullDescription` 7 |
| Прально-сушильне обладнання | `washer-dryers` | Washer-dryers | 2 | `sectors` 2, `loadKg` 2, `powerKw` 2, `gFactor` 2, `spinRpm` 2, `dimensionsMm` 2, `heating` 2, `voltage` 2, `noiseDb` 2, `shortDescription` 2, `fullDescription` 2 |

## Нагрев
| CSV | ключ | моделей |
|---|---|---|
| Електричний | `electric` | 121 |
| Паровий | `steam` | 60 |
| Газовий | `gas` | 58 |
| (пусто) | `none` | 25 |
| Гаряча вода | `hot-water` | 24 |
| Комбінований | `combined` | 7 |
| Газовий (Radiant Gas) | `gas` + variant `Radiant Gas` | 5 |
| Газовий (Gas Atmo) | `gas` + variant `Gas Atmo` | 3 |

Подтип газа (`Radiant Gas`, `Gas Atmo`) сохраняется как `heatingVariant`. Пусто = «не указано» (у тележек и систем регенерации воды нагрева нет).

## Отрасли (`sectors`, значения через `|`)
| CSV | ключ | моделей |
|---|---|---|
| Лікарні та медичні центри | `hospitals` | 302 |
| Готелі, хостели та ресторани | `hospitality` | 282 |
| Соціальні заклади | `social` | 281 |
| Промислові підприємства та фабрики | `industrial` | 226 |
| Пральні та пральні самообслуговування | `laundries` | 166 |

**Ловушка:** отрасли почти у всех одинаковы (больницы 302 из 303). Это не фильтр и не источник счётчиков. Использовать как контекст для формы КП и текстов.

## Форматы значений и разбор
| Колонка | Шаблон | Моделей | Пример |
|---|---|---|---|
| `loadKg` | `#-#` | 184 | `8-9` |
| `loadKg` | `# x # - # x #` | 21 | `11.7 x 2 - 10.5 x 2` |
| `loadKg` | `#` | 12 | `12` |
| `loadKg` | `#-#/#-#` | 2 | `18.3-16.5/18-20` |
| `volumeL` | `#` | 21 | `115` |
| `volumeL` | `#x#` | 1 | `77x2` |
| `powerKw` | `#` | 267 | `2.1` |
| `powerKw` | `# (#)` | 7 | `51 (39)` |
| `powerKw` | `#/#` | 6 | `2.2/14.2` |
| `dimensionsMm` | `#x#x#` | 301 | `686x829x1019` |
| `dimensionsMm` | `# (з колесами) x # x #` | 2 | `1710 (з колесами) x 810 x 580` |
| `noiseDb` | `#` | 180 | `64` |
| `noiseDb` | `<#` | 87 | `<70` |
| `noiseDb` | `#/#` | 1 | `62/72` |
| `workingSpeedMpm` | `#-#` | 38 | `1.5-6` |
| `workingSpeedMpm` | `#` | 12 | `2.02` |
| `airflowM3h` | `#` | 142 | `216` |
| `airflowM3h` | `# x #` | 21 | `500 x 2` |
| `voltage` | `#V III+T, #V III+N+T` | 103 | `230V III+T, 400V III+N+T` |
| `voltage` | `#V I+N+T, #V III+T, #V III+N+T` | 101 | `230V I+N+T, 230V III+T, 400V III+N+T` |
| `voltage` | `#V I+N+T` | 23 | `230V I+N+T` |
| `voltage` | `#V III+N+T` | 14 | `400V III+N+T` |
| `voltage` | `#V - I + N + G, #V - III + G, #V - III + N + G` | 12 | `230V - I + N + G, 230V - III + G, 400V - III + N + G` |
| `voltage` | `#V - III + G, #V - III + N + G` | 9 | `230V - III + G, 400V - III + N + G` |
| `voltage` | `#V I+N+T, #V I+N+T` | 4 | `110V I+N+T, 230V I+N+T` |
| `voltage` | `#V I #` | 4 | `230V I 50` |
| `voltage` | `#/#V III #` | 3 | `230/400V III 50` |
| `voltage` | `#V I #/#` | 2 | `230V I 50/60` |
| `voltage` | `# V #N, # V #N` | 2 | `230 V 1N, 400 V 3N` |
| `voltage` | `# V #+N+T` | 1 | `230 V 1+N+T` |
| `voltage` | `#V I #/#V III #` | 1 | `230V I 230/400V III 50` |
| `voltage` | `# V #+N, # V III, # V III +N` | 1 | `230 V 1+N, 230 V III, 400 V III +N` |
| `voltage` | `# V #+N` | 1 | `230 V 1+N` |

Правила разбора:
- `loadKg`: убрать множители `x 2`, взять числа; `min` и `max` для фильтров и сортировки (диапазон по данным: 8–130 кг), `raw` для показа. Смысл диапазона `8-9` неизвестен (вопрос заказчику Q1): не трактуем.
- `powerKw`: `raw`; `max` = наибольшее число; альтернативы в скобках или через `/` сохраняются как `alt`.
- `dimensionsMm`: три числа Ш×Г×В; пометка «(з колесами)» уходит в `note`. Две записи содержат её.
- `noiseDb`: `<70` → `{value:70, lessThan:true}`; `62/72` → два значения.
- `voltage`: строка вариантов через запятую → массив, `raw` сохраняется. Экзотика `#V - III + N + G` — как есть.
- Числа в данных с точкой; для показа форматировать по локали.

## Семейства и варианты (эвристика, **needs-review**)
Модели одного семейства отличаются хвостовыми метками (нагрев, исполнение) и совпадают по размерам и загрузке. Хвостовые метки: `E, ES, G, HPi, HW, NOMEX, Nomex, P, R, S, V, XP`. Смысл меток не толкуем, это только `variantLabel`.

Результат: 139 семейств, из них 95 с несколькими вариантами (всего 259 моделей). Примеры:

- `LAP-08 TP2` → `LAP-08 TP2 E V`, `LAP-08 TP2 E P`, `LAP-08 TP2 HW V`, `LAP-08 TP2 HW P`
- `SRP-08 TP2` → `SRP-08 TP2 E`, `SRP-08 TP2 G`
- `SLN-18 TP2` → `SLN-18 TP2 E`, `SLN-18 TP2 G`
- `P-18/100 M` → `P-18/100 M E`, `P-18/100 M E Nomex`

## Slug
Правило: нижний регистр, всё кроме `a-z0-9` → `-`, схлопнуть, обрезать. Пример: `P-18/100 M E Nomex` → `p-18-100-m-e-nomex`. Коллизий на текущих данных: **0** (сборка падает при появлении).

## Изображения
- Все 303 записей содержат имя файла `.png`. У 50 имя файла не равно `название.png`: символ `/` заменён на `_` (например `P-18/100 M E` → `P-18_100 M E.png`). Хранить как `imageKey` без преобразований.
- Файлов в репозитории нет и не будет: фото подключаются позже из внешнего источника через `getModelImage()`.

## Описания
- Короткое: 30 уникальных значений на 303 моделей (это ярлык серии или типа, например «Підресорена пральна машина»). Полное: 53 уникальных, 13 пустых; маркеры «•» у 269; пробельные цепочки (3+ пробела или перенос) у 68: схлопывать.
- Украинский обязателен в колонках «Короткий опис» / «Повний опис». Английский — в необязательных `Short description (EN)` / `Full description (EN)`.
- Хранить как `series.descriptions.{uk|en}.{short,full,…}`, модели ссылаются по `seriesId`. Серия определяется по совпадению **украинских** текстов. EN на серию: самое частое непустое значение среди моделей (достаточно одной заполненной строки); пустая EN-ячейка не затирает; конфликт значений → предупреждение сборки.
- Нормализация EN: как у UA (trim, пробелы, «•», подзаголовки sentence case) + en dash в диапазонах, десятичная точка, неразрывный пробел между числом и единицей.

## Открытые вопросы к заказчику
- Q1. Что означают диапазоны в `Завантаження (кг)` (например `8-9`, `11.7 x 2 - 10.5 x 2`, `18.3-16.5/18-20`)?
- Q2. Что означают метки в конце названий (E, S, G, HW, ES, V, P, R, XP, HPi, Nomex)?
- Q3. Подтвердить EN-названия категорий.
- Q4. У 25 моделей нагрев не указан: это корректно (тележки, регенерация воды, часть оборудования) или пропуск?
- Q5. Нужны ли отдельные описания на уровне модели, а не серии?

## Целевая форма записи (набросок)
```ts
type Product = {
  id: string; slug: string; name: string; category: CategorySlug;
  familyId: string; variantLabel: string | null; seriesId: string;
  sectors: SectorKey[];
  loadKg: { raw: string; min: number; max: number; multiplier?: number } | null;
  powerKw: { raw: string; max: number; alt?: number } | null;
  heating: HeatingKey | null; heatingVariant?: string;
  dimensionsMm: { w: number; d: number; h: number; note?: string } | null;
  noiseDb?: { value: number; lessThan?: boolean }; voltage?: string[];
  imageKey: string; image: null | { url: string; width: number; height: number; alt?: string };
  // остальные поля — по таблице категорий, все опциональны
};
```