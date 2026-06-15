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

import org.apache.streampipes.model.connect.adapter.SpDevice;
import org.apache.streampipes.model.connect.adapter.compact.CompactAdapter;
import org.apache.streampipes.model.connect.adapter.compact.CompactEventProperty;
import org.apache.streampipes.model.connect.adapter.compact.CreateOptions;
import org.apache.streampipes.model.message.Notifications;
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

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v2/devices")
public class DeviceResource extends AbstractAdapterResource<Void> {

  private static final String PLC_IP = "plc_ip";
  private static final String PLC_POLLING_INTERVAL = "plc_polling_interval";

  @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
  @PreAuthorize("this.hasReadAuthority()")
  public ResponseEntity<?> getAllDevices() {
    return ok(getStorage().findAll());
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

  @PostMapping(
      path = "{id}/adapters",
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

    var compact = buildCompactAdapter(device, request);
    return ok(compact);
  }

  private CompactAdapter buildCompactAdapter(SpDevice device, DeviceAdapterRequest request) {
    var config = List.of(
        Map.<String, Object>of(PLC_IP, device.getHost()),
        Map.<String, Object>of(PLC_POLLING_INTERVAL, device.getPollingIntervalMs())
    );

    return new CompactAdapter(
        null,
        request.adapterName(),
        "",
        device.getAdapterType(),
        config,
        null,
        request.schema(),
        new CreateOptions(false, true),
        null
    );
  }

  private ISpDeviceStorage getStorage() {
    return StorageDispatcher.INSTANCE.getNoSqlStore().getDeviceStorage();
  }

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record DeviceAdapterRequest(
      String adapterName,
      Map<String, CompactEventProperty> schema
  ) {
  }
}
