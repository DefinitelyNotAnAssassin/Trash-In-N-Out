"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonLoading,
  IonAlert,
  IonProgressBar,
  IonList,
  IonItem,
  IonLabel,
  IonThumbnail,
} from "@ionic/react"
import { trophy, gift, time } from "ionicons/icons"
import { useAuth } from "../contexts/AuthContext"
import { collection, query, getDocs, doc, updateDoc, addDoc, Timestamp, where } from "firebase/firestore"
import { firestore } from "../firebase"

interface Reward {
  id: string
  title: string
  description: string
  pointsCost: number
  image: string
  available: boolean
}

interface RedemptionHistory {
  id: string
  userId: string
  userName: string
  rewardId: string
  rewardTitle: string
  pointsCost: number
  redeemedAt: Date
  status: "pending" | "completed"
}

const Rewards: React.FC = () => {
  const { userData } = useAuth()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [redemptionHistory, setRedemptionHistory] = useState<RedemptionHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState("")
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)

  useEffect(() => {
    fetchRewards()
    fetchRedemptionHistory()
  }, [userData])

  const fetchRewards = async () => {
    try {
      setLoading(true)

      const rewardsRef = collection(firestore, "rewards")
      const q = query(rewardsRef, where("available", "==", true))

      const querySnapshot = await getDocs(q)
      const rewardsList: Reward[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        rewardsList.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          pointsCost: data.pointsCost,
          image: data.image,
          available: data.available,
        })
      })

      setRewards(rewardsList)
    } catch (error) {
      console.error("Error fetching rewards", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRedemptionHistory = async () => {
    if (!userData) return

    try {
      setLoading(true)

      const redemptionsRef = collection(firestore, "redemptions")
      const q = query(redemptionsRef, where("userId", "==", userData.uid))

      const querySnapshot = await getDocs(q)
      const redemptionsList: RedemptionHistory[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        redemptionsList.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          rewardId: data.rewardId,
          rewardTitle: data.rewardTitle,
          pointsCost: data.pointsCost,
          redeemedAt: data.redeemedAt.toDate(),
          status: data.status,
        })
      })

      setRedemptionHistory(redemptionsList)
    } catch (error) {
      console.error("Error fetching redemption history", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRedeemReward = async (reward: Reward) => {
    if (!userData) return

    if (userData.points < reward.pointsCost) {
      setAlertMessage("You don't have enough points to redeem this reward.")
      setShowAlert(true)
      return
    }

    setSelectedReward(reward)
  }

  const confirmRedemption = async () => {
    if (!userData || !selectedReward) return

    try {
      setLoading(true)

      // Create redemption record
      await addDoc(collection(firestore, "redemptions"), {
        userId: userData.uid,
        userName: userData.name,
        rewardId: selectedReward.id,
        rewardTitle: selectedReward.title,
        pointsCost: selectedReward.pointsCost,
        redeemedAt: Timestamp.now(),
        status: "pending",
      })

      // Update user points
      const userRef = doc(firestore, "users", userData.uid)
      await updateDoc(userRef, {
        points: userData.points - selectedReward.pointsCost,
      })

      // Create notification
      await addDoc(collection(firestore, "notifications"), {
        userId: userData.uid,
        title: "Reward Redeemed",
        message: `You have successfully redeemed ${selectedReward.title} for ${selectedReward.pointsCost} points.`,
        read: false,
        createdAt: Timestamp.now(),
        type: "reward",
      })

      setAlertMessage("Reward redeemed successfully!")
      setShowAlert(true)
      setSelectedReward(null)

      // Refresh data
      fetchRedemptionHistory()
    } catch (error) {
      console.error("Error redeeming reward", error)
      setAlertMessage("Error redeeming reward. Please try again.")
      setShowAlert(true)
    } finally {
      setLoading(false)
    }
  }

  const getNextTierPoints = () => {
    const points = userData?.points || 0
    if (points < 100) return 100
    if (points < 500) return 500
    if (points < 1000) return 1000
    return points + 500
  }

  const getCurrentTier = () => {
    const points = userData?.points || 0
    if (points < 100) return "Bronze"
    if (points < 500) return "Silver"
    if (points < 1000) return "Gold"
    return "Platinum"
  }

  const getTierProgress = () => {
    const points = userData?.points || 0
    const nextTier = getNextTierPoints()
    const prevTier = nextTier === 100 ? 0 : nextTier === 500 ? 100 : nextTier === 1000 ? 500 : nextTier - 500
    return (points - prevTier) / (nextTier - prevTier)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Rewards</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="mb-6">
          <IonCard className="bg-green-50">
            <IonCardHeader>
              <IonCardSubtitle>Your Recycling Points</IonCardSubtitle>
              <IonCardTitle className="text-2xl text-green-600">{userData?.points || 0} Points</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="mb-2">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{getCurrentTier()} Tier</span>
                  <span className="text-sm font-medium">{getNextTierPoints()} Points</span>
                </div>
                <IonProgressBar value={getTierProgress()} color="success" />
              </div>
              <p className="text-sm text-gray-600">
                {getNextTierPoints() - (userData?.points || 0)} points until next tier
              </p>
            </IonCardContent>
          </IonCard>
        </div>

        <h2 className="text-xl font-bold mb-4 flex items-center">
          <IonIcon icon={gift} className="mr-2" color="success" />
          Available Rewards
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {rewards.map((reward) => (
            <IonCard key={reward.id}>
              <img
                src={reward.image || "/placeholder.svg?height=120&width=300&query=eco-friendly reward"}
                alt={reward.title}
                className="w-full h-32 object-cover"
              />
              <IonCardHeader>
                <div className="flex justify-between items-center">
                  <IonCardTitle className="text-lg">{reward.title}</IonCardTitle>
                  <IonBadge color="success">{reward.pointsCost} pts</IonBadge>
                </div>
              </IonCardHeader>
              <IonCardContent>
                <p className="text-sm mb-4">{reward.description}</p>
                <IonButton
                  expand="block"
                  color="success"
                  disabled={(userData?.points || 0) < reward.pointsCost}
                  onClick={() => handleRedeemReward(reward)}
                >
                  Redeem
                </IonButton>
              </IonCardContent>
            </IonCard>
          ))}
        </div>

        <h2 className="text-xl font-bold mb-4 flex items-center">
          <IonIcon icon={time} className="mr-2" color="medium" />
          Redemption History
        </h2>

        {redemptionHistory.length === 0 ? (
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No redemption history yet</p>
          </div>
        ) : (
          <IonList>
            {redemptionHistory.map((redemption) => (
              <IonItem key={redemption.id}>
                <IonThumbnail slot="start">
                  <div className="w-full h-full flex items-center justify-center bg-green-100 rounded-full">
                    <IonIcon icon={trophy} color="success" size="large" />
                  </div>
                </IonThumbnail>
                <IonLabel>
                  <h2>{redemption.rewardTitle}</h2>
                  <p className="text-sm text-gray-500">{redemption.redeemedAt.toLocaleDateString()}</p>
                  <p className="text-sm">
                    <IonBadge color={redemption.status === "completed" ? "success" : "warning"}>
                      {redemption.status}
                    </IonBadge>
                  </p>
                </IonLabel>
                <div slot="end" className="text-right">
                  <div className="font-bold text-green-600">-{redemption.pointsCost} pts</div>
                </div>
              </IonItem>
            ))}
          </IonList>
        )}

        <IonLoading isOpen={loading} message="Please wait..." />

        <IonAlert
          isOpen={showAlert && !selectedReward}
          onDidDismiss={() => setShowAlert(false)}
          header="Alert"
          message={alertMessage}
          buttons={["OK"]}
        />

        <IonAlert
          isOpen={!!selectedReward}
          onDidDismiss={() => setSelectedReward(null)}
          header="Confirm Redemption"
          message={`Are you sure you want to redeem ${selectedReward?.title} for ${selectedReward?.pointsCost} points?`}
          buttons={[
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Confirm",
              handler: confirmRedemption,
            },
          ]}
        />
      </IonContent>
    </IonPage>
  )
}

export default Rewards
