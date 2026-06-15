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

package org.apache.streampipes.model.configuration;

import org.apache.streampipes.model.shared.api.Storable;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.google.gson.annotations.SerializedName;

/**
 * Singleton configuration for automatic pipeline deployment on adapter creation.
 *
 * <p>When {@code autoDeploy} is {@code true} and a compact adapter is uploaded, the backend
 * automatically creates and starts a pipeline using the configured sink. Exactly one sink must be
 * enabled when {@code autoDeploy} is active:
 * <ul>
 *   <li>MQTT sink ({@code enabled=true}): publishes events to the configured MQTT broker.</li>
 *   <li>Data Lake sink ({@code dataLakeSinkEnabled=true}): persists events in the StreamPipes
 *       data lake.</li>
 * </ul>
 *
 * <p>Stored as a single CouchDB document with {@code _id = "pipeline-setup-config"}.
 */
public class MqttAutoPublishConfig implements Storable {

  public static final String FIXED_ID = "pipeline-setup-config";

  @JsonAlias("_id")
  @SerializedName("_id")
  private String elementId = FIXED_ID;

  @JsonAlias("_rev")
  @SerializedName("_rev")
  private String rev;

  /** Master switch: automatically deploy a pipeline for each new adapter when {@code true}. */
  private boolean autoDeploy = false;
  /** MQTT sink: publish adapter events to an MQTT broker. Mutually exclusive with dataLakeSinkEnabled. */
  private boolean enabled = false;
  /** Data Lake sink: persist adapter events in the StreamPipes data lake. Mutually exclusive with enabled. */
  private boolean dataLakeSinkEnabled = false;
  private String brokerUrl = "";
  /** "anonymous-alternative" or "username-alternative" */
  private String accessMode = "anonymous-alternative";
  private String username = "";
  private String password = "";
  /** e.g. "1 - at-least-once" */
  private String qosLevel = "1 - at-least-once";
  /** "Yes" or "No" */
  private String retain = "No";
  /** "Yes" or "No" */
  private String cleanSession = "Yes";
  private int reconnectPeriodInSec = 30;
  private int keepAliveInSec = 30;
  /** "Yes" or "No" */
  private String mqttCompliant = "Yes";

  public MqttAutoPublishConfig() {
  }

  @Override
  public String getElementId() {
    return elementId;
  }

  @Override
  public void setElementId(String elementId) {
    this.elementId = elementId;
  }

  @Override
  public String getRev() {
    return rev;
  }

  @Override
  public void setRev(String rev) {
    this.rev = rev;
  }

  public boolean isAutoDeploy() {
    return autoDeploy;
  }

  public void setAutoDeploy(boolean autoDeploy) {
    this.autoDeploy = autoDeploy;
  }

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public boolean isDataLakeSinkEnabled() {
    return dataLakeSinkEnabled;
  }

  public void setDataLakeSinkEnabled(boolean dataLakeSinkEnabled) {
    this.dataLakeSinkEnabled = dataLakeSinkEnabled;
  }

  public String getBrokerUrl() {
    return brokerUrl;
  }

  public void setBrokerUrl(String brokerUrl) {
    this.brokerUrl = brokerUrl;
  }

  public String getAccessMode() {
    return accessMode;
  }

  public void setAccessMode(String accessMode) {
    this.accessMode = accessMode;
  }

  public String getUsername() {
    return username;
  }

  public void setUsername(String username) {
    this.username = username;
  }

  public String getPassword() {
    return password;
  }

  public void setPassword(String password) {
    this.password = password;
  }

  public String getQosLevel() {
    return qosLevel;
  }

  public void setQosLevel(String qosLevel) {
    this.qosLevel = qosLevel;
  }

  public String getRetain() {
    return retain;
  }

  public void setRetain(String retain) {
    this.retain = retain;
  }

  public String getCleanSession() {
    return cleanSession;
  }

  public void setCleanSession(String cleanSession) {
    this.cleanSession = cleanSession;
  }

  public int getReconnectPeriodInSec() {
    return reconnectPeriodInSec;
  }

  public void setReconnectPeriodInSec(int reconnectPeriodInSec) {
    this.reconnectPeriodInSec = reconnectPeriodInSec;
  }

  public int getKeepAliveInSec() {
    return keepAliveInSec;
  }

  public void setKeepAliveInSec(int keepAliveInSec) {
    this.keepAliveInSec = keepAliveInSec;
  }

  public String getMqttCompliant() {
    return mqttCompliant;
  }

  public void setMqttCompliant(String mqttCompliant) {
    this.mqttCompliant = mqttCompliant;
  }
}
