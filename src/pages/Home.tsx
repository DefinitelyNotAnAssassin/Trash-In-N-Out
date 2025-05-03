"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge,
  IonSkeletonText,
} from "@ionic/react"
import { useAuth, getUserDataFromStorage } from "../contexts/AuthContext"
import {
  addCircleOutline,
  leafOutline,
  businessOutline,
  listOutline,
  mapOutline,
  trophy,
  notifications,
} from "ionicons/icons"
import { useHistory } from "react-router"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { firestore } from "../firebase"

const Home: React.FC = () => {
  const { userData } = useAuth()
  const storedUserData = getUserDataFromStorage()
  const userInfo = userData || storedUserData
  const history = useHistory()

  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const isResident = userInfo?.role === "resident"

  useEffect(() => {
    if (!userInfo?.uid) return

    // Fetch unread notifications count
    const fetchUnreadNotifications = async () => {
      try {
        const notificationsRef = collection(firestore, "notifications")
        const q = query(
          notificationsRef,
          where("userId", "==", userInfo.uid),
          where("read", "==", false),
          where("deleted", "==", false),
        )

        const snapshot = await getDocs(q)
        setUnreadNotifications(snapshot.size)
      } catch (error) {
        console.error("Error fetching notification count", error)
      }
    }

    // Fetch recent activity
    const fetchRecentActivity = async () => {
      try {
        setLoading(true)

        // Get recent material requests
        const requestsRef = collection(firestore, "materialRequests")
        let requestsQuery

        if (isResident) {
          requestsQuery = query(
            requestsRef,
            where("userId", "==", userInfo.uid),
            orderBy("createdAt", "desc"),
            limit(3),
          )
        } else {
          requestsQuery = query(
            requestsRef,
            where("acceptedBy", "==", userInfo.uid),
            orderBy("createdAt", "desc"),
            limit(3),
          )
        }

        const requestsSnapshot = await getDocs(requestsQuery)
        const activities: any[] = []

        requestsSnapshot.forEach((doc) => {
          const data = doc.data()
          activities.push({
            id: doc.id,
            type: "material",
            title: isResident
              ? `${data.type} materials reported`
              : `Collected ${data.type} materials from ${data.userName}`,
            timestamp: data.createdAt?.toDate() || new Date(),
          })
        })

        // Sort by timestamp
        activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

        setRecentActivity(activities)
      } catch (error) {
        console.error("Error fetching recent activity", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUnreadNotifications()
    fetchRecentActivity()
  }, [userInfo?.uid, isResident])

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    // Less than 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }

    // Less than 7 days
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      return days[date.getDay()]
    }

    // Otherwise
    return date.toLocaleDateString()
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>RecycleMate</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Welcome, {userInfo?.name}!</h1>
          <p className="text-gray-600">
            {isResident ? "Help reduce waste by recycling your materials" : "Find recyclable materials in your area"}
          </p>
        </div>

        <IonCard className="mb-4 bg-green-50">
          <IonCardHeader>
            <IonCardSubtitle>Your Recycling Impact</IonCardSubtitle>
            <IonCardTitle className="text-green-600">
              <div className="flex items-center">
                <IonIcon icon={leafOutline} className="mr-2" />
                <span>{userInfo?.points || 0} Points</span>
              </div>
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {isResident
              ? "Earn points by recycling materials and redeem them for rewards!"
              : "Earn points by collecting recyclable materials!"}
            <IonButton fill="clear" color="success" onClick={() => history.push("/app/rewards")}>
              View Rewards
            </IonButton>
          </IonCardContent>
        </IonCard>

        <IonGrid>
          <IonRow>
            {isResident ? (
              <>
                <IonCol size="6">
                  <IonCard className="h-full" onClick={() => history.push("/app/map")}>
                    <IonCardHeader>
                      <IonCardTitle className="text-lg">Report Materials</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent className="flex flex-col items-center">
                      <IonIcon icon={addCircleOutline} size="large" color="success" />
                      <IonButton fill="clear" color="success" className="mt-2">
                        Add New
                      </IonButton>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6">
                  <IonCard className="h-full" onClick={() => history.push("/app/my-requests")}>
                    <IonCardHeader>
                      <IonCardTitle className="text-lg">My Recyclables</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent className="flex flex-col items-center">
                      <IonIcon icon={listOutline} size="large" color="success" />
                      <IonButton fill="clear" color="success" className="mt-2">
                        View List
                      </IonButton>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </>
            ) : (
              <>
                <IonCol size="6">
                  <IonCard className="h-full" onClick={() => history.push("/app/junkshop-dashboard")}>
                    <IonCardHeader>
                      <IonCardTitle className="text-lg">Dashboard</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent className="flex flex-col items-center">
                      <IonIcon icon={businessOutline} size="large" color="success" />
                      <IonButton fill="clear" color="success" className="mt-2">
                        Open
                      </IonButton>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6">
                  <IonCard className="h-full" onClick={() => history.push("/app/find-materials")}>
                    <IonCardHeader>
                      <IonCardTitle className="text-lg">Find Materials</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent className="flex flex-col items-center">
                      <IonIcon icon={mapOutline} size="large" color="success" />
                      <IonButton fill="clear" color="success" className="mt-2">
                        View Map
                      </IonButton>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </>
            )}
          </IonRow>
          <IonRow>
            <IonCol size="6">
              <IonCard className="h-full" onClick={() => history.push("/app/notifications")}>
                <IonCardHeader>
                  <IonCardTitle className="text-lg flex items-center">
                    Alerts
                    {unreadNotifications > 0 && (
                      <IonBadge color="danger" className="ml-2">
                        {unreadNotifications}
                      </IonBadge>
                    )}
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent className="flex flex-col items-center">
                  <IonIcon icon={notifications} size="large" color="success" />
                  <IonButton fill="clear" color="success" className="mt-2">
                    View Alerts
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="6">
              <IonCard className="h-full" onClick={() => history.push("/app/rewards")}>
                <IonCardHeader>
                  <IonCardTitle className="text-lg">Rewards</IonCardTitle>
                </IonCardHeader>
                <IonCardContent className="flex flex-col items-center">
                  <IonIcon icon={trophy} size="large" color="success" />
                  <IonButton fill="clear" color="success" className="mt-2">
                    View Rewards
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>

        <IonCard className="mt-4">
          <IonCardHeader>
            <IonCardTitle className="text-lg">Recent Activity</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {loading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border-b py-2">
                    <IonSkeletonText animated style={{ width: "70%", height: "16px" }} />
                    <IonSkeletonText animated style={{ width: "40%", height: "12px" }} />
                  </div>
                ))}
              </>
            ) : recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={activity.id} className={index < recentActivity.length - 1 ? "border-b py-2" : "py-2"}>
                  <p className="font-medium">{activity.title}</p>
                  <p className="text-sm text-gray-500">{formatDate(activity.timestamp)}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">No recent activity</p>
            )}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  )
}

export default Home
