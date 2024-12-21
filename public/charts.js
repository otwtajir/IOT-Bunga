const eventSource = new EventSource('/events');

const kelembabanUdaraCtx = document.getElementById('kelembabanUdara').getContext('2d');
const kelembabanTanahCtx = document.getElementById('kelembabanTanah').getContext('2d');
const phTanahCtx = document.getElementById('phTanah').getContext('2d');
const suhuTanahCtx = document.getElementById('suhuTanah').getContext('2d');
const suhuUdaraCtx = document.getElementById('suhuUdara').getContext('2d');

// Chart.js Configurations
const kelembabanUdaraChart = new Chart(kelembabanUdaraCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Kelembaban Udara',
            data: [],
            borderColor: 'blue',
            backgroundColor: 'rgba(0, 0, 255, 0.2)',
            fill: true,
        }],
    },
    options: { responsive: true },
});

const kelembabanTanahChart = new Chart(kelembabanTanahCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Kelembaban Tanah',
            data: [],
            borderColor: 'green',
            backgroundColor: 'rgba(0, 255, 0, 0.2)',
            fill: true,
        }],
    },
    options: { responsive: true },
});

const phTanahChart = new Chart(phTanahCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'pH Tanah',
            data: [],
            borderColor: 'purple',
            backgroundColor: 'rgba(128, 0, 128, 0.2)',
            fill: true,
        }],
    },
    options: { responsive: true },
});

const suhuTanahChart = new Chart(suhuTanahCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Suhu Tanah',
            data: [],
            borderColor: 'orange',
            backgroundColor: 'rgba(255, 165, 0, 0.2)',
            fill: true,
        }],
    },
    options: { responsive: true },
});

const suhuUdaraChart = new Chart(suhuUdaraCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Suhu Udara',
            data: [],
            borderColor: 'red',
            backgroundColor: 'rgba(255, 0, 0, 0.2)',
            fill: true,
        }],
    },
    options: { responsive: true },
});

// EventSource to Receive MQTT Data
eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Data from MQTT:', data);

    const timestamp = new Date().toLocaleTimeString();

    // Update chart data dynamically
    kelembabanUdaraChart.data.labels.push(timestamp);
    kelembabanUdaraChart.data.datasets[0].data.push(parseFloat(data.humidity));
    kelembabanUdaraChart.update();

    kelembabanTanahChart.data.labels.push(timestamp);
    kelembabanTanahChart.data.datasets[0].data.push(parseFloat(data.soilHumidity || Math.random() * 10 + 40));
    kelembabanTanahChart.update();

    phTanahChart.data.labels.push(timestamp);
    phTanahChart.data.datasets[0].data.push(parseFloat(data.soilPH || Math.random() * 2 + 5));
    phTanahChart.update();

    suhuTanahChart.data.labels.push(timestamp);
    suhuTanahChart.data.datasets[0].data.push(parseFloat(data.soilTemperature || Math.random() * 10 + 20));
    suhuTanahChart.update();

    suhuUdaraChart.data.labels.push(timestamp);
    suhuUdaraChart.data.datasets[0].data.push(parseFloat(data.temperature));
    suhuUdaraChart.update();
};
