export class DataManager {
    constructor() {
        this.allItems = [];
        this.searchableTerms = new Set();
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
            const terms = [
                item.name, item.description, item.category, item.priority,
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

    setItems(items) {
        this.allItems = items;
        this.buildSearchIndex(items);
    }

    getItems() {
        return this.allItems;
    }

    getSearchableTerms() {
        return this.searchableTerms;
    }

    getCategories() {
        return [...new Set(this.allItems.map(item => item.category))].sort();
    }
}