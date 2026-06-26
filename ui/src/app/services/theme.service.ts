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
const STORAGE_KEY = 'sp-theme-color';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private generalConfigService = inject(GeneralConfigService);

    /**
     * Reads the cached color from localStorage and applies it immediately
     * (synchronous — no flicker on hard refresh).
     * Call this as early as possible in app init.
     */
    applyFromStorage(): void {
        const stored = localStorage.getItem(STORAGE_KEY);
        this.applyColor(stored || DEFAULT_THEME_COLOR);
    }

    /**
     * Fetches the persisted theme color from the backend, updates localStorage,
     * and applies it. Keeps the cache in sync after any server-side change.
     */
    applyFromConfig(): void {
        this.generalConfigService.getGeneralConfig().subscribe(config => {
            const color = config.themeColor || DEFAULT_THEME_COLOR;
            this.applyColor(color);
        });
    }

    /**
     * Applies a primary color to the document root as a CSS custom property
     * and persists it to localStorage for instant reuse on next load.
     * Both --color-primary (light) and --color-primary-dark (dark mode) are
     * set so the chosen color takes effect in all color-scheme modes.
     */
    applyColor(color: string): void {
        document.documentElement.style.setProperty('--color-primary', color);
        document.documentElement.style.setProperty(
            '--color-primary-dark',
            color,
        );
        localStorage.setItem(STORAGE_KEY, color);
    }
}
