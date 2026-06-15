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

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlatformServicesCommons } from './commons.service';

export interface MqttAutoPublishConfig {
    /** Master switch: auto-deploy a pipeline when an adapter is created. */
    autoDeploy: boolean;
    /** MQTT sink enabled. Mutually exclusive with dataLakeSinkEnabled. */
    enabled: boolean;
    /** Data Lake sink enabled. Mutually exclusive with enabled. */
    dataLakeSinkEnabled: boolean;
    brokerUrl: string;
    /** 'anonymous-alternative' | 'username-alternative' */
    accessMode: string;
    username?: string;
    password?: string;
    /** e.g. '1 - at-least-once' */
    qosLevel: string;
    /** 'Yes' | 'No' */
    retain: string;
    /** 'Yes' | 'No' */
    cleanSession: string;
    reconnectPeriodInSec: number;
    keepAliveInSec: number;
    /** 'Yes' | 'No' */
    mqttCompliant: string;
}

@Injectable({
    providedIn: 'root',
})
export class MqttAutoPublishConfigService {
    private http = inject(HttpClient);
    private platformServicesCommons = inject(PlatformServicesCommons);

    get configPath(): string {
        return `${this.platformServicesCommons.apiBasePath}/config/pipeline-setup`;
    }

    getConfig(): Observable<MqttAutoPublishConfig> {
        return this.http.get<MqttAutoPublishConfig>(this.configPath);
    }

    updateConfig(
        config: MqttAutoPublishConfig,
    ): Observable<MqttAutoPublishConfig> {
        return this.http.put<MqttAutoPublishConfig>(this.configPath, config);
    }

    defaultConfig(): MqttAutoPublishConfig {
        return {
            autoDeploy: false,
            enabled: false,
            dataLakeSinkEnabled: false,
            brokerUrl: '',
            accessMode: 'anonymous-alternative',
            username: '',
            password: '',
            qosLevel: '1 - at-least-once',
            retain: 'No',
            cleanSession: 'Yes',
            reconnectPeriodInSec: 30,
            keepAliveInSec: 30,
            mqttCompliant: 'Yes',
        };
    }
}
