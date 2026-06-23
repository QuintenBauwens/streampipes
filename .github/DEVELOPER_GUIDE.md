# StreamPipes IIoT — Developer Guide

> Branch: `copilot-cli` · All custom features are on this branch on top of Apache StreamPipes 0.99.0-SNAPSHOT.

---

## 1. Developing with GitHub Copilot CLI

### Starting a session
1. Open the terminal in the repo root.
2. Type your request in plain English — be specific about what page, endpoint, or behavior you want to change.
3. Copilot will read `HANDOFF.md` automatically to understand prior context.

### Tips for effective prompts
| Instead of … | Say … |
|---|---|
| "Fix the OPC-UA thing" | "The node browser dialog doesn't load child nodes when I expand a folder — fix it" |
| "Add a field" | "Add a `description` field to `SpDevice`, persist it in CouchDB, show it in the add-device panel" |
| "Make it work" | "When I click Create Adapter the backend returns 500 — here is the stack trace: …" |

- **Paste error logs** — Copilot uses them directly to locate the failing code.
- **Mention the file or class** if you know it — speeds up navigation in a large monorepo.
- **Say what you expect** — "the dialog should close and the list should refresh" is better than "it should work".

### Build & deploy cycle
```powershell
# 1. Backend only changed
mvn -pl streampipes-service-core -am -DskipTests "-Dmaven.javadoc.skip=true" "-Drat.skip=true" "-Dcheckstyle.skip=true" install -q
docker compose build backend && docker compose up -d backend

# 2. Extensions only changed (adapters / processors)
mvn -pl streampipes-extensions/streampipes-extensions-all-iiot -am -DskipTests "-Dmaven.javadoc.skip=true" "-Drat.skip=true" "-Dcheckstyle.skip=true" install -q
docker compose build extensions-all-iiot && docker compose up -d extensions-all-iiot

# 3. Frontend only changed
cd ui && npm run build-dev
docker compose build ui && docker compose up -d ui

# 4. Verify backend is up
Invoke-WebRequest -Uri "http://localhost/streampipes-backend/api/v2/setup/configured" -UseBasicParsing | Select-Object -Expand Content
# → {"configured":true}
```

### Session end — always do this
Ask Copilot: _"Update HANDOFF.md — we finished X, next session should start with Y"_. This keeps the handover file accurate for the next developer (or the next Copilot session).

---

## 2. Custom Features

### Device Registry
A new page at **Connect → Device Registry** (`/connect/devices`) for managing industrial devices (PLC4x S7 and OPC-UA servers).

- Each device stores: name, IP/host, port, protocol type, labels, optional OPC-UA settings (port, security mode/policy, auth, polling mode)
- **Reachability check** — pings `host:port` before saving
- **Add Adapter** button on each device row opens a slide-in dialog to create a configured adapter directly from the device; no manual config needed
- **OPC-UA Node Browser** — a tree dialog pre-loaded from the live OPC-UA server; check nodes and click Apply; selection is passed directly to the adapter config
- Key files:
  - `ui/src/app/connect/components/device-registry/`
  - `streampipes-rest/.../connect/DeviceResource.java`
  - `streampipes-model/.../connect/adapter/SpDevice.java`

### Adapter → Asset Mapping
Maps adapter names (or MQTT topic patterns) to asset nodes in the asset hierarchy. Used to automatically link adapters and their auto-deployed pipelines to the right asset.

- Manage mappings at **Assets → Adapter Mappings** (`/assets/mappings`)
- CSV upload or manual entry
- When an adapter is created, `AdapterAssetEnrichmentService` finds a matching mapping and adds an `AssetLink` to the asset node
- Key files: `AdapterAssetMappingResource.java`, `AdapterAssetEnrichmentService.java`, `adapter-asset-mappings.component.*`

### MQTT Auto-Publish Pipeline
When enabled in **Configuration → Automation**, every new adapter automatically gets an MQTT publisher pipeline deployed. If the adapter schema contains a `topic` field it is used as the dynamic routing key.

- Config stored as a singleton CouchDB document (`_id = "mqtt-auto-publish-config"`)
- Key file: `MqttPublisherPipelineHandler.java`

### Data Lake Auto-Persist Pipeline
Also under **Configuration → Automation** — every new adapter can automatically get a Data Lake persist pipeline. Optional retention (days) and compaction interval are configurable.

- Key file: `AbstractAdapterResource.java` → `tryAutoDeployPipeline()`

### Maximo Asset Import
Import IBM Maximo location hierarchies as StreamPipes asset trees. The file is POSTed to `/api/v2/maximo/import`. Root nodes, zones, and MQTT topic derivation are handled automatically.

- Button: **Assets → Import Maximo**
- Key files: `MaximoAssetImportService.java`, `MaximoAssetImportResource.java`

### YAML Adapter Upload
Upload a compact YAML adapter definition (including optional pre-defined schema) to instantly create an adapter without clicking through the wizard.

- Key file: `CompactAdapterResource.java`

### Transformation Script (all adapters)
Every adapter created via the Device Registry dialog gets a default JavaScript transformation script (`utils.addTimestamp(event)`). The script is active by default; edit it in the Add Adapter dialog.

- Key files: `AdapterSchemaGenerator.java`, `add-adapter-dialog.component.ts`

### Asset Hierarchy Enrichment Processor
A StreamPipes data processor that looks up asset metadata by MQTT topic and appends hierarchy fields (`asset_name`, `zone`, `location`, `level`) to each event.

- Key file: `AssetHierarchyEnrichmentProcessor.java`

### sp-table Search Filter
All tables using the `sp-table` shared component now have a built-in search box (`[showSearchFilter]="true"`). Typed text filters all visible columns via `MatTableDataSource`.

---

## 3. Architecture Cheat Sheet

| Where to add … | Module |
|---|---|
| New REST endpoint | `streampipes-rest` → `rest/impl/` |
| Business logic | `streampipes-resource-management` or `streampipes-connect-management` |
| New storage type | `streampipes-storage-api` (interface) + `streampipes-storage-couchdb` (impl) + wire in `CouchDbStorageManager` |
| New adapter / processor / sink | `streampipes-extensions/streampipes-extensions-all-iiot` |
| New Angular page | `ui/src/app/<feature>/` — add route, component, register in `<feature>.routes.ts` |
| Shared UI component | `ui/projects/streampipes/shared-ui/` — export from `public-api.ts` |
| New API service (frontend) | `ui/projects/streampipes/platform-services/src/lib/apis/` — export from `public-api.ts` |

**Java import order** (Checkstyle-enforced): `org.apache.streampipes` → other third-party → `jakarta` → `javax` → `java`. Static imports last. Alphabetical within each group.

---

## 4. Key Files Quick Reference

| Topic | File |
|---|---|
| Device model | `streampipes-model/.../connect/adapter/SpDevice.java` |
| Device REST API | `streampipes-rest/.../connect/DeviceResource.java` |
| Adapter auto-pipeline | `streampipes-connect-management/.../compact/MqttPublisherPipelineHandler.java` |
| Adapter asset linking | `streampipes-resource-management/.../connect/AdapterAssetEnrichmentService.java` |
| Schema + script generation | `streampipes-connect-management/.../compact/generator/AdapterSchemaGenerator.java` |
| OPC-UA node browser service (Angular) | `ui/.../device-registry/opcua-browse.service.ts` |
| OPC-UA browse dialog | `ui/.../device-registry/add-adapter-dialog/opcua-browse-dialog/` |
| Automation config page | `ui/.../configuration/pipeline-setup-configuration/` |
| Adapter-asset mappings page | `ui/.../assets/components/adapter-asset-mappings/` |
| Template visitor (compact adapter config) | `streampipes-pipeline-management/.../template/PipelineElementTemplateVisitor.java` |

---

## 5. Potential Next Features

- **OPC-UA username/password auth** — `SpDevice` already stores `opcuaUsername`/`opcuaPassword`; `buildOpcUaConfig()` in `DeviceResource` already passes them; the UI field in `add-device` may need enabling
- **Pull-mode polling interval per device** — `SpDevice.opcuaPullIntervalMs` exists; surfacing it in the UI add-device form
- **Maximo re-import / delta update** — currently a full re-import; a diff/merge strategy would prevent duplicate asset nodes
- **Adapter health dashboard** — expose adapter error state from the extensions worker via REST and display on the device registry row
