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
import {
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow,
    MatRowDef,
    MatTable,
} from '@angular/material/table';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
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
        MatTable,
        MatColumnDef,
        MatHeaderCell,
        MatHeaderCellDef,
        MatCell,
        MatCellDef,
        MatHeaderRow,
        MatHeaderRowDef,
        MatRow,
        MatRowDef,
        MatFormField,
        MatLabel,
        MatInput,
        FormsModule,
        SpBasicHeaderTitleComponent,
        TranslatePipe,
    ],
})
export class DeviceRegistryComponent implements OnInit {
    private deviceService = inject(DeviceService);
    private breadcrumbService = inject(SpBreadcrumbService);
    private dialog = inject(MatDialog);

    devices: SpDevice[] = [];
    displayedColumns = ['name', 'host', 'pollingIntervalMs', 'actions'];

    editingDevice: SpDevice | null = null;
    editingId: string | null = null;

    isAddingDevice = false;
    newDevice: SpDevice = this.deviceService.emptyDevice();

    successMessage = '';
    errorMessage = '';

    ngOnInit(): void {
        this.breadcrumbService.updateBreadcrumb([
            SpConnectRoutes.BASE,
            { label: 'Device Registry' },
        ]);
        this.loadDevices();
    }

    loadDevices(): void {
        this.errorMessage = '';
        this.deviceService.getAll().subscribe({
            next: devices => (this.devices = devices),
            error: () => (this.errorMessage = 'Could not load devices'),
        });
    }

    startAddDevice(): void {
        this.isAddingDevice = true;
        this.newDevice = this.deviceService.emptyDevice();
        this.editingId = null;
        this.editingDevice = null;
        this.successMessage = '';
        this.errorMessage = '';
    }

    saveNewDevice(): void {
        this.deviceService.create(this.newDevice).subscribe({
            next: () => {
                this.isAddingDevice = false;
                this.successMessage = 'Device added';
                this.errorMessage = '';
                this.loadDevices();
            },
            error: () => (this.errorMessage = 'Could not add device'),
        });
    }

    cancelAdd(): void {
        this.isAddingDevice = false;
        this.newDevice = this.deviceService.emptyDevice();
    }

    startEdit(device: SpDevice): void {
        this.editingId = device.elementId ?? null;
        this.editingDevice = { ...device };
        this.successMessage = '';
        this.errorMessage = '';
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
                    this.successMessage = 'Device updated';
                    this.errorMessage = '';
                    this.loadDevices();
                },
                error: () => (this.errorMessage = 'Could not update device'),
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
                this.successMessage = 'Device deleted';
                this.errorMessage = '';
                this.loadDevices();
            },
            error: () => (this.errorMessage = 'Could not delete device'),
        });
    }

    openAddAdapterDialog(device: SpDevice): void {
        const ref = this.dialog.open(AddAdapterDialogComponent, {
            width: '500px',
            data: { device },
        });

        ref.afterClosed().subscribe(
            (result: DeviceAdapterRequest | undefined) => {
                if (result && device.elementId) {
                    this.deviceService
                        .createAdapter(device.elementId, result)
                        .subscribe({
                            next: () => {
                                this.successMessage = `Adapter '${result.adapterName}' created`;
                                this.errorMessage = '';
                            },
                            error: () =>
                                (this.errorMessage =
                                    'Could not create adapter'),
                        });
                }
            },
        );
    }
}
