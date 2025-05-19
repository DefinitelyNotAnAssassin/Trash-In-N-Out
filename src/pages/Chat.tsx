"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonSearchbar,
  IonSpinner,
  IonButton,
  IonIcon,
  IonBadge,
  IonFooter,
  IonTextarea,
  IonFab,
  IonFabButton,
  IonModal,
  IonButtons,
  IonRefresher,
  IonRefresherContent,
  IonToast,
} from "@ionic/react"
import { chatbubbleEllipses, send, personAdd, arrowBack, checkmarkDone, checkmark, close } from "ionicons/icons"
import { useAuth, getUserDataFromStorage } from "../contexts/AuthContext"
import { firestore } from "../firebase"
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore"
import "./Chat.css"

interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  recipientId: string
  recipientName: string
  message: string
  timestamp: Date
  read: boolean
}

interface ChatPartner {
  id: string
  name: string
  role: string
  lastMessage?: string
  lastMessageTime?: Date
  unreadCount: number
}

interface UserData {
  uid: string
  name: string
  role: string
  email: string
}

const Chat: React.FC = () => {
  const { userData } = useAuth()
  const storedUserData = getUserDataFromStorage()
  const userInfo = userData || storedUserData

  const [view, setView] = useState<"list" | "chat">("list")
  const [chatPartners, setChatPartners] = useState<ChatPartner[]>([])
  const [filteredPartners, setFilteredPartners] = useState<ChatPartner[]>([])
  const [searchText, setSearchText] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedPartner, setSelectedPartner] = useState<ChatPartner | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<UserData[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([])
  const [userSearchText, setUserSearchText] = useState("")
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLIonContentElement>(null)
  const messageInputRef = useRef<HTMLIonTextareaElement>(null)

  // Fetch chat partners
  useEffect(() => {
    if (!userInfo?.uid) return

    setLoading(true)

    // Get all chats where the current user is either sender or recipient
    const chatsRef = collection(firestore, "chats")
    const q = query(chatsRef, where("participants", "array-contains", userInfo.uid), orderBy("lastMessageTime", "desc"))

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const partners: ChatPartner[] = []

        for (const chatDoc of snapshot.docs) {
          const data = chatDoc.data()
          const participants = data.participants

          // Find the other participant (not the current user)
          const partnerId = participants.find((id: string) => id !== userInfo.uid)

          if (partnerId) {
            try {
              // Get partner details
              const partnerDocRef = doc(firestore, "users", partnerId)
              const partnerDocSnap = await getDoc(partnerDocRef)

              if (partnerDocSnap.exists()) {
                const partnerData = partnerDocSnap.data()

                // Get unread count
                const messagesRef = collection(firestore, "messages")
                const unreadQuery = query(
                  messagesRef,
                  where("chatId", "==", chatDoc.id),
                  where("recipientId", "==", userInfo.uid),
                  where("read", "==", false),
                )

                const unreadSnapshot = await getDocs(unreadQuery)

                partners.push({
                  id: partnerId,
                  name: partnerData.name,
                  role: partnerData.role,
                  lastMessage: data.lastMessage,
                  lastMessageTime: data.lastMessageTime?.toDate ? data.lastMessageTime.toDate() : null,
                  unreadCount: unreadSnapshot.size,
                })
              }
            } catch (error) {
              console.error("Error fetching partner details:", error)
            }
          }
        }

        setChatPartners(partners)
        setFilteredPartners(partners)
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching chat partners:", error)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [userInfo?.uid])

  // Filter chat partners based on search
  useEffect(() => {
    if (searchText) {
      const filtered = chatPartners.filter((partner) => partner.name.toLowerCase().includes(searchText.toLowerCase()))
      setFilteredPartners(filtered)
    } else {
      setFilteredPartners(chatPartners)
    }
  }, [searchText, chatPartners])

  // Fetch messages for selected chat
  useEffect(() => {
    if (!userInfo?.uid || !selectedPartner) return

    // Find or create chat document
    const getChatId = async () => {
      const chatsRef = collection(firestore, "chats")

      // Check if chat already exists
      const q = query(chatsRef, where("participants", "array-contains", userInfo.uid))

      const snapshot = await getDocs(q)
      let chatId = null

      for (const chatDoc of snapshot.docs) {
        const data = chatDoc.data()
        if (data.participants.includes(selectedPartner.id)) {
          chatId = chatDoc.id
          break
        }
      }

      // If chat doesn't exist, create it
      if (!chatId) {
        const newChatRef = await addDoc(chatsRef, {
          participants: [userInfo.uid, selectedPartner.id],
          lastMessage: "",
          lastMessageTime: serverTimestamp(),
          createdAt: serverTimestamp(),
        })
        chatId = newChatRef.id
      }

      return chatId
    }

    const fetchMessages = async () => {
      const chatId = await getChatId()

      // Get messages
      const messagesRef = collection(firestore, "messages")
      const q = query(messagesRef, where("chatId", "==", chatId), orderBy("timestamp", "asc"))

      return onSnapshot(
        q,
        (snapshot) => {
          const msgs: ChatMessage[] = []

          snapshot.forEach((doc) => {
            const data = doc.data()
            msgs.push({
              id: doc.id,
              senderId: data.senderId,
              senderName: data.senderName,
              recipientId: data.recipientId,
              recipientName: data.recipientName,
              message: data.message,
              timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
              read: data.read,
            })
          })

          setMessages(msgs)

          // Mark messages as read
          snapshot.docs.forEach(async (doc) => {
            const data = doc.data()
            if (data.recipientId === userInfo.uid && !data.read) {
              await updateDoc(doc.ref, { read: true })
            }
          })

          // Scroll to bottom
          scrollToBottom()
        },
        (error) => {
          console.error("Error fetching messages:", error)
        },
      )
    }

    const unsubscribe = fetchMessages()

    // Return cleanup function
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe()
      }
    }
  }, [userInfo?.uid, selectedPartner])

  // Fetch available users for new chat
  useEffect(() => {
    if (!showNewChatModal || !userInfo?.uid) return

    const fetchUsers = async () => {
      try {
        const usersRef = collection(firestore, "users")
        let q

        // If current user is resident, only show junkshop owners
        // If current user is junkshop owner, only show residents
        if (userInfo.role === "resident") {
          q = query(usersRef, where("role", "==", "junkshop"))
        } else {
          q = query(usersRef, where("role", "==", "resident"))
        }

        const snapshot = await getDocs(q)
        const users: UserData[] = []

        snapshot.forEach((doc) => {
          const data = doc.data()
          users.push({
            uid: doc.id,
            name: data.name,
            role: data.role,
            email: data.email,
          })
        })

        // Filter out users that are already chat partners
        const filteredUsers = users.filter((user) => !chatPartners.some((partner) => partner.id === user.uid))

        setAvailableUsers(filteredUsers)
        setFilteredUsers(filteredUsers)
      } catch (error) {
        console.error("Error fetching users:", error)
      }
    }

    fetchUsers()
  }, [showNewChatModal, userInfo?.uid, userInfo?.role, chatPartners])

  // Filter available users based on search
  useEffect(() => {
    if (userSearchText) {
      const filtered = availableUsers.filter(
        (user) =>
          user.name.toLowerCase().includes(userSearchText.toLowerCase()) ||
          user.email.toLowerCase().includes(userSearchText.toLowerCase()),
      )
      setFilteredUsers(filtered)
    } else {
      setFilteredUsers(availableUsers)
    }
  }, [userSearchText, availableUsers])

  const scrollToBottom = () => {
    setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.scrollToBottom(300)
      }
    }, 100)
  }

  const handleSendMessage = async () => {
    // Get message directly from the DOM to avoid delay
    const messageValue = (messageInputRef.current?.value as string) || newMessage

    if (!messageValue.trim() || !userInfo || !selectedPartner) return

    try {
      // Find chat ID
      const chatsRef = collection(firestore, "chats")
      const q = query(chatsRef, where("participants", "array-contains", userInfo.uid))

      const snapshot = await getDocs(q)
      let chatId = null

      for (const chatDoc of snapshot.docs) {
        const data = chatDoc.data()
        if (data.participants.includes(selectedPartner.id)) {
          chatId = chatDoc.id
          break
        }
      }

      if (!chatId) {
        const newChatRef = await addDoc(chatsRef, {
          participants: [userInfo.uid, selectedPartner.id],
          lastMessage: messageValue,
          lastMessageTime: serverTimestamp(),
          createdAt: serverTimestamp(),
        })
        chatId = newChatRef.id
      } else {
        // Update last message
        const chatRef = doc(firestore, "chats", chatId)
        await updateDoc(chatRef, {
          lastMessage: messageValue,
          lastMessageTime: serverTimestamp(),
        })
      }

      // Add message
      await addDoc(collection(firestore, "messages"), {
        chatId,
        senderId: userInfo.uid,
        senderName: userInfo.name,
        recipientId: selectedPartner.id,
        recipientName: selectedPartner.name,
        message: messageValue,
        timestamp: serverTimestamp(),
        read: false,
      })

      // Clear input field directly
      if (messageInputRef.current) {
        messageInputRef.current.value = ""
      }
      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
      setToastMessage("Failed to send message. Please try again.")
      setShowToast(true)
    }
  }

  // Handle message input changes directly without delay
  const handleMessageChange = (e: CustomEvent) => {
    const value = e.detail.value || ""
    setNewMessage(value)
  }

  // Handle search input changes directly without delay
  const handleSearchChange = (e: CustomEvent) => {
    const value = e.detail.value || ""
    setSearchText(value)
  }

  // Handle user search input changes directly without delay
  const handleUserSearchChange = (e: CustomEvent) => {
    const value = e.detail.value || ""
    setUserSearchText(value)
  }

  const handleStartNewChat = async (user: UserData) => {
    try {
      // Create new chat
      const chatsRef = collection(firestore, "chats")
      const newChatRef = await addDoc(chatsRef, {
        participants: [userInfo?.uid, user.uid],
        lastMessage: "",
        lastMessageTime: serverTimestamp(),
        createdAt: serverTimestamp(),
      })

      // Add to chat partners
      const newPartner: ChatPartner = {
        id: user.uid,
        name: user.name,
        role: user.role,
        unreadCount: 0,
      }

      setSelectedPartner(newPartner)
      setView("chat")
      setShowNewChatModal(false)

      setToastMessage(`Chat started with ${user.name}`)
      setShowToast(true)
    } catch (error) {
      console.error("Error starting new chat:", error)
      setToastMessage("Failed to start chat. Please try again.")
      setShowToast(true)
    }
  }

  const formatTime = (date: Date | undefined | null) => {
    if (!date) return ""

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date >= today) {
      // Today, show time
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (date >= yesterday) {
      // Yesterday
      return "Yesterday"
    } else {
      // Older, show date
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  const handleRefresh = (event: CustomEvent) => {
    // Refresh chat list or messages
    if (view === "list") {
      // Refresh will happen automatically due to the onSnapshot listener
    } else if (view === "chat") {
      // Messages will refresh automatically due to the onSnapshot listener
    }

    setTimeout(() => {
      event.detail.complete()
    }, 1000)
  }

  // Handle Enter key to send message
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <IonPage>
      {view === "list" ? (
        <>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Chats</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
              <IonRefresherContent></IonRefresherContent>
            </IonRefresher>

            <IonSearchbar
              value={searchText}
              onIonInput={handleSearchChange}
              placeholder="Search chats"
              className="p-2"
              debounce={0}
            />

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <IonSpinner name="crescent" />
              </div>
            ) : filteredPartners.length > 0 ? (
              <IonList>
                {filteredPartners.map((partner) => (
                  <IonItem
                    key={partner.id}
                    button
                    onClick={() => {
                      setSelectedPartner(partner)
                      setView("chat")
                    }}
                    className="py-2"
                  >
                    <IonAvatar slot="start" className="bg-gray-200 flex items-center justify-center">
                      <div className="text-lg font-bold text-gray-600">{partner.name.charAt(0).toUpperCase()}</div>
                    </IonAvatar>
                    <IonLabel>
                      <h2 className="font-medium">{partner.name}</h2>
                      <p className="text-sm text-gray-500 truncate">{partner.lastMessage || "No messages yet"}</p>
                    </IonLabel>
                    <div className="flex flex-col items-end">
                      {partner.lastMessageTime && (
                        <span className="text-xs text-gray-500 mb-1">{formatTime(partner.lastMessageTime)}</span>
                      )}
                      {partner.unreadCount > 0 && <IonBadge color="primary">{partner.unreadCount}</IonBadge>}
                    </div>
                  </IonItem>
                ))}
              </IonList>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
                <IonIcon icon={chatbubbleEllipses} className="text-gray-400 text-6xl mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No chats yet</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {userInfo?.role === "resident"
                    ? "Start a conversation with a junkshop owner"
                    : "Start a conversation with a resident"}
                </p>
                <IonButton expand="block" onClick={() => setShowNewChatModal(true)}>
                  Start New Chat
                </IonButton>
              </div>
            )}

            <IonFab vertical="bottom" horizontal="end" slot="fixed">
              <IonFabButton onClick={() => setShowNewChatModal(true)}>
                <IonIcon icon={personAdd} />
              </IonFabButton>
            </IonFab>
          </IonContent>
        </>
      ) : (
        <>
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setView("list")}>
                  <IonIcon icon={arrowBack} />
                </IonButton>
              </IonButtons>
              <IonTitle>{selectedPartner?.name}</IonTitle>
              <IonButtons slot="end">
                <IonBadge color={selectedPartner?.role === "resident" ? "success" : "primary"}>
                  {selectedPartner?.role === "resident" ? "Resident" : "Junkshop"}
                </IonBadge>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent ref={contentRef} className="chat-content">
            <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
              <IonRefresherContent></IonRefresherContent>
            </IonRefresher>

            <div className="chat-container">
              {messages.length === 0 ? (
                <div className="empty-chat">
                  <IonIcon icon={chatbubbleEllipses} className="empty-chat-icon" />
                  <h3 className="empty-chat-title">No messages yet</h3>
                  <p className="empty-chat-subtitle">Send a message to start the conversation</p>
                </div>
              ) : (
                <div className="messages-container">
                  {messages.map((msg, index) => {
                    const isSender = msg.senderId === userInfo?.uid
                    const showDate =
                      index === 0 ||
                      new Date(msg.timestamp).toDateString() !== new Date(messages[index - 1].timestamp).toDateString()

                    return (
                      <React.Fragment key={msg.id}>
                        {showDate && (
                          <div className="date-separator">
                            <div className="date-bubble">
                              {new Date(msg.timestamp).toLocaleDateString([], {
                                weekday: "long",
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                          </div>
                        )}
                        <div className={`message-row ${isSender ? "message-row-sender" : "message-row-receiver"}`}>
                          <div
                            className={`message-bubble ${isSender ? "message-bubble-sender" : "message-bubble-receiver"}`}
                          >
                            <p className="message-text">{msg.message}</p>
                            <div
                              className={`message-meta ${isSender ? "message-meta-sender" : "message-meta-receiver"}`}
                            >
                              <span className="message-time">
                                {new Date(msg.timestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {isSender && (
                                <IonIcon icon={msg.read ? checkmarkDone : checkmark} className="message-status" />
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </IonContent>
          <IonFooter className="chat-footer">
            <div className="message-input-container">
              <IonTextarea
                value={newMessage}
                onIonInput={handleMessageChange}
                placeholder="Type a message"
                autoGrow={true}
                rows={1}
                maxlength={500}
                className="message-input"
                ref={messageInputRef}
                debounce={0}
                onKeyDown={handleKeyDown}
              />
              <IonButton fill="clear" onClick={handleSendMessage} disabled={!newMessage.trim()} className="send-button">
                <IonIcon icon={send} slot="icon-only" />
              </IonButton>
            </div>
          </IonFooter>
        </>
      )}

      {/* New Chat Modal */}
      <IonModal isOpen={showNewChatModal} onDidDismiss={() => setShowNewChatModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>{userInfo?.role === "resident" ? "Select Junkshop Owner" : "Select Resident"}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowNewChatModal(false)}>
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonSearchbar
            value={userSearchText}
            onIonInput={handleUserSearchChange}
            placeholder="Search by name or email"
            className="p-2"
            debounce={0}
          />

          {filteredUsers.length > 0 ? (
            <IonList>
              {filteredUsers.map((user) => (
                <IonItem key={user.uid} button onClick={() => handleStartNewChat(user)}>
                  <IonAvatar slot="start" className="bg-gray-200 flex items-center justify-center">
                    <div className="text-lg font-bold text-gray-600">{user.name.charAt(0).toUpperCase()}</div>
                  </IonAvatar>
                  <IonLabel>
                    <h2>{user.name}</h2>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
              <IonIcon icon={personAdd} className="text-gray-400 text-6xl mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No users found</h3>
              <p className="text-sm text-gray-500">
                {userInfo?.role === "resident" ? "No junkshop owners available" : "No residents available"}
              </p>
            </div>
          )}
        </IonContent>
      </IonModal>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={2000}
        position="bottom"
      />
    </IonPage>
  )
}

export default Chat
