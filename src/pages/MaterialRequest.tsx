"use client"

import type React from "react"
import { useState, useRef } from "react"
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

  // Refs for direct DOM access
  const typeSelectRef = useRef<HTMLIonSelectElement>(null)
  const descriptionTextareaRef = useRef<HTMLIonTextareaElement>(null)

  const handleSubmit = async () => {
    // Get values directly from the DOM to avoid delay
    const typeValue = (typeSelectRef.current?.value as string) || type
    const descriptionValue = (descriptionTextareaRef.current?.value as string) || description

    if (!typeValue || !descriptionValue) {
      setAlertMessage("Please fill in all fields.")
      setShowAlert(true)
      return
    }

    try {
      setLoading(true)
      await addDoc(collection(firestore, "materialRequests"), {
        userId: userData?.uid,
        userName: userData?.name,
        type: typeValue,
        description: descriptionValue,
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

  // Handle input changes directly without delay
  const handleTypeChange = (e: CustomEvent) => {
    const value = e.detail.value || ""
    setType(value)
  }

  const handleDescriptionChange = (e: CustomEvent) => {
    const value = e.detail.value || ""
    setDescription(value)
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
          <IonSelect value={type} onIonChange={handleTypeChange} ref={typeSelectRef} interface="popover">
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
          <IonTextarea
            value={description}
            onIonInput={handleDescriptionChange}
            ref={descriptionTextareaRef}
            debounce={0}
          />
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
