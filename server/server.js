require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

const requestSchema = new mongoose.Schema({
    reporterName: String,
    reporterPhone: String,
    location: String,
    description: String,
    urgency: String,
    status: { type: String, default: 'pending' },
    timestamp: { type: Date, default: Date.now },
    image: String,
    volunteers: [String]
});

const Request = mongoose.model('Request', requestSchema);

// API Endpoints
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

// New endpoint for updating a request
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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
