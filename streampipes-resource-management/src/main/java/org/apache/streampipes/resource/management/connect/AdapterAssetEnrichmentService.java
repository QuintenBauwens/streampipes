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

package org.apache.streampipes.resource.management.connect;

import org.apache.streampipes.model.assets.AssetLinkBuilder;
import org.apache.streampipes.model.assets.SpAsset;
import org.apache.streampipes.model.assets.SpAssetModel;
import org.apache.streampipes.model.connect.adapter.AdapterDescription;
import org.apache.streampipes.model.schema.EventPropertyPrimitive;
import org.apache.streampipes.storage.management.StorageDispatcher;
import org.apache.streampipes.vocabulary.XSD;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Enriches a newly created adapter with asset topology metadata if a pre-mapping exists.
 *
 * <p>On {@link #enrichAndLink(AdapterDescription)}:
 * <ol>
 *   <li>Looks up the adapter name in the adapter-asset mapping DB.</li>
 *   <li>If found, adds a static {@code topic} field to the adapter's event schema.</li>
 *   <li>Injects {@code event.topic = "..."} into the JavaScript transformation script so
 *       every emitted event carries the asset hierarchy path.</li>
 *   <li>Traverses the asset hierarchy and logically links the adapter to the matching asset
 *       node (if the asset exists).</li>
 * </ol>
 */
public class AdapterAssetEnrichmentService {

  private static final Logger LOG = LoggerFactory.getLogger(AdapterAssetEnrichmentService.class);

  /**
   * Enriches the adapter description in-place based on a pre-existing name->topic mapping.
   * Safe to call even when no mapping exists — it will silently do nothing.
   */
  public void enrichAndLink(AdapterDescription adapter) {
    var storage = StorageDispatcher.INSTANCE.getNoSqlStore().getAdapterAssetMappingStorage();
    var mapping = storage.getElementById(adapter.getName());
    if (mapping == null || mapping.getTopic() == null || mapping.getTopic().isBlank()) {
      return;
    }

    var topic = mapping.getTopic();
    LOG.info("Enriching adapter '{}' with topic '{}'", adapter.getName(), topic);

    enrichEventSchema(adapter, topic);
    injectTopicIntoScript(adapter, topic);
    linkToAsset(adapter, topic);
  }

  private void enrichEventSchema(AdapterDescription adapter, String topic) {
    var ep = new EventPropertyPrimitive();
    ep.setRuntimeName("topic");
    ep.setRuntimeType(XSD.STRING.toString());
    ep.setLabel("topic");
    ep.setDescription("Asset hierarchy path");

    var schema = adapter.getDataStream().getEventSchema();
    schema.getEventProperties().removeIf(p -> "topic".equals(p.getRuntimeName()));
    schema.getEventProperties().add(ep);
  }

  private void injectTopicIntoScript(AdapterDescription adapter, String topic) {
    var config = adapter.getTransformationConfig();
    var script = config.getScript();

    if (script == null || script.isBlank()) {
      script = "function transform(event, out, ctx) {\n  out.collect(event);\n}";
    }

    var escaped = topic.replace("\\", "\\\\").replace("\"", "\\\"");
    var injection = "event.topic = \"" + escaped + "\";\n  ";

    // Idempotent: remove previous injection before re-injecting
    script = script.replace(injection, "");
    script = script.replace("out.collect(event);", injection + "out.collect(event);");

    config.setScript(script);
    config.setScriptActive(true);
    if (config.getLanguage() == null || config.getLanguage().isBlank()) {
      config.setLanguage("javascript");
    }
  }

  private void linkToAsset(AdapterDescription adapter, String topic) {
    if (topic == null || topic.isBlank()) {
      return;
    }

    try {
      var assetStorage = StorageDispatcher.INSTANCE.getNoSqlStore().getAssetStorage();
      for (SpAssetModel assetModel : assetStorage.findAll()) {
        var target = findAssetByMqttTopic(assetModel, topic);
        if (target != null) {
          var link = AssetLinkBuilder.create()
              .withResourceId(adapter.getElementId())
              .withLinkType("adapter")
              .withLinkLabel(adapter.getName())
              .withQueryHint(adapter.getElementId())
              .build();

          target.getAssetLinks().removeIf(l -> adapter.getElementId().equals(l.getResourceId()));
          target.getAssetLinks().add(link);
          assetStorage.updateElement(assetModel);
          LOG.info("Linked adapter '{}' to asset '{}'", adapter.getName(), target.getAssetName());
          return;
        }
      }
      LOG.info("No asset found matching mqtt_topic '{}' - skipping asset link", topic);
    } catch (Exception e) {
      LOG.warn("Failed to link adapter '{}' to asset: {}", adapter.getName(), e.getMessage());
    }
  }

  /**
   * Recursively searches the asset tree for a node whose {@code additionalData["mqtt_topic"]}
   * exactly matches the given topic.  Assets imported from Maximo have this field set by
   * {@code MaximoAssetImportService} — it is the authoritative way to correlate a topic path
   * to an asset node without relying on location-code naming conventions.
   *
   * @return the matching {@link SpAsset}, or {@code null} if not found
   */
  private SpAsset findAssetByMqttTopic(SpAsset node, String topic) {
    var storedTopic = node.getAdditionalData().get("mqtt_topic");
    if (topic.equals(storedTopic)) {
      return node;
    }
    for (SpAsset child : node.getAssets()) {
      var found = findAssetByMqttTopic(child, topic);
      if (found != null) {
        return found;
      }
    }
    return null;
  }
}
