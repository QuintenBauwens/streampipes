/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

package org.apache.streampipes.rest.impl.connect;

import org.apache.streampipes.model.connect.ReduceEventRateRule;
import org.apache.streampipes.model.connect.RemoveDuplicateRule;
import org.apache.streampipes.model.connect.TransformationConfig;
import org.apache.streampipes.model.connect.adapter.AdapterDescription;
import org.apache.streampipes.model.connect.adapter.SpDevice;
import org.apache.streampipes.model.connect.adapter.compact.CompactAdapter;
import org.apache.streampipes.model.connect.adapter.compact.CompactEventProperty;
import org.apache.streampipes.model.connect.adapter.compact.CreateOptions;
import org.apache.streampipes.model.message.Notifications;
import org.apache.streampipes.model.staticproperty.FreeTextStaticProperty;
import org.apache.streampipes.storage.api.connect.ISpDeviceStorage;
import org.apache.streampipes.storage.management.StorageDispatcher;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v2/devices")
public class DeviceResource extends AbstractAdapterResource<Void> {

  private static final String PLC_IP = "plc_ip";
  private static final String PLC_POLLING_INTERVAL = "plc_polling_interval";
  private static final String PLC_NODE_INPUT_ALTERNATIVES = "plc_node_input_alternatives";
  private static final String PLC_NODE_INPUT_CODE_BLOCK_ALTIVE = "plc_node_input_code_block_altive";
  private static final String PLC_CODE_BLOCK = "plc_code_block";

  private static final String OPCUA_APP_ID = "org.apache.streampipes.connect.iiot.adapters.opcua";

  @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
  @PreAuthorize("this.hasReadAuthority()")
  public ResponseEntity<?> getAllDevices() {
    var devices = getStorage().findAll();

    // Build a map: normalised IP → list of adapter elementIds (live, includes deletions)
    var adaptersByIp = StorageDispatcher.INSTANCE.getNoSqlStore()
        .getAdapterInstanceStorage()
        .findAll()
        .stream()
        .filter(a -> extractPlcIp(a) != null)
        .collect(Collectors.groupingBy(
            a -> normaliseHost(extractPlcIp(a)),
            Collectors.mapping(AdapterDescription::getElementId, Collectors.toList())
        ));

    devices.forEach(device -> {
      var ip = normaliseHost(device.getHost());
      device.setAdapterIds(adaptersByIp.getOrDefault(ip, List.of()));
    });
    return ok(devices);
  }

  /** Extracts the value of the {@code plc_ip} FreeTextStaticProperty from an adapter config. */
  private String extractPlcIp(AdapterDescription adapter) {
    if (adapter.getConfig() == null) {
      return null;
    }
    return adapter.getConfig().stream()
        .filter(sp -> PLC_IP.equals(sp.getInternalName())
            && sp instanceof FreeTextStaticProperty)
        .map(sp -> ((FreeTextStaticProperty) sp).getValue())
        .filter(v -> v != null && !v.isBlank())
        .findFirst()
        .orElse(null);
  }

  /** Strips a port suffix so {@code "10.1.1.1:102"} and {@code "10.1.1.1"} both normalise to {@code "10.1.1.1"}. */
  private String normaliseHost(String host) {
    if (host == null) {
      return "";
    }
    int colon = host.indexOf(':');
    return colon >= 0 ? host.substring(0, colon).trim() : host.trim();
  }

  @PostMapping(
      consumes = MediaType.APPLICATION_JSON_VALUE,
      produces = MediaType.APPLICATION_JSON_VALUE
  )
  @PreAuthorize("this.hasWriteAuthority()")
  public ResponseEntity<?> createDevice(@RequestBody SpDevice device) {
    if (device.getElementId() == null || device.getElementId().isBlank()) {
      device.setElementId(UUID.randomUUID().toString());
    }
    getStorage().persist(device);
    return ok(Notifications.success(device.getElementId()));
  }

  @PutMapping(
      path = "{id}",
      consumes = MediaType.APPLICATION_JSON_VALUE,
      produces = MediaType.APPLICATION_JSON_VALUE
  )
  @PreAuthorize("this.hasWriteAuthority()")
  public ResponseEntity<?> updateDevice(@PathVariable("id") String id, @RequestBody SpDevice device) {
    var existing = getStorage().getElementById(id);
    if (existing == null) {
      return badRequest("Device not found: " + id);
    }
    device.setElementId(id);
    device.setRev(existing.getRev());
    getStorage().updateElement(device);
    return ok(Notifications.success(id));
  }

  @DeleteMapping(path = "{id}", produces = MediaType.APPLICATION_JSON_VALUE)
  @PreAuthorize("this.hasWriteAuthority()")
  public ResponseEntity<?> deleteDevice(@PathVariable("id") String id) {
    var existing = getStorage().getElementById(id);
    if (existing == null) {
      return badRequest("Device not found: " + id);
    }
    getStorage().deleteElement(existing);
    return ok(Notifications.success(id));
  }

  @GetMapping(path = "{id}/reachable", produces = MediaType.APPLICATION_JSON_VALUE)
  @PreAuthorize("this.hasReadAuthority()")
  public ResponseEntity<?> checkReachable(@PathVariable("id") String deviceId) {
    var device = getStorage().getElementById(deviceId);
    if (device == null) {
      return badRequest("Device not found: " + deviceId);
    }
    try {
      String host = device.getHost();
      int port = 102;
      if (host != null && host.contains(":")) {
        var parts = host.split(":", 2);
        host = parts[0];
        try {
          port = Integer.parseInt(parts[1]);
        } catch (NumberFormatException ignored) {
          // keep default S7 port
        }
      }
      try (var socket = new Socket()) {
        socket.connect(new InetSocketAddress(host, port), 2000);
        return ok(Map.of("reachable", true));
      }
    } catch (Exception e) {
      return ok(Map.of("reachable", false));
    }
  }

  @PostMapping(
      path = "{id}/adapter",
      consumes = MediaType.APPLICATION_JSON_VALUE,
      produces = MediaType.APPLICATION_JSON_VALUE
  )
  @PreAuthorize("this.hasWriteAuthority()")
  public ResponseEntity<?> createAdapterForDevice(
      @PathVariable("id") String deviceId,
      @RequestBody DeviceAdapterRequest request
  ) {
    var device = getStorage().getElementById(deviceId);
    if (device == null) {
      return badRequest("Device not found: " + deviceId);
    }
    if (request == null || request.adapterName() == null || request.adapterName().isBlank()) {
      return badRequest("Adapter name must not be blank");
    }

    var adapterId = UUID.randomUUID().toString();
    var compact = buildCompactAdapter(device, request, adapterId);

    return ok(compact);
  }

  private CompactAdapter buildCompactAdapter(SpDevice device, DeviceAdapterRequest request, String adapterId) {
    var effectiveType = request.adapterType() != null ? request.adapterType() : device.getAdapterType();
    var config = new ArrayList<Map<String, Object>>();

    Map<String, CompactEventProperty> schema;
    if (OPCUA_APP_ID.equals(effectiveType)) {
      buildOpcUaConfig(device, request, config);
      schema = request.schema() != null ? request.schema() : buildSchemaFromOpcUaNodeBlock(request.opcuaNodeBlock());
    } else {
      config.add(Map.of(PLC_IP, device.getHost()));
      config.add(Map.of(PLC_POLLING_INTERVAL, device.getPollingIntervalMs()));
      if (request.plcCodeBlock() != null && !request.plcCodeBlock().isBlank()) {
        // Both keys MUST be in the same map entry. PipelineElementTemplateVisitor.visit(StaticPropertyAlternatives)
        // narrows the config to List.of(that one entry) when it recurses into the selected alternative.
        // A sibling list entry for plc_code_block would be invisible to that nested visitor.
        var alternativesEntry = new HashMap<String, Object>();
        alternativesEntry.put(PLC_NODE_INPUT_ALTERNATIVES, PLC_NODE_INPUT_CODE_BLOCK_ALTIVE);
        alternativesEntry.put(PLC_CODE_BLOCK, request.plcCodeBlock());
        config.add(alternativesEntry);
      }
      schema = request.schema() != null ? request.schema() : buildSchemaFromCodeBlock(request.plcCodeBlock());
    }

    return new CompactAdapter(
        adapterId,
        request.adapterName(),
        request.description() != null ? request.description() : "",
        effectiveType,
        config,
        buildTransformationConfig(request),
        schema,
        new CreateOptions(false, true),
        null,
        device.getElementId()
    );
  }

  /**
   * Populates the CompactAdapter config list for an OPC-UA adapter using the device's
   * OPC-UA settings and the node block from the request.
   *
   * <p>Config keys mirror the static-property internal names used by the OPC-UA adapter
   * and are applied by {@code PipelineElementTemplateVisitor} when the CompactAdapter is
   * expanded into a full {@code AdapterDescription}.
   */
  private void buildOpcUaConfig(SpDevice device, DeviceAdapterRequest request,
                                List<Map<String, Object>> config) {
    // Connection (both keys must be in the same map entry for the alternatives visitor)
    var connectionEntry = new HashMap<String, Object>();
    if ("host".equals(device.getOpcuaServerMode())) {
      connectionEntry.put("OPC_HOST_OR_URL", "OPC_HOST");
      connectionEntry.put("OPC_SERVER_HOST",
          device.getOpcuaHost() != null ? device.getOpcuaHost() : "");
      connectionEntry.put("OPC_SERVER_PORT", device.getOpcuaPort());
    } else {
      connectionEntry.put("OPC_HOST_OR_URL", "OPC_URL");
      connectionEntry.put("OPC_SERVER_URL",
          device.getOpcuaEndpointUrl() != null ? device.getOpcuaEndpointUrl() : "");
    }
    config.add(connectionEntry);

    // Security mode and policy
    config.add(Map.of("securityMode",
        device.getOpcuaSecurityMode() != null ? device.getOpcuaSecurityMode() : "None"));
    config.add(Map.of("securityPolicy",
        device.getOpcuaSecurityPolicy() != null ? device.getOpcuaSecurityPolicy() : "None"));

    // Authentication — all auth keys in the same map entry for the alternatives visitor
    var authMethod = device.getOpcuaAuthMethod() != null ? device.getOpcuaAuthMethod() : "anonymous";
    var authEntry = new HashMap<String, Object>();
    authEntry.put("userAuthentication", authMethod);
    if ("USERNAME_GROUP".equals(authMethod)) {
      authEntry.put("USERNAME", device.getOpcuaUsername() != null ? device.getOpcuaUsername() : "");
      authEntry.put("PASSWORD", device.getOpcuaPassword() != null ? device.getOpcuaPassword() : "");
    } else if ("x509Group".equals(authMethod)) {
      authEntry.put("x509PrivateKeyPem",
          device.getOpcuaX509PrivateKey() != null ? device.getOpcuaX509PrivateKey() : "");
      authEntry.put("x509PublicKeyPem",
          device.getOpcuaX509PublicKey() != null ? device.getOpcuaX509PublicKey() : "");
    }
    config.add(authEntry);

    // Adapter mode — pull mode params must be in the same map entry as ADAPTER_TYPE
    var adapterMode = device.getOpcuaAdapterMode() != null ? device.getOpcuaAdapterMode() : "SUBSCRIPTION_MODE";
    var adapterTypeEntry = new HashMap<String, Object>();
    adapterTypeEntry.put("ADAPTER_TYPE", adapterMode);
    if ("PULL_MODE".equals(adapterMode)) {
      adapterTypeEntry.put("PULLING_INTERVAL", device.getOpcuaPullIntervalMs());
      adapterTypeEntry.put("incomplete-event-handling",
          device.getOpcuaIncompleteEvents() != null ? device.getOpcuaIncompleteEvents() : "ignore-event");
    }
    config.add(adapterTypeEntry);

    // Naming strategy — display name by default
    config.add(Map.of("NAMING_STRATEGY", "DISPLAY_NAME"));

    // Node selection (optional)
    var nodeIds = parseOpcUaNodeIds(request.opcuaNodeBlock());
    if (!nodeIds.isEmpty()) {
      config.add(Map.of("AVAILABLE_NODES", nodeIds));
    }
  }

  /**
   * Parses an OPC-UA node block into a list of node ID strings.
   * Each non-blank, non-comment line is expected in {@code name=nodeId} format;
   * only the nodeId part (everything after the first {@code =}) is returned.
   */
  private List<String> parseOpcUaNodeIds(String nodeBlock) {
    if (nodeBlock == null || nodeBlock.isBlank()) {
      return List.of();
    }
    return nodeBlock.lines()
        .map(String::trim)
        .filter(line -> !line.isBlank() && !line.startsWith("//"))
        .map(line -> {
          int eq = line.indexOf('=');
          return eq > 0 ? line.substring(eq + 1).trim() : line.trim();
        })
        .filter(id -> !id.isBlank())
        .collect(Collectors.toList());
  }

  /**
   * Builds a minimal schema from an OPC-UA node block (property name → null).
   * Each line is expected in {@code name=nodeId} format; only the name is used.
   */
  private Map<String, CompactEventProperty> buildSchemaFromOpcUaNodeBlock(String nodeBlock) {
    if (nodeBlock == null || nodeBlock.isBlank()) {
      return null;
    }
    var schema = new LinkedHashMap<String, CompactEventProperty>();
    nodeBlock.lines()
             .map(String::trim)
             .filter(line -> !line.isBlank() && !line.startsWith("//"))
             .forEach(line -> {
               int eq = line.indexOf('=');
               if (eq > 0) {
                 schema.put(line.substring(0, eq).trim(), null);
               }
             });
    return schema.isEmpty() ? null : schema;
  }

  /**
   * Parses a PLC code block into a minimal schema map (property name → null).
   * Lines starting with {@code //} and blank lines are skipped.
   * Each remaining line is expected in {@code propertyName=...} format.
   */
  private Map<String, CompactEventProperty> buildSchemaFromCodeBlock(String codeBlock) {
    if (codeBlock == null || codeBlock.isBlank()) {
      return null;
    }
    var schema = new LinkedHashMap<String, CompactEventProperty>();
    codeBlock.lines()
             .map(String::trim)
             .filter(line -> !line.isBlank() && !line.startsWith("//"))
             .forEach(line -> {
               int eq = line.indexOf('=');
               if (eq > 0) {
                 schema.put(line.substring(0, eq).trim(), null);
               }
             });
    return schema.isEmpty() ? null : schema;
  }

  private TransformationConfig buildTransformationConfig(DeviceAdapterRequest request) {
    boolean hasScript = request.transformationScript() != null && !request.transformationScript().isBlank();
    boolean hasDuplicates = request.removeDuplicatesMs() != null;
    boolean hasRateReduction = request.reduceEventRateMs() != null;

    if (!hasScript && !hasDuplicates && !hasRateReduction) {
      return null;
    }

    var config = new TransformationConfig();
    if (hasScript) {
      config.setScriptActive(true);
      config.setLanguage("javascript");
      config.setScript(request.transformationScript());
    }
    if (hasDuplicates) {
      config.setRemoveDuplicateRule(new RemoveDuplicateRule(String.valueOf(request.removeDuplicatesMs())));
    }
    if (hasRateReduction) {
      config.setReduceEventRateRule(new ReduceEventRateRule(request.reduceEventRateMs(), "none"));
    }
    return config;
  }

  private ISpDeviceStorage getStorage() {
    return StorageDispatcher.INSTANCE.getNoSqlStore().getDeviceStorage();
  }

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record DeviceAdapterRequest(
      String adapterName,
      String adapterType,
      String description,
      String plcCodeBlock,
      String opcuaNodeBlock,
      String transformationScript,
      Long removeDuplicatesMs,
      Long reduceEventRateMs,
      Map<String, CompactEventProperty> schema
  ) {
  }
}
