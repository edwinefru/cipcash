const express = require('express');
const router = express.Router();

// Transaction analytics
router.get('/transactions/summary', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Simulate analytics data
    const summary = {
      totalTransactions: 1247,
      totalVolume: 892400,
      averageTransaction: 716.2,
      successRate: 98.7,
      topCountries: [
        { country: 'Nigeria', volume: 324500, percentage: 36.4 },
        { country: 'Ghana', volume: 198600, percentage: 22.3 },
        { country: 'Kenya', volume: 167300, percentage: 18.7 },
        { country: 'South Africa', volume: 134200, percentage: 15.0 },
        { country: 'Cameroon', volume: 67800, percentage: 7.6 }
      ],
      dailyTrends: generateDailyTrends(period)
    };
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User growth analytics
router.get('/users/growth', async (req, res) => {
  try {
    const growth = {
      totalUsers: 12847,
      newUsersToday: 43,
      activeUsers: 8932,
      kycPendingUsers: 234,
      verifiedUsers: 11890,
      monthlyGrowth: [
        { month: 'Sep', users: 12847 },
        { month: 'Aug', users: 11923 },
        { month: 'Jul', users: 10856 },
        { month: 'Jun', users: 9743 },
        { month: 'May', users: 8621 },
        { month: 'Apr', users: 7492 }
      ]
    };
    
    res.json(growth);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Revenue analytics
router.get('/revenue/summary', async (req, res) => {
  try {
    const revenue = {
      totalRevenue: 89240,
      monthlyRevenue: 23890,
      revenueGrowth: 12.4,
      averageRevenuePerUser: 6.94,
      revenueBySource: [
        { source: 'Transfer Fees', amount: 45600, percentage: 51.2 },
        { source: 'Exchange Rate Margin', amount: 32400, percentage: 36.3 },
        { source: 'Premium Features', amount: 11240, percentage: 12.5 }
      ]
    };
    
    res.json(revenue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Compliance metrics
router.get('/compliance/metrics', async (req, res) => {
  try {
    const compliance = {
      kycCompletionRate: 92.3,
      amlFlagged: 23,
      suspiciousTransactions: 12,
      complianceScore: 96.8,
      regulatoryReports: {
        pending: 2,
        submitted: 45,
        approved: 43
      }
    };
    
    res.json(compliance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function generateDailyTrends(period) {
  const days = period === '30d' ? 30 : 7;
  const trends = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    trends.push({
      date: date.toISOString().split('T')[0],
      transactions: Math.floor(Math.random() * 100) + 50,
      volume: Math.floor(Math.random() * 50000) + 25000
    });
  }
  
  return trends;
}

module.exports = router;