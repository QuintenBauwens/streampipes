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

package org.apache.streampipes.export;

import org.apache.streampipes.export.generator.ZipFileBuilder;
import org.apache.streampipes.export.resolver.AdapterResolver;
import org.apache.streampipes.export.resolver.PipelineResolver;
import org.apache.streampipes.manager.api.extensions.ExtensionServiceRequestManager;
import org.apache.streampipes.model.export.BulkExportRequest;
import org.apache.streampipes.serializers.json.JacksonSerializer;
import org.apache.streampipes.storage.management.StorageDispatcher;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Builds a human-readable bulk-export ZIP with one subfolder per resource type.
 * File entries follow the pattern {@code <folder>/<resource-name>.json}.
 * Duplicate names within a folder are disambiguated with a -2, -3 suffix.
 */
public class BulkExportManager {

  private static final Logger LOG = LoggerFactory.getLogger(BulkExportManager.class);

  public static byte[] buildExportPackage(BulkExportRequest request,
                                          ExtensionServiceRequestManager extensionServiceRequestManager)
      throws IOException {
    var store = StorageDispatcher.INSTANCE.getNoSqlStore();
    var builder = ZipFileBuilder.create();
    var mapper = JacksonSerializer.getObjectMapper(Map.of(SerializationFeature.INDENT_OUTPUT, true));

    if (request.isIncludePipelines()) {
      var resolver = new PipelineResolver(extensionServiceRequestManager);
      var usedNames = new HashSet<String>();
      store.getPipelineStorageAPI().findAll().forEach(pipeline -> {
        try {
          var json = resolver.getSerializedDocument(pipeline.getPipelineId());
          builder.addText("pipelines/" + uniqueName(pipeline.getName(), usedNames), json);
        } catch (Exception e) {
          LOG.warn("Bulk export: skipping pipeline {}: {}", pipeline.getPipelineId(), e.getMessage());
        }
      });
    }

    if (request.isIncludeAdapters()) {
      var resolver = new AdapterResolver(extensionServiceRequestManager);
      var usedNames = new HashSet<String>();
      store.getAdapterInstanceStorage().findAll().forEach(adapter -> {
        try {
          var json = resolver.getSerializedDocument(adapter.getElementId());
          builder.addText("adapters/" + uniqueName(adapter.getName(), usedNames), json);
        } catch (Exception e) {
          LOG.warn("Bulk export: skipping adapter {}: {}", adapter.getElementId(), e.getMessage());
        }
      });
    }

    if (request.isIncludeAssets()) {
      var usedNames = new HashSet<String>();
      store.getAssetStorage().findAll().forEach(asset -> {
        try {
          var json = mapper.writeValueAsString(asset);
          builder.addText("assets/" + uniqueName(asset.getAssetName(), usedNames), json);
        } catch (Exception e) {
          LOG.warn("Bulk export: skipping asset {}: {}", asset.getElementId(), e.getMessage());
        }
      });
    }

    if (request.isIncludeDevices()) {
      var usedNames = new HashSet<String>();
      store.getDeviceStorage().findAll().forEach(device -> {
        try {
          var json = mapper.writeValueAsString(device);
          builder.addText("devices/" + uniqueName(device.getName(), usedNames), json);
        } catch (Exception e) {
          LOG.warn("Bulk export: skipping device {}: {}", device.getElementId(), e.getMessage());
        }
      });
    }

    if (request.isIncludeDeviceMappings()) {
      var usedNames = new HashSet<String>();
      store.getAdapterAssetMappingStorage().findAll().forEach(mapping -> {
        try {
          var json = mapper.writeValueAsString(mapping);
          var label = (mapping.getElementId() != null ? mapping.getElementId() : "mapping")
              + (mapping.getTopic() != null ? "--" + mapping.getTopic().replace("/", "-") : "");
          builder.addText("device-mappings/" + uniqueName(label, usedNames), json);
        } catch (Exception e) {
          LOG.warn("Bulk export: skipping device mapping {}: {}", mapping.getElementId(), e.getMessage());
        }
      });
    }

    if (request.isIncludeSettings()) {
      var coreConfig = store.getSpCoreConfigurationStorage().get();
      if (coreConfig != null && coreConfig.getGeneralConfig() != null) {
        builder.addText("settings/general-config",
            mapper.writeValueAsString(coreConfig.getGeneralConfig()));
      }
    }

    var meta = new HashMap<String, Object>();
    meta.put("type", "bulk-export");
    meta.put("exportedAt", Instant.now().toString());
    builder.addManifest(mapper.writeValueAsString(meta));

    return builder.buildZip();
  }

  static String uniqueName(String name, Set<String> used) {
    var base = toSlug(name);
    var candidate = base;
    int counter = 2;
    while (used.contains(candidate)) {
      candidate = base + "-" + counter++;
    }
    used.add(candidate);
    return candidate;
  }

  private static String toSlug(String name) {
    if (name == null || name.isBlank()) {
      return "unnamed";
    }
    return name.trim()
               .toLowerCase()
               .replaceAll("[^a-z0-9\\-_]", "-")
               .replaceAll("-{2,}", "-")
               .replaceAll("^-|-$", "");
  }
}