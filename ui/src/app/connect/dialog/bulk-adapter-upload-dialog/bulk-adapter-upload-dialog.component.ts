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
import { AdapterService } from '@streampipes/platform-services';
import { DialogRef } from '@streampipes/shared-ui';
import {
    FlexDirective,
    LayoutAlignDirective,
    LayoutDirective,
} from '@ngbracket/ngx-layout/flex';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

type UploadPhase = 'preview' | 'uploading' | 'result';
type FileStatus = 'pending' | 'uploading' | 'success' | 'error';

export interface FileUploadEntry {
    file: File;
    status: FileStatus;
    error?: string;
}

@Component({
    selector: 'sp-bulk-adapter-upload-dialog',
    templateUrl: './bulk-adapter-upload-dialog.component.html',
    styleUrls: ['./bulk-adapter-upload-dialog.component.scss'],
    imports: [
        LayoutDirective,
        FlexDirective,
        LayoutAlignDirective,
        MatButton,
        MatProgressSpinner,
        MatDivider,
        MatIcon,
        TranslatePipe,
    ],
})
export class BulkAdapterUploadDialogComponent {
    private dialogRef =
        inject<DialogRef<BulkAdapterUploadDialogComponent>>(DialogRef);
    private adapterService = inject(AdapterService);

    @Input() files: File[] = [];

    phase: UploadPhase = 'preview';
    entries: FileUploadEntry[] = [];

    get successCount(): number {
        return this.entries.filter(e => e.status === 'success').length;
    }

    get errorCount(): number {
        return this.entries.filter(e => e.status === 'error').length;
    }

    get currentIndex(): number {
        return this.entries.filter(
            e => e.status === 'success' || e.status === 'error',
        ).length;
    }

    close(refresh: boolean) {
        this.dialogRef.close(refresh);
    }

    startUpload(): void {
        this.entries = this.files.map(f => ({ file: f, status: 'pending' }));
        this.phase = 'uploading';
        this.uploadNext(0);
    }

    private uploadNext(index: number): void {
        if (index >= this.entries.length) {
            this.phase = 'result';
            return;
        }

        const entry = this.entries[index];
        entry.status = 'uploading';

        this.adapterService.uploadAdapterConfig(entry.file).subscribe({
            next: () => {
                entry.status = 'success';
                this.uploadNext(index + 1);
            },
            error: err => {
                entry.status = 'error';
                // Backend standard error: { notifications: [{ title, description }] }
                const notif = err?.error?.notifications?.[0];
                const detail =
                    notif?.title ??
                    notif?.description ??
                    (typeof err?.error === 'string' ? err.error : null);
                const statusPrefix = err?.status ? `[${err.status}] ` : '';
                entry.error = detail
                    ? `${statusPrefix}${detail}`
                    : (err?.message ?? 'Upload failed');
                this.uploadNext(index + 1);
            },
        });
    }

    statusIcon(status: FileStatus): string {
        switch (status) {
            case 'success':
                return 'check_circle';
            case 'error':
                return 'error';
            case 'uploading':
                return 'sync';
            default:
                return 'schedule';
        }
    }

    statusColor(status: FileStatus): string {
        switch (status) {
            case 'success':
                return 'var(--color-success)';
            case 'error':
                return 'var(--color-error)';
            case 'uploading':
                return 'var(--color-accent)';
            default:
                return 'var(--color-text-3)';
        }
    }
}
