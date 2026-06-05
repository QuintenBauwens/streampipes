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

package org.apache.streampipes.processors.enricher.jvm.processor.assethierarchy;

import org.apache.streampipes.extensions.api.pe.IStreamPipesDataProcessor;
import org.apache.streampipes.extensions.api.pe.config.IDataProcessorConfiguration;
import org.apache.streampipes.extensions.api.pe.context.EventProcessorRuntimeContext;
import org.apache.streampipes.extensions.api.pe.param.IDataProcessorParameters;
import org.apache.streampipes.extensions.api.pe.routing.SpOutputCollector;
import org.apache.streampipes.model.DataProcessorType;
import org.apache.streampipes.model.extensions.ExtensionAssetType;
import org.apache.streampipes.model.runtime.Event;
import org.apache.streampipes.sdk.builder.ProcessingElementBuilder;
import org.apache.streampipes.sdk.builder.StreamRequirementsBuilder;
import org.apache.streampipes.sdk.builder.processor.DataProcessorConfiguration;
import org.apache.streampipes.sdk.helpers.EpProperties;
import org.apache.streampipes.sdk.helpers.EpRequirements;
import org.apache.streampipes.sdk.helpers.Labels;
import org.apache.streampipes.sdk.helpers.Locales;
import org.apache.streampipes.sdk.helpers.OutputStrategies;
import org.apache.streampipes.vocabulary.SO;

/**
 * Enriches every event with Maximo asset hierarchy metadata.
 * Configure one instance per adapter/datastream with the asset metadata
 * corresponding to that adapter's datapoint location.
 *
 * <p>Appended fields:
 * <ul>
 *   <li>{@code asset_location}    – Maximo LOCATION code (e.g. B-41661)</li>
 *   <li>{@code asset_description} – Maximo DESCRIPTION</li>
 *   <li>{@code asset_route}       – Maximo ROUTE string (e.g. B; B-4; ...)</li>
 *   <li>{@code asset_site_id}     – Maximo SITEID</li>
 *   <li>{@code asset_org_id}      – Maximo ORGID</li>
 *   <li>{@code asset_mqtt_topic}  – ROUTE converted to MQTT topic format (e.g. B/B-4/...)</li>
 * </ul>
 */
public class AssetHierarchyEnrichmentProcessor implements IStreamPipesDataProcessor {

  static final String ID = "org.apache.streampipes.processors.enricher.jvm.processor.assethierarchy";

  static final String ASSET_LOCATION = "asset-location";
  static final String ASSET_DESCRIPTION = "asset-description";
  static final String ASSET_ROUTE = "asset-route";
  static final String ASSET_SITE_ID = "asset-site-id";
  static final String ASSET_ORG_ID = "asset-org-id";

  // Runtime field names appended to the event
  static final String FIELD_ASSET_LOCATION = "asset_location";
  static final String FIELD_ASSET_DESCRIPTION = "asset_description";
  static final String FIELD_ASSET_ROUTE = "asset_route";
  static final String FIELD_ASSET_SITE_ID = "asset_site_id";
  static final String FIELD_ASSET_ORG_ID = "asset_org_id";
  static final String FIELD_ASSET_MQTT_TOPIC = "asset_mqtt_topic";

  private String assetLocation;
  private String assetDescription;
  private String assetRoute;
  private String assetSiteId;
  private String assetOrgId;
  private String mqttTopic;

  @Override
  public IDataProcessorConfiguration declareConfig() {
    return DataProcessorConfiguration.create(
        AssetHierarchyEnrichmentProcessor::new,
        ProcessingElementBuilder.create(ID, 0)
            .category(DataProcessorType.ENRICH)
            .withLocales(Locales.EN)
            .withAssets(ExtensionAssetType.DOCUMENTATION)
            .requiredStream(StreamRequirementsBuilder.create()
                .requiredProperty(EpRequirements.anyProperty())
                .build())
            .requiredTextParameter(Labels.withId(ASSET_LOCATION))
            .requiredTextParameter(Labels.withId(ASSET_DESCRIPTION))
            .requiredTextParameter(Labels.withId(ASSET_ROUTE))
            .requiredTextParameter(Labels.withId(ASSET_SITE_ID))
            .requiredTextParameter(Labels.withId(ASSET_ORG_ID))
            .outputStrategy(OutputStrategies.append(
                EpProperties.stringEp(Labels.empty(), FIELD_ASSET_LOCATION, SO.TEXT),
                EpProperties.stringEp(Labels.empty(), FIELD_ASSET_DESCRIPTION, SO.TEXT),
                EpProperties.stringEp(Labels.empty(), FIELD_ASSET_ROUTE, SO.TEXT),
                EpProperties.stringEp(Labels.empty(), FIELD_ASSET_SITE_ID, SO.TEXT),
                EpProperties.stringEp(Labels.empty(), FIELD_ASSET_ORG_ID, SO.TEXT),
                EpProperties.stringEp(Labels.empty(), FIELD_ASSET_MQTT_TOPIC, SO.TEXT)
            ))
            .build()
    );
  }

  @Override
  public void onPipelineStarted(IDataProcessorParameters params,
                                SpOutputCollector collector,
                                EventProcessorRuntimeContext runtimeContext) {
    var extractor = params.extractor();
    this.assetLocation = extractor.singleValueParameter(ASSET_LOCATION, String.class);
    this.assetDescription = extractor.singleValueParameter(ASSET_DESCRIPTION, String.class);
    this.assetRoute = extractor.singleValueParameter(ASSET_ROUTE, String.class);
    this.assetSiteId = extractor.singleValueParameter(ASSET_SITE_ID, String.class);
    this.assetOrgId = extractor.singleValueParameter(ASSET_ORG_ID, String.class);
    this.mqttTopic = routeToMqttTopic(this.assetRoute);
  }

  @Override
  public void onEvent(Event event, SpOutputCollector collector) {
    event.addField(FIELD_ASSET_LOCATION, assetLocation);
    event.addField(FIELD_ASSET_DESCRIPTION, assetDescription);
    event.addField(FIELD_ASSET_ROUTE, assetRoute);
    event.addField(FIELD_ASSET_SITE_ID, assetSiteId);
    event.addField(FIELD_ASSET_ORG_ID, assetOrgId);
    event.addField(FIELD_ASSET_MQTT_TOPIC, mqttTopic);
    collector.collect(event);
  }

  @Override
  public void onPipelineStopped() {
    // nothing to release
  }

  private String routeToMqttTopic(String route) {
    if (route == null || route.isBlank()) {
      return "";
    }
    return route.replace("; ", "/").replace(";", "/").trim();
  }
}
