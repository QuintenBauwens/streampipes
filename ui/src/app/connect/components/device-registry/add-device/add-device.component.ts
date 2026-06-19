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

/**
 * Add / Edit Device slide-in panel.
 *
 * Usage pattern (matches how Export Provider is opened in the Dataset tab):
 *
 *   this.dialogService.open(AddDeviceComponent, {
 *       panelType: PanelType.SLIDE_IN_PANEL,
 *       title: this.translateService.instant(device ? 'Edit Device' : 'New Device'),
 *       width: '50vw',
 *       data: { device },   // null/undefined → create mode
 *   });
 *
 * The component sets @Input() device from DialogService data injection.
 * It emits close(true) on save and close(false) on cancel so the parent
 * can refresh its device list via dialogRef.afterClosed().
 */

import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeviceService, SpDevice } from '@streampipes/platform-services';
import {
    DialogRef,
    FormFieldComponent,
    SplitSectionComponent,
} from '@streampipes/shared-ui';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'sp-add-device',
    templateUrl: './add-device.component.html',
    imports: [
        FormsModule,
        MatFormField,
        MatInput,
        MatButton,
        MatDivider,
        MatSlideToggle,
        MatSelect,
        MatOption,
        TranslatePipe,
        SplitSectionComponent,
        FormFieldComponent,
    ],
})
export class AddDeviceComponent implements OnInit {
    /** Injected by DialogService; undefined → create mode, set → edit mode. */
    @Input() device: SpDevice | undefined;

    private dialogRef = inject<DialogRef<AddDeviceComponent>>(DialogRef);
    private deviceService = inject(DeviceService);

    editMode = false;
    model: SpDevice = this.deviceService.emptyDevice();

    saving = false;
    errorMessage = '';

    ngOnInit(): void {
        if (this.device) {
            this.editMode = true;
            this.model = { ...this.device };
        }
    }

    get isValid(): boolean {
        if (!this.model.name?.trim()) {
            return false;
        }
        if (!this.model.host?.trim()) {
            return false;
        }
        if (this.model.opcuaEnabled) {
            return (this.model.opcuaPort ?? 0) > 0;
        }
        return this.model.pollingIntervalMs > 0;
    }

    save(): void {
        if (!this.isValid) {
            return;
        }
        this.saving = true;
        this.errorMessage = '';

        const op$ =
            this.editMode && this.device?.elementId
                ? this.deviceService.update(this.device.elementId, this.model)
                : this.deviceService.create(this.model);

        op$.subscribe({
            next: () => this.dialogRef.close(true),
            error: () => {
                this.saving = false;
                this.errorMessage = this.editMode
                    ? 'Could not update device'
                    : 'Could not add device';
            },
        });
    }

    close(): void {
        this.dialogRef.close(false);
    }
}
