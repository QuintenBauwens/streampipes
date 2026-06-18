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
package org.apache.streampipes.rest.impl.connect;

import org.apache.streampipes.connect.management.compact.MqttPublisherPipelineHandler;
import org.apache.streampipes.connect.management.compact.PersistPipelineHandler;
import org.apache.streampipes.manager.api.extensions.ExtensionServiceRequestManager;
import org.apache.streampipes.manager.pipeline.compact.CompactPipelineManagement;
import org.apache.streampipes.model.client.user.DefaultPrivilege;
import org.apache.streampipes.model.configuration.MqttAutoPublishConfig;
import org.apache.streampipes.model.connect.adapter.AdapterDescription;
import org.apache.streampipes.resource.management.connect.AdapterAssetEnrichmentService;
import org.apache.streampipes.rest.core.base.impl.AbstractAuthGuardedRestResource;
import org.apache.streampipes.storage.management.StorageDispatcher;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.function.Supplier;

public class AbstractAdapterResource<T> extends AbstractAuthGuardedRestResource {

  private static final Logger LOG = LoggerFactory.getLogger(AbstractAdapterResource.class);

  protected T managementService;

  public AbstractAdapterResource(Supplier<T> managementServiceSupplier) {
    this.managementService = managementServiceSupplier.get();
  }

  // no management service provided
  public AbstractAdapterResource() {
  }

  /**
   * required by Spring expression
   */
  public boolean hasReadAuthority() {
    return isAdminOrHasAnyAuthority(DefaultPrivilege.Constants.PRIVILEGE_READ_ADAPTER_VALUE);
  }

  /**
   * required by Spring expression
   */
  public boolean hasWriteAuthority() {
    return isAdminOrHasAnyAuthority(DefaultPrivilege.Constants.PRIVILEGE_WRITE_ADAPTER_VALUE);
  }

  /**
   * Enriches the adapter's event schema and transformation script with topic metadata sourced
   * from the adapter-asset mapping DB, then links the adapter to the matching asset node.
   * Also applies any configured adapter label IDs from the automation config.
   * Controlled by the global automation config ({@code topicEnrichmentEnabled}).
   * Safe to call even when no mapping exists — it will silently do nothing.
   */
  protected void enrichOnCreate(AdapterDescription adapter) {
    new AdapterAssetEnrichmentService().enrichAndLink(adapter);
    try {
      var config = StorageDispatcher.INSTANCE.getNoSqlStore()
                                              .getMqttAutoPublishConfigStorage()
                                              .getElementById(MqttAutoPublishConfig.FIXED_ID);
      if (config != null
          && config.getAdapterLabelIds() != null
          && !config.getAdapterLabelIds().isEmpty()) {
        adapter.setLabelIds(config.getAdapterLabelIds());
      }
    } catch (Exception e) {
      LOG.warn("Could not apply adapter label IDs for adapter '{}': {}", adapter.getName(), e.getMessage());
    }
  }

  /**
   * Creates and starts an auto-deploy pipeline for the given adapter when the global automation
   * config has {@code autoDeploy} enabled. Errors are caught and logged as warnings so that
   * adapter creation always succeeds regardless of pipeline deployment failures.
   */
  protected void tryAutoDeployPipeline(AdapterDescription adapter,
                                       ExtensionServiceRequestManager requestManager) {
    try {
      var config = StorageDispatcher.INSTANCE.getNoSqlStore()
                                              .getMqttAutoPublishConfigStorage()
                                              .getElementById(MqttAutoPublishConfig.FIXED_ID);
      if (config == null || !config.isAutoDeploy()) {
        return;
      }
      if (config.isEnabled() && config.getBrokerUrl() != null && !config.getBrokerUrl().isBlank()) {
        new MqttPublisherPipelineHandler(
            new CompactPipelineManagement(
                getNoSqlStorage().getPipelineElementDescriptionStorage(),
                requestManager
            ),
            getAuthenticatedUserSid()
        ).createAndStartMqttPipeline(adapter, config, requestManager);
        LOG.info("Auto-deployed MQTT publisher pipeline for adapter '{}'", adapter.getName());
      } else if (config.isDataLakeSinkEnabled()) {
        new PersistPipelineHandler(
            getNoSqlStorage().getPipelineTemplateStorage(),
            new CompactPipelineManagement(
                getNoSqlStorage().getPipelineElementDescriptionStorage(),
                requestManager
            ),
            getAuthenticatedUserSid()
        ).createAndStartPersistPipeline(adapter, config.getPipelineLabelIds(), requestManager);
        LOG.info("Auto-deployed data lake pipeline for adapter '{}'", adapter.getName());
      }
    } catch (Exception e) {
      LOG.warn("Could not auto-deploy pipeline for adapter '{}': {}", adapter.getName(), e.getMessage());
    }
  }
}
