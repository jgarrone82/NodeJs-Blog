# Skill Registry — NodeJs-Blog

## Project Standards (auto-resolved)

**Stack**: Node.js + Express + EJS + Prisma + MySQL + Tailwind CSS v4 + Alpine.js
**Testing**: Jest + supertest
**Port**: 8080 (development)
**CSS Build**: `npm run css:build` (Tailwind v4, CSS-first config)

---

## User Skills

| Context | Skill to Load |
|---------|--------------|
| Creating PRs, opening PRs | `branch-pr` |
| Writing Go tests, Bubbletea TUI | `go-testing` |
| Creating GitHub issues, bug reports | `issue-creation` |
| Adversarial review, "judgment day" | `judgment-day` |
| SDD: explore ideas | `sdd-explore` |
| SDD: create proposal | `sdd-propose` |
| SDD: write specs | `sdd-spec` |
| SDD: technical design | `sdd-design` |
| SDD: break into tasks | `sdd-tasks` |
| SDD: implement tasks | `sdd-apply` |
| SDD: validate against spec | `sdd-verify` |
| SDD: archive change | `sdd-archive` |
| SDD: initialize project | `sdd-init` |
| SDD: onboard user | `sdd-onboard` |
| Creating AI agent skills | `skill-creator` |
| Update skill registry | `skill-registry` |
| Finding/installing skills | `find-skills` |
| Alpine.js patterns & best practices | `alpinejs` |
| Tailwind design system & tokens | `tailwind-design-system` |
| UI/UX design & accessibility | `ui-design-system` |

---

## Compact Rules

### sdd-apply
- Trigger: when orchestrator launches implementation of tasks
- Reads: tasks + spec + design + apply-progress (if exists)
- Writes: apply-progress
- Strict TDD: if `strict_tdd: true` in testing-capabilities, MUST run tests

### sdd-verify
- Trigger: when validating implementation against specs
- Reads: spec + tasks + apply-progress
- Writes: verify-report
- Strict TDD: if `strict_tdd: true`, MUST run tests

### sdd-explore
- Trigger: investigating codebase, thinking through features
- Reads: nothing (exploration is fresh context)
- Writes: explore artifact

### branch-pr
- Trigger: creating pull requests, preparing changes for review
- Issue-first: must link PR to existing issue
- Team conventions: conventional commits

### judgment-day
- Trigger: "judgment day", "dual review", "juzgar"
- Launches 2 independent blind judges simultaneously
- Synthesizes findings, applies fixes, re-judges

### alpinejs
- Golden Rule: Never put complex logic in HTML attributes (>50 chars)
- Simple state: inline `x-data="{ open: false }"` (1-3 properties)
- Complex logic: extract to `function componentName() { return {...} }`
- Reused components: use `Alpine.data('name', () => ({...}))`
- Shared global state: use `Alpine.store('name', {...})`
- Always use `x-cloak` with CSS: `[x-cloak] { display: none; }`
- Event modifiers: `@click.prevent`, `@click.outside`, `@keydown.escape`
- Transitions: `x-transition.duration.300ms`, `x-transition.scale.90`

### tailwind-design-system
- Use OKLCH color space for perceptual uniformity
- Three-tier tokens: primitive → semantic → component
- Every background token needs a `-foreground` pair
- Semantic naming: `--primary` not `--blue-500`
- Dark mode: define ALL tokens in `.dark` class
- Bridge CSS vars to Tailwind: `@theme inline { --color-primary: var(--primary); }`
- No `tailwind.config.js` in v4 — use CSS-first `@theme` directive

### ui-design-system
- Mobile-first: base styles for mobile, enhance with sm/md/lg/xl/2xl
- WCAG AA minimum: 4.5:1 contrast for text, 3:1 for UI components
- Use semantic HTML: `<button>`, `<nav>`, `<main>`, `<article>`
- Provide `aria-label` and `<label>` for all interactive elements
- Test keyboard navigation flow completely
- Progressive enhancement: Tailwind → Radix → shadcn/ui
- Design tokens: purpose-driven naming, not appearance-based
- Avoid arbitrary Tailwind values unless necessary

---

## Code Patterns

### EJS Views
- Partial files in `views/partials/`
- Header variants: `encabezado_publico.ejs`, `encabezado_privado.ejs`
- Error pages in `views/errors/`

### Tailwind v4
- Source: `public/stylesheets/input.css`
- No `tailwind.config.js` (CSS-first config)
- Custom theme via `@theme` directive
- Dark mode via `@variant dark (&:is(.dark *))`

### Services
- Business logic in `services/` directory
- Follows service layer pattern

### API
- Swagger docs at `/api/docs`
- Structured logging with Pino
