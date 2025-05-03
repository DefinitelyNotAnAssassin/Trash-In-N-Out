"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { IonLoading, IonFab, IonFabButton, IonIcon } from "@ionic/react"
import { locateOutline } from "ionicons/icons"
import { Geolocation } from "@capacitor/geolocation"
import { GoogleMap } from "@capacitor/google-maps"

interface MaterialRequest {
  id: string
  userId: string
  userName: string
  type: string
  description: string
  location: {
    lat: number
    lng: number
  }
  address: string
  status: string
  createdAt: Date
}

interface MaterialRequestMapProps {
  requests: MaterialRequest[]
  onRequestSelect?: (request: MaterialRequest) => void
}

export const MaterialRequestMap: React.FC<MaterialRequestMapProps> = ({ requests, onRequestSelect }) => {
  const mapRef = useRef<HTMLElement | null>(null)
  const googleMapRef = useRef<any>(null)
  const [loading, setLoading] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [markers, setMarkers] = useState<{ id: string; markerId: string }[]>([])

  useEffect(() => {
    getCurrentLocation()
  }, [])

  useEffect(() => {
    if (mapRef.current && currentLocation) {
      createMap()
    }
  }, [mapRef.current, currentLocation])

  useEffect(() => {
    if (googleMapRef.current) {
      updateMarkers()
    }
  }, [requests, googleMapRef.current])

  const getCurrentLocation = async () => {
    try {
      setLoading(true)
      const position = await Geolocation.getCurrentPosition()
      setCurrentLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      })
    } catch (error) {
      console.error("Error getting location", error)
      // Set default location (Bacoor, Cavite)
      setCurrentLocation({
        lat: 14.4624,
        lng: 120.9642,
      })
    } finally {
      setLoading(false)
    }
  }

  const createMap = async () => {
    if (!mapRef.current || !currentLocation) return

    try {
      setLoading(true)

      if (googleMapRef.current) {
        await googleMapRef.current.destroy()
      }

      const newMap = await GoogleMap.create({
        id: "material-request-map",
        element: mapRef.current,
        apiKey: "AIzaSyDmSzv-D1glzeKveS_OF0ZlXaWLuvLyhuk",
        config: {
          center: currentLocation,
          zoom: 14,
        },
      })

      googleMapRef.current = newMap

      // Add marker for current location
      await newMap.addMarker({
        coordinate: currentLocation,
        title: "Your location",
        snippet: "You are here",
      })

      // Set up click listener for markers
      newMap.setOnMarkerClickListener(async (markerId) => {
        const markerInfo = markers.find(m => m.markerId === markerId)
        if (markerInfo) {
          const request = requests.find(r => r.id === markerInfo.id)
          if (request && onRequestSelect) {
            onRequestSelect(request)
          }
        }
      })

      await updateMarkers()
    } catch (error) {
      console.error("Error creating map", error)
    } finally {
      setLoading(false)
    }
  }

  const updateMarkers = async () => {
    if (!googleMapRef.current) return

    try {
      // Remove existing markers except current location
      for (const marker of markers) {
        await googleMapRef.current.removeMarker(marker.markerId)
      }

      const newMarkers: { id: string; markerId: string }[] = []

      // Add markers for material requests
      for (const request of requests) {
        const iconUrl = getMarkerIconByStatus(request.status)
        
        const markerId = await googleMapRef.current.addMarker({
          coordinate: request.location,
          title: request.type,
          snippet: request.description,
          iconUrl,
        })

        newMarkers.push({
          id: request.id,
          markerId,
        })
      }

      setMarkers(newMarkers)
    } catch (error) {
      console.error("Error updating markers", error)
    }
  }

  const getMarkerIconByStatus = (status: string): string => {
    switch (status) {
      case "pending":
        return "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
      case "claimed":
        return "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
      case "in_progress":
        return "https://maps.google.com/mapfiles/ms/icons/purple-dot.png"
      case "completed":
        return "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
      case "cancelled":
        return "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
      default:
        return "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
    }
  }

  const centerOnCurrentLocation = async () => {
    if (!googleMapRef.current || !currentLocation) return

    try {
      await googleMapRef.current.setCamera({
        coordinate: currentLocation,
        zoom: 15,
        animate: true,
      })
    } catch (error) {
      console.error("Error centering map", error)
    }
  }

  return (
    <div className="relative h-full w-full">
      <div ref={(ref) => (mapRef.current = ref)} className="h-full w-full" />
      
      <IonFab vertical="bottom" horizontal="end" slot="fixed">
        <IonFabButton onClick={centerOnCurrentLocation} color="light" size="small">
          <IonIcon icon={locateOutline} />
        </IonFabButton>
      </IonFab>
      
      <IonLoading isOpen={loading} message="Loading map..." />
    </div>
  )
}

