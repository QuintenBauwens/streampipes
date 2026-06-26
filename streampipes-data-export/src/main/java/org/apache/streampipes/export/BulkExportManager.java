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

package org.apache.streampipes.export;

import org.apache.streampipes.model.export.AssetExportConfiguration;
import org.apache.streampipes.model.export.BulkExportRequest;
import org.apache.streampipes.model.export.ExportConfiguration;
import org.apache.streampipes.model.export.ExportItem;
import org.apache.streampipes.storage.management.StorageDispatcher;

/**
 * Builds an {@link ExportConfiguration} for the bulk export endpoint.
 * Pipelines and adapters are grouped into one {@link AssetExportConfiguration}
 * without an asset ID. Each requested asset gets its own entry so that
 * {@link org.apache.streampipes.export.generator.ExportPackageGenerator} can
 * look them up via {@code assetId}.
 */
public class BulkExportManager {

  public static ExportConfiguration buildExportConfiguration(BulkExportRequest request) {
    var store = StorageDispatcher.INSTANCE.getNoSqlStore();
    var exportConfig = new ExportConfiguration();

    // One shared entry for pipelines + adapters (no asset linkage needed)
    var bulkConfig = new AssetExportConfiguration();

    if (request.isIncludeAdapters()) {
      store.getAdapterInstanceStorage().findAll().forEach(adapter ->
          bulkConfig.addAdapter(new ExportItem(
              adapter.getElementId(), adapter.getName(), true)));
    }

    if (request.isIncludePipelines()) {
      store.getPipelineStorageAPI().findAll().forEach(pipeline ->
          bulkConfig.addPipeline(new ExportItem(
              pipeline.getPipelineId(), pipeline.getName(), true)));
    }

    exportConfig.getAssetExportConfiguration().add(bulkConfig);

    // Each asset needs its own entry so ExportPackageGenerator can call getAssetId()
    if (request.isIncludeAssets()) {
      store.getAssetStorage().findAll().forEach(asset -> {
        var assetConfig = new AssetExportConfiguration();
        assetConfig.setAssetId(asset.getElementId());
        exportConfig.getAssetExportConfiguration().add(assetConfig);
      });
    }

    return exportConfig;
  }
}
