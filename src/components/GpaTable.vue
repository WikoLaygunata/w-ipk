<script setup>
import { computed } from 'vue'
import { useGpaStore } from '../stores/gpaStore'

const store = useGpaStore()
const props = defineProps({
  semesterId: {
    type: Number,
    required: true
  }
})

const semester = computed(() => store.semesters.find(s => s.id === props.semesterId))
const metrics = computed(() => store.semesterMetrics[props.semesterId])

const getScoreColor = (score) => {
  if (score >= 80) return 'bg-scoreGreenBg text-scoreGreenText border-scoreGreenBorder focus:ring-emerald-500'
  if (score >= 65) return 'bg-scoreAmberBg text-scoreAmberText border-scoreAmberBorder focus:ring-amber-500'
  return 'bg-scoreRoseBg text-scoreRoseText border-scoreRoseBorder focus:ring-rose-500'
}

const getCourseTotalScore = (course) => {
  let activeScoreSum = 0
  let activeWeightSum = 0
  
  course.components.forEach(comp => {
    if (!comp.hidden) {
      activeScoreSum += ((Number(comp.weight) || 0) * (Number(comp.score) || 0)) / 100
      activeWeightSum += (Number(comp.weight) || 0)
    }
  })
  
  if (activeWeightSum === 0) return null
  
  const total = activeScoreSum * (100 / activeWeightSum)
  return Math.ceil(Math.round(total * 1000) / 1000)
}

const getCourseGrade = (course) => {
  const totalScore = getCourseTotalScore(course)
  if (totalScore === null) return '-'
  
  for (const config of store.gradeConfig) {
    if (totalScore >= config.minScore) {
      return config.grade
    }
  }
  return store.gradeConfig[store.gradeConfig.length - 1].grade
}

const toggleComponentHidden = (comp) => {
  comp.hidden = !comp.hidden
  // If enabling and it doesn't have a score, default to 0
  if (!comp.hidden && (comp.score === undefined || comp.score === null)) {
    comp.score = 0
  }
}

const hasVisibleScores = computed(() => {
  if (!semester.value) return false
  return semester.value.courses.some(course =>
    course.components.some(comp => !comp.hidden)
  )
})

const toggleAllHidden = () => {
  if (!semester.value) return
  const currentVisible = hasVisibleScores.value
  const targetState = currentVisible // If visible -> hide all (true), if none visible -> show all (false)
  
  semester.value.courses.forEach(course => {
    course.components.forEach(comp => {
      comp.hidden = targetState
      if (!targetState && (comp.score === undefined || comp.score === null)) {
        comp.score = 0
      }
    })
  })
  
  if (targetState) {
    store.showToast('Semua komponen di-hide (belum masuk)', 'info')
  } else {
    store.showToast('Semua komponen diaktifkan', 'success')
  }
}

// Keyboard Navigation Logic
const handleKeyDown = (e, rowIndex, colIndex, componentIndex, courseIndex) => {
  // Arrow navigation logic across inputs
  const currentInput = e.target;
  let nextInput = null;
  
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    const selector = `[data-col="${colIndex}"][data-row="${rowIndex - 1}"]`
    nextInput = document.querySelector(selector)
  } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
    e.preventDefault();
    const selector = `[data-col="${colIndex}"][data-row="${rowIndex + 1}"]`
    nextInput = document.querySelector(selector)
  }
  
  if (nextInput) {
    nextInput.focus();
    nextInput.select();
  }
}

let globalRowCounter = 0;
const getNextRowIndex = () => {
  return globalRowCounter++;
}

const resetRowCounter = () => {
  globalRowCounter = 0;
}
</script>

<template>
  <div class="bg-cardBg rounded-xl border border-borderLight shadow-sm overflow-hidden flex flex-col">
    {{ resetRowCounter() }}
    
    <!-- Table Header -->
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse min-w-[800px]">
        <thead>
          <tr class="bg-brand-50 border-b border-borderLight text-brand-900 text-sm font-semibold">
            <th class="p-3 w-48 border-r border-borderLight">Course</th>
            <th class="p-3 w-16 text-center border-r border-borderLight">SKS</th>
            <th class="p-3 border-r border-borderLight">Component</th>
            <th class="p-3 w-24 text-center border-r border-borderLight">Weight (%)</th>
            <th class="p-3 w-32 border-r border-borderLight text-center">
              <div class="flex items-center justify-center space-x-1.5">
                <span>Score</span>
                <button
                  @click="toggleAllHidden"
                  class="p-1 rounded hover:bg-brand-200/50 text-brand-700 hover:text-brand-900 transition-all cursor-pointer flex-shrink-0"
                  :title="hasVisibleScores ? 'Sembunyikan semua (belum masuk)' : 'Tampilkan semua (aktifkan)'"
                >
                  <!-- Eye Open (Click to hide all) -->
                  <svg v-if="hasVisibleScores" class="w-3.5 h-3.5 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <!-- Eye Off (Click to show all) -->
                  <svg v-else class="w-3.5 h-3.5 opacity-60 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                </button>
              </div>
            </th>
            <th class="p-3 w-24 text-center border-r border-borderLight">Value</th>
            <th class="p-3 w-24 text-center border-r border-borderLight">Total</th>
            <th class="p-3 w-24 text-center">Grade</th>
          </tr>
        </thead>
        <tbody class="text-sm">
          <template v-for="(course, cIdx) in semester.courses" :key="course.id">
            <template v-for="(comp, compIdx) in course.components" :key="comp.id">
              <tr 
                class="border-b border-borderLight hover:bg-lightBg/50 transition-colors group"
                :class="{ 'opacity-60 bg-lightBg/5': comp.hidden }"
              >
                <!-- Course Info (Rowspan) -->
                <template v-if="compIdx === 0">
                  <td :rowspan="course.components.length" class="p-2 border-r border-borderLight align-top bg-cardBg">
                    <div class="flex flex-col h-full space-y-1">
                      <textarea
                        v-model="course.name"
                        rows="4"
                        class="font-medium text-textMain bg-transparent border-none focus:ring-1 focus:ring-brand-500 rounded px-1 py-0.5 w-full text-sm resize-none focus:outline-none"
                      ></textarea>
                      <button @click="store.deleteCourse(semester.id, course.id)" class="text-xs text-rose-500 hover:text-rose-700 text-left px-1 opacity-0 group-hover:opacity-100 transition-opacity mt-auto">Hapus Matkul</button>
                    </div>
                  </td>
                  <td :rowspan="course.components.length" class="p-2 border-r border-borderLight align-top text-center bg-cardBg">
                    <input type="number" v-model.number="course.sks" class="w-12 text-center text-textMain bg-transparent border-none focus:ring-1 focus:ring-brand-500 rounded px-1 py-0.5" />
                  </td>
                </template>
                
                <!-- Component Info -->
                <td class="p-2 border-r border-borderLight relative">
                  <div class="flex items-center space-x-1">
                    <input v-model="comp.name" :class="[comp.hidden ? 'opacity-60' : '', 'flex-grow text-textMuted bg-transparent border-none focus:ring-1 focus:ring-brand-500 rounded px-1 py-0.5 text-sm uppercase transition-opacity']" />
                    <button @click="store.deleteComponent(semester.id, course.id, comp.id)" class="text-gray-300 hover:text-rose-500 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" title="Hapus Komponen">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                </td>
                
                <td class="p-2 border-r border-borderLight text-center">
                  <input type="number" v-model.number="comp.weight" :data-col="1" :data-row="getNextRowIndex() - 1" @keydown="e => handleKeyDown(e, parseInt(e.target.dataset.row), 1, compIdx, cIdx)" :class="[comp.hidden ? 'opacity-60 border-dashed text-textMuted' : '', 'w-16 text-center border rounded px-1 py-1 focus:outline-none focus:ring-1 border-borderLight bg-transparent text-textMain transition-all']" />
                </td>
                
                <td class="p-2 border-r border-borderLight text-center">
                  <div class="flex items-center justify-center space-x-1.5">
                    <input 
                      type="number" 
                      v-model.number="comp.score" 
                      :data-col="2" 
                      :data-row="globalRowCounter - 1" 
                      @keydown="e => handleKeyDown(e, parseInt(e.target.dataset.row), 2, compIdx, cIdx)" 
                      @input="() => { if (comp.score > 0) comp.hidden = false }"
                      :class="[
                        comp.hidden 
                          ? 'bg-lightBg/30 border-dashed text-textMuted opacity-60 focus:ring-gray-400' 
                          : getScoreColor(comp.score), 
                        'w-16 text-center border rounded px-1 py-1 focus:outline-none focus:ring-1 transition-all font-medium bg-transparent'
                      ]" 
                    />
                    <button
                      @click="toggleComponentHidden(comp)"
                      class="p-1 rounded hover:bg-lightBg/80 text-textMuted hover:text-textMain transition-all cursor-pointer flex-shrink-0"
                      :title="comp.hidden ? 'Nilai belum masuk (klik untuk aktifkan)' : 'Nilai aktif (klik untuk sembunyikan/belum masuk)'"
                    >
                      <!-- Eye Slashed (Hidden) - Lucide -->
                      <svg v-if="comp.hidden" class="w-4 h-4 opacity-60 text-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                      <!-- Eye Open (Visible) - Lucide -->
                      <svg v-else class="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </div>
                </td>
                
                <td class="p-2 border-r border-borderLight text-center text-textMuted" :class="{ 'opacity-60': comp.hidden }">
                  {{ comp.hidden ? '-' : (comp.value || 0).toFixed(2) }}
                </td>
                
                <!-- Total & Grade (Rowspan) -->
                <template v-if="compIdx === 0">
                  <td :rowspan="course.components.length" class="p-3 border-r border-borderLight align-middle text-center bg-cardBg">
                    <span class="font-display font-bold text-lg" :class="getCourseTotalScore(course) === null ? 'text-textMuted opacity-40' : getCourseTotalScore(course) >= 85 ? 'text-emerald-500' : getCourseTotalScore(course) >= 65 ? 'text-brand-500' : 'text-rose-500'">
                      {{ getCourseTotalScore(course) !== null ? getCourseTotalScore(course) : '-' }}
                    </span>
                  </td>
                  <td :rowspan="course.components.length" class="p-3 align-middle text-center bg-cardBg">
                    <span class="inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg border-2 shadow-sm" :class="[getCourseTotalScore(course) === null ? 'bg-lightBg border-borderLight text-textMuted opacity-40' : ['A', 'A-', 'B+', 'B', 'B-'].includes(getCourseGrade(course)) ? 'bg-brand-50 border-brand-200 text-brand-700' : ['C', 'D'].includes(getCourseGrade(course)) ? 'bg-scoreAmberBg border-scoreAmberBorder text-scoreAmberText' : getCourseGrade(course) === 'E' ? 'bg-scoreRoseBg border-scoreRoseBorder text-scoreRoseText' : 'bg-lightBg border-borderLight text-textMuted']">
                      {{ getCourseGrade(course) || '-' }}
                    </span>
                  </td>
                </template>
              </tr>
            </template>
            <!-- Add Component Button Row -->
            <tr class="bg-lightBg/40 border-b-2 border-borderLight">
              <td colspan="2" class="border-r border-borderLight bg-cardBg"></td>
              <td colspan="6" class="p-2">
                <button @click="store.addComponent(semester.id, course.id)" class="text-xs font-medium text-brand-600 hover:text-brand-800 flex items-center bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded transition-colors">
                  <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                  Tambah Komponen
                </button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      
      <!-- Empty State / Add Course -->
      <div class="p-4 bg-cardBg flex justify-center border-t border-borderLight">
        <button @click="store.addCourse(semester.id)" class="bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100 px-4 py-2 rounded-lg font-medium shadow-sm transition-all flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Tambah Mata Kuliah
        </button>
      </div>
    </div>
    
    <!-- Footer Summary -->
    <div class="bg-brand-50 p-4 border-t border-borderLight flex flex-col sm:flex-row justify-between items-center mt-auto gap-4">
      <div class="flex space-x-6">
        <div>
          <p class="text-xs text-brand-700 font-medium mb-1">Total SKS</p>
          <p class="font-display font-bold text-xl text-brand-900">{{ metrics?.totalSks || 0 }}</p>
        </div>
        <div>
          <p class="text-xs text-brand-700 font-medium mb-1">Average</p>
          <p class="font-display font-bold text-xl text-brand-900">{{ metrics?.average?.toFixed(2) || '0.00' }}</p>
        </div>
      </div>
      
      <div class="bg-cardBg border-2 border-brand-200 rounded-xl px-6 py-3 shadow-sm text-center">
        <p class="text-xs text-brand-600 font-semibold mb-1 uppercase tracking-wider">Indeks Prestasi Semester</p>
        <p class="font-display text-3xl font-extrabold text-brand-700">{{ metrics?.ips?.toFixed(2) || '0.00' }}</p>
      </div>
    </div>
  </div>
</template>
