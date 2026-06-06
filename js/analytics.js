// Analytics Logic

document.addEventListener('DOMContentLoaded', () => {
    const monthSelector = document.getElementById('month-selector');
    const insightsContainer = document.getElementById('insights-container');
    
    // Setup Chart Defaults for dark mode glass theme
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Outfit', sans-serif";

    let sectorChartInstance = null;
    let monthlyChartInstance = null;

    // Set default month
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    monthSelector.value = currentMonth;

    function renderCharts() {
        const selectedMonth = monthSelector.value;
        const expenses = Store.getExpenses();
        const tags = Store.getTags();
        const tagMap = {};
        tags.forEach(t => tagMap[t.id] = t);

        // 1. Sector Breakdown Data
        const currentMonthExpenses = expenses.filter(e => e.date.startsWith(selectedMonth));
        const sectorTotals = {};
        
        currentMonthExpenses.forEach(exp => {
            sectorTotals[exp.tagId] = (sectorTotals[exp.tagId] || 0) + parseFloat(exp.amount);
        });

        const sectorLabels = Object.keys(sectorTotals).map(tagId => tagMap[tagId] ? tagMap[tagId].name : 'Unknown');
        const sectorData = Object.values(sectorTotals);

        // Render Sector Chart
        const ctxSector = document.getElementById('sectorChart').getContext('2d');
        if (sectorChartInstance) sectorChartInstance.destroy();
        
        sectorChartInstance = new Chart(ctxSector, {
            type: 'doughnut',
            data: {
                labels: sectorLabels,
                datasets: [{
                    data: sectorData,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#8DFA70', '#E056FD', '#F9CA24'
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        // 2. Monthly Comparison Data (Last 6 months)
        const monthlyTotals = {};
        // Get last 6 months keys
        const monthKeys = [];
        for(let i=5; i>=0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }

        monthKeys.forEach(mk => monthlyTotals[mk] = 0);

        expenses.forEach(exp => {
            const m = exp.date.substring(0, 7);
            if (monthlyTotals[m] !== undefined) {
                monthlyTotals[m] += parseFloat(exp.amount);
            }
        });

        const monthLabels = monthKeys.map(mk => {
            const d = new Date(mk + '-01');
            return d.toLocaleString('default', { month: 'short' });
        });
        const monthData = monthKeys.map(mk => monthlyTotals[mk]);

        // Render Monthly Chart
        const ctxMonthly = document.getElementById('monthlyChart').getContext('2d');
        if (monthlyChartInstance) monthlyChartInstance.destroy();

        monthlyChartInstance = new Chart(ctxMonthly, {
            type: 'bar',
            data: {
                labels: monthLabels,
                datasets: [{
                    label: 'Total Expenses',
                    data: monthData,
                    backgroundColor: '#6366f1',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });

        // 3. Generate Insights
        insightsContainer.innerHTML = '';
        
        const totalSpentCurrent = monthData[monthData.length - 1];
        const totalSpentPrevious = monthData[monthData.length - 2] || 0;
        
        // Insight 1: Total vs Last Month
        let diffText = 'Same as last month';
        if (totalSpentCurrent > totalSpentPrevious && totalSpentPrevious > 0) {
            const pct = Math.round(((totalSpentCurrent - totalSpentPrevious) / totalSpentPrevious) * 100);
            diffText = `<span style="color: var(--danger)">+${pct}%</span> vs last month`;
        } else if (totalSpentCurrent < totalSpentPrevious && totalSpentPrevious > 0) {
            const pct = Math.round(((totalSpentPrevious - totalSpentCurrent) / totalSpentPrevious) * 100);
            diffText = `<span style="color: var(--success)">-${pct}%</span> vs last month`;
        }

        const insight1 = document.createElement('div');
        insight1.className = 'glass p-3';
        insight1.style.padding = '1rem';
        insight1.style.borderRadius = '8px';
        insight1.innerHTML = `
            <h4 style="color: var(--text-secondary); margin-bottom: 0.5rem;">Total Spent</h4>
            <div style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">₹${totalSpentCurrent.toFixed(2)}</div>
            <div style="font-size: 0.85rem;">${diffText}</div>
        `;
        insightsContainer.appendChild(insight1);

        // Insight 2: Top Sector
        let topSector = 'None';
        let topAmount = 0;
        for (const [tagId, amount] of Object.entries(sectorTotals)) {
            if (amount > topAmount) {
                topAmount = amount;
                topSector = tagMap[tagId] ? tagMap[tagId].name : 'Unknown';
            }
        }

        const insight2 = document.createElement('div');
        insight2.className = 'glass';
        insight2.style.padding = '1rem';
        insight2.style.borderRadius = '8px';
        insight2.innerHTML = `
            <h4 style="color: var(--text-secondary); margin-bottom: 0.5rem;">Top Category</h4>
            <div style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">${topSector}</div>
            <div style="font-size: 0.85rem; color: var(--warning);">₹${topAmount.toFixed(2)} spent</div>
        `;
        insightsContainer.appendChild(insight2);
        
        // Insight 3: Daily Average
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const dailyAvg = totalSpentCurrent / daysInMonth;

        const insight3 = document.createElement('div');
        insight3.className = 'glass';
        insight3.style.padding = '1rem';
        insight3.style.borderRadius = '8px';
        insight3.innerHTML = `
            <h4 style="color: var(--text-secondary); margin-bottom: 0.5rem;">Daily Average</h4>
            <div style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">₹${dailyAvg.toFixed(2)}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">Projected average</div>
        `;
        insightsContainer.appendChild(insight3);
    }

    monthSelector.addEventListener('change', renderCharts);

    // Initial render
    renderCharts();
});
