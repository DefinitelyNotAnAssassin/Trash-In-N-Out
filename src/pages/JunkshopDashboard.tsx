"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonLoading,
  IonToast,
  IonList,
  IonModal,
  IonItem,
} from "@ionic/react"
import {
  refreshOutline,
  checkmarkCircleOutline,
  hourglassOutline,
  checkmarkDoneCircleOutline,
  scaleOutline,
  trophyOutline,
  mapOutline,
  close,
} from "ionicons/icons"
import { useAuth, getUserDataFromStorage } from "../contexts/AuthContext"
import { firestore } from "../firebase"
import { collection, query, where, getDocs, doc, updateDoc, orderBy, Timestamp } from "firebase/firestore"
import MaterialRequestItem from "../components/MaterialRequestItem"
import { sendNotification } from "../services/notifications"
import { awardPoints } from "../services/rewards"
import { GoogleMap } from "@capacitor/google-maps"

// Use the provided Google Maps API key
const GOOGLE_MAPS_API_KEY = "AIzaSyDmSzv-D1glzeKveS_OF0ZlXaWLuvLyhuk"

interface MaterialRequest {
  id: string
  userId: string
  userName: string
  type: string
  description: string
  address: string
  status: "pending" | "accepted" | "completed"
  createdAt: Date
  location?: {
    lat: number
    lng: number
  }
}

const JunkshopDashboard: React.FC = () => {
  const { userData } = useAuth()
  const storedUserData = getUserDataFromStorage()
  const userInfo = userData || storedUserData

  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<MaterialRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchText, setSearchText] = useState("")
  const [stats, setStats] = useState({
    pending: 0,
    accepted: 0,
    completed: 0,
    totalWeight: 0,
    totalPoints: 0,
  })

  // Map view state
  const [showMapModal, setShowMapModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null)
  const [mapElement, setMapElement] = useState<HTMLElement | null>(null)
  const [googleMap, setGoogleMap] = useState<any>(null)
  const [mapInitialized, setMapInitialized] = useState(false)

  useEffect(() => {
    fetchMaterialRequests()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [materialRequests, statusFilter, searchText])

  const createMap = useCallback(async () => {
    if (!mapElement || !selectedRequest || !selectedRequest.location || !showMapModal || mapInitialized) return

    try {
      // Generate a unique ID for the map
      const mapId = `view-location-map-${Date.now()}`

      // Add a small delay to ensure the DOM is ready
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Make sure the element is actually in the DOM
      if (!document.body.contains(mapElement)) {
        console.error("Map element is not in the DOM")
        return
      }

      const newMap = await GoogleMap.create({
        id: mapId,
        element: mapElement,
        apiKey: GOOGLE_MAPS_API_KEY,
        config: {
          center: selectedRequest.location,
          zoom: 15,
        },
      })

      setGoogleMap(newMap)
      setMapInitialized(true)

      // Add marker for the request location
      await newMap.addMarker({
        coordinate: selectedRequest.location,
        title: selectedRequest.type,
        snippet: selectedRequest.description,
      })
    } catch (error) {
      console.error("Error creating map", error)
      setToastMessage("Error loading map. Please try again.")
      setShowToast(true)
    }
  }, [mapElement, selectedRequest, showMapModal, mapInitialized, GOOGLE_MAPS_API_KEY])

  useEffect(() => {
    if (mapElement && selectedRequest && selectedRequest.location && showMapModal && !mapInitialized) {
      createMap()
    }
  }, [mapElement, selectedRequest, showMapModal, mapInitialized, createMap])

  const fetchMaterialRequests = useCallback(async () => {
    if (!userInfo) return

    try {
      setLoading(true)
      const requestsRef = collection(firestore, "materialRequests")

      // Get requests that are pending or accepted by this junkshop
      const pendingQuery = query(requestsRef, where("status", "==", "pending"), orderBy("createdAt", "desc"))
      const acceptedQuery = query(
        requestsRef,
        where("status", "==", "accepted"),
        where("acceptedBy", "==", userInfo.uid),
        orderBy("createdAt", "desc"),
      )
      const completedQuery = query(
        requestsRef,
        where("status", "==", "completed"),
        where("acceptedBy", "==", userInfo.uid),
        orderBy("createdAt", "desc"),
      )

      const [pendingSnapshot, acceptedSnapshot, completedSnapshot] = await Promise.all([
        getDocs(pendingQuery),
        getDocs(acceptedQuery),
        getDocs(completedQuery),
      ])

      const requests: MaterialRequest[] = []

      // Process pending requests
      pendingSnapshot.forEach((doc) => {
        const data = doc.data()
        requests.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          type: data.type,
          description: data.description,
          address: data.address,
          status: data.status,
          createdAt: data.createdAt.toDate(),
          location: data.location
            ? {
                lat: data.location.latitude,
                lng: data.location.longitude,
              }
            : undefined,
        })
      })

      // Process accepted requests
      acceptedSnapshot.forEach((doc) => {
        const data = doc.data()
        requests.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          type: data.type,
          description: data.description,
          address: data.address,
          status: data.status,
          createdAt: data.createdAt.toDate(),
          location: data.location
            ? {
                lat: data.location.latitude,
                lng: data.location.longitude,
              }
            : undefined,
        })
      })

      // Process completed requests
      completedSnapshot.forEach((doc) => {
        const data = doc.data()
        requests.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          type: data.type,
          description: data.description,
          address: data.address,
          status: data.status,
          createdAt: data.createdAt.toDate(),
          location: data.location
            ? {
                lat: data.location.latitude,
                lng: data.location.longitude,
              }
            : undefined,
        })
      })

      setMaterialRequests(requests)
      calculateStats(requests)
    } catch (error) {
      console.error("Error fetching material requests", error)
    } finally {
      setLoading(false)
    }
  }, [userInfo])

  const calculateStats = (requests: MaterialRequest[]) => {
    const stats = {
      pending: 0,
      accepted: 0,
      completed: 0,
      totalWeight: 0,
      totalPoints: 0,
    }

    requests.forEach((request) => {
      if (request.status === "pending") stats.pending++
      if (request.status === "accepted") stats.accepted++
      if (request.status === "completed") stats.completed++

      // Estimate weight and points based on material type
      // This is a simplified calculation
      const weightEstimate = getWeightEstimate(request.type)
      stats.totalWeight += weightEstimate
      stats.totalPoints += weightEstimate * 10 // 10 points per kg
    })

    setStats(stats)
  }

  const getWeightEstimate = (type: string): number => {
    // Very simplified weight estimation
    switch (type) {
      case "paper":
        return 0.5
      case "plastic":
        return 0.3
      case "metal":
        return 1.0
      case "glass":
        return 0.8
      case "electronics":
        return 2.0
      default:
        return 0.5
    }
  }

  const applyFilters = () => {
    let filtered = [...materialRequests]

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((request) => request.status === statusFilter)
    }

    // Apply search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase()
      filtered = filtered.filter(
        (request) =>
          request.type.toLowerCase().includes(searchLower) ||
          request.description.toLowerCase().includes(searchLower) ||
          request.userName.toLowerCase().includes(searchLower) ||
          request.address.toLowerCase().includes(searchLower),
      )
    }

    setFilteredRequests(filtered)
  }

  const handleRefresh = async (event: CustomEvent) => {
    await fetchMaterialRequests()
    event.detail.complete()
  }

  const handleAcceptRequest = async (requestId: string) => {
    if (!userInfo) return

    try {
      setLoading(true)

      const requestRef = doc(firestore, "materialRequests", requestId)
      await updateDoc(requestRef, {
        status: "accepted",
        acceptedBy: userInfo.uid,
        acceptedByName: userInfo.name,
        acceptedAt: Timestamp.now(),
      })

      // Find the request to get user info
      const foundRequest = materialRequests.find((r) => r.id === requestId)
      if (foundRequest) {
        // Send notification to the user
        await sendNotification({
          userId: foundRequest.userId,
          title: "Material Request Accepted",
          message: `Your ${foundRequest.type} request has been accepted by ${userInfo.name}. They will collect it soon.`,
          type: "status",
          relatedId: requestId,
        })
      }

      setToastMessage("Request accepted successfully!")
      setShowToast(true)

      // Refresh the list
      fetchMaterialRequests()
    } catch (error) {
      console.error("Error accepting request", error)
      setToastMessage("Error accepting request. Please try again.")
      setShowToast(true)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteRequest = async (requestId: string) => {
    if (!userInfo) return

    try {
      setLoading(true)

      const requestRef = doc(firestore, "materialRequests", requestId)
      await updateDoc(requestRef, {
        status: "completed",
        completedAt: Timestamp.now(),
      })

      // Find the request to get user info
      const foundRequest = materialRequests.find((r) => r.id === requestId)
      if (foundRequest) {
        // Award points to the user
        const pointsAwarded = getPointsForMaterial(foundRequest.type)
        await awardPoints(foundRequest.userId, pointsAwarded, `Recycling ${foundRequest.type}`)

        // Award points to the junkshop owner
        await awardPoints(userInfo.uid, Math.floor(pointsAwarded / 2), `Collecting ${foundRequest.type}`)

        // Send notification to the user
        await sendNotification({
          userId: foundRequest.userId,
          title: "Material Request Completed",
          message: `Your ${foundRequest.type} has been collected by ${userInfo.name}. You've earned ${pointsAwarded} points!`,
          type: "status",
          relatedId: requestId,
        })
      }

      setToastMessage("Request completed successfully!")
      setShowToast(true)

      // Refresh the list
      fetchMaterialRequests()
    } catch (error) {
      console.error("Error completing request", error)
      setToastMessage("Error completing request. Please try again.")
      setShowToast(true)
    } finally {
      setLoading(false)
    }
  }

  const getPointsForMaterial = (materialType: string): number => {
    // Points awarded based on material type
    switch (materialType.toLowerCase()) {
      case "paper":
        return 20
      case "plastic":
        return 30
      case "metal":
        return 50
      case "glass":
        return 25
      case "electronics":
        return 100
      default:
        return 15
    }
  }

  const handleViewLocation = (request: MaterialRequest) => {
    if (request.location) {
      setSelectedRequest(request)
      setMapInitialized(false) // Reset map initialization state
      setShowMapModal(true)
    } else {
      setToastMessage("No location data available for this request")
      setShowToast(true)
    }
  }

  const handleCloseMapModal = () => {
    setShowMapModal(false)
    setSelectedRequest(null)
    setMapInitialized(false)

    // Clean up map resources
    if (googleMap) {
      googleMap.destroy()
      setGoogleMap(null)
    }
  }

  useEffect(() => {
    // Cleanup function
    return () => {
      if (googleMap) {
        googleMap.destroy()
      }
    }
  }, [googleMap])

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Junkshop Dashboard</IonTitle>
          <IonButton slot="end" fill="clear" onClick={fetchMaterialRequests}>
            <IonIcon icon={refreshOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <IonCard className="m-0">
            <IonCardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Pending</p>
                  <p className="text-xl font-bold">{stats.pending}</p>
                </div>
                <IonIcon icon={hourglassOutline} color="warning" style={{ fontSize: "24px" }} />
              </div>
            </IonCardContent>
          </IonCard>

          <IonCard className="m-0">
            <IonCardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Accepted</p>
                  <p className="text-xl font-bold">{stats.accepted}</p>
                </div>
                <IonIcon icon={checkmarkCircleOutline} color="primary" style={{ fontSize: "24px" }} />
              </div>
            </IonCardContent>
          </IonCard>

          <IonCard className="m-0">
            <IonCardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Completed</p>
                  <p className="text-xl font-bold">{stats.completed}</p>
                </div>
                <IonIcon icon={checkmarkDoneCircleOutline} color="success" style={{ fontSize: "24px" }} />
              </div>
            </IonCardContent>
          </IonCard>

          <IonCard className="m-0">
            <IonCardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Weight</p>
                  <p className="text-xl font-bold">{stats.totalWeight.toFixed(1)} kg</p>
                </div>
                <IonIcon icon={scaleOutline} color="tertiary" style={{ fontSize: "24px" }} />
              </div>
            </IonCardContent>
          </IonCard>

          <IonCard className="m-0">
            <IonCardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Points Earned</p>
                  <p className="text-xl font-bold">{stats.totalPoints}</p>
                </div>
                <IonIcon icon={trophyOutline} color="success" style={{ fontSize: "24px" }} />
              </div>
            </IonCardContent>
          </IonCard>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <IonSearchbar
            value={searchText}
            onIonChange={(e) => setSearchText(e.detail.value!)}
            placeholder="Search materials, users, locations..."
          />

          <IonSegment value={statusFilter} onIonChange={(e) => setStatusFilter(e.detail.value as string)}>
            <IonSegmentButton value="all">
              <IonLabel>All</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="pending">
              <IonLabel>Pending</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="accepted">
              <IonLabel>Accepted</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="completed">
              <IonLabel>Completed</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </div>

        {/* Material Requests List */}
        <IonList>
          {filteredRequests.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-gray-500">No material requests found</p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div key={request.id} className="mb-2">
                <MaterialRequestItem
                  id={request.id}
                  type={request.type}
                  description={request.description}
                  address={request.address}
                  status={request.status}
                  createdAt={request.createdAt}
                  userName={request.userName}
                  onAccept={handleAcceptRequest}
                  onComplete={handleCompleteRequest}
                  isJunkShopOwner={true}
                />
                {request.location && (
                  <IonButton
                    size="small"
                    fill="clear"
                    className="ml-4 mb-2"
                    onClick={() => handleViewLocation(request)}
                  >
                    <IonIcon icon={mapOutline} slot="start" />
                    View Location
                  </IonButton>
                )}
              </div>
            ))
          )}
        </IonList>

        {/* Location View Modal */}
        <IonModal isOpen={showMapModal} onDidDismiss={handleCloseMapModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Material Location</IonTitle>
              <IonButton slot="end" fill="clear" onClick={handleCloseMapModal}>
                <IonIcon icon={close} />
              </IonButton>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {selectedRequest && (
              <div>
                <IonItem lines="none" className="mb-2">
                  <IonLabel>
                    <h2 className="font-medium capitalize">{selectedRequest.type}</h2>
                    <p>{selectedRequest.description}</p>
                    <p className="text-sm">Reported by: {selectedRequest.userName}</p>
                  </IonLabel>
                </IonItem>

                <div className="h-64 w-full rounded-lg overflow-hidden border border-gray-300 mb-4 map-container">
                  <div
                    ref={(el) => setMapElement(el)}
                    className="h-full w-full map-element"
                    style={{ backgroundColor: "transparent", position: "relative", zIndex: 10 }}
                  />
                </div>

                {selectedRequest.status === "pending" && (
                  <IonButton
                    expand="block"
                    color="success"
                    onClick={() => {
                      handleAcceptRequest(selectedRequest.id)
                      setShowMapModal(false)
                    }}
                  >
                    Accept Request
                  </IonButton>
                )}

                {selectedRequest.status === "accepted" && (
                  <IonButton
                    expand="block"
                    color="success"
                    onClick={() => {
                      handleCompleteRequest(selectedRequest.id)
                      setShowMapModal(false)
                    }}
                  >
                    Mark as Completed
                  </IonButton>
                )}
              </div>
            )}
          </IonContent>
        </IonModal>

        <IonLoading isOpen={loading} message="Please wait..." />
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          position="bottom"
          color="success"
        />
      </IonContent>
    </IonPage>
  )
}

export default JunkshopDashboard
