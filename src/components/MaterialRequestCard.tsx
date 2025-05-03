"use client"

import type React from "react"
import {
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonCardTitle,
  IonCardSubtitle,
  IonButton,
  IonIcon,
  IonBadge,
  IonChip,
} from "@ionic/react"
import {
  locationOutline,
  timeOutline,
  personOutline,
  checkmarkCircleOutline,
  carOutline,
  closeCircleOutline,
} from "ionicons/icons"

interface MaterialRequest {
  id: string
  userId: string
  userName: string
  type: string
  description: string
  quantity: string
  location: {
    lat: number
    lng: number
  }
  address: string
  status: "pending" | "claimed" | "in_progress" | "completed" | "cancelled"
  createdAt: Date
  claimedBy?: string
  claimedByName?: string
  claimedAt?: Date
  completedAt?: Date
  estimatedPickupTime?: Date
  actualPickupTime?: Date
  notes?: string
  imageUrl?: string
}

interface MaterialRequestCardProps {
  request: MaterialRequest
  onClaim?: () => void
  onUpdateStatus?: (requestId: string, status: "in_progress" | "completed" | "cancelled") => void
  isJunkshopOwner: boolean
}

export const MaterialRequestCard: React.FC<MaterialRequestCardProps> = ({
  request,
  onClaim,
  onUpdateStatus,
  isJunkshopOwner,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "warning"
      case "claimed":
        return "primary"
      case "in_progress":
        return "tertiary"
      case "completed":
        return "success"
      case "cancelled":
        return "danger"
      default:
        return "medium"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "in_progress":
        return "In Progress"
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const getMaterialIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "paper":
        return "newspaper-outline"
      case "plastic":
        return "water-outline"
      case "metal":
        return "hardware-chip-outline"
      case "glass":
        return "wine-outline"
      case "electronics":
        return "laptop-outline"
      default:
        return "cube-outline"
    }
  }

  return (
    <IonCard className="overflow-hidden">
      <div className="relative">
        {request.imageUrl ? (
          <img
            src={request.imageUrl || "/placeholder.svg"}
            alt={request.type}
            className="w-full h-32 object-cover"
          />
        ) : (
          <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
            <IonIcon
              icon={getMaterialIcon(request.type)}
              style={{ fontSize: "48px", color: "var(--ion-color-medium)" }}
            />
          </div>
        )}
        <IonBadge
          color={getStatusColor(request.status)}
          className="absolute top-2 right-2 px-2 py-1"
        >
          {getStatusLabel(request.status)}
        </IonBadge>
      </div>

      <IonCardHeader>
        <div className="flex justify-between items-start">
          <div>
            <IonCardSubtitle>{request.type}</IonCardSubtitle>
            <IonCardTitle className="text-lg">{request.quantity}</IonCardTitle>
          </div>
          <IonChip color="medium" outline>
            {new Date(request.createdAt).toLocaleDateString()}
          </IonChip>
        </div>
      </IonCardHeader>

      <IonCardContent>
        <p className="mb-3">{request.description}</p>

        <div className="space-y-2 text-sm text-gray-600">
          <p className="flex items-center">
            <IonIcon icon={personOutline} className="mr-2" />
            {request.userName}
          </p>
          <p className="flex items-center">
            <IonIcon icon={locationOutline} className="mr-2" />
            {request.address}
          </p>
          <p className="flex items-center">
            <IonIcon icon={timeOutline} className="mr-2" />
            {request.createdAt.toLocaleString()}
          </p>
        </div>

        {request.estimatedPickupTime && (
          <div className="mt-3 p-2 bg-blue-50 rounded-md">
            <p className="text-sm font-medium text-blue-700">
              Estimated pickup: {request.estimatedPickupTime.toLocaleString()}
            </p>
            {request.notes && <p className="text-sm text-blue-600 mt-1">{request.notes}</p>}
          </div>
        )}

        {isJunkshopOwner && (
          <div className="mt-4 flex flex-wrap gap-2">
            {request.status === "pending" && (
              <IonButton color="primary" size="small" onClick={onClaim}>
                <IonIcon icon={checkmarkCircleOutline} slot="start" />
                Claim
              </IonButton>
            )}
            
            {request.status === "claimed" && onUpdateStatus && (
              <IonButton color="tertiary" size="small" onClick={() => onUpdateStatus(request.id, "in_progress")}>
                <IonIcon icon={carOutline} slot="start" />
                Start Pickup
              </IonButton>
            )}
            
            {request.status === "in_progress" && onUpdateStatus && (
              <IonButton color="success" size="small" onClick={() => onUpdateStatus(request.id, "completed")}>
                <IonIcon icon={checkmarkCircleOutline} slot="start" />
                Mark Completed
              </IonButton>
            )}
            
            {(request.status === "claimed" || request.status === "in_progress") && onUpdateStatus && (
              <IonButton color="danger" size="small" fill="outline" onClick={() => onUpdateStatus(request.id, "cancelled")}>
                <IonIcon icon={closeCircleOutline} slot="start" />
                Cancel
              </IonButton>
            )}
          </div>
        )}
      </IonCardContent>
    </IonCard>
  )
}

