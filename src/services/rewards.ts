import { firestore } from "../firebase"
import { doc, updateDoc, increment, getDoc } from "firebase/firestore"
import { sendRewardNotification } from "./notifications"

export const awardPoints = async (userId: string, points: number, reason: string) => {
  try {
    // Update user points
    const userRef = doc(firestore, "users", userId)
    await updateDoc(userRef, {
      points: increment(points),
    })

    // Send notification
    await sendRewardNotification(userId, points, reason)

    return true
  } catch (error) {
    console.error("Error awarding points:", error)
    return false
  }
}

export const getUserPoints = async (userId: string) => {
  try {
    const userRef = doc(firestore, "users", userId)
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      return userDoc.data().points || 0
    }

    return 0
  } catch (error) {
    console.error("Error getting user points:", error)
    return 0
  }
}

export const redeemReward = async (userId: string, rewardId: string, pointsCost: number) => {
  try {
    // Get current user points
    const points = await getUserPoints(userId)

    if (points < pointsCost) {
      return {
        success: false,
        message: "Not enough points",
      }
    }

    // Deduct points
    const userRef = doc(firestore, "users", userId)
    await updateDoc(userRef, {
      points: increment(-pointsCost),
    })

    return {
      success: true,
      message: "Reward redeemed successfully",
    }
  } catch (error) {
    console.error("Error redeeming reward:", error)
    return {
      success: false,
      message: "Error redeeming reward",
    }
  }
}
