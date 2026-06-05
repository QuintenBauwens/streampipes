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

package org.apache.streampipes.rest.impl;

import org.apache.streampipes.resource.management.maximo.MaximoAssetImportService;
import org.apache.streampipes.resource.management.maximo.MaximoImportResult;
import org.apache.streampipes.rest.core.base.impl.AbstractAuthGuardedRestResource;
import org.apache.streampipes.rest.security.AuthConstants;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/v2/assets/import")
public class MaximoAssetImportResource extends AbstractAuthGuardedRestResource {

  private static final Logger LOG = LoggerFactory.getLogger(MaximoAssetImportResource.class);

  /**
   * Imports an asset hierarchy from a Maximo location JSON export.
   * The file must contain a JSON array of location objects with fields:
   * LOCATION, PARENT, CHILDREN, ROUTE, DESCRIPTION, SITEID, ORGID, LOCHIERARCHYID.
   */
  @PostMapping(path = "/maximo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
      produces = MediaType.APPLICATION_JSON_VALUE)
  @PreAuthorize(AuthConstants.HAS_WRITE_ASSETS_PRIVILEGE)
  public ResponseEntity<?> importMaximoAssets(@RequestPart("file") MultipartFile file) {
    if (file.isEmpty()) {
      return badRequest("Uploaded file is empty");
    }

    try {
      byte[] bytes = file.getBytes();
      MaximoImportResult result = new MaximoAssetImportService()
          .importFromJson(bytes, getAuthenticatedUserSid());

      return ok(Map.of(
          "created", result.getCreatedLocations(),
          "createdCount", result.getCreatedCount(),
          "errors", result.getErrors()
      ));
    } catch (IOException e) {
      LOG.error("Failed to parse Maximo import file", e);
      return badRequest("Invalid JSON file: " + e.getMessage());
    } catch (Exception e) {
      LOG.error("Unexpected error during Maximo asset import", e);
      return serverError(e.getMessage());
    }
  }
}
