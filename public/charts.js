const eventSource = new EventSource('/events');

// Variabel untuk menyimpan interval pembaruan dan data terbaru
let updateInterval = 30000; // Default: 2 detik
let updateTimer = null;
let latestData = null; // Menyimpan data terbaru untuk pembaruan berikutnya

// Dropdown untuk memilih interval
const updateDropdown = document.getElementById('updateInterval');
updateDropdown.addEventListener('change', (event) => {
    updateInterval = parseInt(event.target.value, 10);
    restartUpdateTimer();
});

// Deklarasi Chart
const kelembabanUdaraChart = createChart('kelembabanUdara', 'Kelembaban Udara', 'blue');
const kelembabanTanahChart = createChart('kelembabanTanah', 'Kelembaban Tanah', 'green');
const phTanahChart = createChart('phTanah', 'pH Tanah', 'purple');
const suhuTanahChart = createChart('suhuTanah', 'Suhu Tanah', 'orange');
const suhuUdaraChart = createChart('suhuUdara', 'Suhu Udara', 'red');

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
                // fill: true,
            }],
        },
        options: { responsive: true },
    });
}

// Fungsi untuk memulai ulang timer
function restartUpdateTimer() {
    if (updateTimer) clearInterval(updateTimer);
    updateTimer = setInterval(() => {
        if (latestData) updateCharts(latestData);
    }, updateInterval);
}

// Fungsi untuk menangani data baru dari EventSource
eventSource.onmessage = (event) => {
    latestData = JSON.parse(event.data); // Simpan data terbaru
};

// Fungsi untuk memperbarui semua chart
function updateCharts(data) {
    const timestamp = new Date().toLocaleTimeString();

    updateChart(kelembabanUdaraChart, data.humidity, timestamp, 'kelembabanUdaraValue');
    updateChart(kelembabanTanahChart, data.soilHumidity, timestamp, 'kelembabanTanahValue');
    updateChart(phTanahChart, data.soilPH, timestamp, 'phTanahValue');
    updateChart(suhuTanahChart, data.soilTemperature, timestamp, 'suhuTanahValue');
    updateChart(suhuUdaraChart, data.temperature, timestamp, 'suhuUdaraValue');

    const wateringMessage = shouldWaterPlant(data.soilHumidity, data.soilPH, data.soilTemperature, data.temperature)
        ? 'Status Penyiraman: Perlu Disiram'
        : 'Status Penyiraman: Tidak Perlu Disiram';
    document.getElementById('wateringMessage').textContent = wateringMessage;
}

// Fungsi untuk memperbarui chart
function updateChart(chart, value, timestamp, valueElementId) {
    chart.data.labels.push(timestamp);
    chart.data.datasets[0].data.push(parseFloat(value));
    chart.update();

    document.getElementById(valueElementId).querySelector('span').textContent = value;
}

// Fungsi untuk mengevaluasi kebutuhan penyiraman
function shouldWaterPlant(soilHumidity, soilPH, soilTemperature, airTemperature) {
    const needsWater = soilHumidity < 40; // Contoh ambang batas
    const isPHOptimal = soilPH >= 5.5 && soilPH <= 6.5;
    const isTempOptimal = soilTemperature > 15 && soilTemperature < 35 && airTemperature < 40;
    return needsWater && isPHOptimal && isTempOptimal;
}

// Memulai timer pertama kali
restartUpdateTimer();
