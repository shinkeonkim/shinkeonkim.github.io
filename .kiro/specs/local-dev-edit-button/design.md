# Design Document: Local Dev Edit Button

## Overview

Add a floating "Edit" button (FAB) to content pages that appears only during local development. The button links to the existing `/_editor` page with `collection` and `slug` query parameters. The editor's initialization is extended to parse these parameters and open the corresponding file automatically.

The implementation involves three changes:
1. A new Astro component (`DevEditButton.astro`) that renders the FAB conditionally
2. Integration of the component into `PostLayout.astro` and `ProjectLayout.astro`
3. Extension of `src/dev-only/editor/main.ts` to handle URL query parameters on init

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Content Page (e.g. /posts/my-article/)                 │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  PostLayout / ProjectLayout                     │    │
│  │    props: { collection, slug/id, ... }          │    │
│  │                                                 │    │
│  │  ┌───────────────────────────────────────────┐  │    │
│  │  │ DevEditButton (if import.meta.env.DEV)    │  │    │
│  │  │   href = /_editor?collection=X&slug=Y     │  │    │
│  │  └───────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │ click
                          ▼
┌─────────────────────────────────────────────────────────┐
│  /_editor                                               │
│                                                         │
│  initEditor()                                           │
│    1. Parse URLSearchParams → collection, slug          │
│    2. If present: loadFile(collection, slug)            │
│    3. Skip sessionStorage restore when URL params exist │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. DevEditButton.astro

**Location:** `src/components/DevEditButton.astro`

A zero-JS Astro component that renders a fixed-position anchor element. The entire component body is wrapped in an `import.meta.env.DEV` conditional so Astro's compiler tree-shakes it from production builds entirely.

```astro
---
interface Props {
  collection: string;
  slug: string;
}

const { collection, slug } = Astro.props;
const editorUrl = `/_editor?collection=${encodeURIComponent(collection)}&slug=${encodeURIComponent(slug)}`;
---

{import.meta.env.DEV && (
  <a
    href={editorUrl}
    class="dev-edit-fab"
    title="에디터에서 열기"
    aria-label="에디터에서 열기"
  >
    ✏️
  </a>
)}

<style>
  .dev-edit-fab {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    min-width: 44px;
    min-height: 44px;
    border-radius: 50%;
    background: var(--color-accent, #6366f1);
    color: white;
    font-size: 1.25rem;
    text-decoration: none;
    box-shadow: 0 4px 12px rgb(0 0 0 / 0.15);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .dev-edit-fab:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.25);
  }
</style>
```

**Key design decisions:**
- Uses an `<a>` tag (not `<button>`) because the action is navigation, not an in-page interaction
- `encodeURIComponent` on both params guards against slugs with special characters (e.g. subfolder slashes)
- CSS-only, no client-side JavaScript needed
- 3rem (48px) diameter satisfies the 44px minimum touch target

### 2. Layout Integration

Both layouts already receive the necessary props. The component is added inside the `<BaseLayout>` wrapper, after the main content section.

**PostLayout.astro** — receives `collection` and `slug` props directly:
```astro
---
import DevEditButton from '../components/DevEditButton.astro';
// ... existing imports
---
<!-- at end of BaseLayout slot content -->
<DevEditButton collection={collection} slug={slug} />
```

**ProjectLayout.astro** — receives `id` as the slug equivalent:
```astro
---
import DevEditButton from '../components/DevEditButton.astro';
// ... existing imports
---
<!-- at end of BaseLayout slot content -->
<DevEditButton collection="projects" slug={id} />
```

### 3. Editor Init Extension (main.ts)

The `initEditor()` function is modified to check `window.location.search` for `collection` and `slug` parameters before falling back to the existing sessionStorage restoration logic.

```typescript
// Inside initEditor(), replace the existing session-restore IIFE:

void (async () => {
  // URL query params take priority over session restore
  const urlParams = new URLSearchParams(window.location.search);
  const qCollection = urlParams.get('collection') as CollectionName | null;
  const qSlug = urlParams.get('slug');

  if (qCollection && qSlug && COLLECTION_NAMES.includes(qCollection)) {
    try {
      await loadFile(qCollection, qSlug);
    } catch {
      setStatus(`파일을 찾을 수 없습니다: ${qCollection}/${qSlug}`, 'error');
    }
    return; // skip session restore
  }

  // Existing session-restore logic unchanged
  const snapshot = loadUiState();
  if (!snapshot) {
    setStatus('준비됨', 'ok');
    return;
  }
  // ... rest of session restore
})();
```

**Key design decisions:**
- URL params are checked first, before sessionStorage—this ensures the Edit button always works even if stale state is persisted
- Invalid collection names are ignored (falls through to normal session restore)
- `loadFile` already handles 404s by catching the API error and showing an error status, but we add an explicit catch to display a user-friendly "not found" message
- The `return` after URL-param loading ensures sessionStorage state doesn't interfere
- After the file loads, the existing `setCurrent()` flow handles tree selection and highlighting automatically

## Data Models

This feature introduces no new persistent data models. It operates on existing data:

- **Props interface (DevEditButton):** `{ collection: string; slug: string }` — passed from layout to FAB
- **URL Query Params:** `collection` (string) and `slug` (string) — transient, encoded in the navigation URL
- **CollectionName type:** `'posts' | 'notes' | 'wiki' | 'sources' | 'projects'` — existing type from `src/dev-only/editor/state.ts`

The only new "data" is the URL query string, which is ephemeral and derived at render time from existing layout props.

## Data Flow

```
Content Page Props          FAB Component           Editor Init
─────────────────          ─────────────           ───────────
collection: "posts"   →   href construction   →   URLSearchParams parse
slug: "my-article"        "/_editor?              collection = "posts"
                           collection=posts&       slug = "my-article"
                           slug=my-article"             │
                                                       ▼
                                                  loadFile("posts", "my-article")
                                                       │
                                                       ▼
                                                  api.loadFile() → /_editor/api/file?collection=posts&slug=my-article
                                                       │
                                                       ▼
                                                  setCurrent() → tree.setSelection() + textarea populated
```

## URL Construction

The FAB generates URLs in the format:

```
/_editor?collection={encodeURIComponent(collection)}&slug={encodeURIComponent(slug)}
```

Examples:
| Page | Collection | Slug | Generated URL |
|------|-----------|------|---------------|
| /posts/hello-world/ | posts | hello-world | /_editor?collection=posts&slug=hello-world |
| /wiki/typescript/generics/ | wiki | typescript/generics | /_editor?collection=wiki&slug=typescript%2Fgenerics |
| /projects/my-app/ | projects | my-app | /_editor?collection=projects&slug=my-app |
| /notes/2024-01-15/ | notes | 2024-01-15 | /_editor?collection=notes&slug=2024-01-15 |

## Error Handling

| Scenario | Behavior |
|----------|----------|
| URL params have valid collection + slug that exists | File opens, tree highlights it |
| URL params have valid collection but slug doesn't exist | API returns error, editor shows "파일을 찾을 수 없습니다: {collection}/{slug}" status |
| URL params have invalid collection name | Ignored, falls through to session restore |
| URL params missing one or both values | Ignored, falls through to session restore |
| Slug contains special characters (slashes, spaces) | `encodeURIComponent` in FAB + native URLSearchParams decoding in editor handles this |

## Production Safety

The `DevEditButton.astro` component uses Astro's compile-time `import.meta.env.DEV` conditional. During `astro build`:
- The condition evaluates to `false` at compile time
- The entire HTML block and `<style>` tag are tree-shaken
- No JavaScript is involved (it's a pure Astro component)
- Zero bytes added to production output (HTML, CSS, or JS)

This is the same pattern used by `src/dev-only/editor.astro` which guards its script tag with `{isDev && <script>...</script>}`.

## Testing Strategy

### Unit Tests (Example-Based)
- Verify DevEditButton renders in dev mode with correct href
- Verify DevEditButton does not render when `import.meta.env.DEV` is false
- Verify fixed positioning CSS is applied (44px+ touch target)
- Verify PostLayout and ProjectLayout include the component with correct props
- Verify editor shows error status for invalid collection/slug in URL params
- Verify URL params take precedence over sessionStorage state

### Property Tests
- FAB href construction correctness (Property 1)
- URL param round-trip: generate → parse → loadFile args match (Property 2)

### Smoke Tests
- Production build contains zero references to `dev-edit-fab` class or DevEditButton markup
- Production JS bundle has no edit-button-related code

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: FAB href construction is correct for all valid collection/slug pairs

*For any* valid collection name (one of "posts", "wiki", "notes", "projects") and *for any* slug string, the DevEditButton's generated `href` attribute SHALL equal `/_editor?collection={encodeURIComponent(collection)}&slug={encodeURIComponent(slug)}`.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 2: Editor URL param parsing round-trips the FAB URL

*For any* valid collection name and *for any* slug string, if the FAB generates a URL and the editor parses that URL's query parameters, the editor SHALL invoke `loadFile` with the original collection and slug values (i.e., `parse(generate(collection, slug)) === {collection, slug}`).

**Validates: Requirements 3.1, 4.1**
