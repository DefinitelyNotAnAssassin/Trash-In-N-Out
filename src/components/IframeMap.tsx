"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { IonSpinner, IonButton, IonIcon } from "@ionic/react"
import { locateOutline } from "ionicons/icons"
import { Geolocation } from "@capacitor/geolocation"

// Use the provided Google Maps API key
const GOOGLE_MAPS_API_KEY = "AIzaSyDmSzv-D1glzeKveS_OF0ZlXaWLuvLyhuk"

interface IframeMapProps {
  onLocationSelect: (location: { lat: number; lng: number }) => void
  selectedLocation?: { lat: number; lng: number } | null
}

const IframeMap: React.FC<IframeMapProps> = ({ onLocationSelect, selectedLocation }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapUrl, setMapUrl] = useState("")

  // Initialize map URL when component mounts or when selectedLocation changes
  useEffect(() => {
    // Default center (Philippines)
    const defaultLat = 14.5995
    const defaultLng = 120.9842
    
    // Use selected location or default
    const lat = selectedLocation?.lat || defaultLat
    const lng = selectedLocation?.lng || defaultLng
    
    // Create Google Maps embed URL with marker if location is selected
    let url = `https://www.google.com/maps/embed/v1/view?key=${GOOGLE_MAPS_API_KEY}&center=${lat},${lng}&zoom=15`
    
    if (selectedLocation) {
      url = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${lat},${lng}&zoom=15`
    }
    
    setMapUrl(url)
  }, [selectedLocation])

  // Handle iframe load events
  const handleIframeLoad = () => {
    setIsLoading(false)
  }

  // Handle iframe error
  const handleIframeError = () => {
    setIsLoading(false)
    setError("Failed to load map. Please check your internet connection.")
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
    } catch (err) {
      console.error("Error getting current location:", err)
      setError("Could not get your current location")
    }
  }

  // Handle manual location selection
  const handleManualLocationSelect = () => {
    // Show a prompt to enter coordinates
    const latInput = prompt("Enter latitude (e.g., 14.5995):")
    if (!latInput) return
    
    const lngInput = prompt("Enter longitude (e.g., 120.9842):")
    if (!lngInput) return
    
    const lat = parseFloat(latInput)
    const lng = parseFloat(lngInput)
    
    if (isNaN(lat) || isNaN(lng)) {
      alert("Invalid coordinates. Please enter valid numbers.")
      return
    }
    
    onLocationSelect({ lat, lng })
  }

  return (
    <div className="iframe-map-container">
      <div
        className="iframe-map-wrapper"
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

        <iframe
          ref={iframeRef}
          src={mapUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen={false}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      </div>

      <div className="map-controls" style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
        <IonButton
          expand="block"
          fill="outline"
          size="small"
          style={{ flex: 1 }}
          onClick={getCurrentLocation}
        >
          <IonIcon icon={locateOutline} slot="start" />
          Use My Location
        </IonButton>
        
        <IonButton
          expand="block"
          fill="outline"
          size="small"
          style={{ flex: 1 }}
          onClick={handleManualLocationSelect}
        >
          Enter Coordinates
        </IonButton>
      </div>

      {selectedLocation && (
        <p className="text-xs text-gray-500 mt-1 px-2">
          Selected: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
        </p>
      )}
    </div>
  )
}

export default IframeMap
