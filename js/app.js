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

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    dateSelector.value = today;

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
                    btnAddTag.style.display = 'block';
                    btnUpdateTag.style.display = 'none';
                    btnDeleteTag.style.display = 'none';
                } else {
                    // Select tag
                    selectedTagId = tag.id;
                    newTagName.value = tag.name;
                    newTagIcon.value = tag.icon;
                    btnAddTag.style.display = 'none';
                    btnUpdateTag.style.display = 'block';
                    btnDeleteTag.style.display = 'block';
                }
                renderTags(); // re-render to update selected visual
            });
            
            tagsContainer.appendChild(tagEl);
        });
    }

    function renderExpenses() {
        expenseList.innerHTML = '';
        let expenses = [];
        let total = 0;
        const tags = Store.getTags();
        const tagMap = {};
        tags.forEach(t => tagMap[t.id] = t);

        if (viewMode.value === 'day') {
            expenses = Store.getExpensesByDate(dateSelector.value);
            listTitle.textContent = `Expenses for ${dateSelector.value}`;
        } else {
            const monthStr = dateSelector.value.substring(0, 7); // YYYY-MM
            expenses = Store.getExpensesByMonth(monthStr);
            listTitle.textContent = `Expenses for ${monthStr}`;
        }

        if (expenses.length === 0) {
            expenseList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem 0;">No expenses found.</p>';
            totalAmountElem.textContent = '0.00';
            return;
        }

        expenses.forEach(exp => {
            total += parseFloat(exp.amount);
            const tag = tagMap[exp.tagId] || { name: 'Unknown', icon: '❓' };
            
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
                        <button class="btn-icon delete" data-id="${exp.id}" title="Delete">🗑️</button>
                    </div>
                </div>
            `;
            expenseList.appendChild(expEl);
        });

        totalAmountElem.textContent = total.toFixed(2);

        // Add delete listeners
        document.querySelectorAll('.btn-icon.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                Store.deleteExpense(id);
                renderExpenses();
            });
        });
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
            btnAddTag.style.display = 'block';
            btnUpdateTag.style.display = 'none';
            btnDeleteTag.style.display = 'none';
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
                btnAddTag.style.display = 'block';
                btnUpdateTag.style.display = 'none';
                btnDeleteTag.style.display = 'none';
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

        Store.saveExpense({
            tagId: selectedTagId,
            desc: desc,
            amount: parseFloat(amount),
            date: date
        });

        // Reset form
        expenseAmount.value = '';
        expenseDesc.value = '';
        
        renderExpenses();
    });

    dateSelector.addEventListener('change', renderExpenses);
    viewMode.addEventListener('change', renderExpenses);

    // Initial render
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
        const data = {
            expenses: Store.getExpenses(),
            tags: Store.getTags(),
            budgets: Store.getBudgets()
        };
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
});
