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
 * Add Adapter slide-in panel.
 *
 * Usage pattern (matches how Export Provider is opened in the Dataset tab):
 *
 *   this.dialogService.open(AddAdapterComponent, {
 *       panelType: PanelType.SLIDE_IN_PANEL,
 *       title: this.translateService.instant('Add Adapter'),
 *       width: '50vw',
 *       data: { device },
 *   });
 *
 * Step 1: user selects the adapter type (e.g. PLC4x S7).
 * Step 2: conditional sections for type-specific config appear below.
 * The component emits close(result: DeviceAdapterRequest) on confirm
 * so the parent can call deviceService.createAdapter().
 */

import { Component, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    AdapterDescription,
    DeviceAdapterRequest,
    SpDevice,
} from '@streampipes/platform-services';
import {
    DialogRef,
    FormFieldComponent,
    SplitSectionComponent,
} from '@streampipes/shared-ui';
import { TranslatePipe } from '@ngx-translate/core';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatDialog } from '@angular/material/dialog';
import { OpcuaBrowseService } from '../opcua-browse.service';
import {
    OpcuaBrowseDialogComponent,
    OpcuaBrowseDialogData,
} from './opcua-browse-dialog/opcua-browse-dialog.component';
import {
    FlexDirective,
    LayoutAlignDirective,
    LayoutDirective,
} from '@ngbracket/ngx-layout/flex';

const DEFAULT_TRANSFORM_SCRIPT = `function transform(event, out, ctx) {
    // You can use utils like utils.addTimestamp(event) for basic transformations
    // To access the StreamPipesClient use ctx.client()
    utils.addTimestamp(event);
    out.collect(event);
}`;

export const ADAPTER_TYPE_OPTIONS = [
    {
        label: 'PLC4x S7',
        value: 'org.apache.streampipes.connect.iiot.adapters.plc4x.s7',
    },
    {
        label: 'OPC-UA',
        value: 'org.apache.streampipes.connect.iiot.adapters.opcua',
    },
];

@Component({
    selector: 'sp-add-adapter',
    templateUrl: './add-adapter-dialog.component.html',
    imports: [
        FormsModule,
        MatFormField,
        MatInput,
        MatSelect,
        MatOption,
        MatButton,
        MatDivider,
        MatIcon,
        MatSlideToggle,
        LayoutDirective,
        LayoutAlignDirective,
        FlexDirective,
        TranslatePipe,
        SplitSectionComponent,
        FormFieldComponent,
    ],
})
export class AddAdapterDialogComponent {
    /** Injected by DialogService. */
    @Input() device: SpDevice;

    private dialogRef = inject<DialogRef<AddAdapterDialogComponent>>(DialogRef);
    private matDialog = inject(MatDialog);
    private browseService = inject(OpcuaBrowseService);

    readonly adapterTypeOptions = ADAPTER_TYPE_OPTIONS;

    // Step 1 — adapter type
    adapterType = ADAPTER_TYPE_OPTIONS[0].value;

    // Step 2 — basic settings
    adapterName = '';
    description = '';

    // Type-specific: PLC4x
    plcCodeBlock = '';

    // Type-specific: OPC-UA
    opcuaNodeBlock = '';
    /** Node internal names selected via the tree browser. */
    selectedOpcuaNodes: string[] = [];

    // Transformation
    transformationScript = DEFAULT_TRANSFORM_SCRIPT;

    // Quality filters
    removeDuplicates = false;
    removeDuplicatesMs = 1000;
    reduceEventRate = false;
    reduceEventRateMs = 1000;

    // OPC-UA adapter description (lazy loaded on first browse)
    private opcuaDescription: AdapterDescription | null = null;
    browseLoading = false;
    browseError = '';

    get isPlc4x(): boolean {
        return this.adapterType?.includes('plc4x') ?? false;
    }

    get isOpcUa(): boolean {
        return this.adapterType?.includes('opcua') ?? false;
    }

    get hasOpcuaSettings(): boolean {
        return !!(this.device?.opcuaEnabled && this.device.host?.trim());
    }

    get isValid(): boolean {
        if (!this.adapterName.trim() || !this.adapterType) {
            return false;
        }
        if (this.isOpcUa && !this.hasOpcuaSettings) {
            return false;
        }
        return true;
    }

    openNodeBrowser(): void {
        this.browseLoading = true;
        this.browseError = '';

        const openDialog = (desc: AdapterDescription) => {
            this.browseLoading = false;
            const data: OpcuaBrowseDialogData = {
                device: this.device,
                description: desc,
                selectedNodeNames: this.selectedOpcuaNodes,
            };
            this.matDialog
                .open(OpcuaBrowseDialogComponent, {
                    width: '600px',
                    maxHeight: '80vh',
                    data,
                })
                .afterClosed()
                .subscribe((result: string[] | null) => {
                    if (result !== null && result !== undefined) {
                        this.selectedOpcuaNodes = result;
                        this.opcuaNodeBlock = result.join('\n');
                    }
                });
        };

        if (this.opcuaDescription) {
            openDialog(this.opcuaDescription);
        } else {
            this.browseService.loadAdapterDescription().subscribe({
                next: desc => {
                    this.opcuaDescription = desc;
                    openDialog(desc);
                },
                error: err => {
                    this.browseLoading = false;
                    this.browseError =
                        err?.error?.message ??
                        'Could not load OPC-UA adapter description.';
                },
            });
        }
    }

    confirm(): void {
        if (!this.isValid) {
            return;
        }

        const result: DeviceAdapterRequest = {
            adapterName: this.adapterName.trim(),
            adapterType: this.adapterType,
            description: this.description.trim() || undefined,
            plcCodeBlock: this.plcCodeBlock.trim() || undefined,
            opcuaNodeBlock:
                this.selectedOpcuaNodes.length > 0
                    ? this.selectedOpcuaNodes.join('\n')
                    : this.opcuaNodeBlock.trim() || undefined,
            transformationScript: this.transformationScript.trim() || undefined,
            removeDuplicatesMs: this.removeDuplicates
                ? this.removeDuplicatesMs
                : undefined,
            reduceEventRateMs: this.reduceEventRate
                ? this.reduceEventRateMs
                : undefined,
        };

        this.dialogRef.close(result);
    }

    cancel(): void {
        this.dialogRef.close(undefined);
    }
}
