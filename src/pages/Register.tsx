"use client"

import type React from "react"
import { useState, useRef } from "react"
import {
  IonContent,
  IonPage,
  IonInput,
  IonButton,
  IonLoading,
  IonText,
  IonRouterLink,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonToast,
  IonCard,
} from "@ionic/react"
import {
  personOutline,
  mailOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  peopleOutline,
  arrowBackOutline,
} from "ionicons/icons"
import { useAuth } from "../contexts/AuthContext"
import { useHistory } from "react-router"
import { motion } from "framer-motion"

const Register: React.FC = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<"resident" | "junkshop">("resident")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const { register } = useAuth()
  const history = useHistory()

  // Refs for direct DOM access
  const nameInputRef = useRef<HTMLIonInputElement>(null)
  const emailInputRef = useRef<HTMLIonInputElement>(null)
  const passwordInputRef = useRef<HTMLIonInputElement>(null)
  const confirmPasswordInputRef = useRef<HTMLIonInputElement>(null)
  const roleSelectRef = useRef<HTMLIonSelectElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Get values directly from the DOM to avoid delay
    const nameValue = (nameInputRef.current?.value as string) || name
    const emailValue = (emailInputRef.current?.value as string) || email
    const passwordValue = (passwordInputRef.current?.value as string) || password
    const confirmPasswordValue = (confirmPasswordInputRef.current?.value as string) || confirmPassword
    const roleValue = (roleSelectRef.current?.value as "resident" | "junkshop") || role

    if (passwordValue !== confirmPasswordValue) {
      setError("Passwords do not match")
      setShowToast(true)
      return
    }

    if (passwordValue.length < 6) {
      setError("Password must be at least 6 characters")
      setShowToast(true)
      return
    }

    try {
      setError("")
      setLoading(true)
      await register(emailValue, passwordValue, nameValue, roleValue)
      history.push("/app/home")
    } catch (error: any) {
      setError(error.message || "Failed to create an account")
      setShowToast(true)
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Handle input changes directly without delay
  const handleNameChange = (e: CustomEvent) => {
    const value = e.detail.value || ""
    setName(value)
  }

  const handleEmailChange = (e: CustomEvent) => {
    const value = e.detail.value || ""
    setEmail(value)
  }

  const handlePasswordChange = (e: CustomEvent) => {
    const value = e.detail.value || ""
    setPassword(value)
  }

  const handleConfirmPasswordChange = (e: CustomEvent) => {
    const value = e.detail.value || ""
    setConfirmPassword(value)
  }

  const handleRoleChange = (e: CustomEvent) => {
    const value = e.detail.value || "resident"
    setRole(value)
  }

  return (
    <IonPage>
      <IonContent className="ion-padding" fullscreen>
        <div className="flex flex-col items-center justify-center min-h-screen py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <div className="flex items-center mb-8">
              <IonButton fill="clear" routerLink="/login" className="mr-2">
                <IonIcon icon={arrowBackOutline} slot="icon-only" />
              </IonButton>
              <h1 className="text-2xl font-bold text-gray-800">Create Account</h1>
            </div>

            <IonCard className="shadow-lg rounded-xl overflow-hidden">
              <div className="p-6">
                <form onSubmit={handleSubmit}>
                  <div className="mb-6 space-y-4">
                    <div className="flex items-center border-b-2 border-gray-200 py-2 px-3 focus-within:border-green-500 transition-colors">
                      <IonIcon icon={personOutline} className="text-gray-400 mr-2" />
                      <IonInput
                        value={name}
                        placeholder="Full Name"
                        onIonInput={handleNameChange}
                        className="flex-1 outline-none text-gray-700"
                        required
                        ref={nameInputRef}
                        debounce={0}
                      />
                    </div>

                    <div className="flex items-center border-b-2 border-gray-200 py-2 px-3 focus-within:border-green-500 transition-colors">
                      <IonIcon icon={mailOutline} className="text-gray-400 mr-2" />
                      <IonInput
                        type="email"
                        value={email}
                        placeholder="Email Address"
                        onIonInput={handleEmailChange}
                        className="flex-1 outline-none text-gray-700"
                        required
                        ref={emailInputRef}
                        debounce={0}
                      />
                    </div>

                    <div className="flex items-center border-b-2 border-gray-200 py-2 px-3 focus-within:border-green-500 transition-colors">
                      <IonIcon icon={lockClosedOutline} className="text-gray-400 mr-2" />
                      <IonInput
                        type={showPassword ? "text" : "password"}
                        value={password}
                        placeholder="Password"
                        onIonInput={handlePasswordChange}
                        className="flex-1 outline-none text-gray-700"
                        required
                        ref={passwordInputRef}
                        debounce={0}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 focus:outline-none"
                      >
                        <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} />
                      </button>
                    </div>

                    <div className="flex items-center border-b-2 border-gray-200 py-2 px-3 focus-within:border-green-500 transition-colors">
                      <IonIcon icon={lockClosedOutline} className="text-gray-400 mr-2" />
                      <IonInput
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        placeholder="Confirm Password"
                        onIonInput={handleConfirmPasswordChange}
                        className="flex-1 outline-none text-gray-700"
                        required
                        ref={confirmPasswordInputRef}
                        debounce={0}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="text-gray-400 focus:outline-none"
                      >
                        <IonIcon icon={showConfirmPassword ? eyeOffOutline : eyeOutline} />
                      </button>
                    </div>

                    <div className="flex items-center border-b-2 border-gray-200 py-2 px-3 focus-within:border-green-500 transition-colors">
                      <IonIcon icon={peopleOutline} className="text-gray-400 mr-2" />
                      <IonSelect
                        value={role}
                        placeholder="Select Role"
                        onIonChange={handleRoleChange}
                        className="flex-1 outline-none text-gray-700"
                        interface="popover"
                        ref={roleSelectRef}
                      >
                        <IonSelectOption value="resident">Resident</IonSelectOption>
                        <IonSelectOption value="junkshop">Junk Shop Owner</IonSelectOption>
                      </IonSelect>
                    </div>
                  </div>

                  <IonButton
                    expand="block"
                    type="submit"
                    className="font-medium rounded-lg text-sm px-5 py-4 mt-6"
                    color="success"
                  >
                    Create Account
                  </IonButton>
                </form>

                <div className="text-center mt-6">
                  <IonText color="medium">
                    Already have an account?{" "}
                    <IonRouterLink routerLink="/login" className="text-green-600 font-medium">
                      Sign In
                    </IonRouterLink>
                  </IonText>
                </div>
              </div>
            </IonCard>
          </motion.div>
        </div>

        <IonLoading isOpen={loading} message="Creating account..." />
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={error}
          duration={3000}
          position="top"
          color="danger"
        />
      </IonContent>
    </IonPage>
  )
}

export default Register
