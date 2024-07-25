const path = require('path')
const dotenv = require('dotenv');
dotenv.config({path:path.join(__dirname,"config/config.env")});
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const userRoute = require("./routes/userRoute");
const contactRoute = require("./routes/contactRoute");
const geoRoute = require("./routes/geofenceLogRoute");
const vehicleActivityLogRoute = require('./routes/vehicleActivityLogRoute');
const errorHandler = require("./middleWare/errorMiddleware");
const cookieParser = require('cookie-parser');
const axios = require('axios');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use((req, res, next) => {
  console.log(`Request URL: ${req.url}`);
  console.log(`Request Method: ${req.method}`);
  next();
});

// Middlewares (Middleware is a fn. that we can execute b/w req(request) and res(response) cycle)
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended: false}));
app.use(bodyParser.json());

const corsOptions = {
  // origin: ['https://ar-experts-demo.vercel.app', 'https://ar-experts-demo-jfmv.vercel.app'],
  origin: ['http://18.169.50.246:5700'], 
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

// Set a timeout for requests (e.g., 30 seconds)
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(504).json({ error: 'Request timeout' });
  });
  next();
});

// Proxy endpoint for Google Maps API requests
app.use('/api/maps', createProxyMiddleware({ 
  target: 'https://maps.googleapis.com/maps/api', 
  changeOrigin: true,
  pathRewrite: {'^/api/maps' : ''},
  onProxyRes: function (proxyRes, req, res) {
    // Add CORS headers
    proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin;
    proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
  }
}));

// Proxy endpoint for Flespi API requests
app.use('/api/flespi', createProxyMiddleware({ 
  target: 'https://flespi.io',
  changeOrigin: true,
  pathRewrite: {'^/api/flespi' : ''},
  onProxyRes: function (proxyRes, req, res) {
    // Add CORS headers
    proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin;
    proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
  }
}));

// Proxy endpoint for Flespi telemetry data
app.use('/api/flespi/telemetry', createProxyMiddleware({
  target: 'https://flespi.io',
  changeOrigin: true,
  onProxyRes: function (proxyRes, req, res) {
    // Add CORS headers
    proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin;
    proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
  }
}));

// Proxy endpoint for Flespi API requests
app.get('/api/flespi', async (req, res) => {
  const token = process.env.REACT_APP_FLESPI_TOKEN;
  const deviceId = req.query.deviceId;

  try {
    const response = await axios.get('https://flespi.io/gw/channels/1211469/messages', {
      headers: {
        'Authorization': `FlespiToken ${token}`,
        'Content-Type': 'application/json',
      },
      params: {
        'data.ident': deviceId
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error in /api/flespi endpoint:', error.message);
    if (error.response) {
      if (error.response.status === 401) {
        console.error('Unauthorized - please check Flespi token or permissions.');
      }
      res.status(error.response.status).json({ error: error.response.data });
    } else if (error.request) {
      res.status(500).json({ error: 'No response received from Flespi API' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});


// Proxy endpoint for Flespi telemetry data
app.get('/api/flespi/telemetry', async (req, res) => {
  const token = process.env.REACT_APP_FLESPI_TOKEN;

  try {
    const response = await axios.get('https://flespi.io/gw/channels/1211469/messages', {
      headers: {
        'Authorization': `FlespiToken ${token}`,
        'Content-Type': 'application/json',
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error in /api/flespi/telemetry endpoint:', error.message);
    if (error.response) {
      res.status(error.response.status).json({ error: error.response.data });
    } else if (error.request) {
      res.status(500).json({ error: 'No response received from Flespi API' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Proxy endpoint for sending commands to Flespi
app.put('/api/flespi/device/:deviceId/settings/:command', async (req, res) => {
  const { deviceId, command } = req.params;
  const token = process.env.REACT_APP_FLESPI_TOKEN;

  try {
    const response = await axios.put(`https://flespi.io/gw/devices/${deviceId}/settings/${command}`, req.body, {
      headers: {
        'Authorization': `FlespiToken ${token}`,
        'Content-Type': 'application/json',
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error in /api/flespi/device/:deviceId/settings/:command endpoint:', error.message);
    if (error.response) {
      res.status(error.response.status).json({ error: error.response.data });
    } else if (error.request) {
      res.status(500).json({ error: 'No response received from Flespi API' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});



app.get('/geocode', async (req, res) => {
  const { latitude, longitude } = req.query;
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`;

  try {
      const response = await axios.get(geocodeUrl);
      // Check the API response status
      if (response.data.status === 'OK') {
          res.json(response.data);
      } else {
          // Log and respond with the error status from Google Maps API
          console.error('Google Maps API error:', response.data.error_message);
          res.status(422).json({error: response.data.status, message: response.data.error_message});
      }
  } catch (error) {
      console.error('Server error:', error);
      res.status(500).send('Internal Server Error');
  }
});

// *****************************GEOFENCING*****************************************************

// Geofence schema and model
const GeofenceSchema = new mongoose.Schema({
  name: String,
  latitude: Number,
  longitude: Number,
  radius: Number, // in meters
});

const Geofence = mongoose.model('Geofence', GeofenceSchema);

// CRUD operations
app.post('/geofences', async (req, res) => {
  const geofence = new Geofence(req.body);
  await geofence.save();
  res.send(geofence);
});

app.get('/geofences', async (req, res) => {
  const geofences = await Geofence.find();
  res.send(geofences);
});

app.put('/geofences/:id', async (req, res) => {
  const geofence = await Geofence.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.send(geofence);
});

app.delete('/geofences/:id', async (req, res) => {
  await Geofence.findByIdAndDelete(req.params.id);
  res.send({ message: 'Geofence deleted' });
});


// Routes Middlewares
app.use("/api/users", userRoute);
app.use("/api/contactus", contactRoute);
app.use("/geofence-log", geoRoute);
app.use("/vehicle-activity-log", vehicleActivityLogRoute);


// Error Middleware
app.use(errorHandler);

if(process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  app.get('*', (req, res) =>{
      res.sendFile(path.resolve(__dirname, '../frontend/build/index.html'))
  })
}

// Connect to DB and start server
const PORT = process.env.PORT || 5700;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI environment variable is not defined');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server Running on port ${PORT}`);
    })
  })
  .catch((err) => console.log(err))

module.exports = app;