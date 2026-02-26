# Security Audit — NutriMind

**Data:** 2026-02-25
**Zakres:** Commity ostatnich 4 dni (health tracking, PWA, settings, shopping list)
**Autor:** Claude Code
**Status:** ✅ APPROVED for Phase 1 MVP (single-user local)

---

## Executive Summary

Kod jest **bezpieczny** na poziomie MVP solo. Wszystkie krytyczne podatności (SQL injection, XSS, path traversal, mass assignment) są **wyeliminowane**.

Główne ograniczenie to **brak autentykacji** — akceptowalne dla localhost, **NIE** dla deploymentu publicznego.

---

## Detailed Findings

### ✅ Brak podatności

| Area | Status | Uzasadnienie |
|---|---|---|
| **SQL Injection** | ✅ SAFE | Prisma ORM — wszystkie queries parametryzowane |
| **XSS** | ✅ SAFE | React JSX escape'uje wartości, brak `dangerouslySetInnerHTML` |
| **Path Traversal** | ✅ SAFE | `isValidDate()` regex `/^\d{4}-\d{2}-\d{2}$/` + `Date.parse()` validation |
| **CSRF** | ✅ N/A | Single-user app, no cross-origin requests |
| **Mass Assignment** | ✅ SAFE | Settings API ma explicit allowlist pól |
| **JSON injection** | ✅ SAFE | `Array.isArray()` guard na `morningDone`/`eveningDone` przed stringification |
| **Service Worker** | ✅ SAFE | Tylko same-origin GET, `/api/**` zawsze network-only |

---

## Findings by Component

### 1. Health API (`app/api/health/[date]/route.ts`)

**GET endpoint:**
- ✅ Date validation: `isValidDate()` regex + `Date.parse()`
- ✅ Prisma parameterized query
- ✅ 400 on invalid date

**PUT endpoint:**
- ✅ Same date validation
- ✅ `Array.isArray()` check before `JSON.stringify(morningDone/eveningDone)`
- ⚠️ **No range validation** — see Low Risk section
- ⚠️ **No auth** — acceptable for MVP

---

### 2. Settings API (`app/api/settings/route.ts`)

**PATCH endpoint:**
- ✅ Calls `updateSettings()` with allowlist validation
- ✅ Unknown fields in request body are ignored (safe mass assignment)
- ⚠️ No kcal bounds check on server — client has `min=800, max=6000` but not enforced

---

### 3. SettingsService (`lib/services/SettingsService.ts`)

**`parseBatchConfig()`:**
- ✅ Try/catch on JSON parse
- ✅ Falls back to safe `DEFAULT_BATCH_CONFIG`

**`updateSettings()`:**
- ✅ Explicit field allowlist: `personAName`, `personAKcal`, `personBName`, `personBKcal`, `defaultBatchConfig`
- ✅ Only whitelisted fields added to `updateData`
- ⚠️ No string length validation on names

**`getSettings()`:**
- ✅ Upserts with safe defaults
- ✅ Schema has default values for all fields

---

### 4. Health Client (`app/health/HealthClient.tsx`)

- ✅ `date` prop comes from server-side `todayDate()` → `new Date().toISOString().slice(0, 10)`, not user input
- ✅ Routine item IDs validated against hardcoded `MORNING_ROUTINE`/`EVENING_ROUTINE` in `toggleRoutineItem()`
- ✅ `save()` uses parameterized fetch with `JSON.stringify()` body
- ⚠️ Debounce timer not cleaned on unmount (React 18 tolerates this)
- ⚠️ Silent error catch in `save()` — errors are logged nowhere (UX issue, not security)

---

### 5. Service Worker (`public/sw.js`)

- ✅ Only handles same-origin GET requests
- ✅ API routes (`/api/**`) never cached — network-only ✅
- ✅ Static chunks (`/_next/static/**`) cache-first (safe — content-hashed)
- ✅ Pages network-first with stale fallback
- ⚠️ Cache version `'nutrimind-v1'` hardcoded — no automatic rotation on deploy

---

## ⚠️ Low Risk Findings (Acceptable for MVP)

### Finding #1: No input range validation in Health API

**Location:** `app/api/health/[date]/route.ts:40-57`

**Issue:**
```ts
waterGlasses: waterGlasses != null ? Number(waterGlasses) : undefined,
sleepH: sleepH != null ? Number(sleepH) : undefined,
```

Client has `<input min="0" max="12">` but API doesn't enforce bounds. Could receive:
- `waterGlasses: -999` or `999999`
- `sleepH: -100` or `24`
- `moodLevel: 999`

**Risk Level:** 🟡 Low
- Single-user app — can only hurt self
- Data is read back by same user — no multiplier effect
- No downstream systems consume this data

**Recommendation for Phase 2:**
```ts
const validatedWater = typeof waterGlasses === 'number' && waterGlasses >= 0 && waterGlasses <= 20
  ? waterGlasses : undefined;
const validatedSleep = typeof sleepH === 'number' && sleepH >= 5 && sleepH <= 12
  ? sleepH : undefined;
// etc for moodLevel (1-5), energyLevel (1-5), sleepQuality (1-5)
```

---

### Finding #2: Settings API doesn't enforce kcal bounds

**Location:** `app/api/settings/route.ts` + `lib/services/SettingsService.ts`

**Issue:**
```ts
if (data.personAKcal !== undefined) updateData.personAKcal = data.personAKcal;
// No check: could be -500, 0, or 999999
```

Client input has `min=800, max=6000` but PATCH doesn't validate.

**Risk Level:** 🟡 Low
- Single-user — won't create multi-user data corruption
- UI will show invalid values but won't crash
- Meal plan generator can handle edge cases (clamping)

**Recommendation for Phase 2:**
```ts
if (data.personAKcal !== undefined) {
  const kcal = Number(data.personAKcal);
  if (!isNaN(kcal) && kcal >= 800 && kcal <= 6000) {
    updateData.personAKcal = kcal;
  }
}
```

---

### Finding #3: Routine item IDs not validated in Health API

**Location:** `app/api/health/[date]/route.ts:40`

**Issue:**
```ts
morningDone: Array.isArray(morningDone) ? JSON.stringify(morningDone) : undefined,
// morningDone could contain ["fake-id", "<script>alert()</script>", "xss-attempt"]
```

Client only sends IDs from `MORNING_ROUTINE`, but API doesn't validate against known items.

**Risk Level:** 🟡 Low
- Single-user — won't affect other users
- Data stored as JSON string, not executed
- Client reads it back and renders safely (React escaping)
- No downstream API consumes these IDs

**Recommendation for Phase 2:**
```ts
const validRoutineIds = MORNING_ROUTINE.map(r => r.id); // hardcoded list
const validatedMorning = Array.isArray(morningDone)
  ? morningDone.filter(id => validRoutineIds.includes(id))
  : [];
```

---

### Finding #4: Debounce timer not cleaned up on unmount

**Location:** `app/health/HealthClient.tsx:75, 85-92`

**Issue:**
```ts
const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

function debouncedUpdate(patch: Partial<LogState>) {
  // ...
  debounceRef.current = setTimeout(() => save(updated), 600);
}
// No useEffect cleanup — setTimeout might fire after unmount
```

**Risk Level:** 🟢 Negligible
- React 18 suppresses setState-on-unmounted warnings (expected pattern)
- Timer is closed out by component lifecycle
- No memory leak in practice

**Recommendation for Phase 2:**
```ts
useEffect(() => {
  return () => clearTimeout(debounceRef.current);
}, []);
```

---

### Finding #5: No authentication

**Location:** All API endpoints

**Issue:**
```ts
// No auth check
export async function PUT(req: NextRequest, { params }) {
  // anyone can PATCH /api/health/2026-02-25
```

**Risk Level:**
- 🟢 For localhost MVP: **Safe** (behind personal firewall)
- 🔴 For public deployment: **Critical** (data breach)

**Recommendation for Phase 2+ deployment:**
1. Use Supabase Auth (RLS policies)
2. Or add session/JWT verification
3. Or reverse proxy with basic auth/IP whitelist

---

### Finding #6: Service Worker cache version hardcoded

**Location:** `public/sw.js:6`

**Issue:**
```ts
const CACHE = 'nutrimind-v1';
// Next deployment without version bump → old cache persists
```

**Risk Level:** 🟡 Low (UX, not security)
- Stale pages might be served after update
- No security exposure
- User can force-refresh to get fresh content

**Recommendation for CI/CD:**
```ts
const CACHE = process.env.NEXT_PUBLIC_BUILD_ID || 'nutrimind-v1';
// Rotate version on each deploy
```

---

## Threat Model

### Out of Scope for Phase 1

- **Network security** — assuming HTTPS in production
- **Supply chain** — npm packages trusted
- **Deployment security** — assumed secure server with firewall
- **Physical security** — laptop not stolen
- **Multi-user scenarios** — Phase 2 problem

### In Scope

- Code injection (SQL, XSS, command) — ✅ SAFE
- Authorization bypasses — ✅ N/A (no auth yet)
- Data exposure (PII leaks) — ✅ SAFE (local storage only)
- Denial of service — ✅ SAFE (single-user throttle N/A)

---

## Checklist for Public Deployment (Phase 2+)

- [ ] Add authentication (Supabase Auth or similar)
- [ ] Implement API rate limiting per user
- [ ] Add input validation for all numeric/string fields
- [ ] Remove silent error catches — log to console/monitoring
- [ ] Rotate SW cache version on each deploy
- [ ] Add HTTPS, secure cookies
- [ ] Implement CSRF tokens if needed
- [ ] Audit Prisma RLS policies for multi-user
- [ ] Add API response timeouts
- [ ] Sanitize health tips if user-editable (Phase 3+)

---

## Sign-off

**Phase 1 MVP Status:** ✅ **APPROVED**

Code is secure for single-user local use. No critical vulnerabilities that would prevent Phase 1 MVP launch.

Recommendations are QoL improvements for Phase 2+ when deploying publicly.

---

**Reviewed by:** Claude Code
**Date:** 2026-02-25
**Next review:** Before Phase 2 public deployment
