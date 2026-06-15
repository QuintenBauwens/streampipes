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

import { FormsModule } from '@angular/forms';
import { Component, inject, OnInit } from '@angular/core';
import {
    DeviceAdapterRequest,
    DeviceService,
    SpDevice,
} from '@streampipes/platform-services';
import {
    SpBasicHeaderTitleComponent,
    SpBasicViewComponent,
    SpBreadcrumbService,
} from '@streampipes/shared-ui';
import { TranslatePipe } from '@ngx-translate/core';
import {
    FlexDirective,
    LayoutAlignDirective,
    LayoutDirective,
    LayoutGapDirective,
} from '@ngbracket/ngx-layout/flex';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import {
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelDescription,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatDialog } from '@angular/material/dialog';
import { NgClass } from '@angular/common';
import { SpConnectRoutes } from '../../connect.breadcrumb';
import { AddAdapterDialogComponent } from './add-adapter-dialog/add-adapter-dialog.component';

@Component({
    selector: 'sp-device-registry',
    templateUrl: './device-registry.component.html',
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
        MatFormField,
        MatLabel,
        MatInput,
        MatSelect,
        MatOption,
        MatAccordion,
        MatExpansionPanel,
        MatExpansionPanelHeader,
        MatExpansionPanelTitle,
        MatExpansionPanelDescription,
        FormsModule,
        SpBasicHeaderTitleComponent,
        TranslatePipe,
        NgClass,
    ],
})
export class DeviceRegistryComponent implements OnInit {
    private deviceService = inject(DeviceService);
    private breadcrumbService = inject(SpBreadcrumbService);
    private dialog = inject(MatDialog);

    readonly backLink = ['/connect'];

    readonly adapterTypeOptions = [
        {
            label: 'PLC4x S7',
            value: 'org.apache.streampipes.connect.iiot.adapters.plc4x.s7',
        },
    ];

    devices: SpDevice[] = [];

    editingDevice: SpDevice | null = null;
    editingId: string | null = null;

    isAddingDevice = false;
    newDevice: SpDevice = this.deviceService.emptyDevice();

    successMessage = '';
    errorMessage = '';

    reachabilityMap: Record<string, boolean | null> = {};

    private msgTimer: ReturnType<typeof setTimeout> | null = null;

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

    startAddDevice(): void {
        this.isAddingDevice = true;
        this.newDevice = this.deviceService.emptyDevice();
        this.editingId = null;
        this.editingDevice = null;
        this.clearMessages();
    }

    saveNewDevice(): void {
        this.deviceService.create(this.newDevice).subscribe({
            next: () => {
                this.isAddingDevice = false;
                this.showSuccess('Device added');
                this.loadDevices();
            },
            error: () => this.showError('Could not add device'),
        });
    }

    cancelAdd(): void {
        this.isAddingDevice = false;
        this.newDevice = this.deviceService.emptyDevice();
    }

    startEdit(device: SpDevice): void {
        this.editingId = device.elementId ?? null;
        this.editingDevice = { ...device };
        this.clearMessages();
    }

    saveEdit(): void {
        if (!this.editingId || !this.editingDevice) {
            return;
        }

        this.deviceService
            .update(this.editingId, this.editingDevice)
            .subscribe({
                next: () => {
                    this.editingId = null;
                    this.editingDevice = null;
                    this.showSuccess('Device updated');
                    this.loadDevices();
                },
                error: () => this.showError('Could not update device'),
            });
    }

    cancelEdit(): void {
        this.editingId = null;
        this.editingDevice = null;
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

    openAddAdapterDialog(device: SpDevice): void {
        const ref = this.dialog.open(AddAdapterDialogComponent, {
            width: '640px',
            data: { device },
        });

        ref.afterClosed().subscribe(
            (result: DeviceAdapterRequest | undefined) => {
                if (result && device.elementId) {
                    this.deviceService
                        .createAdapter(device.elementId, result)
                        .subscribe({
                            next: () => {
                                this.showSuccess(
                                    `Adapter '${result.adapterName}' created`,
                                );
                            },
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

    getAdapterTypeLabel(adapterType: string): string {
        return (
            this.adapterTypeOptions.find(o => o.value === adapterType)?.label ??
            adapterType
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
