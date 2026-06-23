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

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
    AdapterDescription,
    RuntimeOptionsRequest,
    RuntimeOptionsResponse,
    StaticProperty,
    TreeInputNode,
} from '@streampipes/platform-services';
import { SpDevice } from '@streampipes/platform-services';

/** OPC-UA app ID (must match the extension appId). */
export const OPCUA_APP_ID =
    'org.apache.streampipes.connect.iiot.adapters.opcua';

/** Internal name of the AVAILABLE_NODES tree property. */
const AVAILABLE_NODES = 'AVAILABLE_NODES';

@Injectable({ providedIn: 'root' })
export class OpcuaBrowseService {
    private http = inject(HttpClient);

    private get baseConnectUrl(): string {
        return '/streampipes-backend/api/v2/connect';
    }

    /** Loads the OPC-UA adapter description template. */
    loadAdapterDescription(): Observable<AdapterDescription> {
        return this.http
            .get<any[]>(`${this.baseConnectUrl}/master/description/adapters`)
            .pipe(
                map(adapters => {
                    const raw = adapters?.find(
                        (a: any) => a.appId === OPCUA_APP_ID,
                    );
                    if (!raw) {
                        throw new Error(
                            'OPC-UA adapter not registered on the extensions service.',
                        );
                    }
                    return AdapterDescription.fromData(raw);
                }),
            );
    }

    /**
     * Calls the runtime-resolvable endpoint to browse OPC-UA nodes.
     * @param description   OPC-UA adapter description with static properties pre-filled.
     * @param device        Device whose host/port/auth settings to use.
     * @param nextBaseNode  Optional: internalNodeName to expand sub-nodes of.
     */
    browseNodes(
        description: AdapterDescription,
        device: SpDevice,
        nextBaseNode?: string,
    ): Observable<TreeInputNode[]> {
        // Pre-fill the static properties from the device settings
        const props = this.prefillProperties(description.config, device);
        if (nextBaseNode) {
            this.setNextBaseNode(props, nextBaseNode);
        }

        const request = new RuntimeOptionsRequest();
        request.appId = OPCUA_APP_ID;
        request.requestId = AVAILABLE_NODES;
        request.staticProperties = props as any;
        (request as any)['@class'] =
            'org.apache.streampipes.model.runtime.RuntimeOptionsRequest';

        const url = `${this.baseConnectUrl}/master/resolvable/${encodeURIComponent(OPCUA_APP_ID)}/configurations`;
        return this.http.post<any>(url, request).pipe(
            map(resp => {
                const response = RuntimeOptionsResponse.fromData(resp);
                const sp = StaticProperty.fromDataUnion(
                    response.staticProperty,
                );
                return (sp as any).nodes ?? [];
            }),
        );
    }

    /**
     * Pre-fills the OPC-UA static-property list from device settings.
     * Returns a deep copy with connection, security, and auth values applied.
     */
    prefillProperties(
        props: StaticProperty[],
        device: SpDevice,
    ): StaticProperty[] {
        const cloned = JSON.parse(JSON.stringify(props)) as StaticProperty[];
        this.applyValues(cloned, device);
        return cloned;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private applyValues(props: StaticProperty[], device: SpDevice): void {
        for (const sp of props) {
            this.applySingleProperty(sp, device);
        }
    }

    private applySingleProperty(sp: any, device: SpDevice): void {
        const cls: string = sp['@class'] ?? '';

        if (cls.includes('StaticPropertyAlternatives')) {
            // Select the right alternative based on internalName
            if (sp.internalName === 'OPC_HOST_OR_URL') {
                this.selectAlternative(sp, 'OPC_HOST');
                const hostAlt = (sp.alternatives as any[]).find(
                    a => a.staticProperty?.internalName === 'OPC_HOST',
                );
                if (hostAlt?.staticProperty?.staticProperties) {
                    const inner = hostAlt.staticProperty.staticProperties;
                    this.setFreeText(
                        inner,
                        'OPC_SERVER_HOST',
                        device.host ?? '',
                    );
                    this.setFreeText(
                        inner,
                        'OPC_SERVER_PORT',
                        String(device.opcuaPort ?? 4840),
                    );
                }
            } else if (sp.internalName === 'ADAPTER_TYPE') {
                const mode = device.opcuaAdapterMode ?? 'SUBSCRIPTION_MODE';
                this.selectAlternative(sp, mode);
                if (mode === 'PULL_MODE') {
                    const pullAlt = (sp.alternatives as any[]).find(
                        a => a.staticProperty?.internalName === 'PULL_MODE',
                    );
                    if (pullAlt?.staticProperty?.staticProperties) {
                        const inner = pullAlt.staticProperty.staticProperties;
                        this.setFreeText(
                            inner,
                            'PULLING_INTERVAL',
                            String(device.opcuaPullIntervalMs ?? 1000),
                        );
                    }
                }
            } else if (sp.internalName === 'userAuthentication') {
                const authMethod = device.opcuaAuthMethod ?? 'anonymous';
                this.selectAlternative(sp, authMethod);
                if (authMethod === 'USERNAME_GROUP') {
                    const uAlt = (sp.alternatives as any[]).find(
                        a =>
                            a.staticProperty?.internalName === 'USERNAME_GROUP',
                    );
                    if (uAlt?.staticProperty?.staticProperties) {
                        const inner = uAlt.staticProperty.staticProperties;
                        this.setFreeText(
                            inner,
                            'USERNAME',
                            device.opcuaUsername ?? '',
                        );
                        this.setFreeText(
                            inner,
                            'PASSWORD',
                            device.opcuaPassword ?? '',
                        );
                    }
                }
            }
        } else if (cls.includes('OneOfStaticProperty')) {
            if (sp.internalName === 'securityMode') {
                this.selectOption(sp, device.opcuaSecurityMode ?? 'None');
            } else if (sp.internalName === 'securityPolicy') {
                this.selectOption(sp, device.opcuaSecurityPolicy ?? 'None');
            } else if (sp.internalName === 'NAMING_STRATEGY') {
                this.selectOption(sp, 'DISPLAY_NAME');
            }
        } else if (cls.includes('FreeTextStaticProperty')) {
            // handled in alternatives above
        } else if (cls.includes('StaticPropertyGroup')) {
            if (sp.staticProperties) {
                this.applyValues(sp.staticProperties, device);
            }
        }
    }

    private selectAlternative(sp: any, targetInternalName: string): void {
        if (!sp.alternatives) {
            return;
        }
        for (const alt of sp.alternatives) {
            alt.selected =
                (alt.staticProperty?.internalName ?? alt.internalName) ===
                targetInternalName;
        }
    }

    private selectOption(sp: any, optionInternalName: string): void {
        if (!sp.options) {
            return;
        }
        for (const opt of sp.options) {
            opt.selected = opt.internalName === optionInternalName;
        }
    }

    private setFreeText(
        props: any[],
        internalName: string,
        value: string,
    ): void {
        const sp = props.find(p => p.internalName === internalName);
        if (sp) {
            sp.value = value;
        }
    }

    private setNextBaseNode(props: StaticProperty[], nodeId: string): void {
        const findAndSet = (list: any[]): void => {
            for (const sp of list) {
                if (sp.internalName === AVAILABLE_NODES) {
                    sp.nextBaseNodeToResolve = nodeId;
                    return;
                }
                if (sp.staticProperties) {
                    findAndSet(sp.staticProperties);
                }
                if (sp.alternatives) {
                    for (const alt of sp.alternatives) {
                        if (alt.staticProperty?.staticProperties) {
                            findAndSet(alt.staticProperty.staticProperties);
                        }
                    }
                }
            }
        };
        findAndSet(props as any[]);
    }
}
