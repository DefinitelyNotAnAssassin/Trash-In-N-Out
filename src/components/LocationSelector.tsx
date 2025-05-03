"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonSearchbar,
  IonModal,
  IonLoading,
} from "@ionic/react"
import { closeOutline, locateOutline, checkmarkOutline } from "ionicons/icons"
import { Geolocation } from "@capacitor/geolocation"
import { GoogleMap } from "@capacitor/google-maps"

interface LocationSelectorProps {
  isOpen: boolean
  onClose: () => void
  onLocationSelect: (location: { lat: number; lng: number }, address: string) => void
  initialLocation: { lat: number; lng: number } | null
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  isOpen,
  onClose,
  onLocationSelect,
  initialLocation,
}) => {
  const mapRef = useRef<HTMLElement | null>(null)
  const googleMapRef = useRef<any>(null)
  const [loading, setLoading] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(initialLocation)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(initialLocation)
  const [address, setAddress] = useState<string>("Selected Location")
  const [searchQuery, setSearchQuery] = useState("")
  const [markerId, setMarkerId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && mapRef.current) {
      if (initialLocation) {
        setCurrentLocation(initialLocation)
        setSelectedLocation(initialLocation)
      } else {
        getCurrentLocation()
      }
    }
  }, [isOpen, mapRef.current])

  useEffect(() => {
    if (mapRef.current && currentLocation && isOpen) {
      createMap()
    }
  }, [mapRef.current, currentLocation, isOpen])

  const getCurrentLocation = async () => {
    try {
      setLoading(true)
      const position = await Geolocation.getCurrentPosition()
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }
      setCurrentLocation(location)
      setSelectedLocation(location)
      getAddressFromCoordinates(location)
    } catch (error) {
      console.error("Error getting location", error)
      // Set default location (Bacoor, Cavite)
      const defaultLocation = {
        lat: 14.4624,
        lng: 120.9642,
      }
      setCurrentLocation(defaultLocation)
      setSelectedLocation(defaultLocation)
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
        id: "location-selector-map",
        element: mapRef.current,
        apiKey: "AIzaSyDmSzv-D1glzeKveS_OF0ZlXaWLuvLyhuk",
        config: {
          center: currentLocation,
          zoom: 15,
        },
      })

      googleMapRef.current = newMap

      // Add marker for selected location
      if (selectedLocation) {
        const id = await newMap.addMarker({
          coordinate: selectedLocation,
          draggable: true,
        })
        setMarkerId(id)
      }

      // Set up click listener
      newMap.setOnMapClickListener(async (location) => {
        setSelectedLocation(location)
        getAddressFromCoordinates(location)
        
        // Update marker
        if (markerId) {
          await newMap.removeMarker(markerId)
        }
        
        const id = await newMap.addMarker({
          coordinate: location,
          draggable: true,
        })
        setMarkerId(id)
      })
      
      // Set up marker drag listener
      newMap.setOnMarkerDragEndListener(async (marker) => {
        setSelectedLocation(marker.coordinate)
        getAddressFromCoordinates(marker.coordinate)
      })
    } catch (error) {
      console.error("Error creating map", error)
    } finally {
      setLoading(false)
    }
  }

  const getAddressFromCoordinates = async (location: { lat: number; lng: number }) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lng}&key=${
          import.meta.env.VITE_GOOGLE_MAPS_API_KEY
        }`
      )
      
      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        setAddress(data.results[0].formatted_address)
      } else {
        setAddress("Selected Location")
      }
    } catch (error) {
      console.error("Error getting address", error)
      setAddress("Selected Location")
    }
  }

  const searchLocation = async () => {
    if (!searchQuery || !googleMapRef.current) return
    
    try {
      setLoading(true)
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          searchQuery
        )}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      )
      
      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        const location = {
          lat: data.results[0].geometry.location.lat,
          lng: data.results[0].geometry.location.lng,
        }
        
        setSelectedLocation(location)
        setAddress(data.results[0].formatted_address)
        
        // Update marker
        if (markerId) {
          await googleMapRef.current.removeMarker(markerId)
        }
        
        const id = await googleMapRef.current.addMarker({
          coordinate: location,
          draggable: true,
        })
        setMarkerId(id)
        
        // Center map
        await googleMapRef.current.setCamera({
          coordinate: location,
          zoom: 15,
          animate: true,
        })
      } else {
        throw new Error("Location not found")
      }
    } catch (error) {
      console.error("Error searching location", error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation, address)
    }
  }

  const centerOnCurrentLocation = async () => {
    try {
      setLoading(true)
      await getCurrentLocation()
      
      if (googleMapRef.current && currentLocation) {
        // Update camera
        await googleMapRef.current.setCamera({
          coordinate: currentLocation,
          zoom: 15,
          animate: true,
        })
        
        // Update marker
        if (markerId) {
          await googleMapRef.current.removeMarker(markerId)
        }
        
        const id = await googleMapRef.current.addMarker({
          coordinate: currentLocation,
          draggable: true,
        })
        setMarkerId(id)
        
        setSelectedLocation(currentLocation)
        getAddressFromCoordinates(currentLocation)
      }
    } catch (error) {
      console.error("Error centering on current location", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Select Location</IonTitle>
          <IonButtons slot="start">
            <IonButton onClick={onClose}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
          <IonButtons slot="end">
            <IonButton onClick={handleConfirm} disabled={!selectedLocation}>
              <IonIcon icon={checkmarkOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      
      <IonContent>
        <div className="p-2">
          <div className="flex items-center">
            <IonSearchbar
              value={searchQuery}
              onIonChange={(e) => setSearchQuery(e.detail.value!)}
              placeholder="Search for a location"
              className="flex-1"
              debounce={1000}
              onIonInput={(e) => {
                if (e.detail.value === "") {
                  setSearchQuery("")
                }
              }}
              onIonChange={(e) => {
                setSearchQuery(e.detail.value!)
                if (e.detail.value) {
                  searchLocation()
                }
              }}
            />
            <IonButton onClick={centerOnCurrentLocation} fill="clear">
              <IonIcon icon={locateOutline} />
            </IonButton>
          </div>
          
          <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
            <p className="font-medium">Selected Address:</p>
            <p>{address}</p>
          </div>
        </div>
        
        <div className="h-full">
          <div ref={(ref) => (mapRef.current = ref)} className="h-full w-full" />
        </div>
        
        <IonLoading isOpen={loading} message="Loading map..." />
      </IonContent>
    </IonModal>
  )
}

