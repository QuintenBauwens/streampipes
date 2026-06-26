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

import { Injectable, inject } from '@angular/core';
import { GeneralConfigService } from '@streampipes/platform-services';

export const DEFAULT_THEME_COLOR = '#1b1464';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private generalConfigService = inject(GeneralConfigService);

    /** Fetches the persisted theme color from the backend and applies it. */
    applyFromConfig(): void {
        this.generalConfigService.getGeneralConfig().subscribe(config => {
            this.applyColor(config.themeColor || DEFAULT_THEME_COLOR);
        });
    }

    /**
     * Applies a primary color to the document root as a CSS custom property.
     * Both --color-primary (light mode) and --color-primary-dark (dark mode)
     * are set so the chosen color takes effect in all color-scheme modes.
     * Inline styles on the html element have higher specificity than any
     * stylesheet class rule, so this overrides the defaults in _custom-variables.scss.
     */
    applyColor(color: string): void {
        document.documentElement.style.setProperty('--color-primary', color);
        document.documentElement.style.setProperty(
            '--color-primary-dark',
            color,
        );
    }
}
