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
import { MatTableDataSource } from '@angular/material/table';
import {
    AdapterAssetMapping,
    AdapterAssetMappingService,
} from '@streampipes/platform-services';
import {
    SpBasicViewComponent,
    SpBreadcrumbService,
    SpTableActionsDirective,
    SpTableMultiActionsDirective,
    SpTableComponent,
    SplitSectionComponent,
} from '@streampipes/shared-ui';
import { SpAssetRoutes } from '../../assets.breadcrumb';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
    FlexDirective,
    LayoutAlignDirective,
    LayoutDirective,
} from '@ngbracket/ngx-layout/flex';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import {
    MatFormField,
    MatLabel,
    MatError,
    MatPrefix,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatMenuItem } from '@angular/material/menu';
import {
    MatColumnDef,
    MatHeaderCell,
    MatHeaderCellDef,
    MatCell,
    MatCellDef,
} from '@angular/material/table';

/** Regex for a valid slash-separated asset location path.
 * Allows only letters, digits, hyphens and underscores per segment.
 * Rejects semicolons, colons, spaces and other separators. */
const ASSET_LOCATION_PATTERN = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/;

@Component({
    selector: 'sp-adapter-asset-mappings',
    templateUrl: './adapter-asset-mappings.component.html',
    imports: [
        SpBasicViewComponent,
        SplitSectionComponent,
        SpTableComponent,
        SpTableActionsDirective,
        SpTableMultiActionsDirective,
        FlexDirective,
        LayoutAlignDirective,
        LayoutDirective,
        MatButton,
        MatIconButton,
        MatIcon,
        MatTooltip,
        MatFormField,
        MatLabel,
        MatError,
        MatPrefix,
        MatInput,
        MatMenuItem,
        MatColumnDef,
        MatHeaderCellDef,
        MatHeaderCell,
        MatCellDef,
        MatCell,
        FormsModule,
        TranslatePipe,
    ],
})
export class SpAdapterAssetMappingsComponent implements OnInit {
    private mappingService = inject(AdapterAssetMappingService);
    private breadcrumbService = inject(SpBreadcrumbService);

    readonly backLink = ['/assets'];

    @ViewChild('csvFileInput')
    csvFileInput: ElementRef<HTMLInputElement>;

    @ViewChild(SpTableComponent)
    spTable: SpTableComponent<AdapterAssetMapping>;

    dataSource = new MatTableDataSource<AdapterAssetMapping>();
    displayedColumns = ['adapterName', 'assetLocation', 'actions'];

    selectedRows: AdapterAssetMapping[] = [];

    newAdapterName = '';
    newAssetLocation = '';
    assetLocationError: string | null = null;

    saveError: string | null = null;
    saveSuccess = false;
    uploadResult: { savedCount: number; errors: string[] } | null = null;

    ngOnInit(): void {
        this.breadcrumbService.updateBreadcrumb(
            this.breadcrumbService.getRootLink(SpAssetRoutes.BASE),
        );
        this.dataSource.filterPredicate = (row, filter) => {
            const term = filter.toLowerCase();
            return (
                row.elementId.toLowerCase().includes(term) ||
                row.topic.toLowerCase().includes(term)
            );
        };
        this.loadMappings();
    }

    loadMappings(): void {
        this.mappingService.getAllMappings().subscribe({
            next: result => {
                this.dataSource.data = result;
                this.selectedRows = [];
            },
            error: () => {
                this.dataSource.data = [];
            },
        });
    }

    onSelectionChanged(rows: AdapterAssetMapping[]): void {
        this.selectedRows = rows;
    }

    selectAll(): void {
        this.spTable?.selectAllFilteredRows();
    }

    get totalFilteredCount(): number {
        return this.dataSource.filteredData?.length ?? 0;
    }

    validateAssetLocation(value: string): boolean {
        return ASSET_LOCATION_PATTERN.test(value.trim());
    }

    onAssetLocationChange(): void {
        if (
            this.newAssetLocation &&
            !this.validateAssetLocation(this.newAssetLocation)
        ) {
            this.assetLocationError =
                'Use a slash-separated path like B/Zone1/Machine1 — only letters, digits, hyphens and underscores are allowed per segment.';
        } else {
            this.assetLocationError = null;
        }
    }

    get canAdd(): boolean {
        return (
            !!this.newAdapterName &&
            !!this.newAssetLocation &&
            this.assetLocationError === null
        );
    }

    addMapping(): void {
        this.saveError = null;
        this.saveSuccess = false;
        if (!this.validateAssetLocation(this.newAssetLocation)) {
            this.assetLocationError =
                'Use a slash-separated path like B/Zone1/Machine1 — only letters, digits, hyphens and underscores are allowed per segment.';
            return;
        }
        this.mappingService
            .saveMapping(this.newAdapterName, this.newAssetLocation)
            .subscribe({
                next: () => {
                    this.saveSuccess = true;
                    this.newAdapterName = '';
                    this.newAssetLocation = '';
                    this.assetLocationError = null;
                    this.loadMappings();
                },
                error: err => {
                    this.saveError =
                        err?.error?.message ?? 'Failed to save mapping.';
                },
            });
    }

    deleteRow(mapping: AdapterAssetMapping): void {
        this.saveError = null;
        this.mappingService.deleteMapping(mapping.elementId).subscribe({
            next: () => this.loadMappings(),
            error: err => {
                this.saveError =
                    err?.error?.message ?? 'Failed to delete mapping.';
            },
        });
    }

    deleteSelected(rows: AdapterAssetMapping[]): void {
        if (rows.length === 0) {
            return;
        }
        this.saveError = null;
        this.mappingService
            .deleteMappings(rows.map(r => r.elementId))
            .subscribe({
                next: () => this.loadMappings(),
                error: err => {
                    this.saveError =
                        err?.error?.message ?? 'Failed to delete mappings.';
                },
            });
    }

    exportSelected(rows: AdapterAssetMapping[]): void {
        if (rows.length === 0) {
            return;
        }
        const lines = [
            'adapterId,topic',
            ...rows.map(r => `${r.elementId},${r.topic}`),
        ];
        const blob = new Blob([lines.join('\n')], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'adapter-asset-mappings.csv';
        anchor.click();
        URL.revokeObjectURL(url);
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
        this.saveError = null;
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
