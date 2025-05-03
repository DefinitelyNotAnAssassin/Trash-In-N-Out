"\"use client"

import type React from "react"
import { useState } from "react"
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonTextarea,
  IonButton,
  IonLoading,
  IonAlert,
  IonSelect,
  IonSelectOption,
} from "@ionic/react"
import { useAuth } from "../contexts/AuthContext"
import { useHistory } from "react-router"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { firestore } from "../firebase"

const MaterialRequest: React.FC = () => {
  const { userData } = useAuth()
  const history = useHistory()
  const [type, setType] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState("")

  const handleSubmit = async () => {
    if (!type || !description) {
      setAlertMessage("Please fill in all fields.")
      setShowAlert(true)
      return
    }

    try {
      setLoading(true)
      await addDoc(collection(firestore, "materialRequests"), {
        userId: userData?.uid,
        userName: userData?.name,
        type,
        description,
        status: "pending",
        createdAt: serverTimestamp(),
      })
      setAlertMessage("Request submitted successfully!")
      setShowAlert(true)
      setType("")
      setDescription("")
      history.push("/app/my-requests")
    } catch (error: any) {
      console.error("Error submitting request:", error)
      setAlertMessage(error.message || "Failed to submit request.")
      setShowAlert(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Request Recycling</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="floating">Material Type</IonLabel>
          <IonSelect value={type} onIonChange={(e) => setType(e.detail.value!)}>
            <IonSelectOption value="paper">Paper</IonSelectOption>
            <IonSelectOption value="plastic">Plastic</IonSelectOption>
            <IonSelectOption value="metal">Metal</IonSelectOption>
            <IonSelectOption value="glass">Glass</IonSelectOption>
            <IonSelectOption value="electronics">Electronics</IonSelectOption>
            <IonSelectOption value="other">Other</IonSelectOption>
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonLabel position="floating">Description</IonLabel>
          <IonTextarea value={description} onIonChange={(e) => setDescription(e.detail.value!)} />
        </IonItem>
        <IonButton expand="full" onClick={handleSubmit} disabled={loading}>
          Submit Request
        </IonButton>

        <IonLoading isOpen={loading} message="Submitting..." />
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Alert"
          message={alertMessage}
          buttons={["OK"]}
        />
      </IonContent>
    </IonPage>
  )
}

export default MaterialRequest

