// Local Storage'dan verileri yükle
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

// DOM elementlerini seç
const transactionForm = document.getElementById('transaction-form');
const transactionsList = document.getElementById('transactions-list');
const totalBalanceElement = document.getElementById('total-balance');
const monthlyList = document.getElementById('monthly-list');

let monthlyChart = null;
let categoryChart = null;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    updateTransactionsList();
    updateMonthlySummary();
    updateTotalBalance();
    initCharts();
});

// Grafikleri başlat
function initCharts() {
    const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');

    monthlyChart = new Chart(monthlyCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Gelir',
                    backgroundColor: '#27ae60',
                    data: []
                },
                {
                    label: 'Gider',
                    backgroundColor: '#e74c3c',
                    data: []
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return value + ' TL';
                        }
                    }
                }
            }
        }
    });

    categoryChart = new Chart(categoryCtx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#e74c3c',
                    '#3498db',
                    '#2ecc71',
                    '#f1c40f',
                    '#9b59b6',
                    '#1abc9c'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });

    updateCharts();
}

// Grafikleri güncelle
function updateCharts() {
    updateMonthlyChart();
    updateCategoryChart();
}

// Aylık grafiği güncelle
function updateMonthlyChart() {
    const monthlyData = {};

    transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = {
                income: 0,
                expense: 0
            };
        }

        if (transaction.type === 'gelir') {
            monthlyData[monthYear].income += transaction.amount;
        } else {
            monthlyData[monthYear].expense += transaction.amount;
        }
    });

    const sortedMonths = Object.entries(monthlyData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-6); // Son 6 ayı göster

    monthlyChart.data.labels = sortedMonths.map(([monthYear]) => {
        const [year, month] = monthYear.split('-');
        return formatMonthYear(month, year);
    });

    monthlyChart.data.datasets[0].data = sortedMonths.map(([, data]) => data.income);
    monthlyChart.data.datasets[1].data = sortedMonths.map(([, data]) => data.expense);

    monthlyChart.update();
}

// Kategori grafiğini güncelle
function updateCategoryChart() {
    const categoryData = {};

    transactions.forEach(transaction => {
        if (transaction.type === 'gider') {
            if (!categoryData[transaction.category]) {
                categoryData[transaction.category] = 0;
            }
            categoryData[transaction.category] += transaction.amount;
        }
    });

    categoryChart.data.labels = Object.keys(categoryData).map(formatCategory);
    categoryChart.data.datasets[0].data = Object.values(categoryData);

    categoryChart.update();
}

// Form gönderildiğinde
transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const type = document.getElementById('type').value;
    const category = document.getElementById('category').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value;

    const transaction = {
        id: Date.now(),
        type,
        category,
        amount,
        date,
        description
    };

    transactions.push(transaction);
    saveTransactions();
    updateTransactionsList();
    updateMonthlySummary();
    updateTotalBalance();
    updateCharts();

    transactionForm.reset();
});

// İşlemleri Local Storage'a kaydet
function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// İşlem listesini güncelle
function updateTransactionsList() {
    transactionsList.innerHTML = '';

    transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(transaction => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${formatDate(transaction.date)}</td>
            <td>${transaction.type === 'gelir' ? 'Gelir' : 'Gider'}</td>
            <td>${formatCategory(transaction.category)}</td>
            <td>${transaction.description}</td>
            <td class="${transaction.type === 'gelir' ? 'positive' : 'negative'}">
                ${transaction.type === 'gelir' ? '+' : '-'}${transaction.amount.toFixed(2)} TL
            </td>
            <td>
                <button class="delete-btn" onclick="deleteTransaction(${transaction.id})">Sil</button>
            </td>
        `;

        transactionsList.appendChild(row);
    });
}

// Aylık özeti güncelle
function updateMonthlySummary() {
    monthlyList.innerHTML = '';

    const monthlyData = {};

    transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = {
                income: 0,
                expense: 0
            };
        }

        if (transaction.type === 'gelir') {
            monthlyData[monthYear].income += transaction.amount;
        } else {
            monthlyData[monthYear].expense += transaction.amount;
        }
    });

    Object.entries(monthlyData)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .forEach(([monthYear, data]) => {
            const row = document.createElement('tr');
            const [year, month] = monthYear.split('-');

            row.innerHTML = `
                <td>${formatMonthYear(month, year)}</td>
                <td class="positive">+${data.income.toFixed(2)} TL</td>
                <td class="negative">-${data.expense.toFixed(2)} TL</td>
                <td class="${data.income - data.expense >= 0 ? 'positive' : 'negative'}">
                    ${(data.income - data.expense).toFixed(2)} TL
                </td>
            `;

            monthlyList.appendChild(row);
        });
}

// Toplam bakiyeyi güncelle
function updateTotalBalance() {
    const total = transactions.reduce((acc, transaction) => {
        return acc + (transaction.type === 'gelir' ? transaction.amount : -transaction.amount);
    }, 0);

    totalBalanceElement.textContent = total.toFixed(2);
    totalBalanceElement.className = total >= 0 ? 'positive' : 'negative';
}

// İşlem sil
function deleteTransaction(id) {
    transactions = transactions.filter(transaction => transaction.id !== id);
    saveTransactions();
    updateTransactionsList();
    updateMonthlySummary();
    updateTotalBalance();
    updateCharts();
}

// Yardımcı fonksiyonlar
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
}

function formatMonthYear(month, year) {
    const months = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
}

function formatCategory(category) {
    const categories = {
        'maas': 'Maaş',
        'yatirim': 'Yatırım',
        'kira': 'Kira',
        'market': 'Market',
        'faturalar': 'Faturalar',
        'diger': 'Diğer'
    };
    return categories[category] || category;
} 