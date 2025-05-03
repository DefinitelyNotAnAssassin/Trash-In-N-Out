"use client"

import type React from "react"
import { IonCard, IonCardContent, IonIcon } from "@ionic/react"
import {
  hourglassOutline,
  checkmarkCircleOutline,
  checkmarkDoneCircleOutline,
  scaleOutline,
  trophyOutline,
} from "ionicons/icons"

interface DashboardStatsProps {
  stats: {
    pending: number
    claimed: number
    completed: number
    totalWeight: number
    totalPoints: number
  }
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <StatCard
        title="Pending"
        value={stats.pending}
        icon={hourglassOutline}
        color="warning"
      />
      <StatCard
        title="Claimed"
        value={stats.claimed}
        icon={checkmarkCircleOutline}
        color="primary"
      />
      <StatCard
        title="Completed"
        value={stats.completed}
        icon={checkmarkDoneCircleOutline}
        color="success"
      />
      <StatCard
        title="Total Weight"
        value={`${stats.totalWeight.toFixed(1)} kg`}
        icon={scaleOutline}
        color="tertiary"
      />
      <StatCard
        title="Points Earned"
        value={stats.totalPoints}
        icon={trophyOutline}
        color="success"
      />
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number | string
  icon: string
  color: string
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
  return (
    <IonCard className="m-0">
      <IonCardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">{title}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
          <IonIcon
            icon={icon}
            color={color}
            style={{ fontSize: "24px" }}
          />
        </div>
      </IonCardContent>
    </IonCard>
  )
}

