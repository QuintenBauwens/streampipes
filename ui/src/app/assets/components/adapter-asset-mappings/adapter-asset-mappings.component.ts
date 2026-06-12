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
import { SelectionModel } from '@angular/cdk/collections';
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
import { MatButton, MatIconButton } from '@angular/material/button';
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
import { MatCheckbox } from '@angular/material/checkbox';

@Component({
    selector: 'sp-adapter-asset-mappings',
    templateUrl: './adapter-asset-mappings.component.html',
    imports: [
        SpBasicViewComponent,
        FlexDirective,
        LayoutAlignDirective,
        LayoutDirective,
        MatButton,
        MatIconButton,
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
        MatCheckbox,
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
    filteredMappings: AdapterAssetMapping[] = [];
    displayedColumns = ['select', 'adapterName', 'assetLocation', 'actions'];

    searchText = '';
    selection = new SelectionModel<AdapterAssetMapping>(true, []);

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
            next: result => {
                this.mappings = result;
                this.applyFilter();
                this.selection.clear();
            },
            error: () => {
                this.mappings = [];
                this.filteredMappings = [];
            },
        });
    }

    applyFilter(): void {
        const term = this.searchText.trim().toLowerCase();
        this.filteredMappings = term
            ? this.mappings.filter(
                  m =>
                      m.elementId.toLowerCase().includes(term) ||
                      m.topic.toLowerCase().includes(term),
              )
            : [...this.mappings];
        // Remove stale selections that no longer appear in filtered results
        this.selection.selected
            .filter(s => !this.filteredMappings.includes(s))
            .forEach(s => this.selection.deselect(s));
    }

    onSearchChange(): void {
        this.applyFilter();
    }

    isAllSelected(): boolean {
        return (
            this.filteredMappings.length > 0 &&
            this.filteredMappings.every(row => this.selection.isSelected(row))
        );
    }

    toggleSelectAll(): void {
        if (this.isAllSelected()) {
            this.filteredMappings.forEach(row => this.selection.deselect(row));
        } else {
            this.filteredMappings.forEach(row => this.selection.select(row));
        }
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

    deleteMapping(mapping: AdapterAssetMapping): void {
        this.mappingService.deleteMapping(mapping.elementId).subscribe({
            next: () => this.loadMappings(),
            error: err => {
                this.saveError =
                    err?.error?.message ?? 'Failed to delete mapping.';
            },
        });
    }

    deleteSelected(): void {
        const ids = this.selection.selected.map(m => m.elementId);
        if (ids.length === 0) {
            return;
        }
        this.mappingService.deleteMappings(ids).subscribe({
            next: () => this.loadMappings(),
            error: err => {
                this.saveError =
                    err?.error?.message ?? 'Failed to delete mappings.';
            },
        });
    }

    exportSelected(): void {
        const rows = this.selection.selected;
        if (rows.length === 0) {
            return;
        }
        const csvLines = [
            'adapterId,topic',
            ...rows.map(r => `${r.elementId},${r.topic}`),
        ];
        const blob = new Blob([csvLines.join('\n')], {
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
