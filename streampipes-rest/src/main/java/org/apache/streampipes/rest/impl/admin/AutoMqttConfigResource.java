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

package org.apache.streampipes.rest.impl.admin;

import org.apache.streampipes.model.configuration.MqttAutoPublishConfig;
import org.apache.streampipes.rest.core.base.impl.AbstractAuthGuardedRestResource;
import org.apache.streampipes.rest.security.AuthConstants;
import org.apache.streampipes.storage.management.StorageDispatcher;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST resource to manage the global MQTT auto-publish configuration.
 *
 * <p>When enabled, every adapter uploaded through the compact adapter API automatically gets an
 * associated pipeline that publishes its events to the configured MQTT broker. If the adapter's
 * event schema contains a {@code topic} field, the pipeline uses dynamic topic mode automatically.
 */
@RestController
@RequestMapping("/api/v2/config/mqtt-auto-publish")
public class AutoMqttConfigResource extends AbstractAuthGuardedRestResource {

  @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
  @PreAuthorize(AuthConstants.IS_ADMIN_ROLE)
  public ResponseEntity<?> getConfig() {
    var config = loadOrDefault();
    return ok(config);
  }

  @PutMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
  @PreAuthorize(AuthConstants.IS_ADMIN_ROLE)
  public ResponseEntity<?> updateConfig(@RequestBody MqttAutoPublishConfig config) {
    config.setElementId(MqttAutoPublishConfig.FIXED_ID);
    var storage = getStorage();
    var existing = storage.getElementById(MqttAutoPublishConfig.FIXED_ID);
    if (existing != null) {
      config.setRev(existing.getRev());
      storage.updateElement(config);
    } else {
      storage.persist(config);
    }
    return ok(config);
  }

  private MqttAutoPublishConfig loadOrDefault() {
    var cfg = getStorage().getElementById(MqttAutoPublishConfig.FIXED_ID);
    return cfg != null ? cfg : new MqttAutoPublishConfig();
  }

  private org.apache.streampipes.storage.api.system.IMqttAutoPublishConfigStorage getStorage() {
    return StorageDispatcher.INSTANCE.getNoSqlStore().getMqttAutoPublishConfigStorage();
  }
}
