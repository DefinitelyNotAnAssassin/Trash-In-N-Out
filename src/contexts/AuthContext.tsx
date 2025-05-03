"use client"

import type React from "react"
import { createContext, useState, useEffect, useContext } from "react"
import { firestore } from "../firebase"
import { collection, doc, setDoc, getDoc, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { generateSecureToken, hashPassword, verifyPassword } from "../utils/auth"

type UserRole = "resident" | "junkshop"

interface UserData {
  uid: string
  email: string
  name: string
  role: UserRole
  points: number
  address?: string
  phone?: string
}

interface AuthContextType {
  currentUser: UserData | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string, role: UserRole) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  // Check for active session on load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionToken = localStorage.getItem("sessionToken")
        const userId = localStorage.getItem("userId")

        if (sessionToken && userId) {
          // Verify session token in Firestore
          const sessionsRef = collection(firestore, "sessions")
          const q = query(
            sessionsRef,
            where("userId", "==", userId),
            where("token", "==", sessionToken),
            where("isValid", "==", true),
          )

          const querySnapshot = await getDocs(q)

          if (!querySnapshot.empty) {
            // Session is valid, get user data
            const userRef = doc(firestore, "users", userId)
            const userDoc = await getDoc(userRef)

            if (userDoc.exists()) {
              setCurrentUser({
                uid: userDoc.id,
                ...userDoc.data(),
              } as UserData)

              localStorage.setItem(
                "userData",
                JSON.stringify({
                  uid: userDoc.id,
                  ...userDoc.data(),
                }),
              )
            }
          } else {
            // Invalid session, clear local storage
            localStorage.removeItem("sessionToken")
            localStorage.removeItem("userId")
          }
        }
      } catch (error) {
        console.error("Error checking session:", error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  const register = async (email: string, password: string, name: string, role: UserRole) => {
    try {
      // Check if email already exists
      const usersRef = collection(firestore, "users")
      const q = query(usersRef, where("email", "==", email))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        throw new Error("Email already in use")
      }

      // Hash password
      const hashedPassword = await hashPassword(password)

      // Create new user document
      const newUserRef = doc(collection(firestore, "users"))
      const userData: UserData & { password: string } = {
        uid: newUserRef.id,
        email,
        name,
        role,
        points: 0,
        password: hashedPassword,
      }

      await setDoc(newUserRef, userData)

      // Create session
      const sessionToken = generateSecureToken()
      await addDoc(collection(firestore, "sessions"), {
        userId: newUserRef.id,
        token: sessionToken,
        createdAt: serverTimestamp(),
        isValid: true,
      })

      // Store session in localStorage
      localStorage.setItem("sessionToken", sessionToken)
      localStorage.setItem("userId", newUserRef.id)

      // Set current user
      setCurrentUser({
        uid: newUserRef.id,
        email,
        name,
        role,
        points: 0,
      })

      localStorage.setItem(
        "userData",
        JSON.stringify({
          uid: newUserRef.id,
          email,
          name,
          role,
          points: 0,
        }),
      )
    } catch (error) {
      console.error("Registration error:", error)
      throw error
    }
  }

  const login = async (email: string, password: string) => {
    try {
      // Find user by email
      const usersRef = collection(firestore, "users")
      const q = query(usersRef, where("email", "==", email))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        throw new Error("Invalid email or password")
      }

      const userDoc = querySnapshot.docs[0]
      const userData = userDoc.data() as UserData & { password: string }

      // Verify password
      const isPasswordValid = await verifyPassword(password, userData.password)

      if (!isPasswordValid) {
        throw new Error("Invalid email or password")
      }

      // Create new session
      const sessionToken = generateSecureToken()
      await addDoc(collection(firestore, "sessions"), {
        userId: userDoc.id,
        token: sessionToken,
        createdAt: serverTimestamp(),
        isValid: true,
      })

      // Store session in localStorage
      localStorage.setItem("sessionToken", sessionToken)
      localStorage.setItem("userId", userDoc.id)

      // Set current user
      setCurrentUser({
        uid: userDoc.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        points: userData.points,
        address: userData.address,
        phone: userData.phone,
      })

      // Store user data in localStorage for easy access
      localStorage.setItem(
        "userData",
        JSON.stringify({
          uid: userDoc.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          points: userData.points,
          address: userData.address,
          phone: userData.phone,
        }),
      )
    } catch (error) {
      console.error("Login error:", error)
      throw error
    }
  }

  const logout = async () => {
    try {
      const sessionToken = localStorage.getItem("sessionToken")
      const userId = localStorage.getItem("userId")

      if (sessionToken && userId) {
        // Invalidate session in Firestore
        const sessionsRef = collection(firestore, "sessions")
        const q = query(sessionsRef, where("userId", "==", userId), where("token", "==", sessionToken))

        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          const sessionDoc = querySnapshot.docs[0]
          await setDoc(doc(firestore, "sessions", sessionDoc.id), { isValid: false }, { merge: true })
        }
      }

      // Clear local storage
      localStorage.removeItem("sessionToken")
      localStorage.removeItem("userId")

      // Clear current user
      setCurrentUser(null)

      // Clear user data from localStorage
      localStorage.removeItem("userData")
    } catch (error) {
      console.error("Logout error:", error)
      throw error
    }
  }

  const value = {
    currentUser,
    login,
    register,
    logout,
    loading,
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}

// Get user data from localStorage
export const getUserDataFromStorage = (): UserData | null => {
  const userData = localStorage.getItem("userData")
  if (userData) {
    return JSON.parse(userData)
  }
  return null
}
