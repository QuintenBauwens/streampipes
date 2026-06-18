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

import { Component, Input, inject } from '@angular/core';
import {
    AdapterDescription,
    AdapterService,
} from '@streampipes/platform-services';
import { DialogRef } from '@streampipes/shared-ui';
import {
    FlexDirective,
    LayoutAlignDirective,
    LayoutDirective,
} from '@ngbracket/ngx-layout/flex';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatDivider } from '@angular/material/divider';
import { TranslatePipe } from '@ngx-translate/core';

type DeletePhase = 'confirm' | 'deleting' | 'pipeline-confirm' | 'result';

interface AdapterDeleteResult {
    adapter: AdapterDescription;
    status: 'success' | 'pipeline-conflict' | 'permission-denied' | 'error';
    errorMessage?: string;
}

@Component({
    selector: 'sp-delete-multiple-adapters-dialog',
    templateUrl: './delete-multiple-adapters-dialog.component.html',
    styleUrls: ['./delete-multiple-adapters-dialog.component.scss'],
    imports: [
        LayoutDirective,
        FlexDirective,
        LayoutAlignDirective,
        MatButton,
        MatProgressSpinner,
        MatDivider,
        TranslatePipe,
    ],
})
export class DeleteMultipleAdaptersDialogComponent {
    private dialogRef =
        inject<DialogRef<DeleteMultipleAdaptersDialogComponent>>(DialogRef);
    private adapterService = inject(AdapterService);

    @Input() adapters: AdapterDescription[] = [];

    phase: DeletePhase = 'confirm';
    progress = 0;
    results: AdapterDeleteResult[] = [];

    /** Adapters that returned 409 on the first pass (have pipelines) */
    conflictedAdapters: AdapterDescription[] = [];
    conflictedPipelineNames: string[] = [];

    get successCount(): number {
        return this.results.filter(r => r.status === 'success').length;
    }

    get skippedCount(): number {
        return this.results.filter(
            r =>
                r.status === 'pipeline-conflict' ||
                r.status === 'permission-denied',
        ).length;
    }

    get errorCount(): number {
        return this.results.filter(r => r.status === 'error').length;
    }

    close(refresh: boolean) {
        this.dialogRef.close(refresh);
    }

    startDelete(): void {
        this.phase = 'deleting';
        this.progress = 0;
        this.results = [];
        this.conflictedAdapters = [];
        this.conflictedPipelineNames = [];
        this.deleteSequential(this.adapters, false, () =>
            this.onFirstPassComplete(),
        );
    }

    private deleteSequential(
        adapters: AdapterDescription[],
        deleteWithPipelines: boolean,
        onComplete: () => void,
        index = 0,
    ): void {
        if (index >= adapters.length) {
            onComplete();
            return;
        }

        const adapter = adapters[index];
        this.adapterService
            .deleteAdapter(adapter, deleteWithPipelines)
            .subscribe({
                next: () => {
                    this.results.push({ adapter, status: 'success' });
                    this.progress++;
                    this.deleteSequential(
                        adapters,
                        deleteWithPipelines,
                        onComplete,
                        index + 1,
                    );
                },
                error: err => {
                    if (err.status === 409) {
                        if (deleteWithPipelines) {
                            // User wanted to delete pipelines but lacks permission
                            this.results.push({
                                adapter,
                                status: 'permission-denied',
                                errorMessage: err.error,
                            });
                        } else {
                            // Adapter has pipelines — handle after first pass
                            this.conflictedAdapters.push(adapter);
                            if (err.error) {
                                this.conflictedPipelineNames.push(err.error);
                            }
                        }
                    } else {
                        this.results.push({
                            adapter,
                            status: 'error',
                            errorMessage: err.error,
                        });
                    }
                    this.progress++;
                    this.deleteSequential(
                        adapters,
                        deleteWithPipelines,
                        onComplete,
                        index + 1,
                    );
                },
            });
    }

    private onFirstPassComplete(): void {
        if (this.conflictedAdapters.length > 0) {
            this.phase = 'pipeline-confirm';
        } else {
            this.phase = 'result';
        }
    }

    skipConflicted(): void {
        this.conflictedAdapters.forEach(adapter =>
            this.results.push({ adapter, status: 'pipeline-conflict' }),
        );
        this.phase = 'result';
    }

    deleteConflictedWithPipelines(): void {
        this.phase = 'deleting';
        const toRetry = [...this.conflictedAdapters];
        this.conflictedAdapters = [];
        this.conflictedPipelineNames = [];
        this.deleteSequential(toRetry, true, () => {
            this.phase = 'result';
        });
    }
}
