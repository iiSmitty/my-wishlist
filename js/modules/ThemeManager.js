export class ThemeManager {
    constructor() {
        this.themes = {
            terminal: {
                name: 'Default Terminal',
                description: 'Classic green terminal aesthetic',
                preview: '#10b981'
            },
            amber: {
                name: 'Amber Retro',
                description: 'Vintage amber monochrome display',
                preview: '#ffb000'
            },
            matrix: {
                name: 'Matrix',
                description: 'Digital rain green on black',
                preview: '#00ff41'
            },
            cyberpunk: {
                name: 'Cyberpunk',
                description: 'Neon purple and cyan aesthetics',
                preview: '#ff00ff'
            },
            ocean: {
                name: 'Ocean',
                description: 'Deep blue underwater vibes',
                preview: '#00ccff'
            }
        };

        this.currentTheme = this.getStoredTheme() || 'terminal';
        this.themeSelector = null;
        this.isDropdownOpen = false;

        // Initialize theme on load
        this.applyTheme(this.currentTheme, false);
    }

    initialize() {
        this.createThemeSelector();
        this.setupEventListeners();

        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 't' && e.altKey && !e.target.matches('input, textarea')) {
                e.preventDefault();
                this.cycleTheme();
            }
        });
    }

    createThemeSelector() {
        const selectorHTML = `
        <div class="theme-selector" id="theme-selector">
            <button class="theme-selector-button" id="theme-button" aria-label="Change theme" aria-expanded="false">
                <span class="theme-icon">🎨</span>
                <span class="theme-current">${this.themes[this.currentTheme].name}</span>
                <span class="theme-arrow">▼</span>
            </button>
            <div class="theme-dropdown" id="theme-dropdown" role="listbox">
                ${Object.entries(this.themes).map(([key, theme]) => `
                    <div class="theme-option ${key === this.currentTheme ? 'active' : ''}" 
                         data-theme="${key}"
                         role="option"
                         tabindex="0"
                         aria-selected="${key === this.currentTheme}">
                        <div class="theme-preview ${key}"></div>
                        <div class="theme-info">
                            <div class="theme-name">${theme.name}</div>
                            <div class="theme-description">${theme.description}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

        document.body.insertAdjacentHTML('beforeend', selectorHTML);

        this.themeSelector = document.getElementById('theme-selector');
        this.themeButton = document.getElementById('theme-button');
        this.themeDropdown = document.getElementById('theme-dropdown');
    }

    setupEventListeners() {
        // Toggle dropdown
        this.themeButton?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        // Theme selection
        this.themeDropdown?.addEventListener('click', (e) => {
            const option = e.target.closest('.theme-option');
            if (option) {
                const theme = option.dataset.theme;
                this.setTheme(theme);
                this.closeDropdown();
            }
        });

        // Keyboard navigation in dropdown
        this.themeDropdown?.addEventListener('keydown', (e) => {
            this.handleDropdownKeyboard(e);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            this.closeDropdown();
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isDropdownOpen) {
                this.closeDropdown();
                this.themeButton?.focus();
            }
        });
    }

    toggleDropdown() {
        if (this.isDropdownOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    openDropdown() {
        this.themeDropdown?.classList.add('show');
        this.themeSelector?.classList.add('open');
        this.isDropdownOpen = true;

        // Update aria-expanded
        this.themeButton?.setAttribute('aria-expanded', 'true');

        // Focus first option
        const firstOption = this.themeDropdown?.querySelector('.theme-option');
        firstOption?.focus();

        // Announce to screen readers
        this.announceToScreenReader('Theme selector opened');
    }

    closeDropdown() {
        this.themeDropdown?.classList.remove('show');
        this.themeSelector?.classList.remove('open');
        this.isDropdownOpen = false;

        // Update aria-expanded
        this.themeButton?.setAttribute('aria-expanded', 'false');
    }

    handleDropdownKeyboard(e) {
        const options = Array.from(this.themeDropdown?.querySelectorAll('.theme-option') || []);
        const currentIndex = options.findIndex(option => option === document.activeElement);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = (currentIndex + 1) % options.length;
                options[nextIndex]?.focus();
                break;

            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = currentIndex === 0 ? options.length - 1 : currentIndex - 1;
                options[prevIndex]?.focus();
                break;

            case 'Enter':
            case ' ':
                e.preventDefault();
                const selectedOption = options[currentIndex];
                if (selectedOption) {
                    const theme = selectedOption.dataset.theme;
                    this.setTheme(theme);
                    this.closeDropdown();
                    this.themeButton?.focus();
                }
                break;

            case 'Home':
                e.preventDefault();
                options[0]?.focus();
                break;

            case 'End':
                e.preventDefault();
                options[options.length - 1]?.focus();
                break;
        }
    }

    setTheme(themeKey) {
        if (!this.themes[themeKey]) {
            console.warn(`Theme "${themeKey}" not found`);
            return false;
        }

        const previousTheme = this.currentTheme;
        this.currentTheme = themeKey;

        // Apply theme with transition
        this.applyTheme(themeKey, true);

        // Update UI
        this.updateThemeSelector();

        // Store preference
        this.storeTheme(themeKey);

        // Announce change
        this.announceToScreenReader(`Theme changed to ${this.themes[themeKey].name}`);

        // Dispatch custom event
        this.dispatchThemeChangeEvent(themeKey, previousTheme);

        return true;
    }

    applyTheme(themeKey, withTransition = false) {
        const root = document.documentElement;

        if (withTransition) {
            // Add transition class temporarily
            root.classList.add('theme-transitioning');
            setTimeout(() => {
                root.classList.remove('theme-transitioning');
            }, 500);
        }

        // Set theme attribute
        root.setAttribute('data-theme', themeKey);

        // Update meta theme-color for mobile browsers
        this.updateMetaThemeColor(themeKey);
    }

    updateThemeSelector() {
        // Update button text
        const currentText = this.themeSelector?.querySelector('.theme-current');
        if (currentText) {
            currentText.textContent = this.themes[this.currentTheme].name;
        }

        // Update active state in dropdown
        const options = this.themeSelector?.querySelectorAll('.theme-option');
        options?.forEach(option => {
            const isActive = option.dataset.theme === this.currentTheme;
            option.classList.toggle('active', isActive);
            option.setAttribute('aria-selected', isActive.toString());
        });
    }

    updateMetaThemeColor(themeKey) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');

        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }

        // Set color based on theme
        const colors = {
            terminal: '#10b981',
            amber: '#ffb000',
            matrix: '#00ff41',
            cyberpunk: '#ff00ff',
            ocean: '#00ccff'
        };

        metaThemeColor.content = colors[themeKey] || colors.terminal;
    }

    cycleTheme() {
        const themeKeys = Object.keys(this.themes);
        const currentIndex = themeKeys.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themeKeys.length;
        const nextTheme = themeKeys[nextIndex];

        this.setTheme(nextTheme);
    }

    getStoredTheme() {
        try {
            return localStorage.getItem('terminal-wishlist-theme');
        } catch (e) {
            console.warn('Failed to read theme from localStorage:', e);
            return null;
        }
    }

    storeTheme(theme) {
        try {
            localStorage.setItem('terminal-wishlist-theme', theme);
        } catch (e) {
            console.warn('Failed to store theme in localStorage:', e);
        }
    }

    // Public API
    getCurrentTheme() {
        return this.currentTheme;
    }

    getAvailableThemes() {
        return { ...this.themes };
    }

    addCustomTheme(key, config) {
        if (this.themes[key]) {
            console.warn(`Theme "${key}" already exists`);
            return false;
        }

        this.themes[key] = {
            name: config.name || key,
            description: config.description || 'Custom theme',
            preview: config.preview || '#ffffff'
        };

        // Recreate selector if it exists
        if (this.themeSelector) {
            this.themeSelector.remove();
            this.createThemeSelector();
            this.setupEventListeners();
        }

        return true;
    }

    removeCustomTheme(key) {
        if (['terminal', 'amber', 'matrix', 'cyberpunk', 'ocean'].includes(key)) {
            console.warn('Cannot remove built-in theme');
            return false;
        }

        if (!this.themes[key]) {
            console.warn(`Theme "${key}" not found`);
            return false;
        }

        // Switch to default if removing current theme
        if (this.currentTheme === key) {
            this.setTheme('terminal');
        }

        delete this.themes[key];
        return true;
    }

    // Utility methods
    dispatchThemeChangeEvent(newTheme, oldTheme) {
        const event = new CustomEvent('themechange', {
            detail: {
                newTheme,
                oldTheme,
                themeConfig: this.themes[newTheme]
            }
        });
        document.dispatchEvent(event);
    }

    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.style.cssText = `
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        `;
        announcement.textContent = message;

        document.body.appendChild(announcement);

        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    // Export theme configuration
    exportThemeConfig() {
        return {
            current: this.currentTheme,
            available: this.themes,
            timestamp: new Date().toISOString()
        };
    }

    destroy() {
        this.themeSelector?.remove();
    }
}