// Home Page Logic

document.addEventListener('DOMContentLoaded', () => {
    const dateSelector = document.getElementById('date-selector');
    const tagsContainer = document.getElementById('tags-container');
    const newTagName = document.getElementById('new-tag-name');
    const newTagIcon = document.getElementById('new-tag-icon');
    const btnAddTag = document.getElementById('btn-add-tag');
    const btnUpdateTag = document.getElementById('btn-update-tag');
    const btnDeleteTag = document.getElementById('btn-delete-tag');
    
    const expenseDesc = document.getElementById('expense-desc');
    const expenseAmount = document.getElementById('expense-amount');
    const btnAddExpense = document.getElementById('btn-add-expense');
    
    const viewMode = document.getElementById('view-mode');
    const listTitle = document.getElementById('list-title');
    const expenseList = document.getElementById('expense-list');
    const totalAmountElem = document.getElementById('total-amount');

    let selectedTagId = null;

    // Set default date to today (local time, not UTC)
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    dateSelector.value = today;

    // Date arrow navigation
    const btnPrevDate = document.getElementById('btn-prev-date');
    const btnNextDate = document.getElementById('btn-next-date');

    function shiftDate(days) {
        const parts = dateSelector.value.split('-');
        const current = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        current.setDate(current.getDate() + days);
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        dateSelector.value = `${y}-${m}-${d}`;
        renderExpenses();
    }

    btnPrevDate.addEventListener('click', (e) => { e.preventDefault(); shiftDate(-1); });
    btnNextDate.addEventListener('click', (e) => { e.preventDefault(); shiftDate(1); });

    function renderTags() {
        tagsContainer.innerHTML = '';
        const tags = Store.getTags();
        
        tags.forEach(tag => {
            const tagEl = document.createElement('div');
            tagEl.className = 'tag';
            if (tag.id === selectedTagId) {
                tagEl.classList.add('selected');
            }
            tagEl.innerHTML = `${tag.icon} ${tag.name}`;
            
            tagEl.addEventListener('click', () => {
                if (selectedTagId === tag.id) {
                    // Deselect tag
                    selectedTagId = null;
                    newTagName.value = '';
                    newTagIcon.value = '';
                    btnAddTag.classList.remove('hidden');
                    btnUpdateTag.classList.add('hidden');
                    btnDeleteTag.classList.add('hidden');
                } else {
                    // Select tag
                    selectedTagId = tag.id;
                    newTagName.value = tag.name;
                    newTagIcon.value = tag.icon;
                    btnAddTag.classList.add('hidden');
                    btnUpdateTag.classList.remove('hidden');
                    btnDeleteTag.classList.remove('hidden');
                }
                renderTags(); // re-render to update selected visual
            });
            
            tagsContainer.appendChild(tagEl);
        });
    }

    let editingExpenseId = null;

    function renderExpenses() {
        const dateVal = dateSelector.value;
        const mode = viewMode.value;
        let expenses = [];

        if (mode === 'day') {
            expenses = Store.getExpensesByDate(dateVal);
            listTitle.textContent = `Expenses for ${dateVal}`;
        } else {
            const monthVal = dateVal.substring(0, 7);
            expenses = Store.getExpensesByMonth(monthVal);
            listTitle.textContent = `Expenses for ${monthVal}`;
        }

        const tags = Store.getTags();
        const tagMap = {};
        tags.forEach(t => tagMap[t.id] = t);

        expenseList.innerHTML = '';
        let total = 0;

        if (expenses.length === 0) {
            expenseList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem 0;">No expenses found.</p>';
            totalAmountElem.textContent = '0.00';
            return;
        }

        expenses.forEach(exp => {
            total += parseFloat(exp.amount);
            const tag = tagMap[exp.tagId] || { name: exp.tagName || 'Unknown', icon: exp.tagIcon || '❓' };
            
            const expEl = document.createElement('div');
            expEl.className = 'expense-item glass';
            expEl.style.marginBottom = '0.5rem';
            
            expEl.innerHTML = `
                <div class="expense-details">
                    <h4>${tag.icon} ${tag.name}</h4>
                    <p>${exp.desc || 'No description'} ${viewMode.value === 'month' ? `(${exp.date})` : ''}</p>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div class="expense-amount">${parseFloat(exp.amount).toFixed(2)}</div>
                    <div class="expense-actions" style="margin-top: 0;">
                        <button class="btn-icon edit" data-id="${exp.id}" title="Edit Expense">✎</button>
                        <button class="btn-icon delete" data-id="${exp.id}" title="Delete Expense">🗑️</button>
                    </div>
                </div>
            `;
            expenseList.appendChild(expEl);
        });

        totalAmountElem.textContent = total.toFixed(2);

        // Edit listeners
        document.querySelectorAll('.btn-icon.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const exp = Store.getExpenseById(id);
                if (!exp) return;

                editingExpenseId = id;
                expenseAmount.value = exp.amount;
                expenseDesc.value = exp.desc || '';
                if (exp.date) dateSelector.value = exp.date;

                selectedTagId = exp.tagId;
                renderTags();

                btnAddExpense.textContent = 'Save Changes ✎';
                btnAddExpense.style.background = 'var(--warning)';
                btnAddExpense.style.color = '#000';
            });
        });

        // Add delete listeners
        document.querySelectorAll('.btn-icon.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                Store.deleteExpense(id);
                if (editingExpenseId === id) {
                    resetExpenseForm();
                }
                renderExpenses();
            });
        });
    }

    function resetExpenseForm() {
        editingExpenseId = null;
        expenseAmount.value = '';
        expenseDesc.value = '';
        btnAddExpense.textContent = 'Add Expense';
        btnAddExpense.style.background = 'var(--accent-color)';
        btnAddExpense.style.color = '#fff';
    }

    // Event Listeners
    btnAddTag.addEventListener('click', () => {
        const name = newTagName.value.trim();
        const icon = newTagIcon.value.trim() || '🏷️';
        if (name) {
            const newTag = Store.addTag({ name, icon });
            newTagName.value = '';
            newTagIcon.value = '';
            selectedTagId = newTag.id;
            renderTags();
        }
    });

    btnUpdateTag.addEventListener('click', () => {
        const name = newTagName.value.trim();
        const icon = newTagIcon.value.trim() || '🏷️';
        if (name && selectedTagId) {
            Store.updateTag(selectedTagId, { name, icon });
            // Deselect
            selectedTagId = null;
            newTagName.value = '';
            newTagIcon.value = '';
            btnAddTag.classList.remove('hidden');
            btnUpdateTag.classList.add('hidden');
            btnDeleteTag.classList.add('hidden');
            renderTags();
            renderExpenses(); // update UI in case tag name changed
        }
    });

    btnDeleteTag.addEventListener('click', () => {
        if (selectedTagId) {
            if (confirm("Are you sure you want to delete this tag? Expenses with this tag will show as 'Unknown'.")) {
                Store.deleteTag(selectedTagId);
                selectedTagId = null;
                newTagName.value = '';
                newTagIcon.value = '';
                btnAddTag.classList.remove('hidden');
                btnUpdateTag.classList.add('hidden');
                btnDeleteTag.classList.add('hidden');
                renderTags();
                renderExpenses();
            }
        }
    });

    btnAddExpense.addEventListener('click', () => {
        const amount = expenseAmount.value.trim();
        const desc = expenseDesc.value.trim();
        const date = dateSelector.value;

        if (!amount || !selectedTagId) {
            alert('Please select a tag and enter an amount.');
            return;
        }

        // Resolve tag name and icon for self-contained storage
        const tags = Store.getTags();
        const selectedTag = tags.find(t => t.id === selectedTagId) || { name: 'Unknown', icon: '❓' };

        if (editingExpenseId) {
            Store.updateExpense(editingExpenseId, {
                tagId: selectedTagId,
                tagName: selectedTag.name,
                tagIcon: selectedTag.icon,
                desc: desc,
                amount: parseFloat(amount),
                date: date
            });
            resetExpenseForm();
        } else {
            Store.saveExpense({
                tagId: selectedTagId,
                tagName: selectedTag.name,
                tagIcon: selectedTag.icon,
                desc: desc,
                amount: parseFloat(amount),
                date: date
            });
            expenseAmount.value = '';
            expenseDesc.value = '';
        }

        renderExpenses();
    });

    dateSelector.addEventListener('change', renderExpenses);
    viewMode.addEventListener('change', renderExpenses);

    // Initial render & repair
    Store.repairCorruptedTags();
    renderTags();
    renderExpenses();

    // Backup Banner Logic
    const backupBanner = document.getElementById('backup-banner');
    const btnBannerBackup = document.getElementById('btn-banner-backup');
    const btnBannerDismiss = document.getElementById('btn-banner-dismiss');

    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    if (Date.now() - Store.getLastBackupTime() > THREE_DAYS_MS) {
        backupBanner.style.display = 'flex';
    }

    btnBannerDismiss.addEventListener('click', () => {
        backupBanner.style.display = 'none';
    });

    btnBannerBackup.addEventListener('click', () => {
        const data = Store.getExportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BT_Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        Store.updateLastBackupTime();
        backupBanner.style.display = 'none';
    });

    const btnBannerImport = document.getElementById('btn-banner-import');
    Store.setupImportHandler({
        triggerBtn: btnBannerImport,
        fileInput: document.getElementById('json-file-input'),
        modal: document.getElementById('import-modal'),
        descEl: document.getElementById('modal-overlap-desc'),
        btnBoth: document.getElementById('btn-merge-both'),
        btnJson: document.getElementById('btn-merge-json'),
        btnLocal: document.getElementById('btn-merge-local'),
        btnReplaceAll: document.getElementById('btn-replace-all'),
        btnCancel: document.getElementById('btn-cancel-import'),
        onComplete: () => {
            renderTags();
            renderExpenses();
            if (backupBanner) backupBanner.style.display = 'none';
        }
    });
});
