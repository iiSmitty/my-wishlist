export class RandomSelector {
    constructor(dataManager, filterManager, searchManager) {
        this.dataManager = dataManager;
        this.filterManager = filterManager;
        this.searchManager = searchManager;

        this.randomMode = 'all';
        this.isRandomizing = false;

        this.randomStatus = document.getElementById('random-status');
        this.randomResult = document.getElementById('random-result');
    }

    setupEventListeners() {
        // Random selection buttons
        document.getElementById('random-select')?.addEventListener('click', () => {
            if (!this.isRandomizing) {
                this.performRandomSelection('basic');
            }
        });

        document.getElementById('surprise-me')?.addEventListener('click', () => {
            if (!this.isRandomizing) {
                this.performRandomSelection('weighted');
            }
        });

        document.getElementById('priority-roulette')?.addEventListener('click', () => {
            if (!this.isRandomizing) {
                this.performRandomSelection('roulette');
            }
        });

        // Random mode selection
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('mode-option') && !e.target.classList.contains('disabled')) {
                this.setRandomMode(e.target);
            }
        });

        // Random result action
        this.randomResult?.addEventListener('click', (e) => {
            if (e.target.classList.contains('random-result-action')) {
                const itemId = e.target.dataset.itemId;
                e.preventDefault();
                e.stopPropagation();
                this.jumpToRandomItem(itemId);
            }
        });
    }

    setRandomMode(button) {
        if (this.isRandomizing) return;

        // Update active state
        document.querySelectorAll('.mode-option').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        this.randomMode = button.dataset.mode;

        // Visual feedback
        button.style.transform = 'scale(1.05)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }

    getRandomFilteredItems() {
        let items = this.dataManager.getItems();

        // Apply current search
        if (this.searchManager.searchQuery) {
            items = this.searchManager.searchItems(items, this.searchManager.searchQuery);
        }

        // Apply current filters
        items = this.filterManager.applyFilters(items);

        // Apply random mode filter
        switch (this.randomMode) {
            case 'wanted':
                return items.filter(item => !item.purchased);
            case 'priority':
                return items.filter(item => ['CRITICAL', 'HIGH'].includes(item.priority));
            default:
                return items;
        }
    }

    async performRandomSelection(type) {
        const filteredItems = this.getRandomFilteredItems();

        if (filteredItems.length === 0) {
            this.updateRandomStatus('NO ITEMS AVAILABLE', 'error');
            return;
        }

        this.isRandomizing = true;
        this.startRandomAnimation(type);

        // Simulate selection time
        const selectionTime = type === 'roulette' ? 3000 : type === 'weighted' ? 2500 : 2000;
        await this.delay(selectionTime);

        let selectedItem;
        let resultType;

        switch (type) {
            case 'weighted':
                selectedItem = this.getWeightedRandomItem(filteredItems);
                resultType = '✨ SURPRISE SELECTION';
                break;
            case 'roulette':
                selectedItem = this.getPriorityRouletteItem(filteredItems);
                resultType = '🎰 ROULETTE RESULT';
                break;
            default:
                selectedItem = filteredItems[Math.floor(Math.random() * filteredItems.length)];
                resultType = '🎲 RANDOM SELECTION';
                break;
        }

        this.displayRandomResult(selectedItem, resultType);
        this.isRandomizing = false;
        this.resetRandomAnimation();
    }

    getWeightedRandomItem(items) {
        const weightedItems = [];

        items.forEach(item => {
            const weight = {
                'CRITICAL': 4,
                'HIGH': 3,
                'MEDIUM': 2,
                'LOW': 1
            }[item.priority];

            // Add extra weight for non-purchased items
            const purchaseWeight = item.purchased ? 1 : 2;
            const totalWeight = weight * purchaseWeight;

            for (let i = 0; i < totalWeight; i++) {
                weightedItems.push(item);
            }
        });

        return weightedItems[Math.floor(Math.random() * weightedItems.length)];
    }

    getPriorityRouletteItem(items) {
        // First, randomly select a priority level
        const priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
        const availablePriorities = priorities.filter(priority =>
            items.some(item => item.priority === priority)
        );

        if (availablePriorities.length === 0) {
            return items[Math.floor(Math.random() * items.length)];
        }

        const selectedPriority = availablePriorities[Math.floor(Math.random() * availablePriorities.length)];
        const priorityItems = items.filter(item => item.priority === selectedPriority);

        return priorityItems[Math.floor(Math.random() * priorityItems.length)];
    }

    startRandomAnimation(type) {
        const buttonText = document.getElementById('random-button-text');

        // Disable all random buttons
        document.querySelectorAll('.random-button').forEach(btn => {
            btn.disabled = true;
        });

        // Update button text with spinner
        if (buttonText) {
            buttonText.innerHTML = '<span class="spinning">🎲</span> PROCESSING...';
        }

        // Update status
        const statusText = {
            'weighted': 'ANALYZING PREFERENCES...',
            'roulette': 'SPINNING ROULETTE...',
            'basic': 'SELECTING RANDOM ITEM...'
        }[type] || 'PROCESSING...';

        this.updateRandomStatus(statusText, 'selecting');
    }

    resetRandomAnimation() {
        // Re-enable all random buttons
        document.querySelectorAll('.random-button').forEach(btn => {
            btn.disabled = false;
        });

        // Reset button text
        const buttonText = document.getElementById('random-button-text');
        if (buttonText) {
            buttonText.textContent = '🎲 RANDOM SELECT';
        }

        // Reset status
        this.updateRandomStatus('READY', 'ready');
    }

    updateRandomStatus(text, state = 'ready') {
        if (!this.randomStatus) return;

        this.randomStatus.textContent = text;
        this.randomStatus.className = state;

        if (state === 'error') {
            setTimeout(() => {
                this.updateRandomStatus('READY', 'ready');
            }, 3000);
        }
    }

    displayRandomResult(item, resultType) {
        if (!this.randomResult) return;

        const priorityIcon = this.getPriorityIndicator(item.priority);
        const statusIcon = item.purchased ? '✅' : '⏳';
        const statusText = item.purchased ? 'ACQUIRED' : 'WANTED';

        this.randomResult.innerHTML = `
            <div class="random-result-header">
                <div class="random-result-badge">${resultType}</div>
            </div>
            <div class="random-result-item" onclick="this.querySelector('.random-result-action').click()">
                <div class="random-result-icon">${priorityIcon}</div>
                <div class="random-result-content">
                    <div class="random-result-name">${this.escapeHtml(item.name)}</div>
                    <div class="random-result-meta">
                        <span class="random-result-priority priority-${item.priority.toLowerCase()}">${item.priority}</span>
                        <span>${item.category}</span>
                        <span>${statusIcon} ${statusText}</span>
                    </div>
                </div>
                <button class="random-result-action" data-item-id="${item.id}">
                    VIEW ITEM
                </button>
            </div>
        `;

        // Add direct click handler as backup
        const actionButton = this.randomResult.querySelector('.random-result-action');
        if (actionButton) {
            actionButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.jumpToRandomItem(item.id);
            });
        }

        this.randomResult.style.display = 'block';
        setTimeout(() => {
            this.randomResult.classList.add('show');
        }, 100);

        this.updateRandomStatus('SELECTION COMPLETE', 'complete');
    }

    jumpToRandomItem(itemId) {
        // Clear all filters and search to ensure item is visible
        this.filterManager.clearAllFilters();
        this.searchManager.clearSearch();

        // Scroll to and highlight the selected item
        setTimeout(() => {
            let itemElement = null;

            // Try to find by data-item-id on wishlist items
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
                itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Add temporary highlight effect
                itemElement.style.boxShadow = '0 0 30px var(--terminal-blue)';
                itemElement.style.transform = 'scale(1.02)';
                itemElement.style.transition = 'all 0.3s ease';
                itemElement.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';

                setTimeout(() => {
                    itemElement.style.boxShadow = '';
                    itemElement.style.transform = '';
                    itemElement.style.backgroundColor = '';
                }, 2500);
            }
        }, 500);
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}