const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const WEATHER_API_KEY = 'vO5nAe4x0yOoiH1nW5bZgNxbP1p30B9V'
const GEOCODING_API_KEY = 'AIzaSyB61St_Fi80ickyVz4vXFH9XO5CrFY199w'
const PLACES_API_KEY = 'AIzaSyAgeCw2-moZ0fbG0cDVSJLCfiHmIfIi-eQ'
const URL = "mongodb+srv://zhun:M96UIA5bQTy0fYmk@sample.u32oi.mongodb.net/?retryWrites=true&w=majority&appName=Sample";

mongoose.connect(URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('Failed to connect to MongoDB Atlas', err));

const favoriteSchema = new mongoose.Schema({
  city: String,
  state: String,
  data: Object,
  dateAdded: { type: Date, default: Date.now }
});

const Favorite = mongoose.model('favorites', favoriteSchema);

app.use(cors({
  origin: '*',
  optionsSuccessStatus: 200
}));

app.use(express.json());

app.get('/api/autocomplete', async (req, res) => {
  const { input } = req.query;
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
      params: {
        input,
        types: '(cities)',
        key: PLACES_API_KEY
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching autocomplete data:', error.message);
    res.status(500).json({ error: 'Failed to fetch data from Google Places API' });
  }
});

app.get('/api/weather/auto', async (req, res) => {
  const { latitude, longitude } = req.query;
  try {
    const weatherResponse = await axios.get(`https://api.tomorrow.io/v4/timelines`, {
      params: {
        location: `${latitude},${longitude}`,
        fields: [
          'weatherCode', 'temperatureMax', 'temperatureMin', 'windSpeed',
          'temperature', 'humidity', 'pressureSeaLevel', 'windSpeed',
          'windDirection', 'sunriseTime', 'sunsetTime', 'visibility', 'cloudCover'
        ],
        timesteps: ['current', '1h', '1d'],
        units: 'imperial',
        timezone: 'auto',
        apikey: WEATHER_API_KEY
      }
    });

    const responseData = {
      location: { latitude, longitude },
      data: weatherResponse.data
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching weather data:', error.message);
    res.status(500).json({ error: 'Unable to get weather' });
  }
});

app.post('/api/weather/auto', async (req, res) => {
  const { latitude, longitude } = req.body;
  try {
    const weatherResponse = await axios.get(`https://api.tomorrow.io/v4/timelines`, {
      params: {
        location: `${latitude},${longitude}`,
        fields: ['weatherCode', 'temperatureMax', 'temperatureMin', 'windSpeed', 'temperature', 'humidity', 'pressureSeaLevel', 'windSpeed', 'windDirection', 'sunriseTime', 'sunsetTime', 'visibility', 'cloudCover'],        
        timesteps: ['current', '1h', '1d'],
        units: 'imperial',
        timezone: 'auto',
        apikey: WEATHER_API_KEY
      }
    });

    const responseData = {
      ...weatherResponse.data,
      location: { latitude, longitude }
    };
    res.json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to get weather' });
  }
});

app.post('/api/weather', async (req, res) => {
  const { street, city, state } = req.body;
  try {
    const geocodeResponse = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: `${street}, ${city}, ${state}`,
        key: GEOCODING_API_KEY
      }
    });

    if(geocodeResponse.data.status !== 'OK') {
      return res.status(400).json({ error: 'Unable to get geo-location' });
    }

    const { lat: latitude, lng: longitude } = geocodeResponse.data.results[0].geometry.location;
    const weatherResponse = await axios.get(`https://api.tomorrow.io/v4/timelines`, {
      params: {
        location: `${latitude},${longitude}`,
        fields: ['weatherCode', 'temperatureMax', 'temperatureMin', 'windSpeed', 'temperature', 'humidity', 'pressureSeaLevel', 'windSpeed', 'windDirection', 'sunriseTime', 'sunsetTime', 'visibility', 'cloudCover'],
        timesteps: ['current', '1h', '1d'],
        units: 'imperial',
        timezone: 'auto',
        apikey: WEATHER_API_KEY
      }
    });

    const responseData = {
      ...weatherResponse.data,
      location: { latitude, longitude }
    };
    res.json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to get weather data' });
  }
});

app.get('/api/favorites', async (req, res) => {
  try {
    const favorites = await Favorite.find();
    res.json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error.message);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

app.post('/api/favorites', async (req, res) => {
  try {
    const favorite = new Favorite(req.body);
    await favorite.save();
    res.status(201).json(favorite);
  } catch (error) {
    console.error('Error adding favorite:', error.message);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

app.delete('/api/favorites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Favorite.findByIdAndDelete(id);
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting favorite:', error.message);
    res.status(500).json({ error: 'Failed to delete favorite' });
  }
});


const staticPath = path.join(__dirname, '../angular/dist/frontend/browser');
app.use(express.static(staticPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
