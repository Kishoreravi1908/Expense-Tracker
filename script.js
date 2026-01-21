document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const amountInput = document.getElementById('amount');
    const categorySelect = document.getElementById('category');
    const dateInput = document.getElementById('date');
    const descriptionInput = document.getElementById('description');
    const addExpenseBtn = document.getElementById('addExpense');
    const budgetCategorySelect = document.getElementById('budgetCategory');
    const budgetAmountInput = document.getElementById('budgetAmount');
    const setBudgetBtn = document.getElementById('setBudget');
    const totalSpentElement = document.getElementById('totalSpent');
    const remainingBudgetElement = document.getElementById('remainingBudget');
    const expenseTableBody = document.getElementById('expenseTableBody');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const expenseChartCtx = document.getElementById('expenseChart').getContext('2d');

    // Set today's date as default
    dateInput.valueAsDate = new Date();

    // Initialize data
    let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    let budgets = JSON.parse(localStorage.getItem('budgets')) || {
        food: 0,
        transport: 0,
        entertainment: 0,
        bills: 0,
        shopping: 0
    };

    // Initialize chart
    let expenseChart = new Chart(expenseChartCtx, {
        type: 'pie',
        data: {
            labels: ['Food', 'Transport', 'Entertainment', 'Bills', 'Shopping'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Load initial data
    updateSummary();
    renderExpenses();
    updateChart();

    // Event Listeners
    addExpenseBtn.addEventListener('click', addExpense);
    setBudgetBtn.addEventListener('click', setBudget);
    filterButtons.forEach(button => {
        button.addEventListener('click', () => filterExpenses(button.dataset.filter));
    });

    // Functions
    function addExpense() {
        const amount = parseFloat(amountInput.value);
        const category = categorySelect.value;
        const date = dateInput.value;
        const description = descriptionInput.value.trim();

        if (!amount || isNaN(amount)) {
            alert('Please enter a valid amount');
            return;
        }

        if (!date) {
            alert('Please select a date');
            return;
        }

        const newExpense = {
            id: Date.now(),
            amount,
            category,
            date,
            description: description || 'No description'
        };

        expenses.push(newExpense);
        saveData();
        renderExpenses();
        updateSummary();
        updateChart();
        checkBudget(category);

        // Clear inputs
        amountInput.value = '';
        descriptionInput.value = '';
    }

    function setBudget() {
        const category = budgetCategorySelect.value;
        const amount = parseFloat(budgetAmountInput.value);

        if (!amount || isNaN(amount)) {
            alert('Please enter a valid budget amount');
            return;
        }

        budgets[category] = amount;
        saveData();
        updateSummary();
        alert(`Budget for ${category} set to $${amount.toFixed(2)}`);
        budgetAmountInput.value = '';
    }

    function renderExpenses(filter = 'all') {
        expenseTableBody.innerHTML = '';
        
        const filteredExpenses = filter === 'all' 
            ? expenses 
            : expenses.filter(expense => expense.category === filter);

        if (filteredExpenses.length === 0) {
            expenseTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No expenses found</td></tr>';
            return;
        }

        filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(expense => {
            const row = document.createElement('tr');
            
            // Format date
            const dateObj = new Date(expense.date);
            const formattedDate = dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            // Get category icon
            let categoryIcon = '';
            switch(expense.category) {
                case 'food': categoryIcon = '🍔'; break;
                case 'transport': categoryIcon = '🚗'; break;
                case 'entertainment': categoryIcon = '🎬'; break;
                case 'bills': categoryIcon = '🏠'; break;
                case 'shopping': categoryIcon = '🛍️'; break;
            }

            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${categoryIcon} ${expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}</td>
                <td>${expense.description}</td>
                <td>$${expense.amount.toFixed(2)}</td>
                <td><button class="delete-btn" data-id="${expense.id}">Delete</button></td>
            `;
            expenseTableBody.appendChild(row);
        });

        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                deleteExpense(id);
            });
        });
    }

    function deleteExpense(id) {
        if (confirm('Are you sure you want to delete this expense?')) {
            expenses = expenses.filter(expense => expense.id !== id);
            saveData();
            renderExpenses();
            updateSummary();
            updateChart();
        }
    }

    function filterExpenses(filter) {
        // Update active filter button
        filterButtons.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.filter === filter) {
                button.classList.add('active');
            }
        });

        renderExpenses(filter);
    }

    function updateSummary() {
        const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        totalSpentElement.textContent = `$${totalSpent.toFixed(2)}`;

        // Calculate remaining budget for the current month
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlyExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && 
                   expenseDate.getFullYear() === currentYear;
        });

        const monthlySpentByCategory = {
            food: 0,
            transport: 0,
            entertainment: 0,
            bills: 0,
            shopping: 0
        };

        monthlyExpenses.forEach(expense => {
            monthlySpentByCategory[expense.category] += expense.amount;
        });

        let totalBudget = 0;
        let totalSpentThisMonth = 0;

        Object.keys(budgets).forEach(category => {
            totalBudget += budgets[category];
            totalSpentThisMonth += monthlySpentByCategory[category];
        });

        const remainingBudget = totalBudget - totalSpentThisMonth;
        remainingBudgetElement.textContent = `$${Math.max(0, remainingBudget).toFixed(2)}`;

        // Change color if over budget
        if (remainingBudget < 0) {
            remainingBudgetElement.style.color = 'var(--danger-color)';
        } else {
            remainingBudgetElement.style.color = 'var(--success-color)';
        }
    }

    function checkBudget(category) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlyCategoryExpenses = expenses
            .filter(expense => {
                const expenseDate = new Date(expense.date);
                return expenseDate.getMonth() === currentMonth && 
                       expenseDate.getFullYear() === currentYear &&
                       expense.category === category;
            })
            .reduce((sum, expense) => sum + expense.amount, 0);

        if (budgets[category] > 0 && monthlyCategoryExpenses > budgets[category]) {
            alert(`You've exceeded your ${category} budget this month!`);
        }
    }

    function updateChart() {
        const categoryTotals = {
            food: 0,
            transport: 0,
            entertainment: 0,
            bills: 0,
            shopping: 0
        };

        expenses.forEach(expense => {
            categoryTotals[expense.category] += expense.amount;
        });

        expenseChart.data.datasets[0].data = [
            categoryTotals.food,
            categoryTotals.transport,
            categoryTotals.entertainment,
            categoryTotals.bills,
            categoryTotals.shopping
        ];

        expenseChart.update();
    }

    function saveData() {
        localStorage.setItem('expenses', JSON.stringify(expenses));
        localStorage.setItem('budgets', JSON.stringify(budgets));
    }
});