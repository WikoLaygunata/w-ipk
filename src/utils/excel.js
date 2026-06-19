import * as XLSX from 'xlsx'

export const exportToExcel = (store) => {
  const wb = XLSX.utils.book_new()
  
  store.semesters.forEach(semester => {
    // Only export semesters with data
    if (semester.courses.length === 0) return
    
    const rows = []
    
    // Header
    rows.push(['Course', 'SKS', 'Component', 'Weight (%)', 'Score', 'Value', 'Total', 'Grade'])
    
    semester.courses.forEach(course => {
      course.components.forEach((comp, idx) => {
        if (idx === 0) {
          rows.push([
            course.name,
            course.sks,
            comp.name,
            comp.weight,
            comp.score,
            comp.value?.toFixed(2) || '0.00',
            course.totalScore?.toFixed(2) || '0.00',
            course.grade || '-'
          ])
        } else {
          rows.push([
            '', // course name
            '', // sks
            comp.name,
            comp.weight,
            comp.score,
            comp.value?.toFixed(2) || '0.00',
            '', // total
            ''  // grade
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
export const importFromExcel = async (file, store) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        workbook.SheetNames.forEach((sheetName, index) => {
          if (index >= 8) return; // Max 8 semesters
          const semesterId = index + 1;
          const semester = store.semesters.find(s => s.id === semesterId);
          if (!semester) return;
          
          semester.name = sheetName;
          semester.courses = [];
          
          const ws = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
          
          let currentCourse = null;
          
          // Skip header row
          for (let i = 1; i < json.length; i++) {
            const row = json[i];
            if (!row || row.length === 0 || !row[2] || typeof row[2] !== 'string') {
              continue; // Summary rows or empty rows
            }
            
            if (row[0]) {
              // New Course
              currentCourse = {
                id: Date.now().toString() + i,
                name: row[0],
                sks: parseInt(row[1]) || 0,
                components: []
              };
              semester.courses.push(currentCourse);
            }
            
            if (currentCourse) {
              currentCourse.components.push({
                id: Date.now().toString() + i + '-comp',
                name: row[2] || 'COMP',
                weight: parseFloat(row[3]) || 0,
                score: parseFloat(row[4]) || 0
              });
            }
          }
        });
        resolve(true);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
