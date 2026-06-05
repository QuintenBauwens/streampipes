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
package org.apache.streampipes.extensions.connectors.mqtt.sink;

import org.apache.streampipes.commons.exceptions.SpRuntimeException;
import org.apache.streampipes.extensions.api.pe.IStreamPipesDataSink;
import org.apache.streampipes.extensions.api.pe.config.IDataSinkConfiguration;
import org.apache.streampipes.extensions.api.pe.context.EventSinkRuntimeContext;
import org.apache.streampipes.extensions.api.pe.param.IDataSinkParameters;
import org.apache.streampipes.extensions.connectors.mqtt.shared.MqttConnectUtils;
import org.apache.streampipes.extensions.connectors.mqtt.shared.MqttPublisher;
import org.apache.streampipes.model.DataSinkType;
import org.apache.streampipes.model.extensions.ExtensionAssetType;
import org.apache.streampipes.model.runtime.Event;
import org.apache.streampipes.sdk.builder.DataSinkBuilder;
import org.apache.streampipes.sdk.builder.StreamRequirementsBuilder;
import org.apache.streampipes.sdk.builder.sink.DataSinkConfiguration;
import org.apache.streampipes.sdk.helpers.Locales;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class MqttPublisherSink implements IStreamPipesDataSink {
    public static final String ID = "org.apache.streampipes.sinks.brokers.jvm.mqtt";

    private static final Logger LOG = LoggerFactory.getLogger(MqttPublisherSink.class);

    private static final int DEFAULT_MQTT_PORT = 1883;
    private static final int DEFAULT_RECONNECT_PERIOD = 30;
    private static final int DEFAULT_KEEP_ALIVE = 30;

    private MqttPublisher mqttClient;
    private boolean dynamicTopicEnabled;
    private String topicFieldSelector;


    @Override
    public IDataSinkConfiguration declareConfig() {
        return DataSinkConfiguration.create(
                MqttPublisherSink::new,
                DataSinkBuilder.create("org.apache.streampipes.sinks.brokers.jvm.mqtt", 1)
                        .category(DataSinkType.MESSAGING)
                        .withLocales(Locales.EN)
                        .withAssets(ExtensionAssetType.DOCUMENTATION, ExtensionAssetType.ICON)
                        .requiredStream(StreamRequirementsBuilder.any())   
                         .requiredTextParameter(MqttConnectUtils.getBrokerUrlLabel())
        .requiredAlternatives(MqttConnectUtils.getAccessModeLabel(), MqttConnectUtils.getAnonymousAccess(),
            MqttConnectUtils.getUsernameAccess(),  MqttConnectUtils.getClientCertAccess())
        .requiredAlternatives(MqttConnectUtils.getTopicModeLabel(),
                    MqttConnectUtils.getStaticTopicAlternative(),
                    MqttConnectUtils.getDynamicTopicAlternative())
                        .requiredSingleValueSelection(
                                MqttConnectUtils.getQosLevelLabel(),
                                MqttConnectUtils.getQOSLevelSelection())
                        .requiredSingleValueSelection(
                                MqttConnectUtils.getRetainLabel(),
                               MqttConnectUtils.getRetainSelection())
                        .requiredSingleValueSelection(
                                MqttConnectUtils.getCleanSessionLabel(),
                                MqttConnectUtils.getCleanSessionSelection())
                        .requiredIntegerParameter(MqttConnectUtils.getReconnectPeriodLabel(), DEFAULT_RECONNECT_PERIOD)
                        .requiredIntegerParameter(MqttConnectUtils.getKeepAliveLabel(), DEFAULT_KEEP_ALIVE)
                        .requiredSingleValueSelection(
                                MqttConnectUtils.getMqttComplient(),
                                MqttConnectUtils.getMqttSelection())
                        .requiredAlternatives(
                                MqttConnectUtils.getWillModeLabel(),
                                MqttConnectUtils.getNoWillAlternative(),
                               MqttConnectUtils.getWillAlternative())
                        .build());
    }

    @Override
    public void onPipelineStarted(IDataSinkParameters params, EventSinkRuntimeContext runtimeContext) {
        String topicMode = params.extractor().selectedAlternativeInternalId(MqttConnectUtils.TOPIC_MODE);
        this.dynamicTopicEnabled = MqttConnectUtils.DYNAMIC_TOPIC_ALTERNATIVE.equals(topicMode);
        if (this.dynamicTopicEnabled) {
            this.topicFieldSelector = params.extractor().mappingPropertyValue(MqttConnectUtils.TOPIC_FIELD);
        }
        this.mqttClient = new MqttPublisher(params);
        this.mqttClient.connect();
    }

    @Override
    public void onEvent(Event event) throws SpRuntimeException {
        if (this.dynamicTopicEnabled) {
            try {
                var field = event.getFieldBySelector(this.topicFieldSelector);
                if (field == null) {
                    LOG.warn("Dynamic MQTT topic field '{}' not found in event, skipping", this.topicFieldSelector);
                    return;
                }
                String topic = field.getAsPrimitive().getAsString();
                if (topic == null || topic.isBlank()) {
                    LOG.warn("Dynamic MQTT topic resolved to blank value, skipping event");
                    return;
                }
                this.mqttClient.publish(event, topic);
            } catch (Exception e) {
                LOG.warn("Could not resolve dynamic MQTT topic from field '{}': {}",
                    this.topicFieldSelector, e.getMessage());
            }
        } else {
            this.mqttClient.publish(event);
        }
    }

    @Override
    public void onPipelineStopped() {
        this.mqttClient.disconnect();
    }
}
