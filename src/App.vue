<script setup>
import { ref, watch } from 'vue'
import { useGpaStore } from './stores/gpaStore'
import GpaTable from './components/GpaTable.vue'
import GradeConfig from './components/GradeConfig.vue'
import { exportToExcel } from './utils/excel'

const store = useGpaStore()
const showGeminiModal = ref(false)
const geminiJsonInput = ref('')
const errorMessage = ref('')
const copySuccess = ref(false)
const showConfig = ref(false)

// Dark/Light Mode state
const isDarkMode = ref(true)
const savedTheme = localStorage.getItem('w-ipk-theme')
if (savedTheme === 'light') {
  isDarkMode.value = false
}

watch(
  isDarkMode,
  (newVal) => {
    if (newVal) {
      document.documentElement.classList.remove('light')
      localStorage.setItem('w-ipk-theme', 'dark')
    } else {
      document.documentElement.classList.add('light')
      localStorage.setItem('w-ipk-theme', 'light')
    }
  },
  { immediate: true },
)

const aiPromptText = `Ubah teks mentah hasil copy-paste dari portal nilai berikut menjadi struktur data JSON murni (hanya JSON, jangan berikan penjelasan, taruh di dalam codeblock). 

Ikuti format struktur JSON ini secara persis:
{
  "courses": [
    {
      "code": "STRING (Contoh: COMP6100001)",
      "name": "STRING (Contoh: Software Engineering)",
      "class": "STRING (Contoh: LG01)",
      "sks": NUMBER,
      "components": [
        {
          "name": "STRING (Contoh: THEORY: ASSIGNMENT)",
          "weight": NUMBER (Hanya angka persentase, misal 10 untuk 10.0%),
          "score": NUMBER (Jika nilainya 'N/A' atau belum ada, isi dengan null atau 0)
        }
      ]
    }
  ]
}

Berikut adalah teks mentah dari portal nilai:
[TEMPEL TEKS PORTAL NILAI DI SINI]`

const copyPromptToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(aiPromptText)
    copySuccess.value = true
    store.showToast('Prompt AI berhasil disalin ke clipboard!', 'success')
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy text: ', err)
    store.showToast('Gagal menyalin prompt ke clipboard.', 'error')
  }
}

const handleGeminiImport = () => {
  try {
    errorMessage.value = ''
    if (!geminiJsonInput.value.trim()) {
      errorMessage.value = 'Input JSON tidak boleh kosong.'
      return
    }

    // Try parsing
    const parsedData = JSON.parse(geminiJsonInput.value.trim())

    if (!parsedData.courses || !Array.isArray(parsedData.courses)) {
      errorMessage.value = 'Format JSON tidak sesuai standar w-ipk. Harus memiliki array "courses".'
      return
    }

    store.importCoursesToActiveSemester(parsedData.courses)

    // Clear and close
    geminiJsonInput.value = ''
    showGeminiModal.value = false
    store.showToast('Import via Text berhasil!', 'success')
  } catch (err) {
    errorMessage.value =
      'Gagal membaca JSON. Pastikan kamu menyalin seluruh output dari Gemini dengan benar dan valid.'
  }
}

const handleExport = () => {
  try {
    exportToExcel(store)
    store.showToast('Ekspor data ke file Excel berhasil!', 'success')
  } catch (err) {
    console.error(err)
    store.showToast('Gagal mengekspor data ke Excel.', 'error')
  }
}
</script>

<template>
  <div
    class="min-h-screen flex flex-col font-sans text-textMain bg-lightBg selection:bg-brand-200 selection:text-brand-900"
  >
    <!-- Navbar -->
    <header
      class="sticky top-0 z-50 bg-cardBg/80 backdrop-blur-md border-b border-borderLight shadow-sm"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-2">
            <div
              class="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30 pulse-glow-handle"
            >
              <svg
                class="w-5 h-5 text-white"
                viewBox="0 0 512 512"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M256 128L96 224L256 320L416 224L256 128Z" fill="currentColor" />
                <path
                  d="M160 280V360C160 360 200 400 256 400C312 400 352 360 352 360V280"
                  stroke="currentColor"
                  stroke-width="32"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M416 224V352"
                  stroke="currentColor"
                  stroke-width="32"
                  stroke-linecap="round"
                />
              </svg>
            </div>
            <span class="font-display font-bold text-xl tracking-tight text-textMain">w-ipk</span>
          </div>

          <!-- IPK Global Dashboard -->
          <div class="hidden sm:flex items-center space-x-4">
            <div
              class="bg-brand-50 border border-brand-200 px-4 py-1.5 rounded-full flex items-center space-x-2"
            >
              <span class="text-sm font-medium text-brand-700">Cumulative GPA:</span>
              <span class="font-display font-bold text-lg text-brand-900">{{
                store.cumulativeGPA.toFixed(2)
              }}</span>
            </div>
          </div>

          <div class="flex items-center space-x-3">
            <!-- Theme Toggle Button -->
            <button
              @click="isDarkMode = !isDarkMode"
              class="p-2 bg-cardBg border border-borderLight hover:bg-lightBg rounded-lg text-textMuted hover:text-textMain transition-all cursor-pointer shadow-sm flex items-center justify-center"
              title="Toggle Theme"
            >
              <!-- Moon Icon (Shown in Light Mode) -->
              <svg
                v-if="!isDarkMode"
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                ></path>
              </svg>
              <!-- Sun Icon (Shown in Dark Mode) -->
              <svg
                v-else
                class="w-4 h-4 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
                ></path>
              </svg>
            </button>

            <button
              @click="showGeminiModal = true"
              class="text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-3 py-1.5 rounded-lg font-medium shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center cursor-pointer"
            >
              <svg
                class="w-4 h-4 mr-1.5 animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                ></path>
              </svg>
              Import via Text
            </button>
            <button
              @click="handleExport"
              class="text-sm bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg font-medium shadow-md shadow-brand-500/20 transition-all flex items-center cursor-pointer"
            >
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                ></path>
              </svg>
              Export
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div class="space-y-8">
        <!-- Collapsible Configurations & Tips at the Top -->
        <div
          class="bg-cardBg rounded-xl border border-borderLight overflow-hidden shadow-sm transition-all duration-300"
        >
          <!-- Toggle Header -->
          <button
            @click="showConfig = !showConfig"
            class="w-full px-5 py-4 flex items-center justify-between font-display font-semibold text-textMain hover:bg-lightBg/30 transition-colors text-left cursor-pointer focus:outline-none"
          >
            <div class="flex items-center space-x-2.5">
              <svg
                class="w-5 h-5 text-brand-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                ></path>
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                ></path>
              </svg>
              <span>Konfigurasi Nilai & Panduan Penggunaan</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-xs text-textMuted font-normal">{{
                showConfig ? 'Sembunyikan' : 'Tampilkan'
              }}</span>
              <svg
                :class="[
                  showConfig ? 'rotate-180' : '',
                  'w-4 h-4 text-textMuted transition-transform duration-300',
                ]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                ></path>
              </svg>
            </div>
          </button>

          <!-- Collapsible Content -->
          <Transition name="expand">
            <div v-show="showConfig" class="border-t border-borderLight p-5 bg-lightBg/10">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="md:col-span-2">
                  <GradeConfig />
                </div>
                <div
                  class="bg-cardBg rounded-xl border border-borderLight p-5 flex flex-col justify-center"
                >
                  <h3 class="font-display font-semibold text-textMain mb-3 flex items-center">
                    <svg
                      class="w-5 h-5 mr-2 text-brand-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                    Tips Penggunaan
                  </h3>
                  <ul class="text-sm text-textMuted space-y-3 list-disc pl-5">
                    <li>
                      Data mata kuliah Anda otomatis disimpan di penyimpanan lokal browser (<code
                        class="px-1 bg-lightBg border border-borderLight rounded text-xs font-mono"
                        >localStorage</code
                      >) sehingga tidak akan hilang saat di-refresh.
                    </li>
                    <li>
                      Ubah batas minimal nilai huruf dan bobot konversi di bagian
                      <span class="font-bold">Grade Configuration</span> sesuai aturan kampus Anda.
                    </li>
                    <li>
                      Salin prompt AI yang disediakan dan kirim ke Gemini bersama teks mentah dari
                      portal nilai untuk melakukan <span class="font-bold">Smart Import</span>.
                    </li>
                    <li>
                      Gunakan tombol <span class="font-bold">Export</span> untuk menyimpan semua
                      data semester ke dalam format Excel (.xlsx) rapi dengan kalkulasi lengkap.
                    </li>
                    <li>
                      Arahkan kursor (*hover*) pada baris mata kuliah atau komponen untuk
                      menampilkan tombol <span class="font-bold">Hapus</span> data.
                    </li>
                    <li>
                      Pastikan akumulasi bobot persentase komponen di setiap mata kuliah berjumlah
                      <span class="font-bold">100%</span> untuk kalkulasi nilai yang akurat.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Semester Tabs & Tables -->
        <div class="space-y-4">
          <!-- Tabs -->
          <div class="overflow-x-auto pb-2 custom-scrollbar">
            <div class="flex space-x-2">
              <button
                v-for="sem in store.semesters"
                :key="sem.id"
                @click="store.activeSemesterId = sem.id"
                :class="[
                  'px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all border cursor-pointer',
                  store.activeSemesterId === sem.id
                    ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-sm'
                    : 'bg-cardBg border-transparent text-textMuted hover:bg-lightBg hover:text-textMain hover:border-borderLight',
                ]"
              >
                {{ sem.name }}
              </button>
            </div>
          </div>

          <!-- Tab Content (GpaTable) -->
          <Transition name="fade" mode="out-in">
            <GpaTable :key="store.activeSemesterId" :semester-id="store.activeSemesterId" />
          </Transition>
        </div>
      </div>
    </main>
  </div>

  <!-- Gemini Import Modal -->
  <Transition name="fade">
    <div v-if="showGeminiModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
        @click="showGeminiModal = false"
      ></div>

      <!-- Modal Content -->
      <div
        class="relative bg-cardBg rounded-2xl shadow-xl border border-borderLight w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10 flex flex-col scale-in"
      >
        <!-- Header -->
        <div
          class="sticky top-0 bg-cardBg border-b border-borderLight px-6 py-4 flex items-center justify-between z-10"
        >
          <div class="flex items-center space-x-2">
            <div
              class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md text-white"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                ></path>
              </svg>
            </div>
            <h3 class="font-display font-bold text-lg text-textMain">Smart Import via Text</h3>
          </div>
          <button
            @click="showGeminiModal = false"
            class="text-textMuted hover:text-textMain transition-colors p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-6">
          <div class="space-y-4">
            <!-- Step 1 -->
            <div class="flex items-start space-x-3">
              <div
                class="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-900 flex items-center justify-center font-bold text-xs mt-0.5"
              >
                1
              </div>
              <div>
                <h4 class="font-semibold text-textMain text-sm">Buka Portal Nilai BINUS</h4>
                <p class="text-xs text-textMuted mt-1">
                  Kunjungi halaman portal nilai di
                  <a
                    href="https://newacadservices.apps.binus.ac.id/newStudent/hash/score/viewscore"
                    target="_blank"
                    class="text-brand-600 hover:text-brand-700 font-medium inline-flex items-center underline"
                  >
                    BINUS Portal Nilai
                    <svg
                      class="w-3.5 h-3.5 ml-0.5 inline"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      ></path>
                    </svg>
                  </a>
                </p>
              </div>
            </div>

            <!-- Step 2 -->
            <div class="flex items-start space-x-3">
              <div
                class="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-900 flex items-center justify-center font-bold text-xs mt-0.5"
              >
                2
              </div>
              <div>
                <h4 class="font-semibold text-textMain text-sm">Copy Tabel</h4>
                <p class="text-xs text-textMuted mt-1">Pilih semester, lalu copy tabel nilainya.</p>
              </div>
            </div>

            <!-- Step 3 -->
            <div class="flex items-start space-x-3">
              <div
                class="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-900 flex items-center justify-center font-bold text-xs mt-0.5"
              >
                3
              </div>
              <div class="flex-grow">
                <h4 class="font-semibold text-textMain text-sm">Salin Prompt AI di Bawah Ini</h4>
                <p class="text-xs text-textMuted mt-1 mb-2">
                  Gunakan prompt ini sebagai instruksi bagi Gemini agar menghasilkan JSON yang
                  terstruktur.
                </p>
                <div class="flex items-center space-x-2">
                  <button
                    @click="copyPromptToClipboard"
                    :class="[
                      copySuccess
                        ? 'bg-brand-600 text-white'
                        : 'bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200',
                      'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center transition-all shadow-sm cursor-pointer',
                    ]"
                  >
                    <svg
                      v-if="!copySuccess"
                      class="w-3.5 h-3.5 mr-1.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-5 4h5m-5 4h5m-5 4h10"
                      ></path>
                    </svg>
                    <svg
                      v-else
                      class="w-3.5 h-3.5 mr-1.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    {{ copySuccess ? 'Prompt Tersalin!' : 'Klik untuk Salin Prompt' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Step 4 -->
            <div class="flex items-start space-x-3">
              <div
                class="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-900 flex items-center justify-center font-bold text-xs mt-0.5"
              >
                4
              </div>
              <div>
                <h4 class="font-semibold text-textMain text-sm">Proses dengan Gemini AI</h4>
                <p class="text-xs text-textMuted mt-1">
                  Buka
                  <a
                    href="https://gemini.google.com"
                    target="_blank"
                    class="text-brand-600 hover:text-brand-700 underline font-medium inline-flex items-center"
                  >
                    Gemini AI
                    <svg
                      class="w-3.5 h-3.5 ml-0.5 inline"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      ></path>
                    </svg> </a
                  >, tempel prompt tadi, ganti bagian
                  <code
                    class="px-1.5 py-0.5 bg-lightBg rounded text-rose-600 text-xs font-mono font-semibold"
                    >[TEMPEL TEKS PORTAL NILAI DI SINI]</code
                  >
                  dengan hasil copy di Langkah 2, kirim ke Gemini, lalu salin seluruh teks JSON
                  hasilnya.
                </p>
              </div>
            </div>

            <!-- Step 5 -->
            <div class="flex items-start space-x-3">
              <div
                class="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-900 flex items-center justify-center font-bold text-xs mt-0.5"
              >
                5
              </div>
              <div class="flex-grow">
                <h4 class="font-semibold text-textMain text-sm">Tempel Hasil JSON ke Sini</h4>
                <textarea
                  v-model="geminiJsonInput"
                  rows="6"
                  placeholder='{ "courses": [...] }'
                  class="mt-2 w-full p-3 font-mono text-xs border border-borderLight rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-lightBg/50 text-textMain"
                ></textarea>

                <!-- Error Message -->
                <Transition name="fade">
                  <div
                    v-if="errorMessage"
                    class="mt-2 bg-scoreRoseBg border border-scoreRoseBorder text-scoreRoseText px-3 py-2 rounded-lg text-xs flex items-start space-x-1.5"
                  >
                    <svg
                      class="w-4 h-4 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                    <span>{{ errorMessage }}</span>
                  </div>
                </Transition>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="sticky bottom-0 bg-lightBg border-t border-borderLight px-6 py-4 flex justify-end space-x-3 rounded-b-2xl"
        >
          <button
            @click="showGeminiModal = false"
            class="px-4 py-2 border border-borderLight rounded-xl text-sm font-medium hover:bg-lightBg text-textMain transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            @click="handleGeminiImport"
            class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-md shadow-brand-500/20 transition-all flex items-center cursor-pointer"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
            Generate Table
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Custom Toast Notification -->
  <Transition name="slide-toast">
    <div
      v-if="store.toast.show"
      :key="store.toast.message"
      class="fixed top-4 right-4 z-50 flex items-start w-[calc(100%-2rem)] max-w-sm sm:max-w-md p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 pointer-events-auto overflow-hidden"
      :class="[
        isDarkMode
          ? {
              'bg-emerald-950/90 border-emerald-800 text-emerald-200':
                store.toast.type === 'success',
              'bg-rose-950/90 border-rose-800 text-rose-200': store.toast.type === 'error',
              'bg-amber-950/90 border-amber-800 text-amber-200': store.toast.type === 'warning',
              'bg-blue-950/90 border-blue-800 text-blue-200': store.toast.type === 'info',
            }
          : {
              'bg-emerald-50/95 border-emerald-200 text-emerald-800':
                store.toast.type === 'success',
              'bg-rose-50/95 border-rose-200 text-rose-800': store.toast.type === 'error',
              'bg-amber-50/95 border-amber-200 text-amber-800': store.toast.type === 'warning',
              'bg-blue-50/95 border-blue-200 text-blue-800': store.toast.type === 'info',
            },
      ]"
    >
      <!-- Icon depending on type -->
      <div class="flex-shrink-0 mt-0.5">
        <svg
          v-if="store.toast.type === 'success'"
          class="w-5 h-5 text-emerald-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <svg
          v-else-if="store.toast.type === 'error'"
          class="w-5 h-5 text-rose-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <svg
          v-else-if="store.toast.type === 'warning'"
          class="w-5 h-5 text-amber-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          ></path>
        </svg>
        <svg
          v-else
          class="w-5 h-5 text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
      </div>

      <!-- Message Text -->
      <div class="ml-3 flex-grow mr-2">
        <p class="font-display font-semibold text-sm">
          {{
            store.toast.type === 'success'
              ? 'Sukses'
              : store.toast.type === 'error'
                ? 'Kesalahan'
                : store.toast.type === 'warning'
                  ? 'Peringatan'
                  : 'Informasi'
          }}
        </p>
        <p class="text-xs mt-0.5 opacity-90 leading-relaxed">{{ store.toast.message }}</p>
      </div>

      <!-- Close Button -->
      <button
        @click="store.closeToast"
        class="flex-shrink-0 ml-auto text-current opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded-lg focus:outline-none cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          ></path>
        </svg>
      </button>

      <!-- Toast Progress Bar -->
      <div class="toast-progress" :style="{ animationDuration: store.toast.duration + 'ms' }"></div>
    </div>
  </Transition>
</template>

<style>
/* Custom Scrollbar for Tabs */
.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

.scale-in {
  animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Accordion Expand/Collapse Transitions */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease-in-out;
  max-height: 800px;
  opacity: 1;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  border-top-width: 0 !important;
}

/* Toast Transition */
.slide-toast-enter-active,
.slide-toast-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-toast-enter-from {
  opacity: 0;
  transform: translateX(100px) scale(0.95);
}
.slide-toast-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

/* Toast Progress Bar Animation */
.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  width: 100%;
  background-color: currentColor;
  opacity: 0.35;
  transform-origin: left;
  animation: shrinkWidth linear forwards;
}

@keyframes shrinkWidth {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}
</style>
