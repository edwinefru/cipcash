const express = require('express');
const router = express.Router();

// Chat system routes for real-time messaging
router.post('/rooms', async (req, res) => {
  try {
    const { participants, room_type, title } = req.body;
    
    // In production, integrate with database
    const chatRoom = {
      id: Date.now().toString(),
      participants,
      room_type,
      title,
      created_at: new Date().toISOString()
    };
    
    res.json(chatRoom);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/rooms/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Mock chat rooms for demo
    const chatRooms = [
      {
        id: '1',
        participants: [userId, 'admin'],
        room_type: 'admin_user',
        title: 'Customer Support',
        last_message: 'How can we help you today?',
        last_message_time: new Date().toISOString(),
        created_at: new Date().toISOString()
      }
    ];
    
    res.json(chatRooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/messages', async (req, res) => {
  try {
    const { message, chat_room_id, receiver_id, sender_id } = req.body;
    
    const chatMessage = {
      id: Date.now().toString(),
      sender_id: sender_id || 'user',
      receiver_id,
      message,
      chat_room_id,
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString()
    };
    
    // Emit to Socket.IO room
    const io = req.app.get('io');
    if (io) {
      io.to(`room_${chat_room_id}`).emit('new_message', chatMessage);
    }
    
    res.json(chatMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/messages/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Mock messages for demo
    const messages = [
      {
        id: '1',
        sender_id: 'admin',
        receiver_id: 'user',
        message: 'Hello! How can I help you today?',
        chat_room_id: roomId,
        message_type: 'text',
        is_read: true,
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        sender_id: 'user',
        receiver_id: 'admin',
        message: 'I have a question about my transfer.',
        chat_room_id: roomId,
        message_type: 'text',
        is_read: true,
        created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString()
      }
    ];
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;