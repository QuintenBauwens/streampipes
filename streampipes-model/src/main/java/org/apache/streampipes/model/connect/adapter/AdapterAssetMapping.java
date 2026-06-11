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

/**
 * Persists the mapping from an adapter (by its element ID) to an asset topic path (e.g. {@code B/Zone1/Machine1}).
 * The {@code elementId} is the adapter's element ID so lookups are O(1) by ID.
 */
public class AdapterAssetMapping implements Storable {

  @JsonAlias("_id")
  @SerializedName("_id")
  private String elementId;

  @JsonAlias("_rev")
  @SerializedName("_rev")
  private String rev;

  private String topic;

  public AdapterAssetMapping() {
  }

  public AdapterAssetMapping(String adapterId, String topic) {
    this.elementId = adapterId;
    this.topic = topic;
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

  public String getTopic() {
    return topic;
  }

  public void setTopic(String topic) {
    this.topic = topic;
  }
}
