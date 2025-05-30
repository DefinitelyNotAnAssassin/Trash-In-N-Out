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
  IonToast,
  IonCard,
} from "@ionic/react"
import { mailOutline, lockClosedOutline, eyeOutline, eyeOffOutline } from "ionicons/icons"
import { useAuth } from "../contexts/AuthContext"
import { useHistory } from "react-router"
import { motion } from "framer-motion"
import type { HTMLIonInputElement } from "@ionic/react"

const Login: React.FC = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const { login } = useAuth()
  const history = useHistory()

  // Refs for direct DOM access
  const emailInputRef = useRef<HTMLIonInputElement>(null)
  const passwordInputRef = useRef<HTMLIonInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Get values directly from the DOM to avoid delay
    const emailValue = (emailInputRef.current?.value as string) || email
    const passwordValue = (passwordInputRef.current?.value as string) || password

    try {
      setError("")
      setLoading(true)
      await login(emailValue, passwordValue)
      history.push("/app/home")
    } catch (error: any) {
      setError(error.message || "Failed to sign in. Please check your credentials.")
      setShowToast(true)
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Handle input changes directly without delay
  const handleEmailChange = (e: CustomEvent) => {
    const value = e.detail.value || ""
    setEmail(value)
  }

  const handlePasswordChange = (e: CustomEvent) => {
    const value = e.detail.value || ""
    setPassword(value)
  }

  return (
    <IonPage>
      <IonContent className="ion-padding" fullscreen>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                <IonIcon
                  icon="leaf-outline"
                  className="text-green-600 text-4xl"
                  style={{ fontSize: "2.5rem", color: "#16a34a" }}
                />
              </div>
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
              <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Welcome Back</h1>
              <p className="text-center text-gray-500 mb-8">Sign in to continue to Trash-In-N-Out</p>
            </motion.div>

            <IonCard className="shadow-lg rounded-xl overflow-hidden">
              <div className="p-6">
                <form onSubmit={handleSubmit}>
                  <div className="mb-6">
                    <div className="flex items-center border-b-2 border-gray-200 py-2 px-3 mb-4 focus-within:border-green-500 transition-colors">
                      <IonIcon icon={mailOutline} className="text-gray-400 mr-2" />
                      <IonInput
                        type="email"
                        value={email}
                        placeholder="Email"
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
                  </div>

                  <div className="flex justify-end mb-6">
                    <IonRouterLink
                      className="text-sm text-green-600 hover:text-green-800"
                      routerLink="/forgot-password"
                    >
                      Forgot Password?
                    </IonRouterLink>
                  </div>

                  <IonButton
                    expand="block"
                    type="submit"
                    className="font-medium rounded-lg text-sm px-5 py-4 mb-3"
                    color="success"
                  >
                    Sign In
                  </IonButton>
                </form>

                <div className="text-center mt-6">
                  <IonText color="medium">
                    Don't have an account?{" "}
                    <IonRouterLink routerLink="/register" className="text-green-600 font-medium">
                      Create Account
                    </IonRouterLink>
                  </IonText>
                </div>
              </div>
            </IonCard>
          </motion.div>
        </div>

        <IonLoading isOpen={loading} message="Signing in..." />
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

export default Login
