# StreamPipes IIoT Feature Extensions — Session Handoff

> **Maintenance:** Update this file at the end of every session. The workflow is defined in `.github/copilot-instructions.md` under "Session Workflow".

## Project Goal

Extend Apache StreamPipes for Industrial IoT use cases with:
1. Import asset hierarchies from Maximo JSON exports
2. Upload adapter configs via YAML file
3. Enrich datapoint streams with asset hierarchy metadata
4. Dynamic MQTT topics derived from event fields
5. Frontend UI for import/upload features
6. Auto-deploy MQTT publisher pipeline per adapter (global config)

---

## Status — All Features Complete ✅

All features compile-verified (backend) and build-verified (Angular dev build). Branch: `copilot-cli`.

| Feature | Status | Notes |
|---|---|---|
| Dynamic MQTT topic support | ✅ Done | `getStaticPropertyByName` recurses into `StaticPropertyAlternative` |
| Maximo asset import (service + REST) | ✅ Done | Backend compile-verified |
| YAML adapter upload endpoint | ✅ Done | Backend compile-verified |
| Asset hierarchy enrichment processor | ✅ Done | Backend compile-verified |
| Platform-services API methods | ✅ Done | `importMaximoAssets()` + `uploadAdapterConfig()` |
| Frontend: Maximo import + YAML upload buttons | ✅ Done | Angular build passes |
| Adapter-to-asset topic mapping | ✅ Done | CouchDB `adapter-asset-mappings`; `/assets/mappings` route |
| Asset linking (null-safe + JSON POST) | ✅ Done | Null-safe traversal; Angular POSTs JSON directly |
| MQTT auto-publish pipeline | ✅ Done | Singleton CouchDB config; auto-creates pipeline per adapter |
| Timestamp field on adapter create/import | ✅ Done | `addTimestampProperty()` in `AdapterSchemaGenerator` |
| Automation config section (UI) | ✅ Done | `/configuration/automation`; Pipelines + Adapters tabs |
| PLC device registry | ✅ Done | Full-stack CRUD; slide-in panels; reachability check; adapter count |
| Automation label assignment | ✅ Done | `pipelineLabelIds` + `adapterLabelIds`; multi-select pickers |
| Manual adapter creation automation | ✅ Done | `enrichOnCreate()` + `tryAutoDeployPipeline()` in `AbstractAdapterResource` |
| Asset grouping by parent asset | ✅ Done | Adapters grouped by parent asset; direct asset shown as context |
| Label grouping + adapter preview chips | ✅ Done | Label grouping fixed; labels + asset context shown in preview |
| Datasets page search box | ✅ Done | `SpTableFilterDirective` slot in `sp-table` toolbar; stacks with asset filter |
| Data Lake retention config in automation | ✅ Done | Toggle + days + interval in automation pipeline config; applied on pipeline start |
| Auto-deployed pipeline linked to adapter asset | ✅ Done | Both MQTT and Data Lake pipelines get `AssetLink(linkType="pipeline")` on the same asset node as the adapter |
| DataLakeMeasure linked to asset | ✅ Done | `linkMeasurementToAsset()` adds `AssetLink(linkType="measurement")`; `applyMeasurePostProcessing()` consolidates measure linking + retention |
| Multi-select + bulk delete for datasets | ✅ Done | Checkbox column, select-all, bulk delete button with `ConfirmDialogComponent`; `forkJoin` parallel delete |
| Built-in search filter in SpTableComponent | ✅ Done | `[showSearchFilter]="true"` on all 18 sp-table usages; filters `MatTableDataSource` via built-in predicate; grouped mode supported via explicit `refreshRenderedRows()` call |
| Execute button label restored | ✅ Done | `@Input() showMultiActionsExecuteButton` and `multiActionsExecuteLabel` were accidentally dropped; restored |
| Duplicate search boxes removed | ✅ Done | `sp-connect-filter-toolbar` removed from adapter page nav; external search removed from adapter-asset-mappings page |
| Delete dataset tooltip | ✅ Done | `matTooltip` on disabled "Delete dataset" menu item explains active pipeline constraint |
| OPC-UA device settings + adapter creation | ✅ Done | `SpDevice` extended with `opcuaEnabled/EndpointUrl/SecurityMode/Username/Password`; `DeviceResource` routes to OPC-UA config builder when adapter type is opcua; add-device panel has OPC-UA section; add-adapter dialog has OPC-UA option with warning when settings missing |
| Device registry overhaul (IP/Port split, simplified OPC-UA, chips, node browser) | ✅ Done | Split host/port fields; removed opcuaServerMode/Url/Host; OPC-UA always uses device.host; colored protocol chips; OpcuaBrowseService + OpcuaBrowseDialogComponent with mat-tree for node selection |
| OPC-UA node browser fix + device form defaults | ✅ Done | Fixed two URL bugs in OpcuaBrowseService; prefill port=80; added `(default=X)` labels; endpoint URL shown in browse dialog |
| OPC-UA node tree expand + node names | ✅ Done | Fixed `treeControl.isExpanded()` → `tree.isExpanded()` (ViewChild MatTree API); fixed `node.label` → `node.nodeName`; folder/folder_open icons; `@if` children visibility |
| OPC-UA adapter start (NAMING_STRATEGY crash) | ✅ Done | `PipelineElementTemplateVisitor.visit(OneOfStaticProperty)` now matches by `option.internalName` in addition to `option.name`; fixes `NoSuchElementException` when starting OPC-UA adapter via device registry |

---

## First Thing To Do Next Session

No outstanding work. Smoke-test checklist:
- `docker compose build backend && docker compose up -d backend` (rebuild needed — pipeline-management fix)
- **Device add**: Port field pre-fills 80; Polling Interval shows 1000; labels show `(default=X)`
- **OPC-UA device**: enable OPC-UA toggle; OPC-UA Port shows `(default=4840)` with 4840 pre-filled
- **OPC-UA adapter**: click "Browse Nodes" → dialog shows `opc.tcp://host:4840`; tree loads from live server; checkboxes select nodes; Apply stores selection
- **Protocol chips**: PLC4x chip is teal, OPC-UA chip is blue; tooltips show connection details
- **sp-table search**: every page using `sp-table` shows search input; typing filters rows
- **Dataset delete tooltip**: when a dataset is in active pipeline, hovering the disabled Delete menu item shows tooltip
- **Auto-link on adapter create**: create adapter that matches a mapping → adapter appears in the matched asset's Asset Context column

---

## All Modified/Created Files

### Backend (Java/Maven)

| File | Change |
|---|---|
| `streampipes-resource-management/src/main/java/.../maximo/MaximoLocation.java` | NEW |
| `streampipes-resource-management/src/main/java/.../maximo/MaximoImportResult.java` | NEW |
| `streampipes-resource-management/src/main/java/.../maximo/MaximoAssetImportService.java` | NEW |
| `streampipes-rest/src/main/java/.../rest/impl/MaximoAssetImportResource.java` | NEW |
| `streampipes-rest/src/main/java/.../rest/impl/connect/CompactAdapterResource.java` | MODIFIED — YAML upload + MQTT auto-pipeline hook |
| `streampipes-rest/src/main/java/.../rest/impl/connect/AdapterAssetMappingResource.java` | MODIFIED — JSON `@PostMapping` + CSV header fix |
| `streampipes-rest/src/main/java/.../rest/impl/admin/AutoMqttConfigResource.java` | NEW |
| `streampipes-model/src/main/java/.../model/configuration/MqttAutoPublishConfig.java` | NEW — singleton config model; MODIFIED — added data lake retention fields |
| `streampipes-storage-api/src/main/java/.../storage/api/core/INoSqlStorage.java` | MODIFIED — added `getMqttAutoPublishConfigStorage()` + `getDeviceStorage()` |
| `streampipes-storage-api/src/main/java/.../storage/api/system/IMqttAutoPublishConfigStorage.java` | NEW |
| `streampipes-storage-couchdb/src/main/java/.../CouchDbStorageManager.java` | MODIFIED — wired MQTT config + device storage |
| `streampipes-storage-couchdb/src/main/java/.../impl/system/MqttAutoPublishConfigStorageImpl.java` | NEW |
| `streampipes-connect-management/src/main/java/.../compact/MqttPublisherPipelineHandler.java` | NEW |
| `streampipes-resource-management/src/main/java/.../connect/AdapterAssetEnrichmentService.java` | MODIFIED — null-safe `findAssetByMqttTopic` |
| `streampipes-extensions/streampipes-connectors-mqtt/.../shared/MqttConnectUtils.java` | MODIFIED — TOPIC_MODE constants + factory methods |
| `streampipes-extensions/streampipes-connectors-mqtt/.../sink/MqttPublisherSink.java` | MODIFIED — dynamic topic via `getStaticPropertyByName` |
| `streampipes-extensions/streampipes-connectors-mqtt/.../shared/MqttPublisher.java` | MODIFIED — `publish(Event, String)` overload |
| `streampipes-extensions/streampipes-processors-enricher-jvm/.../assethierarchy/AssetHierarchyEnrichmentProcessor.java` | NEW |
| `streampipes-extensions/streampipes-processors-enricher-jvm/.../EnricherExtensionModuleExport.java` | MODIFIED — registered new processor |
| `streampipes-model/src/main/java/.../model/connect/adapter/SpDevice.java` | MODIFIED — added `port` field (device port, default 0=80); removed `opcuaServerMode/EndpointUrl/Host`; kept `opcuaPort`; full OPC-UA fields |
| `streampipes-rest/src/main/java/.../rest/impl/connect/DeviceResource.java` | MODIFIED — `checkReachable()` uses `device.getPort()` (default 80); `buildOpcUaConfig()` always uses OPC_HOST mode with `device.getHost()` + `device.getOpcuaPort()` |
| `streampipes-storage-api/src/main/java/.../storage/api/connect/ISpDeviceStorage.java` | NEW |
| `streampipes-storage-couchdb/src/main/java/.../impl/connect/SpDeviceStorageImpl.java` | NEW |
| `streampipes-rest/src/main/java/.../rest/impl/connect/DeviceResource.java` | NEW — `GET/POST/PUT/DELETE /api/v2/devices`; Checkstyle import fix applied |
| `streampipes-connect-management/src/main/java/.../compact/generator/AdapterSchemaGenerator.java` | MODIFIED — `utils.addTimestamp(event)` in default transform |
| `streampipes-rest/src/main/java/.../rest/impl/connect/AbstractAdapterResource.java` | MODIFIED — `applyMeasurePostProcessing()` (measure asset link + retention) after Data Lake start; `linkPipelineToAsset()` after both auto-deploys |

### Frontend (Angular)

| File | Change |
|---|---|
| `ui/projects/streampipes/platform-services/src/lib/apis/asset-management.service.ts` | MODIFIED — `importMaximoAssets(file)` |
| `ui/projects/streampipes/platform-services/src/lib/apis/adapter.service.ts` | MODIFIED — `uploadAdapterConfig(file)` |
| `ui/projects/streampipes/platform-services/src/lib/apis/adapter-asset-mapping.service.ts` | NEW — `getAllMappings()`, `saveMapping()`, `uploadMappingCsv()` |
| `ui/projects/streampipes/platform-services/src/lib/apis/mqtt-auto-publish-config.service.ts` | NEW — `getConfig()` / `updateConfig()`; MODIFIED — added data lake retention fields |
| `ui/projects/streampipes/platform-services/src/lib/apis/device.service.ts` | MODIFIED — `SpDevice`: added `port`; removed `opcuaServerMode/EndpointUrl/Host`; `emptyDevice()` updated; full OPC-UA fields retained |
| `ui/src/app/connect/components/device-registry/add-device/add-device.component.ts` | MODIFIED — `isValid` updated (host + port required for OPC-UA) |
| `ui/src/app/connect/components/device-registry/add-device/add-device.component.html` | MODIFIED — 'IP Address / Host' + 'Port' fields; OPC-UA section: read-only host ref + opcuaPort only |
| `ui/src/app/connect/components/device-registry/add-adapter-dialog/add-adapter-dialog.component.ts` | MODIFIED — `openNodeBrowser()` + `OpcuaBrowseService` integration; `MatDialog` for browse dialog; `selectedOpcuaNodes[]` |
| `ui/src/app/connect/components/device-registry/add-adapter-dialog/add-adapter-dialog.component.html` | MODIFIED — Browse Nodes button + selected count badge; manual node IDs textarea still available |
| `ui/src/app/connect/components/device-registry/add-adapter-dialog/opcua-browse-dialog/opcua-browse-dialog.component.ts` | NEW — `MatDialog`-based OPC-UA node tree browser with lazy child loading and checkbox selection |
| `ui/src/app/connect/components/device-registry/add-adapter-dialog/opcua-browse-dialog/opcua-browse-dialog.component.html` | NEW |
| `ui/src/app/connect/components/device-registry/opcua-browse.service.ts` | NEW — `loadAdapterDescription()` + `browseNodes()` (pre-fills static properties from device settings); `prefillProperties()` traversal handles Alternatives/OneOf/FreeText |
| `ui/src/app/connect/components/device-registry/device-registry.component.ts` | MODIFIED — removed `MatChipSet/MatChip` imports (chips replaced with custom `<span>` elements) |
| `ui/src/app/connect/components/device-registry/device-registry.component.html` | MODIFIED — protocol chips use `.protocol-chip--plc4x` and `.protocol-chip--opcua` classes; tooltip shows `host:port` |
| `ui/src/app/connect/components/device-registry/device-registry.component.scss` | MODIFIED — `.protocol-chip`, `.protocol-chip--plc4x` (teal), `.protocol-chip--opcua` (blue) styles |
| `ui/projects/streampipes/platform-services/src/public-api.ts` | MODIFIED — exports mqtt config, device, adapter-asset-mapping services |
| `ui/src/app/assets/components/asset-overview/asset-overview.component.html` | MODIFIED — Maximo import + Adapter Mappings buttons |
| `ui/src/app/assets/components/asset-overview/asset-overview.component.ts` | MODIFIED — `triggerMaximoImport()` |
| `ui/src/app/assets/assets.routes.ts` | MODIFIED — added `/assets/mappings` route |
| `ui/src/app/assets/components/adapter-asset-mappings/adapter-asset-mappings.component.ts` | NEW |
| `ui/src/app/assets/components/adapter-asset-mappings/adapter-asset-mappings.component.html` | NEW |
| `ui/src/app/configuration/configuration-sections.providers.ts` | MODIFIED — added Automation section |
| `ui/src/app/configuration/pipeline-setup-configuration/pipeline-setup-configuration.component.ts` | NEW — automation config page; MODIFIED — Data Lake retention null-safe init |
| `ui/src/app/configuration/pipeline-setup-configuration/pipeline-setup-configuration.component.html` | NEW — automation config page; MODIFIED — Data Lake retention toggle + days + interval |
| `ui/src/app/connect/components/device-registry/device-registry.component.ts` | NEW |
| `ui/src/app/connect/components/device-registry/device-registry.component.html` | NEW |
| `ui/src/app/connect/components/device-registry/add-adapter-dialog/add-adapter-dialog.component.ts` | NEW |
| `ui/src/app/connect/components/device-registry/add-adapter-dialog/add-adapter-dialog.component.html` | NEW |
| `ui/src/app/connect/connect.routes.ts` | MODIFIED — added `/connect/devices` route |
| `ui/src/app/connect/components/existing-adapters/existing-adapters.component.html` | MODIFIED — Device Registry navigation button |
| `ui/src/app/dataset/components/datalake-configuration/datalake-configuration.component.ts` | MODIFIED — removed custom search; uses built-in `[showSearchFilter]`; `SpTableMultiActionsDirective`; `bulkDeleteDatasets()`; `canBulkDelete()` |
| `ui/src/app/dataset/components/datalake-configuration/datalake-configuration.component.html` | MODIFIED — `[showSearchFilter]="true"` + `ng-template[spTableMultiActions]` bulk delete button; removed custom `spTableFilter` slot |
| `ui/projects/streampipes/shared-ui/src/lib/components/sp-table/sp-actions/sp-table-filter.directive.ts` | NEW |
| `ui/projects/streampipes/shared-ui/src/lib/components/sp-table/sp-table.component.ts` | MODIFIED — `@Input() showSearchFilter`; `builtInSearchTerm`; `onBuiltInSearchChange()`; `shouldShowToolbar` getter; `MatLabel/MatPrefix/MatInput/FormsModule` imports |
| `ui/projects/streampipes/shared-ui/src/lib/components/sp-table/sp-table.component.html` | MODIFIED — standalone toolbar condition updated to `shouldShowToolbar`; search input added to both standalone and selection toolbars; grouping controls gated on `shouldShowGroupingControls` |
| `ui/projects/streampipes/shared-ui/src/lib/components/sp-table/sp-table.component.scss` | MODIFIED — `.grouping-toolbar__filter` styles |
| `ui/projects/streampipes/shared-ui/src/public-api.ts` | MODIFIED — exports `SpTableFilterDirective` |

---

## Key Technical Decisions

### Checkstyle: Import Order (always check when adding Java imports)
- Groups: `org.apache.streampipes` → `*` → `jakarta` → `javax` → `java` → `scala`, static imports last.
- Imports must be **strictly alphabetical** within each group — appending at the end of a group fails the build.
- Quick check: `mvn -pl <module> checkstyle:check`

### MQTT Auto-Publish Pipeline
- Singleton CouchDB document (`_id = "mqtt-auto-publish-config"`)
- `MqttPublisherPipelineHandler` mirrors `PersistPipelineHandler`; builds `CompactPipeline` directly
- If adapter schema has a `topic` field, dynamic mode is used automatically with selector `"s0::topic"`
- For `StaticPropertyAlternatives` in `PipelineElementTemplateVisitor`: put the alternative ID AND nested keys in the **same** config map (e.g., `Map.of(TOPIC_MODE, DYNAMIC_TOPIC_ALTERNATIVE, TOPIC_FIELD, "s0::topic")`)
- Errors in auto-pipeline creation are logged as warnings; adapter creation still succeeds

### Asset Linking
- `findAssetByMqttTopic` guards against null `additionalData` and null `assets` list — CouchDB deserializes old documents via `UnsafeAllocator` (field initializers don't run)
- JSON POST to `/api/v2/connect/adapter-asset-mappings` is more reliable than CSV round-trip

### Dynamic MQTT Topic
- `mappingPropertyValue()` only iterates top-level static properties — misses `MappingPropertyUnary` inside `StaticPropertyAlternative`
- Fix: `getStaticPropertyByName(TOPIC_FIELD, MappingPropertyUnary.class)` recurses correctly

### Maximo Import
- Root nodes: any location whose composite key (`SITEID:LOCATION`) is not referenced as PARENT in the batch
- Zone detection regex: `^[A-Za-z]+-\d{7}$`
- MQTT topic from ROUTE: `route.replace("; ", "/").replace(";", "/").trim()`
- Use `SpAsset` (not `SpAssetModel`) for the `setAssets()` list type

### Asset Hierarchy Enrichment Processor
- `onPipelineStarted` uses the 3-param signature
- Use `SO.TEXT` (not `XSD.STRING` URI) in `EpProperties.stringEp()`

### Device Registry — IP/Port Split & OPC-UA Simplification
- `SpDevice.host` = IP only (no port suffix); `SpDevice.port` = device-level TCP port (0 = use default 80 for reachability)
- `SpDevice.opcuaPort` = OPC-UA server port (default 4840); `opcuaServerMode/opcuaEndpointUrl/opcuaHost` removed
- `buildOpcUaConfig()` always uses `OPC_HOST` mode with `device.getHost()` + `device.getOpcuaPort()` — no URL mode anymore
- `checkReachable()` uses `device.getPort() > 0 ? device.getPort() : 80`

### OPC-UA Node Browser (Runtime-Resolvable API)
- GET `/api/v2/connect/master/description/{appId}` to load the adapter template (lazy, cached in component)
- POST `/api/v2/connect/master/resolvable/{uuid}/configurations` with `RuntimeOptionsRequest`; `adapterId` path var is ignored by the worker — any UUID works
- `request.appId = OPCUA_APP_ID`, `request.requestId = 'AVAILABLE_NODES'`, `request.staticProperties` = pre-filled template
- `prefillProperties()` traverses `StaticPropertyAlternatives` (OPC_HOST_OR_URL, ADAPTER_TYPE, userAuthentication), `OneOfStaticProperty` (securityMode, securityPolicy), `FreeTextStaticProperty` by internalName
- Sub-node lazy loading: set `sp.nextBaseNodeToResolve = node.internalNodeName` before re-calling; the response contains only that subtree

### YAML Upload with Pre-defined Schema
- `AdapterSchemaGenerator.apply()` skips live `getSampleData()` when `compactAdapter.schema()` is non-null/non-empty
- Default `runtimeType` = `XSD double` URI (fits Modbus/energy meter registers)

### Auto-Deployed Pipeline Asset Linking
- `AdapterAssetEnrichmentService.linkPipelineToAsset(pipelineId, pipelineName, adapterName)` looks up the adapter-asset mapping → gets topic → traverses all assets for a node with `additionalData["mqtt_topic"] == topic` → adds `AssetLink(linkType="pipeline")`
- Shared `linkResourceToAsset()` private helper is now used by both `linkToAsset` (adapters) and `linkPipelineToAsset` (pipelines) to avoid code duplication
- Called in `AbstractAdapterResource.tryAutoDeployPipeline()` after both MQTT and Data Lake auto-deploy; errors are logged and never propagate to the caller

### Data Lake Retention (automation pipeline)
- `applyRetentionToMeasure()` runs after `createAndStartPersistPipeline` when retention is enabled
- `DataLakeMeasure` is registered asynchronously by the extensions service; if not yet present on first invocation the method logs debug and does nothing — set retention manually from the Datasets page on first deploy

### OPC-UA Device Registry

- `SpDevice` now carries optional OPC-UA fields — existing PLC-only devices round-trip correctly (fields default to `false`/`""`)
- `DeviceResource.buildCompactAdapter()` branches on `OPCUA_APP_ID` constant; all config map entries for the OPC-UA `PipelineElementTemplateVisitor` must follow the same-map-entry pattern for alternatives (just like PLC4x)
- OPC-UA config map keys: `OPC_HOST_OR_URL + OPC_SERVER_URL` (same entry), `securityMode`, `securityPolicy`, `userAuthentication` (+ nested `USERNAME`/`PASSWORD` in same entry), `ADAPTER_TYPE`, `NAMING_STRATEGY`, `AVAILABLE_NODES`
- Security policy defaults to `"None"` when mode is `"None"`, otherwise `"Basic256Sha256"`
- Node block format: `name=ns=2;s=Device1.Temperature` — same `name=value` pattern as PLC4x code block; parser splits on first `=`
- `AVAILABLE_NODES` config entry is omitted when node block is empty — adapter will attempt to browse all available nodes on startup
- `isValid` in `add-device` now allows OPC-UA-only devices (no PLC host required when `opcuaEnabled = true`)
- `isValid` in `add-adapter-dialog` blocks Create when OPC-UA type selected but device lacks OPC-UA settings
- `@Input() showSearchFilter = false` on `SpTableComponent` — set to `true` on all 18 usages
- `onBuiltInSearchChange()` sets `dataSource.filter = builtInSearchTerm.toLowerCase().trim()` which triggers the default `MatTableDataSource` filter predicate (concatenates all string properties)
- `shouldShowToolbar` getter returns true when `assetContextConfig`, `showSearchFilter`, or `filterTemplate` is set — drives toolbar visibility
- Grouping controls (list/grouped toggle + group-by select) only render when `shouldShowGroupingControls` (i.e. `!!assetContextConfig`) is true — they are asset-context-only features
- Search input appears in both the standalone toolbar (no checkboxes) and the selection toolbar (with checkboxes active)

---

## Build Commands

```powershell
# Backend — full build
mvn clean package -DskipTests

# Backend — targeted module (fast)
mvn -pl <module> -am -DskipTests "-Dmaven.javadoc.skip=true" "-Drat.skip=true" "-Dcheckstyle.skip=true" install -q

# Frontend — quick dev build (no i18n validation)
cd ui && npm run build-dev

# Frontend — full production build
cd ui && npm run build

# Redeploy after changes
docker compose build backend ui && docker compose up -d backend ui
```

---

## Potential Follow-up Issues

1. **Angular `MatTooltip` import** — components using `matTooltip` must have it in their `imports[]` array
2. **`public-api.ts` exports** — any new service consumed outside the library must be exported from both `platform-services` and `shared-ui` `public-api.ts` as appropriate
3. **Data Lake retention timing** — retention is applied on pipeline start; if the measure doesn't exist yet (first deploy), set it manually from the Datasets page