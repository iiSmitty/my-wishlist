class TerminalWishlist {
    constructor() {
        this.container = document.getElementById('wishlist-container');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.noResults = document.getElementById('no-results');
        this.itemCount = document.getElementById('item-count');

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

        this.initTerminal();
        this.startClock();
        this.setupFilterEventListeners();
        this.setupSearchEventListeners();
    }

    async initTerminal() {
        try {
            await this.delay(2000); // Simulate connection time
            const items = await this.fetchWishlistData();
            this.allItems = items;
            this.buildSearchIndex(items);
            this.populateCategoryFilters(items);
            this.renderItems(items);
            this.updateItemCount(items);
            this.hideLoading();
        } catch (err) {
            console.error('Terminal Error:', err);
            this.showError();
            this.hideLoading();
        }
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
            if (e.target.classList.contains('filter-option')) {
                this.toggleFilter(e.target);
            }
        });

        // Clear filters button
        this.clearFiltersBtn.addEventListener('click', () => {
            this.clearAllFilters();
        });
    }

    setupSearchEventListeners() {
        // Search input events
        this.searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        this.searchInput.addEventListener('keydown', (e) => {
            this.handleSearchKeydown(e);
        });

        this.searchInput.addEventListener('focus', () => {
            if (this.searchQuery) {
                this.showAutocomplete();
            }
        });

        // Clear search button
        this.searchClear.addEventListener('click', () => {
            this.clearSearch();
        });

        // Close autocomplete when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideAutocomplete();
            }
        });

        // Autocomplete item clicks
        this.autocompleteDropdown.addEventListener('click', (e) => {
            const item = e.target.closest('.autocomplete-item');
            if (item) {
                const text = item.querySelector('.autocomplete-text').textContent;
                this.selectAutocompleteItem(text);
            }
        });
    }

    handleSearch(query) {
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
        if (!query || query.length < 2) {
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
        this.applySearchAndFilters();
    }

    applySearchAndFilters() {
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
}

// Initialize the terminal
document.addEventListener('DOMContentLoaded', () => {
    new TerminalWishlist();
});