# StreamPipes IIoT Feature Extensions — Session Handoff

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
| Frontend: Maximo import button (assets) | ✅ Done | Needs Angular build verification |
| Frontend: YAML upload button (connect) | ✅ Done (code added) | Needs Angular build verification |
| **Angular build verification** | ✅ Done | Build passes — only pre-existing CommonJS warnings |

---

## Status: All Features Complete ✅

All 5 features are implemented, compile-verified (backend), and build-verified (frontend Angular dev build).
Each feature has its own git commit on branch `copilot-cli`.

## Next Steps (if any)

- Integration test against a running StreamPipes instance
- Push `copilot-cli` branch and open a pull request
- Consider adding Cypress E2E tests for the two new UI buttons

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
| `ui/src/app/assets/components/asset-overview/asset-overview.component.html` | MODIFIED — "Import from Maximo" button + hidden file input |
| `ui/src/app/assets/components/asset-overview/asset-overview.component.ts` | MODIFIED — `triggerMaximoImport()`, `onMaximoFileSelected()`, `@ViewChild maximoFileInput` |
| `ui/src/app/connect/components/existing-adapters/existing-adapters.component.html` | MODIFIED — "Upload config" button + hidden file input |
| `ui/src/app/connect/components/existing-adapters/existing-adapters.component.ts` | MODIFIED — `triggerAdapterConfigUpload()`, `onAdapterConfigFileSelected()`, `@ViewChild adapterConfigFileInput` |

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

### YAML Adapter Upload
- `jackson-dataformat-yaml` already in `streampipes-rest` pom
- New endpoint is `/api/v2/connect/compact-adapters/upload` (multipart) — complements the existing JSON/YAML body endpoint

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
