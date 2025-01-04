const mqtt = require('mqtt');
const express = require('express');

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

client.on('message', (topic, message) => {
    console.log(`Message received on topic ${topic}: ${message.toString()}`);
    try {
        const parsedMessage = JSON.parse(message.toString());
        if (topic.endsWith('pot1')) {
            latestData.pot1 = {
                ...parsedMessage,
                pot: 1
            };
        } else if (topic.endsWith('pot2')) {
            latestData.pot2 = {
                ...parsedMessage,
                pot: 2
            };
        }
    } catch (err) {
        console.error('Error parsing MQTT message:', err);
    }
});

// SSE Endpoint
app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Kirim data awal jika tersedia
    if (latestData.pot1) {
        res.write(`data: ${JSON.stringify(latestData.pot1)}\n\n`);
    }
    if (latestData.pot2) {
        res.write(`data: ${JSON.stringify(latestData.pot2)}\n\n`);
    }

    const intervalId = setInterval(() => {
        // Kirim data pot1 dan pot2 secara terpisah
        if (latestData.pot1) {
            res.write(`data: ${JSON.stringify(latestData.pot1)}\n\n`);
        }
        if (latestData.pot2) {
            res.write(`data: ${JSON.stringify(latestData.pot2)}\n\n`);
        }
    }, 1000);

    req.on('close', () => {
        clearInterval(intervalId);
    });
});

// Serve Frontend Files
app.use(express.static('public'));

// Start Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});