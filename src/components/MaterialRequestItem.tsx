"use client"

import type React from "react"
import { IonItem, IonBadge, IonButton, IonIcon, IonItemSliding, IonItemOptions, IonItemOption } from "@ionic/react"
import { checkmarkCircle, trashBin, locationOutline, timeOutline } from "ionicons/icons"

interface MaterialRequestProps {
  id: string
  type: string
  description: string
  address: string
  status: "pending" | "accepted" | "completed"
  createdAt: Date
  userName: string
  onAccept?: (id: string) => void
  onComplete?: (id: string) => void
  onDelete?: (id: string) => void
  isJunkShopOwner: boolean
}

const MaterialRequestItem: React.FC<MaterialRequestProps> = ({
  id,
  type,
  description,
  address,
  status,
  createdAt,
  userName,
  onAccept,
  onComplete,
  onDelete,
  isJunkShopOwner,
}) => {
  const getStatusColor = () => {
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString()
  }

  return (
    <IonItemSliding>
      <IonItem>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium capitalize">{type}</h3>
            <IonBadge color={getStatusColor()}>{status}</IonBadge>
          </div>
          <p className="text-sm">{description}</p>
          <div className="flex items-center text-xs text-gray-500 mt-1">
            <IonIcon icon={locationOutline} className="mr-1" />
            <span className="mr-3">{address}</span>
            <IonIcon icon={timeOutline} className="mr-1" />
            <span>{formatDate(createdAt)}</span>
          </div>
          {isJunkShopOwner && <p className="text-xs text-gray-500 mt-1">Reported by: {userName}</p>}

          {isJunkShopOwner && status === "pending" && (
            <IonButton size="small" color="success" className="mt-2" onClick={() => onAccept && onAccept(id)}>
              Accept
            </IonButton>
          )}

          {isJunkShopOwner && status === "accepted" && (
            <IonButton size="small" color="success" className="mt-2" onClick={() => onComplete && onComplete(id)}>
              Mark as Completed
            </IonButton>
          )}
        </div>
      </IonItem>

      <IonItemOptions side="end">
        {status === "pending" && onDelete && (
          <IonItemOption color="danger" onClick={() => onDelete(id)}>
            <IonIcon slot="icon-only" icon={trashBin} />
          </IonItemOption>
        )}
        {status === "accepted" && isJunkShopOwner && onComplete && (
          <IonItemOption color="success" onClick={() => onComplete(id)}>
            <IonIcon slot="icon-only" icon={checkmarkCircle} />
          </IonItemOption>
        )}
      </IonItemOptions>
    </IonItemSliding>
  )
}

export default MaterialRequestItem
