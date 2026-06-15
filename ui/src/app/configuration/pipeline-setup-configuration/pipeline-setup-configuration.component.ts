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
import { FormsModule } from '@angular/forms';
import {
    MqttAutoPublishConfig,
    MqttAutoPublishConfigService,
} from '@streampipes/platform-services';
import { SpConfigurationTabsService } from '../configuration-tabs.service';
import { SpConfigurationRoutes } from '../configuration.breadcrumb';
import {
    SpAlertBannerComponent,
    SpBasicNavTabsComponent,
    SpBreadcrumbService,
    SplitSectionComponent,
} from '@streampipes/shared-ui';
import { TranslatePipe } from '@ngx-translate/core';
import {
    FlexDirective,
    LayoutAlignDirective,
    LayoutDirective,
    LayoutGapDirective,
} from '@ngbracket/ngx-layout/flex';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatButton } from '@angular/material/button';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
    selector: 'sp-pipeline-setup-configuration',
    templateUrl: './pipeline-setup-configuration.component.html',
    imports: [
        SpBasicNavTabsComponent,
        LayoutDirective,
        FlexDirective,
        LayoutAlignDirective,
        LayoutGapDirective,
        FormsModule,
        MatFormField,
        MatLabel,
        MatInput,
        MatSlideToggle,
        MatButton,
        MatSelect,
        MatOption,
        MatDivider,
        MatIcon,
        MatProgressSpinner,
        SplitSectionComponent,
        SpAlertBannerComponent,
        TranslatePipe,
    ],
    standalone: true,
})
export class PipelineSetupConfigurationComponent implements OnInit {
    private configService = inject(MqttAutoPublishConfigService);
    private breadcrumbService = inject(SpBreadcrumbService);
    private tabsService = inject(SpConfigurationTabsService);

    tabs = this.tabsService.getTabs();
    config: MqttAutoPublishConfig = this.configService.defaultConfig();
    isLoading = true;
    saved = false;
    error = false;
    errorMessage = '';

    ngOnInit(): void {
        this.breadcrumbService.updateBreadcrumb([
            SpConfigurationRoutes.BASE,
            { label: this.tabsService.getTabTitle('pipeline-setup') },
        ]);
        this.configService.getConfig().subscribe({
            next: cfg => {
                this.config = cfg;
                this.isLoading = false;
            },
            error: () => {
                this.isLoading = false;
            },
        });
    }

    onMqttSinkToggle(): void {
        if (this.config.enabled) {
            this.config.dataLakeSinkEnabled = false;
        }
        this.clearStatus();
    }

    onDataLakeSinkToggle(): void {
        if (this.config.dataLakeSinkEnabled) {
            this.config.enabled = false;
        }
        this.clearStatus();
    }

    onAutoDeployChange(): void {
        this.clearStatus();
    }

    get usesUsernameAccess(): boolean {
        return this.config.accessMode === 'username-alternative';
    }

    get sinksValid(): boolean {
        return (
            !this.config.autoDeploy ||
            this.config.enabled ||
            this.config.dataLakeSinkEnabled
        );
    }

    save(): void {
        if (!this.sinksValid) {
            this.error = true;
            this.errorMessage =
                'At least one sink must be enabled when auto pipeline deployment is active.';
            return;
        }
        this.saved = false;
        this.error = false;
        this.configService.updateConfig(this.config).subscribe({
            next: updated => {
                this.config = updated;
                this.saved = true;
            },
            error: err => {
                this.error = true;
                this.errorMessage = err?.message ?? 'Could not save config';
            },
        });
    }

    private clearStatus(): void {
        this.saved = false;
        this.error = false;
    }
}
