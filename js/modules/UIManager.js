export class UIManager {
    constructor() {
        this.container = document.getElementById('wishlist-container');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.noResults = document.getElementById('no-results');
        this.itemCount = document.getElementById('item-count');

        // Panel elements
        this.filterPanel = document.querySelector('.filter-panel');
        this.searchPanel = document.querySelector('.search-panel');
        this.randomPanel = document.querySelector('.random-panel');
    }

    setInitialLoadingState() {
        // Hide all panels completely initially
        [this.filterPanel, this.searchPanel, this.randomPanel].forEach(panel => {
            if (panel) {
                panel.classList.add('hidden');
                panel.classList.remove('loading', 'loaded');
            }
        });
    }

    setDataLoadedState() {
        // Show panels with smooth animation
        [this.filterPanel, this.searchPanel, this.randomPanel].forEach(panel => {
            if (panel) {
                panel.classList.remove('hidden', 'loading');
                panel.classList.add('loaded');
            }
        });

        // Enable all interactive elements
        document.querySelectorAll('.filter-option, .mode-option').forEach(option => {
            option.classList.remove('disabled');
        });
    }

    setErrorState() {
        // Show panels in disabled state when there's an error
        [this.filterPanel, this.searchPanel, this.randomPanel].forEach(panel => {
            if (panel) {
                panel.classList.remove('hidden', 'loading', 'loaded');
                panel.classList.add('loading'); // Show error state
            }
        });

        // Disable all interactive elements
        document.querySelectorAll('.filter-option, .mode-option').forEach(option => {
            option.classList.add('disabled');
        });
    }

    hideLoading() {
        if (this.loading) {
            this.loading.style.display = 'none';
        }
    }

    showError() {
        if (this.error) {
            this.error.style.display = 'block';
        }
    }

    renderItems(items, searchQuery = '') {
        if (!this.container) return;

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
            const itemElement = this.createItemElement(item, index, searchQuery);
            this.container.appendChild(itemElement);
        });
    }

    createItemElement(item, index, searchQuery = '') {
        const itemDiv = document.createElement('div');
        itemDiv.className = `wishlist-item priority-${item.priority.toLowerCase()} ${item.purchased ? 'purchased acquired' : ''}`;
        itemDiv.style.animationDelay = `${index * 0.1}s`;
        itemDiv.setAttribute('data-item-id', item.id);

        const statusClass = item.purchased ? 'status-acquired' : 'status-wanted';
        const statusText = item.purchased ? 'ACQUIRED' : 'WANTED';
        const linkText = item.purchased ? 'VIEW PURCHASE' : 'ACCESS VENDOR';

        // Priority indicators with visual elements
        const priorityIndicator = this.getPriorityIndicator(item.priority);

        // Highlight search terms in name and description
        const highlightedName = this.highlightSearchTerms(item.name, searchQuery);
        const highlightedDescription = this.highlightSearchTerms(item.description, searchQuery);

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

    updateItemCount(visible, total) {
        if (!this.itemCount) return;

        if (total === visible) {
            this.itemCount.textContent = `${total} RECORDS FOUND`;
        } else {
            this.itemCount.textContent = `${visible} OF ${total} RECORDS DISPLAYED`;
        }
    }

    showNoResults(hasActiveFiltersOrSearch) {
        if (!this.noResults || !this.container) return;

        if (hasActiveFiltersOrSearch) {
            this.noResults.style.display = 'block';
            this.container.style.display = 'none';
        } else {
            this.noResults.style.display = 'none';
            this.container.style.display = 'grid';
        }
    }

    highlightSearchTerms(text, searchQuery) {
        if (!searchQuery) return this.escapeHtml(text);

        const escaped = this.escapeHtml(text);
        const regex = new RegExp(`(${this.escapeRegex(searchQuery)})`, 'gi');
        return escaped.replace(regex, '<span class="search-highlight">$1</span>');
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

    // Clock functionality
    startClock() {
        const updateTime = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            const timeElement = document.getElementById('current-time');
            if (timeElement) {
                timeElement.textContent = `TIME: ${timeString}`;
            }
        };
        updateTime();
        setInterval(updateTime, 1000);
    }

    // Item highlighting for random selection
    highlightItem(itemId, duration = 2500) {
        // Find the item element
        let itemElement = null;

        // Try to find by data-item-id
        const wishlistItems = document.querySelectorAll('.wishlist-item');
        wishlistItems.forEach(item => {
            const dataId = item.getAttribute('data-item-id');
            if (dataId == itemId) {
                itemElement = item;
            }
        });

        // Fallback: find by parsing the ID from the item header
        if (!itemElement) {
            wishlistItems.forEach(item => {
                const itemIdElement = item.querySelector('.item-id');
                if (itemIdElement) {
                    const idText = itemIdElement.textContent;
                    const extractedId = parseInt(idText.replace('ID: ', '').replace(/^0+/, '') || '0');
                    if (extractedId === parseInt(itemId)) {
                        itemElement = item;
                    }
                }
            });
        }

        if (itemElement) {
            // Scroll to item
            itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Add highlight effect
            itemElement.style.boxShadow = '0 0 30px var(--terminal-blue)';
            itemElement.style.transform = 'scale(1.02)';
            itemElement.style.transition = 'all 0.3s ease';
            itemElement.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';

            // Remove highlight after duration
            setTimeout(() => {
                itemElement.style.boxShadow = '';
                itemElement.style.transform = '';
                itemElement.style.backgroundColor = '';
            }, duration);

            return true; // Successfully highlighted
        }

        return false; // Item not found
    }

    // Panel visibility management
    showPanel(panelName) {
        const panel = this[`${panelName}Panel`];
        if (panel) {
            panel.classList.remove('hidden');
            panel.classList.add('loaded');
        }
    }

    hidePanel(panelName) {
        const panel = this[`${panelName}Panel`];
        if (panel) {
            panel.classList.add('hidden');
            panel.classList.remove('loaded');
        }
    }

    // Animation utilities
    animateElement(element, animation, duration = 300) {
        return new Promise(resolve => {
            element.style.animation = `${animation} ${duration}ms ease-in-out`;
            setTimeout(() => {
                element.style.animation = '';
                resolve();
            }, duration);
        });
    }

    // Theme management (if you want to add theme switching)
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('wishlist-theme', theme);
    }

    getTheme() {
        return localStorage.getItem('wishlist-theme') || 'terminal';
    }

    // Responsive utilities
    isMobile() {
        return window.innerWidth <= 768;
    }

    isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }

    isDesktop() {
        return window.innerWidth > 1024;
    }

    // Performance utilities
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Accessibility utilities
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;

        document.body.appendChild(announcement);

        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    // Focus management
    trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        element.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        lastFocusable.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        firstFocusable.focus();
                        e.preventDefault();
                    }
                }
            }
        });
    }

    // Utility methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get viewport information
    getViewportInfo() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            isMobile: this.isMobile(),
            isTablet: this.isTablet(),
            isDesktop: this.isDesktop()
        };
    }

    // Smooth scrolling utilities
    scrollToTop(smooth = true) {
        window.scrollTo({
            top: 0,
            behavior: smooth ? 'smooth' : 'auto'
        });
    }

    scrollToElement(element, block = 'center') {
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block });
        }
    }
}