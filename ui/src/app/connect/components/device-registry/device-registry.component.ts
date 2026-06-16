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

import { Component, inject, OnInit } from '@angular/core';
import {
    DeviceAdapterRequest,
    DeviceService,
    SpDevice,
} from '@streampipes/platform-services';
import {
    DialogService,
    PanelType,
    SpBasicHeaderTitleComponent,
    SpBasicViewComponent,
    SpBreadcrumbService,
} from '@streampipes/shared-ui';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
    FlexDirective,
    LayoutAlignDirective,
    LayoutDirective,
    LayoutGapDirective,
} from '@ngbracket/ngx-layout/flex';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import {
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelDescription,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';
import {
    MatFormField,
    MatLabel,
    MatPrefix,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatDivider } from '@angular/material/divider';
import { SpConnectRoutes } from '../../connect.breadcrumb';
import { AddAdapterDialogComponent } from './add-adapter-dialog/add-adapter-dialog.component';
import { AddDeviceComponent } from './add-device/add-device.component';

@Component({
    selector: 'sp-device-registry',
    templateUrl: './device-registry.component.html',
    styleUrls: ['./device-registry.component.scss'],
    imports: [
        SpBasicViewComponent,
        FlexDirective,
        LayoutAlignDirective,
        LayoutDirective,
        LayoutGapDirective,
        MatButton,
        MatIconButton,
        MatIcon,
        MatTooltip,
        MatAccordion,
        MatExpansionPanel,
        MatExpansionPanelHeader,
        MatExpansionPanelTitle,
        MatExpansionPanelDescription,
        SpBasicHeaderTitleComponent,
        FormsModule,
        MatFormField,
        MatLabel,
        MatPrefix,
        MatInput,
        MatDivider,
        TranslatePipe,
    ],
})
export class DeviceRegistryComponent implements OnInit {
    private deviceService = inject(DeviceService);
    private breadcrumbService = inject(SpBreadcrumbService);
    private dialogService = inject(DialogService);
    private translateService = inject(TranslateService);

    readonly backLink = ['/connect'];

    devices: SpDevice[] = [];
    searchTerm = '';

    successMessage = '';
    errorMessage = '';

    /** null = checking, true = reachable, false = unreachable */
    reachabilityMap: Record<string, boolean | null> = {};

    private msgTimer: ReturnType<typeof setTimeout> | null = null;

    get filteredDevices(): SpDevice[] {
        const term = this.searchTerm.toLowerCase().trim();
        if (!term) {
            return this.devices;
        }
        return this.devices.filter(
            d =>
                d.name?.toLowerCase().includes(term) ||
                d.host?.toLowerCase().includes(term),
        );
    }

    ngOnInit(): void {
        this.breadcrumbService.updateBreadcrumb([
            SpConnectRoutes.BASE,
            { label: 'Device Registry' },
        ]);
        this.loadDevices();
    }

    loadDevices(): void {
        this.deviceService.getAll().subscribe({
            next: devices => (this.devices = devices),
            error: () => this.showError('Could not load devices'),
        });
    }

    openAddDevicePanel(): void {
        const ref = this.dialogService.open(AddDeviceComponent, {
            panelType: PanelType.SLIDE_IN_PANEL,
            title: this.translateService.instant('New Device'),
            width: '50vw',
            data: { device: undefined },
        });
        ref.afterClosed().subscribe(saved => {
            if (saved) {
                this.showSuccess('Device added');
                this.loadDevices();
            }
        });
    }

    openEditDevicePanel(device: SpDevice): void {
        const ref = this.dialogService.open(AddDeviceComponent, {
            panelType: PanelType.SLIDE_IN_PANEL,
            title: this.translateService.instant('Edit Device'),
            width: '50vw',
            data: { device },
        });
        ref.afterClosed().subscribe(saved => {
            if (saved) {
                this.showSuccess('Device updated');
                this.loadDevices();
            }
        });
    }

    deleteDevice(device: SpDevice): void {
        if (!device.elementId) {
            return;
        }
        this.deviceService.delete(device.elementId).subscribe({
            next: () => {
                this.showSuccess('Device deleted');
                this.loadDevices();
            },
            error: () => this.showError('Could not delete device'),
        });
    }

    onPanelOpened(device: SpDevice): void {
        if (!device.elementId) {
            return;
        }
        this.reachabilityMap[device.elementId] = null;
        this.deviceService.checkReachable(device.elementId).subscribe({
            next: res =>
                (this.reachabilityMap[device.elementId!] = res.reachable),
            error: () => (this.reachabilityMap[device.elementId!] = false),
        });
    }

    openAddAdapterPanel(device: SpDevice): void {
        const ref = this.dialogService.open(AddAdapterDialogComponent, {
            panelType: PanelType.SLIDE_IN_PANEL,
            title:
                this.translateService.instant('Add Adapter') +
                ' — ' +
                device.name,
            width: '50vw',
            data: { device },
        });

        ref.afterClosed().subscribe(
            (result: DeviceAdapterRequest | undefined) => {
                if (result && device.elementId) {
                    this.deviceService
                        .createAdapter(device.elementId, result)
                        .subscribe({
                            next: () =>
                                this.showSuccess(
                                    `Adapter '${result.adapterName}' created`,
                                ),
                            error: err => {
                                const msg =
                                    err?.error?.title ||
                                    err?.error?.message ||
                                    'Could not create adapter';
                                this.showError(msg);
                            },
                        });
                }
            },
        );
    }

    private showSuccess(msg: string): void {
        this.clearMessages();
        this.successMessage = msg;
        this.msgTimer = setTimeout(() => {
            if (this.successMessage === msg) {
                this.successMessage = '';
            }
        }, 5000);
    }

    private showError(msg: string): void {
        this.clearMessages();
        this.errorMessage = msg;
        this.msgTimer = setTimeout(() => {
            if (this.errorMessage === msg) {
                this.errorMessage = '';
            }
        }, 5000);
    }

    private clearMessages(): void {
        if (this.msgTimer !== null) {
            clearTimeout(this.msgTimer);
            this.msgTimer = null;
        }
        this.successMessage = '';
        this.errorMessage = '';
    }
}
