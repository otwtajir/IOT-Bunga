const mqtt = require('mqtt');

const brokerUrl = 'tcp://broker.hivemq.com:1883';
const topic = 'arduino/dht11';
const clientId = `PublisherClient_${Math.random().toString(16).substr(2, 8)}`; // Client ID unik

const client = mqtt.connect(brokerUrl, {
    clientId,
    clean: true,          // True untuk sesi baru
    reconnectPeriod: 1000, // Reconnect otomatis setelah 1 detik
    keepalive: 60,        // Kirim ping setiap 60 detik
});

client.on('connect', () => {
    console.log(`Connected to MQTT Broker at ${brokerUrl} as ${clientId}`);

    setInterval(() => {
        const message = JSON.stringify({
            temperature: (20 + Math.random() * 10).toFixed(2),
            humidity: (50 + Math.random() * 10).toFixed(2),
        });

        client.publish(topic, message, { qos: 0 }, (err) => {
            if (err) {
                console.error('Publish error:', err);
            } else {
                console.log(`Published message to ${topic}:`, message);
            }
        });
    }, 60000); // Kirim setiap 1 menit
});

client.on('error', (err) => {
    console.error('MQTT Client Error:', err);
});

client.on('close', () => {
    console.log('Disconnected from MQTT Broker');
});
