"use client"

import type React from "react"
import { Route, Redirect, type RouteProps } from "react-router-dom"
import { useAuth, getUserDataFromStorage } from "../contexts/AuthContext"

interface PrivateRouteProps extends RouteProps {
  children: React.ReactNode
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, ...rest }) => {
  const { currentUser } = useAuth()
  const storedUserData = getUserDataFromStorage()
  const isAuthenticated = currentUser || storedUserData

  return (
    <Route
      {...rest}
      render={({ location }) =>
        isAuthenticated ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: "/login",
              state: { from: location },
            }}
          />
        )
      }
    />
  )
}

export default PrivateRoute
