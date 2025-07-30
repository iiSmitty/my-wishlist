class TerminalWishlist {
    constructor() {
        this.container = document.getElementById('wishlist-container');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.noResults = document.getElementById('no-results');
        this.itemCount = document.getElementById('item-count');

        // Panel elements for loading states
        this.filterPanel = document.querySelector('.filter-panel');
        this.searchPanel = document.querySelector('.search-panel');

        // Filter elements
        this.categoryFilters = document.getElementById('category-filters');
        this.clearFiltersBtn = document.getElementById('clear-filters');

        // Search elements
        this.searchInput = document.getElementById('search-input');
        this.searchClear = document.getElementById('search-clear');
        this.searchStatus = document.getElementById('search-status');
        this.autocompleteDropdown = document.getElementById('autocomplete-dropdown');

        // Filter state
        this.activeFilters = {
            priority: new Set(),
            category: new Set(),
            status: new Set()
        };

        // Search state
        this.searchQuery = '';
        this.autocompleteIndex = -1;
        this.searchableTerms = new Set();

        this.allItems = [];
        this.isDataLoaded = false;

        this.initTerminal();
        this.startClock();
    }

    async initTerminal() {
        try {
            // Set initial loading states - hide panels completely
            this.setInitialLoadingState();

            await this.delay(2000); // Simulate connection time
            const items = await this.fetchWishlistData();

            this.allItems = items;
            this.buildSearchIndex(items);
            this.populateCategoryFilters(items);
            this.renderItems(items);
            this.updateItemCount(items);

            // Data loaded successfully - show panels and enable functionality
            this.setDataLoadedState();
            this.setupEventListeners();

            this.hideLoading();
            this.isDataLoaded = true;

        } catch (err) {
            console.error('Terminal Error:', err);
            this.showError();
            this.hideLoading();
            this.setErrorState();
        }
    }

    setInitialLoadingState() {
        // Hide both panels completely initially
        if (this.filterPanel) {
            this.filterPanel.classList.add('hidden');
            this.filterPanel.classList.remove('loading', 'loaded');
        }
        if (this.searchPanel) {
            this.searchPanel.classList.add('hidden');
            this.searchPanel.classList.remove('loading', 'loaded');
        }
    }

    setDataLoadedState() {
        // Show panels with smooth animation
        if (this.filterPanel) {
            this.filterPanel.classList.remove('hidden', 'loading');
            this.filterPanel.classList.add('loaded');
        }
        if (this.searchPanel) {
            this.searchPanel.classList.remove('hidden', 'loading');
            this.searchPanel.classList.add('loaded');
        }

        // Enable all filter options
        document.querySelectorAll('.filter-option').forEach(option => {
            option.classList.remove('disabled');
        });
    }

    setErrorState() {
        // Show panels in disabled state when there's an error
        if (this.filterPanel) {
            this.filterPanel.classList.remove('hidden', 'loading', 'loaded');
            this.filterPanel.classList.add('loading'); // Show error state
        }
        if (this.searchPanel) {
            this.searchPanel.classList.remove('hidden', 'loading', 'loaded');
            this.searchPanel.classList.add('loading'); // Show error state
        }

        // Disable all filter options
        document.querySelectorAll('.filter-option').forEach(option => {
            option.classList.add('disabled');
        });
    }

    setupEventListeners() {
        // Only set up event listeners after data is loaded
        this.setupFilterEventListeners();
        this.setupSearchEventListeners();
    }

    async fetchWishlistData() {
        const response = await fetch('./wishlist.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Database connection failed`);
        }
        return await response.json();
    }

    buildSearchIndex(items) {
        this.searchableTerms.clear();

        items.forEach(item => {
            // Add all searchable terms
            const terms = [
                item.name,
                item.description,
                item.category,
                item.priority,
                item.purchased ? 'acquired' : 'wanted',
                ...item.name.split(' '),
                ...item.description.split(' '),
                ...item.category.split(' ')
            ];

            terms.forEach(term => {
                if (term && term.length > 2) {
                    this.searchableTerms.add(term.toLowerCase().trim());
                }
            });
        });
    }

    populateCategoryFilters(items) {
        const categories = [...new Set(items.map(item => item.category))].sort();

        this.categoryFilters.innerHTML = '';
        categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'filter-option';
            button.setAttribute('data-filter', 'category');
            button.setAttribute('data-value', category);
            button.textContent = category;
            this.categoryFilters.appendChild(button);
        });
    }

    setupFilterEventListeners() {
        // Filter option clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-option') && !e.target.classList.contains('disabled')) {
                this.toggleFilter(e.target);
            }
        });

        // Clear filters button
        this.clearFiltersBtn.addEventListener('click', () => {
            if (this.isDataLoaded) {
                this.clearAllFilters();
            }
        });
    }

    setupSearchEventListeners() {
        // Search input events
        this.searchInput.addEventListener('input', (e) => {
            if (this.isDataLoaded) {
                this.handleSearch(e.target.value);
            }
        });

        this.searchInput.addEventListener('keydown', (e) => {
            if (this.isDataLoaded) {
                this.handleSearchKeydown(e);
            }
        });

        this.searchInput.addEventListener('focus', () => {
            if (this.isDataLoaded && this.searchQuery) {
                this.showAutocomplete();
            }
        });

        // Clear search button
        this.searchClear.addEventListener('click', () => {
            if (this.isDataLoaded) {
                this.clearSearch();
            }
        });

        // Close autocomplete when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideAutocomplete();
            }
        });

        // Autocomplete item clicks
        this.autocompleteDropdown.addEventListener('click', (e) => {
            if (!this.isDataLoaded) return;

            const item = e.target.closest('.autocomplete-item');
            if (item) {
                const text = item.querySelector('.autocomplete-text').textContent;
                this.selectAutocompleteItem(text);
            }
        });

        // Global keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    handleSearch(query) {
        if (!this.isDataLoaded) return;

        this.searchQuery = query.trim();

        // Show/hide clear button
        if (this.searchQuery) {
            this.searchClear.style.display = 'block';
            this.updateSearchStatus('SEARCHING');
        } else {
            this.searchClear.style.display = 'none';
            this.updateSearchStatus('READY');
        }

        // Update autocomplete
        this.updateAutocomplete(query);

        // Apply search filter
        this.applySearchAndFilters();
    }

    handleSearchKeydown(e) {
        if (!this.isDataLoaded) return;

        const items = this.autocompleteDropdown.querySelectorAll('.autocomplete-item');

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.autocompleteIndex = Math.min(this.autocompleteIndex + 1, items.length - 1);
                this.highlightAutocompleteItem();
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.autocompleteIndex = Math.max(this.autocompleteIndex - 1, -1);
                this.highlightAutocompleteItem();
                break;

            case 'Enter':
                e.preventDefault();
                if (this.autocompleteIndex >= 0 && items[this.autocompleteIndex]) {
                    const text = items[this.autocompleteIndex].querySelector('.autocomplete-text').textContent;
                    this.selectAutocompleteItem(text);
                } else {
                    this.hideAutocomplete();
                }
                break;

            case 'Escape':
                this.hideAutocomplete();
                this.searchInput.blur();
                break;
        }
    }

    updateAutocomplete(query) {
        if (!this.isDataLoaded || !query || query.length < 2) {
            this.hideAutocomplete();
            return;
        }

        const suggestions = this.getAutocompleteSuggestions(query);
        this.renderAutocomplete(suggestions);

        if (suggestions.length > 0) {
            this.showAutocomplete();
        } else {
            this.hideAutocomplete();
        }
    }

    getAutocompleteSuggestions(query) {
        const queryLower = query.toLowerCase();
        const suggestions = [];
        const maxSuggestions = 8;

        // Get matching terms
        const matchingTerms = Array.from(this.searchableTerms)
            .filter(term => term.includes(queryLower))
            .sort((a, b) => {
                // Prioritize exact matches and prefix matches
                const aStartsWith = a.startsWith(queryLower);
                const bStartsWith = b.startsWith(queryLower);

                if (aStartsWith && !bStartsWith) return -1;
                if (!aStartsWith && bStartsWith) return 1;

                return a.length - b.length;
            })
            .slice(0, maxSuggestions);

        // Categorize suggestions
        matchingTerms.forEach(term => {
            let type = 'TERM';

            // Check if it's a priority
            if (['critical', 'high', 'medium', 'low'].includes(term)) {
                type = 'PRIORITY';
            }
            // Check if it's a category
            else if (this.allItems.some(item => item.category.toLowerCase() === term)) {
                type = 'CATEGORY';
            }
            // Check if it's a status
            else if (['wanted', 'acquired'].includes(term)) {
                type = 'STATUS';
            }
            // Check if it's part of an item name
            else if (this.allItems.some(item => item.name.toLowerCase().includes(term))) {
                type = 'NAME';
            }

            suggestions.push({ text: term, type, query: queryLower });
        });

        return suggestions;
    }

    renderAutocomplete(suggestions) {
        this.autocompleteDropdown.innerHTML = '';
        this.autocompleteIndex = -1;

        suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';

            const highlightedText = this.highlightMatch(suggestion.text, suggestion.query);

            item.innerHTML = `
                <span class="autocomplete-type">${suggestion.type}</span>
                <span class="autocomplete-text">${highlightedText}</span>
            `;

            this.autocompleteDropdown.appendChild(item);
        });
    }

    highlightMatch(text, query) {
        if (!query) return text;

        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span class="autocomplete-match">$1</span>');
    }

    highlightAutocompleteItem() {
        const items = this.autocompleteDropdown.querySelectorAll('.autocomplete-item');

        items.forEach((item, index) => {
            if (index === this.autocompleteIndex) {
                item.classList.add('highlighted');
            } else {
                item.classList.remove('highlighted');
            }
        });
    }

    selectAutocompleteItem(text) {
        this.searchInput.value = text;
        this.handleSearch(text);
        this.hideAutocomplete();
        this.searchInput.focus();
    }

    showAutocomplete() {
        this.autocompleteDropdown.style.display = 'block';
    }

    hideAutocomplete() {
        this.autocompleteDropdown.style.display = 'none';
        this.autocompleteIndex = -1;
    }

    clearSearch() {
        if (!this.isDataLoaded) return;

        this.searchInput.value = '';
        this.searchQuery = '';
        this.searchClear.style.display = 'none';
        this.updateSearchStatus('READY');
        this.hideAutocomplete();
        this.applySearchAndFilters();
        this.searchInput.focus();
    }

    updateSearchStatus(status) {
        this.searchStatus.textContent = status;
        this.searchStatus.className = status.toLowerCase();
    }

    toggleFilter(button) {
        if (!this.isDataLoaded || button.classList.contains('disabled')) return;

        const filterType = button.getAttribute('data-filter');
        const filterValue = button.getAttribute('data-value');

        if (button.classList.contains('active')) {
            // Remove filter
            button.classList.remove('active');
            this.activeFilters[filterType].delete(filterValue);
        } else {
            // Add filter
            button.classList.add('active');
            this.activeFilters[filterType].add(filterValue);
        }

        this.applyFilters();
    }

    clearAllFilters() {
        if (!this.isDataLoaded) return;

        // Reset all filter sets
        this.activeFilters.priority.clear();
        this.activeFilters.category.clear();
        this.activeFilters.status.clear();

        // Remove active class from all filter buttons
        document.querySelectorAll('.filter-option.active').forEach(button => {
            button.classList.remove('active');
        });

        // Clear search as well
        this.clearSearch();
    }

    applyFilters() {
        if (!this.isDataLoaded) return;
        this.applySearchAndFilters();
    }

    applySearchAndFilters() {
        if (!this.isDataLoaded) return;

        let filteredItems = this.allItems;

        // Apply search filter first
        if (this.searchQuery) {
            filteredItems = this.searchItems(filteredItems, this.searchQuery);
            this.updateSearchStatus(filteredItems.length > 0 ? 'RESULTS' : 'NO RESULTS');
        }

        // Apply other filters
        filteredItems = this.applyOtherFilters(filteredItems);

        this.renderItemsWithHighlight(filteredItems);
        this.updateItemCount(filteredItems);

        // Show/hide no results message
        if (filteredItems.length === 0 && (this.searchQuery || this.hasActiveFilters())) {
            this.noResults.style.display = 'block';
            this.container.style.display = 'none';
        } else {
            this.noResults.style.display = 'none';
            this.container.style.display = 'grid';
        }
    }

    searchItems(items, query) {
        const queryLower = query.toLowerCase();

        return items.filter(item => {
            const searchableText = [
                item.name,
                item.description,
                item.category,
                item.priority,
                item.purchased ? 'acquired' : 'wanted'
            ].join(' ').toLowerCase();

            return searchableText.includes(queryLower);
        });
    }

    applyOtherFilters(items) {
        return items.filter(item => {
            // Priority filter
            if (this.activeFilters.priority.size > 0 && !this.activeFilters.priority.has(item.priority)) {
                return false;
            }

            // Category filter
            if (this.activeFilters.category.size > 0 && !this.activeFilters.category.has(item.category)) {
                return false;
            }

            // Status filter
            if (this.activeFilters.status.size > 0) {
                const itemStatus = item.purchased ? 'acquired' : 'wanted';
                if (!this.activeFilters.status.has(itemStatus)) {
                    return false;
                }
            }

            return true;
        });
    }

    hasActiveFilters() {
        return this.activeFilters.priority.size > 0 ||
            this.activeFilters.category.size > 0 ||
            this.activeFilters.status.size > 0;
    }

    renderItems(items) {
        this.renderItemsWithHighlight(items);
    }

    renderItemsWithHighlight(items) {
        this.container.innerHTML = '';

        // Sort items by priority: CRITICAL -> HIGH -> MEDIUM -> LOW
        const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
        const sortedItems = items.sort((a, b) => {
            // First sort by purchased status (acquired items go to bottom)
            if (a.purchased !== b.purchased) {
                return a.purchased ? 1 : -1;
            }
            // Then sort by priority within each group
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        sortedItems.forEach((item, index) => {
            const itemElement = this.createTerminalItemWithHighlight(item, index);
            this.container.appendChild(itemElement);
        });
    }

    createTerminalItemWithHighlight(item, index) {
        const itemDiv = document.createElement('div');
        itemDiv.className = `wishlist-item priority-${item.priority.toLowerCase()} ${item.purchased ? 'purchased acquired' : ''}`;
        itemDiv.style.animationDelay = `${index * 0.1}s`;

        const statusClass = item.purchased ? 'status-acquired' : 'status-wanted';
        const statusText = item.purchased ? 'ACQUIRED' : 'WANTED';
        const linkText = item.purchased ? 'VIEW PURCHASE' : 'ACCESS VENDOR';

        // Priority indicators with visual elements
        const priorityIndicator = this.getPriorityIndicator(item.priority);

        // Highlight search terms in name and description
        const highlightedName = this.highlightSearchTerms(item.name);
        const highlightedDescription = this.highlightSearchTerms(item.description);

        itemDiv.innerHTML = `
            <div class="item-header">
                <span class="item-id">ID: ${String(item.id).padStart(3, '0')}</span>
                <span class="item-status ${statusClass}">● ${statusText}</span>
            </div>
            <div class="item-priority">
                <span class="priority-label">PRIORITY:</span>
                <span class="priority-value priority-${item.priority.toLowerCase()}">${priorityIndicator} ${item.priority}</span>
                <span class="category-badge">[${item.category}]</span>
            </div>
            <h3 class="item-name">${highlightedName}</h3>
            <p class="item-description">${highlightedDescription}</p>
            <div class="item-footer">
                <div class="item-meta">
                    <span class="meta-label">CLASSIFICATION:</span>
                    <span class="meta-value">${item.category}</span>
                </div>
                <a href="${this.escapeHtml(item.link)}" class="access-link priority-${item.priority.toLowerCase()}" ${item.purchased ? '' : 'target="_blank" rel="noopener noreferrer"'}>
                    ${linkText}
                </a>
            </div>
        `;

        return itemDiv;
    }

    highlightSearchTerms(text) {
        if (!this.searchQuery) return this.escapeHtml(text);

        const escaped = this.escapeHtml(text);
        const regex = new RegExp(`(${this.escapeRegex(this.searchQuery)})`, 'gi');
        return escaped.replace(regex, '<span class="search-highlight">$1</span>');
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    getPriorityIndicator(priority) {
        const indicators = {
            'CRITICAL': '🔴',
            'HIGH': '🟡',
            'MEDIUM': '🟢',
            'LOW': '⚪'
        };
        return indicators[priority] || '⚪';
    }

    updateItemCount(filteredItems) {
        const total = this.allItems.length;
        const visible = filteredItems.length;

        if (total === visible) {
            this.itemCount.textContent = `${total} RECORDS FOUND`;
        } else {
            this.itemCount.textContent = `${visible} OF ${total} RECORDS DISPLAYED`;
        }
    }

    hideLoading() {
        this.loading.style.display = 'none';
    }

    showError() {
        this.error.style.display = 'block';
    }

    startClock() {
        const updateTime = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            document.getElementById('current-time').textContent = `TIME: ${timeString}`;
        };
        updateTime();
        setInterval(updateTime, 1000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts if data is loaded and not typing in input
            if (!this.isDataLoaded || e.target.tagName === 'INPUT') return;

            // Handle Ctrl/Cmd combinations
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'f':
                        e.preventDefault();
                        this.focusSearch();
                        break;
                    case 'k':
                        e.preventDefault();
                        this.focusSearch();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.clearAllFilters();
                        break;
                }
            }
            // Handle standalone keys
            else {
                switch (e.key) {
                    case '/':
                        e.preventDefault();
                        this.focusSearch();
                        break;
                    case 'Escape':
                        this.handleEscape();
                        break;
                    case '1':
                    case '2':
                    case '3':
                    case '4':
                        this.togglePriorityFilter(e.key);
                        break;
                    case 'c':
                        this.clearAllFilters();
                        break;
                    case 'h':
                        this.showKeyboardHelp();
                        break;
                }
            }
        });
    }

    focusSearch() {
        this.searchInput.focus();
        this.searchInput.select();
        this.updateSearchStatus('FOCUSED');
    }

    handleEscape() {
        // Clear search if it has content, otherwise blur any focused element
        if (this.searchQuery) {
            this.clearSearch();
        } else {
            document.activeElement?.blur();
            this.hideAutocomplete();
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
            const button = document.querySelector(`[data-filter="priority"][data-value="${priority}"]`);
            if (button && !button.classList.contains('disabled')) {
                this.toggleFilter(button);
                // Visual feedback
                button.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    button.style.transform = '';
                }, 150);
            }
        }
    }

    showKeyboardHelp() {
        // Create or toggle help modal
        const existingHelp = document.getElementById('keyboard-help');
        if (existingHelp) {
            existingHelp.remove();
            return;
        }

        const helpModal = document.createElement('div');
        helpModal.id = 'keyboard-help';
        helpModal.className = 'keyboard-help-modal';
        helpModal.innerHTML = `
        <div class="help-content">
            <div class="help-header">
                <span class="help-title">⌨️ KEYBOARD SHORTCUTS</span>
                <button class="help-close" onclick="this.parentElement.parentElement.parentElement.remove()">✕</button>
            </div>
            <div class="help-body">
                <div class="shortcut-group">
                    <div class="group-title">Search</div>
                    <div class="shortcut-item">
                        <kbd>Ctrl</kbd> + <kbd>F</kbd> or <kbd>/</kbd>
                        <span>Focus search</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl</kbd> + <kbd>K</kbd>
                        <span>Quick search</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Esc</kbd>
                        <span>Clear search / Exit</span>
                    </div>
                </div>
                <div class="shortcut-group">
                    <div class="group-title">Filters</div>
                    <div class="shortcut-item">
                        <kbd>1</kbd> - <kbd>4</kbd>
                        <span>Toggle priority (Critical → Low)</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>C</kbd>
                        <span>Clear all filters</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl</kbd> + <kbd>R</kbd>
                        <span>Reset all filters</span>
                    </div>
                </div>
                <div class="shortcut-group">
                    <div class="group-title">General</div>
                    <div class="shortcut-item">
                        <kbd>H</kbd>
                        <span>Show/hide this help</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>↑</kbd> <kbd>↓</kbd>
                        <span>Navigate autocomplete</span>
                    </div>
                </div>
            </div>
        </div>
    `;

        document.body.appendChild(helpModal);

        // Auto-hide after 8 seconds
        setTimeout(() => {
            if (document.getElementById('keyboard-help')) {
                helpModal.remove();
            }
        }, 8000);
    }
}

// Initialize the terminal
document.addEventListener('DOMContentLoaded', () => {
    new TerminalWishlist();
});