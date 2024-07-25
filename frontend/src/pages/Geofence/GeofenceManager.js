import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { GoogleMap, useJsApiLoader, Circle, DrawingManager } from '@react-google-maps/api';
import './GeofenceManager.scss';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const libraries = ['drawing'];

const GeofenceManager = () => {
  const [geofences, setGeofences] = useState([]);
  const [form, setForm] = useState({ name: '', latitude: '', longitude: '', radius: '' });
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });
  const [vehiclePosition, setVehiclePosition] = useState(null);
  const [currentGeofence, setCurrentGeofence] = useState(null);
  const [enterTimestamp, setEnterTimestamp] = useState(null);
  const lastEventType = useRef(null);
  const insideGeofence = useRef(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  useEffect(() => {
    fetchGeofences();
    getCurrentLocation();
  }, []);

  const fetchGeofences = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/geofences`);
      setGeofences(response.data);
    } catch (error) {
      console.error('Error fetching geofences:', error);
    }
  };

  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition((position) => {
      setMapCenter({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      setVehiclePosition({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${BACKEND_URL}/geofences`, form);
      fetchGeofences();
    } catch (error) {
      console.error('Error creating geofence:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${BACKEND_URL}/geofences/${id}`);
      fetchGeofences();
    } catch (error) {
      console.error('Error deleting geofence:', error);
    }
  };

  const handleCircleComplete = useCallback((circle) => {
    const newGeofence = {
      name: form.name,
      latitude: circle.getCenter().lat(),
      longitude: circle.getCenter().lng(),
      radius: circle.getRadius(),
    };
    setForm(newGeofence);
    circle.setMap(null);
  }, [form]);

  const checkGeofence = useCallback(() => {
    if (!vehiclePosition || !window.google) return;

    geofences.forEach((geofence) => {
      const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
        new window.google.maps.LatLng(vehiclePosition.lat, vehiclePosition.lng),
        new window.google.maps.LatLng(geofence.latitude, geofence.longitude)
      );
      const isInside = distance <= geofence.radius;

      if (isInside && !insideGeofence.current) {
        insideGeofence.current = true;
        setCurrentGeofence(geofence);
        setEnterTimestamp(new Date());
        lastEventType.current = 'enter';
        // Log entry event
        axios.post(`${BACKEND_URL}/geofence-log`, {
          vehicleId: '12345', // Replace with actual vehicle ID
          geofenceId: geofence._id,
          eventType: 'enter',
          timestamp: new Date(),
        }).catch(error => console.error('Error logging entry event:', error));
      } else if (!isInside && insideGeofence.current && currentGeofence && currentGeofence._id === geofence._id) {
        insideGeofence.current = false;
        const exitTimestamp = new Date();
        const duration = exitTimestamp - enterTimestamp;
        setCurrentGeofence(null);
        setEnterTimestamp(null);
        lastEventType.current = 'exit';
        // Log exit event
        axios.post(`${BACKEND_URL}/geofence-log`, {
          vehicleId: '12345', // Replace with actual vehicle ID
          geofenceId: geofence._id,
          eventType: 'exit',
          timestamp: exitTimestamp,
          duration: duration,
        }).catch(error => console.error('Error logging exit event:', error));
      } else if (isInside && currentGeofence && currentGeofence._id === geofence._id && lastEventType.current !== 'inside') {
        lastEventType.current = 'inside';
        // Log inside event
        axios.post(`${BACKEND_URL}/geofence-log`, {
          vehicleId: '12345', // Replace with actual vehicle ID
          geofenceId: currentGeofence._id,
          eventType: 'inside',
          timestamp: new Date(),
        }).catch(error => console.error('Error logging inside event:', error));
      }
    });
  }, [vehiclePosition, geofences, currentGeofence, enterTimestamp]);

  useEffect(() => {
    const interval = setInterval(checkGeofence, 5000);
    return () => clearInterval(interval);
  }, [checkGeofence]);

  const mapContainerStyle = {
    width: '100%',
    height: '400px',
  };

  const options = {
    fillColor: '#AA0000',
    fillOpacity: 0.2,
    strokeColor: '#AA0000',
    strokeOpacity: 0.5,
    strokeWeight: 2,
    clickable: true,
    editable: true,
    draggable: true,
  };

  if (loadError) {
    return <div>Error loading maps</div>;
  }

  if (!isLoaded) {
    return <div>Loading Maps...</div>;
  }

  return (
    <div>
      <h2 className='h2'>Geofence Manager</h2>
      <form className='form' onSubmit={handleSubmit}>
        <input name="name" placeholder="Name" onChange={handleChange} value={form.name} required />
        <input name="latitude" placeholder="Latitude" onChange={handleChange} value={form.latitude} readOnly />
        <input name="longitude" placeholder="Longitude" onChange={handleChange} value={form.longitude} readOnly />
        <input name="radius" placeholder="Radius (meters)" onChange={handleChange} value={form.radius} readOnly />
        <button type="submit">Save Geofence</button>
      </form>
      <ul className='ul'>
        {geofences.map((geofence) => (
          <li key={geofence._id}>
            <span className="geofence-name">{geofence.name}</span> - {geofence.latitude}, {geofence.longitude} ; {geofence.radius} meters
            <button onClick={() => handleDelete(geofence._id)}>Delete</button>
          </li>
        ))}
      </ul>
      <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={10}>
        {geofences.map((geofence) => (
          <Circle
            key={geofence._id}
            center={{ lat: geofence.latitude, lng: geofence.longitude }}
            radius={parseFloat(geofence.radius)}
            options={options}
          />
        ))}
        <DrawingManager
          onCircleComplete={handleCircleComplete}
          options={{
            drawingControl: true,
            drawingControlOptions: {
              position: window.google.maps.ControlPosition.TOP_CENTER,
              drawingModes: ['circle'],
            },
            circleOptions: options,
          }}
        />
      </GoogleMap>
    </div>
  );
};

export default GeofenceManager;
