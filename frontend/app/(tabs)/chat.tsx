import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import io, { Socket } from 'socket.io-client';

const API_BASE_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || '';
const SOCKET_URL = API_BASE_URL.replace(':8001', ':8002'); // Express backend for Socket.IO

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: string;
  chat_room_id: string;
  is_read: boolean;
  created_at: string;
}

interface ChatRoom {
  id: string;
  participants: string[];
  room_type: string;
  title: string;
  last_message?: string;
  last_message_time?: string;
  created_at: string;
}

interface User {
  id: string;
  kyc_data: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const SupportChatScreen: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const socketRef = useRef<Socket | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadUserData();
    initializeSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (user && isConnected) {
      loadChatRooms();
    }
  }, [user, isConnected]);

  useEffect(() => {
    if (currentRoom) {
      loadMessages();
    }
  }, [currentRoom]);

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeSocket = () => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to chat server');
      setIsConnected(true);
      
      // Authenticate user
      if (user) {
        socketRef.current?.emit('authenticate', {
          userId: user.id,
          authToken: 'dummy-token' // In production, use real auth token
        });
      }
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from chat server');
      setIsConnected(false);
    });

    socketRef.current.on('message', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    socketRef.current.on('notification', (notification) => {
      console.log('New notification:', notification);
    });
  };

  const loadChatRooms = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/chat/rooms`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const rooms = await response.json();
        setChatRooms(rooms);
        
        // If no rooms exist, create a support room
        if (rooms.length === 0) {
          await createSupportRoom();
        }
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error);
    }
  };

  const createSupportRoom = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/chat/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          participants: [user?.id, 'admin'],
          room_type: 'admin_user',
          title: 'Customer Support'
        }),
      });

      if (response.ok) {
        const newRoom = await response.json();
        setChatRooms([newRoom]);
        setCurrentRoom(newRoom);
      }
    } catch (error) {
      console.error('Error creating support room:', error);
    }
  };

  const loadMessages = async () => {
    if (!currentRoom) return;

    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/chat/messages/${currentRoom.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const messagesData = await response.json();
        setMessages(messagesData);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentRoom || !user) return;

    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: newMessage,
          chat_room_id: currentRoom.id,
          receiver_id: 'admin'
        }),
      });

      if (response.ok) {
        const message = await response.json();
        setMessages(prev => [...prev, message]);
        setNewMessage('');
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderChatRooms = () => (
    <View style={styles.roomsList}>
      <Text style={styles.roomsTitle}>Support Conversations</Text>
      {chatRooms.length === 0 ? (
        <TouchableOpacity style={styles.createRoomButton} onPress={createSupportRoom}>
          <Ionicons name="add-circle" size={24} color="#007AFF" />
          <Text style={styles.createRoomText}>Start Support Chat</Text>
        </TouchableOpacity>
      ) : (
        chatRooms.map((room) => (
          <TouchableOpacity
            key={room.id}
            style={[styles.roomItem, currentRoom?.id === room.id && styles.roomItemActive]}
            onPress={() => setCurrentRoom(room)}
          >
            <View style={styles.roomIcon}>
              <Ionicons name="headset" size={24} color="#007AFF" />
            </View>
            <View style={styles.roomDetails}>
              <Text style={styles.roomTitle}>{room.title}</Text>
              <Text style={styles.roomLastMessage}>
                {room.last_message || 'Start a conversation'}
              </Text>
            </View>
            <View style={styles.roomMeta}>
              <Text style={styles.roomTime}>
                {room.last_message_time ? formatTime(room.last_message_time) : ''}
              </Text>
              <View style={[styles.connectionStatus, isConnected && styles.connectionStatusOnline]} />
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderChat = () => {
    if (!currentRoom) {
      return (
        <View style={styles.noChatSelected}>
          <Ionicons name="chatbubbles-outline" size={64} color="#C7C7CC" />
          <Text style={styles.noChatText}>Select a conversation to start chatting</Text>
        </View>
      );
    }

    return (
      <View style={styles.chatContainer}>
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentRoom(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderTitle}>{currentRoom.title}</Text>
            <Text style={styles.chatHeaderStatus}>
              {isConnected ? 'Online' : 'Connecting...'}
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubble-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyChatText}>No messages yet</Text>
              <Text style={styles.emptyChatSubtext}>
                Send a message to start the conversation
              </Text>
            </View>
          ) : (
            messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.sender_id === user?.id ? styles.myMessage : styles.theirMessage
                ]}
              >
                <View style={[
                  styles.messageBubble,
                  message.sender_id === user?.id ? styles.myMessageBubble : styles.theirMessageBubble
                ]}>
                  <Text style={[
                    styles.messageText,
                    message.sender_id === user?.id ? styles.myMessageText : styles.theirMessageText
                  ]}>
                    {message.message}
                  </Text>
                  <Text style={[
                    styles.messageTime,
                    message.sender_id === user?.id ? styles.myMessageTime : styles.theirMessageTime
                  ]}>
                    {formatTime(message.created_at)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.messageInputContainer}
        >
          <View style={styles.messageInputWrapper}>
            <TextInput
              style={styles.messageInput}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type your message..."
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            >
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {currentRoom ? renderChat() : renderChatRooms()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  roomsList: {
    flex: 1,
    padding: 20,
  },
  roomsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  createRoomButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  createRoomText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 12,
  },
  roomItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  roomItemActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  roomIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roomDetails: {
    flex: 1,
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  roomLastMessage: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  roomMeta: {
    alignItems: 'flex-end',
  },
  roomTime: {
    fontSize: 12,
    color: '#C7C7CC',
    marginBottom: 4,
  },
  connectionStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  connectionStatusOnline: {
    backgroundColor: '#30D158',
  },
  noChatSelected: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noChatText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    marginRight: 12,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  chatHeaderStatus: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyChatText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
    marginTop: 8,
  },
  messageContainer: {
    marginBottom: 12,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  theirMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  myMessageBubble: {
    backgroundColor: '#007AFF',
  },
  theirMessageBubble: {
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: 'white',
  },
  theirMessageText: {
    color: '#1C1C1E',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  theirMessageTime: {
    color: '#8E8E93',
  },
  messageInputContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  messageInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    gap: 12,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default SupportChatScreen;