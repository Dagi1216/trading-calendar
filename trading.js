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


    let currentDate = new Date(2025, 11, 1); // Start at Dec 2025

    // Function to save trades to localStorage
    function saveTrades() {
        localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(sampleTrades));
    }

    function deleteTrade(tradeId) {
        // Find the trade to remove
        const tradeToDelete = sampleTrades.find(trade => trade.id === tradeId);
        if (!tradeToDelete) return;

        // Filter the array to exclude the trade
        sampleTrades = sampleTrades.filter(trade => trade.id !== tradeId);
        saveTrades(); // Save the updated array
        renderCalendar();
        updateWeeklySummary();
        renderRecentTrades();
    }

    function renderRecentTrades() {
        recentTradesList.innerHTML = ''; // Clear the list
        if (sampleTrades.length === 0) {
            recentTradesList.innerHTML = '<p>No trades yet. Add one using the form above!</p>';
            return;
        }
        // Display trades, newest first
        [...sampleTrades].reverse().forEach(trade => {
            const tradeEl = document.createElement('div');
            tradeEl.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #334155;`;
            const profitColor = trade.profit >= 0 ? '#4ade80' : '#f87171';
            tradeEl.innerHTML = `
                <div>${trade.date} - ${trade.type}</div>
                <div><span style="color: ${profitColor}; font-weight: bold;">$${trade.profit.toFixed(2)}</span>
                <button class="delete-trade-btn" data-id="${trade.id}">X</button></div>
            `;
            recentTradesList.appendChild(tradeEl);
        });
    }

    function updateWeeklySummary() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // 1. Filter trades for the currently displayed month
        const tradesThisMonth = sampleTrades.filter(trade => {
            const tradeDate = new Date(trade.date + 'T00:00:00'); // Use T00:00:00 to avoid timezone issues
            return tradeDate.getFullYear() === year && tradeDate.getMonth() === month;
        });

        // 2. Initialize totals for up to 5 weeks in a month
        const weeklyTotals = [0, 0, 0, 0,]; // Weeks 1-4

        // 3. Calculate totals for each week
        tradesThisMonth.forEach(trade => {
            const dayOfMonth = new Date(trade.date + 'T00:00:00').getDate();
            const weekIndex = Math.floor((dayOfMonth - 1) / 7);
            weeklyTotals[weekIndex] += trade.profit;
        });

        // 4. Update the DOM
        weekAmountSpans.forEach((span, index) => {
            if (weeklyTotals[index] !== undefined) {
                const total = weeklyTotals[index];
                span.textContent = `$${total.toFixed(2)}`;
                span.style.color = total >= 0 ? '#4ade80' : '#f87171';
            } else {
                span.textContent = '$0.00';
                span.style.color = '#4ade80';
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
            const tradesOnDay = sampleTrades.filter(trade => trade.date === dateString);

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

    function showDayDetails(day) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const tradesOnDay = sampleTrades.filter(trade => trade.date === dateString);

        modalTitle.textContent = `Trades for ${dateString}`;
        // Pre-fill the date in the form and make it readonly
        document.getElementById('trade-date').value = dateString;

        modalBody.innerHTML = ''; // Clear previous details

        if (tradesOnDay.length === 0) {
            modalBody.innerHTML = '<p>No trades recorded for this day.</p>';
        } else {
            tradesOnDay.forEach(trade => {
                const item = document.createElement('div');
                item.classList.add('modal-trade-item');
                const profitColor = trade.profit >= 0 ? '#4ade80' : '#f87171';
                item.innerHTML = `
                    <span>${trade.type}</span>
                    <span style="color: ${profitColor}; font-weight: bold;">$${trade.profit.toFixed(2)}</span>
                    <button class="delete-trade-btn" data-id="${trade.id}">X</button>
                `;
                modalBody.appendChild(item);
            });
        }

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

    modalBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-trade-btn')) {
            const tradeId = parseInt(e.target.getAttribute('data-id'));
            deleteTrade(tradeId);
            modal.style.display = 'none'; // Close modal after deleting
        }
    });

    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
        updateWeeklySummary();
        renderRecentTrades();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
        updateWeeklySummary();
        renderRecentTrades();
    });

    recentTradesList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-trade-btn')) {
            const tradeId = parseInt(e.target.getAttribute('data-id'));
            deleteTrade(tradeId);
        }
    });


    addTradeForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent page reload

        const date = document.getElementById('trade-date').value;
        const type = document.getElementById('trade-type').value;
        const profit = parseFloat(document.getElementById('trade-profit').value);

        if (!date || isNaN(profit)) {
            alert('Please fill out all fields correctly.');
            return;
        }

        const newTrade = {
            id: Date.now(), // Use timestamp for a more unique ID
            date: date,
            type: type,
            profit: profit,
            status: profit >= 0 ? 'Win' : 'Loss'
        };

        sampleTrades.push(newTrade);
        saveTrades(); // Save the updated array
        renderCalendar(); // Update calendar to show new trade
        updateWeeklySummary();
        renderRecentTrades(); // Update the recent trades list
        document.getElementById('trade-profit').value = ''; // Only clear the profit field
        modal.style.display = 'none'; // Close the modal after adding
    });

    // Initial render of the calendar
    renderCalendar();
    updateWeeklySummary();
    renderRecentTrades();
});
