require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fetch = require('node-fetch'); // You need to install this package

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// New route to handle the root URL and avoid "Cannot GET /" error
app.get('/', (req, res) => {
    res.send('Welcome to the FeedHope API! The API endpoints are available at /api/requests');
});

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

const requestSchema = new mongoose.Schema({
    reporterName: String,
    reporterPhone: String,
    location: String,
    latitude: Number,
    longitude: Number,
    description: String,
    urgency: String,
    status: { type: String, default: 'pending' },
    timestamp: { type: Date, default: Date.now },
    image: String,
    volunteers: [String]
});

const volunteerSchema = new mongoose.Schema({
    volunteerName: String,
    volunteerPhone: String,
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
    requestLocation: String,
    status: { type: String, default: 'helping' },
    timestamp: { type: Date, default: Date.now }
});

const Request = mongoose.model('Request', requestSchema);
const Volunteer = mongoose.model('Volunteer', volunteerSchema);

// API Endpoints for Requests
app.get('/api/requests', async (req, res) => {
    try {
        const requests = await Request.find().sort({ timestamp: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/requests', async (req, res) => {
    const newRequest = new Request({
        reporterName: req.body.reporterName,
        reporterPhone: req.body.reporterPhone,
        location: req.body.location,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        description: req.body.description,
        urgency: req.body.urgency,
        image: req.body.image
    });

    try {
        const savedRequest = await newRequest.save();
        res.status(201).json(savedRequest);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.patch('/api/requests/:id', async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);
        if (request == null) {
            return res.status(404).json({ message: 'Request not found' });
        }
        if (req.body.status != null) {
            request.status = req.body.status;
        }
        if (req.body.volunteers != null) {
            request.volunteers.push(req.body.volunteers);
        }
        const updatedRequest = await request.save();
        res.json(updatedRequest);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// New API Endpoints for Volunteers
app.get('/api/volunteers', async (req, res) => {
    try {
        const volunteers = await Volunteer.find().sort({ timestamp: -1 });
        res.json(volunteers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/volunteers', async (req, res) => {
    const newVolunteer = new Volunteer({
        volunteerName: req.body.volunteerName,
        volunteerPhone: req.body.volunteerPhone,
        requestId: req.body.requestId,
        requestLocation: req.body.requestLocation,
        status: 'helping'
    });

    try {
        const savedVolunteer = await newVolunteer.save();

        // Update the main request to show a volunteer has committed
        const request = await Request.findById(req.body.requestId);
        if (request) {
            request.status = 'helping';
            await request.save();
        }

        res.status(201).json(savedVolunteer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.patch('/api/volunteers/:id', async (req, res) => {
    try {
        const volunteer = await Volunteer.findById(req.params.id);
        if (volunteer == null) {
            return res.status(404).json({ message: 'Volunteer activity not found' });
        }
        if (req.body.status != null) {
            volunteer.status = req.body.status;
        }
        const updatedVolunteer = await volunteer.save();

        // If a volunteer marks a request as completed, update the main request status too
        if (req.body.status === 'completed') {
            const request = await Request.findById(volunteer.requestId);
            if (request) {
                request.status = 'completed';
                await request.save();
            }
        }
        res.json(updatedVolunteer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// New API endpoint for reverse geocoding
app.post('/api/geocode', async (req, res) => {
    const { lat, lon } = req.body;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

    if (!GOOGLE_MAPS_API_KEY) {
        return res.status(500).json({ message: 'Google Maps API key not configured on the server.' });
    }

    try {
        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_MAPS_API_KEY}`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch geocoding data.', error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
