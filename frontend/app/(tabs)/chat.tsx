import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface ChatRoom {
  id: string;
  title: string;
  room_type: string;
  last_message?: string;
  last_message_time?: string;
  participants: string[];
}

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

const ChatScreen: React.FC = () => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChatRooms();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    try {
      const token = global.authToken;
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setCurrentUserId(userData.id);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const loadChatRooms = async () => {
    try {
      const token = global.authToken;
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/chat/rooms`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const rooms = await response.json();
        setChatRooms(rooms);
      } else {
        // If no chat rooms exist, create default ones
        await createDefaultChatRooms();
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error);
      await createDefaultChatRooms();
    } finally {
      setLoading(false);
    }
  };

  const createDefaultChatRooms = async () => {
    try {
      const token = global.authToken;
      if (!token) return;

      // Create admin support chat room
      const adminRoomResponse = await fetch(`${BACKEND_URL}/api/chat/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          participants: [currentUserId, 'admin'],
          room_type: 'admin_user',
          title: 'CipCash Support'
        }),
      });

      if (adminRoomResponse.ok) {
        loadChatRooms();
      }
    } catch (error) {
      console.error('Error creating default chat rooms:', error);
      // Show default empty state
      setChatRooms([]);
      setLoading(false);
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const token = global.authToken;
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/chat/messages/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const messagesData = await response.json();
        setMessages(messagesData);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom) return;

    try {
      const token = global.authToken;
      if (!token) return;

      const receiverId = selectedRoom.participants.find(p => p !== currentUserId) || 'admin';

      const response = await fetch(`${BACKEND_URL}/api/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: newMessage.trim(),
          chat_room_id: selectedRoom.id,
          receiver_id: receiverId,
        }),
      });

      if (response.ok) {
        const sentMessage = await response.json();
        setMessages(prev => [...prev, sentMessage]);
        setNewMessage('');
        
        // Update room's last message
        setChatRooms(prev => prev.map(room => 
          room.id === selectedRoom.id 
            ? { ...room, last_message: newMessage.trim(), last_message_time: new Date().toISOString() }
            : room
        ));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const selectRoom = (room: ChatRoom) => {
    setSelectedRoom(room);
    loadMessages(room.id);
  };

  const renderChatRoom = ({ item }: { item: ChatRoom }) => (
    <TouchableOpacity
      style={[
        styles.chatRoomItem,
        selectedRoom?.id === item.id && styles.selectedChatRoom
      ]}
      onPress={() => selectRoom(item)}
    >
      <BlurView intensity={20} style={styles.chatRoomContent}>
        <View style={styles.chatRoomIcon}>
          <Ionicons 
            name={item.room_type === 'admin_user' ? 'headset' : 'person'} 
            size={24} 
            color="#007AFF" 
          />
        </View>
        <View style={styles.chatRoomDetails}>
          <Text style={styles.chatRoomTitle}>{item.title}</Text>
          <Text style={styles.chatRoomLastMessage} numberOfLines={1}>
            {item.last_message || 'Start a conversation...'}
          </Text>
        </View>
        <View style={styles.chatRoomMeta}>
          {item.last_message_time && (
            <Text style={styles.chatRoomTime}>
              {new Date(item.last_message_time).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          )}
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>•</Text>
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwnMessage = item.sender_id === currentUserId;
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <BlurView 
          intensity={isOwnMessage ? 80 : 20} 
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
          ]}
        >
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.message}
          </Text>
          <Text style={[
            styles.messageTime,
            isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
          ]}>
            {new Date(item.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </BlurView>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#F2F2F7', '#E5E5EA']}
        style={styles.backgroundGradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <BlurView intensity={95} style={styles.header}>
            <Text style={styles.headerTitle}>Chat & Support</Text>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => Alert.alert('New Chat', 'Feature coming soon!')}
            >
              <Ionicons name="add" size={24} color="#007AFF" />
            </TouchableOpacity>
          </BlurView>

          <View style={styles.content}>
            {/* Chat Rooms List */}
            <View style={styles.chatRoomsContainer}>
              <Text style={styles.sectionTitle}>Conversations</Text>
              {chatRooms.length > 0 ? (
                <FlatList
                  data={chatRooms}
                  renderItem={renderChatRoom}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <BlurView intensity={20} style={styles.emptyChatRooms}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#C7C7CC" />
                  <Text style={styles.emptyText}>No conversations yet</Text>
                  <TouchableOpacity 
                    style={styles.startChatButton}
                    onPress={() => createDefaultChatRooms()}
                  >
                    <Text style={styles.startChatText}>Start Chat with Support</Text>
                  </TouchableOpacity>
                </BlurView>
              )}
            </View>

            {/* Chat Messages */}
            {selectedRoom && (
              <KeyboardAvoidingView 
                style={styles.chatContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              >
                <BlurView intensity={95} style={styles.chatHeader}>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setSelectedRoom(null)}
                  >
                    <Ionicons name="chevron-back" size={24} color="#007AFF" />
                  </TouchableOpacity>
                  <Text style={styles.chatTitle}>{selectedRoom.title}</Text>
                  <TouchableOpacity style={styles.chatOptionsButton}>
                    <Ionicons name="ellipsis-horizontal" size={24} color="#007AFF" />
                  </TouchableOpacity>
                </BlurView>

                <FlatList
                  data={messages}
                  renderItem={renderMessage}
                  keyExtractor={(item) => item.id}
                  style={styles.messagesList}
                  contentContainerStyle={styles.messagesContainer}
                  showsVerticalScrollIndicator={false}
                />

                <BlurView intensity={95} style={styles.messageInput}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Type your message..."
                      placeholderTextColor="#C7C7CC"
                      value={newMessage}
                      onChangeText={setNewMessage}
                      multiline
                      maxLength={500}
                    />
                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        newMessage.trim() && styles.sendButtonActive
                      ]}
                      onPress={sendMessage}
                      disabled={!newMessage.trim()}
                    >
                      <Ionicons 
                        name="send" 
                        size={20} 
                        color={newMessage.trim() ? "white" : "#C7C7CC"} 
                      />
                    </TouchableOpacity>
                  </View>
                </BlurView>
              </KeyboardAvoidingView>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,122,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  chatRoomsContainer: {
    width: selectedRoom ? '0%' : '100%',
    padding: selectedRoom ? 0 : 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  chatRoomItem: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  selectedChatRoom: {
    opacity: 0.7,
  },
  chatRoomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chatRoomIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,122,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatRoomDetails: {
    flex: 1,
  },
  chatRoomTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  chatRoomLastMessage: {
    fontSize: 14,
    color: '#8E8E93',
  },
  chatRoomMeta: {
    alignItems: 'flex-end',
  },
  chatRoomTime: {
    fontSize: 12,
    color: '#C7C7CC',
    marginBottom: 4,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCount: {
    fontSize: 8,
    color: 'white',
    fontWeight: 'bold',
  },
  emptyChatRooms: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 20,
  },
  startChatButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  startChatText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  backButton: {
    marginRight: 12,
  },
  chatTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  chatOptionsButton: {
    marginLeft: 12,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  messageContainer: {
    marginBottom: 16,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ownMessageBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 6,
  },
  otherMessageBubble: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 4,
  },
  ownMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 11,
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#8E8E93',
  },
  messageInput: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
  },
});

export default ChatScreen;