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

import { Component, OnInit, inject } from '@angular/core';
import {
    DialogService,
    PanelType,
    SpBasicNavTabsComponent,
    SpBreadcrumbService,
    SplitSectionComponent,
    SpNavigationItem,
} from '@streampipes/shared-ui';
import { SpConfigurationRoutes } from '../configuration.breadcrumb';
import { SpConfigurationTabsService } from '../configuration-tabs.service';
import {
    AssetManagementService,
    SpAsset,
} from '@streampipes/platform-services';
import { MatCheckbox, MatCheckboxChange } from '@angular/material/checkbox';
import { DataExportService } from './data-export.service';
import { SpDataExportDialogComponent } from './export-dialog/data-export-dialog.component';
import { SpDataImportDialogComponent } from './import-dialog/data-import-dialog.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
    FlexDirective,
    LayoutAlignDirective,
    LayoutDirective,
} from '@ngbracket/ngx-layout/flex';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'sp-data-export-import',
    templateUrl: './data-export-import.component.html',
    styleUrls: ['./data-export-import.component.scss'],
    imports: [
        SpBasicNavTabsComponent,
        LayoutDirective,
        FlexDirective,
        LayoutAlignDirective,
        SplitSectionComponent,
        MatCheckbox,
        MatButton,
        MatIcon,
        FormsModule,
        TranslatePipe,
    ],
})
export class SpDataExportImportComponent implements OnInit {
    private breadcrumbService = inject(SpBreadcrumbService);
    private assetManagementService = inject(AssetManagementService);
    private dialogService = inject(DialogService);
    private tabService = inject(SpConfigurationTabsService);
    private translateService = inject(TranslateService);
    private dataExportService = inject(DataExportService);

    tabs: SpNavigationItem[] = [];

    assets: SpAsset[];
    selectedAssets: string[] = [];

    bulkIncludePipelines = true;
    bulkIncludeAdapters = true;
    bulkIncludeAssets = true;
    bulkExportInProgress = false;

    ngOnInit(): void {
        this.tabs = this.tabService.getTabs();
        this.breadcrumbService.updateBreadcrumb([
            SpConfigurationRoutes.BASE,
            { label: this.tabService.getTabTitle('export') },
        ]);
        this.loadAssets();
    }

    loadAssets(): void {
        this.assetManagementService
            .getAllAssets()
            .subscribe(
                assets =>
                    (this.assets = assets.sort((a, b) =>
                        a.assetName.localeCompare(b.assetName),
                    )),
            );
    }

    handleSelectionChange(event: MatCheckboxChange, assetId: string) {
        if (event.checked) {
            this.selectedAssets.push(assetId);
        } else {
            this.selectedAssets.splice(this.selectedAssets.indexOf(assetId), 1);
        }
    }

    openExportDialog(): void {
        const dialogRef = this.dialogService.open(SpDataExportDialogComponent, {
            panelType: PanelType.SLIDE_IN_PANEL,
            title: this.translateService.instant('Export resources'),
            width: '50vw',
            data: {
                selectedAssets: this.selectedAssets,
            },
        });

        dialogRef.afterClosed().subscribe(() => {});
    }

    openImportDialog(): void {
        const dialogRef = this.dialogService.open(SpDataImportDialogComponent, {
            panelType: PanelType.SLIDE_IN_PANEL,
            title: this.translateService.instant('Import resources'),
            width: '50vw',
            data: {},
        });

        dialogRef.afterClosed().subscribe(() => {});
    }

    downloadBulkExport(): void {
        this.bulkExportInProgress = true;
        this.dataExportService
            .triggerBulkExport({
                includePipelines: this.bulkIncludePipelines,
                includeAdapters: this.bulkIncludeAdapters,
                includeAssets: this.bulkIncludeAssets,
            })
            .subscribe({
                next: blob => {
                    const url = window.URL.createObjectURL(blob);
                    const anchor = document.createElement('a');
                    anchor.href = url;
                    anchor.download = 'streampipes_export.zip';
                    anchor.style.display = 'none';
                    document.body.appendChild(anchor);
                    anchor.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(anchor);
                    this.bulkExportInProgress = false;
                },
                error: () => {
                    this.bulkExportInProgress = false;
                },
            });
    }
}
