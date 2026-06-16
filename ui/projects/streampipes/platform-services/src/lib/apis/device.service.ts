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

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PlatformServicesCommons } from './commons.service';

export interface SpDevice {
    elementId?: string;
    name: string;
    host: string;
    pollingIntervalMs: number;
    /** @deprecated adapterType is now specified per-adapter in DeviceAdapterRequest */
    adapterType?: string;
}

export interface DeviceAdapterRequest {
    adapterName: string;
    /** Adapter type (e.g. 'org.apache.streampipes.connect.iiot.adapters.plc4x.s7') */
    adapterType: string;
    description?: string;
    plcCodeBlock?: string;
    transformationScript?: string;
    removeDuplicatesMs?: number;
    reduceEventRateMs?: number;
    schema?: Record<
        string,
        { label?: string; description?: string; semanticType?: string }
    >;
}

@Injectable({
    providedIn: 'root',
})
export class DeviceService {
    private http = inject(HttpClient);
    private platformServicesCommons = inject(PlatformServicesCommons);

    get basePath(): string {
        return `${this.platformServicesCommons.apiBasePath}/devices`;
    }

    getAll(): Observable<SpDevice[]> {
        return this.http.get<SpDevice[]>(this.basePath);
    }

    create(device: SpDevice): Observable<unknown> {
        return this.http.post(this.basePath, device);
    }

    update(id: string, device: SpDevice): Observable<unknown> {
        return this.http.put(`${this.basePath}/${id}`, device);
    }

    delete(id: string): Observable<unknown> {
        return this.http.delete(`${this.basePath}/${id}`);
    }

    createAdapter(
        deviceId: string,
        request: DeviceAdapterRequest,
    ): Observable<unknown> {
        return this.http
            .post(`${this.basePath}/${deviceId}/adapter`, request)
            .pipe(
                switchMap(compactAdapter =>
                    this.http.post(
                        `${this.platformServicesCommons.apiBasePath}/connect/compact-adapters`,
                        compactAdapter,
                    ),
                ),
            );
    }

    checkReachable(id: string): Observable<{ reachable: boolean }> {
        return this.http.get<{ reachable: boolean }>(
            `${this.basePath}/${id}/reachable`,
        );
    }

    emptyDevice(): SpDevice {
        return {
            name: '',
            host: '',
            pollingIntervalMs: 1000,
        };
    }
}
