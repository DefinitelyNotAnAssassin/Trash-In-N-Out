"use client"

import type React from "react"
import { Redirect, Route } from "react-router-dom"
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
  IonToast,
  IonBadge,
} from "@ionic/react"
import { IonReactRouter } from "@ionic/react-router"
import {
  home,
  map,
  notifications,
  person,
  businessOutline,
  listOutline,
  calculatorOutline,
  chatbubblesOutline,
  statsChartOutline,
} from "ionicons/icons"

/* Core CSS required for Ionic components */
import "@ionic/react/css/core.css"
import "@ionic/react/css/normalize.css"
import "@ionic/react/css/structure.css"
import "@ionic/react/css/typography.css"
import "@ionic/react/css/padding.css"
import "@ionic/react/css/float-elements.css"
import "@ionic/react/css/text-alignment.css"
import "@ionic/react/css/text-transformation.css"
import "@ionic/react/css/flex-utils.css"
import "@ionic/react/css/display.css"

/* Theme variables */
import "./theme/variables.css"
import "./theme/tailwind.css"

/* Pages */
import Home from "./pages/Home"
import Map from "./pages/Map"
import Notifications from "./pages/Notifications"
import Rewards from "./pages/Rewards"
import Profile from "./pages/Profile"
import Login from "./pages/Login"
import Register from "./pages/Register"
import JunkshopDashboard from "./pages/JunkshopDashboard"
import MaterialRequest from "./pages/MaterialRequest"
import UserMaterialRequests from "./pages/UserMaterialRequests"
import RecycleCalculator from "./pages/RecycleCalculator"
import Chat from "./pages/Chat"
import AdminDashboard from "./pages/AdminDashboard"
import { AuthProvider, useAuth, getUserDataFromStorage } from "./contexts/AuthContext"
import PrivateRoute from "./components/PrivateRoute"
import RoleRoute from "./components/RoleRoute"
import { useState, useEffect } from "react"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { firestore } from "./firebase"

setupIonicReact({
  mode: "md",
  // Configure Ionic to support transparent backgrounds for maps
  backButtonText: "",
})

const AppTabs: React.FC = () => {
  const { userData } = useAuth()
  const storedUserData = getUserDataFromStorage()
  const userInfo = userData || storedUserData
  const isResident = userInfo?.role === "resident"
  const isJunkshop = userInfo?.role === "junkshop"
  const isAdmin = userInfo?.role === "admin"

  const [networkStatus, setNetworkStatus] = useState({
    isOnline: navigator.onLine,
    showToast: false,
  })

  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus({ isOnline: true, showToast: true })
    }

    const handleOffline = () => {
      setNetworkStatus({ isOnline: false, showToast: true })
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Monitor unread notifications
  useEffect(() => {
    if (!userInfo?.uid) return

    const notificationsRef = collection(firestore, "notifications")
    const q = query(
      notificationsRef,
      where("userId", "==", userInfo.uid),
      where("read", "==", false),
      where("deleted", "==", false),
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setUnreadNotifications(snapshot.size)
      },
      (error) => {
        console.error("Error fetching notification count", error)
      },
    )

    return () => unsubscribe()
  }, [userInfo?.uid])

  // Monitor unread messages
  useEffect(() => {
    if (!userInfo?.uid) return

    const messagesRef = collection(firestore, "messages")
    const q = query(messagesRef, where("recipientId", "==", userInfo.uid), where("read", "==", false))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setUnreadMessages(snapshot.size)
      },
      (error) => {
        console.error("Error fetching unread messages count", error)
      },
    )

    return () => unsubscribe()
  }, [userInfo?.uid])

  return (
    <>
      <IonTabs>
        <IonRouterOutlet>
          <Route exact path="/app/home">
            <Home />
          </Route>

          {/* Resident-only routes */}
          <RoleRoute exact path="/app/map" role="resident">
            <Map />
          </RoleRoute>
          <RoleRoute path="/app/material-request" role="resident">
            <MaterialRequest />
          </RoleRoute>
          <RoleRoute path="/app/my-requests" role="resident">
            <UserMaterialRequests />
          </RoleRoute>
          {/* Calculator shared between resident and junkshop */}
          <RoleRoute path="/app/calculator" role={["resident", "junkshop"]}>
            <RecycleCalculator />
          </RoleRoute>

          {/* Junkshop-only routes */}
          <RoleRoute path="/app/junkshop-dashboard" role="junkshop">
            <JunkshopDashboard />
          </RoleRoute>
          <RoleRoute path="/app/find-materials" role="junkshop">
            <Map />
          </RoleRoute>

          {/* Admin-only routes */}
          <RoleRoute path="/app/admin-dashboard" role="admin">
            <AdminDashboard />
          </RoleRoute>

          {/* Common routes */}
          <Route exact path="/app/notifications">
            <Notifications />
          </Route>
          <Route exact path="/app/rewards">
            <Rewards />
          </Route>
          <Route path="/app/profile">
            <Profile />
          </Route>
          <Route path="/app/chat">
            <Chat />
          </Route>
          <Route exact path="/app">
            <Redirect to="/app/home" />
          </Route>
        </IonRouterOutlet>

        {/* Role-specific tab bars */}
        {isAdmin ? (
          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/app/home">
              <IonIcon icon={home} />
              <IonLabel>Home</IonLabel>
            </IonTabButton>
            <IonTabButton tab="admin-dashboard" href="/app/admin-dashboard">
              <IonIcon icon={statsChartOutline} />
              <IonLabel>Dashboard</IonLabel>
            </IonTabButton>
            <IonTabButton tab="chat" href="/app/chat">
              <IonIcon icon={chatbubblesOutline} />
              <IonLabel>Chat</IonLabel>
              {unreadMessages > 0 && <IonBadge color="danger">{unreadMessages}</IonBadge>}
            </IonTabButton>
            <IonTabButton tab="notifications" href="/app/notifications">
              <IonIcon icon={notifications} />
              <IonLabel>Alerts</IonLabel>
              {unreadNotifications > 0 && <IonBadge color="danger">{unreadNotifications}</IonBadge>}
            </IonTabButton>
            <IonTabButton tab="profile" href="/app/profile">
              <IonIcon icon={person} />
              <IonLabel>Profile</IonLabel>
            </IonTabButton>
          </IonTabBar>
        ) : isResident ? (
          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/app/home">
              <IonIcon icon={home} />
              <IonLabel>Home</IonLabel>
            </IonTabButton>
            <IonTabButton tab="map" href="/app/map">
              <IonIcon icon={map} />
              <IonLabel>Report</IonLabel>
            </IonTabButton>
            <IonTabButton tab="my-requests" href="/app/my-requests">
              <IonIcon icon={listOutline} />
              <IonLabel>My Requests</IonLabel>
            </IonTabButton>
       
            <IonTabButton tab="chat" href="/app/chat">
              <IonIcon icon={chatbubblesOutline} />
              <IonLabel>Chat</IonLabel>
              {unreadMessages > 0 && <IonBadge color="danger">{unreadMessages}</IonBadge>}
            </IonTabButton>
          </IonTabBar>
        ) : (
          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/app/home">
              <IonIcon icon={home} />
              <IonLabel>Home</IonLabel>
            </IonTabButton>
            <IonTabButton tab="dashboard" href="/app/junkshop-dashboard">
              <IonIcon icon={businessOutline} />
              <IonLabel>Dashboard</IonLabel>
            </IonTabButton>
            <IonTabButton tab="find-materials" href="/app/find-materials">
              <IonIcon icon={map} />
              <IonLabel>Find</IonLabel>
            </IonTabButton>
            <IonTabButton tab="calculator" href="/app/calculator">
              <IonIcon icon={calculatorOutline} />
              <IonLabel>Calculator</IonLabel>
            </IonTabButton>
            <IonTabButton tab="chat" href="/app/chat">
              <IonIcon icon={chatbubblesOutline} />
              <IonLabel>Chat</IonLabel>
              {unreadMessages > 0 && <IonBadge color="danger">{unreadMessages}</IonBadge>}
            </IonTabButton>
          </IonTabBar>
        )}
      </IonTabs>

      {/* Network status toast */}
      <IonToast
        isOpen={networkStatus.showToast}
        onDidDismiss={() => setNetworkStatus((prev) => ({ ...prev, showToast: false }))}
        message={networkStatus.isOnline ? "You are back online" : "You are offline. Some features may be limited."}
        duration={3000}
        position="top"
        color={networkStatus.isOnline ? "success" : "warning"}
      />
    </>
  )
}

const App: React.FC = () => (
  <AuthProvider>
    <IonApp>
      <IonReactRouter>
        <Route path="/login" component={Login} exact />
        <Route path="/register" component={Register} exact />

        <PrivateRoute path="/app">
          <AppTabs />
        </PrivateRoute>

        <Route exact path="/">
          <Redirect to="/login" />
        </Route>
      </IonReactRouter>
    </IonApp>
  </AuthProvider>
)

export default App
