# Frontend - CLAUDE.md

## Overview

Next.js 14 App Router with TypeScript. shadcn/ui component library (Radix UI + Tailwind CSS + CVA). Zustand for auth state. TanStack Table for CRM grids. Recharts for dashboards.

**Two portals in one codebase**:
- `/admin/*` - Staff portal (admin, managers, agents)
- `/partner/*` - Partner portal (external brokers, advisors)
- `/(public)/*` - Public landing page + lead form + partner registration

---

## Route Structure

```
app/
├── layout.tsx              # Root layout (fonts, providers)
├── providers.tsx           # ThemeProvider + Toaster
├── page.tsx                # Redirects to /admin or /partner based on role
├── login/page.tsx          # Unified login page
├── (public)/
│   ├── promocion/[slug]/page.tsx        # Public landing page for investors
│   └── registro-partner/page.tsx        # Partner self-registration form
└── (private)/
    ├── admin/
    │   ├── layout.tsx           # Admin shell (sidebar nav)
    │   ├── dashboard/page.tsx   # Admin KPI dashboard
    │   ├── leads/page.tsx       # CRM table (LeadsCRM)
    │   ├── leads/[id]/page.tsx  # Lead detail + activities
    │   ├── partners/page.tsx    # Partner management
    │   ├── commissions/page.tsx # Commission events
    │   ├── promotions/page.tsx  # Promotion management
    │   └── units/page.tsx       # Unit management
    └── partner/
        ├── layout.tsx           # Partner shell (different sidebar)
        ├── dashboard/page.tsx   # Partner KPI dashboard
        ├── leads/page.tsx       # Partner's own leads (LeadsCRM - scoped)
        ├── commissions/page.tsx # Partner's own commissions
        └── materiales/page.tsx  # Marketing materials + referral link
```

---

## Key Libraries

| Library | Version | Use |
|---------|---------|-----|
| `next` | 14.1.0 | Framework, App Router |
| `tailwindcss` | ^3.4.1 | Utility CSS |
| `tailwindcss-animate` | ^1.0.7 | CSS animations (required by tailwind.config.ts) |
| `class-variance-authority` | ^0.7.0 | CVA for component variants (Badge uses this, NOT Radix) |
| `@radix-ui/react-*` | various | Headless UI primitives |
| `react-hook-form` | ^7.50.1 | Form handling |
| `@hookform/resolvers` + `zod` | | Form validation |
| `zustand` | ^4.5.0 | Auth state |
| `@tanstack/react-table` | ^8.13.2 | CRM data table |
| `recharts` | ^2.12.0 | Dashboard charts |
| `axios` | ^1.6.7 | API client |
| `date-fns` | ^3.3.1 | Date formatting (v3 API - no locale imports needed) |
| `next-themes` | ^0.2.1 | Theme provider (currently light-only, darkMode class ready) |

**IMPORTANT**: `Badge` component is NOT from `@radix-ui/react-badge` (that package doesn't exist). It is built with CVA in `components/ui/badge.tsx`.

---

## Component Library (shadcn/ui)

Located in `components/ui/`. These are local copies - do not `npm install` shadcn components, add them to the `components/ui/` directory.

Key components: `Button`, `Card`, `Badge`, `Input`, `Select`, `Dialog`, `Toast`, `Toaster`, `Avatar`, `Separator`, `Tabs`, `Progress`, `Switch`, `Tooltip`, `Popover`, `ScrollArea`, `AlertDialog`, `Checkbox`

---

## API Client

**File**: `lib/api.ts`

Axios instance configured with:
- `baseURL`: `NEXT_PUBLIC_API_URL` env variable
- Request interceptor: attaches `Authorization: Bearer <token>` from Zustand store
- Response interceptor: handles 401 by calling `logout()` and redirecting to `/login`

Usage: `import { api } from '@/lib/api'`

---

## Auth Store

**File**: `lib/auth.ts`

Zustand store with `persist` middleware (localStorage). Shape:
```typescript
{
  token: string | null;
  user: { id, name, email, role } | null;
  login(token, user): void;
  logout(): void;
}
```

Role-based routing: `app/page.tsx` reads `user.role` and redirects:
- `SUPER_ADMIN / PROMOTION_MANAGER / SALES_AGENT` → `/admin/dashboard`
- `PARTNER` → `/partner/dashboard`

---

## LeadsCRM Component

**File**: `features/leads/LeadsCRM.tsx`

Used by BOTH admin (`/admin/leads`) and partner (`/partner/leads`) pages.

**Important**: Row click navigation detects context via `usePathname()`:
- If `pathname.startsWith('/partner')` → navigates to `/partner/leads/:id`
- Otherwise → navigates to `/admin/leads/:id`

Partner scoping is handled server-side - the API returns only the partner's own leads when authenticated as a partner. No client-side filtering needed.

---

## Tailwind Configuration

**File**: `tailwind.config.ts`

- Dark mode: `class` (ready but not exposed in UI yet)
- Custom colors: `portalon.gold`, `portalon.dark`, `portalon.stone`, etc.
- Plugin: `tailwindcss-animate` (required - add to package.json if missing)
- Custom keyframes: `accordion-down`, `accordion-up`, `fade-in`

---

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=https://your-domain.com/api/v1      # Required
NEXT_PUBLIC_PROMOTION_SLUG=el-portalon-del-brillante     # Required for public landing
```

Build-time variables must be prefixed with `NEXT_PUBLIC_` and available at build time (passed as Docker `--build-arg`).

---

## Development

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

---

## Adding New Pages

1. Create page file under `app/(private)/admin/` or `app/(private)/partner/`
2. For data-heavy pages: create feature component under `features/`
3. Add navigation link to the appropriate layout sidebar
4. If it needs API: add method to `lib/api.ts` or use `api.get/post/patch` inline

---

## Conventions

- All pages use `'use client'` only when they need browser APIs or React hooks
- Server components (no directive) are used for metadata, layouts, and static pages
- Feature components are always client components
- Data fetching: direct axios in `useEffect` with `useCallback` + debounce for search
- No global state beyond auth - each feature fetches its own data
