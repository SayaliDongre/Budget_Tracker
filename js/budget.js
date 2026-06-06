// Budget Page Logic

document.addEventListener('DOMContentLoaded', () => {
    const monthSelector = document.getElementById('month-selector');
    const overallBudgetInput = document.getElementById('overall-budget');
    const categoryBudgetsContainer = document.getElementById('category-budgets-container');
    const btnSaveBudget = document.getElementById('btn-save-budget');

    const overallText = document.getElementById('overall-text');
    const overallProgress = document.getElementById('overall-progress');
    const overallMsg = document.getElementById('overall-msg');
    const categoryStatusContainer = document.getElementById('category-status-container');

    // Set default month
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    monthSelector.value = currentMonth;

    function renderBudgetForm() {
        const month = monthSelector.value;
        const allBudgets = Store.getBudgets();
        const monthBudget = allBudgets[month] || { overall: '', tags: {} };
        const tags = Store.getTags();

        overallBudgetInput.value = monthBudget.overall || '';
        categoryBudgetsContainer.innerHTML = '';

        tags.forEach(tag => {
            const val = monthBudget.tags[tag.id] || '';
            const div = document.createElement('div');
            div.className = 'form-group';
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.gap = '1rem';
            div.style.marginBottom = '0.8rem';
            
            div.innerHTML = `
                <label style="margin: 0; width: 150px;">${tag.icon} ${tag.name}</label>
                <input type="number" class="cat-budget-input" data-id="${tag.id}" value="${val}" placeholder="0.00" min="0" style="flex: 1;">
            `;
            categoryBudgetsContainer.appendChild(div);
        });
    }

    function renderStatus() {
        const month = monthSelector.value;
        const allBudgets = Store.getBudgets();
        const monthBudget = allBudgets[month] || { overall: 0, tags: {} };
        const expenses = Store.getExpensesByMonth(month);
        const tags = Store.getTags();

        let totalSpent = 0;
        const spentPerTag = {};
        
        expenses.forEach(exp => {
            totalSpent += parseFloat(exp.amount);
            spentPerTag[exp.tagId] = (spentPerTag[exp.tagId] || 0) + parseFloat(exp.amount);
        });

        // Overall Status
        const overallTarget = parseFloat(monthBudget.overall) || 0;
        overallText.textContent = `₹${totalSpent.toFixed(2)} / ₹${overallTarget > 0 ? overallTarget.toFixed(2) : 'No Limit'}`;
        
        if (overallTarget > 0) {
            let pct = (totalSpent / overallTarget) * 100;
            let displayPct = Math.min(pct, 100);
            overallProgress.style.width = `${displayPct}%`;
            
            if (pct >= 100) {
                overallProgress.style.background = 'var(--danger)';
                overallMsg.innerHTML = `<span style="color: var(--danger)">Over budget by ₹${(totalSpent - overallTarget).toFixed(2)}</span>`;
            } else if (pct >= 80) {
                overallProgress.style.background = 'var(--warning)';
                overallMsg.innerHTML = `<span style="color: var(--warning)">Approaching limit! ₹${(overallTarget - totalSpent).toFixed(2)} remaining.</span>`;
            } else {
                overallProgress.style.background = 'var(--success)';
                overallMsg.innerHTML = `<span style="color: var(--success)">Looking good. ₹${(overallTarget - totalSpent).toFixed(2)} remaining.</span>`;
            }
        } else {
            overallProgress.style.width = '0%';
            overallProgress.style.background = 'var(--success)';
            overallMsg.textContent = 'Set an overall budget to track progress.';
        }

        // Category Status
        categoryStatusContainer.innerHTML = '';
        tags.forEach(tag => {
            const target = parseFloat(monthBudget.tags[tag.id]) || 0;
            if (target > 0) {
                const spent = spentPerTag[tag.id] || 0;
                let pct = (spent / target) * 100;
                let displayPct = Math.min(pct, 100);
                let color = pct >= 100 ? 'var(--danger)' : (pct >= 80 ? 'var(--warning)' : 'var(--success)');

                const div = document.createElement('div');
                div.style.marginBottom = '1.2rem';
                div.innerHTML = `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem; font-size: 0.9rem;">
                        <span>${tag.icon} ${tag.name}</span>
                        <span>₹${spent.toFixed(2)} / ₹${target.toFixed(2)}</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                        <div style="height: 100%; width: ${displayPct}%; background: ${color}; transition: width 0.5s;"></div>
                    </div>
                `;
                categoryStatusContainer.appendChild(div);
            }
        });

        if (categoryStatusContainer.innerHTML === '') {
            categoryStatusContainer.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">No category budgets set for this month.</p>';
        }
    }

    btnSaveBudget.addEventListener('click', () => {
        const month = monthSelector.value;
        const overall = overallBudgetInput.value;
        const tagInputs = document.querySelectorAll('.cat-budget-input');
        
        const tagsData = {};
        tagInputs.forEach(input => {
            if (input.value.trim() !== '') {
                tagsData[input.getAttribute('data-id')] = input.value;
            }
        });

        Store.saveBudget(month, { overall, tags: tagsData });
        
        // Show saved animation on button
        const originalText = btnSaveBudget.textContent;
        btnSaveBudget.textContent = 'Saved! ✓';
        btnSaveBudget.style.background = 'var(--success)';
        
        setTimeout(() => {
            btnSaveBudget.textContent = originalText;
            btnSaveBudget.style.background = 'var(--accent-color)';
        }, 2000);

        renderStatus();
    });

    monthSelector.addEventListener('change', () => {
        renderBudgetForm();
        renderStatus();
    });

    // Initial render
    renderBudgetForm();
    renderStatus();
});
