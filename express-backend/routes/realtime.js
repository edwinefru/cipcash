const express = require('express');
const router = express.Router();

// Live transaction tracking
router.get('/transactions/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Simulate transaction status check
    const statuses = ['pending', 'processing', 'sent', 'delivered'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    res.json({
      transactionId: id,
      status: randomStatus,
      timestamp: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Live exchange rates
router.get('/exchange-rates/live', async (req, res) => {
  try {
    // Simulate live rates with small fluctuations
    const baseRates = {
      'USD-NGN': 460,
      'USD-GHS': 12,
      'USD-KES': 130,
      'USD-XAF': 600,
      'USD-ZAR': 18.5
    };
    
    const liveRates = {};
    Object.entries(baseRates).forEach(([pair, rate]) => {
      // Add small random fluctuation (±2%)
      const fluctuation = (Math.random() - 0.5) * 0.04;
      liveRates[pair] = {
        rate: rate * (1 + fluctuation),
        change: fluctuation * 100,
        timestamp: new Date().toISOString()
      };
    });
    
    res.json(liveRates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User activity feed
router.get('/activity/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Simulate user activity
    const activities = [
      {
        id: '1',
        type: 'transaction_sent',
        message: 'Money sent to Nigeria',
        amount: '$250',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        type: 'kyc_approved',
        message: 'KYC verification approved',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;