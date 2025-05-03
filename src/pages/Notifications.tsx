"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonIcon,
  IonLoading,
  IonRefresher,
  IonRefresherContent,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonAlert,
  IonToast,
  IonSkeletonText,
  IonButton,
} from "@ionic/react"
import { checkmarkDone, trash, notifications as notificationsIcon, mailUnreadOutline } from "ionicons/icons"
import { useAuth, getUserDataFromStorage } from "../contexts/AuthContext"
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  Timestamp,
  addDoc,
  onSnapshot,
} from "firebase/firestore"
import { firestore } from "../firebase"

interface Notification {
  id: string
  userId: string
  title: string
  message: string
  read: boolean
  createdAt: Date
  type: "request" | "status" | "reward" | "system"
  relatedId?: string
  deleted?: boolean
}

const Notifications: React.FC = () => {
  const { userData } = useAuth()
  const storedUserData = getUserDataFromStorage()
  const userInfo = userData || storedUserData

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState("")
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [unreadCount, setUnreadCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const isResident = userInfo?.role === "resident"

  // Use a real-time listener for notifications
  useEffect(() => {
    if (!userInfo?.uid) return

    setLoading(true)
    console.log("Setting up notifications listener for user:", userInfo.uid)

    try {
      const notificationsRef = collection(firestore, "notifications")

      // Create a query that doesn't filter on deleted field initially
      const q = query(notificationsRef, where("userId", "==", userInfo.uid), orderBy("createdAt", "desc"))

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const notificationsList: Notification[] = []
          let unread = 0

          snapshot.forEach((doc) => {
            const data = doc.data()

            // Skip deleted notifications in the client-side filtering
            if (data.deleted === true) return

            const notification = {
              id: doc.id,
              userId: data.userId,
              title: data.title || "Notification",
              message: data.message || "",
              read: data.read === true, // Default to false if not set
              createdAt: data.createdAt?.toDate() || new Date(),
              type: data.type || "system",
              relatedId: data.relatedId,
              deleted: data.deleted,
            }

            notificationsList.push(notification)

            if (!notification.read) {
              unread++
            }
          })

          console.log(`Fetched ${notificationsList.length} notifications, ${unread} unread`)
          setNotifications(notificationsList)
          setUnreadCount(unread)
          setLoading(false)
          setError(null)
        },
        (error) => {
          console.error("Error fetching notifications", error)
          setLoading(false)
          setError("Failed to load notifications. Please try again.")
          setToastMessage("Error loading notifications")
          setShowToast(true)
        },
      )

      // Clean up the listener when the component unmounts
      return () => unsubscribe()
    } catch (setupError) {
      console.error("Error setting up notifications listener", setupError)
      setLoading(false)
      setError("Failed to set up notifications. Please try again.")
    }
  }, [userInfo?.uid])

  const handleRefresh = async (event: CustomEvent) => {
    // Manual refresh in case the real-time listener isn't working
    try {
      await fetchNotificationsManually()
    } finally {
      event.detail.complete()
    }
  }

  // Backup method to fetch notifications manually
  const fetchNotificationsManually = async () => {
    if (!userInfo?.uid) return

    try {
      setLoading(true)
      console.log("Manually fetching notifications for user:", userInfo.uid)

      const notificationsRef = collection(firestore, "notifications")
      const q = query(notificationsRef, where("userId", "==", userInfo.uid), orderBy("createdAt", "desc"))

      const querySnapshot = await getDocs(q)
      const notificationsList: Notification[] = []
      let unread = 0

      querySnapshot.forEach((doc) => {
        const data = doc.data()

        // Skip deleted notifications
        if (data.deleted === true) return

        const notification = {
          id: doc.id,
          userId: data.userId,
          title: data.title || "Notification",
          message: data.message || "",
          read: data.read === true,
          createdAt: data.createdAt?.toDate() || new Date(),
          type: data.type || "system",
          relatedId: data.relatedId,
          deleted: data.deleted,
        }

        notificationsList.push(notification)

        if (!notification.read) {
          unread++
        }
      })

      console.log(`Manually fetched ${notificationsList.length} notifications, ${unread} unread`)
      setNotifications(notificationsList)
      setUnreadCount(unread)
      setError(null)
    } catch (error) {
      console.error("Error manually fetching notifications", error)
      setError("Failed to load notifications. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notification: Notification) => {
    if (notification.read) {
      // Already read, just show details
      setSelectedNotification(notification)
      setShowAlert(true)
      return
    }

    try {
      const notificationRef = doc(firestore, "notifications", notification.id)
      await updateDoc(notificationRef, {
        read: true,
      })

      // Update local state (the real-time listener will also update)
      setNotifications(notifications.map((n) => (n.id === notification.id ? { ...n, read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))

      // Show notification details
      setSelectedNotification(notification)
      setShowAlert(true)
    } catch (error) {
      console.error("Error marking notification as read", error)
      setToastMessage("Error marking notification as read")
      setShowToast(true)
    }
  }

  const markAllAsRead = async () => {
    if (unreadCount === 0) return

    try {
      setLoading(true)

      // Get all unread notifications
      const unreadNotifications = notifications.filter((n) => !n.read)

      // Update each notification
      const updatePromises = unreadNotifications.map((notification) => {
        const notificationRef = doc(firestore, "notifications", notification.id)
        return updateDoc(notificationRef, { read: true })
      })

      await Promise.all(updatePromises)

      // Update local state (the real-time listener will also update)
      setNotifications(notifications.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)

      setToastMessage("All notifications marked as read")
      setShowToast(true)
    } catch (error) {
      console.error("Error marking all notifications as read", error)
      setToastMessage("Error marking notifications as read")
      setShowToast(true)
    } finally {
      setLoading(false)
    }
  }

  const deleteNotification = async (notification: Notification) => {
    try {
      const notificationRef = doc(firestore, "notifications", notification.id)

      // Option 1: Mark as deleted (soft delete)
      await updateDoc(notificationRef, {
        deleted: true,
      })

      // Option 2: Hard delete (uncomment to use)
      // await deleteDoc(notificationRef)

      // Update local state (remove from list)
      setNotifications(notifications.filter((n) => n.id !== notification.id))
      if (!notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }

      setToastMessage("Notification deleted")
      setShowToast(true)
    } catch (error) {
      console.error("Error deleting notification", error)
      setToastMessage("Error deleting notification")
      setShowToast(true)
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    if (!requestId || !userInfo) return

    try {
      setLoading(true)

      // Update material request status
      const requestRef = doc(firestore, "materialRequests", requestId)
      await updateDoc(requestRef, {
        status: "accepted",
        acceptedBy: userInfo.uid,
        acceptedByName: userInfo.name,
        acceptedAt: Timestamp.now(),
      })

      // Create notification for resident
      const materialRequestsRef = collection(firestore, "materialRequests")
      const q = query(materialRequestsRef, where("__name__", "==", requestId))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        const requestData = querySnapshot.docs[0].data()

        // Notify the resident
        await addDoc(collection(firestore, "notifications"), {
          userId: requestData.userId,
          title: "Request Accepted",
          message: `Your recyclable material request has been accepted by ${userInfo.name}. They will collect it soon.`,
          read: false,
          createdAt: Timestamp.now(),
          type: "status",
          relatedId: requestId,
          deleted: false,
        })
      }

      setAlertMessage("Request accepted successfully!")
      setShowAlert(true)
      setSelectedNotification(null)

      // Refresh notifications
      fetchNotificationsManually()
    } catch (error) {
      console.error("Error accepting request", error)
      setAlertMessage("Error accepting request. Please try again.")
      setShowAlert(true)
    } finally {
      setLoading(false)
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "request":
        return "primary"
      case "status":
        return "success"
      case "reward":
        return "warning"
      default:
        return "medium"
    }
  }

  // Create a test notification for debugging
  const createTestNotification = async () => {
    if (!userInfo?.uid) return

    try {
      await addDoc(collection(firestore, "notifications"), {
        userId: userInfo.uid,
        title: "Test Notification",
        message: "This is a test notification to verify the system is working.",
        read: false,
        createdAt: Timestamp.now(),
        type: "system",
        deleted: false,
      })

      setToastMessage("Test notification created")
      setShowToast(true)
    } catch (error) {
      console.error("Error creating test notification", error)
      setToastMessage("Error creating test notification")
      setShowToast(true)
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Notifications {unreadCount > 0 && `(${unreadCount})`}</IonTitle>
          <IonButton slot="end" fill="clear" onClick={createTestNotification}>
            Test
          </IonButton>
          {unreadCount > 0 && (
            <IonButton slot="end" fill="clear" onClick={markAllAsRead}>
              Mark All Read
            </IonButton>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {loading && notifications.length === 0 ? (
          <div className="p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="mb-4">
                <div className="flex items-start">
                  <div className="mr-3">
                    <IonSkeletonText animated style={{ width: "40px", height: "20px" }} />
                  </div>
                  <div className="flex-1">
                    <IonSkeletonText animated style={{ width: "70%", height: "20px" }} />
                    <IonSkeletonText animated style={{ width: "90%", height: "16px" }} />
                    <IonSkeletonText animated style={{ width: "40%", height: "12px" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <p className="text-center text-red-500 mb-4">{error}</p>
            <IonButton onClick={fetchNotificationsManually}>Retry</IonButton>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <IonIcon icon={notificationsIcon} size="large" color="medium" style={{ fontSize: "48px" }} />
            <p className="text-center mt-4 text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <IonList>
            {notifications.map((notification) => (
              <IonItemSliding key={notification.id}>
                <IonItem
                  onClick={() => markAsRead(notification)}
                  detail={true}
                  className={notification.read ? "opacity-75" : ""}
                >
                  <div className="flex items-start py-2 w-full">
                    <div className="mr-3">
                      <IonBadge color={getNotificationColor(notification.type)}>{notification.type}</IonBadge>
                    </div>
                    <div className="flex-1">
                      <IonLabel>
                        <h2 className="font-medium flex items-center">
                          {notification.title}
                          {!notification.read && <IonIcon icon={mailUnreadOutline} color="primary" className="ml-2" />}
                        </h2>
                        <p className="text-sm">{notification.message}</p>
                        <p className="text-xs text-gray-500">{notification.createdAt.toLocaleString()}</p>
                      </IonLabel>
                    </div>
                    {!notification.read && <div className="w-3 h-3 rounded-full bg-blue-500 mt-2"></div>}
                  </div>
                </IonItem>

                <IonItemOptions side="end">
                  {!notification.read && (
                    <IonItemOption color="success" onClick={() => markAsRead(notification)}>
                      <IonIcon slot="icon-only" icon={checkmarkDone} />
                    </IonItemOption>
                  )}
                  <IonItemOption color="danger" onClick={() => deleteNotification(notification)}>
                    <IonIcon slot="icon-only" icon={trash} />
                  </IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            ))}
          </IonList>
        )}

        <IonLoading isOpen={loading && !notifications.length} message="Loading notifications..." />

        <IonAlert
          isOpen={showAlert && !selectedNotification}
          onDidDismiss={() => setShowAlert(false)}
          header="Alert"
          message={alertMessage}
          buttons={["OK"]}
        />

        {selectedNotification && (
          <IonAlert
            isOpen={showAlert}
            onDidDismiss={() => {
              setShowAlert(false)
              setSelectedNotification(null)
            }}
            header={selectedNotification.title}
            message={selectedNotification.message}
            buttons={
              selectedNotification.type === "request" && !isResident
                ? [
                    {
                      text: "Cancel",
                      role: "cancel",
                    },
                    {
                      text: "Accept",
                      handler: () => {
                        handleAcceptRequest(selectedNotification.relatedId || "")
                      },
                    },
                  ]
                : ["OK"]
            }
          />
        )}

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          position="top"
        />
      </IonContent>
    </IonPage>
  )
}

export default Notifications
