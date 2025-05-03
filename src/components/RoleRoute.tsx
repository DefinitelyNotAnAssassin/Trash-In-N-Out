"use client"

import type React from "react"
import { Route, Redirect, type RouteProps } from "react-router-dom"
import { useAuth, getUserDataFromStorage } from "../contexts/AuthContext"

interface RoleRouteProps extends RouteProps {
  children: React.ReactNode
  role: "resident" | "junkshop" | string
}

const RoleRoute: React.FC<RoleRouteProps> = ({ children, role, ...rest }) => {
  const { userData } = useAuth()
  const storedUserData = getUserDataFromStorage()
  const userInfo = userData || storedUserData

  return (
    <Route
      {...rest}
      render={({ location }) =>
        userInfo && userInfo.role === role ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: "/app/home",
              state: { from: location },
            }}
          />
        )
      }
    />
  )
}

export default RoleRoute
