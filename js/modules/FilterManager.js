export class FilterManager {
    constructor() {
        this.activeFilters = {
            priority: new Set(),
            category: new Set(),
            status: new Set()
        };

        this.categoryFilters = document.getElementById('category-filters');
        this.clearFiltersBtn = document.getElementById('clear-filters');
    }

    setupEventListeners() {
        // Filter option clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-option') && !e.target.classList.contains('disabled')) {
                this.toggleFilter(e.target);
            }
        });

        // Clear filters button
        this.clearFiltersBtn?.addEventListener('click', () => {
            this.clearAllFilters();
        });
    }

    populateCategoryFilters(categories) {
        if (!this.categoryFilters) return;

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

    toggleFilter(button) {
        if (button.classList.contains('disabled')) return;

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

        return true; // Indicate that filters changed
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

        return true; // Indicate that filters were cleared
    }

    applyFilters(items) {
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

    togglePriorityFilter(priority) {
        const button = document.querySelector(`[data-filter="priority"][data-value="${priority}"]`);
        if (button && !button.classList.contains('disabled')) {
            const changed = this.toggleFilter(button);

            if (changed) {
                // Visual feedback
                button.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    button.style.transform = '';
                }, 150);
            }

            return changed;
        }
        return false;
    }

    // Get current filter state for debugging or external use
    getActiveFilters() {
        return {
            priority: Array.from(this.activeFilters.priority),
            category: Array.from(this.activeFilters.category),
            status: Array.from(this.activeFilters.status)
        };
    }

    // Set filter state programmatically
    setFilters(filters) {
        // Clear existing filters first
        this.clearAllFilters();

        // Set new filters
        if (filters.priority) {
            filters.priority.forEach(priority => {
                const button = document.querySelector(`[data-filter="priority"][data-value="${priority}"]`);
                if (button) {
                    this.toggleFilter(button);
                }
            });
        }

        if (filters.category) {
            filters.category.forEach(category => {
                const button = document.querySelector(`[data-filter="category"][data-value="${category}"]`);
                if (button) {
                    this.toggleFilter(button);
                }
            });
        }

        if (filters.status) {
            filters.status.forEach(status => {
                const button = document.querySelector(`[data-filter="status"][data-value="${status}"]`);
                if (button) {
                    this.toggleFilter(button);
                }
            });
        }
    }

    // Get filter statistics
    getFilterStats(allItems) {
        const stats = {
            priority: {},
            category: {},
            status: {
                wanted: 0,
                acquired: 0
            }
        };

        allItems.forEach(item => {
            // Priority stats
            stats.priority[item.priority] = (stats.priority[item.priority] || 0) + 1;

            // Category stats
            stats.category[item.category] = (stats.category[item.category] || 0) + 1;

            // Status stats
            if (item.purchased) {
                stats.status.acquired++;
            } else {
                stats.status.wanted++;
            }
        });

        return stats;
    }

    // Enable all filter options (called when data loads)
    enableAllFilters() {
        document.querySelectorAll('.filter-option').forEach(option => {
            option.classList.remove('disabled');
        });
    }

    // Disable all filter options (called during loading or error states)
    disableAllFilters() {
        document.querySelectorAll('.filter-option').forEach(option => {
            option.classList.add('disabled');
        });
    }

    // Get a summary of active filters for display
    getActiveFilterSummary() {
        const summary = [];

        if (this.activeFilters.priority.size > 0) {
            const priorities = Array.from(this.activeFilters.priority).join(', ');
            summary.push(`Priority: ${priorities}`);
        }

        if (this.activeFilters.category.size > 0) {
            const categories = Array.from(this.activeFilters.category).join(', ');
            summary.push(`Category: ${categories}`);
        }

        if (this.activeFilters.status.size > 0) {
            const statuses = Array.from(this.activeFilters.status).join(', ');
            summary.push(`Status: ${statuses}`);
        }

        return summary.length > 0 ? summary.join(' | ') : 'No active filters';
    }

    // Check if a specific filter type has active filters
    hasActivePriorityFilters() {
        return this.activeFilters.priority.size > 0;
    }

    hasActiveCategoryFilters() {
        return this.activeFilters.category.size > 0;
    }

    hasActiveStatusFilters() {
        return this.activeFilters.status.size > 0;
    }

    // Get count of items that would pass current filters
    getFilteredItemCount(items) {
        return this.applyFilters(items).length;
    }

    // Reset specific filter type
    clearPriorityFilters() {
        this.activeFilters.priority.clear();
        document.querySelectorAll('[data-filter="priority"].active').forEach(button => {
            button.classList.remove('active');
        });
    }

    clearCategoryFilters() {
        this.activeFilters.category.clear();
        document.querySelectorAll('[data-filter="category"].active').forEach(button => {
            button.classList.remove('active');
        });
    }

    clearStatusFilters() {
        this.activeFilters.status.clear();
        document.querySelectorAll('[data-filter="status"].active').forEach(button => {
            button.classList.remove('active');
        });
    }
}