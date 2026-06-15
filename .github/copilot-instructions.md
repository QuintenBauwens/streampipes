# GitHub Copilot Instructions for Apache StreamPipes

Apache StreamPipes is an (Industrial) IoT self-service analytics platform. It is a Maven monorepo with a Java/Spring Boot backend and an Angular frontend under `ui/`.

---

## Running StreamPipes Locally

Use this procedure to build and run a fully local instance from source (e.g. to test new features before deploying to production).

### Default login
| Field | Value |
|---|---|
| URL | http://localhost |
| Email | `admin@streampipes.apache.org` |
| Password | `admin` |

### Prerequisites
- Docker Desktop running (`docker info` should return a server version)
- Java 17+ on PATH (`java -version`)
- Maven 3.9+ on PATH (`mvn --version`)
- Node.js + npm on PATH (`node --version`)

### One-time: start Docker Desktop if stopped
```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
# Wait ~30 s then verify:
docker info --format "Server Version: {{.ServerVersion}}"
```

### Step 1 — Build the Angular frontend
```powershell
cd ui
npm install
npm run build        # production build; output → ui/dist/streampipes/ui/browser/
```

### Step 2 — Build the backend JARs
```powershell
# Full build (skips tests for speed)
mvn clean package -DskipTests

# Core service only (fastest for code changes in REST endpoints, management logic, or storage):
mvn -pl streampipes-service-core -am -DskipTests "-Dmaven.javadoc.skip=true" "-Drat.skip=true" "-Dcheckstyle.skip=true" install -q

# IIoT extensions only (fastest for code changes in adapters, processors, or sinks):
mvn -pl streampipes-extensions/streampipes-extensions-all-iiot -am -DskipTests "-Dmaven.javadoc.skip=true" "-Drat.skip=true" "-Dcheckstyle.skip=true" install -q
```
> **Reproducible build timestamps:** The fat jar and nested dependency jars always show a fixed historical date (from `project.build.outputTimestamp`). This is normal — to verify your code is inside, use `ZipFile` to inspect the nested jar, e.g. `BOOT-INF/lib/streampipes-rest-*.jar`.

### Step 3 — Build Docker images from local source
```powershell
cd C:\repos\streampipes
docker compose build        # builds backend, ui, extensions-all-iiot images
```
> **Note on CRLF:** If the UI container exits immediately with `illegal option -`, the `ui/docker-entrypoint.sh` has Windows line endings. Fix with:
> ```powershell
> $f = "ui\docker-entrypoint.sh"
> [IO.File]::WriteAllText($f, ([IO.File]::ReadAllText($f) -replace "`r`n","`n"))
> docker compose build ui
> ```

### Step 4 — Start everything
```powershell
docker compose up -d
```
Services started:
| Service | Port |
|---|---|
| UI (nginx) | http://localhost (port 80) |
| Backend | internal only (port 8030 within Docker network) |
| IIoT Extensions | internal only (port 8090) |
| CouchDB | internal only |
| NATS | internal only |
| InfluxDB | internal only |

### Step 5 — Verify startup
```powershell
# Should return {"configured":true} once backend is ready (~60 s)
Invoke-WebRequest -Uri "http://localhost/streampipes-backend/api/v2/setup/configured" -UseBasicParsing | Select-Object -Expand Content

# Tail backend logs
docker logs -f streampipes-backend-1
```
The backend is ready when logs show: `Found <N> extensions — Installing extensions...`

### Stopping
```powershell
docker compose down          # stops and removes containers (data volumes preserved)
docker compose down -v       # also wipes all data volumes (clean slate)
```

### Rebuilding after code changes
Only rebuild what changed:
```powershell
# Backend change (e.g. new REST endpoint):
mvn clean package -DskipTests
docker compose build backend && docker compose up -d backend

# Extension change (e.g. new processor/sink):
mvn clean package -DskipTests
docker compose build extensions-all-iiot && docker compose up -d extensions-all-iiot

# Frontend change:
cd ui && npm run build
docker compose build ui && docker compose up -d ui
```

---

## Session Workflow (REQUIRED)

Follow this workflow every session, no exceptions:

### At Session Start
1. Read `.github/HANDOFF.md` to understand current state, pending work, and known issues.
2. Do not start new work until you understand what is already in progress.

### During the Session
- **After completing each feature or logical unit of work, create a git commit immediately:**
  - Stage only the files for that feature (`git add <specific files>`)
  - Use conventional commit format: `feat(<scope>): <short description>`
  - Common scopes: `mqtt`, `assets`, `connect`, `enricher`, `rest`, `ui`
  - Example: `git commit -m "feat(mqtt): support dynamic topic from event field"`
  - Always include the Co-authored-by trailer: `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`
  - Do **not** bundle multiple features into one commit
- After each commit, update `.github/HANDOFF.md`:
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
