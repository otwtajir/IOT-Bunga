const mqtt = require('mqtt');
const express = require('express');

const app = express();
const port = 3000;

// MQTT Broker Config
const brokerUrl = 'tcp://broker.hivemq.com:1883';
const topic = 'arduino/dht11';
const clientId = 'NodeSubscriberClient_' + Math.random().toString(16).substr(2, 8);

const client = mqtt.connect(brokerUrl, { clientId });

let latestData = null;

// MQTT Connection
client.on('connect', () => {
    console.log(`Connected to MQTT Broker: ${brokerUrl}`);
    client.subscribe(topic, (err) => {
        if (err) {
            console.error('Failed to subscribe to topic:', err);
        } else {
            console.log(`Subscribed to topic: ${topic}`);
        }
    });
});

client.on('message', (topic, message) => {
    console.log(`Message received on topic ${topic}: ${message.toString()}`);
    try {
        latestData = JSON.parse(message.toString());
    } catch (err) {
        console.error('Error parsing MQTT message:', err);
    }
});

// SSE Endpoint
app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const intervalId = setInterval(() => {
        if (latestData) {
            res.write(`data: ${JSON.stringify(latestData)}\n\n`);
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
