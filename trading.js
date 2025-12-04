document.addEventListener('DOMContentLoaded', function() {
    // --- Existing Trading Logic ---
 
    const TRADES_STORAGE_KEY = 'trading_dashboard_trades';

    // Function to load trades from localStorage
    function loadTrades() {
        const tradesJSON = localStorage.getItem(TRADES_STORAGE_KEY);
        return tradesJSON ? JSON.parse(tradesJSON) : [];
    }

    // --- New Calendar Logic ---
    // Load trades from localStorage on startup
    let sampleTrades = loadTrades();

    const calendarTitle = document.getElementById('calendar-title');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const addTradeForm = document.getElementById('add-trade-form');
    const recentTradesList = document.getElementById('recent-trades-list');
    const modal = document.getElementById('day-details-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const weekAmountSpans = document.querySelectorAll('.week-box .week-amount');
    let performanceChart = null; // To hold the chart instance
    let cumulativeProfitChart = null; // To hold the line chart instance
    let tradeFilter = 'all'; // 'all', 'Long', or 'Short'
    
    // State for modal pagination
    const MODAL_TRADES_PER_PAGE = 5;
    let modalTrades = [];
    let modalCurrentPage = 1;



    let currentDate = new Date(2025, 11, 1); // Start at Dec 2025

    // Function to save trades to localStorage
    function saveTrades() {
        localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(sampleTrades));
    }

    // A helper function to get trades based on the current filter
    function getFilteredTrades() {
        if (tradeFilter === 'all') {
            return sampleTrades;
        }
        return sampleTrades.filter(trade => trade.type === tradeFilter);
    }

    function rerenderAll() {
        renderCalendar();
        updateWeeklySummary();
        updatePerformanceChart();
        updateCumulativeProfitChart();
        renderRecentTrades();
    }

    function deleteTrade(tradeId) {
        // Find the trade to remove
        if (!getFilteredTrades().find(trade => trade.id === tradeId)) return;
        sampleTrades = sampleTrades.filter(trade => trade.id !== tradeId);
        saveTrades(); // Save the updated array
        rerenderAll();
    }

    function renderRecentTrades() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Filter trades for the currently displayed month
        const tradesThisMonth = getFilteredTrades().filter(trade => {
            const tradeDate = new Date(trade.date + 'T00:00:00');
            return tradeDate.getFullYear() === year && tradeDate.getMonth() === month;
        });

        recentTradesList.innerHTML = ''; // Clear the list
        if (tradesThisMonth.length === 0) {
            recentTradesList.innerHTML = '<p>No trades for this month.</p>';
            return;
        }

        // Sort trades by date descending (newest first)
        tradesThisMonth.sort((a, b) => new Date(b.date) - new Date(a.date));

        tradesThisMonth.forEach(trade => {
            const tradeEl = document.createElement('div');
            tradeEl.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #334155; min-height: 40px;`;
            const profitColor = trade.profit >= 0 ? '#4ade80' : '#f87171';
            // Robust check for entry price display
            const entryPrice = (trade.entry !== undefined && trade.entry !== null && !isNaN(trade.entry)) ? `@ ${trade.entry}` : '';
            tradeEl.innerHTML = `
                <div>${trade.date} - ${trade.type} (${trade.lotSize || 'N/A'}) ${entryPrice}</div>
                <div>
                    <span style="color: ${profitColor}; font-weight: bold;">$${trade.profit.toFixed(2)}</span>
                    <button class="delete-trade-btn" data-id="${trade.id}">X</button>
                </div>
            `;
            recentTradesList.appendChild(tradeEl);
        });
    }

    function updateWeeklySummary() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Filter trades for the currently displayed month
        const tradesThisMonth = getFilteredTrades().filter(trade => {
            const tradeDate = new Date(trade.date + 'T00:00:00'); // Use T00:00:00 to avoid timezone issues
            return tradeDate.getFullYear() === year && tradeDate.getMonth() === month;
        });

        // Initialize totals for up to 5 weeks in a month
        const weeklyTotals = [0, 0, 0, 0, 0];

        // Calculate totals for each week
        tradesThisMonth.forEach(trade => {
            const dayOfMonth = new Date(trade.date + 'T00:00:00').getDate();
            const weekIndex = Math.floor((dayOfMonth - 1) / 7);
            if (weeklyTotals[weekIndex] !== undefined) {
                weeklyTotals[weekIndex] += trade.profit;
            }
        });

        // Update the DOM
        weekAmountSpans.forEach((span, index) => {
            if (weeklyTotals[index] !== undefined) {
                const total = weeklyTotals[index];
                span.textContent = `$${total.toFixed(2)}`;
                span.style.color = total >= 0 ? '#4ade80' : '#f87171';
            }
        });
    }

    function updateCumulativeProfitChart() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const tradesThisMonth = getFilteredTrades().filter(trade => {
            const tradeDate = new Date(trade.date + 'T00:00:00');
            return tradeDate.getFullYear() === year && tradeDate.getMonth() === month;
        });

        // Sort trades by date to calculate cumulative profit correctly
        tradesThisMonth.sort((a, b) => new Date(a.date) - new Date(b.date));

        let cumulativeProfit = 0;
        const chartData = [];
        const chartLabels = [];

        tradesThisMonth.forEach(trade => {
            cumulativeProfit += trade.profit;
            chartLabels.push(trade.date);
            chartData.push(cumulativeProfit.toFixed(2));
        });

        const ctx = document.getElementById('cumulative-profit-chart').getContext('2d');

        if (cumulativeProfitChart) {
            cumulativeProfitChart.destroy();
        }

        cumulativeProfitChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Cumulative Profit',
                    data: chartData,
                    borderColor: '#3b82f6', // Blue line
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: { color: '#94a3b8' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    function updatePerformanceChart() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Filter trades for the currently displayed month
        const tradesThisMonth = getFilteredTrades().filter(trade => {
            const tradeDate = new Date(trade.date + 'T00:00:00');
            return tradeDate.getFullYear() === year && tradeDate.getMonth() === month;
        });

        const wins = tradesThisMonth.filter(t => t.status === 'Win').length;
        const losses = tradesThisMonth.filter(t => t.status === 'Loss').length;
        const totalTrades = tradesThisMonth.length;
        const totalProfit = tradesThisMonth.reduce((sum, trade) => sum + trade.profit, 0);
        
        const allWins = tradesThisMonth.filter(t => t.profit > 0).map(t => t.profit);
        const allLosses = tradesThisMonth.filter(t => t.profit < 0).map(t => t.profit);

        const biggestWin = allWins.length > 0 ? Math.max(...allWins) : 0;
        const biggestLoss = allLosses.length > 0 ? Math.min(...allLosses) : 0;

        const grossProfit = allWins.reduce((sum, profit) => sum + profit, 0);
        const grossLoss = Math.abs(allLosses.reduce((sum, loss) => sum + loss, 0));

        // Update KPI text
        const totalProfitEl = document.getElementById('total-profit');
        totalProfitEl.textContent = `$${totalProfit.toFixed(2)}`;
        totalProfitEl.style.color = totalProfit >= 0 ? '#4ade80' : '#f87171';

        const winRateEl = document.getElementById('win-rate');
        if (totalTrades > 0) {
            const winRate = (wins / totalTrades) * 100;
            winRateEl.textContent = `${winRate.toFixed(0)}%`; // Display as percentage
        } else {
            winRateEl.textContent = 'N/A';
        }

        const profitFactorEl = document.getElementById('profit-factor');
        if (grossLoss > 0) {
            const profitFactor = grossProfit / grossLoss;
            profitFactorEl.textContent = profitFactor.toFixed(2);
        } else if (grossProfit > 0 && grossLoss === 0) {
            profitFactorEl.textContent = '∞'; // Infinite profit factor
        } else {
            profitFactorEl.textContent = 'N/A';
        }

        const biggestWinEl = document.getElementById('biggest-win');
        biggestWinEl.textContent = `$${biggestWin.toFixed(2)}`;

        const biggestLossEl = document.getElementById('biggest-loss');
        biggestLossEl.textContent = `$${biggestLoss.toFixed(2)}`;

        // Update Chart
        const ctx = document.getElementById('performance-chart').getContext('2d');

        if (performanceChart) {
            performanceChart.destroy(); // Destroy the old chart instance before creating a new one
        }

        performanceChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Wins', 'Losses'],
                datasets: [{
                    label: 'Trade Outcomes',
                    data: [wins, losses],
                    backgroundColor: [
                        '#10b981', // Green for wins
                        '#ef4444'  // Red for losses
                    ],
                    borderColor: '#1e293b',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#fff'
                        }
                    }
                }
            }
        });
    }

    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        calendarTitle.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${year}`;
        calendarGrid.innerHTML = ''; // Clear previous days

        const dayOfWeek = new Date(year, month, 1).getDay(); // getDay() returns 0 for Sun, 1 for Mon, etc.
        // Adjust to make Monday the first day (0) and Sunday the last (6)
        const firstDayOfMonth = (dayOfWeek === 0) ? 6 : dayOfWeek - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Add empty cells for days before the 1st of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('day', 'empty');
            calendarGrid.appendChild(emptyCell);
        }

        // Add day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('day');
            dayCell.dataset.day = day; // Add data attribute for the day
            dayCell.textContent = day;

            // Check if the day is a Saturday (6) or Sunday (0)
            const dayDate = new Date(year, month, day);
            const dayOfWeekValue = dayDate.getDay();
            if (dayOfWeekValue === 0 || dayOfWeekValue === 6) {
                dayCell.classList.add('no-trade');
            }

            // Check if there's a trade on this day
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const tradesOnDay = getFilteredTrades().filter(trade => trade.date === dateString);

            if (tradesOnDay.length > 0) {
                const totalProfit = tradesOnDay.reduce((sum, trade) => sum + trade.profit, 0);
                if (totalProfit >= 0) {
                    dayCell.classList.add('has-trade'); // Green background for profit
                } else {
                    dayCell.classList.add('has-loss'); // Red background for loss
                }
                

                const profitEl = document.createElement('div');
                profitEl.classList.add('day-profit');
                profitEl.textContent = `$${totalProfit.toFixed(2)}`;

                if (totalProfit >= 0) {
                    profitEl.classList.add('win');
                } else {
                    profitEl.classList.add('loss');
                }
                dayCell.appendChild(profitEl);
            }


            calendarGrid.appendChild(dayCell);
        }
    }

    function renderModalTradesPage() {
        modalBody.innerHTML = ''; // Clear previous details
        const paginationControls = document.getElementById('modal-pagination-controls');
        const pageIndicator = document.getElementById('modal-page-indicator');
        const prevBtn = document.getElementById('modal-prev-btn');
        const nextBtn = document.getElementById('modal-next-btn');

        const totalPages = Math.ceil(modalTrades.length / MODAL_TRADES_PER_PAGE);

        if (totalPages <= 1) {
            paginationControls.style.display = 'none';
        } else {
            paginationControls.style.display = 'flex';
            pageIndicator.textContent = `Page ${modalCurrentPage} of ${totalPages}`;
            prevBtn.disabled = modalCurrentPage === 1;
            nextBtn.disabled = modalCurrentPage === totalPages;
        }

        if (modalTrades.length === 0) {
            modalBody.innerHTML = '<p>No trades recorded for this day.</p>';
            return;
        }

        const startIndex = (modalCurrentPage - 1) * MODAL_TRADES_PER_PAGE;
        const endIndex = startIndex + MODAL_TRADES_PER_PAGE;
        const tradesToShow = modalTrades.slice(startIndex, endIndex);

        tradesToShow.forEach(trade => {
            const item = document.createElement('div');
            item.classList.add('modal-trade-item');
            const profitColor = trade.profit >= 0 ? '#4ade80' : '#f87171';
            const displayEntry = (trade.entry !== undefined && trade.entry !== null && !isNaN(trade.entry)) ? `@ ${trade.entry}` : '';
            item.innerHTML = `
                <span>${trade.type} (${trade.lotSize || 'N/A'} lots) ${displayEntry}</span>
                <span style="color: ${profitColor}; font-weight: bold;">$${trade.profit.toFixed(2)}</span>
                <button class="delete-trade-btn" data-id="${trade.id}">X</button>
            `;
            modalBody.appendChild(item);
        });
    }

    function showDayDetails(day) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Set up state for pagination
        modalTrades = getFilteredTrades().filter(trade => trade.date === dateString);
        modalCurrentPage = 1;
        
        modalTitle.textContent = `Trades for ${dateString}`;
        // Pre-fill the date in the form and make it readonly
        document.getElementById('trade-date').value = dateString;

        renderModalTradesPage();
        modal.style.display = 'flex';
    }

    // --- Event Listeners ---

    calendarGrid.addEventListener('click', (e) => {
        const dayCell = e.target.closest('.day');
        if (dayCell && !dayCell.classList.contains('empty')) {
            const day = dayCell.dataset.day;
            showDayDetails(day);
        }
    });

    modalCloseBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    document.getElementById('modal-prev-btn').addEventListener('click', () => {
        if (modalCurrentPage > 1) {
            modalCurrentPage--;
            renderModalTradesPage();
        }
    });

    document.getElementById('modal-next-btn').addEventListener('click', () => {
        const totalPages = Math.ceil(modalTrades.length / MODAL_TRADES_PER_PAGE);
        if (modalCurrentPage < totalPages) {
            modalCurrentPage++;
            renderModalTradesPage();
        }
    });

    modalBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-trade-btn')) {
            const tradeId = parseInt(e.target.getAttribute('data-id'));
            deleteTrade(tradeId);
            modal.style.display = 'none'; // Close modal after deleting
        }
    });

    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        rerenderAll();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        rerenderAll();
    });

    const tradeFilters = document.getElementById('trade-filters');
    tradeFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            tradeFilter = e.target.dataset.filter;
            rerenderAll();
        } else if (e.target.classList.contains('delete-trade-btn')) {
            const tradeId = parseInt(e.target.getAttribute('data-id'));
            deleteTrade(tradeId);
        }
    });


    addTradeForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent page reload

        const date = document.getElementById('trade-date').value;
        const type = document.getElementById('trade-type').value;
        const profit = parseFloat(document.getElementById('trade-profit').value);
        const lotSize = parseFloat(document.getElementById('trade-lotsize').value);
        
        // Store null if entry price is empty, otherwise parse it
        const entryValue = document.getElementById('trade-price').value;
        const entry = entryValue ? parseFloat(entryValue) : null;

        // Validate inputs
        if (!date || isNaN(profit)) {
            alert('Please fill out all fields correctly.');
            return;
        }

        const newTrade = {
            id: Date.now(), // Use timestamp for a more unique ID
            // Ensure entry is null if it's NaN after parsing an empty string
            // This makes the data cleaner and easier to work with
            entry: (entry !== null && isNaN(entry)) ? null : entry,

            date: date,
            type: type,
            profit: profit,
            lotSize: lotSize,
            entry: entry,
            status: profit >= 0 ? 'Win' : 'Loss'
        };

        sampleTrades.push(newTrade);
        saveTrades(); // Save the updated array
        rerenderAll(); // Re-render all components with the new data
        document.getElementById('trade-profit').value = ''; // Only clear the profit field
        document.getElementById('trade-lotsize').value = '';
        document.getElementById('trade-price').value = '';
        modal.style.display = 'none'; // Close the modal after adding
    });

    // Initial render of all components
    rerenderAll();
});



