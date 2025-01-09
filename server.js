import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import mqtt from 'mqtt';
import express from 'express';

// Load environment variables
dotenv.config();
dotenv.config({ path: './email.env' });

const app = express();
const port = 3000;

const brokerUrl = 'tcp://broker.hivemq.com:1883';
const topics = ['arduino/dht11/pot1', 'arduino/dht11/pot2'];
const clientId = `NodeSubscriberClient_${Math.random().toString(16).substr(2, 8)}`;

const client = mqtt.connect(brokerUrl, { clientId });

let latestData = {
    pot1: null,
    pot2: null,
};

// Tambahkan array untuk menyimpan history alerts
let alertHistory = [];


const lastAlertSent = { pot1: 0, pot2: 0 };
const ALERT_INTERVAL = 10* 60 * 1000; // 10 menit dalam milidetik

const OPTIMAL_CONDITIONS = {
    soilHumidity: { min: 30, max: 40, unit: '%' },
    soilPH: { min: 5.5, max: 6.5, unit: '' },
    temperature: { min: 20, max: 30, unit: '°C' },
    humidity: { min: 40, max: 50, unit: '%' },
};

// Konfigurasi email dengan nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Menggunakan EMAIL_PASSWORD sesuai dengan file .env
    },
});

// Fungsi untuk memeriksa kondisi optimal
function isOutOfOptimalRange(data) {
    const alerts = [];
    Object.entries(OPTIMAL_CONDITIONS).forEach(([key, condition]) => {
        const value = parseFloat(data[key]);
        if (value < condition.min || value > condition.max) {
            alerts.push(
                `${key}: ${value}${condition.unit} (di luar rentang optimal ${condition.min}-${condition.max}${condition.unit})`
            );
        }
    });
    return alerts;
}

// Fungsi untuk mengirim email alert
async function sendAlertEmail(potNumber, alerts) {
    const timestamp = new Date().toISOString();
    const alertData = {
        id: Date.now(),
        timestamp,
        potNumber,
        alerts,
        data: latestData[`pot${potNumber}`]
    };

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.TEST,
        subject: `Alert: Kondisi Pot ${potNumber} Di Luar Batas Normal`,
        html: `
            <h2>Alert untuk Pot ${potNumber}</h2>
            <p>Parameter yang melewati batas normal:</p>
            <ul>
                ${alerts.map(alert => `<li>${alert}</li>`).join('')}
            </ul>
            <p>Mohon segera periksa kondisi tanaman Anda.</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email alert terkirim untuk Pot ${potNumber}`);
        // Simpan ke history
        alertHistory.push(alertData);
        // Batasi history hanya 100 item terakhir
        if (alertHistory.length > 100) {
            alertHistory = alertHistory.slice(-100);
        }
    } catch (error) {
        console.error('Error mengirim email:', error);
    }
}

// Tambahkan endpoint untuk mengambil alert history
app.get('/api/alert-history', (req, res) => {
    res.json(alertHistory);
});

// Fungsi untuk menangani alert dengan interval
async function handleAlerts(potNumber, data) {
    const now = Date.now();
    const potKey = `pot${potNumber}`;
    
    if (now - lastAlertSent[potKey] > ALERT_INTERVAL) {
        const alerts = isOutOfOptimalRange(data);
        if (alerts.length > 0) {
            await sendAlertEmail(potNumber, alerts);
            lastAlertSent[potKey] = now;
        }
    }
}

// MQTT Connection
client.on('connect', () => {
    console.log(`Connected to MQTT Broker: ${brokerUrl}`);
    client.subscribe(topics, (err) => {
        if (err) {
            console.error('Failed to subscribe to topics:', err);
        } else {
            console.log(`Subscribed to topics: ${topics}`);
        }
    });
});

client.on('message', async (topic, message) => {
    try {
        const parsedMessage = JSON.parse(message.toString());
        const potNumber = parsedMessage.pot;
        const potKey = `pot${potNumber}`;

        // Update latest data
        latestData[potKey] = parsedMessage;

        // Handle alerts
        await handleAlerts(potNumber, parsedMessage);

        console.log(`Updated data for ${potKey}:`, parsedMessage);
    } catch (err) {
        console.error('Error processing message:', err);
    }
});

// Serve static files
app.use(express.static('public'));

// SSE Endpoint untuk real-time updates
app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial data
    if (latestData.pot1) {
        res.write(`data: ${JSON.stringify(latestData.pot1)}\n\n`);
    }
    if (latestData.pot2) {
        res.write(`data: ${JSON.stringify(latestData.pot2)}\n\n`);
    }

    // Set up interval to send updates
    const intervalId = setInterval(() => {
        if (latestData.pot1) {
            res.write(`data: ${JSON.stringify(latestData.pot1)}\n\n`);
        }
        if (latestData.pot2) {
            res.write(`data: ${JSON.stringify(latestData.pot2)}\n\n`);
        }
    }, 1000);

    // Clean up on client disconnect
    req.on('close', () => {
        clearInterval(intervalId);
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});