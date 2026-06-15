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

## Status

| Feature | Status | Notes |
|---|---|---|
| Dynamic MQTT topic support | ✅ Done | Uses `getStaticPropertyByName` to correctly find nested `MappingPropertyUnary` |
| Maximo asset import (service + REST) | ✅ Done | Backend compile-verified |
| YAML adapter upload endpoint | ✅ Done | Backend compile-verified |
| Asset hierarchy enrichment processor | ✅ Done | Backend compile-verified |
| Platform-services API methods | ✅ Done | `importMaximoAssets()` + `uploadAdapterConfig()` |
| Frontend: Maximo import button (assets) | ✅ Done | Angular build passes |
| Frontend: YAML upload button (connect) | ✅ Done | Angular build passes |
| **Angular build verification** | ✅ Done | Build passes — only pre-existing CommonJS warnings |
| Adapter-to-asset topic mapping (backend) | ✅ Done | CouchDB `adapter-asset-mappings` db; enrichment + asset linking service |
| Asset linking fix (null-safe traversal) | ✅ Done | NPE on null `additionalData` in nested `SpAsset` nodes no longer silently aborts linking |
| Asset linking fix (direct JSON save) | ✅ Done | Angular `saveMapping()` now POSTs JSON (not CSV) to new `@PostMapping` on `AdapterAssetMappingResource` |
| CSV header detection fix | ✅ Done | Backend also accepts `adaptername` header prefix in CSV upload |
| Dynamic MQTT topic fix | ✅ Done | `getStaticPropertyByName` correctly recurses into `StaticPropertyAlternative` |
| Adapter-to-asset mapping UI page | ✅ Done | `/assets/mappings` route; table + add form + CSV upload |
| Upload error handling fix | ✅ Done | Separate catches for `JsonProcessingException` vs `WorkerAdapterException` |
| Routing fix for mappings button | ✅ Done | Fixed absolute routerLink; added "Asset Mappings" button to connect page |
| YAML upload with pre-defined schema | ✅ Done | Skip live device guessing when `schema` block is present in YAML |
| **MQTT auto-publish pipeline** | ✅ Done | Global config stored in CouchDB; auto-creates MQTT pipeline per adapter on upload |
| **Timestamp field on adapter create/import** | ✅ Done | `addTimestampProperty()` in `AdapterSchemaGenerator`; default script includes `event.timestamp = Date.now()` |

---

## Status: All Features Complete ✅

All features implemented, compile-verified (backend), build-verified (frontend), and deployed.
Each feature has its own git commit on branch `copilot-cli`.

## First Thing To Do Next Session

- Push `copilot-cli` branch and open a pull request
- Test the MQTT auto-publish pipeline creation end-to-end:
  1. Go to Configuration → MQTT, enable auto-publish, enter broker URL
  2. Upload a YAML adapter config
  3. Verify a pipeline named `mqtt-<adapter>` appears and starts publishing
- Also verify asset linking works by checking that the asset in the UI shows the adapter link after YAML upload

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
| `streampipes-rest/src/main/java/.../rest/impl/admin/AutoMqttConfigResource.java` | NEW — `GET/PUT /api/v2/config/mqtt-auto-publish` |
| `streampipes-model/src/main/java/.../model/configuration/MqttAutoPublishConfig.java` | NEW — singleton config model |
| `streampipes-storage-api/src/main/java/.../storage/api/core/INoSqlStorage.java` | MODIFIED — added `getMqttAutoPublishConfigStorage()` |
| `streampipes-storage-api/src/main/java/.../storage/api/system/IMqttAutoPublishConfigStorage.java` | NEW |
| `streampipes-storage-couchdb/src/main/java/.../CouchDbStorageManager.java` | MODIFIED — wired new storage impl |
| `streampipes-storage-couchdb/src/main/java/.../impl/system/MqttAutoPublishConfigStorageImpl.java` | NEW — CouchDB db `mqtt-auto-publish-config` |
| `streampipes-connect-management/src/main/java/.../compact/MqttPublisherPipelineHandler.java` | NEW — builds CompactPipeline with dynamic topic |
| `streampipes-resource-management/src/main/java/.../connect/AdapterAssetEnrichmentService.java` | MODIFIED — null-safe `findAssetByMqttTopic` |
| `streampipes-extensions/.../sink/MqttPublisherSink.java` | MODIFIED — dynamic topic via `getStaticPropertyByName` |

### Frontend (Angular)

| File | Change |
|---|---|
| `ui/projects/streampipes/platform-services/src/lib/apis/adapter-asset-mapping.service.ts` | MODIFIED — `saveMapping()` uses JSON POST |
| `ui/projects/streampipes/platform-services/src/lib/apis/mqtt-auto-publish-config.service.ts` | NEW — `getConfig()` / `updateConfig()` |
| `ui/projects/streampipes/platform-services/src/public-api.ts` | MODIFIED — exports new service |
| `ui/src/app/configuration/configuration-sections.providers.ts` | MODIFIED — added MQTT section |
| `ui/src/app/configuration/mqtt-configuration/mqtt-configuration.component.ts` | NEW |
| `ui/src/app/configuration/mqtt-configuration/mqtt-configuration.component.html` | NEW |

---

## Key Technical Decisions

### Checkstyle: Import Order Rule (IMPORTANT — always check when adding imports)
- Checkstyle enforces **strict alphabetical order** within each import group.
- Groups: `org.apache.streampipes` → `*` → `jakarta` → `javax` → `java` → `scala`, then static imports at the bottom.
- Within each package prefix sub-group (e.g. `org.apache.streampipes.storage.api.system.*`), imports must also be alphabetical by the simple class name.
- **Gotcha**: when adding a new import to a file, it must be inserted at the correct alphabetical position — appending it at the end of its group is wrong and will fail Checkstyle.
- Example: `IMqttAutoPublishConfigStorage` (M) must come before `ISpCoreConfigurationStorage` (S), not after `ITransformationScriptTemplateStorage`.
- Quick verification: `mvn -pl <module> checkstyle:check` — exit 0 means clean.

### MQTT Auto-Publish Pipeline
- Global config stored as a singleton CouchDB document (`_id = "mqtt-auto-publish-config"`)
- `MqttPublisherPipelineHandler` mirrors `PersistPipelineHandler` pattern, builds `CompactPipeline` directly without needing a template
- If adapter schema has a `topic` field (added by `AdapterAssetEnrichmentService`), dynamic mode is used automatically with selector `"s0::topic"`
- For `StaticPropertyAlternatives` config in `PipelineElementTemplateVisitor`: put the alternative ID AND nested property keys in the **same** config map (e.g., `Map.of(TOPIC_MODE, DYNAMIC_TOPIC_ALTERNATIVE, TOPIC_FIELD, "s0::topic")`)
- Errors in auto-pipeline creation are caught and logged as warnings; the adapter creation itself still succeeds

### Asset Linking
- `findAssetByMqttTopic` now guards against `null` `additionalData` and `null` `assets` list — both can be null when CouchDB deserializes old documents via `UnsafeAllocator` (field initializers don't run)
- Direct JSON POST to `/api/v2/connect/adapter-asset-mappings` is more reliable than CSV round-trip

### Dynamic MQTT Topic Bug (fixed)
- `mappingPropertyValue()` only iterates top-level static properties — misses `MappingPropertyUnary` inside `StaticPropertyAlternative`
- `getStaticPropertyByName(internalName, MappingPropertyUnary.class)` recurses correctly

---

## Build Commands

```powershell
# Backend — full build
mvn clean package -DskipTests

# Frontend — quick dev build (no i18n validation)
cd ui && npm run build-dev

# Redeploy
docker compose build backend ui && docker compose up -d backend ui
```


> **Maintenance:** Update this file at the end of every session. The workflow is defined in `.github/copilot-instructions.md` under "Session Workflow".

## Project Goal
Extend Apache StreamPipes for Industrial IoT use cases with:
1. Import asset hierarchies from Maximo JSON exports
2. Upload adapter configs via YAML file
3. Enrich datapoint streams with asset hierarchy metadata
4. Dynamic MQTT topics derived from event fields
5. Frontend UI for import/upload features

---

## Status

| Feature | Status | Notes |
|---|---|---|
| Dynamic MQTT topic support | ✅ Done | Backend compile-verified |
| Maximo asset import (service + REST) | ✅ Done | Backend compile-verified |
| YAML adapter upload endpoint | ✅ Done | Backend compile-verified |
| Asset hierarchy enrichment processor | ✅ Done | Backend compile-verified |
| Platform-services API methods | ✅ Done | `importMaximoAssets()` + `uploadAdapterConfig()` |
| Frontend: Maximo import button (assets) | ✅ Done | Angular build passes |
| Frontend: YAML upload button (connect) | ✅ Done | Angular build passes |
| **Angular build verification** | ✅ Done | Build passes — only pre-existing CommonJS warnings |
| Adapter-to-asset topic mapping (backend) | ✅ Done | CouchDB `adapter-asset-mappings` db; enrichment + asset linking service |
| Asset linking fix | ✅ Done | `findAssetByPath` replaced with `findAssetByMqttTopic` matching on `additionalData["mqtt_topic"]` |
| Dynamic MQTT topic fix | ✅ Done | Use `getStaticPropertyByName` instead of `mappingPropertyValue` to find nested `MappingPropertyUnary` |
| Adapter-to-asset mapping UI page | ✅ Done | `/assets/mappings` route; table + add form + CSV upload |
| Upload error handling fix | ✅ Done | Separate catches for `JsonProcessingException` vs `WorkerAdapterException` |
| Routing fix for mappings button | ✅ Done | Fixed absolute routerLink; added "Asset Mappings" button to connect page |
| YAML upload with pre-defined schema | ✅ Done | Skip live device guessing when `schema` block is present in YAML |

---

## Status: All Features Complete ✅

All features implemented, compile-verified (backend), build-verified (frontend), and deployed against a live instance.
Each feature has its own git commit on branch `copilot-cli`.

## Next Steps (if any)

- Push `copilot-cli` branch and open a pull request
- Consider adding Cypress E2E tests for the new UI buttons and mapping page

---

## All Modified/Created Files

### Backend (Java/Maven)

| File | Change |
|---|---|
| `streampipes-resource-management/src/main/java/.../maximo/MaximoLocation.java` | NEW — Maximo JSON POJO |
| `streampipes-resource-management/src/main/java/.../maximo/MaximoImportResult.java` | NEW — result DTO |
| `streampipes-resource-management/src/main/java/.../maximo/MaximoAssetImportService.java` | NEW — business logic: JSON → SpAssetModel tree |
| `streampipes-rest/src/main/java/.../rest/impl/MaximoAssetImportResource.java` | NEW — `POST /api/v2/assets/import/maximo` (multipart) |
| `streampipes-rest/src/main/java/.../rest/impl/connect/CompactAdapterResource.java` | MODIFIED — added `POST /api/v2/connect/compact-adapters/upload` (multipart YAML) |
| `streampipes-extensions/streampipes-connectors-mqtt/.../shared/MqttConnectUtils.java` | MODIFIED — TOPIC_MODE constants + factory methods |
| `streampipes-extensions/streampipes-connectors-mqtt/.../sink/MqttPublisherSink.java` | MODIFIED — static/dynamic topic alternatives |
| `streampipes-extensions/streampipes-connectors-mqtt/.../shared/MqttPublisher.java` | MODIFIED — `publish(Event, String)` overload |
| `streampipes-extensions/streampipes-connectors-mqtt/.../resources/.../strings.en` | MODIFIED — new topic-mode labels |
| `streampipes-extensions/streampipes-processors-enricher-jvm/.../assethierarchy/AssetHierarchyEnrichmentProcessor.java` | NEW — pipeline element processor |
| `streampipes-extensions/streampipes-processors-enricher-jvm/.../assethierarchy/strings.en` | NEW — localization |
| `streampipes-extensions/streampipes-processors-enricher-jvm/.../assethierarchy/documentation.md` | NEW — user docs |
| `streampipes-extensions/streampipes-processors-enricher-jvm/.../EnricherExtensionModuleExport.java` | MODIFIED — registered new processor |

### Frontend (Angular)

| File | Change |
|---|---|
| `ui/projects/streampipes/platform-services/src/lib/apis/asset-management.service.ts` | MODIFIED — `importMaximoAssets(file)` |
| `ui/projects/streampipes/platform-services/src/lib/apis/adapter.service.ts` | MODIFIED — `uploadAdapterConfig(file)` |
| `ui/src/app/assets/components/asset-overview/asset-overview.component.html` | MODIFIED — "Import from Maximo" button + "Adapter Mappings" nav button |
| `ui/src/app/assets/components/asset-overview/asset-overview.component.ts` | MODIFIED — `triggerMaximoImport()`, `RouterLink` added |
| `ui/src/app/assets/assets.routes.ts` | MODIFIED — added `/assets/mappings` route |
| `ui/projects/streampipes/platform-services/src/lib/apis/adapter-asset-mapping.service.ts` | NEW — `getAllMappings()`, `saveMapping()`, `uploadMappingCsv()` |
| `ui/projects/streampipes/platform-services/src/public-api.ts` | MODIFIED — exports `adapter-asset-mapping.service` |
| `ui/src/app/assets/components/adapter-asset-mappings/adapter-asset-mappings.component.ts` | NEW — mapping management page component |
| `ui/src/app/assets/components/adapter-asset-mappings/adapter-asset-mappings.component.html` | NEW — template |

---

## Key Technical Decisions

### MQTT Dynamic Topics
- Uses `Alternatives` in `MqttPublisherSink` — static text param OR mapping property selector
- `extractDataSinkParams()` passes `""` (not `null`) as topic when dynamic mode selected
- `MqttPublisher.publish(Event, String overrideTopic)` overload added for dynamic dispatch
- In `onEvent()`: resolves field from `dynamicTopicFieldSelector`, falls back to empty string if null

### Maximo Import
- Root nodes: any location whose composite key (`SITEID:LOCATION`) is not referenced as a PARENT within the batch
- Zone detection regex: `^[A-Za-z]+-\d{7}$`
- MQTT topic from ROUTE: `route.replace("; ", "/").replace(";", "/").trim()`
- `SpAsset` (not `SpAssetModel`) used as list type for `setAssets()` — important for Java generics
- Errors collected per-asset; partial import success is possible (returned in `MaximoImportResult`)

### Asset Hierarchy Enrichment Processor
- `onPipelineStarted(IDataProcessorParameters, SpOutputCollector, EventProcessorRuntimeContext)` — 3-param signature
- Use `SO.TEXT` (String constant from `org.apache.streampipes.vocabulary.SO`), NOT `XSD.STRING` (URI) in `EpProperties.stringEp()`
- No storage access — all config is static text params set at pipeline design time

### Dynamic MQTT Topic Bug (fixed)
- `mappingPropertyValue(internalName)` only iterates `sepaElement.getStaticProperties()` at the top level — it will **never** find a `MappingPropertyUnary` that lives inside a `StaticPropertyAlternative`
- `getStaticPropertyByName(internalName)` already recurses into the selected alternative (the correct behaviour)
- Fix: call `getStaticPropertyByName(TOPIC_FIELD, MappingPropertyUnary.class)` then call `getSelectedProperty()` on the result

### Asset Linking Bug (fixed)
- `findAssetByPath` matched by `assetName` (Maximo LOCATION code), but the mapping DB topic is derived from Maximo ROUTE — a completely different field
- Fix: replaced with `findAssetByMqttTopic` that searches `additionalData["mqtt_topic"]` (set by `MaximoAssetImportService`) for an exact topic match

- `AdapterSchemaGenerator.apply()` previously **always** called `getSampleData()` → required a live device connection
- Now: if `compactAdapter.schema()` is non-null/non-empty, skip live-device calls and build `EventSchema` directly from schema keys
- Default `runtimeType` = `XSD double` URI (fits Modbus/energy meter registers)
- Live-device path still used when no schema is provided (existing behaviour)

---

## Build Commands

```powershell
# Backend — verify affected modules
mvn -pl streampipes-extensions/streampipes-connectors-mqtt,streampipes-extensions/streampipes-processors-enricher-jvm,streampipes-resource-management,streampipes-rest -am -q test -DskipTests

# Frontend — quick dev build (no i18n validation)
cd ui && npm run build-dev

# Frontend — full production build
cd ui && npm run build

# Frontend — lint only
cd ui && npm run lint
```

---

## Potential Follow-up Issues to Watch

1. **Angular `MatTooltip` import** — both modified components use `matTooltip`; verify it's in `imports[]` array (already confirmed for asset-overview; verify for existing-adapters)
2. **`ConfirmDialogComponent` usage in asset-overview** — used via `MatDialog.open()` (not `DialogService`); this is intentional to show a plain confirmation after import
3. **`SpExceptionDetailsDialogComponent` in existing-adapters** — used for error display; already imported via `@streampipes/shared-ui`
4. **`public-api.ts` exports** — if `uploadAdapterConfig` or `importMaximoAssets` need to be exported from the library, check `ui/projects/streampipes/platform-services/src/public-api.ts`
