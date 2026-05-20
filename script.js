// Dashboard Data for each HR Phase
const phaseData = {
    recruitment: {
        title: "Recruitment Phase",
        subtitle: "Tracking pipeline and acquisition velocity",
        metrics: [],
        chart1: { title: "Loading...", type: "line", labels: [], data: [] },
        chart2: { title: "Loading...", type: "doughnut", labels: [], data: [] },
        tableTitle: "Recent Applicants",
        tableHeaders: ["Candidate", "Role", "Stage", "Source", "Date Applied"],
        tableRows: [],
        table2Title: "Source Pipeline Details",
        table2Headers: ["Source", "Total Applicants", "Screening Status", "1st Round", "2nd Round"],
        table2Rows: []
    },
    onboarding: {
        title: "Onboarding Phase",
        subtitle: "Monitor new hire integration and readiness",
        metrics: [],
        chart1: { title: "Loading...", type: "bar", labels: [], data: [] },
        chart2: { title: "Loading...", type: "doughnut", labels: [], data: [] },
        tableTitle: "Current Cohort Status",
        tableHeaders: ["Employee", "Role", "Department", "Progress", "Start Date"],
        tableRows: []
    },
    probation: {
        title: "Probation Phase",
        subtitle: "Evaluation period tracking and confirmation",
        metrics: [],
        chart1: { title: "Loading...", type: "line", labels: [], data: [] },
        chart2: { title: "Loading...", type: "doughnut", labels: [], data: [] },
        tableTitle: "Upcoming Probation Confirmations",
        tableHeaders: ["Employee", "Department", "Tenure", "End Date", "Status"],
        tableRows: []
    },
    performance: {
        title: "Performance Phase",
        subtitle: "Continuous feedback and goal achievement",
        metrics: [],
        chart1: { title: "Loading...", type: "bar", labels: [], data: [] },
        chart2: { title: "Loading...", type: "doughnut", labels: [], data: [] },
        tableTitle: "Recent Milestones Reached",
        tableHeaders: ["Employee", "Achievement", "Impact", "Date"],
        tableRows: []
    },
    exit: {
        title: "Exit Phase",
        subtitle: "Turnover analysis and alumni management",
        metrics: [],
        chart1: { title: "Loading...", type: "bar", labels: [], data: [] },
        chart2: { title: "Loading...", type: "doughnut", labels: [], data: [] },
        tableTitle: "Recent Exits & Offboarding Status",
        tableHeaders: ["Employee", "Role", "Exit Date", "Reason Type", "Clearance Status"],
        tableRows: []
    }
};

// Global chart instances
let mainChartInstance = null;
let secondaryChartInstance = null;

const API_URL = "https://script.google.com/macros/s/AKfycbzUucs_03VLrvAtteQ8jlgYB1Bwb-KXofaOApGLxwhF4yhTMwN7FPVqoS3J39QYRsUD/exec";

// Chart.js Default styling for Premium Dark Mode
Chart.defaults.color = '#a1a1aa';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.scale.grid.color = '#27272a';
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(24, 24, 27, 0.9)';
Chart.defaults.plugins.tooltip.titleColor = '#f4f4f5';
Chart.defaults.plugins.tooltip.bodyColor = '#a1a1aa';
Chart.defaults.plugins.tooltip.borderColor = '#3f3f46';
Chart.defaults.plugins.tooltip.borderWidth = 1;

async function fetchRealData(days = '30') {
    try {
        const url = days === 'all' ? API_URL : `${API_URL}?days=${days}`;
        const response = await fetch(url);
        const data = await response.json();

        // Sort recruitment applications over time chronologically
        if (data.recruitment && data.recruitment.chart1 && data.recruitment.chart1.labels) {
            let chart1 = data.recruitment.chart1;
            let indices = chart1.labels.map((lbl, i) => i);
            indices.sort((a, b) => new Date(chart1.labels[a] + " 1").getTime() - new Date(chart1.labels[b] + " 1").getTime());
            chart1.labels = indices.map(i => chart1.labels[i]);
            chart1.data = indices.map(i => chart1.data[i]);
        }

        // Move "Offer Rejected" from Exit to Onboarding temporarily until backend is updated
        if (data.exit && data.exit.metrics && data.onboarding && data.onboarding.metrics) {
            const index = data.exit.metrics.findIndex(m => m.title === "Offer Rejected");
            if (index !== -1) {
                const metric = data.exit.metrics.splice(index, 1)[0];
                data.onboarding.metrics.push(metric);
            }
        }

        // Update phaseData with the fetched metrics, tables, and charts!
        const phases = ['recruitment', 'onboarding', 'probation', 'performance', 'exit'];
        
        phases.forEach(phase => {
            if (data[phase]) {
                if (data[phase].metrics) phaseData[phase].metrics = data[phase].metrics;
                if (data[phase].tableRows) phaseData[phase].tableRows = data[phase].tableRows;
                if (data[phase].table2Rows) phaseData[phase].table2Rows = data[phase].table2Rows;
                if (data[phase].chart1 && data[phase].chart1.labels) phaseData[phase].chart1 = data[phase].chart1;
                if (data[phase].chart2 && data[phase].chart2.labels) phaseData[phase].chart2 = data[phase].chart2;
            }
        });

    } catch (error) {
        console.error("Error fetching data from Google Sheets:", error);
    }
}

// Function to render Phase Data
function renderPhase(phaseKey) {
    const data = phaseData[phaseKey];
    if (!data) return;

    // Update Text Content
    document.getElementById('page-title').textContent = data.title;
    document.getElementById('page-title').style.animation = 'none';
    document.getElementById('page-title').offsetHeight; /* trigger reflow */
    document.getElementById('page-title').style.animation = 'fadeIn 0.4s ease';
    
    document.getElementById('page-subtitle').textContent = data.subtitle;

    // Render Metrics
    const metricsContainer = document.getElementById('metrics-container');
    metricsContainer.innerHTML = '';
    data.metrics.forEach((metric, index) => {
        const trendClass = metric.isUp ? 'trend-up' : 'trend-down';
        const trendIcon = metric.isUp ? 'ri-arrow-right-up-line' : 'ri-arrow-right-down-line';
        
        const cardHTML = `
            <div class="metric-card" style="animation: fadeIn 0.4s ease ${index * 0.1}s backwards">
                <div class="metric-title">${metric.title}</div>
                <div class="metric-value">${metric.value}</div>
                <div class="metric-trend ${trendClass}">
                    <i class="${trendIcon}"></i> ${metric.trend}
                </div>
                <div class="metric-desc">${metric.desc || ''}</div>
            </div>
        `;
        metricsContainer.insertAdjacentHTML('beforeend', cardHTML);
    });

    // Render Charts
    document.getElementById('chart-title-1').textContent = data.chart1.title;
    document.getElementById('chart-title-2').textContent = data.chart2.title;
    renderCharts(data.chart1, data.chart2);

    // Render Table
    document.getElementById('table-title').textContent = data.tableTitle;
    const thead = document.querySelector('#data-table thead');
    const tbody = document.querySelector('#data-table tbody');
    
    let theadHTML = '<tr>';
    data.tableHeaders.forEach(th => {
        theadHTML += `<th>${th}</th>`;
    });
    theadHTML += '</tr>';
    thead.innerHTML = theadHTML;

    let tbodyHTML = '';
    data.tableRows.forEach(row => {
        tbodyHTML += '<tr>';
        row.forEach(cell => {
            tbodyHTML += `<td>${cell}</td>`;
        });
        tbodyHTML += '</tr>';
    });
    tbody.innerHTML = tbodyHTML;

    // Render Table 2
    const table2Section = document.getElementById('data-table-section-2');
    if (table2Section) {
        if (data.table2Title && data.table2Rows) {
            table2Section.style.display = 'block';
            document.getElementById('table-title-2').textContent = data.table2Title;
            const thead2 = document.querySelector('#data-table-2 thead');
            const tbody2 = document.querySelector('#data-table-2 tbody');
            
            let theadHTML2 = '<tr>';
            data.table2Headers.forEach(th => {
                theadHTML2 += `<th>${th}</th>`;
            });
            theadHTML2 += '</tr>';
            thead2.innerHTML = theadHTML2;

            let tbodyHTML2 = '';
            data.table2Rows.forEach(row => {
                tbodyHTML2 += '<tr>';
                row.forEach(cell => {
                    tbodyHTML2 += `<td>${cell}</td>`;
                });
                tbodyHTML2 += '</tr>';
            });
            tbody2.innerHTML = tbodyHTML2;
        } else {
            table2Section.style.display = 'none';
        }
    }
}

// Render Charts implementation
function renderCharts(chartData1, chartData2) {
    const ctx1 = document.getElementById('mainChart').getContext('2d');
    const ctx2 = document.getElementById('secondaryChart').getContext('2d');

    // Destroy existing instances
    if (mainChartInstance) mainChartInstance.destroy();
    if (secondaryChartInstance) secondaryChartInstance.destroy();

    // Main Chart setup
    const gradientFill = ctx1.createLinearGradient(0, 0, 0, 300);
    gradientFill.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    gradientFill.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    let config1 = {};
    if (chartData1.type === 'line') {
        config1 = {
            type: 'line',
            data: {
                labels: chartData1.labels,
                datasets: [{
                    label: 'Metric',
                    data: chartData1.data,
                    borderColor: '#3b82f6',
                    backgroundColor: gradientFill,
                    borderWidth: 3,
                    pointBackgroundColor: '#18181b',
                    pointBorderColor: '#3b82f6',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4 // Smooth curves like a "worm graph"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, border: { dash: [4, 4] } }
                }
            }
        };
    } else if (chartData1.type === 'bar') {
        config1 = {
            type: 'bar',
            data: {
                labels: chartData1.labels,
                datasets: [{
                    label: 'Metric',
                    data: chartData1.data,
                    backgroundColor: '#3b82f6',
                    borderRadius: 4,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, border: { dash: [4, 4] } }
                }
            }
        };
    }

    // Secondary Chart Setup (Doughnut)
    let config2 = {
        type: 'doughnut',
        data: {
            labels: chartData2.labels,
            datasets: [{
                data: chartData2.data,
                backgroundColor: [
                    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 20, usePointStyle: true, boxWidth: 8 }
                }
            }
        }
    };

    mainChartInstance = new Chart(ctx1, config1);
    secondaryChartInstance = new Chart(ctx2, config2);
}

// Date Picker Logic
const datePickerBtn = document.getElementById('datePickerBtn');
const dateDropdown = document.getElementById('dateDropdown');
const datePickerLabel = document.getElementById('datePickerLabel');

if (datePickerBtn && dateDropdown) {
    datePickerBtn.addEventListener('click', (e) => {
        if (!e.target.closest('.date-option')) {
            dateDropdown.classList.toggle('show');
        }
    });

    document.addEventListener('click', (e) => {
        if (!datePickerBtn.contains(e.target)) {
            dateDropdown.classList.remove('show');
        }
    });

    document.querySelectorAll('.date-option').forEach(option => {
        option.addEventListener('click', async (e) => {
            document.querySelectorAll('.date-option').forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            datePickerLabel.textContent = option.textContent;
            dateDropdown.classList.remove('show');
            
            const activeNav = document.querySelector('.nav-item.active');
            if (activeNav) {
                document.getElementById('page-title').style.opacity = '0.5';
                await fetchRealData(option.dataset.value);
                document.getElementById('page-title').style.opacity = '1';
                renderPhase(activeNav.getAttribute('data-phase'));
            }
        });
    });
}

// Event Listeners for Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        // Prevent default hash routing to avoid page jump
        e.preventDefault(); 
        
        // Remove active class from all
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        
        // Add to clicked
        item.classList.add('active');
        
        // Render data
        const phase = item.getAttribute('data-phase');
        renderPhase(phase);
    });
});

// Initialize on Load
document.addEventListener('DOMContentLoaded', async () => {
    // Initial render with mock data giving a loading illusion
    renderPhase('recruitment');

    // Fetch real data from Google Sheets
    await fetchRealData();

    // Re-render currently active phase to show real data!
    const activeNav = document.querySelector('.nav-item.active');
    if (activeNav) {
        renderPhase(activeNav.getAttribute('data-phase'));
    }
});
