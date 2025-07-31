// js/modules/SearchManager.js - Complete implementation with smart scrolling

export class SearchManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.searchQuery = '';
        this.autocompleteIndex = -1;
        this.shouldScrollToResults = false; // Track if we should scroll

        this.searchInput = document.getElementById('search-input');
        this.searchClear = document.getElementById('search-clear');
        this.searchStatus = document.getElementById('search-status');
        this.autocompleteDropdown = document.getElementById('autocomplete-dropdown');

        // Callback for when search changes (set by main.js)
        this.onSearchChange = null;
    }

    // Method for main.js to set the callback
    setSearchChangeCallback(callback) {
        this.onSearchChange = callback;
    }

    setupEventListeners() {
        // Search input events
        this.searchInput?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        this.searchInput?.addEventListener('keydown', (e) => {
            this.handleSearchKeydown(e);
        });

        this.searchInput?.addEventListener('focus', () => {
            if (this.searchQuery) {
                this.showAutocomplete();
            }
        });

        // Clear search button
        this.searchClear?.addEventListener('click', () => {
            this.clearSearch();
        });

        // Close autocomplete when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideAutocomplete();
            }
        });

        // Autocomplete item clicks
        this.autocompleteDropdown?.addEventListener('click', (e) => {
            const item = e.target.closest('.autocomplete-item');
            if (item) {
                const text = item.querySelector('.autocomplete-text').textContent;
                this.selectAutocompleteItem(text);
            }
        });
    }

    handleSearch(query, shouldScroll = false) {
        this.searchQuery = query.trim();
        this.shouldScrollToResults = shouldScroll; // Set scroll intent

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

        // Notify main.js that search has changed
        if (this.onSearchChange) {
            this.onSearchChange();
        }

        return this.searchQuery;
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
                    // User pressed Enter without selecting autocomplete - this is intentional search
                    this.shouldScrollToResults = true;
                    this.hideAutocomplete();
                    if (this.onSearchChange) {
                        this.onSearchChange();
                    }
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
        const searchableTerms = this.dataManager.getSearchableTerms();
        const matchingTerms = Array.from(searchableTerms)
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
        const allItems = this.dataManager.getItems();
        matchingTerms.forEach(term => {
            let type = 'TERM';

            // Check if it's a priority
            if (['critical', 'high', 'medium', 'low'].includes(term)) {
                type = 'PRIORITY';
            }
            // Check if it's a category
            else if (allItems.some(item => item.category.toLowerCase() === term)) {
                type = 'CATEGORY';
            }
            // Check if it's a status
            else if (['wanted', 'acquired'].includes(term)) {
                type = 'STATUS';
            }
            // Check if it's part of an item name
            else if (allItems.some(item => item.name.toLowerCase().includes(term))) {
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

        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
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
        this.handleSearch(text, true); // TRUE = should scroll because user selected
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
        this.shouldScrollToResults = false; // Don't scroll when clearing
        this.searchClear.style.display = 'none';
        this.updateSearchStatus('READY');
        this.hideAutocomplete();
        this.searchInput.focus();

        if (this.onSearchChange) {
            this.onSearchChange();
        }
    }

    updateSearchStatus(status) {
        if (!this.searchStatus) return;

        this.searchStatus.textContent = status;
        this.searchStatus.className = status.toLowerCase();
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

    highlightSearchTerms(text, searchQuery) {
        if (!searchQuery) return this.escapeHtml(text);

        const escaped = this.escapeHtml(text);
        const regex = new RegExp(`(${this.escapeRegex(searchQuery)})`, 'gi');
        return escaped.replace(regex, '<span class="search-highlight">$1</span>');
    }

    focusSearch() {
        this.searchInput.focus();
        this.searchInput.select();
        this.updateSearchStatus('FOCUSED');
    }

    // Method to check if we should scroll
    getShouldScrollToResults() {
        return this.shouldScrollToResults;
    }

    // Method to reset scroll flag after scrolling
    resetScrollFlag() {
        this.shouldScrollToResults = false;
    }

    // Utility methods
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Getters for other modules to access
    getSearchQuery() {
        return this.searchQuery;
    }

    hasActiveSearch() {
        return this.searchQuery.length > 0;
    }
}