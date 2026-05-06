# Admin Panel — Компоненты и утилиты

> **Правило разработки:** Перед созданием нового компонента или composable — сначала проверь этот файл. Возможно, нужный компонент уже существует или его можно доработать, не создавая новый.

---

## Composables

### `useGrenadeTypeColor`

**Файл:** `composables/useGrenadeTypeColor.ts`  
**Используется в:** `components/GrenadeTypeBadge.vue`

Возвращает имя CSS-переменной по типу гранаты. Nuxt автоимпортирует из `composables/` — явный import не нужен.

```typescript
const { getTypeColorVar } = useGrenadeTypeColor()
const colorVar = getTypeColorVar('smoke') // '--gt-smoke'
```

**Маппинг типов:**
| Ключ | CSS-переменная |
|------|---------------|
| smoke | `--gt-smoke` |
| flash | `--gt-flash` |
| he / frag / explos | `--gt-he` |
| molotov / incendiary / fire | `--gt-molo` |
| decoy | `--gt-decoy` |
| (остальное) | `--gt-smoke` |

---

### `useAuth`

**Файл:** `composables/useAuth.ts`  
**Используется в:** `layouts/default.vue`, `pages/index.vue`

Управляет сессией пользователя: `user`, `isAuthenticated`, `login`, `logout`, `fetchUser`.

---

### `useTheme`

**Файл:** `composables/useTheme.ts`  
**Используется в:** `layouts/default.vue`, `pages/index.vue`

Переключение темы `dark`/`light`, сохраняется в localStorage. Возвращает `{ theme, toggleTheme }`.

---

### `useReferenceTable`

**Файл:** `composables/useReferenceTable.ts`  
**Используется в:** `components/ReferenceTable.vue`

Generic CRUD для справочных таблиц (maps, sides, difficulties и т.д.). Принимает `apiPath`, `itemName`, имена в нужных склонениях. Возвращает `items`, `pending`, `error`, `showAddForm`, `handleAdd`, `handleDelete`, `isDeleting`.

---

## Компоненты

### `StateBox`

**Файл:** `components/StateBox.vue`  
**Используется в:** `pages/grenades/index.vue`, `pages/grenades/[grenade].vue`, `components/ReferenceTable.vue`

Компонент состояния страницы: loading / error / empty. Оборачивает глобальные классы `.state-box` и `.spinner` из `_components.scss`.

**Props:**
| Prop | Тип | Обязательный | Описание |
|------|-----|-------------|----------|
| `type` | `'loading' \| 'error' \| 'empty'` | ✅ | Тип состояния |
| `title` | `string` | ✅ | Заголовок |
| `description` | `string` | — | Поясняющий текст |

**Слоты:** `default` — произвольный дополнительный контент (например кнопка «Повторить»).

```html
<StateBox v-if="pending" type="loading" title="Loading lineups..." />
<StateBox v-else-if="error" type="error" title="Failed to load" :description="error.message" />
<StateBox v-else-if="items.length === 0" type="empty" title="No items found" description="Add your first item." />
```

---

### `AppModal`

**Файл:** `components/AppModal.vue`  
**Используется в:** `pages/grenades/index.vue`, `components/ReferenceTable.vue`

Универсальное модальное окно с overlay, заголовком и кнопкой закрытия. Использует `<Teleport to="body">`. Стили берёт из глобальных классов `.overlay`, `.modal`, `.modal-header`, `.modal-close`, `.modal-body` в `_components.scss`.

**Props:**
| Prop | Тип | Обязательный | Описание |
|------|-----|-------------|----------|
| `modelValue` | `boolean` | ✅ | v-model — открыт/закрыт |
| `title` | `string` | ✅ | Заголовок окна |
| `modalClass` | `string` | — | Дополнительный класс на `.modal` (для размера) |

**Emits:** `update:modelValue`

**Слоты:** `default` — тело окна. Если нужна форма — оборачивай в `<form @submit.prevent>` внутри слота.

**Готовые размерные классы** (из `_components.scss`):
- `modal-sm` — 480px (для справочных таблиц)
- `modal-md` — 620px, auto-height, overflow-y (для форм с файлами)

```html
<AppModal v-model="showForm" title="Add lineup" modal-class="modal-md">
  <form @submit.prevent="handleSubmit">
    <!-- поля формы -->
    <div class="form-foot">
      <button type="button" class="btn-ghost" @click="showForm = false">Cancel</button>
      <button type="submit" class="btn-primary">Save</button>
    </div>
  </form>
</AppModal>
```

---

### `GrenadeTypeBadge`

**Файл:** `components/GrenadeTypeBadge.vue`  
**Используется в:** `pages/index.vue`, `pages/grenades/index.vue`, `pages/grenades/[grenade].vue`

Цветной бейдж типа гранаты. Внутри использует `useGrenadeTypeColor` для вычисления CSS-переменной цвета.

**Props:**
| Prop | Тип | Обязательный | Описание |
|------|-----|-------------|----------|
| `typeName` | `string` | ✅ | Ключ типа гранаты (`smoke`, `flash`, `he_grenade`, ...) |
| `displayName` | `string` | ✅ | Отображаемый текст |
| `variant` | `'card' \| 'pill' \| 'simple'` | — | Вариант стиля (default: `'card'`) |

**Варианты:**
- `card` — тёмный фон, blur, цветная рамка + точка (используется в карточках главной страницы)
- `pill` — цветной фон-тинт с рамкой (используется в eyebrow модального окна)
- `simple` — глобальный `.badge` + `.bdot` (используется в списке и детальной странице гранаты)

```html
<!-- На карточке в grid-режиме -->
<GrenadeTypeBadge :type-name="g.grenade_type" :display-name="getTypeDisplayName(g.grenade_type)" />

<!-- В модальном eyebrow -->
<GrenadeTypeBadge :type-name="g.grenade_type" :display-name="g.grenade_type" variant="pill" />

<!-- В списке или detail-странице -->
<GrenadeTypeBadge :type-name="g.grenade_type" :display-name="formatGrenade(g.grenade_type)" variant="simple" />
```

> **Важно:** Если родительская страница переопределяет высоту `.badge` через scoped CSS, используй `:deep(.badge) { height: 28px; }` вместо `.badge { height: 28px; }` — иначе стиль не проникнет в дочерний компонент.

---

### `MediaGallery`

**Файл:** `components/MediaGallery.vue`  
**Используется в:** `pages/index.vue` (внутри модального окна)

Просмотр медиафайлов (фото/видео) с навигацией prev/next и горизонтальной полосой превью. Управляет индексом текущего элемента самостоятельно, сбрасывает на 0 при смене `media`.

**Props:**
| Prop | Тип | Обязательный | Описание |
|------|-----|-------------|----------|
| `media` | `SmokeMediaRecord[]` | ✅ | Массив медиафайлов |
| `loading` | `boolean` | — | Показывать заглушку с обложкой пока грузится |
| `coverFileId` | `string` | — | File ID обложки (показывается при `loading=true`) |
| `placeholderText` | `string` | — | Текст в placeholder при отсутствии медиа |

**Emits:** нет (read-only компонент)

Рендерит несколько корневых элементов (fragment): `.gallery-main` + `.gallery-thumbs`. Должен быть помещён внутрь flex-контейнера с `flex-direction: column`.

```html
<div class="nd-modal-media">
  <MediaGallery
    :media="modalMedia"
    :loading="modalMediaLoading"
    :cover-file-id="openGrenade?.cover_file_id"
    :placeholder-text="`${openGrenade.map_display_name} · ${openGrenade.grenade_type}`"
  />
  <button class="nd-modal-close" @click="openGrenade = null">...</button>
</div>
```

---

### `ReferenceTable`

**Файл:** `components/ReferenceTable.vue`  
**Используется в:** `pages/settings/tables/*.vue` (maps, sides, difficulties, lines, grenade-types)

Переиспользуемая таблица для CRUD-управления справочными данными. Внутри использует `useReferenceTable`, `StateBox`, `AppModal`.

**Props:**
| Prop | Тип | Обязательный | Описание |
|------|-----|-------------|----------|
| `title` | `string` | ✅ | Заголовок страницы |
| `itemName` | `string` | ✅ | Название сущности в ед.ч. (`Map`) |
| `itemNamePlural` | `string` | ✅ | Во мн.ч. (`Maps`) |
| `itemNameLowercase` | `string` | ✅ | В нижнем регистре ед.ч. (`map`) |
| `itemNamePluralLowercase` | `string` | ✅ | В нижнем регистре мн.ч. (`maps`) |
| `apiPath` | `string` | ✅ | Путь к API (`/api/maps`) |
| `namePlaceholder` | `string` | ✅ | Placeholder для поля Name |
| `displayNamePlaceholder` | `string` | ✅ | Placeholder для поля Display Name |

```html
<ReferenceTable
  title="Maps"
  item-name="Map"
  item-name-plural="Maps"
  item-name-lowercase="map"
  item-name-plural-lowercase="maps"
  api-path="/api/maps"
  name-placeholder="de_dust2"
  display-name-placeholder="Dust 2"
/>
```

---

### `AppLoader`

**Файл:** `components/AppLoader.vue`  
**Используется в:** (глобальный loader при роутинге)

Простой спиннер на Tailwind. Не связан с `StateBox` — используется для первичной загрузки приложения через `<NuxtLoadingIndicator>`.

---

## Глобальные CSS-классы (`_components.scss`)

Перед написанием inline-стилей — проверяй эти классы:

| Класс | Назначение |
|-------|-----------|
| `.btn-primary` | Основная кнопка (акцентный фон) |
| `.btn-ghost` | Вторичная кнопка (прозрачный фон) |
| `.btn-sm` | Модификатор уменьшенного размера |
| `.btn-danger` | Модификатор опасного действия (красный) |
| `.state-box` | Контейнер состояния (loading/error/empty) |
| `.spinner` | Анимированный spinner (32px) |
| `.spinner-sm` | Маленький spinner (14px, inline) |
| `.overlay` | Затемнённый backdrop для модала |
| `.modal` | Контейнер модального окна |
| `.modal-sm` | Модал 480px (справочные таблицы) |
| `.modal-md` | Модал 620px с авто-высотой (формы с файлами) |
| `.modal-header` | Шапка модала (заголовок + кнопка закрытия) |
| `.modal-close` | Кнопка закрытия модала |
| `.modal-body` | Тело модала (flex column, gap 16px) |
| `.field` | Обёртка поля формы (label + input) |
| `.form-select` | Стилизованный `<select>` |
| `.form-foot` | Нижняя часть формы (кнопки) |
| `.msg-error` | Сообщение об ошибке |
| `.msg-warning` | Предупреждение |
| `.msg-success` | Сообщение об успехе |
| `.badge` | Маленький бейдж с цветной рамкой |
| `.bdot` | Точка внутри бейджа |
| `.page` | Основной контейнер страницы (max-width, padding) |
| `.page-head` | Шапка страницы (заголовок + кнопка) |
| `.back-link` | Ссылка «← назад» |
