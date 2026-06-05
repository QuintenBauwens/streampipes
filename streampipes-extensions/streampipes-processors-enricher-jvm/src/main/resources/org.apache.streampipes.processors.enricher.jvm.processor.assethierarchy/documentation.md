<!--
  ~ Licensed to the Apache Software Foundation (ASF) under one or more
  ~ contributor license agreements.  See the NOTICE file distributed with
  ~ this work for additional information regarding copyright ownership.
  ~ The ASF licenses this file to You under the Apache License, Version 2.0
  ~ (the "License"); you may not use this file except in compliance with
  ~ the License.  You may obtain a copy of the License at
  ~
  ~    http://www.apache.org/licenses/LICENSE-2.0
  ~
  ~ Unless required by applicable law or agreed to in writing, software
  ~ distributed under the License is distributed on an "AS IS" BASIS,
  ~ WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  ~ See the License for the specific language governing permissions and
  ~ limitations under the License.
  ~
  -->

## Asset Hierarchy Enrichment

Enriches every incoming event with Maximo asset hierarchy metadata. Configure one instance per
adapter/datapoint with the Maximo location data that corresponds to that adapter's datapoint.

### Fields added to each event

| Field | Description |
|---|---|
| `asset_location` | Maximo LOCATION code (e.g. `B-41661`) |
| `asset_description` | Human-readable description from Maximo |
| `asset_route` | Full hierarchy path (e.g. `B; B-4; B-41; B-416; B-4166; B-41661`) |
| `asset_site_id` | Maximo SITEID |
| `asset_org_id` | Maximo ORGID |
| `asset_mqtt_topic` | ROUTE converted to MQTT topic format (e.g. `B/B-4/B-41/B-416/B-4166/B-41661`) |

### Usage

1. Import your Maximo location hierarchy via **Assets → Import from Maximo**.
2. Connect the adapter for a datapoint to this processor.
3. Configure the processor with the Maximo metadata for that datapoint (use the mapping CSV to find the right values).
4. Connect the processor output to an MQTT Publisher sink configured with **Dynamic Topic** and field `asset_mqtt_topic`.
