# GitHub Copilot Instructions for Apache StreamPipes

> **Active work in progress:** See `.github/HANDOFF.md` for the current feature branch status, all modified files, and what needs to be done next before starting any new work.

Apache StreamPipes is an (Industrial) IoT self-service analytics platform. It is a Maven monorepo with a Java/Spring Boot backend and an Angular frontend under `ui/`.

---

## Session Workflow (REQUIRED)

Follow this workflow every session, no exceptions:

### At Session Start
1. Read `.github/HANDOFF.md` to understand current state, pending work, and known issues.
2. Do not start new work until you understand what is already in progress.

### During the Session
- After completing each logical unit of work (a feature, a bug fix, a verified build), update `.github/HANDOFF.md` immediately:
  - Move completed items to ✅ in the Status table
  - Add any new files created/modified to the file inventory
  - Record any technical decisions or gotchas discovered
  - Update the "First Thing To Do Next Session" section to reflect the actual next step

### At Session End (ALWAYS do this before stopping)
Update `.github/HANDOFF.md` with:
- **Status table** — mark everything completed/pending/blocked accurately
- **Next steps** — single clear action the next session should start with
- **Any new gotchas** — compiler errors hit, API quirks found, wrong assumptions corrected
- **Build state** — note whether backend and/or frontend builds are currently passing

### When All Features Are Complete
- Remove the `> Active work in progress` notice from the top of this file
- Archive `HANDOFF.md` by renaming it to `HANDOFF-<date>-done.md` or deleting it

---

## Build & Test Commands

### Backend (Java/Maven)

```bash
# Full build
mvn clean package

# Test a single module (and its dependencies)
mvn -pl <module> -am test

# Examples:
mvn -pl streampipes-rest -am test
mvn -pl streampipes-pipeline-management -am test
mvn -pl streampipes-service-core -am test
mvn -pl streampipes-extensions/<submodule> -am test
```

### Frontend (Angular) — run from `ui/`

```bash
npm install
npm run build          # Production build (validates i18n first)
npm run build-dev      # Development build (skips i18n validation)
npm run lint           # ESLint across all projects
npm run format         # Prettier check
npm test               # Karma unit tests
```

Build the internal libraries first when developing:
```bash
npm run build-libraries   # builds platform-services + shared-ui and installs them locally
```

Build/test individual library projects:
```bash
ng build @streampipes/platform-services
ng test @streampipes/platform-services
ng build @streampipes/shared-ui
ng test @streampipes/shared-ui
```

### Cypress E2E — run from `ui/`

```bash
npm run test-cypress-smoke   # smoke specs only
npm run test-cypress-all     # all specs
npm run test-cypress-open    # interactive runner against localhost:8082
```

---

## Architecture

### Backend Module Boundaries

| Module pattern | Responsibility |
|---|---|
| `streampipes-service-core` | Application entrypoint, Spring Boot wiring, security config (`WebSecurityConfig`), startup tasks, DB migrations, schedulers |
| `streampipes-rest` | Thin HTTP/resource layer only — request parsing, auth/permission checks, delegation to management, response mapping |
| `*-management` | Business/domain logic (e.g., `streampipes-pipeline-management`, `streampipes-resource-management`) |
| `streampipes-storage-api` | Storage interface contracts |
| `streampipes-storage-couchdb` | CouchDB implementation; wiring via `CouchDbStorageManager` |
| `streampipes-user-management` | JWT/token handling, authentication, role/privilege resolution |
| `streampipes-extensions*` | Adapters, data processors, and data sinks; each element is a microservice |
| `streampipes-sdk` | Builder/helper APIs for authoring extension pipeline elements |

Do not put business logic in `streampipes-rest` or `streampipes-service-core`; it belongs in a `*-management` module.

### Frontend Structure

```
ui/
  src/app/                          # Feature modules (routing, components, pages)
  src/app/_guards/                  # Route guards — preserve behavior carefully
  projects/streampipes/
    platform-services/              # HTTP API client + model layer (@streampipes/platform-services)
      src/lib/model/gen/            # Auto-generated models — do not edit manually
      src/public-api.ts             # Public API boundary
    shared-ui/                      # Reusable components/dialogs (@streampipes/shared-ui)
      src/public-api.ts             # Public API boundary
  cypress/
    tests/                          # Spec files
    support/utils/                  # Domain *Utils flow helpers
    support/builder/                # Test object builders (AdapterBuilder, PipelineBuilder …)
```

The two library projects (`platform-services`, `shared-ui`) must be built and locally installed before the app builds or runs. `npm run build-libraries` does this in one step.

---

## Key Conventions

### Java

- **License header** — every `.java` file must start with the Apache 2.0 header from `tools/maven/checkstyle-header.txt`. Checkstyle enforces this as an error.
- **Import order** (enforced by Checkstyle): `org.apache.streampipes` → `*` → `jakarta` → `javax` → `java` → `scala`, with static imports at the bottom. No star imports.
- **Test file naming**: use `*Test.java`, never `*Tests.java` (the latter is blocked by Checkstyle).
- **TODO format**: `TODO` comments must not include a username in parentheses — `TODO(name)` is a Checkstyle error. Use plain `TODO`.
- Prefer constructor/typed APIs over loosely typed maps in domain logic.

### Migrations (`streampipes-service-core`)

- New migrations must be idempotent.
- Always **append** new entries to the end of `migrations/AvailableMigrations`. Never insert between existing entries.

### Storage (`streampipes-storage-couchdb`)

- New storage types must be wired through `CouchDbStorageManager` and corresponding `streampipes-storage-api` abstractions.
- Serializer changes must remain backward compatible with persisted documents.

### Extensions

- Each extension element must preserve its metadata resources: `documentation.md`, `strings.*`, icons.
- Keep migration classes and tests aligned when changing extension model versions.

### Angular / UI

- All user-facing strings must use the `| translate` pipe (i18n).
- Use `mat-flat-button` for all buttons (see STYLEGUIDE).
- Layout: use `@ngbracket/ngx-layout` (`fxLayout`, `fxFlex`, etc.) rather than custom CSS wrappers.
- Use spacing/typography tokens from `ui/src/scss/sp/_spacing.scss` and `_typography.scss`; check `_variables.scss` before adding new CSS variables.
- Use shared design-system components (`sp-basic-view`, `sp-form-field`, `sp-table`, etc.) before creating new equivalents.
- Feature logic lives in `ui/src/app`; shared/reusable building blocks live in the library projects.
- Treat `public-api.ts` exports in both library projects as a compatibility boundary.

### Cypress E2E

- Initialize tests with `cy.initStreamPipesTest()`.
- Add `data-cy` attributes in Angular templates; expose them via domain `*Btns` classes (not inline in specs).
- Multi-step flows belong in domain `*Utils` classes.
- Use builders (`AdapterBuilder`, `PipelineBuilder`, etc.) for test object setup.
- Avoid fixed `cy.wait()`; prefer state-based assertions.
- Each test must be independent — no inter-test dependencies.
