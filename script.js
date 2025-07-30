class TerminalWishlist {
    constructor() {
        this.container = document.getElementById('wishlist-container');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.statsPanel = document.getElementById('stats-panel');
        this.totalItems = document.getElementById('total-items');
        this.pendingItems = document.getElementById('pending-items');
        this.totalValue = document.getElementById('total-value');
        this.itemCount = document.getElementById('item-count');

        this.initTerminal();
        this.startClock();
    }

    async initTerminal() {
        try {
            await this.delay(2000); // Simulate connection time
            const items = await this.fetchWishlistData();
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

    renderItems(items) {
        this.container.innerHTML = '';

        items.forEach((item, index) => {
            const itemElement = this.createTerminalItem(item, index);
            this.container.appendChild(itemElement);
        });
    }

    createTerminalItem(item, index) {
        const itemDiv = document.createElement('div');
        itemDiv.className = `wishlist-item ${item.purchased ? 'purchased acquired' : ''}`;
        itemDiv.style.animationDelay = `${index * 0.1}s`;

        const statusClass = item.purchased ? 'status-acquired' : 'status-wanted';
        const statusText = item.purchased ? 'ACQUIRED' : 'WANTED';
        const linkText = item.purchased ? 'VIEW PURCHASE' : 'ACCESS VENDOR';

        itemDiv.innerHTML = `
            <div class="item-header">
                <span class="item-id">ID: ${String(item.id).padStart(3, '0')}</span>
                <span class="item-status ${statusClass}">● ${statusText}</span>
            </div>
            <h3 class="item-name">${this.escapeHtml(item.name)}</h3>
            <p class="item-description">${this.escapeHtml(item.description)}</p>
            <div class="item-footer">
                <div class="item-price">${this.escapeHtml(item.price)}</div>
                <a href="${this.escapeHtml(item.link)}" class="access-link" ${item.purchased ? '' : 'target="_blank" rel="noopener noreferrer"'}>
                    ${linkText}
                </a>
            </div>
        `;

        return itemDiv;
    }

    updateTerminalStats(items) {
        const total = items.length;
        const pending = items.filter(item => !item.purchased).length;
        const totalValue = items.reduce((sum, item) => {
            const price = parseInt(item.price.replace(/[^0-9]/g, '')) || 0;
            return sum + price;
        }, 0);

        this.totalItems.textContent = total;
        this.pendingItems.textContent = pending;
        this.totalValue.textContent = `R${totalValue.toLocaleString()}`;
        this.itemCount.textContent = `${total} RECORDS FOUND`;
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