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
        expense.id = expense.id || ('exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
        expenses.push(expense);
        localStorage.setItem(STORE_KEYS.EXPENSES, JSON.stringify(expenses));
    }

    static updateExpense(id, updatedData) {
        let expenses = Store.getExpenses();
        const index = expenses.findIndex(exp => exp.id === id);
        if (index !== -1) {
            expenses[index] = { ...expenses[index], ...updatedData };
            localStorage.setItem(STORE_KEYS.EXPENSES, JSON.stringify(expenses));
        }
    }

    static getExpenseById(id) {
        return Store.getExpenses().find(exp => exp.id === id) || null;
    }

    static deleteExpense(id) {
        let expenses = Store.getExpenses();
        expenses = expenses.filter(exp => exp.id !== id);
        localStorage.setItem(STORE_KEYS.EXPENSES, JSON.stringify(expenses));
    }

    static getTags() {
        const tagsRaw = localStorage.getItem(STORE_KEYS.TAGS);
        let tags = tagsRaw ? JSON.parse(tagsRaw) : [...DEFAULT_TAGS];

        // Deduplicate tag IDs if any corrupted tags exist
        const seenIds = new Set();
        let updated = false;
        tags = tags.map(t => {
            if (!t.id || seenIds.has(t.id)) {
                updated = true;
                return { ...t, id: 't_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6) };
            }
            seenIds.add(t.id);
            return t;
        });

        if (updated) {
            localStorage.setItem(STORE_KEYS.TAGS, JSON.stringify(tags));
        }

        return tags;
    }

    static repairCorruptedTags() {
        const localTags = Store.getTags();
        let expenses = Store.getExpenses();
        let modified = false;

        expenses = expenses.map(exp => {
            if (exp.tagName) {
                const matchedTag = localTags.find(t => t.name.trim().toLowerCase() === exp.tagName.trim().toLowerCase());
                if (matchedTag && matchedTag.id !== exp.tagId) {
                    modified = true;
                    return { ...exp, tagId: matchedTag.id, tagIcon: matchedTag.icon };
                }
            }
            return exp;
        });

        if (modified) {
            localStorage.setItem(STORE_KEYS.EXPENSES, JSON.stringify(expenses));
        }
    }

    static addTag(tag) {
        const tags = Store.getTags();
        tag.id = tag.id || ('t_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
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

    static getExportData() {
        const expenses = Store.getExpenses();
        const tags = Store.getTags();
        const tagMap = {};
        tags.forEach(t => tagMap[t.id] = t);

        const enrichedExpenses = expenses.map(exp => ({
            ...exp,
            tagName: tagMap[exp.tagId] ? tagMap[exp.tagId].name : 'Unknown',
            tagIcon: tagMap[exp.tagId] ? tagMap[exp.tagId].icon : '🏷️'
        }));

        return {
            expenses: enrichedExpenses,
            tags: tags,
            budgets: Store.getBudgets(),
            exportedAt: new Date().toISOString()
        };
    }

    static mergeImportData(importedData, strategy = 'keep-both', overlapInfo = null) {
        let localTags = Store.getTags();
        const importedTags = importedData.tags || [];

        // Build tag map prioritizing Name Match
        const tagMap = {};
        importedTags.forEach(iTag => {
            if (!iTag || !iTag.name) return;
            const cleanName = iTag.name.trim().toLowerCase();
            // Match BY NAME FIRST to prevent duplicate ID collisions from old imports
            let existingTag = localTags.find(lTag => lTag.name.trim().toLowerCase() === cleanName);
            if (!existingTag) {
                existingTag = localTags.find(lTag => lTag.id === iTag.id);
            }
            if (existingTag) {
                tagMap[iTag.id] = existingTag.id;
            } else {
                const newTag = {
                    id: 't_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                    name: iTag.name.trim(),
                    icon: iTag.icon || '🏷️'
                };
                localTags.push(newTag);
                tagMap[iTag.id] = newTag.id;
            }
        });

        // Save updated local tags list
        localStorage.setItem(STORE_KEYS.TAGS, JSON.stringify(localTags));

        // Update tag IDs in imported expenses by inspecting JSON tag names
        const normalizedImportedExpenses = (importedData.expenses || []).map(exp => {
            const importedTagObj = importedTags.find(t => t && t.id === exp.tagId);
            const targetName = (importedTagObj ? importedTagObj.name : null) || exp.tagName || exp.tag;

            let mappedTagId = null;

            if (targetName) {
                const cleanTargetName = targetName.trim().toLowerCase();
                const matchedTag = localTags.find(t => t.name.trim().toLowerCase() === cleanTargetName);
                if (matchedTag) {
                    mappedTagId = matchedTag.id;
                }
            }

            if (!mappedTagId) {
                mappedTagId = tagMap[exp.tagId] || exp.tagId || 't1';
            }

            const currentTag = localTags.find(t => t.id === mappedTagId);
            return {
                ...exp,
                tagId: mappedTagId,
                tagName: currentTag ? currentTag.name : (targetName || 'Unknown'),
                tagIcon: currentTag ? currentTag.icon : (importedTagObj ? importedTagObj.icon : '🏷️')
            };
        });

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
