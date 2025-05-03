"use client"

import type React from "react"
import { useState } from "react"
import {
  IonContent,
  IonPage,
  IonInput,
  IonButton,
  IonItem,
  IonLabel,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonLoading,
  IonText,
  IonRouterLink,
  IonSelect,
  IonSelectOption,
} from "@ionic/react"
import { useAuth } from "../contexts/AuthContext"
import { useHistory } from "react-router"

const Register: React.FC = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<"resident" | "junkshop">("resident")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const history = useHistory()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      return setError("Passwords do not match")
    }

    try {
      setError("")
      setLoading(true)
      await register(email, password, name, role)
      history.push("/app/home")
    } catch (error) {
      setError("Failed to create an account")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>RecycleMate</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="flex flex-col items-center justify-center h-full">
          <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-center text-green-600 mb-6">Register</h1>

            {error && <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div>}

            <form onSubmit={handleSubmit}>
              <IonItem className="mb-4">
                <IonLabel position="floating">Name</IonLabel>
                <IonInput value={name} onIonChange={(e) => setName(e.detail.value!)} required />
              </IonItem>

              <IonItem className="mb-4">
                <IonLabel position="floating">Email</IonLabel>
                <IonInput type="email" value={email} onIonChange={(e) => setEmail(e.detail.value!)} required />
              </IonItem>

              <IonItem className="mb-4">
                <IonLabel position="floating">Password</IonLabel>
                <IonInput type="password" value={password} onIonChange={(e) => setPassword(e.detail.value!)} required />
              </IonItem>

              <IonItem className="mb-4">
                <IonLabel position="floating">Confirm Password</IonLabel>
                <IonInput
                  type="password"
                  value={confirmPassword}
                  onIonChange={(e) => setConfirmPassword(e.detail.value!)}
                  required
                />
              </IonItem>

              <IonItem className="mb-6">
                <IonLabel>I am a</IonLabel>
                <IonSelect value={role} onIonChange={(e) => setRole(e.detail.value)}>
                  <IonSelectOption value="resident">Resident</IonSelectOption>
                  <IonSelectOption value="junkshop">Junk Shop Owner</IonSelectOption>
                </IonSelect>
              </IonItem>

              <IonButton expand="block" type="submit" className="mb-4" color="success">
                Register
              </IonButton>
            </form>

            <div className="text-center mt-4">
              <IonText>
                Already have an account?{" "}
                <IonRouterLink routerLink="/login" className="text-green-600">
                  Login
                </IonRouterLink>
              </IonText>
            </div>
          </div>
        </div>

        <IonLoading isOpen={loading} message="Creating account..." />
      </IonContent>
    </IonPage>
  )
}

export default Register
