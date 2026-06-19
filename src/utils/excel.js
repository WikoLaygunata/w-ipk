import * as XLSX from 'xlsx'

export const exportToExcel = (store) => {
  const wb = XLSX.utils.book_new()

  store.semesters.forEach((semester) => {
    // Only export semesters with data
    if (semester.courses.length === 0) return

    const rows = []

    // Header
    rows.push(['Course', 'SKS', 'Component', 'Weight (%)', 'Score', 'Value', 'Total', 'Grade'])

    semester.courses.forEach((course) => {
      course.components.forEach((comp, idx) => {
        if (idx === 0) {
          rows.push([
            course.name,
            course.sks,
            comp.name,
            comp.weight,
            comp.score,
            comp.value !== null && comp.value !== undefined ? comp.value.toFixed(2) : '',
            course.totalScore !== null && course.totalScore !== undefined ? course.totalScore.toFixed(2) : '',
            course.grade && course.grade !== '-' ? course.grade : '',
          ])
        } else {
          rows.push([
            '', // course name
            '', // sks
            comp.name,
            comp.weight,
            comp.score,
            comp.value !== null && comp.value !== undefined ? comp.value.toFixed(2) : '',
            '', // total
            '', // grade
          ])
        }
      })
    })

    // Add empty row
    rows.push([])

    // Add Summary
    const metrics = store.semesterMetrics[semester.id]
    rows.push(['', '', '', '', '', '', 'Total SKS', metrics.totalSks])
    rows.push(['', '', '', '', '', '', 'Average', metrics.average?.toFixed(2) || '0.00'])
    rows.push(['', '', '', '', '', '', 'IPS', metrics.ips?.toFixed(2) || '0.00'])

    const ws = XLSX.utils.aoa_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, semester.name)
  })

  // If all semesters empty, add dummy
  if (wb.SheetNames.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([['No data to export']])
    XLSX.utils.book_append_sheet(wb, ws, 'Empty')
  }

  XLSX.writeFile(wb, 'w-ipk-data.xlsx')
}

// Basic implementation for import
// Strictly validated implementation for import
export const importFromExcel = async (file, store) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })

        if (workbook.SheetNames.length === 0) {
          throw new Error('File Excel tidak memiliki sheet data.')
        }

        // Deep copy of store semesters to validate completely before mutating state
        const parsedSemesters = JSON.parse(JSON.stringify(store.semesters))
        let hasImportedData = false

        for (const sheetName of workbook.SheetNames) {
          // Skip sheets that are dummy or empty placeholder
          if (sheetName.toLowerCase() === 'empty') continue

          // Match store semester by name (case-insensitive, strip space)
          const semester = parsedSemesters.find((s) => {
            return (
              s.name.toLowerCase() === sheetName.toLowerCase() ||
              sheetName.toLowerCase().replace(/\s+/g, '') === `semester${s.id}`
            )
          })
          if (!semester) continue

          const ws = workbook.Sheets[sheetName]
          const json = XLSX.utils.sheet_to_json(ws, { header: 1 })

          if (json.length === 0) continue

          // Validate header row
          const headerRow = json[0]
          const expectedHeaders = [
            'Course',
            'SKS',
            'Component',
            'Weight (%)',
            'Score',
            'Value',
            'Total',
            'Grade',
          ]

          const matchesHeader = expectedHeaders.every((h, idx) => {
            const fileHeader = String(headerRow[idx] || '').trim()
            return fileHeader.toLowerCase() === h.toLowerCase()
          })

          if (!matchesHeader) {
            throw new Error(
              `Struktur kolom pada sheet "${sheetName}" tidak sesuai template ekspor. Harus berurutan: Course, SKS, Component, Weight (%), Score, Value, Total, Grade.`,
            )
          }

          const courses = []
          let currentCourse = null

          for (let i = 1; i < json.length; i++) {
            const row = json[i]
            if (!row || row.length === 0) continue

            const cell0 = String(row[0] || '').trim()
            const cell1 = String(row[1] || '').trim()
            const cell2 = String(row[2] || '').trim()
            const cell6 = String(row[6] || '').trim()

            // Skip summary rows
            if (
              cell6 === 'Total SKS' ||
              cell6 === 'Average' ||
              cell6 === 'IPS' ||
              cell0.toLowerCase().includes('total') ||
              cell2.toLowerCase().includes('total') ||
              row.some((cell) => {
                const val = String(cell || '')
                return val.includes('Total SKS') || val.includes('Average') || val.includes('IPS')
              })
            ) {
              continue
            }

            // Check if it's a valid component row
            if (cell2) {
              // If Course Name is specified, it starts a new course
              if (cell0) {
                const sksVal = parseInt(cell1)
                if (isNaN(sksVal) || sksVal < 0) {
                  throw new Error(
                    `Mata kuliah "${cell0}" di sheet "${sheetName}" baris ${i + 1}: SKS harus berupa angka positif.`,
                  )
                }

                currentCourse = {
                  id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
                  name: cell0,
                  sks: sksVal,
                  components: [],
                }
                courses.push(currentCourse)
              }

              if (!currentCourse) {
                throw new Error(
                  `Sheet "${sheetName}" baris ${i + 1}: Komponen "${cell2}" terdeteksi sebelum mata kuliah didefinisikan.`,
                )
              }

              const weightVal = parseFloat(row[3])
              
              let scoreVal = 0
              let isScoreProvided = false
              if (row[4] !== undefined && row[4] !== null && String(row[4]).trim() !== '') {
                scoreVal = parseFloat(row[4])
                isScoreProvided = true
              }

              if (isNaN(weightVal) || weightVal < 0 || weightVal > 100) {
                throw new Error(
                  `Mata kuliah "${currentCourse.name}", komponen "${cell2}" di sheet "${sheetName}" baris ${i + 1}: Bobot (%) harus berupa angka antara 0 hingga 100.`,
                )
              }
              if (isScoreProvided && (isNaN(scoreVal) || scoreVal < 0 || scoreVal > 100)) {
                throw new Error(
                  `Mata kuliah "${currentCourse.name}", komponen "${cell2}" di sheet "${sheetName}" baris ${i + 1}: Score harus berupa angka antara 0 hingga 100.`,
                )
              }

              currentCourse.components.push({
                id: `${currentCourse.id}-comp-${currentCourse.components.length}`,
                name: cell2.toUpperCase(),
                weight: weightVal,
                score: scoreVal,
                hidden: !isScoreProvided || scoreVal === 0,
              })
            }
          }

          if (courses.length > 0) {
            semester.courses = courses
            hasImportedData = true
          }
        }

        if (!hasImportedData) {
          throw new Error('Tidak ada data semester valid yang berhasil di-import.')
        }

        // Mutate store semesters all at once since validation passed
        store.semesters = parsedSemesters
        resolve(true)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Gagal membaca file Excel.'))
    reader.readAsArrayBuffer(file)
  })
}
