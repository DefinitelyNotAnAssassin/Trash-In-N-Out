"use client"

import type React from "react"
import { useState } from "react"
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonLoading,
  IonAlert,
  IonAvatar,
  IonList,
  IonToggle,
} from "@ionic/react"
import {
  logOut,
  person,
  call,
  mail,
  home,
  notifications as notificationsIcon,
  moon,
  helpCircle,
  shield,
} from "ionicons/icons"
import { useAuth } from "../contexts/AuthContext"
import { useHistory } from "react-router"
import { doc, updateDoc } from "firebase/firestore"
import { firestore } from "../firebase"

const Profile: React.FC = () => {
  const { currentUser, logout } = useAuth()
  const history = useHistory()

  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(currentUser?.name || "")
  const [phone, setPhone] = useState(currentUser?.phone || "")
  const [address, setAddress] = useState(currentUser?.address || "")
  const [loading, setLoading] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState("")
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const isResident = currentUser?.role === "resident"

  const handleSaveProfile = async () => {
    if (!currentUser) return

    try {
      setLoading(true)

      const userRef = doc(firestore, "users", currentUser.uid)
      await updateDoc(userRef, {
        name,
        phone,
        address,
      })

      setAlertMessage("Profile updated successfully!")
      setShowAlert(true)
      setIsEditing(false)
    } catch (error) {
      console.error("Error updating profile", error)
      setAlertMessage("Error updating profile. Please try again.")
      setShowAlert(true)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      history.push("/login")
    } catch (error) {
      console.error("Error logging out", error)
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Profile</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="flex flex-col items-center mb-6">
          <IonAvatar className="w-24 h-24 mb-4">
            <div className="w-full h-full flex items-center justify-center bg-green-100 text-green-600 text-3xl font-bold rounded-full">
              {currentUser?.name?.charAt(0) || "U"}
            </div>
          </IonAvatar>
          <h1 className="text-xl font-bold">{currentUser?.name}</h1>
          <p className="text-gray-500 capitalize">{currentUser?.role}</p>
          <div className="mt-2 bg-green-100 px-3 py-1 rounded-full text-green-600 font-medium text-sm">
            {currentUser?.points || 0} Points
          </div>
        </div>

        {isEditing ? (
          <IonCard>
            <IonCardHeader>
              <h2 className="text-lg font-bold">Edit Profile</h2>
            </IonCardHeader>
            <IonCardContent>
              <IonItem className="mb-4">
                <IonLabel position="stacked">Name</IonLabel>
                <IonInput value={name} onIonChange={(e) => setName(e.detail.value!)} />
              </IonItem>

              <IonItem className="mb-4">
                <IonLabel position="stacked">Phone</IonLabel>
                <IonInput type="tel" value={phone} onIonChange={(e) => setPhone(e.detail.value!)} />
              </IonItem>

              <IonItem className="mb-4">
                <IonLabel position="stacked">Address</IonLabel>
                <IonTextarea value={address} onIonChange={(e) => setAddress(e.detail.value!)} rows={3} />
              </IonItem>

              <div className="flex gap-2 mt-4">
                <IonButton expand="block" fill="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </IonButton>
                <IonButton expand="block" color="success" onClick={handleSaveProfile}>
                  Save
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        ) : (
          <IonCard>
            <IonCardHeader>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">Personal Information</h2>
                <IonButton fill="clear" onClick={() => setIsEditing(true)}>
                  Edit
                </IonButton>
              </div>
            </IonCardHeader>
            <IonCardContent>
              <div className="space-y-4">
                <div className="flex items-center">
                  <IonIcon icon={person} className="mr-3 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p>{currentUser?.name}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <IonIcon icon={mail} className="mr-3 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p>{currentUser?.email}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <IonIcon icon={call} className="mr-3 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p>{currentUser?.phone || "Not set"}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <IonIcon icon={home} className="mr-3 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p>{currentUser?.address || "Not set"}</p>
                  </div>
                </div>
              </div>
            </IonCardContent>
          </IonCard>
        )}

        <IonList className="mt-4 rounded-lg overflow-hidden">
          <IonItem>
            <IonIcon icon={notificationsIcon} slot="start" color="success" />
            <IonLabel>Notifications</IonLabel>
            <IonToggle checked={true} color="success" />
          </IonItem>

          <IonItem>
            <IonIcon icon={moon} slot="start" color="success" />
            <IonLabel>Dark Mode</IonLabel>
            <IonToggle color="success" />
          </IonItem>

          <IonItem button onClick={() => {}}>
            <IonIcon icon={helpCircle} slot="start" color="success" />
            <IonLabel>Help & Support</IonLabel>
          </IonItem>

          <IonItem button onClick={() => {}}>
            <IonIcon icon={shield} slot="start" color="success" />
            <IonLabel>Privacy Policy</IonLabel>
          </IonItem>
        </IonList>

        <div className="mt-6">
          <IonButton expand="block" color="danger" fill="outline" onClick={() => setShowLogoutConfirm(true)}>
            <IonIcon icon={logOut} slot="start" />
            Logout
          </IonButton>
        </div>

        <IonLoading isOpen={loading} message="Please wait..." />

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Alert"
          message={alertMessage}
          buttons={["OK"]}
        />

        <IonAlert
          isOpen={showLogoutConfirm}
          onDidDismiss={() => setShowLogoutConfirm(false)}
          header="Confirm Logout"
          message="Are you sure you want to logout?"
          buttons={[
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Logout",
              handler: handleLogout,
            },
          ]}
        />
      </IonContent>
    </IonPage>
  )
}

export default Profile
