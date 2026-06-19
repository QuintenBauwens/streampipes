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

package org.apache.streampipes.model.connect.adapter;

import org.apache.streampipes.model.shared.api.Storable;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.google.gson.annotations.SerializedName;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents a physical PLC/sensor device whose connection parameters can be reused
 * to quickly create multiple adapters (datapoints) without re-entering the same details.
 *
 * <p>Supports PLC4x S7 adapters ({@code host} / {@code pollingIntervalMs}) and
 * OPC-UA adapters ({@code opcuaEnabled}, {@code opcuaEndpointUrl}, etc.).
 */
public class SpDevice implements Storable {

  @JsonAlias("_id")
  @SerializedName("_id")
  private String elementId;

  @JsonAlias("_rev")
  @SerializedName("_rev")
  private String rev;

  /** Human-readable device name (e.g. "PLC-Line1"). */
  private String name = "";

  /** PLC IP address (maps to plc_ip in the PLC4x S7 adapter). */
  private String host = "";

  /** Polling interval in milliseconds (maps to plc_polling_interval, default 1000). */
  private int pollingIntervalMs = 1000;

  /** The adapter app ID this device is used with. Defaults to PLC4x S7. */
  private String adapterType = "org.apache.streampipes.connect.iiot.adapters.plc4x.s7";

  /** ElementIds of adapters created from this device via the device registry. */
  private List<String> adapterIds = new ArrayList<>();

  /** Whether OPC-UA connectivity settings are configured for this device. */
  private boolean opcuaEnabled = false;

  /** OPC-UA server addressing mode: url (default) or host. */
  private String opcuaServerMode = "url";

  /** OPC-UA endpoint URL, used when opcuaServerMode = url (e.g. opc.tcp://192.168.0.10:4840). */
  private String opcuaEndpointUrl = "";

  /** OPC-UA server host, used when opcuaServerMode = host. */
  private String opcuaHost = "";

  /** OPC-UA server port, used when opcuaServerMode = host (default 4840). */
  private int opcuaPort = 4840;

  /** OPC-UA adapter mode: SUBSCRIPTION_MODE (default) or PULL_MODE. */
  private String opcuaAdapterMode = "SUBSCRIPTION_MODE";

  /** Pull interval in milliseconds (only relevant when opcuaAdapterMode = PULL_MODE). */
  private int opcuaPullIntervalMs = 1000;

  /** How incomplete events are handled in pull mode: ignore-event (default) or send-event. */
  private String opcuaIncompleteEvents = "ignore-event";

  /** OPC-UA security mode: None (default), Sign, or SignAndEncrypt. */
  private String opcuaSecurityMode = "None";

  /** OPC-UA security policy (e.g. None, Basic256Sha256). */
  private String opcuaSecurityPolicy = "None";

  /** Authentication method: anonymous (default), USERNAME_GROUP, or x509Group. */
  private String opcuaAuthMethod = "anonymous";

  /** OPC-UA username for UsernamePassword authentication (blank = anonymous). */
  private String opcuaUsername = "";

  /** OPC-UA password for UsernamePassword authentication. */
  private String opcuaPassword = "";

  /** X.509 private key PEM, used when opcuaAuthMethod = x509Group. */
  private String opcuaX509PrivateKey = "";

  /** X.509 public key PEM, used when opcuaAuthMethod = x509Group. */
  private String opcuaX509PublicKey = "";

  public SpDevice() {
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

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getHost() {
    return host;
  }

  public void setHost(String host) {
    this.host = host;
  }

  public int getPollingIntervalMs() {
    return pollingIntervalMs;
  }

  public void setPollingIntervalMs(int pollingIntervalMs) {
    this.pollingIntervalMs = pollingIntervalMs;
  }

  public String getAdapterType() {
    return adapterType;
  }

  public void setAdapterType(String adapterType) {
    this.adapterType = adapterType;
  }

  public List<String> getAdapterIds() {
    return adapterIds;
  }

  public void setAdapterIds(List<String> adapterIds) {
    this.adapterIds = adapterIds;
  }

  public boolean isOpcuaEnabled() {
    return opcuaEnabled;
  }

  public void setOpcuaEnabled(boolean opcuaEnabled) {
    this.opcuaEnabled = opcuaEnabled;
  }

  public String getOpcuaServerMode() {
    return opcuaServerMode;
  }

  public void setOpcuaServerMode(String opcuaServerMode) {
    this.opcuaServerMode = opcuaServerMode;
  }

  public String getOpcuaEndpointUrl() {
    return opcuaEndpointUrl;
  }

  public void setOpcuaEndpointUrl(String opcuaEndpointUrl) {
    this.opcuaEndpointUrl = opcuaEndpointUrl;
  }

  public String getOpcuaHost() {
    return opcuaHost;
  }

  public void setOpcuaHost(String opcuaHost) {
    this.opcuaHost = opcuaHost;
  }

  public int getOpcuaPort() {
    return opcuaPort;
  }

  public void setOpcuaPort(int opcuaPort) {
    this.opcuaPort = opcuaPort;
  }

  public String getOpcuaAdapterMode() {
    return opcuaAdapterMode;
  }

  public void setOpcuaAdapterMode(String opcuaAdapterMode) {
    this.opcuaAdapterMode = opcuaAdapterMode;
  }

  public int getOpcuaPullIntervalMs() {
    return opcuaPullIntervalMs;
  }

  public void setOpcuaPullIntervalMs(int opcuaPullIntervalMs) {
    this.opcuaPullIntervalMs = opcuaPullIntervalMs;
  }

  public String getOpcuaIncompleteEvents() {
    return opcuaIncompleteEvents;
  }

  public void setOpcuaIncompleteEvents(String opcuaIncompleteEvents) {
    this.opcuaIncompleteEvents = opcuaIncompleteEvents;
  }

  public String getOpcuaSecurityMode() {
    return opcuaSecurityMode;
  }

  public void setOpcuaSecurityMode(String opcuaSecurityMode) {
    this.opcuaSecurityMode = opcuaSecurityMode;
  }

  public String getOpcuaSecurityPolicy() {
    return opcuaSecurityPolicy;
  }

  public void setOpcuaSecurityPolicy(String opcuaSecurityPolicy) {
    this.opcuaSecurityPolicy = opcuaSecurityPolicy;
  }

  public String getOpcuaAuthMethod() {
    return opcuaAuthMethod;
  }

  public void setOpcuaAuthMethod(String opcuaAuthMethod) {
    this.opcuaAuthMethod = opcuaAuthMethod;
  }

  public String getOpcuaUsername() {
    return opcuaUsername;
  }

  public void setOpcuaUsername(String opcuaUsername) {
    this.opcuaUsername = opcuaUsername;
  }

  public String getOpcuaPassword() {
    return opcuaPassword;
  }

  public void setOpcuaPassword(String opcuaPassword) {
    this.opcuaPassword = opcuaPassword;
  }

  public String getOpcuaX509PrivateKey() {
    return opcuaX509PrivateKey;
  }

  public void setOpcuaX509PrivateKey(String opcuaX509PrivateKey) {
    this.opcuaX509PrivateKey = opcuaX509PrivateKey;
  }

  public String getOpcuaX509PublicKey() {
    return opcuaX509PublicKey;
  }

  public void setOpcuaX509PublicKey(String opcuaX509PublicKey) {
    this.opcuaX509PublicKey = opcuaX509PublicKey;
  }
}
