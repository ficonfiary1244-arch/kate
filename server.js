// SERVER WEBHOOK SAWERIA UNTUK ROBLOX
// Deploy di Glitch.com atau Replit.com

const express = require('express');
const { Client } = require('saweria');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Konfigurasi
const CONFIG = {
    SAWERIA_EMAIL: process.env.SAWERIA_EMAIL || 'your-email@gmail.com',
    SAWERIA_PASSWORD: process.env.SAWERIA_PASSWORD || 'your-password',
    // Atau gunakan Stream Key saja (lebih aman, tidak perlu login)
    SAWERIA_STREAM_KEY: process.env.SAWERIA_STREAM_KEY || 'your-stream-key',
    PORT: process.env.PORT || 3000,
    SECRET_TOKEN: process.env.SECRET_TOKEN || 'RAHASIA123' // Token untuk keamanan
};

// Storage untuk donasi baru yang belum diambil Roblox
let newDonations = [];
let allDonations = []; // Semua donasi yang pernah masuk
let isConnected = false;

// Inisialisasi Saweria Client
const saweriaClient = new Client();

// Fungsi untuk setup Saweria dengan Stream Key (RECOMMENDED)
function setupWithStreamKey() {
    console.log('[Saweria] Connecting with Stream Key...');
    
    saweriaClient.setStreamKey(CONFIG.SAWERIA_STREAM_KEY);
    
    // Listen untuk donasi
    saweriaClient.on('donations', (donations) => {
        console.log('[Saweria] Received donations:', donations);
        
        donations.forEach(donation => {
            const donationData = {
                name: donation.donator || 'Anonymous',
                amount: parseInt(donation.amount) || 0,
                message: donation.message || '',
                timestamp: new Date().toISOString(),
                id: `${Date.now()}_${Math.random()}`
            };
            
            // Tambah ke list donasi baru
            newDonations.push(donationData);
            allDonations.push(donationData);
            
            console.log(`[Donation] ${donationData.name} donated Rp ${donationData.amount}`);
        });
    });
    
    isConnected = true;
    console.log('[Saweria] Connected and listening for donations!');
}

// Fungsi untuk setup Saweria dengan Login (ALTERNATIVE)
function setupWithLogin() {
    console.log('[Saweria] Logging in...');
    
    saweriaClient.on('login', (user) => {
        console.log('[Saweria] Logged in as:', user.username);
        isConnected = true;
    });
    
    saweriaClient.on('donations', (donations) => {
        console.log('[Saweria] Received donations:', donations);
        
        donations.forEach(donation => {
            const donationData = {
                name: donation.donator || 'Anonymous',
                amount: parseInt(donation.amount) || 0,
                message: donation.message || '',
                timestamp: new Date().toISOString(),
                id: `${Date.now()}_${Math.random()}`
            };
            
            newDonations.push(donationData);
            allDonations.push(donationData);
            
            console.log(`[Donation] ${donationData.name} donated Rp ${donationData.amount}`);
        });
    });
    
    // Login
    saweriaClient.login(CONFIG.SAWERIA_EMAIL, CONFIG.SAWERIA_PASSWORD)
        .catch(err => {
            console.error('[Saweria] Login failed:', err);
        });
}

// ENDPOINT UNTUK ROBLOX
// Endpoint utama yang di-request oleh Roblox
app.get('/check-donation', (req, res) => {
    // Cek secret token untuk keamanan
    const token = req.headers['authorization'] || req.query.token;
    
    if (token !== CONFIG.SECRET_TOKEN) {
        return res.status(403).json({ error: 'Invalid token' });
    }
    
    // Kirim donasi baru ke Roblox
    if (newDonations.length > 0) {
        const donations = [...newDonations];
        newDonations = []; // Clear setelah dikirim
        
        return res.json({
            success: true,
            newDonations: donations,
            timestamp: new Date().toISOString()
        });
    }
    
    // Tidak ada donasi baru
    res.json({
        success: true,
        newDonations: [],
        timestamp: new Date().toISOString()
    });
});

// Endpoint untuk cek status server
app.get('/status', (req, res) => {
    res.json({
        status: 'online',
        connected: isConnected,
        totalDonations: allDonations.length,
        pendingDonations: newDonations.length,
        timestamp: new Date().toISOString()
    });
});

// Endpoint untuk mendapatkan semua donasi (untuk initial load)
app.get('/all-donations', (req, res) => {
    const token = req.headers['authorization'] || req.query.token;
    
    if (token !== CONFIG.SECRET_TOKEN) {
        return res.status(403).json({ error: 'Invalid token' });
    }
    
    res.json({
        success: true,
        donations: allDonations,
        total: allDonations.length
    });
});

// Endpoint untuk testing manual (tambah donasi fake)
app.post('/test-donation', (req, res) => {
    const token = req.headers['authorization'] || req.query.token;
    
    if (token !== CONFIG.SECRET_TOKEN) {
        return res.status(403).json({ error: 'Invalid token' });
    }
    
    const { name, amount } = req.body;
    
    if (!name || !amount) {
        return res.status(400).json({ error: 'Name and amount required' });
    }
    
    const testDonation = {
        name: name,
        amount: parseInt(amount),
        message: 'Test donation',
        timestamp: new Date().toISOString(),
        id: `test_${Date.now()}`
    };
    
    newDonations.push(testDonation);
    allDonations.push(testDonation);
    
    console.log('[Test] Added test donation:', testDonation);
    
    res.json({
        success: true,
        donation: testDonation
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Saweria Webhook Server</title>
                <style>
                    body { font-family: Arial; padding: 20px; background: #1a1a1a; color: #fff; }
                    .container { max-width: 800px; margin: 0 auto; }
                    .status { padding: 20px; background: #2a2a2a; border-radius: 10px; margin: 20px 0; }
                    .connected { color: #00ff00; }
                    .disconnected { color: #ff0000; }
                    code { background: #000; padding: 2px 5px; border-radius: 3px; }
                    h1 { color: #00ff88; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🎉 Saweria Webhook Server</h1>
                    <div class="status">
                        <h2>Status: <span class="${isConnected ? 'connected' : 'disconnected'}">${isConnected ? '✅ Connected' : '❌ Disconnected'}</span></h2>
                        <p>Total Donations: <strong>${allDonations.length}</strong></p>
                        <p>Pending: <strong>${newDonations.length}</strong></p>
                    </div>
                    
                    <h3>📡 Endpoints:</h3>
                    <ul>
                        <li><code>GET /check-donation?token=YOUR_TOKEN</code> - Cek donasi baru untuk Roblox</li>
                        <li><code>GET /status</code> - Status server</li>
                        <li><code>GET /all-donations?token=YOUR_TOKEN</code> - Semua donasi</li>
                        <li><code>POST /test-donation?token=YOUR_TOKEN</code> - Test donasi (body: {name, amount})</li>
                    </ul>
                    
                    <h3>🔧 Setup:</h3>
                    <ol>
                        <li>Set environment variables di hosting Anda</li>
                        <li>Gunakan URL server ini di Roblox script</li>
                        <li>Pastikan HTTPS diaktifkan</li>
                    </ol>
                </div>
            </body>
        </html>
    `);
});

// Start server
app.listen(CONFIG.PORT, () => {
    console.log(`[Server] Running on port ${CONFIG.PORT}`);
    console.log(`[Server] Secret Token: ${CONFIG.SECRET_TOKEN}`);
    
    // Pilih metode koneksi (Stream Key lebih mudah dan aman)
    if (CONFIG.SAWERIA_STREAM_KEY && CONFIG.SAWERIA_STREAM_KEY !== 'your-stream-key') {
        setupWithStreamKey();
    } else if (CONFIG.SAWERIA_EMAIL && CONFIG.SAWERIA_PASSWORD) {
        setupWithLogin();
    } else {
        console.error('[Error] Please set SAWERIA_STREAM_KEY or SAWERIA_EMAIL/PASSWORD in environment variables!');
    }
});

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('[Error] Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('[Error] Uncaught exception:', error);
});
