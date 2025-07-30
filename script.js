class TerminalWishlist {
    constructor() {
        this.container = document.getElementById('wishlist-container');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.noResults = document.getElementById('no-results');
        this.statsPanel = document.getElementById('stats-panel');
        this.totalItems = document.getElementById('total-items');
        this.visibleItems = document.getElementById('visible-items');
        this.totalValue = document.getElementById('total-value');
        this.itemCount = document.getElementById('item-count');

        // Filter elements
        this.categoryFilters = document.getElementById('category-filters');
        this.clearFiltersBtn = document.getElementById('clear-filters');

        // Filter state
        this.activeFilters = {
            priority: new Set(),
            category: new Set(),
            status: new Set()
        };

        this.allItems = [];

        this.initTerminal();
        this.startClock();
        this.setupFilterEventListeners();
    }

    async initTerminal() {
        try {
            await this.delay(2000); // Simulate connection time
            const items = await this.fetchWishlistData();
            this.allItems = items;
            this.populateCategoryFilters(items);
            this.renderItems(items);
            this.updateTerminalStats(items);
            this.hideLoading();
            this.showStats();
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

        this.applyFilters();
    }

    applyFilters() {
        const filteredItems = this.allItems.filter(item => {
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

        this.renderItems(filteredItems);
        this.updateFilteredStats(filteredItems);

        // Show/hide no results message
        if (filteredItems.length === 0 && this.hasActiveFilters()) {
            this.noResults.style.display = 'block';
            this.container.style.display = 'none';
        } else {
            this.noResults.style.display = 'none';
            this.container.style.display = 'grid';
        }
    }

    hasActiveFilters() {
        return this.activeFilters.priority.size > 0 ||
            this.activeFilters.category.size > 0 ||
            this.activeFilters.status.size > 0;
    }

    renderItems(items) {
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
            const itemElement = this.createTerminalItem(item, index);
            this.container.appendChild(itemElement);
        });
    }

    createTerminalItem(item, index) {
        const itemDiv = document.createElement('div');
        itemDiv.className = `wishlist-item priority-${item.priority.toLowerCase()} ${item.purchased ? 'purchased acquired' : ''}`;
        itemDiv.style.animationDelay = `${index * 0.1}s`;

        const statusClass = item.purchased ? 'status-acquired' : 'status-wanted';
        const statusText = item.purchased ? 'ACQUIRED' : 'WANTED';
        const linkText = item.purchased ? 'VIEW PURCHASE' : 'ACCESS VENDOR';

        // Priority indicators with visual elements
        const priorityIndicator = this.getPriorityIndicator(item.priority);

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
            <h3 class="item-name">${this.escapeHtml(item.name)}</h3>
            <p class="item-description">${this.escapeHtml(item.description)}</p>
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

    getPriorityIndicator(priority) {
        const indicators = {
            'CRITICAL': '🔴',
            'HIGH': '🟡',
            'MEDIUM': '🟢',
            'LOW': '⚪'
        };
        return indicators[priority] || '⚪';
    }

    updateTerminalStats(items) {
        const total = items.length;
        const criticalItems = items.filter(item => item.priority === 'CRITICAL' && !item.purchased).length;

        this.totalItems.textContent = total;
        this.visibleItems.textContent = total;
        this.totalValue.textContent = criticalItems;
        this.itemCount.textContent = `${total} RECORDS FOUND`;
    }

    updateFilteredStats(filteredItems) {
        const total = this.allItems.length;
        const visible = filteredItems.length;
        const criticalVisible = filteredItems.filter(item => item.priority === 'CRITICAL' && !item.purchased).length;

        this.totalItems.textContent = total;
        this.visibleItems.textContent = visible;
        this.totalValue.textContent = criticalVisible;
        this.itemCount.textContent = `${visible} OF ${total} RECORDS DISPLAYED`;
    }

    showStats() {
        this.statsPanel.style.display = 'grid';
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