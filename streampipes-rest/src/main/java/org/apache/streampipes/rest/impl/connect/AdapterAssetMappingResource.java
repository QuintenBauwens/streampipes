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

import org.apache.streampipes.model.connect.adapter.AdapterAssetMapping;
import org.apache.streampipes.rest.core.base.impl.AbstractAuthGuardedRestResource;
import org.apache.streampipes.rest.security.AuthConstants;
import org.apache.streampipes.storage.management.StorageDispatcher;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * REST resource for managing adapter-to-asset-topic mappings.
 *
 * <p>Mappings associate an adapter element ID with an asset topic path (e.g. {@code B/Zone1/Machine1}).
 * They can be uploaded in bulk via a CSV file ({@code adapterId,topic}).
 */
@RestController
@RequestMapping("/api/v2/connect/adapter-asset-mappings")
public class AdapterAssetMappingResource extends AbstractAuthGuardedRestResource {

  private static final Logger LOG = LoggerFactory.getLogger(AdapterAssetMappingResource.class);

  @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
  @PreAuthorize(AuthConstants.HAS_READ_ASSETS_PRIVILEGE)
  public ResponseEntity<?> getAllMappings() {
    return ok(getStorage().findAll());
  }

  /**
   * Saves or updates a single adapter-to-asset mapping via JSON body.
   * This is the preferred endpoint over CSV upload for programmatic use.
   */
  @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
  @PreAuthorize(AuthConstants.HAS_WRITE_ASSETS_PRIVILEGE)
  public ResponseEntity<?> saveMapping(@RequestBody AdapterAssetMapping mapping) {
    if (mapping == null || mapping.getElementId() == null || mapping.getElementId().isBlank()) {
      return badRequest("adapterId must not be blank");
    }
    if (mapping.getTopic() == null || mapping.getTopic().isBlank()) {
      return badRequest("topic must not be blank");
    }
    if (mapping.getTopic().contains(";") || !mapping.getTopic().matches("[A-Za-z0-9_\\-]+(/[A-Za-z0-9_\\-]+)*")) {
      return badRequest("Invalid asset location: use a slash-separated path like B/Zone1/Machine1 (letters, digits, hyphens and underscores only)");
    }
    var storage = getStorage();
    var existing = storage.getElementById(mapping.getElementId());
    if (existing != null) {
      existing.setTopic(mapping.getTopic());
      storage.updateElement(existing);
    } else {
      storage.persist(mapping);
    }
    return ok(mapping);
  }

  /**
   * Uploads a CSV file mapping adapter IDs to asset topic paths.
   *
   * <p>Expected CSV format (header line is optional but recognized):
   * <pre>
   *   adapterId,topic
   *   urn:streampipes.apache.org:....,B/Zone1/Machine1
   * </pre>
   */
  @PostMapping(path = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
      produces = MediaType.APPLICATION_JSON_VALUE)
  @PreAuthorize(AuthConstants.HAS_WRITE_ASSETS_PRIVILEGE)
  public ResponseEntity<?> uploadMappingCsv(@RequestPart("file") MultipartFile file) {
    if (file.isEmpty()) {
      return badRequest("Uploaded file is empty");
    }

    var storage = getStorage();
    var saved = new ArrayList<String>();
    var errors = new ArrayList<String>();

    try (var reader = new BufferedReader(
        new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {

      String line;
      int lineNum = 0;
      while ((line = reader.readLine()) != null) {
        lineNum++;
        line = line.strip();
        if (line.isEmpty()) {
          continue;
        }
        // Skip a header line that starts with "adapterId" or "adapterName" (case-insensitive)
        if (lineNum == 1 && (line.toLowerCase().startsWith("adapterid")
            || line.toLowerCase().startsWith("adaptername"))) {
          continue;
        }

        var parts = line.split(",", 2);
        if (parts.length != 2 || parts[0].isBlank() || parts[1].isBlank()) {
          errors.add("Line " + lineNum + ": invalid format — expected adapterId,topic");
          continue;
        }

        var adapterId = parts[0].strip();
        var topic = parts[1].strip();

        if (topic.contains(";") || !topic.matches("[A-Za-z0-9_\\-]+(/[A-Za-z0-9_\\-]+)*")) {
          errors.add("Line " + lineNum + " (" + adapterId + "): invalid asset location — use slash-separated path like B/Zone1/Machine1 (letters, digits, hyphens, underscores only)");
          continue;
        }

        try {
          var existing = storage.getElementById(adapterId);
          if (existing != null) {
            existing.setTopic(topic);
            storage.updateElement(existing);
          } else {
            storage.persist(new AdapterAssetMapping(adapterId, topic));
          }
          saved.add(adapterId);
        } catch (Exception e) {
          LOG.error("Failed to save mapping for adapterId {}", adapterId, e);
          errors.add("Line " + lineNum + " (" + adapterId + "): " + e.getMessage());
        }
      }
    } catch (Exception e) {
      LOG.error("Failed to read mapping CSV", e);
      return badRequest("Could not read CSV file: " + e.getMessage());
    }

    return ok(Map.of("saved", saved, "savedCount", saved.size(), "errors", errors));
  }

  /**
   * Deletes a single adapter-to-asset mapping by its element ID.
   */
  @DeleteMapping(path = "/{elementId}", produces = MediaType.APPLICATION_JSON_VALUE)
  @PreAuthorize(AuthConstants.HAS_WRITE_ASSETS_PRIVILEGE)
  public ResponseEntity<?> deleteMapping(@PathVariable String elementId) {
    var storage = getStorage();
    var existing = storage.getElementById(elementId);
    if (existing == null) {
      return notFound();
    }
    storage.deleteElement(existing);
    return ok();
  }

  /**
   * Deletes multiple adapter-to-asset mappings by their element IDs.
   *
   * <p>Element IDs not found in storage are silently skipped.
   */
  @DeleteMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
  @PreAuthorize(AuthConstants.HAS_WRITE_ASSETS_PRIVILEGE)
  public ResponseEntity<?> deleteMappings(@RequestBody List<String> elementIds) {
    var storage = getStorage();
    var deleted = new ArrayList<String>();
    for (var id : elementIds) {
      var existing = storage.getElementById(id);
      if (existing != null) {
        storage.deleteElement(existing);
        deleted.add(id);
      }
    }
    return ok(Map.of("deletedCount", deleted.size(), "deleted", deleted));
  }

  private org.apache.streampipes.storage.api.connect.IAdapterAssetMappingStorage getStorage() {
    return StorageDispatcher.INSTANCE.getNoSqlStore().getAdapterAssetMappingStorage();
  }
}
