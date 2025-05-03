"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { IonSpinner, IonButton, IonIcon } from "@ionic/react"
import { locateOutline } from "ionicons/icons"
import { GoogleMap } from "@capacitor/google-maps"
import { Geolocation } from "@capacitor/geolocation"

// Use the provided Google Maps API key
const GOOGLE_MAPS_API_KEY = "AIzaSyDmSzv-D1glzeKveS_OF0ZlXaWLuvLyhuk"

interface LocationMapProps {
  onLocationSelect: (location: { lat: number; lng: number }) => void
  selectedLocation?: { lat: number; lng: number } | null
}

const LocationMap: React.FC<LocationMapProps> = ({ onLocationSelect, selectedLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [markerId, setMarkerId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapInitialized, setMapInitialized] = useState(false)

  // Initialize map when component mounts
  useEffect(() => {
    let isMounted = true
    let retryCount = 0
    const maxRetries = 3

    const initializeMap = async () => {
      if (!mapRef.current) return

      try {
        setIsLoading(true)
        setError(null)

        // Clean up any existing map
        if (mapInstance) {
          try {
            await mapInstance.destroy()
          } catch (e) {
            console.error("Error destroying existing map:", e)
          }
        }

        // Default center (Philippines)
        const defaultCenter = {
          lat: 14.5995,
          lng: 120.9842,
        }

        // Force the map element to have explicit dimensions
        mapRef.current.style.width = "100%"
        mapRef.current.style.height = "300px"
        mapRef.current.style.backgroundColor = "#f0f0f0"

        // Wait for the next render cycle
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Check if element is in DOM and has dimensions
        if (!document.body.contains(mapRef.current)) {
          throw new Error("Map element is not in the DOM")
        }

        const rect = mapRef.current.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) {
          throw new Error("Map element has zero width or height")
        }

        console.log("Creating map with dimensions:", rect)

        // Create the map
        const newMap = await GoogleMap.create({
          id: `location-map-${Date.now()}`,
          element: mapRef.current,
          apiKey: GOOGLE_MAPS_API_KEY,
          config: {
            center: defaultCenter,
            zoom: 12,
          },
          forceCreate: true,
        })

        if (isMounted) {
          setMapInstance(newMap)
          setMapInitialized(true)
          setIsLoading(false)

          // Set up map click listener
          newMap.setOnMapClickListener(async (event) => {
            const location = {
              lat: event.latitude,
              lng: event.longitude,
            }

            // Update marker
            await updateMarker(newMap, location)

            // Call the callback
            onLocationSelect(location)
          })

          // If there's a selected location, add a marker
          if (selectedLocation) {
            await updateMarker(newMap, selectedLocation)
          }
        }
      } catch (err) {
        console.error("Error initializing map:", err)

        if (isMounted) {
          setError(`Failed to load map: ${err.message}`)
          setIsLoading(false)

          // Retry initialization if under max retries
          if (retryCount < maxRetries) {
            retryCount++
            console.log(`Retrying map initialization (${retryCount}/${maxRetries})...`)
            setTimeout(initializeMap, 1000)
          }
        }
      }
    }

    initializeMap()

    return () => {
      isMounted = false

      // Clean up map on unmount
      if (mapInstance) {
        mapInstance.destroy().catch((e) => console.error("Error destroying map:", e))
      }
    }
  }, [])

  // Update marker on the map
  const updateMarker = async (map: any, location: { lat: number; lng: number }) => {
    try {
      // Remove existing marker
      if (markerId) {
        await map.removeMarker(markerId)
      }

      // Add new marker
      const newMarkerId = await map.addMarker({
        coordinate: location,
        title: "Selected location",
        draggable: true,
      })

      setMarkerId(newMarkerId)

      // Set up marker drag listener
      map.setOnMarkerDragEndListener((event) => {
        const newLocation = {
          lat: event.latitude,
          lng: event.longitude,
        }
        onLocationSelect(newLocation)
      })

      // Center map on the marker
      await map.setCamera({
        coordinate: location,
        zoom: 15,
        animate: true,
      })
    } catch (err) {
      console.error("Error updating marker:", err)
    }
  }

  // Get current location
  const getCurrentLocation = async () => {
    try {
      const position = await Geolocation.getCurrentPosition()
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }

      onLocationSelect(location)

      if (mapInstance && mapInitialized) {
        await updateMarker(mapInstance, location)
      }
    } catch (err) {
      console.error("Error getting current location:", err)
      setError("Could not get your current location")
    }
  }

  return (
    <div className="location-map-container">
      <div
        className="location-map-wrapper"
        style={{
          position: "relative",
          height: "300px",
          width: "100%",
          borderRadius: "8px",
          overflow: "hidden",
          border: "1px solid #ccc",
          backgroundColor: "#f0f0f0",
        }}
      >
        {isLoading && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              zIndex: 20,
            }}
          >
            <IonSpinner name="circles" />
            <p style={{ marginTop: "10px", fontSize: "14px", color: "#666" }}>Loading map...</p>
          </div>
        )}

        {error && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              zIndex: 20,
              padding: "20px",
            }}
          >
            <p style={{ color: "#d32f2f", marginBottom: "15px", textAlign: "center" }}>{error}</p>
            <IonButton onClick={() => window.location.reload()}>Reload Page</IonButton>
          </div>
        )}

        <div
          ref={mapRef}
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "#f0f0f0",
          }}
        />
      </div>

      <IonButton
        expand="block"
        fill="outline"
        size="small"
        className="mt-3 mb-3"
        onClick={getCurrentLocation}
        disabled={!mapInitialized || isLoading}
      >
        <IonIcon icon={locateOutline} slot="start" />
        Use My Current Location
      </IonButton>

      {selectedLocation && (
        <p className="text-xs text-gray-500 mt-1 px-2">
          Selected: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
        </p>
      )}
    </div>
  )
}

export default LocationMap
