const express = require('express');
const router = express.Router();

// Send push notification
router.post('/send', async (req, res) => {
  try {
    const { userId, title, message, type = 'info' } = req.body;
    
    const notification = {
      id: Date.now().toString(),
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    // In production, integrate with FCM, APNs, etc.
    console.log(`Sending notification to user ${userId}:`, notification);
    
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user notifications
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Simulate notifications
    const notifications = [
      {
        id: '1',
        title: 'Transaction Completed',
        message: 'Your money transfer to Nigeria has been delivered successfully',
        type: 'success',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        read: false
      },
      {
        id: '2',
        title: 'Rate Alert',
        message: 'USD to NGN rate improved! Great time to send money.',
        type: 'info',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        read: true
      }
    ];
    
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.put('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    // In production, update database
    console.log(`Marking notification ${notificationId} as read`);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;