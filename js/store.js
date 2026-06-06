// Centralized Storage Management using LocalStorage

const STORE_KEYS = {
    EXPENSES: 'budget_tracker_expenses',
    TAGS: 'budget_tracker_tags',
    BUDGETS: 'budget_tracker_budgets'
};

const DEFAULT_TAGS = [
    { id: 't1', name: 'Groceries', icon: '🛒' },
    { id: 't2', name: 'Food & Dining', icon: '🍔' },
    { id: 't3', name: 'Shopping (DMart)', icon: '🛍️' },
    { id: 't4', name: 'Entertainment', icon: '🎬' },
    { id: 't5', name: 'Fuel & Transport', icon: '⛽' },
    { id: 't6', name: 'Health', icon: '🏥' }
];

class Store {
    static getExpenses() {
        const expenses = localStorage.getItem(STORE_KEYS.EXPENSES);
        return expenses ? JSON.parse(expenses) : [];
    }

    static saveExpense(expense) {
        const expenses = Store.getExpenses();
        // Give it a unique ID and current timestamp if not provided
        expense.id = expense.id || Date.now().toString();
        expenses.push(expense);
        localStorage.setItem(STORE_KEYS.EXPENSES, JSON.stringify(expenses));
    }

    static deleteExpense(id) {
        let expenses = Store.getExpenses();
        expenses = expenses.filter(exp => exp.id !== id);
        localStorage.setItem(STORE_KEYS.EXPENSES, JSON.stringify(expenses));
    }

    static getTags() {
        const tags = localStorage.getItem(STORE_KEYS.TAGS);
        return tags ? JSON.parse(tags) : [...DEFAULT_TAGS];
    }

    static addTag(tag) {
        const tags = Store.getTags();
        tag.id = 't' + Date.now();
        tags.push(tag);
        localStorage.setItem(STORE_KEYS.TAGS, JSON.stringify(tags));
        return tag;
    }

    static getBudgets() {
        const budgets = localStorage.getItem(STORE_KEYS.BUDGETS);
        // budgets is an object keyed by "YYYY-MM"
        return budgets ? JSON.parse(budgets) : {};
    }

    static saveBudget(monthKey, budgetData) {
        const budgets = Store.getBudgets();
        budgets[monthKey] = budgetData; // { overall: number, tags: { tagId: number } }
        localStorage.setItem(STORE_KEYS.BUDGETS, JSON.stringify(budgets));
    }

    static getExpensesByDate(dateString) {
        // dateString format: YYYY-MM-DD
        return Store.getExpenses().filter(exp => exp.date === dateString);
    }

    static getExpensesByMonth(monthString) {
        // monthString format: YYYY-MM
        return Store.getExpenses().filter(exp => exp.date.startsWith(monthString));
    }
}
