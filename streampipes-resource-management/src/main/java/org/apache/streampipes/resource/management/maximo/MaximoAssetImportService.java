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

package org.apache.streampipes.resource.management.maximo;

import org.apache.streampipes.model.assets.SpAsset;
import org.apache.streampipes.model.assets.SpAssetModel;
import org.apache.streampipes.resource.management.CrudResourceManager;
import org.apache.streampipes.storage.api.system.IAssetStorage;
import org.apache.streampipes.storage.management.StorageDispatcher;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

public class MaximoAssetImportService {

  // Zone: a location whose code ends with exactly 7 digits after the root prefix (e.g. B-3347100)
  private static final Pattern ZONE_PATTERN = Pattern.compile("^[A-Za-z]+-\\d{7}$");

  private final ObjectMapper objectMapper;
  private final CrudResourceManager<SpAssetModel> resourceManager;

  public MaximoAssetImportService() {
    IAssetStorage assetStorage = StorageDispatcher.INSTANCE.getNoSqlStore().getAssetStorage();
    this.resourceManager = new CrudResourceManager<>(assetStorage, SpAssetModel.class);
    this.objectMapper = new ObjectMapper();
  }

  public MaximoImportResult importFromJson(byte[] jsonBytes, String principalSid) throws IOException {
    List<MaximoLocation> locations =
        objectMapper.readValue(jsonBytes, new TypeReference<List<MaximoLocation>>() {});

    return buildAndPersistTree(locations, principalSid);
  }

  private MaximoImportResult buildAndPersistTree(List<MaximoLocation> locations, String principalSid) {
    // Index all locations by their composite key: siteId + ":" + location
    Map<String, MaximoLocation> locationIndex = new HashMap<>();
    for (MaximoLocation loc : locations) {
      String key = compositeKey(loc.getSiteId(), loc.getLocation());
      locationIndex.put(key, loc);
    }

    // Find root nodes (those whose parent is not in this import set, within the same site)
    Set<String> locationKeys = new HashSet<>(locationIndex.keySet());
    List<MaximoLocation> roots = new ArrayList<>();
    for (MaximoLocation loc : locations) {
      String parentKey = compositeKey(loc.getSiteId(), loc.getParent());
      if (loc.getParent() == null || loc.getParent().isBlank() || !locationKeys.contains(parentKey)) {
        roots.add(loc);
      }
    }

    List<String> created = new ArrayList<>();
    List<String> errors = new ArrayList<>();

    for (MaximoLocation root : roots) {
      try {
        SpAssetModel asset = buildAssetTree(root, locationIndex, new HashSet<>());
        resourceManager.create(asset, principalSid);
        created.add(root.getLocation());
      } catch (Exception e) {
        errors.add(root.getLocation() + ": " + e.getMessage());
      }
    }

    return new MaximoImportResult(created, errors);
  }

  private SpAssetModel buildAssetTree(MaximoLocation loc,
                                      Map<String, MaximoLocation> index,
                                      Set<String> visited) {
    String key = compositeKey(loc.getSiteId(), loc.getLocation());
    if (visited.contains(key)) {
      throw new IllegalStateException("Cycle detected at location: " + loc.getLocation());
    }
    visited.add(key);

    SpAssetModel asset = new SpAssetModel();
    asset.setAssetName(loc.getLocation());
    asset.setAssetDescription(loc.getDescription());

    Map<String, Object> additional = new HashMap<>();
    additional.put("maximo_location", loc.getLocation());
    additional.put("maximo_route", loc.getRoute());
    additional.put("maximo_site_id", loc.getSiteId());
    additional.put("maximo_org_id", loc.getOrgId());
    additional.put("maximo_loc_hierarchy_id", loc.getLocHierarchyId());
    additional.put("maximo_system_id", loc.getSystemId());
    additional.put("is_zone", ZONE_PATTERN.matcher(loc.getLocation()).matches());
    additional.put("mqtt_topic", routeToMqttTopic(loc.getRoute()));
    asset.setAdditionalData(additional);

    // Find and attach children
    List<SpAsset> children = new ArrayList<>();
    for (MaximoLocation candidate : index.values()) {
      if (loc.getLocation().equals(candidate.getParent())
          && loc.getSiteId().equals(candidate.getSiteId())) {
        children.add(buildAssetTree(candidate, index, new HashSet<>(visited)));
      }
    }
    asset.setAssets(new ArrayList<>(children));

    return asset;
  }

  private String compositeKey(String siteId, String location) {
    if (siteId == null || location == null) {
      return location;
    }
    return siteId + ":" + location;
  }

  private String routeToMqttTopic(String route) {
    if (route == null || route.isBlank()) {
      return "";
    }
    return route.replace("; ", "/").replace(";", "/").trim();
  }
}
