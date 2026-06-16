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
 * <p>Currently supports PLC4x S7 adapters. The {@code host} maps to {@code plc_ip}
 * and {@code pollingIntervalMs} maps to {@code plc_polling_interval}.
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
}
