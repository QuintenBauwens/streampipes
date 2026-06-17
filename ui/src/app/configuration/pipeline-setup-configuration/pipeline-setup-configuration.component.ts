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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
    LabelsService,
    MqttAutoPublishConfig,
    MqttAutoPublishConfigService,
    SpLabel,
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
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import {
    MatButtonToggle,
    MatButtonToggleGroup,
} from '@angular/material/button-toggle';

@Component({
    selector: 'sp-pipeline-setup-configuration',
    templateUrl: './pipeline-setup-configuration.component.html',
    styleUrl: './pipeline-setup-configuration.component.scss',
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
        MatTabGroup,
        MatTab,
        MatButtonToggleGroup,
        MatButtonToggle,
        SplitSectionComponent,
        SpAlertBannerComponent,
        TranslatePipe,
        RouterLink,
    ],
    standalone: true,
})
export class PipelineSetupConfigurationComponent implements OnInit {
    private configService = inject(MqttAutoPublishConfigService);
    private labelsService = inject(LabelsService);
    private breadcrumbService = inject(SpBreadcrumbService);
    private tabsService = inject(SpConfigurationTabsService);
    private route = inject(ActivatedRoute);

    tabs = this.tabsService.getTabs();
    config: MqttAutoPublishConfig = this.configService.defaultConfig();
    allLabels: SpLabel[] = [];
    isLoading = true;
    saved = false;
    error = false;
    errorMessage = '';
    selectedTabIndex = 0;

    ngOnInit(): void {
        this.breadcrumbService.updateBreadcrumb([
            SpConfigurationRoutes.BASE,
            { label: this.tabsService.getTabTitle('automation') },
        ]);
        this.route.queryParams.subscribe(params => {
            this.selectedTabIndex = params['tab'] === 'adapters' ? 1 : 0;
        });
        this.configService.getConfig().subscribe({
            next: cfg => {
                this.config = cfg;
                if (!this.config.pipelineLabelIds) {
                    this.config.pipelineLabelIds = [];
                }
                if (!this.config.adapterLabelIds) {
                    this.config.adapterLabelIds = [];
                }
                if (this.config.staticTopic == null) {
                    this.config.staticTopic = '';
                }
                this.isLoading = false;
            },
            error: () => {
                this.isLoading = false;
            },
        });
        this.labelsService.getAllLabels().subscribe({
            next: labels => (this.allLabels = labels),
            error: () => (this.allLabels = []),
        });
    }

    /** 'dynamic' = topic field from event stream; 'static' = fixed topic for all adapters. */
    get topicMode(): string {
        return this.config.staticTopic ? 'static' : 'dynamic';
    }

    set topicMode(value: string) {
        if (value === 'dynamic') {
            this.config.staticTopic = '';
        }
        this.clearStatus();
    }

    /** Derived sink selector — maps to/from the two boolean flags on the config. */
    get selectedSink(): string {
        if (this.config.enabled) return 'mqtt';
        if (this.config.dataLakeSinkEnabled) return 'data-lake';
        return '';
    }

    set selectedSink(value: string) {
        this.config.enabled = value === 'mqtt';
        this.config.dataLakeSinkEnabled = value === 'data-lake';
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

    get mqttConfigValid(): boolean {
        if (!this.config.autoDeploy) return true;
        if (this.selectedSink !== 'mqtt') return true;
        if (!this.config.brokerUrl?.trim()) return false;
        if (this.topicMode === 'static' && !this.config.staticTopic?.trim())
            return false;
        if (this.usesUsernameAccess) {
            if (!this.config.username?.trim()) return false;
            if (!this.config.password?.trim()) return false;
        }
        return true;
    }

    savePipelines(): void {
        if (!this.sinksValid) {
            this.error = true;
            this.errorMessage =
                'A sink must be selected when auto pipeline deployment is active.';
            return;
        }
        if (!this.mqttConfigValid) {
            this.error = true;
            if (!this.config.brokerUrl?.trim()) {
                this.errorMessage = 'Broker URL is required for the MQTT sink.';
            } else if (
                this.topicMode === 'static' &&
                !this.config.staticTopic?.trim()
            ) {
                this.errorMessage =
                    'A static topic is required when static topic mode is selected.';
            } else {
                this.errorMessage =
                    'Username and password are required for username/password access mode.';
            }
            return;
        }
        this.doSave();
    }

    saveAdapters(): void {
        this.doSave();
    }

    save(): void {
        this.doSave();
    }

    private doSave(): void {
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

    clearStatus(): void {
        this.saved = false;
        this.error = false;
    }
}
