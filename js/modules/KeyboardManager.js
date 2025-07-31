export class KeyboardManager {
    constructor(searchManager, filterManager, randomSelector, uiManager) {
        this.searchManager = searchManager;
        this.filterManager = filterManager;
        this.randomSelector = randomSelector;
        this.uiManager = uiManager;

        this.isDataLoaded = false;
        this.helpModalVisible = false;
    }

    setDataLoaded(loaded) {
        this.isDataLoaded = loaded;
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }

    handleKeydown(e) {
        // Only handle shortcuts if data is loaded and not typing in input
        if (!this.isDataLoaded || e.target.tagName === 'INPUT') return;

        // Handle Ctrl/Cmd combinations
        if (e.ctrlKey || e.metaKey) {
            this.handleModifierKeys(e);
        } else {
            // Handle standalone keys
            this.handleStandaloneKeys(e);
        }
    }

    handleModifierKeys(e) {
        switch (e.key.toLowerCase()) {
            case 'f':
                e.preventDefault();
                this.searchManager.focusSearch();
                this.announceAction('Search focused');
                break;
            case 'k':
                e.preventDefault();
                this.searchManager.focusSearch();
                this.announceAction('Quick search activated');
                break;
            case 'r':
                e.preventDefault();
                this.filterManager.clearAllFilters();
                this.searchManager.clearSearch();
                this.announceAction('All filters and search cleared');
                break;
            case 'h':
                e.preventDefault();
                this.toggleKeyboardHelp();
                break;
        }
    }

    handleStandaloneKeys(e) {
        switch (e.key.toLowerCase()) {
            case '/':
                e.preventDefault();
                this.searchManager.focusSearch();
                this.announceAction('Search focused');
                break;
            case 'escape':
                this.handleEscape();
                break;
            case '1':
            case '2':
            case '3':
            case '4':
                this.togglePriorityFilter(e.key);
                break;
            case 'c':
                this.filterManager.clearAllFilters();
                this.searchManager.clearSearch();
                this.announceAction('All filters cleared');
                break;
            case 'h':
                this.toggleKeyboardHelp();
                break;
            case 'r':
                if (!this.randomSelector.isRandomizing) {
                    e.preventDefault();
                    this.randomSelector.performRandomSelection('basic');
                    this.announceAction('Random selection started');
                }
                break;
            case 's':
                if (!this.randomSelector.isRandomizing) {
                    e.preventDefault();
                    this.randomSelector.performRandomSelection('weighted');
                    this.announceAction('Surprise selection started');
                }
                break;
            case 'p':
                if (!this.randomSelector.isRandomizing) {
                    e.preventDefault();
                    this.randomSelector.performRandomSelection('roulette');
                    this.announceAction('Priority roulette started');
                }
                break;
            case 't':
                e.preventDefault();
                this.uiManager.scrollToTop();
                this.announceAction('Scrolled to top');
                break;
            case '?':
                this.toggleKeyboardHelp();
                break;
        }
    }

    handleEscape() {
        // Priority order: close help modal > clear search > blur focused element
        if (this.helpModalVisible) {
            this.hideKeyboardHelp();
        } else if (this.searchManager.hasActiveSearch()) {
            this.searchManager.clearSearch();
            this.announceAction('Search cleared');
        } else {
            document.activeElement?.blur();
        }
    }

    togglePriorityFilter(key) {
        const priorityMap = {
            '1': 'CRITICAL',
            '2': 'HIGH',
            '3': 'MEDIUM',
            '4': 'LOW'
        };

        const priority = priorityMap[key];
        if (priority) {
            const changed = this.filterManager.togglePriorityFilter(priority);
            if (changed) {
                this.announceAction(`${priority} priority filter toggled`);
            }
        }
    }

    toggleKeyboardHelp() {
        if (this.helpModalVisible) {
            this.hideKeyboardHelp();
        } else {
            this.showKeyboardHelp();
        }
    }

    showKeyboardHelp() {
        // Create or toggle help modal
        const existingHelp = document.getElementById('keyboard-help');
        if (existingHelp) {
            existingHelp.remove();
            this.helpModalVisible = false;
            return;
        }

        const helpModal = document.createElement('div');
        helpModal.id = 'keyboard-help';
        helpModal.className = 'keyboard-help-modal';
        helpModal.innerHTML = this.getHelpModalHTML();

        document.body.appendChild(helpModal);
        this.helpModalVisible = true;

        // Focus the modal for accessibility
        helpModal.focus();

        // Trap focus within the modal
        this.uiManager.trapFocus(helpModal);

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (document.getElementById('keyboard-help')) {
                this.hideKeyboardHelp();
            }
        }, 10000);

        this.announceAction('Keyboard shortcuts help opened');
    }

    hideKeyboardHelp() {
        const helpModal = document.getElementById('keyboard-help');
        if (helpModal) {
            helpModal.remove();
            this.helpModalVisible = false;
            this.announceAction('Keyboard shortcuts help closed');
        }
    }

    getHelpModalHTML() {
        return `
        <div class="help-content">
            <div class="help-header">
                <span class="help-title">⌨️ KEYBOARD SHORTCUTS</span>
                <button class="help-close" onclick="this.closest('.keyboard-help-modal').remove(); window.keyboardManager.helpModalVisible = false;" aria-label="Close help">✕</button>
            </div>
            <div class="help-body">
                <div class="shortcut-group">
                    <div class="group-title">Search & Navigation</div>
                    <div class="shortcut-item">
                        <div><kbd>Ctrl</kbd> + <kbd>F</kbd> or <kbd>/</kbd></div>
                        <span>Focus search input</span>
                    </div>
                    <div class="shortcut-item">
                        <div><kbd>Ctrl</kbd> + <kbd>K</kbd></div>
                        <span>Quick search</span>
                    </div>
                    <div class="shortcut-item">
                        <div><kbd>Esc</kbd></div>
                        <span>Clear search / Close modals / Blur focus</span>
                    </div>
                    <div class="shortcut-item">
                        <div><kbd>T</kbd></div>
                        <span>Scroll to top</span>
                    </div>
                </div>
                <div class="shortcut-group">
                    <div class="group-title">Filters</div>
                    <div class="shortcut-item">
                        <div><kbd>1</kbd> - <kbd>4</kbd></div>
                        <span>Toggle priority filters (Critical → Low)</span>
                    </div>
                    <div class="shortcut-item">
                        <div><kbd>C</kbd></div>
                        <span>Clear all filters and search</span>
                    </div>
                    <div class="shortcut-item">
                        <div><kbd>Ctrl</kbd> + <kbd>R</kbd></div>
                        <span>Reset all filters and search</span>
                    </div>
                </div>
                <div class="shortcut-group">
                    <div class="group-title">Random Selection</div>
                    <div class="shortcut-item">
                        <div><kbd>R</kbd></div>
                        <span>Basic random selection</span>
                    </div>
                    <div class="shortcut-item">
                        <div><kbd>S</kbd></div>
                        <span>Surprise me (weighted selection)</span>
                    </div>
                    <div class="shortcut-item">
                        <div><kbd>P</kbd></div>
                        <span>Priority roulette</span>
                    </div>
                </div>
                <div class="shortcut-group">
                    <div class="group-title">Help & Interface</div>
                    <div class="shortcut-item">
                        <div><kbd>H</kbd> or <kbd>?</kbd></div>
                        <span>Show/hide keyboard shortcuts</span>
                    </div>
                    <div class="shortcut-item">
                        <div><kbd>Ctrl</kbd> + <kbd>H</kbd></div>
                        <span>Toggle help modal</span>
                    </div>
                    <div class="shortcut-item">
                        <div><kbd>↑</kbd> <kbd>↓</kbd></div>
                        <span>Navigate autocomplete suggestions</span>
                    </div>
                    <div class="shortcut-item">
                        <div><kbd>Enter</kbd></div>
                        <span>Select autocomplete suggestion</span>
                    </div>
                </div>
                <div class="shortcut-group">
                    <div class="group-title">Tips</div>
                    <div class="shortcut-tip">
                        <div class="tip-icon">💡</div>
                        <div class="tip-content">
                            <strong>Pro Tip:</strong> Use number keys (1-4) to quickly toggle priority filters while browsing your wishlist.
                        </div>
                    </div>
                    <div class="shortcut-tip">
                        <div class="tip-icon">🎯</div>
                        <div class="tip-content">
                            <strong>Quick Access:</strong> Press <kbd>/</kbd> from anywhere to start searching immediately.
                        </div>
                    </div>
                    <div class="shortcut-tip">
                        <div class="tip-icon">🎲</div>
                        <div class="tip-content">
                            <strong>Decision Help:</strong> Use <kbd>R</kbd>, <kbd>S</kbd>, or <kbd>P</kbd> for different random selection modes when you can't decide.
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    announceAction(message) {
        if (this.uiManager && this.uiManager.announceToScreenReader) {
            this.uiManager.announceToScreenReader(message);
        }
    }

    // Advanced keyboard combinations
    handleAdvancedCombinations(e) {
        // Alt + number keys for quick mode switching in random selector
        if (e.altKey && !e.ctrlKey && !e.metaKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    this.setRandomMode('all');
                    break;
                case '2':
                    e.preventDefault();
                    this.setRandomMode('wanted');
                    break;
                case '3':
                    e.preventDefault();
                    this.setRandomMode('priority');
                    break;
            }
        }

        // Ctrl + Alt combinations for advanced actions
        if (e.ctrlKey && e.altKey && !e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'c':
                    e.preventDefault();
                    this.copyWishlistSummary();
                    break;
                case 's':
                    e.preventDefault();
                    this.exportWishlist();
                    break;
            }
        }
    }

    setRandomMode(mode) {
        const modeButtons = {
            'all': document.querySelector('[data-mode="all"]'),
            'wanted': document.querySelector('[data-mode="wanted"]'),
            'priority': document.querySelector('[data-mode="priority"]')
        };

        const button = modeButtons[mode];
        if (button) {
            this.randomSelector.setRandomMode(button);
            this.announceAction(`Random mode set to ${mode}`);
        }
    }

    // Utility functions for advanced features
    copyWishlistSummary() {
        // Create a summary of the current wishlist state
        const activeFilters = this.filterManager.getActiveFilterSummary();
        const searchQuery = this.searchManager.getSearchQuery();
        const itemCount = document.getElementById('item-count')?.textContent || '';

        const summary = [
            'WISHLIST TERMINAL SUMMARY',
            '=' .repeat(25),
            `Items: ${itemCount}`,
            `Search: ${searchQuery || 'None'}`,
            `Filters: ${activeFilters}`,
            `Generated: ${new Date().toLocaleString()}`
        ].join('\n');

        if (navigator.clipboard) {
            navigator.clipboard.writeText(summary).then(() => {
                this.announceAction('Wishlist summary copied to clipboard');
            });
        }
    }

    exportWishlist() {
        // Trigger a wishlist export (would need to be implemented in main app)
        this.announceAction('Wishlist export initiated');
        // This would typically call a method on the main application
        // that handles data export functionality
    }

    // Context-sensitive help
    getContextualHelp() {
        const activeElement = document.activeElement;
        const context = [];

        if (activeElement?.id === 'search-input') {
            context.push('Search: Type to filter items, use ↑↓ to navigate suggestions');
        }

        if (this.filterManager.hasActiveFilters()) {
            context.push('Filters active: Press C to clear all filters');
        }

        if (this.searchManager.hasActiveSearch()) {
            context.push('Search active: Press Esc to clear search');
        }

        if (this.randomSelector.isRandomizing) {
            context.push('Random selection in progress...');
        }

        return context.join(' | ');
    }

    // Keyboard navigation for wishlist items
    enableItemNavigation() {
        let currentItemIndex = -1;
        const items = document.querySelectorAll('.wishlist-item');

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || !this.isDataLoaded) return;

            if (e.key === 'j' || (e.key === 'ArrowDown' && e.ctrlKey)) {
                e.preventDefault();
                currentItemIndex = Math.min(currentItemIndex + 1, items.length - 1);
                this.highlightItem(currentItemIndex);
            } else if (e.key === 'k' || (e.key === 'ArrowUp' && e.ctrlKey)) {
                e.preventDefault();
                currentItemIndex = Math.max(currentItemIndex - 1, 0);
                this.highlightItem(currentItemIndex);
            } else if (e.key === 'Enter' && currentItemIndex >= 0) {
                e.preventDefault();
                const currentItem = items[currentItemIndex];
                const link = currentItem?.querySelector('.access-link');
                if (link) {
                    link.click();
                }
            }
        });
    }

    highlightItem(index) {
        // Remove previous highlights
        document.querySelectorAll('.wishlist-item').forEach(item => {
            item.classList.remove('keyboard-focused');
        });

        // Add highlight to current item
        const items = document.querySelectorAll('.wishlist-item');
        if (items[index]) {
            items[index].classList.add('keyboard-focused');
            items[index].scrollIntoView({ behavior: 'smooth', block: 'center' });

            const itemName = items[index].querySelector('.item-name')?.textContent || `Item ${index + 1}`;
            this.announceAction(`Focused on ${itemName}`);
        }
    }

    // Initialize keyboard manager with all features
    initialize() {
        this.setupEventListeners();
        // Uncomment if you want vim-style navigation
        // this.enableItemNavigation();

        // Make keyboard manager globally accessible for help modal
        window.keyboardManager = this;
    }
}