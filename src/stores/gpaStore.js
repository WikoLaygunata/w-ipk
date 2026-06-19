import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export const useGpaStore = defineStore('gpa', () => {
  const gradeConfig = ref([
    { grade: 'A', minScore: 90, weight: 4.0 },
    { grade: 'A-', minScore: 85, weight: 3.67 },
    { grade: 'B+', minScore: 80, weight: 3.33 },
    { grade: 'B', minScore: 75, weight: 3.0 },
    { grade: 'B-', minScore: 70, weight: 2.5 },
    { grade: 'C', minScore: 65, weight: 2.0 },
    { grade: 'D', minScore: 50, weight: 1.0 },
    { grade: 'E', minScore: 0, weight: 0.0 }
  ])

  // Initialize with 8 semesters
  const semesters = ref(
    Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      name: `Semester ${i + 1}`,
      courses: []
    }))
  )

  const roundingMode = ref('ceil')

  // Load from localStorage if exists
  const savedData = localStorage.getItem('w-ipk-data')
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData)
      if (parsed.gradeConfig) gradeConfig.value = parsed.gradeConfig
      if (parsed.semesters) semesters.value = parsed.semesters
      if (parsed.roundingMode) roundingMode.value = parsed.roundingMode
    } catch (e) {
      console.error('Failed to load w-ipk-data from localStorage:', e)
    }
  }

  const activeSemesterId = ref(1)

  // Toast state
  const toast = ref({
    show: false,
    message: '',
    type: 'success', // 'success' | 'error' | 'warning' | 'info'
    duration: 3000
  })

  let toastTimeout = null

  const showToast = (message, type = 'success', duration = 3000) => {
    if (toastTimeout) clearTimeout(toastTimeout)
    
    toast.value.message = message
    toast.value.type = type
    toast.value.duration = duration
    toast.value.show = true
    
    toastTimeout = setTimeout(() => {
      toast.value.show = false
    }, duration)
  }

  const closeToast = () => {
    if (toastTimeout) clearTimeout(toastTimeout)
    toast.value.show = false
  }

  const calculateGrade = (totalScore) => {
    for (const config of gradeConfig.value) {
      if (totalScore >= config.minScore) {
        return config
      }
    }
    return gradeConfig.value[gradeConfig.value.length - 1]
  }

  const calculateCourseValues = (course) => {
    let activeScoreSum = 0
    let activeWeightSum = 0
    
    course.components.forEach(comp => {
      // Initialize hidden if not present
      if (comp.hidden === undefined) {
        comp.hidden = (comp.score === 0 || comp.score === null)
      }
      
      // Safe coercion to number
      const weightVal = Number(comp.weight) || 0
      const scoreVal = Number(comp.score) || 0
      
      // Calculate value = weightVal * scoreVal / 100
      comp.value = (weightVal * scoreVal) / 100
      
      if (!comp.hidden) {
        activeScoreSum += comp.value
        activeWeightSum += weightVal
      }
    })
    
    if (activeWeightSum > 0) {
      const scaledScore = activeScoreSum * (100 / activeWeightSum)
      
      let finalScore
      const corrected = Math.round(scaledScore * 1000) / 1000
      if (roundingMode.value === 'ceil') {
        finalScore = Math.ceil(corrected)
      } else if (roundingMode.value === 'round') {
        finalScore = Math.round(corrected)
      } else if (roundingMode.value === 'floor') {
        finalScore = Math.floor(corrected)
      } else {
        // 'real'
        finalScore = Math.round(corrected * 100) / 100
      }
      
      course.totalScore = finalScore
      
      const gradeObj = calculateGrade(course.totalScore)
      course.grade = gradeObj.grade
      course.gradeWeight = gradeObj.weight
    } else {
      course.totalScore = null
      course.grade = '-'
      course.gradeWeight = null
    }
    
    return course
  }

  // Calculate semester metrics
  const semesterMetrics = computed(() => {
    const metrics = {}
    
    semesters.value.forEach(semester => {
      let totalSks = 0
      let totalWeight = 0
      let totalNumericScore = 0 // For Average
      
      semester.courses.forEach(course => {
        if (course.totalScore !== null && course.gradeWeight !== null) {
          const sksVal = Number(course.sks) || 0
          totalSks += sksVal
          totalWeight += course.gradeWeight * sksVal
          totalNumericScore += course.totalScore * sksVal
        }
      })
      
      metrics[semester.id] = {
        ips: totalSks > 0 ? (totalWeight / totalSks) : 0,
        average: totalSks > 0 ? (totalNumericScore / totalSks) : 0,
        totalSks
      }
    })
    
    return metrics
  })

  const cumulativeGPA = computed(() => {
    let totalSks = 0
    let totalWeight = 0
    
    semesters.value.forEach(semester => {
      semester.courses.forEach(course => {
        if (course.totalScore !== null && course.gradeWeight !== null) {
          const sksVal = Number(course.sks) || 0
          totalSks += sksVal
          totalWeight += course.gradeWeight * sksVal
        }
      })
    })
    
    return totalSks > 0 ? (totalWeight / totalSks) : 0
  })

  // Actions
  const addCourse = (semesterId) => {
    const semester = semesters.value.find(s => s.id === semesterId)
    if (semester) {
      semester.courses.push({
        id: Date.now().toString(),
        name: 'New Course',
        sks: 2,
        components: [
          { id: Date.now().toString() + '-1', name: 'ASSIGNMENT', weight: 50, score: 0, hidden: true },
          { id: Date.now().toString() + '-2', name: 'FINAL EXAM', weight: 50, score: 0, hidden: true }
        ]
      })
      showToast('Mata kuliah baru berhasil ditambahkan!', 'success')
    }
  }

  const addComponent = (semesterId, courseId) => {
    const semester = semesters.value.find(s => s.id === semesterId)
    if (semester) {
      const course = semester.courses.find(c => c.id === courseId)
      if (course) {
        course.components.push({
          id: Date.now().toString(),
          name: 'NEW COMPONENT',
          weight: 0,
          score: 0,
          hidden: true
        })
        showToast('Komponen nilai baru berhasil ditambahkan!', 'success')
      }
    }
  }

  const deleteComponent = (semesterId, courseId, componentId) => {
    const semester = semesters.value.find(s => s.id === semesterId)
    if (semester) {
      const course = semester.courses.find(c => c.id === courseId)
      if (course) {
        course.components = course.components.filter(comp => comp.id !== componentId)
        showToast('Komponen nilai berhasil dihapus!', 'info')
      }
    }
  }

  const deleteCourse = (semesterId, courseId) => {
    const semester = semesters.value.find(s => s.id === semesterId)
    if (semester) {
      semester.courses = semester.courses.filter(c => c.id !== courseId)
      showToast('Mata kuliah berhasil dihapus!', 'info')
    }
  }

  const importCoursesToActiveSemester = (courses, targetSemesterId = null) => {
    const semId = targetSemesterId !== null ? targetSemesterId : activeSemesterId.value
    const semester = semesters.value.find(s => s.id === semId)
    if (!semester) return

    // Clear existing courses in active semester
    semester.courses = []

    courses.forEach((course, idx) => {
      const courseId = `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`
      
      const courseName = course.code 
        ? `[${course.code}] ${course.name}` 
        : (course.name || 'Mata Kuliah Baru')
      
      const parsedSks = Number(course.sks) || 2
      
      const components = (course.components || []).map((comp, compIdx) => {
        const compId = `${courseId}-comp-${compIdx}`
        let score = 0
        if (comp.score !== undefined && comp.score !== null && comp.score !== 'N/A') {
          score = Number(comp.score)
          if (isNaN(score)) score = 0
        }
        
        return {
          id: compId,
          name: (comp.name || `Komponen ${compIdx + 1}`).toUpperCase(),
          weight: Number(comp.weight) || 0,
          score: score,
          hidden: score === 0 || score === null
        }
      })

      const newCourse = {
        id: courseId,
        name: courseName,
        sks: parsedSks,
        components: components
      }

      // Calculate initial values
      calculateCourseValues(newCourse)

      semester.courses.push(newCourse)
    })
  }

  const cycleRoundingMode = () => {
    console.log('cycleRoundingMode before:', roundingMode.value)
    const modes = ['ceil', 'round', 'floor', 'real']
    const currentIndex = modes.indexOf(roundingMode.value)
    const nextIndex = (currentIndex + 1) % modes.length
    roundingMode.value = modes[nextIndex]
    console.log('cycleRoundingMode after:', roundingMode.value)
    
    const labels = {
      ceil: 'Round Up (Ceil)',
      round: 'Round (Nearest)',
      floor: 'Round Down (Floor)',
      real: 'Real (No Rounding)'
    }
    showToast(`Mode pembulatan diubah ke: ${labels[roundingMode.value]}`, 'success')
  }

  const recalculateAndSave = () => {
    semesters.value.forEach(semester => {
      semester.courses.forEach(course => {
        calculateCourseValues(course)
      })
    })
    localStorage.setItem(
      'w-ipk-data',
      JSON.stringify({
        semesters: semesters.value,
        gradeConfig: gradeConfig.value,
        roundingMode: roundingMode.value
      })
    )
  }

  // Recalculate and persist semesters reactively
  watch(
    semesters,
    recalculateAndSave,
    { deep: true, immediate: true }
  )

  // Recalculate and persist when rounding mode changes
  watch(
    roundingMode,
    recalculateAndSave
  )

  // Persist gradeConfig changes
  watch(
    gradeConfig,
    recalculateAndSave,
    { deep: true }
  )

  const addSemester = () => {
    const maxId = semesters.value.reduce((max, s) => Math.max(max, s.id), 0)
    const nextId = maxId + 1
    semesters.value.push({
      id: nextId,
      name: `Semester ${nextId}`,
      courses: []
    })
    activeSemesterId.value = nextId
    showToast(`Semester ${nextId} berhasil ditambahkan!`, 'success')
  }

  const deleteSemester = (semesterId) => {
    if (semesterId <= 8) {
      showToast('Semester 1-8 tidak dapat dihapus!', 'error')
      return
    }
    const index = semesters.value.findIndex(s => s.id === semesterId)
    if (index !== -1) {
      const semName = semesters.value[index].name
      semesters.value.splice(index, 1)
      if (activeSemesterId.value === semesterId) {
        activeSemesterId.value = semesters.value[index - 1]?.id || semesters.value[0]?.id || 1
      }
      showToast(`${semName} berhasil dihapus!`, 'info')
    }
  }

  return {
    gradeConfig,
    semesters,
    activeSemesterId,
    roundingMode,
    cycleRoundingMode,
    semesterMetrics,
    cumulativeGPA,
    addCourse,
    addComponent,
    deleteComponent,
    deleteCourse,
    importCoursesToActiveSemester,
    addSemester,
    deleteSemester,
    toast,
    showToast,
    closeToast
  }
})
