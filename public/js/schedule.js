// Global variables
let hot;  // Handsontable instance
let isAdmin = false;
let spreadsheetData = [];
let scheduleTitle = 'Training Plan Goals';
const debounceTime = 2000; // 2 seconds for auto-save

// Initialize app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded. Initializing app...");
    initializeApp();
});

// Main initialization function
async function initializeApp() {
    console.log("Initializing app...");
    
    // Check admin status (for UI control)
    checkAdminStatus();
    
    // Try to load data from server
    await loadDataFromServer();
    
    // Initialize Handsontable
    initializeHandsontable();
    
    // Set up event listeners for buttons and inputs
    setupEventListeners();
    
    // Update UI based on admin status
    updateAdminUI();
    
    console.log("App initialized successfully.");
}

// Check if user is admin
function checkAdminStatus() {
    // Check if user is logged in from sessionStorage (used by your login page)
    const userRole = sessionStorage.getItem('userRole');
    const username = sessionStorage.getItem('username');
    
    if (userRole === 'admin') {
        isAdmin = true;
        console.log("Admin mode active for user:", username);
    } else {
        isAdmin = false;
        console.log("Guest mode active");
    }
    
    // Update user display
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        userDisplay.textContent = isAdmin ? 
            `User: Admin (${username || 'Unknown'})` : 
            'User: Guest';
    }
    
    // Show/hide logout button based on login status
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.style.display = username ? 'block' : 'none';
    }
}

// Initialize Handsontable
function initializeHandsontable() {
    console.log("Initializing Handsontable...");
    const container = document.getElementById('spreadsheet-container');
    
    if (!container) {
        console.error("Spreadsheet container not found!");
        return;
    }
    
    // Make sure we have valid data
    if (!Array.isArray(spreadsheetData) || spreadsheetData.length === 0) {
        spreadsheetData = Array(10).fill().map(() => Array(7).fill(null));
    }
    
    const hotSettings = {
        data: spreadsheetData,
        rowHeaders: true,
        colHeaders: ['Trainer', 'Hours', 'Participant', 'Level/Goal', 'Notes', 'Status'],
        columns: [
            { type: 'text' },  // Trainer
            { type: 'numeric' },  // Hours
            { type: 'text' },  // Participant
            { type: 'text' },  // Level/Goal
            { type: 'text' },  // Notes
            { 
                type: 'dropdown', 
                source: ['Pending', 'In Progress', 'Completed', 'Cancelled'] 
            }  // Status
        ],
        minSpareRows: isAdmin ? 1 : 0,
        width: '100%',
        height: 'auto',
        stretchH: 'all',
        manualRowResize: true,
        manualColumnResize: true,
        licenseKey: 'non-commercial-and-evaluation',
        readOnly: !isAdmin,
        contextMenu: isAdmin,
        
        afterChange: function(changes, source) {
            if (source === 'loadData') return;
            if (isAdmin && changes) {
                console.log("Data changed, triggering save...");
                saveDataToServerDebounced();
            }
        },
        
        afterCreateRow: function(index, amount, source) {
            if (source === 'loadData') return;
            if (isAdmin) {
                console.log("Row created, triggering save...");
                saveDataToServerDebounced();
            }
        }
    };
    
    hot = new Handsontable(container, hotSettings);
    console.log("Handsontable initialized.");
}

// Setup event listeners for buttons and inputs
function setupEventListeners() {
    console.log("Setting up event listeners...");
    
    // Schedule title input event
    const titleInput = document.getElementById('schedule-title');
    if (titleInput) {
        titleInput.addEventListener('input', function() {
            if (isAdmin) {
                scheduleTitle = this.value;
                saveDataToServerDebounced();
            }
        });
        titleInput.readOnly = !isAdmin;
    }
    
    // Admin buttons
    if (isAdmin) {
        // Save button
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', function() {
                saveDataToServer();
                showNotification("Data saved successfully!");
            });
        }
        
        // Load button
        const loadBtn = document.getElementById('load-btn');
        if (loadBtn) {
            loadBtn.addEventListener('click', async function() {
                await loadDataFromServer();
                showNotification("Data reloaded from server.");
            });
        }
        
        // Export button (admin)
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', exportToCsv);
        }
        
        // Clear button
        const clearBtn = document.getElementById('clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                if (confirm('Clear all data? This cannot be undone.')) {
                    clearSpreadsheetData();
                }
            });
        }
        
        // Delete button
        const deleteBtn = document.getElementById('delete-schedule-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                if (confirm('Delete this schedule? This cannot be undone.')) {
                    deleteSchedule();
                }
            });
        }
        
        // Excel import
        const excelUpload = document.getElementById('excel-upload');
        if (excelUpload) {
            excelUpload.addEventListener('change', handleExcelImport);
        }
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            sessionStorage.removeItem('userRole');
            sessionStorage.removeItem('username');
            isAdmin = false;
            updateAdminUI();
            showNotification("Logged out successfully.");
            
            // Redirect to login page
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        });
    }
    
    // Guest export button
    const exportBtnGuest = document.getElementById('export-btn-guest');
    if (exportBtnGuest) {
        exportBtnGuest.addEventListener('click', exportToCsv);
    }
}

// Update UI based on admin status
function updateAdminUI() {
    console.log("Updating UI for " + (isAdmin ? "admin" : "guest") + " mode...");
    
    // Update admin controls visibility
    const adminControls = document.getElementById('admin-controls');
    if (adminControls) {
        adminControls.classList.toggle('hidden', !isAdmin);
    }
    
    // Update guest controls visibility
    const guestControls = document.getElementById('guest-controls');
    if (guestControls) {
        guestControls.classList.toggle('hidden', isAdmin);
    }
    
    // Update title input
    const titleInput = document.getElementById('schedule-title');
    if (titleInput) {
        titleInput.readOnly = !isAdmin;
    }
    
    // Update user display
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        const username = sessionStorage.getItem('username');
        userDisplay.textContent = isAdmin ? 
            `User: Admin (${username || 'Unknown'})` : 
            'User: Guest';
    }
    
    // Update Handsontable settings
    if (hot) {
        hot.updateSettings({
            readOnly: !isAdmin,
            contextMenu: isAdmin,
            minSpareRows: isAdmin ? 1 : 0
        });
    }
    
    // Show/hide logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.style.display = sessionStorage.getItem('username') ? 'block' : 'none';
    }
}

// Load data from server
async function loadDataFromServer() {
    console.log("Loading data from server...");
    showLoading(true);
    
    try {
        const response = await fetch('/api/schedule');
        
        if (!response.ok) {
            throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Update global variables
        scheduleTitle = data.scheduleTitle || 'Training Plan Goals';
        spreadsheetData = data.spreadsheetData || Array(10).fill().map(() => Array(7).fill(null));
        
        // Update UI
        const titleInput = document.getElementById('schedule-title');
        if (titleInput) {
            titleInput.value = scheduleTitle;
        }
        
        if (hot) {
            hot.loadData(spreadsheetData);
        }
        
        console.log("Data loaded successfully from server.");
    } catch (error) {
        console.error("Error loading data from server:", error);
        showNotification("Error loading data from server.", "error");
        
        // Use defaults
        scheduleTitle = 'Training Plan Goals';
        spreadsheetData = Array(10).fill().map(() => Array(7).fill(null));
        
        // Update UI with defaults
        const titleInput = document.getElementById('schedule-title');
        if (titleInput) {
            titleInput.value = scheduleTitle;
        }
        
        if (hot) {
            hot.loadData(spreadsheetData);
        }
    } finally {
        showLoading(false);
    }
}

// Save data to server
async function saveDataToServer() {
    if (!isAdmin) {
        console.log("Not admin, skipping save.");
        return;
    }
    
    console.log("Saving data to server...");
    showSavingIndicator(true);
    
    try {
        // Get current data
        const currentTitle = document.getElementById('schedule-title').value;
        const currentData = hot ? hot.getData() : spreadsheetData;
        
        const payload = {
            scheduleTitle: currentTitle,
            spreadsheetData: currentData
        };
        
        const response = await fetch('/api/schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to save data: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log("Save successful:", result.message);
    } catch (error) {
        console.error("Error saving data to server:", error);
        showNotification("Error saving data to server", "error");
    } finally {
        showSavingIndicator(false);
    }
}

// Debounced version of saveDataToServer
const saveDataToServerDebounced = Handsontable.helper.debounce(saveDataToServer, debounceTime);

// Clear spreadsheet data
async function clearSpreadsheetData() {
    if (!isAdmin) return;
    
    try {
        // Reset local data
        spreadsheetData = Array(10).fill().map(() => Array(7).fill(null));
        
        // Update UI
        if (hot) {
            hot.loadData(spreadsheetData);
        }
        
        // Save to server
        await saveDataToServer();
        showNotification("Spreadsheet data cleared and saved.");
    } catch (error) {
        console.error("Error clearing data:", error);
        showNotification("Error clearing data", "error");
    }
}

// Delete entire schedule
async function deleteSchedule() {
    if (!isAdmin) return;
    
    showLoading(true);
    
    try {
        const response = await fetch('/api/schedule', {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to delete schedule: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log("Schedule reset successful:", result.message);
        
        // Reload data from server (which will now have defaults)
        await loadDataFromServer();
        showNotification("Schedule has been reset to defaults.");
    } catch (error) {
        console.error("Error deleting schedule:", error);
        showNotification("Error resetting schedule", "error");
    } finally {
        showLoading(false);
    }
}

// Handle Excel import
function handleExcelImport(event) {
    if (!isAdmin) return;
    
    console.log("Starting Excel import...");
    const file = event.target.files[0];
    
    if (!file) {
        console.log("No file selected.");
        return;
    }
    
    showNotification("Importing Excel file...");
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            
            // Get first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to array of arrays
            const excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Load data into Handsontable
            hot.loadData(excelData);
            
            // Save to server
            saveDataToServer();
            
            showNotification("Excel data imported successfully!");
            
            console.log("Excel import successful.");
        } catch (error) {
            console.error("Error importing Excel file:", error);
            showNotification("Import failed: " + error.message, "error");
        }
        
        // Reset file input
        event.target.value = '';
    };
    
    reader.onerror = function() {
        console.error("File reading failed");
        showNotification("Import failed: Could not read file", "error");
        event.target.value = '';
    };
    
    reader.readAsBinaryString(file);
}

// Export to CSV
function exportToCsv() {
    console.log("Exporting to CSV...");
    if (!hot) {
        showNotification("Nothing to export.", "error");
        return;
    }
    
    try {
        const data = hot.getData();
        const headers = hot.getColHeader();
        
        let csvContent = headers.join(',') + '\n';
        
        // Add data rows
        data.forEach(function(rowArray) {
            let row = rowArray.map(function(cell) {
                cell = cell === null ? '' : String(cell);
                // Escape commas and quotes
                if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                    return '"' + cell.replace(/"/g, '""') + '"';
                }
                return cell;
            }).join(',');
            csvContent += row + '\n';
        });
        
        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const filename = (scheduleTitle || 'training_schedule').replace(/\s+/g, '_') + '.csv';
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification("CSV exported successfully.");
    } catch (error) {
        console.error("Export failed:", error);
        showNotification("Export failed: " + error.message, "error");
    }
}

// Show auto-save indicator
function showSavingIndicator(isVisible) {
    const indicator = document.getElementById('auto-save-indicator');
    if (!indicator) return;
    
    if (isVisible) {
        indicator.textContent = "Saving...";
        indicator.classList.add('active');
    } else {
        indicator.textContent = "Changes saved automatically";
        indicator.classList.remove('active');
    }
}

// Show notification
function showNotification(message, type = 'success') {
    console.log(`Notification (${type}): ${message}`);
    
    // Use import-status for notifications
    const element = document.getElementById('import-status');
    if (!element) return;
    
    element.textContent = message;
    element.className = 'status-message ' + type;
    element.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
        element.textContent = '';
        element.style.display = 'none';
    }, 3000);
}

// Show loading overlay
function showLoading(isVisible) {
    // Remove any existing loading indicator first
    const existingIndicator = document.querySelector('.loading-indicator');
    if (existingIndicator) {
        document.body.removeChild(existingIndicator);
    }
    
    if (isVisible) {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.textContent = 'Loading...';
        document.body.appendChild(loadingIndicator);
    }
}
