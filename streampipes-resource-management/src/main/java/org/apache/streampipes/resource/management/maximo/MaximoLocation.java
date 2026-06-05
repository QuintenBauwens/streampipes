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

package org.apache.streampipes.resource.management.maximo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class MaximoLocation {

  @JsonProperty("LOCATION")
  private String location;

  @JsonProperty("PARENT")
  private String parent;

  @JsonProperty("CHILDREN")
  private int children;

  @JsonProperty("ROUTE")
  private String route;

  @JsonProperty("DESCRIPTION")
  private String description;

  @JsonProperty("SITEID")
  private String siteId;

  @JsonProperty("ORGID")
  private String orgId;

  @JsonProperty("LOCHIERARCHYID")
  private long locHierarchyId;

  @JsonProperty("SYSTEMID")
  private String systemId;

  public String getLocation() {
    return location;
  }

  public String getParent() {
    return parent;
  }

  public int getChildren() {
    return children;
  }

  public String getRoute() {
    return route;
  }

  public String getDescription() {
    return description;
  }

  public String getSiteId() {
    return siteId;
  }

  public String getOrgId() {
    return orgId;
  }

  public long getLocHierarchyId() {
    return locHierarchyId;
  }

  public String getSystemId() {
    return systemId;
  }
}
