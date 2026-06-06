// Home Page Logic

document.addEventListener('DOMContentLoaded', () => {
    const dateSelector = document.getElementById('date-selector');
    const tagsContainer = document.getElementById('tags-container');
    const newTagName = document.getElementById('new-tag-name');
    const newTagIcon = document.getElementById('new-tag-icon');
    const btnAddTag = document.getElementById('btn-add-tag');
    
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
                selectedTagId = tag.id;
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
                <div style="text-align: right;">
                    <div class="expense-amount">${parseFloat(exp.amount).toFixed(2)}</div>
                    <div class="expense-actions">
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
});
