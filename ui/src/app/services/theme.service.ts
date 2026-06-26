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
export const DEFAULT_SECONDARY_COLOR = '#39b54a';

const STORAGE_KEY_PRIMARY = 'sp-theme-color';
const STORAGE_KEY_SECONDARY = 'sp-theme-secondary-color';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private generalConfigService = inject(GeneralConfigService);

    /**
     * Reads both cached colors from localStorage and applies them immediately
     * (synchronous — no flicker on hard refresh).
     * Call this as early as possible in app init.
     */
    applyFromStorage(): void {
        const primary =
            localStorage.getItem(STORAGE_KEY_PRIMARY) || DEFAULT_THEME_COLOR;
        const secondary =
            localStorage.getItem(STORAGE_KEY_SECONDARY) ||
            DEFAULT_SECONDARY_COLOR;
        this.applyColors(primary, secondary);
    }

    /**
     * Fetches the persisted theme colors from the backend, updates localStorage,
     * and applies them. Keeps the cache in sync after any server-side change.
     */
    applyFromConfig(): void {
        this.generalConfigService.getGeneralConfig().subscribe(config => {
            this.applyColors(
                config.themeColor || DEFAULT_THEME_COLOR,
                config.themeSecondaryColor || DEFAULT_SECONDARY_COLOR,
            );
        });
    }

    /**
     * Applies both theme colors to the document root and persists them to
     * localStorage. Inline styles on html beat any stylesheet class rule.
     */
    applyColors(primary: string, secondary: string): void {
        document.documentElement.style.setProperty('--color-primary', primary);
        document.documentElement.style.setProperty(
            '--color-primary-dark',
            primary,
        );
        document.documentElement.style.setProperty(
            '--color-secondary',
            secondary,
        );
        document.documentElement.style.setProperty(
            '--color-secondary-dark',
            secondary,
        );
        localStorage.setItem(STORAGE_KEY_PRIMARY, primary);
        localStorage.setItem(STORAGE_KEY_SECONDARY, secondary);
    }

    /** Resets both colors to their defaults and clears localStorage. */
    resetToDefaults(): void {
        localStorage.removeItem(STORAGE_KEY_PRIMARY);
        localStorage.removeItem(STORAGE_KEY_SECONDARY);
        this.applyColors(DEFAULT_THEME_COLOR, DEFAULT_SECONDARY_COLOR);
    }
}
