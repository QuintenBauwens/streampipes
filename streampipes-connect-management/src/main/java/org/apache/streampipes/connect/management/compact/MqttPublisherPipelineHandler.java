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

package org.apache.streampipes.connect.management.compact;

import org.apache.streampipes.manager.api.extensions.ExtensionServiceRequestManager;
import org.apache.streampipes.manager.pipeline.PipelineManager;
import org.apache.streampipes.manager.pipeline.compact.CompactPipelineManagement;
import org.apache.streampipes.model.configuration.MqttAutoPublishConfig;
import org.apache.streampipes.model.connect.adapter.AdapterDescription;
import org.apache.streampipes.model.connect.adapter.compact.CreateOptions;
import org.apache.streampipes.model.pipeline.PipelineOperationStatus;
import org.apache.streampipes.model.pipeline.compact.CompactPipeline;
import org.apache.streampipes.model.pipeline.compact.CompactPipelineElement;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Creates and starts an MQTT publisher pipeline for a given adapter.
 *
 * <p>The pipeline contains a single sink (MQTT Publisher) connected to the adapter's data stream.
 * If the adapter's event schema contains a {@code topic} field (added by
 * {@link org.apache.streampipes.resource.management.connect.AdapterAssetEnrichmentService}),
 * the pipeline uses <em>dynamic topic</em> mode so each event is published to its own topic path.
 * Otherwise the adapter name is used as a static topic.
 */
public class MqttPublisherPipelineHandler {

  /** App ID of the MQTT publisher sink extension. */
  public static final String MQTT_PUBLISHER_APP_ID = "org.apache.streampipes.sinks.brokers.jvm.mqtt";

  // -- MQTT ConnectUtils constant mirrors (kept here to avoid extension-module dependency) --
  private static final String BROKER_URL = "broker_url";
  private static final String ACCESS_MODE = "access-mode";
  private static final String ANONYMOUS_ACCESS = "anonymous-alternative";
  private static final String USERNAME_ACCESS = "username-alternative";
  private static final String USERNAME = "username";
  private static final String PASSWORD = "password";
  private static final String TOPIC_MODE = "topic-mode";
  private static final String STATIC_TOPIC_ALTERNATIVE = "static-topic-alternative";
  private static final String DYNAMIC_TOPIC_ALTERNATIVE = "dynamic-topic-alternative";
  private static final String TOPIC = "topic";
  private static final String TOPIC_FIELD = "topic-field";
  private static final String QOS_LEVEL_KEY = "qos-level";
  private static final String RETAIN = "retain";
  private static final String CLEAN_SESSION_KEY = "clean-session";
  private static final String RECONNECT_PERIOD_IN_SEC = "reconnect-period";
  private static final String KEEP_ALIVE_IN_SEC = "keep-alive";
  private static final String MQTT_COMPLIANT = "mqtt-version-compliant";
  private static final String WILL_MODE = "lwt-mode";
  private static final String NO_WILL_ALTERNATIVE = "no-lwt-alternative";

  private final CompactPipelineManagement pipelineManagement;
  private final String authenticatedUserSid;

  public MqttPublisherPipelineHandler(CompactPipelineManagement pipelineManagement,
                                      String authenticatedUserSid) {
    this.pipelineManagement = pipelineManagement;
    this.authenticatedUserSid = authenticatedUserSid;
  }

  public PipelineOperationStatus createAndStartMqttPipeline(AdapterDescription adapterDescription,
                                                            MqttAutoPublishConfig config,
                                                            ExtensionServiceRequestManager requestManager)
      throws Exception {
    var streamRef = "stream1";
    var sinkRef = "mqtt-sink";

    var sinkConfig = buildSinkConfig(adapterDescription, config);
    var sinkElement = new CompactPipelineElement(
        "sink", sinkRef, MQTT_PUBLISHER_APP_ID,
        List.of(streamRef), sinkConfig, null
    );
    var streamElement = new CompactPipelineElement(
        "stream", streamRef,
        adapterDescription.getCorrespondingDataStreamElementId(),
        null, null, null
    );

    var adapterSlug = adapterDescription.getName().replaceAll("[^A-Za-z0-9_-]", "-");
    var compactPipeline = new CompactPipeline(
        null,
        String.format("mqtt-%s", adapterSlug),
        String.format("MQTT publish: %s", adapterDescription.getName()),
        List.of(sinkElement, streamElement),
        new CreateOptions(false, true)
    );

    var result = pipelineManagement.makePipeline(compactPipeline);
    if (result.allPipelineElementsValid()) {
      String pipelineId = PipelineManager.addPipeline(authenticatedUserSid, result.pipeline());
      if (compactPipeline.createOptions().start()) {
        return PipelineManager.startPipeline(pipelineId, requestManager);
      }
    }
    throw new IllegalArgumentException("Could not create MQTT publisher pipeline: pipeline elements invalid");
  }

  private List<Map<String, Object>> buildSinkConfig(AdapterDescription adapter,
                                                    MqttAutoPublishConfig config) {
    var sinkConfig = new ArrayList<Map<String, Object>>();

    sinkConfig.add(Map.of(BROKER_URL, config.getBrokerUrl()));

    // Access mode
    if (USERNAME_ACCESS.equals(config.getAccessMode())
        && config.getUsername() != null && !config.getUsername().isBlank()) {
      sinkConfig.add(Map.of(
          ACCESS_MODE, USERNAME_ACCESS,
          USERNAME, config.getUsername(),
          PASSWORD, config.getPassword() != null ? config.getPassword() : ""
      ));
    } else {
      sinkConfig.add(Map.of(ACCESS_MODE, ANONYMOUS_ACCESS));
    }

    // Topic mode: prefer dynamic if adapter schema has a 'topic' field,
    // then static topic from config, then fall back to adapter name.
    if (hasTopicField(adapter)) {
      sinkConfig.add(Map.of(
          TOPIC_MODE, DYNAMIC_TOPIC_ALTERNATIVE,
          TOPIC_FIELD, "s0::topic"
      ));
    } else if (config.getStaticTopic() != null && !config.getStaticTopic().isBlank()) {
      sinkConfig.add(Map.of(
          TOPIC_MODE, STATIC_TOPIC_ALTERNATIVE,
          TOPIC, config.getStaticTopic()
      ));
    } else {
      sinkConfig.add(Map.of(
          TOPIC_MODE, STATIC_TOPIC_ALTERNATIVE,
          TOPIC, adapter.getName()
      ));
    }

    sinkConfig.add(Map.of(QOS_LEVEL_KEY, config.getQosLevel()));
    sinkConfig.add(Map.of(RETAIN, config.getRetain()));
    sinkConfig.add(Map.of(CLEAN_SESSION_KEY, config.getCleanSession()));
    sinkConfig.add(Map.of(RECONNECT_PERIOD_IN_SEC, config.getReconnectPeriodInSec()));
    sinkConfig.add(Map.of(KEEP_ALIVE_IN_SEC, config.getKeepAliveInSec()));
    sinkConfig.add(Map.of(MQTT_COMPLIANT, config.getMqttCompliant()));
    sinkConfig.add(Map.of(WILL_MODE, NO_WILL_ALTERNATIVE));

    return sinkConfig;
  }

  private boolean hasTopicField(AdapterDescription adapter) {
    return adapter.getDataStream()
                  .getEventSchema()
                  .getEventProperties()
                  .stream()
                  .anyMatch(ep -> "topic".equals(ep.getRuntimeName()));
  }
}
