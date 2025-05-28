document.addEventListener('DOMContentLoaded', function() {
    // Get container element
    const container = document.getElementById('spreadsheet-container');
    
    // Initialize data with training schedule sample
    let data = [
        ['Date', '7/7/2025', 'Sunday', '', '', ''],
        ['Trainer', 'Hours', 'Participant', 'Level/Goal', '', ''],
        ['', '', '', '', '', ''],
        ['', '', '', '', '', ''],
        ['Date', '7/8/2025', 'Monday', '', '', ''],
        ['Trainer', 'Hours', 'Participant', 'Level/Goal', '', ''],
        ['Terry', '11:00 am to 7:30 pm', 'Teklu', 'RTW class (5)/ BTW (19)', '', ''],
        ['Veronica', '5:00 am to 1:00 pm', 'Joshua', 'BTW-7 hr Basic-1 hr prep', '', ''],
        ['Galen', '5:00 am to 1:00 pm', 'Annette', 'BTW- 8hr Advanced', '', ''],
        ['Shay', '5:00 am to 1:00 pm', 'Juan', 'BTW-finish Advanced-final eval/revenue class', '', ''],
        ['Patsy', '5:00 am to 1:00 pm', 'David', 'BTW-finish Advanced-final eval/revenue class', '', ''],
        ['Date', '7/9/2025', 'Tuesday', '', '', ''],
        ['Trainer', 'Hours', 'Participant', 'Level/Goal', '', ''],
        ['Terry', '1:00 pm to', 'Teklu', 'RTW class (5)/ BTW (19)', '', ''],
        ['', '', '', '', '', '']
    ];
      // Create Handsontable instance
    const hot = new Handsontable(container, {
        data: data,
        rowHeaders: true,
        height: 'auto',
        licenseKey: 'non-commercial-and-evaluation', // For non-commercial use
        contextMenu: true,
        manualColumnResize: true,
        manualRowResize: true,
        colHeaders: ['Trainer', 'Hours', 'Participant', 'Level/Goal', 'Notes', 'Status'],
        minSpareRows: 1,
        minSpareCols: 0,
        stretchH: 'all',
        dropdownMenu: true,
        filters: true,
        // Add cell types to format the date headers differently
        cells: function(row, col) {
            const cellProperties = {};
            
            if ((row === 0 || row === 4 || row === 11) && col === 0) {
                cellProperties.renderer = function(instance, td, row, col, prop, value, cellProperties) {
                    Handsontable.renderers.TextRenderer.apply(this, arguments);
                    td.style.fontWeight = 'bold';
                    td.style.backgroundColor = '#f0f0f0';
                };
            }
            
            if ((row === 1 || row === 5 || row === 12)) {
                cellProperties.renderer = function(instance, td, row, col, prop, value, cellProperties) {
                    Handsontable.renderers.TextRenderer.apply(this, arguments);
                    td.style.fontWeight = 'bold';
                };
            }
            
            return cellProperties;
        }
    });
    
    // Save button functionality
    document.getElementById('save-btn').addEventListener('click', function() {
        // Get current data from the spreadsheet
        const spreadsheetData = hot.getData();
        // Convert to JSON and save in localStorage
        localStorage.setItem('spreadsheetData', JSON.stringify(spreadsheetData));
        alert('Data saved successfully!');
    });
    
    // Load button functionality
    document.getElementById('load-btn').addEventListener('click', function() {
        // Get saved data from localStorage
        const savedData = localStorage.getItem('spreadsheetData');
        
        if (savedData) {
            // Parse the JSON data and load it into the spreadsheet
            hot.loadData(JSON.parse(savedData));
            alert('Data loaded successfully!');
        } else {
            alert('No saved data found!');
        }
    });    // Clear button functionality
    document.getElementById('clear-btn').addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all data?')) {
            // Reset to template data structure with headers but no content
            hot.loadData([
                ['Date', '', '', '', '', ''],
                ['Trainer', 'Hours', 'Participant', 'Level/Goal', '', ''],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', '']
            ]);
            alert('Data cleared!');
        }
    });
      // Export to CSV functionality
    document.getElementById('export-btn').addEventListener('click', function() {
        const scheduleTitle = document.getElementById('schedule-title').value || 'Training Schedule';
        const data = hot.getData();
        const headers = hot.getColHeader();
        
        // Create CSV content
        let csvContent = headers.join(',') + '\n';
        
        // Add data rows
        data.forEach(function(row) {
            let rowString = row.map(function(cell) {
                // Handle null or undefined
                if (cell === null || cell === undefined) {
                    return '';
                }
                // Escape quotes and wrap in quotes if the cell contains a comma
                cell = String(cell);
                if (cell.includes(',') || cell.includes('"')) {
                    return '"' + cell.replace(/"/g, '""') + '"';
                }
                return cell;
            }).join(',');
            csvContent += rowString + '\n';
        });
        
        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', scheduleTitle.replace(/\s+/g, '_') + '.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    
    // Update title in localStorage when changed
    document.getElementById('schedule-title').addEventListener('change', function() {
        localStorage.setItem('scheduleTitle', this.value);
    });
    
    // Load title from localStorage if available
    const savedTitle = localStorage.getItem('scheduleTitle');
    if (savedTitle) {
        document.getElementById('schedule-title').value = savedTitle;
    }
    
    // Excel Import functionality
    document.getElementById('excel-upload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        const statusElement = document.getElementById('import-status');
        
        if (!file) {
            return;
        }
        
        // Check file type
        const fileTypes = ['.xlsx', '.xls'];
        const extension = file.name.substr(file.name.lastIndexOf('.')).toLowerCase();
        if (!fileTypes.includes(extension)) {
            statusElement.textContent = 'Please select an Excel file (.xlsx or .xls)';
            statusElement.className = 'status-message error';
            return;
        }
        
        // Show loading message
        statusElement.textContent = 'Reading Excel file...';
        statusElement.className = 'status-message';
        statusElement.style.display = 'block';
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Get the first worksheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Convert to array of arrays
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                // Check if data is empty
                if (!jsonData || jsonData.length === 0) {
                    throw new Error('No data found in the Excel file');
                }
                
                // Update the title with the sheet name
                document.getElementById('schedule-title').value = firstSheetName;
                localStorage.setItem('scheduleTitle', firstSheetName);
                
                // Fill empty cells with empty strings instead of undefined
                const processedData = jsonData.map(row => {
                    if (!row) return Array(6).fill('');
                    
                    // Ensure each row has at least 6 cells (can be empty strings)
                    while (row.length < 6) {
                        row.push('');
                    }
                    
                    // Convert all cells to strings
                    return row.map(cell => cell !== undefined && cell !== null ? String(cell) : '');
                });
                
                // Load data into Handsontable
                hot.loadData(processedData);
                
                // Success message
                statusElement.textContent = 'Excel file imported successfully!';
                statusElement.className = 'status-message success';
                
                // Clear the file input value so the same file can be uploaded again if needed
                e.target.value = '';
                
                // Hide the status message after 3 seconds
                setTimeout(function() {
                    statusElement.style.display = 'none';
                }, 3000);
                
            } catch (error) {
                console.error('Error importing Excel file:', error);
                statusElement.textContent = 'Error importing Excel file: ' + error.message;
                statusElement.className = 'status-message error';
                e.target.value = '';
            }
        };
        
        reader.onerror = function() {
            statusElement.textContent = 'Failed to read the file';
            statusElement.className = 'status-message error';
            e.target.value = '';
        };
        
        // Read the file as an array buffer
        reader.readAsArrayBuffer(file);
    });
    
    // Auto-resize the container and update Handsontable when window is resized
    window.addEventListener('resize', function() {
        hot.updateSettings({
            width: container.offsetWidth
        });
    });
});
