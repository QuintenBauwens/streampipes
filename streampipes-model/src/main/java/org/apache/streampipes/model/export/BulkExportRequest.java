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

package org.apache.streampipes.model.export;

/**
 * Request body for the bulk export endpoint. Each flag selects all resources
 * of that type — no per-item selection needed.
 */
public class BulkExportRequest {

  private boolean includePipelines;
  private boolean includeAdapters;
  private boolean includeAssets;
  private boolean includeDevices;
  private boolean includeDeviceMappings;
  private boolean includeSettings;

  public BulkExportRequest() {
  }

  public boolean isIncludePipelines() {
    return includePipelines;
  }

  public void setIncludePipelines(boolean includePipelines) {
    this.includePipelines = includePipelines;
  }

  public boolean isIncludeAdapters() {
    return includeAdapters;
  }

  public void setIncludeAdapters(boolean includeAdapters) {
    this.includeAdapters = includeAdapters;
  }

  public boolean isIncludeAssets() {
    return includeAssets;
  }

  public void setIncludeAssets(boolean includeAssets) {
    this.includeAssets = includeAssets;
  }

  public boolean isIncludeDevices() {
    return includeDevices;
  }

  public void setIncludeDevices(boolean includeDevices) {
    this.includeDevices = includeDevices;
  }

  public boolean isIncludeDeviceMappings() {
    return includeDeviceMappings;
  }

  public void setIncludeDeviceMappings(boolean includeDeviceMappings) {
    this.includeDeviceMappings = includeDeviceMappings;
  }

  public boolean isIncludeSettings() {
    return includeSettings;
  }

  public void setIncludeSettings(boolean includeSettings) {
    this.includeSettings = includeSettings;
  }
}
