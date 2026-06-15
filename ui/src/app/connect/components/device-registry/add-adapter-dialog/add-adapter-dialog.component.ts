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

import { DialogRef } from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import { Component, inject } from '@angular/core';
import { DeviceAdapterRequest, SpDevice } from '@streampipes/platform-services';
import { TranslatePipe } from '@ngx-translate/core';
import {
    FlexDirective,
    LayoutAlignDirective,
    LayoutDirective,
    LayoutGapDirective,
} from '@ngbracket/ngx-layout/flex';
import { MatButton } from '@angular/material/button';
import {
    MAT_DIALOG_DATA,
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

@Component({
    selector: 'sp-add-adapter-dialog',
    templateUrl: './add-adapter-dialog.component.html',
    imports: [
        FlexDirective,
        LayoutAlignDirective,
        LayoutDirective,
        LayoutGapDirective,
        FormsModule,
        MatButton,
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatFormField,
        MatLabel,
        MatHint,
        MatInput,
        TranslatePipe,
    ],
})
export class AddAdapterDialogComponent {
    private dialogRef = inject<DialogRef<AddAdapterDialogComponent>>(DialogRef);
    data: { device: SpDevice } = inject(MAT_DIALOG_DATA);

    adapterName = '';

    get device(): SpDevice {
        return this.data.device;
    }

    confirm(): void {
        if (!this.adapterName.trim()) {
            return;
        }

        const result: DeviceAdapterRequest = {
            adapterName: this.adapterName.trim(),
        };

        this.dialogRef.close(result);
    }

    cancel(): void {
        this.dialogRef.close();
    }
}
