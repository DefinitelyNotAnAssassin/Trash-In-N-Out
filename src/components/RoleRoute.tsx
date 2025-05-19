"use client"

import type React from "react"
import { Route, Redirect, type RouteProps } from "react-router-dom"
import { useAuth, getUserDataFromStorage } from "../contexts/AuthContext"

interface RoleRouteProps extends RouteProps {
  children: React.ReactNode
  role: string[] | string
}

const RoleRoute: React.FC<RoleRouteProps> = ({ children, role, ...rest }) => {
  const { userData } = useAuth()
  const storedUserData = getUserDataFromStorage()
  const userInfo = userData || storedUserData

  return (
    <Route
      {...rest}
      render={({ location }) => {
        // Debug log to see what roles are being checked
        console.log("RoleRoute check - Required role:", role)
        console.log("RoleRoute check - User role:", userInfo?.role)

        // Convert single role to array for consistent handling
        const requiredRoles = Array.isArray(role) ? role : [role]

        // Check if user's role is in the allowed roles array
        if (userInfo && requiredRoles.includes(userInfo.role)) {
          return children
        } else {
          console.log("Role mismatch - redirecting")
          return (
            <Redirect
              to={{
                pathname: "/app/home",
                state: { from: location },
              }}
            />
          )
        }
      }}
    />
  )
}

export default RoleRoute
