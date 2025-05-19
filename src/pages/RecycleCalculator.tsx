"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge,
  IonItemDivider,
  IonText,
  IonAlert,
  IonToast,
} from "@ionic/react"
import { addCircleOutline, removeCircleOutline, refreshOutline, informationCircleOutline } from "ionicons/icons"
import { firestore } from "../firebase"
import { collection, getDocs } from "firebase/firestore"
import { useAuth } from "../contexts/AuthContext"

interface MaterialPrice {
  id: string
  name: string
  price: number
  unit: string
  description?: string
}

interface CalculationItem {
  materialId: string
  weight: number
  subtotal: number
}

const RecycleCalculator: React.FC = () => {
  const { userData } = useAuth()
  const [materialPrices, setMaterialPrices] = useState<MaterialPrice[]>([])
  const [calculationItems, setCalculationItems] = useState<CalculationItem[]>([])
  const [selectedMaterial, setSelectedMaterial] = useState<string>("")
  const [weight, setWeight] = useState<number>(0)
  const [showInfoAlert, setShowInfoAlert] = useState<boolean>(false)
  const [showToast, setShowToast] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Fetch material prices from Firestore
  useEffect(() => {
    const fetchMaterialPrices = async () => {
      try {
        setIsLoading(true)
        const materialsRef = collection(firestore, "materialPrices")
        const snapshot = await getDocs(materialsRef)

        const materials: MaterialPrice[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          price: doc.data().price,
          unit: doc.data().unit || "kg",
          description: doc.data().description,
        }))

        setMaterialPrices(materials)

        // If no data in Firestore, use default values
        if (materials.length === 0) {
          setMaterialPrices(defaultMaterialPrices)
        }
      } catch (error) {
        console.error("Error fetching material prices:", error)
        // Fallback to default values if fetch fails
        setMaterialPrices(defaultMaterialPrices)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMaterialPrices()
  }, [])

  // Default material prices if Firestore data is unavailable
  const defaultMaterialPrices: MaterialPrice[] = [
    { id: "1", name: "Cardboard", price: 3.5, unit: "kg", description: "Clean, dry cardboard boxes" },
    { id: "2", name: "Newspaper", price: 5.0, unit: "kg", description: "Clean newspapers and magazines" },
    { id: "3", name: "White Paper", price: 8.0, unit: "kg", description: "Clean white office paper" },
    { id: "4", name: "PET Bottles", price: 15.0, unit: "kg", description: "Clean plastic bottles (soda, water)" },
    { id: "5", name: "HDPE Plastic", price: 12.0, unit: "kg", description: "Milk jugs, detergent bottles" },
    { id: "6", name: "Aluminum Cans", price: 60.0, unit: "kg", description: "Clean aluminum beverage cans" },
    { id: "7", name: "Steel/Tin Cans", price: 10.0, unit: "kg", description: "Food cans, cleaned" },
    { id: "8", name: "Glass Bottles", price: 1.5, unit: "kg", description: "Clean glass bottles and jars" },
    { id: "9", name: "Copper", price: 350.0, unit: "kg", description: "Copper wire, pipes, etc." },
    { id: "10", name: "Brass", price: 200.0, unit: "kg", description: "Brass fixtures, parts" },
  ]

  const addCalculationItem = () => {
    if (!selectedMaterial || weight <= 0) {
      setToastMessage("Please select a material and enter a valid weight")
      setShowToast(true)
      return
    }

    const material = materialPrices.find((m) => m.id === selectedMaterial)
    if (!material) return

    const subtotal = material.price * weight

    setCalculationItems([
      ...calculationItems,
      {
        materialId: selectedMaterial,
        weight,
        subtotal,
      },
    ])

    // Reset form
    setSelectedMaterial("")
    setWeight(0)

    setToastMessage("Item added to calculation")
    setShowToast(true)
  }

  const removeCalculationItem = (index: number) => {
    const newItems = [...calculationItems]
    newItems.splice(index, 1)
    setCalculationItems(newItems)
  }

  const clearCalculation = () => {
    setCalculationItems([])
    setToastMessage("Calculation cleared")
    setShowToast(true)
  }

  const getMaterialName = (id: string): string => {
    const material = materialPrices.find((m) => m.id === id)
    return material ? material.name : "Unknown Material"
  }

  const getMaterialUnit = (id: string): string => {
    const material = materialPrices.find((m) => m.id === id)
    return material ? material.unit : "kg"
  }

  const calculateTotal = (): number => {
    return calculationItems.reduce((total, item) => total + item.subtotal, 0)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Recycle Calculator</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => setShowInfoAlert(true)}>
            <IonIcon icon={informationCircleOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Calculate Value</IonCardTitle>
            <IonCardSubtitle>Estimate the value of your recyclable materials</IonCardSubtitle>
          </IonCardHeader>
          <IonCardContent>
            <IonGrid>
              <IonRow>
                <IonCol size="12">
                  <IonItem>
                    <IonLabel position="stacked">Select Material</IonLabel>
                    <IonSelect
                      value={selectedMaterial}
                      onIonChange={(e) => setSelectedMaterial(e.detail.value)}
                      placeholder="Choose material"
                    >
                      {materialPrices.map((material) => (
                        <IonSelectOption key={material.id} value={material.id}>
                          {material.name} - ₱{material.price.toFixed(2)}/{material.unit}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>
                </IonCol>
              </IonRow>
              <IonRow>
                <IonCol size="12">
                  <IonItem>
                    <IonLabel position="stacked">
                      Weight ({selectedMaterial ? getMaterialUnit(selectedMaterial) : "kg"})
                    </IonLabel>
                    <IonInput
                      type="number"
                      value={weight}
                      onIonChange={(e) => setWeight(Number.parseFloat(e.detail.value || "0"))}
                      min="0"
                      step="0.1"
                    />
                  </IonItem>
                </IonCol>
              </IonRow>
              <IonRow className="ion-margin-top">
                <IonCol>
                  <IonButton expand="block" onClick={addCalculationItem}>
                    <IonIcon slot="start" icon={addCircleOutline} />
                    Add to Calculation
                  </IonButton>
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonCardContent>
        </IonCard>

        {calculationItems.length > 0 && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Your Calculation</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                {calculationItems.map((item, index) => (
                  <IonItem key={index}>
                    <IonLabel>
                      <h2>{getMaterialName(item.materialId)}</h2>
                      <p>
                        {item.weight} {getMaterialUnit(item.materialId)} × ₱
                        {materialPrices.find((m) => m.id === item.materialId)?.price.toFixed(2)}
                      </p>
                    </IonLabel>
                    <IonBadge slot="end" color="success">
                      ₱{item.subtotal.toFixed(2)}
                    </IonBadge>
                    <IonButton slot="end" fill="clear" color="danger" onClick={() => removeCalculationItem(index)}>
                      <IonIcon icon={removeCircleOutline} />
                    </IonButton>
                  </IonItem>
                ))}
                <IonItemDivider />
                <IonItem>
                  <IonLabel>
                    <h2>
                      <strong>Total Value</strong>
                    </h2>
                  </IonLabel>
                  <IonBadge slot="end" color="primary" style={{ fontSize: "1.2rem", padding: "8px" }}>
                    ₱{calculateTotal().toFixed(2)}
                  </IonBadge>
                </IonItem>
              </IonList>
              <IonButton expand="block" color="medium" className="ion-margin-top" onClick={clearCalculation}>
                <IonIcon slot="start" icon={refreshOutline} />
                Clear Calculation
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Current Prices</IonCardTitle>
            <IonCardSubtitle>Average prices for recyclable materials</IonCardSubtitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList>
              {materialPrices.map((material) => (
                <IonItem key={material.id}>
                  <IonLabel>
                    <h2>{material.name}</h2>
                    {material.description && <p>{material.description}</p>}
                  </IonLabel>
                  <IonText slot="end" color="success">
                    <h3>
                      ₱{material.price.toFixed(2)}/{material.unit}
                    </h3>
                  </IonText>
                </IonItem>
              ))}
            </IonList>
            <IonText color="medium" className="ion-padding-top ion-text-center">
              <p>Prices are averages and may vary by location and quality</p>
            </IonText>
          </IonCardContent>
        </IonCard>

        <IonAlert
          isOpen={showInfoAlert}
          onDidDismiss={() => setShowInfoAlert(false)}
          header="About the Calculator"
          message="This calculator provides estimates based on average prices. Actual prices may vary based on the junkshop, quality of materials, and market conditions. Use this as a guide to estimate the value of your recyclables."
          buttons={["OK"]}
        />

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  )
}

export default RecycleCalculator
