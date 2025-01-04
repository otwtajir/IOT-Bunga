const mqtt = require('mqtt');

const brokerUrl = 'tcp://broker.hivemq.com:1883';
const topicPot1 = 'arduino/dht11/pot1';
const topicPot2 = 'arduino/dht11/pot2';
const clientId = `PublisherClient_${Math.random().toString(16).substr(2, 8)}`; // Client ID unik

const client = mqtt.connect(brokerUrl, {
    clientId,
    clean: true,
    reconnectPeriod: 1000,
    keepalive: 60,
});

client.on('connect', () => {
    console.log(`Connected to MQTT Broker at ${brokerUrl} as ${clientId}`);

    setInterval(() => {
        const messagePot1 = JSON.stringify({
            pot: 1,
            temperature: (20 + Math.random() * 10).toFixed(2),
            soilTemperature: (20 + Math.random() * 10).toFixed(2),
            humidity: (50 + Math.random() * 10).toFixed(2),
            soilHumidity: (40 + Math.random() * 10).toFixed(2),
            soilPH: (5.5 + Math.random() * 1.5).toFixed(2),
        });

        const messagePot2 = JSON.stringify({
            pot: 2,
            temperature: (20 + Math.random() * 10).toFixed(2),
            soilTemperature: (20 + Math.random() * 10).toFixed(2),
            humidity: (50 + Math.random() * 10).toFixed(2),
            soilHumidity: (40 + Math.random() * 10).toFixed(2),
            soilPH: (5.5 + Math.random() * 1.5).toFixed(2),
        });

        client.publish(topicPot1, messagePot1, { qos: 0 });
        client.publish(topicPot2, messagePot2, { qos: 0 });

        console.log(`Published message to ${topicPot1}:`, messagePot1);
        console.log(`Published message to ${topicPot2}:`, messagePot2);
    }, 60000);
});

client.on('error', (err) => {
    console.error('MQTT Client Error:', err);
});

client.on('close', () => {
    console.log('Disconnected from MQTT Broker');
});
