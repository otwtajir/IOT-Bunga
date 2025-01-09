const eventSource = new EventSource('/events');

// Elements
const alertTab = document.querySelector('.tab:not(.active)');
const modal = document.getElementById('alertModal');
const closeBtn = document.querySelector('.close');
const alertHistory = document.getElementById('alertHistory');

// Event Listeners
alertTab.addEventListener('click', showAlertHistory);
closeBtn.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// Functions
async function showAlertHistory() {
    try {
        const response = await fetch('/api/alert-history');
        const history = await response.json();
        
        alertHistory.innerHTML = history
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map(alert => `
                <div class="alert-item ${alert.alerts.length > 2 ? 'alert-critical' : ''}">
                    <div class="alert-timestamp">
                        ${new Date(alert.timestamp).toLocaleString('id-ID')}
                    </div>
                    <div>
                        <strong>Pot ${alert.potNumber}</strong>
                    </div>
                    <div class="alert-details">
                        <strong>Parameter di luar batas normal:</strong>
                        <ul>
                            ${alert.alerts.map(a => `<li>${a}</li>`).join('')}
                        </ul>
                        <div class="alert-parameters">
                            <strong>Nilai Parameter:</strong>
                            <div class="alert-parameter">
                                <span>Suhu Udara:</span>
                                <span>${alert.data.temperature}°C</span>
                            </div>
                            <div class="alert-parameter">
                                <span>Kelembaban Udara:</span>
                                <span>${alert.data.humidity}%</span>
                            </div>
                            <div class="alert-parameter">
                                <span>Kelembaban Tanah:</span>
                                <span>${alert.data.soilHumidity}%</span>
                            </div>
                            <div class="alert-parameter">
                                <span>pH Tanah:</span>
                                <span>${alert.data.soilPH}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error fetching alert history:', error);
    }
}

// Tambahkan class handling untuk tab
const tabs = document.querySelectorAll('.tab');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
    });
});

// Variabel untuk menyimpan interval pembaruan dan data terbaru
let updateInterval = 30000; // Default: 30 detik
let updateTimer = null;
let latestData = {
    pot1: null,
    pot2: null
};

// Dropdown untuk memilih interval
const updateDropdown = document.getElementById('updateInterval');
updateDropdown.addEventListener('change', (event) => {
    updateInterval = parseInt(event.target.value, 10);
    restartUpdateTimer();
});

// Dropdown untuk memilih pot
const potDropdown = document.getElementById('potSelection');
potDropdown.addEventListener('change', updatePotDisplay);

// Deklarasi Chart untuk Pot 1 dan Pot 2
const kelembabanUdaraChart1 = createChart('kelembabanUdara1', 'Kelembaban Udara - Pot 1', 'blue');
const kelembabanTanahChart1 = createChart('kelembabanTanah1', 'Kelembaban Tanah - Pot 1', 'green');
const phTanahChart1 = createChart('phTanah1', 'pH Tanah - Pot 1', 'purple');
const suhuTanahChart1 = createChart('suhuTanah1', 'Suhu Tanah - Pot 1', 'orange');
const suhuUdaraChart1 = createChart('suhuUdara1', 'Suhu Udara - Pot 1', 'red');

const kelembabanUdaraChart2 = createChart('kelembabanUdara2', 'Kelembaban Udara - Pot 2', 'blue');
const kelembabanTanahChart2 = createChart('kelembabanTanah2', 'Kelembaban Tanah - Pot 2', 'green');
const phTanahChart2 = createChart('phTanah2', 'pH Tanah - Pot 2', 'purple');
const suhuTanahChart2 = createChart('suhuTanah2', 'Suhu Tanah - Pot 2', 'orange');
const suhuUdaraChart2 = createChart('suhuUdara2', 'Suhu Udara - Pot 2', 'red');

// Fungsi untuk membuat chart
function createChart(canvasId, label, color) {
    return new Chart(document.getElementById(canvasId).getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: color,
                backgroundColor: `${color}4D`,
            }],
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false
                }
            },
            animation: false // Menonaktifkan animasi untuk performa lebih baik
        },
    });
}

let lastUpdateTime = 0;

// Fungsi untuk memulai ulang timer
function restartUpdateTimer() {
    if (updateTimer) clearInterval(updateTimer);
    updateTimer = setInterval(() => {
        const currentTime = Date.now();
        if (currentTime - lastUpdateTime >= updateInterval) {
            if (latestData.pot1 || latestData.pot2) {
                updateCharts(latestData);
                lastUpdateTime = currentTime;
            }
        }
    }, 1000); // Check setiap detik, tapi update berdasarkan interval
}

// Fungsi untuk menangani data baru dari EventSource
eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.pot === 1) {
        latestData.pot1 = data;
    } else if (data.pot === 2) {
        latestData.pot2 = data;
    }
    
    const currentTime = Date.now();
    if (currentTime - lastUpdateTime >= updateInterval) {
        updateCharts(latestData);
        lastUpdateTime = currentTime;
    }
};

const OPTIMAL_CONDITIONS = {
    soilHumidity: {
        min: 30,
        max: 40,
        unit: '%'
    },
    soilPH: {
        min: 5.5,
        max: 6.5,
        unit: ''
    },
    temperature: {
        min: 20,
        max: 30,
        unit: '°C'
    },
    humidity: {
        min: 40,
        max: 50,
        unit: '%'
    }
};

// Fungsi untuk mengevaluasi kondisi parameter
function evaluateParameter(value, parameter) {
    const conditions = OPTIMAL_CONDITIONS[parameter];
    if (value < conditions.min) {
        return {
            status: 'Terlalu Rendah',
            class: 'too-low'
        };
    } else if (value > conditions.max) {
        return {
            status: 'Terlalu Tinggi',
            class: 'too-high'
        };
    } else {
        return {
            status: 'Optimal',
            class: 'optimal'
        };
    }
}

// Fungsi untuk menentukan kebutuhan penyiraman
function determineWateringNeeds(soilHumidity, temperature) {
    if (soilHumidity < OPTIMAL_CONDITIONS.soilHumidity.min) {
        if (temperature > OPTIMAL_CONDITIONS.temperature.max) {
            return {
                status: 'Perlu Disiram Segera!',
                class: 'urgent'
            };
        }
        return {
            status: 'Perlu Disiram',
            class: 'warning'
        };
    } else if (soilHumidity > OPTIMAL_CONDITIONS.soilHumidity.max) {
        return {
            status: 'Jangan Disiram',
            class: 'do-not-water'
        };
    }
    return {
        status: 'Tidak Perlu Disiram',
        class: 'optimal'
    };
}

// Fungsi untuk memperbarui status tanaman
function updatePlantStatus(data, potNumber) {
    if (!data) return;

    const statusElements = {
        soilHumidity: document.getElementById(`soilHumidityStatus${potNumber}`),
        soilPH: document.getElementById(`soilPhStatus${potNumber}`),
        airTemp: document.getElementById(`airTempStatus${potNumber}`),
        airHumidity: document.getElementById(`airHumidityStatus${potNumber}`),
        watering: document.getElementById(`wateringStatus${potNumber}`)
    };

    // Update soil humidity status
    const soilHumidityEval = evaluateParameter(data.soilHumidity, 'soilHumidity');
    statusElements.soilHumidity.textContent = `${data.soilHumidity}% (${soilHumidityEval.status})`;
    statusElements.soilHumidity.className = `value ${soilHumidityEval.class}`;

    // Update soil pH status
    const soilPHEval = evaluateParameter(data.soilPH, 'soilPH');
    statusElements.soilPH.textContent = `${data.soilPH} (${soilPHEval.status})`;
    statusElements.soilPH.className = `value ${soilPHEval.class}`;

    // Update air temperature status
    const tempEval = evaluateParameter(data.temperature, 'temperature');
    statusElements.airTemp.textContent = `${data.temperature}°C (${tempEval.status})`;
    statusElements.airTemp.className = `value ${tempEval.class}`;

    // Update air humidity status
    const humidityEval = evaluateParameter(data.humidity, 'humidity');
    statusElements.airHumidity.textContent = `${data.humidity}% (${humidityEval.status})`;
    statusElements.airHumidity.className = `value ${humidityEval.class}`;

    // Update watering status
    const wateringNeeds = determineWateringNeeds(data.soilHumidity, data.temperature);
    statusElements.watering.textContent = wateringNeeds.status;
    statusElements.watering.className = `value ${wateringNeeds.class}`;
}



// Fungsi untuk memperbarui semua chart
function updateCharts(data) {
    const timestamp = new Date().toLocaleTimeString();

    if (data.pot1) {
        updateChart(kelembabanUdaraChart1, data.pot1.humidity, timestamp, 'kelembabanUdaraValue1');
        updateChart(kelembabanTanahChart1, data.pot1.soilHumidity, timestamp, 'kelembabanTanahValue1');
        updateChart(phTanahChart1, data.pot1.soilPH, timestamp, 'phTanahValue1');
        updateChart(suhuTanahChart1, data.pot1.soilTemperature, timestamp, 'suhuTanahValue1');
        updateChart(suhuUdaraChart1, data.pot1.temperature, timestamp, 'suhuUdaraValue1');
        updatePlantStatus(data.pot1, 1);
    }

    if (data.pot2) {
        updateChart(kelembabanUdaraChart2, data.pot2.humidity, timestamp, 'kelembabanUdaraValue2');
        updateChart(kelembabanTanahChart2, data.pot2.soilHumidity, timestamp, 'kelembabanTanahValue2');
        updateChart(phTanahChart2, data.pot2.soilPH, timestamp, 'phTanahValue2');
        updateChart(suhuTanahChart2, data.pot2.soilTemperature, timestamp, 'suhuTanahValue2');
        updateChart(suhuUdaraChart2, data.pot2.temperature, timestamp, 'suhuUdaraValue2');
        updatePlantStatus(data.pot2, 2);
    }
}

const style = document.createElement('style');
style.textContent = `
.status-card {
    background: #f5f5f5;
    border-radius: 8px;
    padding: 15px;
    margin: 10px 0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.status-details {
    display: grid;
    gap: 10px;
    margin-top: 10px;
}

.parameter {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.watering-status {
    margin-top: 15px;
    padding-top: 10px;
    border-top: 1px solid #ddd;
}

.value {
    font-weight: bold;
}

.optimal { color: #2ecc71; }
.too-high { color: #e74c3c; }
.too-low { color: #e67e22; }
.warning { color: #f1c40f; }
.urgent { color: #c0392b; }
.do-not-water { color: #3498db; }
`;

document.head.appendChild(style);

// Fungsi untuk memperbarui chart
function updateChart(chart, value, timestamp, valueElementId) {
    if (value !== undefined && value !== null) {
        chart.data.labels.push(timestamp);
        chart.data.datasets[0].data.push(parseFloat(value));
        
        // Batasi jumlah data yang ditampilkan
        const maxDataPoints = 20;
        if (chart.data.labels.length > maxDataPoints) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        
        chart.update('none'); // Update tanpa animasi
        const valueElement = document.getElementById(valueElementId);
        if (valueElement) {
            const span = valueElement.querySelector('span');
            if (span) {
                span.textContent = parseFloat(value).toFixed(2);
            }
        }
    }
}

// Fungsi untuk menampilkan atau menyembunyikan chart sesuai pot
function updatePotDisplay() {
    const selectedPot = potDropdown.value;

    const pot1Charts = document.querySelectorAll('.pot1');
    const pot2Charts = document.querySelectorAll('.pot2');
    const pot1Status = document.querySelector('.status-card.pot1');
    const pot2Status = document.querySelector('.status-card.pot2');

    if (selectedPot === 'pot1') {
        pot1Charts.forEach(chart => chart.style.display = 'block');
        pot2Charts.forEach(chart => chart.style.display = 'none');
    } else if (selectedPot === 'pot2') {
        pot1Charts.forEach(chart => chart.style.display = 'none');
        pot2Charts.forEach(chart => chart.style.display = 'block');
    } else {
        pot1Charts.forEach(chart => chart.style.display = 'none');
        pot2Charts.forEach(chart => chart.style.display = 'none');
        pot1Status.style.display = 'block';
        pot2Status.style.display = 'block';
    }
}

// Memulai timer pertama kali
lastUpdateTime = Date.now();
restartUpdateTimer();