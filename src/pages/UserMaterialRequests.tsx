"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonLoading,
  IonToast,
  IonFab,
  IonFabButton,
  IonIcon,
  IonList,
  IonAlert,
  IonModal,
  IonButton,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonInput,
} from "@ionic/react"
import { add, trashOutline, close, locationOutline } from "ionicons/icons"
import { useAuth, getUserDataFromStorage } from "../contexts/AuthContext"
import { firestore } from "../firebase"
import { collection, query, where, getDocs, doc, deleteDoc, orderBy, addDoc, GeoPoint } from "firebase/firestore"
import MaterialRequestItem from "../components/MaterialRequestItem"
import IframeMap from "../components/IframeMap"
import { sendNotification } from "../services/notifications"

interface MaterialRequest {
  id: string
  userId: string
  userName: string
  type: string
  description: string
  quantity?: string
  address: string
  status: "pending" | "accepted" | "completed"
  createdAt: Date
  location?: {
    lat: number
    lng: number
  }
}

interface MaterialPrice {
  id: string
  name: string
  price: number
  unit: string
}

const UserMaterialRequests: React.FC = () => {
  const { userData } = useAuth()
  const storedUserData = getUserDataFromStorage()
  const userInfo = userData || storedUserData

  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showAlert, setShowAlert] = useState(false)
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null)

  // New state for material prices
  const [materialPrices, setMaterialPrices] = useState<MaterialPrice[]>([])

  // New state for the create request modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [materialType, setMaterialType] = useState("")
  const [description, setDescription] = useState("")
  const [quantity, setQuantity] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Fetch material prices
  const fetchMaterialPrices = useCallback(async () => {
    try {
      const pricesRef = collection(firestore, "materialPrices");
      const q = query(pricesRef, orderBy("name"));
      const querySnapshot = await getDocs(q);
      
      const prices: MaterialPrice[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        prices.push({
          id: doc.id,
          name: data.name,
          price: data.price,
          unit: data.unit
        });
      });
      
      setMaterialPrices(prices);
    } catch (error) {
      console.error("Error fetching material prices:", error);
    }
  }, []);

  useEffect(() => {
    if (userInfo?.uid) {
      fetchMaterialRequests()
      fetchMaterialPrices()
    }
  }, [userInfo?.uid, statusFilter, fetchMaterialPrices]) // Added fetchMaterialPrices to the dependency array

  const fetchMaterialRequests = useCallback(async () => {
    if (!userInfo?.uid) return

    try {
      setLoading(true)
      const requestsRef = collection(firestore, "materialRequests")

      // Only get requests for the current user
      const q = query(requestsRef, where("userId", "==", userInfo.uid), orderBy("createdAt", "desc"))

      const querySnapshot = await getDocs(q)
      const requests: MaterialRequest[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        requests.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          type: data.type,
          description: data.description,
          quantity: data.quantity,
          address: data.address,
          status: data.status,
          createdAt: data.createdAt?.toDate() || new Date(),
          location: data.location
            ? {
                lat: data.location.latitude,
                lng: data.location.longitude,
              }
            : undefined,
        })
      })

      // Apply status filter if needed
      const filteredRequests =
        statusFilter !== "all" ? requests.filter((request) => request.status === statusFilter) : requests

      // Only update state if the data has actually changed
      setMaterialRequests(filteredRequests)
    } catch (error) {
      console.error("Error fetching material requests", error)
      setToastMessage("Error loading your requests")
      setShowToast(true)
    } finally {
      setLoading(false)
    }
  }, [userInfo?.uid, statusFilter])

  const handleRefresh = useCallback(
    async (event: CustomEvent) => {
      await fetchMaterialRequests()
      event.detail.complete()
    },
    [fetchMaterialRequests],
  )

  const confirmDeleteRequest = (requestId: string) => {
    setRequestToDelete(requestId)
    setShowAlert(true)
  }

  const handleDeleteRequest = async () => {
    if (!requestToDelete) return

    try {
      setLoading(true)

      // Delete the request
      const requestRef = doc(firestore, "materialRequests", requestToDelete)
      await deleteDoc(requestRef)

      setToastMessage("Request deleted successfully")
      setShowToast(true)

      // Refresh the list
      fetchMaterialRequests()
    } catch (error) {
      console.error("Error deleting request", error)
      setToastMessage("Error deleting request")
      setShowToast(true)
    } finally {
      setLoading(false)
      setRequestToDelete(null)
    }
  }

  const handleSubmitRequest = async () => {
    if (!materialType || !description || !selectedLocation || !userInfo) {
      setToastMessage("Please fill in all required fields and select a location on the map")
      setShowToast(true)
      return
    }

    try {
      setLoading(true)

      // Get address from coordinates (simplified for demo)
      const address = "Selected location in map"

      const newRequest = {
        userId: userInfo.uid,
        userName: userInfo.name,
        type: materialType,
        description,
        quantity,
        location: new GeoPoint(selectedLocation.lat, selectedLocation.lng),
        address,
        status: "pending",
        createdAt: new Date(),
      }

      const docRef = await addDoc(collection(firestore, "materialRequests"), newRequest)

      // Notify junkshop owners about the new material request
      // In a real app, you would query for all junkshop owners and notify them
      await sendNotification({
        userId: userInfo.uid,
        title: "Material Request Submitted",
        message: `Your ${materialType} request has been submitted successfully.`,
        type: "request",
        relatedId: docRef.id,
      })

      setShowCreateModal(false)
      resetForm()

      setToastMessage("Material request submitted successfully!")
      setShowToast(true)

      // Refresh the list
      fetchMaterialRequests()
    } catch (error) {
      console.error("Error submitting material request", error)
      setToastMessage("Error submitting request. Please try again.")
      setShowToast(true)
    } finally {
      setLoading(false)
    }
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    resetForm()
  }

  const resetForm = () => {
    setMaterialType("")
    setDescription("")
    setQuantity("")
    setSelectedLocation(null)
  }

  const handleLocationSelect = (location: { lat: number; lng: number }) => {
    setSelectedLocation(location)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>My Recyclables</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="p-4">
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

          <IonList className="mt-4">
            {materialRequests.length === 0 ? (
              <div className="text-center p-8">
                <IonIcon icon={trashOutline} style={{ fontSize: "48px", color: "var(--ion-color-medium)" }} />
                <p className="mt-4 text-medium">No material requests found</p>
                <IonButton className="mt-4" onClick={() => setShowCreateModal(true)}>
                  Create New Request
                </IonButton>
              </div>
            ) : (
              materialRequests.map((request) => (
                <MaterialRequestItem
                  key={request.id}
                  id={request.id}
                  type={request.type}
                  description={request.description}
                  address={request.address}
                  status={request.status}
                  createdAt={request.createdAt}
                  userName={request.userName}
                  onDelete={request.status === "pending" ? () => confirmDeleteRequest(request.id) : undefined}
                  isJunkShopOwner={false}
                />
              ))
            )}
          </IonList>
        </div>

        {/* Create Material Request Modal */}
        <IonModal isOpen={showCreateModal} onDidDismiss={handleCloseModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Create Material Request</IonTitle>
              <IonButton slot="end" fill="clear" onClick={handleCloseModal}>
                <IonIcon icon={close} />
              </IonButton>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <div className="mb-4">
              <IonItem className="mb-4">
                <IonLabel position="stacked">Material Type*</IonLabel>
                <IonSelect value={materialType} onIonChange={(e) => setMaterialType(e.detail.value)}>
                  {materialPrices.length > 0 ? (
                    materialPrices.map((material) => (
                      <IonSelectOption key={material.id} value={material.name}>
                        {material.name} per {material.unit}
                      </IonSelectOption>
                    ))
                  ) : (
                    <>
                      <IonSelectOption value="paper">Paper</IonSelectOption>
                      <IonSelectOption value="plastic">Plastic</IonSelectOption>
                      <IonSelectOption value="metal">Metal</IonSelectOption>
                      <IonSelectOption value="glass">Glass</IonSelectOption>
                      <IonSelectOption value="electronics">Electronics</IonSelectOption>
                      <IonSelectOption value="other">Other</IonSelectOption>
                    </>
                  )}
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
                  rows={3}
                />
              </IonItem>
            </div>

            <div className="mb-4">
              <h4 className="text-md font-medium mb-2 px-2 flex items-center">
                <IonIcon icon={locationOutline} className="mr-2" />
                Select Location on Map*
              </h4>
              <p className="text-sm text-gray-500 mb-2 px-2">Use the buttons below to set your location</p>
              
              {/* Use the new IframeMap component */}
              <IframeMap 
                onLocationSelect={handleLocationSelect}
                selectedLocation={selectedLocation}
              />
            </div>

            <IonButton
              expand="block"
              onClick={handleSubmitRequest}
              color="success"
              className="mt-4"
              disabled={!selectedLocation}
            >
              Submit Request
            </IonButton>
          </IonContent>
        </IonModal>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setShowCreateModal(true)}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonLoading isOpen={loading} message="Please wait..." />
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          position="bottom"
        />
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Confirm Delete"
          message="Are you sure you want to delete this request?"
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
            },
            {
              text: 'Delete',
              handler: () => handleDeleteRequest(),
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default UserMaterialRequests;
