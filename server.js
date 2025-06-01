const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Increased limit for large datasets
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' folder

// Ensure the data directory exists
const dataDir = path.join(__dirname, 'data');
const scheduleFilePath = path.join(dataDir, 'schedule.json');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize empty schedule file if it doesn't exist
if (!fs.existsSync(scheduleFilePath)) {
    const defaultData = {
        scheduleTitle: "Training Plan Goals",
        spreadsheetData: Array(10).fill(null).map(() => Array(7).fill(null))
    };
    fs.writeFileSync(scheduleFilePath, JSON.stringify(defaultData, null, 2));
}

// API Routes

// GET - Retrieve schedule data
app.get('/api/schedule', (req, res) => {
    try {
        if (!fs.existsSync(scheduleFilePath)) {
            return res.status(404).json({ message: 'Schedule data not found' });
        }
        
        const data = fs.readFileSync(scheduleFilePath, 'utf8');
        return res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading schedule data:', error);
        return res.status(500).json({ message: 'Error retrieving schedule data', error: error.message });
    }
});

// POST - Save schedule data
app.post('/api/schedule', (req, res) => {
    try {
        // Validate request body
        const { scheduleTitle, spreadsheetData } = req.body;
        if (!scheduleTitle || !spreadsheetData) {
            return res.status(400).json({ message: 'Missing required schedule data' });
        }

        // Write to file
        fs.writeFileSync(
            scheduleFilePath, 
            JSON.stringify({ scheduleTitle, spreadsheetData }, null, 2)
        );
        
        return res.json({ message: 'Schedule saved successfully' });
    } catch (error) {
        console.error('Error saving schedule data:', error);
        return res.status(500).json({ message: 'Error saving schedule data', error: error.message });
    }
});

// DELETE - Delete schedule data
app.delete('/api/schedule', (req, res) => {
    try {
        if (fs.existsSync(scheduleFilePath)) {
            // Create empty default schedule
            const defaultData = {
                scheduleTitle: "Training Plan Goals",
                spreadsheetData: Array(10).fill(null).map(() => Array(7).fill(null))
            };
            
            // Write default data to file
            fs.writeFileSync(scheduleFilePath, JSON.stringify(defaultData, null, 2));
        }
        
        return res.json({ message: 'Schedule reset successfully' });
    } catch (error) {
        console.error('Error deleting schedule data:', error);
        return res.status(500).json({ message: 'Error resetting schedule', error: error.message });
    }
});

// Serve static files for specific routes
app.get('/schedule.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'schedule.html'));
});

app.get('/schedule', (req, res) => {
    res.redirect('/schedule.html');
});

// Serve the main page for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});