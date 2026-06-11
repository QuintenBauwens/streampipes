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

import {
    Component,
    ElementRef,
    inject,
    OnInit,
    ViewChild,
} from '@angular/core';
import {
    AdapterAssetMapping,
    AdapterAssetMappingService,
} from '@streampipes/platform-services';
import {
    SpBasicViewComponent,
    SpBreadcrumbService,
} from '@streampipes/shared-ui';
import { SpAssetRoutes } from '../../assets.breadcrumb';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
    FlexDirective,
    LayoutAlignDirective,
    LayoutDirective,
} from '@ngbracket/ngx-layout/flex';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import {
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardSubtitle,
    MatCardTitle,
} from '@angular/material/card';
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

@Component({
    selector: 'sp-adapter-asset-mappings',
    templateUrl: './adapter-asset-mappings.component.html',
    imports: [
        SpBasicViewComponent,
        FlexDirective,
        LayoutAlignDirective,
        LayoutDirective,
        MatButton,
        MatIcon,
        MatTooltip,
        MatFormField,
        MatLabel,
        MatInput,
        MatCard,
        MatCardHeader,
        MatCardTitle,
        MatCardSubtitle,
        MatCardContent,
        MatTable,
        MatColumnDef,
        MatHeaderCellDef,
        MatHeaderCell,
        MatCellDef,
        MatCell,
        MatHeaderRowDef,
        MatHeaderRow,
        MatRowDef,
        MatRow,
        FormsModule,
        TranslatePipe,
    ],
})
export class SpAdapterAssetMappingsComponent implements OnInit {
    private mappingService = inject(AdapterAssetMappingService);
    private breadcrumbService = inject(SpBreadcrumbService);

    @ViewChild('csvFileInput')
    csvFileInput: ElementRef<HTMLInputElement>;

    mappings: AdapterAssetMapping[] = [];
    displayedColumns = ['adapterName', 'assetLocation'];

    newAdapterName = '';
    newAssetLocation = '';

    saveError: string | null = null;
    saveSuccess = false;
    uploadResult: { savedCount: number; errors: string[] } | null = null;

    ngOnInit(): void {
        this.breadcrumbService.updateBreadcrumb(
            this.breadcrumbService.getRootLink(SpAssetRoutes.BASE),
        );
        this.loadMappings();
    }

    loadMappings(): void {
        this.mappingService.getAllMappings().subscribe({
            next: result => (this.mappings = result),
            error: () => (this.mappings = []),
        });
    }

    addMapping(): void {
        this.saveError = null;
        this.saveSuccess = false;
        this.mappingService
            .saveMapping(this.newAdapterName, this.newAssetLocation)
            .subscribe({
                next: () => {
                    this.saveSuccess = true;
                    this.newAdapterName = '';
                    this.newAssetLocation = '';
                    this.loadMappings();
                },
                error: err => {
                    this.saveError =
                        err?.error?.message ?? 'Failed to save mapping.';
                },
            });
    }

    triggerCsvUpload(): void {
        this.csvFileInput.nativeElement.value = '';
        this.csvFileInput.nativeElement.click();
    }

    onCsvFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) {
            return;
        }
        this.uploadResult = null;
        this.mappingService.uploadMappingCsv(input.files[0]).subscribe({
            next: result => {
                this.uploadResult = result;
                this.loadMappings();
            },
            error: err => {
                this.saveError = err?.error?.message ?? 'CSV upload failed.';
            },
        });
    }
}
