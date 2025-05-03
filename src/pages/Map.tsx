"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonFab,
  IonFabButton,
  IonIcon,
  IonModal,
  IonButton,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonLoading,
  IonAlert,
  IonInput,
  IonList,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonCardTitle,
  IonBadge,
  IonToast,
  IonSpinner,
} from "@ionic/react"
import { add, close, locationOutline, timeOutline, refreshOutline } from "ionicons/icons"
import { Geolocation } from "@capacitor/geolocation"
import { useAuth, getUserDataFromStorage } from "../contexts/AuthContext"
import { collection, addDoc, GeoPoint, query, getDocs, where, orderBy } from "firebase/firestore"
import { firestore } from "../firebase"
import { GoogleMap } from "@capacitor/google-maps"
import { sendNotification } from "../services/notifications"

interface MaterialRequest {
  id: string
  userId: string
  userName: string
  type: string
  description: string
  quantity?: string
  location: {
    lat: number
    lng: number
  }
  address: string
  status: "pending" | "accepted" | "completed"
  createdAt: Date
}

const Map: React.FC = () => {
  const { userData } = useAuth()
  const storedUserData = getUserDataFromStorage()
  const userInfo = userData || storedUserData

  const [showModal, setShowModal] = useState(false)
  const [materialType, setMaterialType] = useState("")
  const [description, setDescription] = useState("")
  const [quantity, setQuantity] = useState("")
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState("")
  const [mapElement, setMapElement] = useState<HTMLElement | null>(null)
  const [googleMap, setGoogleMap] = useState<any>(null)
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([])
  const [viewMode, setViewMode] = useState<"map" | "list">("map")
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [markerIds, setMarkerIds] = useState<string[]>([])
  const [mapInitialized, setMapInitialized] = useState(false)

  const isResident = userInfo?.role === "resident"

  useEffect(() => {
    getCurrentLocation()
    fetchMaterialRequests()
  }, [])

  useEffect(() => {
    if (mapElement && currentLocation && viewMode === "map" && !mapInitialized) {
      const initMap = async () => {
        try {
          setMapLoading(true)

          // Make sure the element is actually in the DOM
          if (!document.body.contains(mapElement)) {
            console.error("Map element is not in the DOM")
            setMapLoading(false)
            return
          }

          // Generate a unique ID for the map
          const mapId = `google-map-${Date.now()}`

          // Create the map with the unique ID
          const newMap = await GoogleMap.create({
            id: mapId,
            element: mapElement,
            apiKey: "AIzaSyDmSzv-D1glzeKveS_OF0ZlXaWLuvLyhuk",
            config: {
              center: currentLocation,
              zoom: 14,
            },
          })

          setGoogleMap(newMap)
          setMapInitialized(true)

          // Add marker for current location
          const currentLocationMarkerId = await newMap.addMarker({
            coordinate: currentLocation,
            title: "Your location",
          })

          setMarkerIds([currentLocationMarkerId])

          // Set up click listener for the map
          newMap.setOnMarkerClickListener((markerId) => {
            const request = materialRequests.find(
              (r) =>
                r.location?.lat.toFixed(5) === newMap.markers[markerId].coordinate.lat.toFixed(5) &&
                r.location?.lng.toFixed(5) === newMap.markers[markerId].coordinate.lng.toFixed(5),
            )

            if (request && !isResident) {
              // Show details for junkshop owners
              setToastMessage(`${request.type} by ${request.userName}: ${request.description}`)
              setShowToast(true)
            }
          })

          // If junkshop owner, add markers for all material requests
          if (!isResident) {
            updateMapMarkers(newMap)
          }
        } catch (error) {
          console.error("Error creating map", error)
          setToastMessage("Error loading map. Please try again.")
          setShowToast(true)
        } finally {
          setMapLoading(false)
        }
      }

      // Add a small delay to ensure the DOM is ready
      const timer = setTimeout(() => {
        initMap()
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [mapElement, currentLocation, viewMode, mapInitialized, isResident, materialRequests])

  // Clean up map resources when component unmounts
  useEffect(() => {
    return () => {
      if (googleMap) {
        try {
          googleMap.destroy()
        } catch (error) {
          console.error("Error destroying map on unmount:", error)
        }
      }
    }
  }, [googleMap])

  const getCurrentLocation = async () => {
    try {
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
    }
  }

  const updateMapMarkers = async (mapInstance = googleMap) => {
    if (!mapInstance || !materialRequests.length) return

    try {
      // Remove all existing markers except current location
      if (markerIds.length > 1) {
        // Skip the first marker (current location)
        const markersToRemove = markerIds.slice(1)
        if (markersToRemove.length > 0) {
          await mapInstance.removeMarkers(markersToRemove)
        }
      }

      // Start with just the current location marker
      const newMarkerIds = markerIds.length > 0 ? [markerIds[0]] : []

      // Add markers for all material requests
      for (const request of materialRequests) {
        if (request.location) {
          const markerId = await mapInstance.addMarker({
            coordinate: request.location,
            title: request.type,
            snippet: request.description,
          })
          newMarkerIds.push(markerId)
        }
      }

      // Update the marker IDs state
      setMarkerIds(newMarkerIds)
    } catch (error) {
      console.error("Error updating map markers", error)
    }
  }

  const fetchMaterialRequests = async () => {
    try {
      setLoading(true)
      const requestsRef = collection(firestore, "materialRequests")
      let q

      if (isResident) {
        // Residents see their own requests
        q = query(requestsRef, where("userId", "==", userInfo?.uid), orderBy("createdAt", "desc"))
      } else {
        // Junkshop owners see all pending requests
        q = query(requestsRef, where("status", "==", "pending"), orderBy("createdAt", "desc"))
      }

      const querySnapshot = await getDocs(q)
      const requests: MaterialRequest[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        // Only add requests that have location data
        if (data.location) {
          requests.push({
            id: doc.id,
            userId: data.userId,
            userName: data.userName,
            type: data.type,
            description: data.description,
            quantity: data.quantity,
            location: {
              lat: data.location.latitude,
              lng: data.location.longitude,
            },
            address: data.address || "No address provided",
            status: data.status,
            createdAt: data.createdAt?.toDate() || new Date(),
          })
        }
      })

      setMaterialRequests(requests)

      // If map is already created and we're a junkshop owner, update the markers
      if (googleMap && !isResident) {
        updateMapMarkers()
      }
    } catch (error) {
      console.error("Error fetching material requests", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitRequest = async () => {
    if (!materialType || !description || !currentLocation) {
      setAlertMessage("Please fill in all required fields")
      setShowAlert(true)
      return
    }

    try {
      setLoading(true)

      // Get address from coordinates (simplified for demo)
      const address = "Sample Address, Bacoor, Cavite"

      const newRequest = {
        userId: userInfo?.uid,
        userName: userInfo?.name,
        type: materialType,
        description,
        quantity,
        location: new GeoPoint(currentLocation.lat, currentLocation.lng),
        address,
        status: "pending",
        createdAt: new Date(),
      }

      const docRef = await addDoc(collection(firestore, "materialRequests"), newRequest)

      // Notify junkshop owners about the new material request
      // Query for all junkshop owners
      const usersRef = collection(firestore, "users")
      const junkshopQuery = query(usersRef, where("role", "==", "junkshop"))
      const junkshopSnapshot = await getDocs(junkshopQuery)

      // Send notification to all junkshop owners
      junkshopSnapshot.forEach(async (doc) => {
        await sendNotification({
          userId: doc.id,
          title: "New Recyclable Material",
          message: `${userInfo?.name} has reported ${materialType} for collection.`,
          type: "request",
          relatedId: docRef.id,
        })
      })

      // Also notify the user who created the request
      await sendNotification({
        userId: userInfo?.uid || "",
        title: "Material Request Submitted",
        message: `Your ${materialType} request has been submitted successfully.`,
        type: "request",
        relatedId: docRef.id,
      })

      setShowModal(false)
      setMaterialType("")
      setDescription("")
      setQuantity("")

      setAlertMessage("Material request submitted successfully!")
      setShowAlert(true)

      // Refresh material requests
      fetchMaterialRequests()
    } catch (error) {
      console.error("Error submitting material request", error)
      setAlertMessage("Error submitting request. Please try again.")
      setShowAlert(true)
    } finally {
      setLoading(false)
    }
  }

  const refreshMap = () => {
    if (googleMap) {
      try {
        googleMap.destroy()
      } catch (error) {
        console.error("Error destroying map:", error)
      }
    }
    setGoogleMap(null)
    setMapInitialized(false)
    setMarkerIds([])

    // Add a small delay before fetching new data
    setTimeout(() => {
      getCurrentLocation()
      fetchMaterialRequests()
    }, 300)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "warning"
      case "accepted":
        return "primary"
      case "completed":
        return "success"
      default:
        return "medium"
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{isResident ? "Report Recyclables" : "Find Recyclables"}</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => setViewMode(viewMode === "map" ? "list" : "map")}>
            {viewMode === "map" ? "List View" : "Map View"}
          </IonButton>
          {viewMode === "map" && (
            <IonButton slot="end" fill="clear" onClick={refreshMap}>
              <IonIcon icon={refreshOutline} />
            </IonButton>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding map-content" style={{ "--background": "transparent" }}>
        {viewMode === "map" ? (
          <div className="h-full w-full relative map-container">
            <div
              ref={(el) => setMapElement(el)}
              className="h-full w-full rounded-lg overflow-hidden map-element"
              style={{
                minHeight: "70vh",
                backgroundColor: "transparent",
                position: "relative",
                zIndex: 10,
              }}
            />
            {mapLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 z-20">
                <IonSpinner name="circles" />
                <span className="ml-2 text-white">Loading map...</span>
              </div>
            )}
          </div>
        ) : (
          <IonList>
            {materialRequests.length === 0 ? (
              <div className="text-center p-8">
                <p className="text-gray-500">No material requests found</p>
                {isResident && (
                  <IonButton className="mt-4" onClick={() => setShowModal(true)}>
                    Add New Request
                  </IonButton>
                )}
              </div>
            ) : (
              materialRequests.map((request) => (
                <IonCard key={request.id} className="mb-4">
                  <IonCardHeader>
                    <div className="flex justify-between items-center">
                      <IonCardTitle className="text-lg capitalize">{request.type}</IonCardTitle>
                      <IonBadge color={getStatusColor(request.status)}>{request.status}</IonBadge>
                    </div>
                  </IonCardHeader>
                  <IonCardContent>
                    <p className="mb-2">{request.description}</p>
                    {request.quantity && <p className="text-sm mb-2">Quantity: {request.quantity}</p>}
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <IonIcon icon={locationOutline} className="mr-1" />
                      <span className="mr-3">{request.address}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <IonIcon icon={timeOutline} className="mr-1" />
                      <span>{formatDate(request.createdAt)}</span>
                    </div>
                    {!isResident && <p className="text-xs text-gray-500 mt-2">Reported by: {request.userName}</p>}
                  </IonCardContent>
                </IonCard>
              ))
            )}
          </IonList>
        )}

        {isResident && (
          <IonFab vertical="bottom" horizontal="end" slot="fixed">
            <IonFabButton onClick={() => setShowModal(true)}>
              <IonIcon icon={add} />
            </IonFabButton>
          </IonFab>
        )}

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Report Recyclable Materials</h2>
              <IonButton fill="clear" onClick={() => setShowModal(false)}>
                <IonIcon icon={close} />
              </IonButton>
            </div>

            <IonItem className="mb-4">
              <IonLabel position="stacked">Material Type*</IonLabel>
              <IonSelect value={materialType} onIonChange={(e) => setMaterialType(e.detail.value)}>
                <IonSelectOption value="paper">Paper</IonSelectOption>
                <IonSelectOption value="plastic">Plastic</IonSelectOption>
                <IonSelectOption value="metal">Metal</IonSelectOption>
                <IonSelectOption value="glass">Glass</IonSelectOption>
                <IonSelectOption value="electronics">Electronics</IonSelectOption>
                <IonSelectOption value="other">Other</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem className="mb-4">
              <IonLabel position="stacked">Quantity (approx.)</IonLabel>
              <IonInput
                value={quantity}
                placeholder="e.g., 2 bags, 5 kg, etc."
                onIonChange={(e) => setQuantity(e.detail.value!)}
              />
            </IonItem>

            <IonItem className="mb-4">
              <IonLabel position="stacked">Description*</IonLabel>
              <IonTextarea
                value={description}
                onIonChange={(e) => setDescription(e.detail.value!)}
                placeholder="Describe the materials (condition, etc.)"
                rows={4}
              />
            </IonItem>

            <IonButton expand="block" onClick={handleSubmitRequest} color="success">
              Submit Request
            </IonButton>
          </div>
        </IonModal>

        <IonLoading isOpen={loading} message="Please wait..." />

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Alert"
          message={alertMessage}
          buttons={["OK"]}
        />

        <IonToast isOpen={showToast} message={toastMessage} duration={2000} onDidDismiss={() => setShowToast(false)} />
      </IonContent>
    </IonPage>
  )
}

export default Map
