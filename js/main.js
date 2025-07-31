import { DataManager } from './modules/DataManager.js';
import { SearchManager } from './modules/SearchManager.js';
import { FilterManager } from './modules/FilterManager.js';
import { RandomSelector } from './modules/RandomSelector.js';
import { UIManager } from './modules/UIManager.js';
import { KeyboardManager } from './modules/KeyboardManager.js';

class TerminalWishlist {
    constructor() {
        // Initialize managers in dependency order
        this.dataManager = new DataManager();
        this.uiManager = new UIManager();
        this.searchManager = new SearchManager(this.dataManager);
        this.filterManager = new FilterManager();
        this.randomSelector = new RandomSelector(this.dataManager, this.filterManager, this.searchManager);
        this.keyboardManager = new KeyboardManager(
            this.searchManager,
            this.filterManager,
            this.randomSelector,
            this.uiManager
        );

        // Application state
        this.isDataLoaded = false;
        this.currentItems = [];

        // Initialize application
        this.initTerminal();
        this.uiManager.startClock();
    }

    async initTerminal() {
        try {
            this.uiManager.setInitialLoadingState();
            await this.delay(2000);

            const items = await this.dataManager.fetchWishlistData();

            this.dataManager.setItems(items);
            this.filterManager.populateCategoryFilters(this.dataManager.getCategories());

            this.currentItems = items;
            this.uiManager.renderItems(items);
            this.uiManager.updateItemCount(items.length, items.length);

            this.uiManager.setDataLoadedState();
            this.setupEventListeners();
            this.uiManager.hideLoading();
            this.isDataLoaded = true;
            this.keyboardManager.setDataLoaded(true);

        } catch (err) {
            console.error('Terminal initialization failed:', err);
            this.uiManager.showError();
            this.uiManager.setErrorState();
            this.keyboardManager.setDataLoaded(false);
        }
    }

    setupEventListeners() {
        // Set up all manager event listeners
        this.searchManager.setupEventListeners();
        this.filterManager.setupEventListeners();
        this.randomSelector.setupEventListeners();
        this.keyboardManager.initialize();

        // Set up application-level event listeners
        this.setupApplicationEventListeners();
    }

    setupApplicationEventListeners() {
        // Set up search callback instead of duplicate event listener
        this.searchManager.setSearchChangeCallback(() => {
            this.handleSearchAndFilterChange();
        });

        // Listen for filter changes (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-option') && !e.target.classList.contains('disabled')) {
                setTimeout(() => {
                    this.handleSearchAndFilterChange();
                }, 10);
            }
        });

        // Listen for clear filters
        this.filterManager.clearFiltersBtn?.addEventListener('click', () => {
            setTimeout(() => {
                this.handleSearchAndFilterChange();
            }, 10);
        });

        // Handle window resize for responsive behavior
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleWindowResize();
            }, 250);
        });

        // Handle visibility changes (page focus/blur)
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });

        // Global error handling
        window.addEventListener('error', (e) => {
            this.handleGlobalError(e);
        });

        window.addEventListener('unhandledrejection', (e) => {
            this.handleGlobalError(e);
        });
    }

    handleSearchAndFilterChange() {
        if (!this.isDataLoaded) return;

        let filteredItems = this.dataManager.getItems();

        // Apply search filter first
        const searchQuery = this.searchManager.getSearchQuery();
        if (searchQuery) {
            filteredItems = this.searchManager.searchItems(filteredItems, searchQuery);
            this.searchManager.updateSearchStatus(filteredItems.length > 0 ? 'RESULTS' : 'NO RESULTS');
        } else {
            this.searchManager.updateSearchStatus('READY');
        }

        // Apply other filters
        filteredItems = this.filterManager.applyFilters(filteredItems);

        // Update UI
        this.currentItems = filteredItems;
        this.uiManager.renderItems(filteredItems, searchQuery);
        this.uiManager.updateItemCount(filteredItems.length, this.dataManager.getItems().length);

        // Show/hide no results message
        const hasActiveFiltersOrSearch = searchQuery || this.filterManager.hasActiveFilters();
        this.uiManager.showNoResults(filteredItems.length === 0 && hasActiveFiltersOrSearch);

        // Update random selector with new filtered items
        this.updateRandomSelectorStatus();

        // SMART SCROLLING: Only scroll if user actually selected/committed to search
        if (hasActiveFiltersOrSearch && this.searchManager.getShouldScrollToResults()) {
            this.scrollToResults();
            this.searchManager.resetScrollFlag(); // Reset the flag after scrolling
        }
    }

    scrollToResults() {
        const wishlistDisplay = document.querySelector('.wishlist-display');
        if (wishlistDisplay) {
            setTimeout(() => {
                wishlistDisplay.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 100);
        }
    }

    updateRandomSelectorStatus() {
        const availableItems = this.randomSelector.getRandomFilteredItems();
        if (availableItems.length === 0 && (this.searchManager.hasActiveSearch() || this.filterManager.hasActiveFilters())) {
            this.randomSelector.updateRandomStatus('NO ITEMS IN SELECTION', 'error');
        } else {
            this.randomSelector.updateRandomStatus('READY', 'ready');
        }
    }

    handleWindowResize() {
        const viewportInfo = this.uiManager.getViewportInfo();

        // Auto-close help modal on mobile when resizing
        if (viewportInfo.isMobile && this.keyboardManager.helpModalVisible) {
            this.keyboardManager.hideKeyboardHelp();
        }
    }

    handleVisibilityChange() {
        // Handle page visibility changes if needed
        // Could pause/resume animations or polling here
    }

    handleGlobalError(error) {
        console.error('Global error:', error);
        this.showErrorNotification('An unexpected error occurred. Please refresh the page.');
    }

    showErrorNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--terminal-red);
            color: white;
            padding: 1rem;
            border-radius: 4px;
            z-index: 9999;
            font-family: inherit;
            font-size: 0.9rem;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // Public API methods for external access
    getApplicationState() {
        return {
            isDataLoaded: this.isDataLoaded,
            totalItems: this.dataManager.getItems().length,
            visibleItems: this.currentItems.length,
            activeSearch: this.searchManager.getSearchQuery(),
            activeFilters: this.filterManager.getActiveFilters(),
            randomMode: this.randomSelector.randomMode,
            isRandomizing: this.randomSelector.isRandomizing
        };
    }

    exportWishlist(format = 'json') {
        const state = this.getApplicationState();
        const data = {
            metadata: {
                exported: new Date().toISOString(),
                version: '2.2.0',
                totalItems: state.totalItems,
                visibleItems: state.visibleItems
            },
            filters: state.activeFilters,
            search: state.activeSearch,
            items: this.currentItems
        };

        switch (format.toLowerCase()) {
            case 'json':
                return this.downloadJSON(data, 'wishlist-export.json');
            case 'csv':
                return this.downloadCSV(this.currentItems, 'wishlist-export.csv');
            default:
                console.warn('Unsupported export format:', format);
                return false;
        }
    }

    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    }

    downloadCSV(items, filename) {
        const headers = ['ID', 'Name', 'Description', 'Priority', 'Category', 'Status', 'Link'];
        const csvContent = [
            headers.join(','),
            ...items.map(item => [
                item.id,
                `"${item.name.replace(/"/g, '""')}"`,
                `"${item.description.replace(/"/g, '""')}"`,
                item.priority,
                item.category,
                item.purchased ? 'ACQUIRED' : 'WANTED',
                item.link
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    }

    // Debug methods for development
    debug() {
        return {
            state: this.getApplicationState(),
            managers: {
                data: this.dataManager,
                ui: this.uiManager,
                search: this.searchManager,
                filter: this.filterManager,
                random: this.randomSelector,
                keyboard: this.keyboardManager
            },
            dom: {
                panels: {
                    search: document.querySelector('.search-panel'),
                    filter: document.querySelector('.filter-panel'),
                    random: document.querySelector('.random-panel')
                },
                items: document.querySelectorAll('.wishlist-item').length,
                activeFilters: document.querySelectorAll('.filter-option.active').length
            }
        };
    }

    getPerformanceMetrics() {
        if (!window.performance) return null;

        return {
            navigation: performance.getEntriesByType('navigation')[0],
            resources: performance.getEntriesByType('resource').length,
            measures: performance.getEntriesByType('measure'),
            memory: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            } : null
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    destroy() {
        window.removeEventListener('resize', this.handleWindowResize);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('error', this.handleGlobalError);
        window.removeEventListener('unhandledrejection', this.handleGlobalError);
    }
}

// Initialize the terminal application
let terminalApp;

document.addEventListener('DOMContentLoaded', () => {
    terminalApp = new TerminalWishlist();

    // Make app globally accessible for debugging (only in development)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.terminalApp = terminalApp;
        console.log('Debug: terminalApp.debug() available | Press H for shortcuts');
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (terminalApp) {
        terminalApp.destroy();
    }
});

// Export for ES6 module compatibility
export { TerminalWishlist };