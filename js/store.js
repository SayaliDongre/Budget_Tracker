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

    static updateTag(id, updatedTag) {
        let tags = Store.getTags();
        const index = tags.findIndex(t => t.id === id);
        if (index !== -1) {
            tags[index] = { ...tags[index], ...updatedTag };
            localStorage.setItem(STORE_KEYS.TAGS, JSON.stringify(tags));
        }
    }

    static deleteTag(id) {
        let tags = Store.getTags();
        tags = tags.filter(t => t.id !== id);
        localStorage.setItem(STORE_KEYS.TAGS, JSON.stringify(tags));
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

    static getLastBackupTime() {
        const time = localStorage.getItem('budget_tracker_last_backup');
        return time ? parseInt(time) : 0;
    }

    static updateLastBackupTime() {
        localStorage.setItem('budget_tracker_last_backup', Date.now().toString());
    }

    static getExpensesByDate(dateString) {
        // dateString format: YYYY-MM-DD
        return Store.getExpenses().filter(exp => exp.date === dateString);
    }

    static getExpensesByMonth(monthString) {
        // monthString format: YYYY-MM
        return Store.getExpenses().filter(exp => exp.date.startsWith(monthString));
    }

    static analyzeImportData(importedData) {
        if (!importedData || !Array.isArray(importedData.expenses)) {
            throw new Error("Invalid backup file format. Missing expenses list.");
        }

        const localExpenses = Store.getExpenses();
        if (localExpenses.length === 0 || importedData.expenses.length === 0) {
            return { hasOverlap: false, overlapStart: null, overlapEnd: null };
        }

        const importedDates = importedData.expenses.map(e => e.date).filter(Boolean).sort();
        const localDates = localExpenses.map(e => e.date).filter(Boolean).sort();

        if (importedDates.length === 0 || localDates.length === 0) {
            return { hasOverlap: false, overlapStart: null, overlapEnd: null };
        }

        const minImported = importedDates[0];
        const maxImported = importedDates[importedDates.length - 1];
        const minLocal = localDates[0];
        const maxLocal = localDates[localDates.length - 1];

        const overlapStart = minImported > minLocal ? minImported : minLocal;
        const overlapEnd = maxImported < maxLocal ? maxImported : maxLocal;

        const hasOverlap = overlapStart <= overlapEnd &&
            localExpenses.some(e => e.date >= overlapStart && e.date <= overlapEnd) &&
            importedData.expenses.some(e => e.date >= overlapStart && e.date <= overlapEnd);

        return {
            hasOverlap,
            overlapStart: hasOverlap ? overlapStart : null,
            overlapEnd: hasOverlap ? overlapEnd : null,
            minImported,
            maxImported,
            minLocal,
            maxLocal
        };
    }

    static mergeImportData(importedData, strategy = 'keep-both', overlapInfo = null) {
        const localTags = Store.getTags();
        const importedTags = importedData.tags || [];

        // Map imported tag IDs to existing or newly created local tag IDs
        const tagMap = {};
        importedTags.forEach(iTag => {
            const existingTag = localTags.find(lTag => lTag.id === iTag.id || lTag.name.toLowerCase() === iTag.name.toLowerCase());
            if (existingTag) {
                tagMap[iTag.id] = existingTag.id;
            } else {
                const newTag = Store.addTag({ name: iTag.name, icon: iTag.icon || '🏷️' });
                tagMap[iTag.id] = newTag.id;
            }
        });

        // Update tag IDs in imported expenses
        const normalizedImportedExpenses = (importedData.expenses || []).map(exp => ({
            ...exp,
            tagId: tagMap[exp.tagId] || exp.tagId || 't1'
        }));

        let localExpenses = Store.getExpenses();

        if (!overlapInfo || !overlapInfo.hasOverlap || strategy === 'keep-both') {
            const existingIds = new Set(localExpenses.map(e => e.id));
            normalizedImportedExpenses.forEach(exp => {
                let uniqueExp = { ...exp };
                if (existingIds.has(uniqueExp.id)) {
                    uniqueExp.id = 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
                }
                localExpenses.push(uniqueExp);
                existingIds.add(uniqueExp.id);
            });
        } else if (strategy === 'prefer-json') {
            const { overlapStart, overlapEnd } = overlapInfo;
            localExpenses = localExpenses.filter(e => !(e.date >= overlapStart && e.date <= overlapEnd));
            const existingIds = new Set(localExpenses.map(e => e.id));
            normalizedImportedExpenses.forEach(exp => {
                let uniqueExp = { ...exp };
                if (existingIds.has(uniqueExp.id)) {
                    uniqueExp.id = 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
                }
                localExpenses.push(uniqueExp);
            });
        } else if (strategy === 'prefer-local') {
            const { overlapStart, overlapEnd } = overlapInfo;
            const nonOverlappingImported = normalizedImportedExpenses.filter(e => !(e.date >= overlapStart && e.date <= overlapEnd));
            const existingIds = new Set(localExpenses.map(e => e.id));
            nonOverlappingImported.forEach(exp => {
                let uniqueExp = { ...exp };
                if (existingIds.has(uniqueExp.id)) {
                    uniqueExp.id = 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
                }
                localExpenses.push(uniqueExp);
            });
        }

        // Sort expenses by date descending
        localExpenses.sort((a, b) => b.date.localeCompare(a.date));

        localStorage.setItem(STORE_KEYS.EXPENSES, JSON.stringify(localExpenses));

        // Merge Budgets
        if (importedData.budgets) {
            const localBudgets = Store.getBudgets();
            Object.keys(importedData.budgets).forEach(monthKey => {
                if (!localBudgets[monthKey] || strategy === 'prefer-json') {
                    localBudgets[monthKey] = importedData.budgets[monthKey];
                } else if (strategy === 'keep-both') {
                    localBudgets[monthKey] = {
                        ...localBudgets[monthKey],
                        ...importedData.budgets[monthKey]
                    };
                }
            });
            localStorage.setItem(STORE_KEYS.BUDGETS, JSON.stringify(localBudgets));
        }

        Store.updateLastBackupTime();
    }

    static setupImportHandler(config) {
        const { triggerBtn, fileInput, modal, descEl, btnBoth, btnJson, btnLocal, btnCancel, onComplete } = config;
        if (!fileInput) return;

        if (triggerBtn) {
            triggerBtn.addEventListener('click', () => fileInput.click());
        }

        let pendingImportData = null;
        let pendingOverlapInfo = null;

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    const overlapInfo = Store.analyzeImportData(importedData);

                    if (overlapInfo.hasOverlap && modal && descEl) {
                        pendingImportData = importedData;
                        pendingOverlapInfo = overlapInfo;

                        descEl.innerHTML = `Overlapping date range detected between <strong>${overlapInfo.overlapStart}</strong> and <strong>${overlapInfo.overlapEnd}</strong>.<br><br>Imported Range: ${overlapInfo.minImported} to ${overlapInfo.maxImported}<br>Device Range: ${overlapInfo.minLocal} to ${overlapInfo.maxLocal}`;
                        modal.classList.remove('hidden');
                    } else {
                        Store.mergeImportData(importedData, 'keep-both', overlapInfo);
                        alert("Data imported and merged successfully!");
                        if (onComplete) onComplete();
                    }
                } catch (err) {
                    alert("Failed to import file: " + err.message);
                }
                fileInput.value = '';
            };
            reader.readAsText(file);
        });

        const executeMerge = (strategy) => {
            if (pendingImportData) {
                Store.mergeImportData(pendingImportData, strategy, pendingOverlapInfo);
                if (modal) modal.classList.add('hidden');
                pendingImportData = null;
                pendingOverlapInfo = null;
                alert("Data imported and merged successfully!");
                if (onComplete) onComplete();
            }
        };

        if (btnBoth) btnBoth.onclick = () => executeMerge('keep-both');
        if (btnJson) btnJson.onclick = () => executeMerge('prefer-json');
        if (btnLocal) btnLocal.onclick = () => executeMerge('prefer-local');
        if (btnCancel && modal) {
            btnCancel.onclick = () => {
                modal.classList.add('hidden');
                pendingImportData = null;
                pendingOverlapInfo = null;
            };
        }
    }
}
