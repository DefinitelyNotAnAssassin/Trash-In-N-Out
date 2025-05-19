"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonSearchbar,
  IonSpinner,
  IonToast,
  IonRefresher,
  IonRefresherContent,
  IonPopover,
  IonDatetime,
  IonSelect,
  IonSelectOption,
  IonChip,
  IonText,
  IonModal,
  IonInput,
  IonTextarea,
  IonAlert,
  IonButtons,
  IonMenuButton,
} from "@ionic/react"
import {
  calendarOutline,
  addOutline,
  trashOutline,
  createOutline,
  saveOutline,
  peopleOutline,
  closeCircleOutline,
  refreshOutline,
  documentOutline,
  exitOutline,
} from "ionicons/icons"
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  orderBy,
  Timestamp,
} from "firebase/firestore"
import { firestore } from "../firebase"
import { useAuth } from "../contexts/AuthContext"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import { Line, Bar, Doughnut } from "react-chartjs-2"
import jsPDF from "jspdf"
import "./AdminDashboard.css"

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend)

// Interface definitions
interface DashboardStats {
  totalUsers: number
  totalJunkshops: number
  totalRequests: number
  totalMaterialsCollected: number
  activeUsers: number
  pendingRequests: number
  completedRequests: number
  totalTransactions: number
  totalRevenue: number
}

interface MaterialPrice {
  id: string
  name: string
  price: number
  unit: string
  description?: string
}

interface User {
  id: string
  email: string
  name: string
  role: string
  createdAt: any
  lastLogin: any
  status: string
}

interface MaterialRequest {
  id: string
  userId: string
  userName: string
  materialType: string
  quantity: number
  status: string
  createdAt: any
  updatedAt: any
  location: {
    latitude: number
    longitude: string
    address: string
  }
}

interface Transaction {
  id: string
  requestId: string
  userId: string
  junkshopId: string
  materialType: string
  quantity: number
  price: number
  total: number
  status: string
  createdAt: any
}

const AdminDashboard: React.FC = () => {
  const { userData, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalJunkshops: 0,
    totalRequests: 0,
    totalMaterialsCollected: 0,
    activeUsers: 0,
    pendingRequests: 0,
    completedRequests: 0,
    totalTransactions: 0,
    totalRevenue: 0,
  })
  const [materialPrices, setMaterialPrices] = useState<MaterialPrice[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [requests, setRequests] = useState<MaterialRequest[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [showToast, setShowToast] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string>("")
  const [showPriceModal, setShowPriceModal] = useState<boolean>(false)
  const [currentPrice, setCurrentPrice] = useState<MaterialPrice | null>(null)
  const [showDeleteAlert, setShowDeleteAlert] = useState<boolean>(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
    end: new Date().toISOString(),
  })
  const [showDateFilter, setShowDateFilter] = useState<boolean>(false)
  const [filterRole, setFilterRole] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [isPdfGenerating, setIsPdfGenerating] = useState<boolean>(false)
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false)
  const [showLogoutAlert, setShowLogoutAlert] = useState<boolean>(false)

  const dashboardRef = useRef<HTMLDivElement>(null)

  // Function to get user data from local storage
  const getUserDataFromStorage = () => {
    try {
      const storedUserData = localStorage.getItem("userData")
      return storedUserData ? JSON.parse(storedUserData) : null
    } catch (error) {
      console.error("Error getting user data from local storage:", error)
      return null
    }
  }

  // Check permissions and fetch data on component mount
  useEffect(() => {
    const checkPermissionAndFetchData = async () => {
      // Get user data from both sources to ensure we have the latest
      const currentUserData = userData || getUserDataFromStorage()

      console.log("Current user role:", currentUserData?.role) // Debug log

      // Check if user is admin with a more flexible approach
      if (!currentUserData || currentUserData.role !== "admin") {
        setToastMessage("You do not have permission to access this page")
        setShowToast(true)
        return
      }

      // If we reach here, user is admin, so fetch dashboard data
      fetchDashboardData()
    }

    checkPermissionAndFetchData()
  }, [userData])

  // Fetch data based on date range and filters
  useEffect(() => {
    if (userData?.role === "admin") {
      fetchFilteredData()
    }
  }, [dateRange, filterRole, filterStatus])

  // Modify the fetchDashboardData function to handle errors better
  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      console.log("Starting to fetch dashboard data")

      // Fetch users first to ensure we have user data
      console.log("Fetching users...")
      await fetchUsers()

      // Fetch stats
      console.log("Fetching stats...")
      await fetchStats()

      // Fetch material prices
      console.log("Fetching material prices...")
      await fetchMaterialPrices()

      // Fetch requests
      console.log("Fetching requests...")
      await fetchRequests()

      // Fetch transactions
      console.log("Fetching transactions...")
      await fetchTransactions()

      console.log("All dashboard data fetched successfully")
      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setToastMessage("Error loading dashboard data. Check console for details.")
      setShowToast(true)
      setIsLoading(false)
    }
  }

  const fetchFilteredData = async () => {
    setIsLoading(true)
    try {
      // Apply date range and other filters to data fetching
      await fetchUsers()
      await fetchRequests()
      await fetchTransactions()

      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching filtered data:", error)
      setToastMessage("Error applying filters")
      setShowToast(true)
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // Count total users
      const usersQuery = query(collection(firestore, "users"))
      const usersSnapshot = await getDocs(usersQuery)
      const totalUsers = usersSnapshot.size

      // Count junkshops (users with role 'junkshop')
      const junkshopsQuery = query(collection(firestore, "users"), where("role", "==", "junkshop"))
      const junkshopsSnapshot = await getDocs(junkshopsQuery)
      const totalJunkshops = junkshopsSnapshot.size

      // Count material requests
      const requestsQuery = query(collection(firestore, "materialRequests"))
      const requestsSnapshot = await getDocs(requestsQuery)
      const totalRequests = requestsSnapshot.size

      // Count pending requests
      const pendingQuery = query(collection(firestore, "materialRequests"), where("status", "==", "pending"))
      const pendingSnapshot = await getDocs(pendingQuery)
      const pendingRequests = pendingSnapshot.size

      // Count completed requests
      const completedQuery = query(collection(firestore, "materialRequests"), where("status", "==", "completed"))
      const completedSnapshot = await getDocs(completedQuery)
      const completedRequests = completedSnapshot.size

      // Count transactions
      const transactionsQuery = query(collection(firestore, "transactions"))
      const transactionsSnapshot = await getDocs(transactionsQuery)
      const totalTransactions = transactionsSnapshot.size

      // Calculate total materials collected and revenue
      let totalMaterialsCollected = 0
      let totalRevenue = 0

      transactionsSnapshot.forEach((doc) => {
        const transaction = doc.data()
        totalMaterialsCollected += transaction.quantity || 0
        totalRevenue += transaction.total || 0
      })

      // Count active users (logged in within the last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const activeUsersQuery = query(
        collection(firestore, "users"),
        where("lastLogin", ">=", Timestamp.fromDate(thirtyDaysAgo)),
      )
      const activeUsersSnapshot = await getDocs(activeUsersQuery)
      const activeUsers = activeUsersSnapshot.size

      setStats({
        totalUsers,
        totalJunkshops,
        totalRequests,
        totalMaterialsCollected,
        activeUsers,
        pendingRequests,
        completedRequests,
        totalTransactions,
        totalRevenue,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
      throw error
    }
  }

  const fetchMaterialPrices = async () => {
    try {
      const materialsRef = collection(firestore, "materialPrices")
      const snapshot = await getDocs(materialsRef)

      if (snapshot.empty) {
        // If no material prices exist, create default ones
        await createDefaultMaterialPrices()
        const newSnapshot = await getDocs(materialsRef)
        const materials = newSnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as MaterialPrice,
        )
        setMaterialPrices(materials)
      } else {
        const materials = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as MaterialPrice,
        )
        setMaterialPrices(materials)
      }
    } catch (error) {
      console.error("Error fetching material prices:", error)
      throw error
    }
  }

  const createDefaultMaterialPrices = async () => {
    const defaultPrices = [
      { name: "Cardboard", price: 3.5, unit: "kg", description: "Clean, dry cardboard boxes" },
      { name: "Newspaper", price: 5.0, unit: "kg", description: "Clean newspapers and magazines" },
      { name: "White Paper", price: 8.0, unit: "kg", description: "Clean white office paper" },
      { name: "PET Bottles", price: 15.0, unit: "kg", description: "Clean plastic bottles (soda, water)" },
      { name: "HDPE Plastic", price: 12.0, unit: "kg", description: "Milk jugs, detergent bottles" },
      { name: "Aluminum Cans", price: 60.0, unit: "kg", description: "Clean aluminum beverage cans" },
      { name: "Steel/Tin Cans", price: 10.0, unit: "kg", description: "Food cans, cleaned" },
      { name: "Glass Bottles", price: 1.5, unit: "kg", description: "Clean glass bottles and jars" },
      { name: "Copper", price: 350.0, unit: "kg", description: "Copper wire, pipes, etc." },
      { name: "Brass", price: 200.0, unit: "kg", description: "Brass fixtures, parts" },
    ]

    try {
      const batch = []
      for (const price of defaultPrices) {
        batch.push(addDoc(collection(firestore, "materialPrices"), price))
      }
      await Promise.all(batch)
      console.log("Default material prices created")
    } catch (error) {
      console.error("Error creating default material prices:", error)
      throw error
    }
  }

  // Add more detailed debugging to the fetchUsers function
  const fetchUsers = async () => {
    console.log("Starting fetchUsers function")
    try {
      // Create a simple query first without filters to ensure we can get any users
      const usersRef = collection(firestore, "users")
      console.log("Fetching all users without filters first")
      const basicSnapshot = await getDocs(usersRef)

      console.log(`Found ${basicSnapshot.size} users in total`)

      // If we have users, then apply filters
      let fetchedUsers = []
      if (basicSnapshot.size > 0) {
        let usersQuery = query(collection(firestore, "users"))

        // Only add orderBy if we have users (to avoid potential index errors)
        if (filterRole !== "all") {
          console.log(`Applying role filter: ${filterRole}`)
          usersQuery = query(usersQuery, where("role", "==", filterRole))
        }

        const snapshot = await getDocs(usersQuery)
        console.log(`After applying filters, found ${snapshot.size} users`)

        fetchedUsers = snapshot.docs.map((doc) => {
          const data = doc.data()
          console.log(`User data for ${doc.id}:`, data)
          return {
            id: doc.id,
            ...data,
          }
        })
      } else {
        // If no users found at all, create a sample admin user for testing
        console.log("No users found. Creating a sample admin user for testing")
        fetchedUsers = [
          {
            id: "sample-admin",
            name: "Admin User",
            email: "admin@example.com",
            role: "admin",
            status: "active",
            createdAt: Timestamp.now(),
            lastLogin: Timestamp.now(),
          },
        ]
      }

      // Apply search filter if present
      if (searchTerm) {
        console.log(`Applying search filter: ${searchTerm}`)
        const filtered = fetchedUsers.filter(
          (user) =>
            (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())),
        )
        console.log(`After search filter, found ${filtered.length} users`)
        setUsers(filtered)
      } else {
        console.log(`Setting ${fetchedUsers.length} users to state`)
        setUsers(fetchedUsers)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      // Add a sample user even on error so the UI isn't empty
      setUsers([
        {
          id: "sample-admin",
          name: "Admin User (Sample)",
          email: "admin@example.com",
          role: "admin",
          status: "active",
          createdAt: Timestamp.now(),
          lastLogin: Timestamp.now(),
        },
      ])
      throw error
    }
  }

  // Add a function to create a test user if needed
  const createTestUser = async () => {
    try {
      console.log("Creating test admin user")
      const usersRef = collection(firestore, "users")

      // Check if test user already exists
      const testUserQuery = query(usersRef, where("email", "==", "admin@recyclemate.com"))
      const testUserSnapshot = await getDocs(testUserQuery)

      if (testUserSnapshot.empty) {
        // Create a test admin user
        await addDoc(usersRef, {
          name: "Test Admin",
          email: "admin@recyclemate.com",
          role: "admin",
          status: "active",
          createdAt: Timestamp.now(),
          lastLogin: Timestamp.now(),
          password: "hashed_password_here", // In a real app, this would be properly hashed
        })

        console.log("Test admin user created successfully")
        setToastMessage("Test admin user created successfully")
        setShowToast(true)

        // Refresh users list
        await fetchUsers()
      } else {
        console.log("Test admin user already exists")
        setToastMessage("Test user already exists")
        setShowToast(true)
      }
    } catch (error) {
      console.error("Error creating test user:", error)
      setToastMessage("Error creating test user")
      setShowToast(true)
    }
  }

  const fetchRequests = async () => {
    try {
      let requestsQuery = query(collection(firestore, "materialRequests"), orderBy("createdAt", "desc"))

      // Apply status filter if not 'all'
      if (filterStatus !== "all") {
        requestsQuery = query(requestsQuery, where("status", "==", filterStatus))
      }

      // Apply date range filter
      const startDate = new Date(dateRange.start)
      const endDate = new Date(dateRange.end)

      requestsQuery = query(
        requestsQuery,
        where("createdAt", ">=", Timestamp.fromDate(startDate)),
        where("createdAt", "<=", Timestamp.fromDate(endDate)),
      )

      const snapshot = await getDocs(requestsQuery)
      const fetchedRequests = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as MaterialRequest,
      )

      // Apply search filter if present
      if (searchTerm) {
        const filtered = fetchedRequests.filter(
          (request) =>
            request.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.materialType?.toLowerCase().includes(searchTerm.toLowerCase()),
        )
        setRequests(filtered)
      } else {
        setRequests(fetchedRequests)
      }
    } catch (error) {
      console.error("Error fetching requests:", error)
      throw error
    }
  }

  const fetchTransactions = async () => {
    try {
      let transactionsQuery = query(collection(firestore, "transactions"), orderBy("createdAt", "desc"))

      // Apply date range filter
      const startDate = new Date(dateRange.start)
      const endDate = new Date(dateRange.end)

      transactionsQuery = query(
        transactionsQuery,
        where("createdAt", ">=", Timestamp.fromDate(startDate)),
        where("createdAt", "<=", Timestamp.fromDate(endDate)),
      )

      const snapshot = await getDocs(transactionsQuery)
      const fetchedTransactions = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Transaction,
      )

      // Apply search filter if present
      if (searchTerm) {
        const filtered = fetchedTransactions.filter((transaction) => {
          const value = searchTerm // Declare value here
          return transaction.materialType?.toLowerCase().includes(value.toLowerCase())
        })
        setTransactions(filtered)
      } else {
        setTransactions(fetchedTransactions)
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
      throw error
    }
  }

  const handleRefresh = async (event: CustomEvent) => {
    try {
      await fetchDashboardData()
      event.detail.complete()
      setToastMessage("Dashboard refreshed")
      setShowToast(true)
    } catch (error) {
      console.error("Error refreshing data:", error)
      setToastMessage("Error refreshing data")
      setShowToast(true)
      event.detail.complete()
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    // Apply search filter to current data
    if (activeTab === "users") {
      const filtered = users.filter(
        (user) =>
          user.name?.toLowerCase().includes(value.toLowerCase()) ||
          user.email?.toLowerCase().includes(value.toLowerCase()),
      )
      setUsers(filtered)
    } else if (activeTab === "requests") {
      const filtered = requests.filter(
        (request) =>
          request.userName?.toLowerCase().includes(value.toLowerCase()) ||
          request.materialType?.toLowerCase().includes(value.toLowerCase()),
      )
      setRequests(filtered)
    } else if (activeTab === "transactions") {
      const filtered = transactions.filter((transaction) =>
        transaction.materialType?.toLowerCase().includes(value.toLowerCase()),
      )
      setTransactions(filtered)
    }
  }

  const handleAddMaterialPrice = () => {
    setCurrentPrice({
      id: "",
      name: "",
      price: 0,
      unit: "kg",
      description: "",
    })
    setShowPriceModal(true)
  }

  const handleEditMaterialPrice = (price: MaterialPrice) => {
    setCurrentPrice(price)
    setShowPriceModal(true)
  }

  const handleDeleteMaterialPrice = (id: string) => {
    setItemToDelete({ id, type: "materialPrice" })
    setShowDeleteAlert(true)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return

    try {
      if (itemToDelete.type === "materialPrice") {
        await deleteDoc(doc(firestore, "materialPrices", itemToDelete.id))
        setMaterialPrices(materialPrices.filter((price) => price.id !== itemToDelete.id))
        setToastMessage("Material price deleted successfully")
      } else if (itemToDelete.type === "user") {
        await deleteDoc(doc(firestore, "users", itemToDelete.id))
        setUsers(users.filter((user) => user.id !== itemToDelete.id))
        setToastMessage("User deleted successfully")
      }

      setShowToast(true)
    } catch (error) {
      console.error("Error deleting item:", error)
      setToastMessage("Error deleting item")
      setShowToast(true)
    } finally {
      setShowDeleteAlert(false)
      setItemToDelete(null)
    }
  }

  const saveMaterialPrice = async () => {
    if (!currentPrice) return

    try {
      if (currentPrice.id) {
        // Update existing price
        await updateDoc(doc(firestore, "materialPrices", currentPrice.id), {
          name: currentPrice.name,
          price: currentPrice.price,
          unit: currentPrice.unit,
          description: currentPrice.description,
        })

        // Update local state
        setMaterialPrices(materialPrices.map((price) => (price.id === currentPrice.id ? currentPrice : price)))

        setToastMessage("Material price updated successfully")
      } else {
        // Add new price
        const docRef = await addDoc(collection(firestore, "materialPrices"), {
          name: currentPrice.name,
          price: currentPrice.price,
          unit: currentPrice.unit,
          description: currentPrice.description,
        })

        // Update local state
        setMaterialPrices([...materialPrices, { ...currentPrice, id: docRef.id }])

        setToastMessage("Material price added successfully")
      }

      setShowToast(true)
      setShowPriceModal(false)
    } catch (error) {
      console.error("Error saving material price:", error)
      setToastMessage("Error saving material price")
      setShowToast(true)
    }
  }

  // Function to create a circular progress indicator
  const drawCircularProgress = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    percentage: number,
    color: string,
    label: string,
    value: string,
  ) => {
    // Draw background circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fillStyle = "#f5f5f5"
    ctx.fill()

    // Draw progress arc
    const startAngle = -Math.PI / 2
    const endAngle = startAngle + (percentage / 100) * (Math.PI * 2)

    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, startAngle, endAngle)
    ctx.lineTo(centerX, centerY)
    ctx.fillStyle = color
    ctx.fill()

    // Draw inner circle (to create donut)
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 0.7, 0, Math.PI * 2)
    ctx.fillStyle = "white"
    ctx.fill()

    // Draw text
    ctx.fillStyle = "#333"
    ctx.font = "bold 14px Arial"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(value, centerX, centerY - 5)

    ctx.fillStyle = "#666"
    ctx.font = "12px Arial"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(label, centerX, centerY + 15)
  }

  // Replace the entire generatePDF function with this improved version
  const generatePDF = async () => {
    setIsPdfGenerating(true)
    try {
      console.log("Starting enhanced PDF generation process")

      // Create a new PDF document with custom font support
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      // Set document properties
      pdf.setProperties({
        title: "RecycleMate Admin Dashboard Report",
        subject: "Dashboard Statistics and Analytics",
        author: "RecycleMate Admin",
        keywords: "recycling, dashboard, statistics, admin",
        creator: "RecycleMate Admin Dashboard",
      })

      // Define colors
      const primaryColor = [39, 174, 96] // Green
      const secondaryColor = [52, 152, 219] // Blue
      const accentColor = [155, 89, 182] // Purple
      const warningColor = [241, 196, 15] // Yellow
      const dangerColor = [231, 76, 60] // Red
      const darkColor = [44, 62, 80] // Dark blue/gray
      const lightColor = [236, 240, 241] // Light gray

      // Define page dimensions
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15
      const contentWidth = pageWidth - margin * 2

      // Helper function for consistent text rendering
      const renderText = (text, x, y, options = {}) => {
        const defaultOptions = {
          align: "left",
          fontSize: 10,
          color: [60, 60, 60],
          font: "helvetica",
          style: "normal",
          lineSpacing: 1.2,
          maxWidth: contentWidth,
        }

        const opts = { ...defaultOptions, ...options }

        pdf.setFont(opts.font, opts.style)
        pdf.setFontSize(opts.fontSize)
        pdf.setTextColor(opts.color[0], opts.color[1], opts.color[2])

        if (typeof text === "string") {
          // Handle line breaks in the text
          if (text.includes("\n")) {
            const lines = text.split("\n")
            let currentY = y
            lines.forEach((line) => {
              if (opts.maxWidth) {
                const splitLines = pdf.splitTextToSize(line, opts.maxWidth)
                pdf.text(splitLines, x, currentY, { align: opts.align })
                currentY += splitLines.length * (((opts.fontSize * opts.lineSpacing) / 72) * 25.4)
              } else {
                pdf.text(line, x, currentY, { align: opts.align })
                currentY += ((opts.fontSize * opts.lineSpacing) / 72) * 25.4
              }
            })
            return currentY
          } else if (opts.maxWidth) {
            const splitLines = pdf.splitTextToSize(text, opts.maxWidth)
            pdf.text(splitLines, x, y, { align: opts.align })
            return y + splitLines.length * (((opts.fontSize * opts.lineSpacing) / 72) * 25.4)
          }
        }

        pdf.text(text, x, y, { align: opts.align })
        return y + ((opts.fontSize * opts.lineSpacing) / 72) * 25.4
      }

      // ===== COVER PAGE =====
      let yPosition = 40

      // Add title
      yPosition = renderText("RecycleMate", pageWidth / 2, yPosition, {
        align: "center",
        fontSize: 28,
        color: primaryColor,
        style: "bold",
      })

      yPosition += 5
      yPosition = renderText("Admin Dashboard Report", pageWidth / 2, yPosition, {
        align: "center",
        fontSize: 22,
        color: darkColor,
        style: "bold",
      })
      yPosition += 20

      // Add date range
      const startDate = new Date(dateRange.start).toLocaleDateString()
      const endDate = new Date(dateRange.end).toLocaleDateString()

      yPosition = renderText(`Report Period: ${startDate} - ${endDate}`, pageWidth / 2, yPosition, {
        align: "center",
        fontSize: 12,
        color: [100, 100, 100],
      })
      yPosition += 5

      yPosition = renderText(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, {
        align: "center",
        fontSize: 12,
        color: [100, 100, 100],
      })
      yPosition += 30

      // Create a temporary canvas for the cover image
      const coverCanvas = document.createElement("canvas")
      coverCanvas.width = 400
      coverCanvas.height = 200
      document.body.appendChild(coverCanvas)

      const ctx = coverCanvas.getContext("2d")
      if (ctx) {
        // Draw a decorative background
        const gradient = ctx.createLinearGradient(0, 0, 400, 200)
        gradient.addColorStop(0, `rgba(${primaryColor[0]}, ${primaryColor[1]}, ${primaryColor[2]}, 0.1)`)
        gradient.addColorStop(1, `rgba(${secondaryColor[0]}, ${secondaryColor[1]}, ${secondaryColor[2]}, 0.1)`)
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 400, 200)

        // Draw circular progress indicators
        const totalUsersPercentage = Math.min(100, (stats.activeUsers / stats.totalUsers) * 100) || 0
        drawCircularProgress(
          ctx,
          100,
          100,
          40,
          totalUsersPercentage,
          `rgb(${secondaryColor[0]}, ${secondaryColor[1]}, ${secondaryColor[2]})`,
          "Active Users",
          `${stats.activeUsers}/${stats.totalUsers}`,
        )

        const requestsPercentage = Math.min(100, (stats.completedRequests / (stats.totalRequests || 1)) * 100) || 0
        drawCircularProgress(
          ctx,
          200,
          100,
          40,
          requestsPercentage,
          `rgb(${primaryColor[0]}, ${primaryColor[1]}, ${primaryColor[2]})`,
          "Completed",
          `${stats.completedRequests}/${stats.totalRequests}`,
        )

        const junkshopsPercentage = Math.min(100, (stats.totalJunkshops / (stats.totalUsers || 1)) * 100) || 0
        drawCircularProgress(
          ctx,
          300,
          100,
          40,
          junkshopsPercentage,
          `rgb(${accentColor[0]}, ${accentColor[1]}, ${accentColor[2]})`,
          "Junkshops",
          `${stats.totalJunkshops}`,
        )
      }

      // Add the cover image to the PDF
      const coverImgData = coverCanvas.toDataURL("image/png", 1.0)
      pdf.addImage(coverImgData, "PNG", margin, yPosition, contentWidth, 80)
      document.body.removeChild(coverCanvas)

      yPosition += 100

      // Add company info
      yPosition = renderText("RecycleMate Inc.", pageWidth / 2, yPosition, {
        align: "center",
        fontSize: 10,
        color: [100, 100, 100],
      })
      yPosition += 5
      yPosition = renderText("123 Green Street, Eco City", pageWidth / 2, yPosition, {
        align: "center",
        fontSize: 10,
        color: [100, 100, 100],
      })
      yPosition += 5
      yPosition = renderText("contact@recyclemate.com | www.recyclemate.com", pageWidth / 2, yPosition, {
        align: "center",
        fontSize: 10,
        color: [100, 100, 100],
      })

      // Add page footer
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      pdf.text("CONFIDENTIAL - FOR INTERNAL USE ONLY", pageWidth / 2, pageHeight - 10, { align: "center" })

      // ===== TABLE OF CONTENTS =====
      pdf.addPage()
      yPosition = 20

      pdf.setFontSize(18)
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      pdf.text("Table of Contents", margin, yPosition)
      yPosition += 15

      pdf.setDrawColor(200, 200, 200)
      pdf.line(margin, yPosition, pageWidth - margin, yPosition)
      yPosition += 15

      const tocItems = [
        { title: "Executive Summary", page: 3 },
        { title: "System Overview", page: 3 },
        { title: "User Statistics", page: 4 },
        { title: "Material Distribution", page: 5 },
        { title: "Request Status", page: 6 },
        { title: "Material Prices", page: 7 },
        { title: "User Details", page: 8 },
      ]

      pdf.setFontSize(12)
      pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2])

      tocItems.forEach((item, index) => {
        pdf.text(item.title, margin, yPosition)

        // Add dots between title and page number
        const titleWidth = pdf.getTextWidth(item.title)
        const pageNumWidth = pdf.getTextWidth(item.page.toString())
        const dotsWidth = contentWidth - titleWidth - pageNumWidth - 5
        const dotCount = Math.floor(dotsWidth / pdf.getTextWidth("."))
        let dots = ""
        for (let i = 0; i < dotCount; i++) {
          dots += "."
        }

        pdf.setTextColor(150, 150, 150)
        pdf.text(dots, margin + titleWidth + 5, yPosition)

        pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2])
        pdf.text(item.page.toString(), pageWidth - margin - pageNumWidth, yPosition)

        yPosition += 10
      })

      // Add page footer
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      pdf.text("Page 2", pageWidth / 2, pageHeight - 10, { align: "center" })

      // ===== EXECUTIVE SUMMARY PAGE =====
      pdf.addPage()
      yPosition = 20

      // Add header
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
      pdf.rect(0, 0, pageWidth, 15, "F")
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(10)
      pdf.text("RecycleMate Admin Dashboard Report", pageWidth / 2, 10, { align: "center" })

      // Add section title
      pdf.setFontSize(18)
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      pdf.text("Executive Summary", margin, yPosition)
      yPosition += 10

      // Add summary text
      const summaryText = `This report provides a comprehensive overview of the RecycleMate platform's performance and key metrics. The data covers the period from ${startDate} to ${endDate}. The platform currently has ${stats.totalUsers} registered users, including ${stats.totalJunkshops} junkshops. A total of ${stats.totalRequests} material requests have been processed, with ${stats.completedRequests} successfully completed. The system has facilitated the collection of ${stats.totalMaterialsCollected.toFixed(2)} kg of recyclable materials, generating a total revenue of ₱${stats.totalRevenue.toFixed(2)}.`

      yPosition = renderText(summaryText, margin, yPosition, {
        fontSize: 11,
        color: [60, 60, 60],
        maxWidth: contentWidth,
        lineSpacing: 1.4,
      })
      yPosition += 10

      // Add system overview section
      pdf.setFontSize(16)
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      pdf.text("System Overview", margin, yPosition)
      yPosition += 10

      // Create a stats grid with colored boxes
      const statItems = [
        { label: "Total Users", value: stats.totalUsers.toString(), color: secondaryColor },
        { label: "Active Users", value: stats.activeUsers.toString(), color: primaryColor },
        { label: "Total Junkshops", value: stats.totalJunkshops.toString(), color: accentColor },
        { label: "Total Requests", value: stats.totalRequests.toString(), color: darkColor },
        { label: "Pending Requests", value: stats.pendingRequests.toString(), color: warningColor },
        { label: "Completed Requests", value: stats.completedRequests.toString(), color: primaryColor },
        {
          label: "Materials Collected",
          value: `${stats.totalMaterialsCollected.toFixed(2)} kg`,
          color: secondaryColor,
        },
        { label: "Total Revenue", value: `₱${stats.totalRevenue.toFixed(2)}`, color: accentColor },
      ]

      const boxWidth = contentWidth / 4
      const boxHeight = 30
      let currentX = margin
      let currentY = yPosition

      statItems.forEach((item, index) => {
        // Create colored box
        pdf.setFillColor(item.color[0], item.color[1], item.color[2], 0.1)
        pdf.setDrawColor(item.color[0], item.color[1], item.color[2])
        pdf.roundedRect(currentX, currentY, boxWidth - 5, boxHeight, 2, 2, "FD")

        // Add label
        pdf.setFontSize(8)
        pdf.setTextColor(100, 100, 100)
        pdf.text(item.label, currentX + 5, currentY + 10)

        // Add value
        pdf.setFontSize(12)
        pdf.setTextColor(item.color[0], item.color[1], item.color[2])
        pdf.text(item.value, currentX + 5, currentY + 22)

        // Move to next position
        currentX += boxWidth
        if ((index + 1) % 4 === 0) {
          currentX = margin
          currentY += boxHeight + 5
        }
      })

      yPosition = currentY + boxHeight + 15

      // Add page footer
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      pdf.text("Page 3", pageWidth / 2, pageHeight - 10, { align: "center" })

      // Function to safely capture a chart canvas
      const captureChart = async (chartTitle: string, chartData: any, chartType: string) => {
        try {
          // Create a temporary canvas element
          const tempCanvas = document.createElement("canvas")
          tempCanvas.width = 800 // Higher resolution
          tempCanvas.height = 400 // Higher resolution
          document.body.appendChild(tempCanvas)

          // Create a temporary chart on this canvas
          const ctx = tempCanvas.getContext("2d")
          if (!ctx) {
            throw new Error("Could not get canvas context")
          }

          // Create the appropriate chart type
          let tempChart
          if (chartType === "line") {
            tempChart = new ChartJS(ctx, {
              type: "line",
              data: chartData,
              options: {
                responsive: false,
                animation: false,
                plugins: {
                  legend: {
                    display: true,
                    position: "top",
                  },
                  title: {
                    display: true,
                    text: chartTitle,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              },
            })
          } else if (chartType === "bar") {
            tempChart = new ChartJS(ctx, {
              type: "bar",
              data: chartData,
              options: {
                responsive: false,
                animation: false,
                plugins: {
                  legend: {
                    display: true,
                    position: "top",
                  },
                  title: {
                    display: true,
                    text: chartTitle,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              },
            })
          } else if (chartType === "doughnut") {
            tempChart = new ChartJS(ctx, {
              type: "doughnut",
              data: chartData,
              options: {
                responsive: false,
                animation: false,
                plugins: {
                  legend: {
                    display: true,
                    position: "top",
                  },
                  title: {
                    display: true,
                    text: chartTitle,
                  },
                },
              },
            })
          }

          // Wait a moment for the chart to render
          await new Promise((resolve) => setTimeout(resolve, 100))

          // Get the image data
          const imgData = tempCanvas.toDataURL("image/png", 1.0)

          // Clean up
          if (tempChart) {
            tempChart.destroy()
          }
          document.body.removeChild(tempCanvas)

          return imgData
        } catch (error) {
          console.error(`Error capturing ${chartTitle} chart:`, error)
          return null
        }
      }

      // ===== USER STATISTICS PAGE =====
      pdf.addPage()
      yPosition = 20

      // Add header
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
      pdf.rect(0, 0, pageWidth, 15, "F")
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(10)
      pdf.text("RecycleMate Admin Dashboard Report", pageWidth / 2, 10, { align: "center" })

      // Add section title
      pdf.setFontSize(18)
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      pdf.text("User Statistics", margin, yPosition)
      yPosition += 10

      // Add section description
      const userStatsDesc = `This section shows user growth over time and distribution by role. The platform has ${stats.totalUsers} total users, with ${stats.activeUsers} active in the last 30 days.`
      yPosition = renderText(userStatsDesc, margin, yPosition, {
        fontSize: 10,
        color: [100, 100, 100],
        maxWidth: contentWidth,
        lineSpacing: 1.3,
      })
      yPosition += 10

      // Capture and add User Growth chart
      try {
        const userGrowthImgData = await captureChart("User Growth Over Time", prepareUserGrowthData(), "line")

        if (userGrowthImgData) {
          pdf.setFontSize(14)
          pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2])
          pdf.text("User Growth Trend", margin, yPosition)
          yPosition += 8

          pdf.addImage(userGrowthImgData, "PNG", margin, yPosition, contentWidth, 70)
          yPosition += 80
        }
      } catch (error) {
        console.error("Error adding User Growth chart:", error)
        pdf.text("User Growth chart could not be generated", margin, yPosition)
        yPosition += 10
      }

      // Add user role distribution
      pdf.setFontSize(14)
      pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2])
      pdf.text("User Role Distribution", margin, yPosition)
      yPosition += 10

      // Count users by role
      const usersByRole: { [key: string]: number } = {}
      users.forEach((user) => {
        if (!usersByRole[user.role]) {
          usersByRole[user.role] = 0
        }
        usersByRole[user.role]++
      })

      // Create a horizontal bar chart for roles
      const roleColors = {
        admin: [231, 76, 60], // Red
        junkshop: [52, 152, 219], // Blue
        resident: [39, 174, 96], // Green
        default: [149, 165, 166], // Gray
      }

      const barHeight = 20
      const barSpacing = 10
      const maxBarWidth = contentWidth - 60

      Object.entries(usersByRole).forEach(([role, count], index) => {
        const percentage = (count / stats.totalUsers) * 100
        const barWidth = (percentage / 100) * maxBarWidth

        // Get color for this role
        const color = role in roleColors ? roleColors[role as keyof typeof roleColors] : roleColors.default

        // Draw bar
        pdf.setFillColor(color[0], color[1], color[2])
        pdf.rect(margin + 50, yPosition, barWidth, barHeight, "F")

        // Add role label
        pdf.setFontSize(10)
        pdf.setTextColor(60, 60, 60)
        pdf.text(role, margin, yPosition + barHeight / 2 + 3)

        // Add count and percentage
        pdf.setFontSize(10)
        pdf.setTextColor(60, 60, 60)
        pdf.text(`${count} (${percentage.toFixed(1)}%)`, margin + 55 + barWidth, yPosition + barHeight / 2 + 3)

        yPosition += barHeight + barSpacing
      })

      // Add page footer
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      pdf.text("Page 4", pageWidth / 2, pageHeight - 10, { align: "center" })

      // ===== MATERIAL DISTRIBUTION PAGE =====
      pdf.addPage()
      yPosition = 20

      // Add header
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
      pdf.rect(0, 0, pageWidth, 15, "F")
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(10)
      pdf.text("RecycleMate Admin Dashboard Report", pageWidth / 2, 10, { align: "center" })

      // Add section title
      pdf.setFontSize(18)
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      pdf.text("Material Distribution", margin, yPosition)
      yPosition += 10

      // Add section description
      const materialDesc = `This section shows the distribution of recyclable materials collected through the platform. A total of ${stats.totalMaterialsCollected.toFixed(2)} kg of materials have been collected.`
      yPosition = renderText(materialDesc, margin, yPosition, {
        fontSize: 10,
        color: [100, 100, 100],
        maxWidth: contentWidth,
        lineSpacing: 1.3,
      })
      yPosition += 10

      // Capture and add Material Distribution chart
      try {
        const materialDistImgData = await captureChart(
          "Material Distribution by Type",
          prepareMaterialDistributionData(),
          "bar",
        )

        if (materialDistImgData) {
          pdf.setFontSize(14)
          pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2])
          pdf.text("Material Types Collected", margin, yPosition)
          yPosition += 8

          pdf.addImage(materialDistImgData, "PNG", margin, yPosition, contentWidth, 70)
          yPosition += 80
        }
      } catch (error) {
        console.error("Error adding Material Distribution chart:", error)
        pdf.text("Material Distribution chart could not be generated", margin, yPosition)
        yPosition += 10
      }

      // Add revenue chart
      try {
        const revenueImgData = await captureChart("Revenue Over Time", prepareRevenueData(), "line")

        if (revenueImgData) {
          pdf.setFontSize(14)
          pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2])
          pdf.text("Revenue Trend", margin, yPosition)
          yPosition += 8

          pdf.addImage(revenueImgData, "PNG", margin, yPosition, contentWidth, 70)
          yPosition += 80
        }
      } catch (error) {
        console.error("Error adding Revenue chart:", error)
        pdf.text("Revenue chart could not be generated", margin, yPosition)
        yPosition += 10
      }

      // Add page footer
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      pdf.text("Page 5", pageWidth / 2, pageHeight - 10, { align: "center" })

      // ===== REQUEST STATUS PAGE =====
      pdf.addPage()
      yPosition = 20

      // Add header
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
      pdf.rect(0, 0, pageWidth, 15, "F")
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(10)
      pdf.text("RecycleMate Admin Dashboard Report", pageWidth / 2, 10, { align: "center" })

      // Add section title
      pdf.setFontSize(18)
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      pdf.text("Request Status", margin, yPosition)
      yPosition += 10

      // Add section description
      const requestDesc = `This section shows the status distribution of material collection requests. Out of ${stats.totalRequests} total requests, ${stats.completedRequests} have been completed and ${stats.pendingRequests} are pending.`
      yPosition = renderText(requestDesc, margin, yPosition, {
        fontSize: 10,
        color: [100, 100, 100],
        maxWidth: contentWidth,
        lineSpacing: 1.3,
      })
      yPosition += 10

      // Capture and add Request Status chart
      try {
        const requestStatusImgData = await captureChart(
          "Request Status Distribution",
          prepareRequestStatusData(),
          "doughnut",
        )

        if (requestStatusImgData) {
          pdf.setFontSize(14)
          pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2])
          pdf.text("Request Status Distribution", margin, yPosition)
          yPosition += 8

          pdf.addImage(requestStatusImgData, "PNG", margin, yPosition, contentWidth, 70)
          yPosition += 80
        }
      } catch (error) {
        console.error("Error adding Request Status chart:", error)
        pdf.text("Request Status chart could not be generated", margin, yPosition)
        yPosition += 10
      }

      // Add recent requests table
      pdf.setFontSize(14)
      pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2])
      pdf.text("Recent Requests", margin, yPosition)
      yPosition += 10

      // Table headers
      const requestHeaders = ["User", "Material", "Quantity", "Status", "Date"]
      const requestColWidths = [
        contentWidth * 0.25,
        contentWidth * 0.25,
        contentWidth * 0.15,
        contentWidth * 0.15,
        contentWidth * 0.2,
      ]

      // Draw table header
      pdf.setFillColor(lightColor[0], lightColor[1], lightColor[2])
      pdf.rect(margin, yPosition, contentWidth, 10, "F")

      pdf.setFontSize(9)
      pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2])
      pdf.setFont("helvetica", "bold")

      let xPos = margin
      requestHeaders.forEach((header, i) => {
        pdf.text(header, xPos + 3, yPosition + 7)
        xPos += requestColWidths[i]
      })
      yPosition += 10

      // Draw table rows (limit to 10 most recent)
      pdf.setFont("helvetica", "normal")
      const recentRequests = requests.slice(0, 10)

      recentRequests.forEach((request, i) => {
        // Alternate row colors
        if (i % 2 === 0) {
          pdf.setFillColor(250, 250, 250)
          pdf.rect(margin, yPosition, contentWidth, 10, "F")
        }

        xPos = margin

        // User
        renderText(request.userName || "N/A", xPos + 3, yPosition + 7, {
          fontSize: 9,
          color: [60, 60, 60],
          maxWidth: requestColWidths[0] - 6,
          lineSpacing: 1.1,
        })
        xPos += requestColWidths[0]

        // Material
        renderText(request.materialType || "N/A", xPos + 3, yPosition + 7, {
          fontSize: 9,
          color: [60, 60, 60],
          maxWidth: requestColWidths[1] - 6,
          lineSpacing: 1.1,
        })
        xPos += requestColWidths[1]

        // Quantity
        renderText(`${request.quantity || 0} kg`, xPos + 3, yPosition + 7, {
          fontSize: 9,
          color: [60, 60, 60],
          maxWidth: requestColWidths[2] - 6,
          lineSpacing: 1.1,
        })
        xPos += requestColWidths[2]

        // Status
        let statusColor = [100, 100, 100]
        if (request.status === "completed") {
          statusColor = primaryColor
        } else if (request.status === "pending") {
          statusColor = warningColor
        }
        renderText(request.status || "N/A", xPos + 3, yPosition + 7, {
          fontSize: 9,
          color: statusColor,
          maxWidth: requestColWidths[3] - 6,
          lineSpacing: 1.1,
        })
        xPos += requestColWidths[3]

        // Date
        renderText(
          request.createdAt?.toDate ? request.createdAt.toDate().toLocaleDateString() : "N/A",
          xPos + 3,
          yPosition + 7,
          {
            fontSize: 9,
            color: [60, 60, 60],
            maxWidth: requestColWidths[4] - 6,
            lineSpacing: 1.1,
          },
        )

        yPosition += 10
      })

      // Add page footer
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      pdf.text("Page 6", pageWidth / 2, pageHeight - 10, { align: "center" })

      // ===== MATERIAL PRICES PAGE =====
      pdf.addPage()
      yPosition = 20

      // Add header
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
      pdf.rect(0, 0, pageWidth, 15, "F")
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(10)
      pdf.text("RecycleMate Admin Dashboard Report", pageWidth / 2, 10, { align: "center" })

      // Add section title
      pdf.setFontSize(18)
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      pdf.text("Material Prices", margin, yPosition)
      yPosition += 10

      // Add section description
      const pricesDesc = `This section shows the current prices for different types of recyclable materials. These prices are used to calculate the value of materials collected through the platform.`
      yPosition = renderText(pricesDesc, margin, yPosition, {
        fontSize: 10,
        color: [100, 100, 100],
        maxWidth: contentWidth,
        lineSpacing: 1.3,
      })
      yPosition += 10

      // Create material prices table
      if (materialPrices.length > 0) {
        // Table headers
        const priceHeaders = ["Material", "Price (₱)", "Unit", "Description"]
        const priceColWidths = [contentWidth * 0.25, contentWidth * 0.15, contentWidth * 0.15, contentWidth * 0.45]

        // Draw table header
        pdf.setFillColor(lightColor[0], lightColor[1], lightColor[2])
        pdf.rect(margin, yPosition, contentWidth, 10, "F")

        pdf.setFontSize(9)
        pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2])
        pdf.setFont("helvetica", "bold")

        let xPos = margin
        priceHeaders.forEach((header, i) => {
          pdf.text(header, xPos + 3, yPosition + 7)
          xPos += priceColWidths[i]
        })
        yPosition += 10

        // Draw table rows
        pdf.setFont("helvetica", "normal")
        materialPrices.forEach((price, i) => {
          // Check if we need a new page
          if (yPosition > 270) {
            pdf.addPage()
            yPosition = 20

            // Add header
            pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
            pdf.rect(0, 0, pageWidth, 15, "F")
            pdf.setTextColor(255, 255, 255)
            pdf.setFontSize(10)
            pdf.text("RecycleMate Admin Dashboard Report", pageWidth / 2, 10, { align: "center" })

            // Repeat table header
            pdf.setFontSize(14)
            pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
            pdf.text("Material Prices (continued)", margin, yPosition)
            yPosition += 10

            // Draw table header
            pdf.setFillColor(lightColor[0], lightColor[1], lightColor[2])
            pdf.rect(margin, yPosition, contentWidth, 10, "F")

            pdf.setFontSize(9)
            pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2])
            pdf.setFont("helvetica", "bold")

            let xPos = margin
            priceHeaders.forEach((header, i) => {
              pdf.text(header, xPos + 3, yPosition + 7)
              xPos += priceColWidths[i]
            })
            yPosition += 10
            pdf.setFont("helvetica", "normal")
          }

          // Alternate row colors
          if (i % 2 === 0) {
            pdf.setFillColor(250, 250, 250)
            pdf.rect(margin, yPosition, contentWidth, 10, "F")
          }

          xPos = margin

          // Material
          renderText(price.name, xPos + 3, yPosition + 7, {
            fontSize: 9,
            color: [60, 60, 60],
            maxWidth: priceColWidths[0] - 6,
            lineSpacing: 1.1,
          })
          xPos += priceColWidths[0]

          // Price
          renderText(price.price.toFixed(2), xPos + 3, yPosition + 7, {
            fontSize: 9,
            color: [60, 60, 60],
            maxWidth: priceColWidths[1] - 6,
            lineSpacing: 1.1,
          })
          xPos += priceColWidths[1]

          // Unit
          renderText(price.unit, xPos + 3, yPosition + 7, {
            fontSize: 9,
            color: [60, 60, 60],
            maxWidth: priceColWidths[2] - 6,
            lineSpacing: 1.1,
          })
          xPos += priceColWidths[2]

          // Description
          renderText(price.description || "N/A", xPos + 3, yPosition + 7, {
            fontSize: 9,
            color: [60, 60, 60],
            maxWidth: priceColWidths[3] - 6,
            lineSpacing: 1.1,
          })

          yPosition += 10
        })
      } else {
        pdf.setFontSize(10)
        pdf.setTextColor(100, 100, 100)
        pdf.text("No material prices available", margin, yPosition)
      }

      // Add page footer
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      pdf.text("Page 7", pageWidth / 2, pageHeight - 10, { align: "center" })

      // ===== USER DETAILS PAGE =====
      if (users.length > 0) {
        pdf.addPage()
        yPosition = 20

        // Add header
        pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
        pdf.rect(0, 0, pageWidth, 15, "F")
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(10)
        pdf.text("RecycleMate Admin Dashboard Report", pageWidth / 2, 10, { align: "center" })

        // Add section title
        pdf.setFontSize(18)
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
        pdf.text("User Details", margin, yPosition)
        yPosition += 10

        // Add section description
        const userDesc = `This section provides details about the users registered on the platform. The table below shows up to 20 users.`
        yPosition = renderText(userDesc, margin, yPosition, {
          fontSize: 10,
          color: [100, 100, 100],
          maxWidth: contentWidth,
          lineSpacing: 1.3,
        })
        yPosition += 10

        // Table headers
        const userHeaders = ["Name", "Email", "Role", "Status", "Joined"]
        const userColWidths = [
          contentWidth * 0.25,
          contentWidth * 0.3,
          contentWidth * 0.15,
          contentWidth * 0.15,
          contentWidth * 0.15,
        ]

        // Draw table header
        pdf.setFillColor(lightColor[0], lightColor[1], lightColor[2])
        pdf.rect(margin, yPosition, contentWidth, 10, "F")

        pdf.setFontSize(9)
        pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2])
        pdf.setFont("helvetica", "bold")

        let xPos = margin
        userHeaders.forEach((header, i) => {
          pdf.text(header, xPos + 3, yPosition + 7)
          xPos += userColWidths[i]
        })
        yPosition += 10

        // Draw table rows (limit to 20 users)
        pdf.setFont("helvetica", "normal")
        users.slice(0, 20).forEach((user, i) => {
          // Alternate row colors
          if (i % 2 === 0) {
            pdf.setFillColor(250, 250, 250)
            pdf.rect(margin, yPosition, contentWidth, 10, "F")
          }

          xPos = margin

          // Name
          renderText(user.name || "N/A", xPos + 3, yPosition + 7, {
            fontSize: 9,
            color: [60, 60, 60],
            maxWidth: userColWidths[0] - 6,
            lineSpacing: 1.1,
          })
          xPos += userColWidths[0]

          // Email
          renderText(user.email || "N/A", xPos + 3, yPosition + 7, {
            fontSize: 9,
            color: [60, 60, 60],
            maxWidth: userColWidths[1] - 6,
            lineSpacing: 1.1,
          })
          xPos += userColWidths[1]

          // Role
          let roleColor = [100, 100, 100]
          if (user.role === "admin") {
            roleColor = dangerColor
          } else if (user.role === "junkshop") {
            roleColor = secondaryColor
          } else {
            roleColor = primaryColor
          }
          renderText(user.role || "N/A", xPos + 3, yPosition + 7, {
            fontSize: 9,
            color: roleColor,
            maxWidth: userColWidths[2] - 6,
            lineSpacing: 1.1,
          })
          xPos += userColWidths[2]

          // Status
          let statusColor = [100, 100, 100]
          if (user.status === "active") {
            statusColor = primaryColor
          }
          renderText(user.status || "inactive", xPos + 3, yPosition + 7, {
            fontSize: 9,
            color: statusColor,
            maxWidth: userColWidths[3] - 6,
            lineSpacing: 1.1,
          })
          xPos += userColWidths[3]

          // Joined date
          renderText(
            user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : "N/A",
            xPos + 3,
            yPosition + 7,
            {
              fontSize: 9,
              color: [60, 60, 60],
              maxWidth: userColWidths[4] - 6,
              lineSpacing: 1.1,
            },
          )

          yPosition += 10
        })

        if (users.length > 20) {
          pdf.text(`... and ${users.length - 20} more users`, margin, yPosition + 5)
        }

        // Add page footer
        pdf.setFontSize(8)
        pdf.setTextColor(150, 150, 150)
        pdf.text("Page 8", pageWidth / 2, pageHeight - 10, { align: "center" })
      }

      // ===== FINAL PAGE =====
      pdf.addPage()
      yPosition = 20

      // Add header
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
      pdf.rect(0, 0, pageWidth, 15, "F")
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(10)
      pdf.text("RecycleMate Admin Dashboard Report", pageWidth / 2, 10, { align: "center" })

      // Add conclusion
      pdf.setFontSize(18)
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      pdf.text("Conclusion", margin, yPosition)
      yPosition += 10

      // Add conclusion text
      const conclusionText = `This report provides a comprehensive overview of the RecycleMate platform's performance during the specified period. The data shows that the platform is effectively facilitating the collection and recycling of materials, with a total of ${stats.totalMaterialsCollected.toFixed(2)} kg collected and ₱${stats.totalRevenue.toFixed(2)} in revenue generated.\n\nThe platform has a healthy user base of ${stats.totalUsers} users, with ${stats.activeUsers} active in the last 30 days. The completion rate for material requests is ${stats.totalRequests > 0 ? ((stats.completedRequests / stats.totalRequests) * 100).toFixed(1) : 0}%, indicating an efficient collection process.\n\nFor any questions or further analysis, please contact the RecycleMate admin team.`

      yPosition = renderText(conclusionText, margin, yPosition, {
        fontSize: 11,
        color: [60, 60, 60],
        maxWidth: contentWidth,
        lineSpacing: 1.4,
      })
      yPosition += 15

      // Add signature section
      pdf.setDrawColor(200, 200, 200)
      pdf.line(margin, yPosition, margin + 70, yPosition)
      yPosition += 5
      pdf.setFontSize(10)
      pdf.setTextColor(100, 100, 100)
      pdf.text("Administrator Signature", margin, yPosition)
      yPosition += 20

      pdf.line(pageWidth - margin - 70, yPosition - 25, pageWidth - margin, yPosition - 25)
      pdf.text("Date", pageWidth - margin - 70, yPosition - 20)

      // Add footer with page numbers
      const totalPages = pdf.internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(150, 150, 150)

        // Add page number
        if (i > 2) {
          // Skip page numbers on cover and TOC
          pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: "center" })
        }

        // Add footer line
        pdf.setDrawColor(200, 200, 200)
        pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)

        // Add company name in footer
        pdf.text("RecycleMate Admin Dashboard", margin, pageHeight - 10)

        // Add date in footer
        pdf.text(new Date().toLocaleDateString(), pageWidth - margin, pageHeight - 10, { align: "right" })
      }

      // Save the PDF
      pdf.save("RecycleMate_Admin_Report.pdf")

      setToastMessage("Enhanced PDF report generated successfully")
      setShowToast(true)
    } catch (error) {
      console.error("Error generating PDF:", error)
      setToastMessage("Error generating PDF report: " + (error instanceof Error ? error.message : String(error)))
      setShowToast(true)
    } finally {
      setIsPdfGenerating(false)
    }
  }

  // Chart data preparation
  const prepareUserGrowthData = () => {
    // Group users by month
    const usersByMonth: { [key: string]: number } = {}

    users.forEach((user) => {
      if (user.createdAt) {
        const date = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt)
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`

        if (!usersByMonth[monthYear]) {
          usersByMonth[monthYear] = 0
        }

        usersByMonth[monthYear]++
      }
    })

    // Sort months chronologically
    const sortedMonths = Object.keys(usersByMonth).sort((a, b) => {
      const [monthA, yearA] = a.split("/").map(Number)
      const [monthB, yearB] = b.split("/").map(Number)

      if (yearA !== yearB) {
        return yearA - yearB
      }

      return monthA - monthB
    })

    // Prepare data for chart
    return {
      labels: sortedMonths,
      datasets: [
        {
          label: "New Users",
          data: sortedMonths.map((month) => usersByMonth[month]),
          borderColor: "rgba(75, 192, 192, 1)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          tension: 0.1,
        },
      ],
    }
  }

  const prepareMaterialDistributionData = () => {
    // Group requests by material type
    const materialCounts: { [key: string]: number } = {}

    requests.forEach((request) => {
      if (!materialCounts[request.materialType]) {
        materialCounts[request.materialType] = 0
      }

      materialCounts[request.materialType] += request.quantity || 0
    })

    // Prepare data for chart
    return {
      labels: Object.keys(materialCounts),
      datasets: [
        {
          label: "Material Distribution (kg)",
          data: Object.values(materialCounts),
          backgroundColor: [
            "rgba(255, 99, 132, 0.6)",
            "rgba(54, 162, 235, 0.6)",
            "rgba(255, 206, 86, 0.6)",
            "rgba(75, 192, 192, 0.6)",
            "rgba(153, 102, 255, 0.6)",
            "rgba(255, 159, 64, 0.6)",
            "rgba(255, 99, 132, 0.6)",
            "rgba(54, 162, 235, 0.6)",
            "rgba(255, 206, 86, 0.6)",
            "rgba(75, 192, 192, 0.6)",
          ],
          borderWidth: 1,
        },
      ],
    }
  }

  const prepareRequestStatusData = () => {
    // Count requests by status
    const statusCounts = {
      pending: stats.pendingRequests,
      inProgress: 0,
      completed: stats.completedRequests,
      cancelled: 0,
    }

    // Count in-progress and cancelled requests
    requests.forEach((request) => {
      if (request.status === "inProgress") {
        statusCounts.inProgress++
      } else if (request.status === "cancelled") {
        statusCounts.cancelled++
      }
    })

    // Prepare data for chart
    return {
      labels: ["Pending", "In Progress", "Completed", "Cancelled"],
      datasets: [
        {
          label: "Request Status",
          data: [statusCounts.pending, statusCounts.inProgress, statusCounts.completed, statusCounts.cancelled],
          backgroundColor: [
            "rgba(255, 206, 86, 0.6)",
            "rgba(54, 162, 235, 0.6)",
            "rgba(75, 192, 192, 0.6)",
            "rgba(255, 99, 132, 0.6)",
          ],
          borderWidth: 1,
        },
      ],
    }
  }

  const prepareRevenueData = () => {
    // Group transactions by month
    const revenueByMonth: { [key: string]: number } = {}

    transactions.forEach((transaction) => {
      if (transaction.createdAt) {
        const date = transaction.createdAt.toDate ? transaction.createdAt.toDate() : new Date(transaction.createdAt)
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`

        if (!revenueByMonth[monthYear]) {
          revenueByMonth[monthYear] = 0
        }

        revenueByMonth[monthYear] += transaction.total || 0
      }
    })

    // Sort months chronologically
    const sortedMonths = Object.keys(revenueByMonth).sort((a, b) => {
      const [monthA, yearA] = a.split("/").map(Number)
      const [monthB, yearB] = b.split("/").map(Number)

      if (yearA !== yearB) {
        return yearA - yearB
      }

      return monthA - monthB
    })

    // Prepare data for chart
    return {
      labels: sortedMonths,
      datasets: [
        {
          label: "Revenue (₱)",
          data: sortedMonths.map((month) => revenueByMonth[month]),
          backgroundColor: "rgba(75, 192, 192, 0.6)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    }
  }

  const renderOverviewTab = () => {
    return (
      <div className="dashboard-overview">
        <IonGrid>
          <IonRow>
            <IonCol size="6">
              <IonCard>
                <IonCardHeader>
                  <IonTitle>Total Users</IonTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonText color="primary">
                    <h1>{stats.totalUsers}</h1>
                  </IonText>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="6">
              <IonCard>
                <IonCardHeader>
                  <IonTitle>Total Junkshops</IonTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonText color="secondary">
                    <h1>{stats.totalJunkshops}</h1>
                  </IonText>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
          <IonRow>
            <IonCol size="6">
              <IonCard>
                <IonCardHeader>
                  <IonTitle>Total Requests</IonTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonText color="tertiary">
                    <h1>{stats.totalRequests}</h1>
                  </IonText>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="6">
              <IonCard>
                <IonCardHeader>
                  <IonTitle>Total Materials Collected</IonTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonText color="success">
                    <h1>{stats.totalMaterialsCollected} kg</h1>
                  </IonText>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
          <IonRow>
            <IonCol size="6">
              <IonCard>
                <IonCardHeader>
                  <IonTitle>Active Users</IonTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonText color="warning">
                    <h1>{stats.activeUsers}</h1>
                  </IonText>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="6">
              <IonCard>
                <IonCardHeader>
                  <IonTitle>Pending Requests</IonTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonText color="danger">
                    <h1>{stats.pendingRequests}</h1>
                  </IonText>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
          <IonRow>
            <IonCol size="6">
              <IonCard>
                <IonCardHeader>
                  <IonTitle>Completed Requests</IonTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonText color="medium">
                    <h1>{stats.completedRequests}</h1>
                  </IonText>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="6">
              <IonCard>
                <IonCardHeader>
                  <IonTitle>Total Revenue</IonTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonText color="dark">
                    <h1>₱{stats.totalRevenue}</h1>
                  </IonText>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardHeader>
                  <IonTitle>User Growth</IonTitle>
                </IonCardHeader>
                <IonCardContent>
                  <div className="chart-container">
                    <Line
                      data={prepareUserGrowthData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "top",
                          },
                          title: {
                            display: true,
                            text: "User Growth Over Time",
                          },
                        },
                      }}
                    />
                  </div>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardHeader>
                  <IonTitle>Material Distribution</IonTitle>
                </IonCardHeader>
                <IonCardContent>
                  <div className="chart-container">
                    <Bar
                      data={prepareMaterialDistributionData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "top",
                          },
                          title: {
                            display: true,
                            text: "Material Distribution by Type",
                          },
                        },
                      }}
                    />
                  </div>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardHeader>
                  <IonTitle>Request Status</IonTitle>
                </IonCardHeader>
                <IonCardContent>
                  <div className="chart-container">
                    <Doughnut
                      data={prepareRequestStatusData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "top",
                          },
                          title: {
                            display: true,
                            text: "Request Status Distribution",
                          },
                        },
                      }}
                    />
                  </div>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardHeader>
                  <IonTitle>Revenue</IonTitle>
                </IonCardHeader>
                <IonCardContent>
                  <div className="chart-container">
                    <Line
                      data={prepareRevenueData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "top",
                          },
                          title: {
                            display: true,
                            text: "Revenue Over Time",
                          },
                        },
                      }}
                    />
                  </div>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </div>
    )
  }

  // Improve the renderUsersTab function to handle empty states better
  const renderUsersTab = () => {
    console.log("Rendering users tab with", users.length, "users")
    return (
      <div className="dashboard-users">
        <IonCard>
          <IonCardHeader>
            <div className="card-header-with-actions">
              <IonLabel>User Management</IonLabel>
              <div className="card-actions">
                <IonButton fill="outline" onClick={() => fetchUsers()}>
                  <IonIcon slot="start" icon={refreshOutline} />
                  Refresh
                </IonButton>
                <IonButton fill="outline" onClick={createTestUser}>
                  <IonIcon slot="start" icon={addOutline} />
                  Create Test User
                </IonButton>
                <IonSelect
                  value={filterRole}
                  onIonChange={(e) => setFilterRole(e.detail.value)}
                  interface="popover"
                  placeholder="Filter by role"
                >
                  <IonSelectOption value="all">All Roles</IonSelectOption>
                  <IonSelectOption value="resident">Residents</IonSelectOption>
                  <IonSelectOption value="junkshop">Junkshops</IonSelectOption>
                  <IonSelectOption value="admin">Admins</IonSelectOption>
                </IonSelect>
              </div>
            </div>
          </IonCardHeader>
          <IonCardContent>
            <IonSearchbar
              value={searchTerm}
              onIonChange={(e) => handleSearch(e.detail.value || "")}
              placeholder="Search users..."
              debounce={300}
            />

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Last Login</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name || "N/A"}</td>
                        <td>{user.email || "N/A"}</td>
                        <td>
                          <IonChip
                            color={
                              user.role === "admin" ? "danger" : user.role === "junkshop" ? "secondary" : "primary"
                            }
                          >
                            {user.role || "N/A"}
                          </IonChip>
                        </td>
                        <td>{user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : "N/A"}</td>
                        <td>{user.lastLogin?.toDate ? user.lastLogin.toDate().toLocaleDateString() : "N/A"}</td>
                        <td>
                          <IonChip color={user.status === "active" ? "success" : "medium"}>
                            {user.status || "inactive"}
                          </IonChip>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="no-data">
                        <div style={{ textAlign: "center", padding: "20px" }}>
                          <IonIcon icon={peopleOutline} style={{ fontSize: "48px", color: "#ccc" }} />
                          <p>No users found. Try refreshing or creating a test user.</p>
                          <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                            <IonButton onClick={() => fetchUsers()}>Refresh Users</IonButton>
                            <IonButton onClick={createTestUser}>Create Test User</IonButton>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </IonCardContent>
        </IonCard>
      </div>
    )
  }

  const renderRequestsTab = () => {
    return (
      <div className="dashboard-requests">
        <IonCard>
          <IonCardHeader>
            <div className="card-header-with-actions">
              <IonLabel>Material Requests</IonLabel>
              <div className="card-actions">
                <IonSelect
                  value={filterStatus}
                  onIonChange={(e) => setFilterStatus(e.detail.value)}
                  interface="popover"
                  placeholder="Filter by status"
                >
                  <IonSelectOption value="all">All Status</IonSelectOption>
                  <IonSelectOption value="pending">Pending</IonSelectOption>
                  <IonSelectOption value="inProgress">In Progress</IonSelectOption>
                  <IonSelectOption value="completed">Completed</IonSelectOption>
                  <IonSelectOption value="cancelled">Cancelled</IonSelectOption>
                </IonSelect>
                <IonButton fill="clear" onClick={() => setShowDateFilter(true)}>
                  <IonIcon slot="icon-only" icon={calendarOutline} />
                </IonButton>
              </div>
            </div>
          </IonCardHeader>
          <IonCardContent>
            <IonSearchbar
              value={searchTerm}
              onIonChange={(e) => handleSearch(e.detail.value || "")}
              placeholder="Search requests..."
              debounce={300}
            />

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Material</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length > 0 ? (
                    requests.map((request) => (
                      <tr key={request.id}>
                        <td>{request.userName || "N/A"}</td>
                        <td>{request.materialType || "N/A"}</td>
                        <td>{request.quantity || 0} kg</td>
                        <td>
                          <IonChip
                            color={
                              request.status === "completed"
                                ? "success"
                                : request.status === "pending"
                                  ? "warning"
                                  : request.status === "inProgress"
                                    ? "primary"
                                    : "medium"
                            }
                          >
                            {request.status || "N/A"}
                          </IonChip>
                        </td>
                        <td>{request.location?.address ? request.location.address.substring(0, 20) + "..." : "N/A"}</td>
                        <td>{request.createdAt?.toDate ? request.createdAt.toDate().toLocaleDateString() : "N/A"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="no-data">
                        No requests found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </IonCardContent>
        </IonCard>
      </div>
    )
  }

  const renderTransactionsTab = () => {
    return (
      <div className="dashboard-transactions">
        <IonCard>
          <IonCardHeader>
            <div className="card-header-with-actions">
              <IonLabel>Transactions</IonLabel>
              <div className="card-actions">
                <IonButton fill="clear" onClick={() => setShowDateFilter(true)}>
                  <IonIcon slot="icon-only" icon={calendarOutline} />
                </IonButton>
              </div>
            </div>
          </IonCardHeader>
          <IonCardContent>
            <IonSearchbar
              value={searchTerm}
              onIonChange={(e) => handleSearch(e.detail.value || "")}
              placeholder="Search transactions..."
              debounce={300}
            />

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length > 0 ? (
                    transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{transaction.materialType || "N/A"}</td>
                        <td>{transaction.quantity || 0} kg</td>
                        <td>₱{transaction.price?.toFixed(2) || "0.00"}</td>
                        <td>₱{transaction.total?.toFixed(2) || "0.00"}</td>
                        <td>
                          <IonChip
                            color={
                              transaction.status === "completed"
                                ? "success"
                                : transaction.status === "pending"
                                  ? "warning"
                                  : "medium"
                            }
                          >
                            {transaction.status || "N/A"}
                          </IonChip>
                        </td>
                        <td>
                          {transaction.createdAt?.toDate ? transaction.createdAt.toDate().toLocaleDateString() : "N/A"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="no-data">
                        No transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </IonCardContent>
        </IonCard>
      </div>
    )
  }

  const renderPricesTab = () => {
    return (
      <div className="dashboard-prices">
        <IonCard>
          <IonCardHeader>
            <div className="card-header-with-actions">
              <IonLabel>Material Prices</IonLabel>
              <div className="card-actions">
                <IonButton fill="outline" onClick={handleAddMaterialPrice}>
                  <IonIcon slot="start" icon={addOutline} />
                  Add Price
                </IonButton>
              </div>
            </div>
          </IonCardHeader>
          <IonCardContent>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Price (₱)</th>
                    <th>Unit</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {materialPrices.length > 0 ? (
                    materialPrices.map((price) => (
                      <tr key={price.id}>
                        <td>{price.name}</td>
                        <td>₱{price.price.toFixed(2)}</td>
                        <td>{price.unit}</td>
                        <td>{price.description || "N/A"}</td>
                        <td>
                          <IonButton
                            fill="clear"
                            color="primary"
                            size="small"
                            onClick={() => handleEditMaterialPrice(price)}
                          >
                            <IonIcon slot="icon-only" icon={createOutline} />
                          </IonButton>
                          <IonButton
                            fill="clear"
                            color="danger"
                            size="small"
                            onClick={() => handleDeleteMaterialPrice(price.id)}
                          >
                            <IonIcon slot="icon-only" icon={trashOutline} />
                          </IonButton>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="no-data">
                        No material prices found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </IonCardContent>
        </IonCard>
      </div>
    )
  }

  // Add logout handler function
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      setToastMessage("Logout successful");
      setShowToast(true);
      // Redirect will be handled by the auth context through route protection
    } catch (error) {
      console.error("Logout error:", error);
      setToastMessage("Error during logout");
      setShowToast(true);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Admin Dashboard</IonTitle>
          <IonButtons slot="end">
            <IonButton fill="clear" onClick={generatePDF} disabled={isPdfGenerating}>
              <IonIcon slot="start" icon={documentOutline} />
              {isPdfGenerating ? "Generating..." : "Export PDF"}
            </IonButton>
            <IonButton fill="clear" onClick={() => setShowLogoutAlert(true)}>
              <IonIcon slot="start" icon={exitOutline} />
              Logout
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={activeTab} onIonChange={(e) => setActiveTab(e.detail.value as string)}>
            <IonSegmentButton value="overview">
              <IonLabel>Overview</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="users">
              <IonLabel>Users</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="requests">
              <IonLabel>Requests</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="transactions">
              <IonLabel>Transactions</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="prices">
              <IonLabel>Prices</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {isLoading ? (
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Loading dashboard data...</p>
          </div>
        ) : (
          <div className="dashboard-container" ref={dashboardRef}>
            {activeTab === "overview" && renderOverviewTab()}
            {activeTab === "users" && renderUsersTab()}
            {activeTab === "requests" && renderRequestsTab()}
            {activeTab === "transactions" && renderTransactionsTab()}
            {activeTab === "prices" && renderPricesTab()}
          </div>
        )}

        {/* Material Price Modal */}
        <IonModal isOpen={showPriceModal} onDidDismiss={() => setShowPriceModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{currentPrice?.id ? "Edit" : "Add"} Material Price</IonTitle>
              <IonButton slot="end" fill="clear" onClick={() => setShowPriceModal(false)}>
                <IonIcon slot="icon-only" icon={closeCircleOutline} />
              </IonButton>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {currentPrice && (
              <IonList>
                <IonItem>
                  <IonLabel position="stacked">Material Name</IonLabel>
                  <IonInput
                    value={currentPrice.name}
                    onIonChange={(e) =>
                      setCurrentPrice({
                        ...currentPrice,
                        name: e.detail.value || "",
                      })
                    }
                    placeholder="Enter material name"
                    required
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Price (₱)</IonLabel>
                  <IonInput
                    type="number"
                    value={currentPrice.price}
                    onIonChange={(e) =>
                      setCurrentPrice({
                        ...currentPrice,
                        price: Number.parseFloat(e.detail.value || "0"),
                      })
                    }
                    placeholder="Enter price"
                    required
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Unit</IonLabel>
                  <IonInput
                    value={currentPrice.unit}
                    onIonChange={(e) =>
                      setCurrentPrice({
                        ...currentPrice,
                        unit: e.detail.value || "kg",
                      })
                    }
                    placeholder="Enter unit (e.g., kg)"
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Description</IonLabel>
                  <IonTextarea
                    value={currentPrice.description}
                    onIonChange={(e) =>
                      setCurrentPrice({
                        ...currentPrice,
                        description: e.detail.value,
                      })
                    }
                    placeholder="Enter description"
                    rows={3}
                  />
                </IonItem>

                <div className="ion-padding">
                  <IonButton expand="block" onClick={saveMaterialPrice}>
                    <IonIcon slot="start" icon={saveOutline} />
                    Save
                  </IonButton>
                </div>
              </IonList>
            )}
          </IonContent>
        </IonModal>

        {/* Date Filter Popover */}
        <IonPopover
          isOpen={showDateFilter}
          onDidDismiss={() => setShowDateFilter(false)}
          className="date-filter-popover"
        >
          <IonContent className="ion-padding">
            <h4>Filter by Date Range</h4>

            <IonItem>
              <IonLabel position="stacked">Start Date</IonLabel>
              <IonDatetime
                displayFormat="MMM DD, YYYY"
                value={dateRange.start}
                onIonChange={(e) =>
                  setDateRange({
                    ...dateRange,
                    start: e.detail.value || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
                  })
                }
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">End Date</IonLabel>
              <IonDatetime
                displayFormat="MMM DD, YYYY"
                value={dateRange.end}
                onIonChange={(e) =>
                  setDateRange({
                    ...dateRange,
                    end: e.detail.value || new Date().toISOString(),
                  })
                }
              />
            </IonItem>

            <IonButton
              expand="block"
              className="ion-margin-top"
              onClick={() => {
                fetchFilteredData()
                setShowDateFilter(false)
              }}
            >
              Apply Filter
            </IonButton>
          </IonContent>
        </IonPopover>

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Confirm Delete"
          message="Are you sure you want to delete this item? This action cannot be undone."
          buttons={[
            {
              text: "Cancel",
              role: "cancel",
              handler: () => {
                setShowDeleteAlert(false)
                setItemToDelete(null)
              },
            },
            {
              text: "Delete",
              handler: confirmDelete,
            },
          ]}
        />

        {/* Logout Confirmation Alert */}
        <IonAlert
          isOpen={showLogoutAlert}
          onDidDismiss={() => setShowLogoutAlert(false)}
          header="Confirm Logout"
          message="Are you sure you want to logout?"
          buttons={[
            {
              text: "Cancel",
              role: "cancel",
              handler: () => {
                setShowLogoutAlert(false);
              },
            },
            {
              text: isLoggingOut ? "Logging out..." : "Logout",
              handler: handleLogout,
              cssClass: isLoggingOut ? "alert-button-disabled" : "",
            },
          ]}
        />

        {/* Toast */}
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

export default AdminDashboard
