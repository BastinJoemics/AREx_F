import React, { useEffect, useRef, useState } from "react";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MdOutlineGpsFixed } from "react-icons/md";
import { Link, useNavigate } from "react-router-dom";
import deliveryVanIconUrl from "../../assets/delivery_van_icon.png";
import "../Home/Home.scss";
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { logoutUser } from "../../services/authService";
import { SET_LOGIN } from "../../redux/features/auth/authSlice";
import { selectUser } from '../../redux/selectors';

const REACT_APP_FLESPI_TOKEN = process.env.REACT_APP_FLESPI_TOKEN;

const AssignedDevices = () => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);

  const [deviceData, setDeviceData] = useState([]);
  const [deviceDetails, setDeviceDetails] = useState({});
  const [telemetryData, setTelemetryData] = useState([]);
  const [setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const logout = async () => {
    await logoutUser();
    await dispatch(SET_LOGIN(false));
    navigate("/");
  };

  // Fetch assigned devices data
  useEffect(() => {
    const fetchAssignedDevices = async () => {
      if (!user || !user._id) {
        console.error("User ID is not defined");
        return;
      }

      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/${user._id}/devices`);
        if (Array.isArray(response.data)) {
          setDeviceData(response.data);
        } else {
          console.error("Assigned devices response is not an array:", response.data);
          setDeviceData([]);
        }
      } catch (error) {
        console.error("Error fetching assigned devices:", error);
        setDeviceData([]);
        setError(error);
      }
    };

    if (user && user._id) {
      fetchAssignedDevices();
    }
  }, [user]);

  // Fetch device details
  useEffect(() => {
    const fetchDeviceDetails = async (deviceId) => {
      try {
        const response = await axios.get(`/gw/devices/${deviceId}`, {
          headers: {
            'Authorization': `FlespiToken ${REACT_APP_FLESPI_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data && response.data.result && response.data.result.length > 0) {
          const deviceData = response.data.result[0];
          setDeviceDetails(prevDetails => ({
            ...prevDetails,
            [deviceId]: deviceData
          }));
        } else {
          console.warn(`No device data found for device ID: ${deviceId}`);
        }
      } catch (error) {
        console.error('Error fetching device details:', error);
        if (error.response) {
          console.error('Error response:', error.response.data);
        }
      }
    };

    if (deviceData.length > 0) {
      deviceData.forEach(device => {
        const deviceId = device[0]; // Ensure we are correctly accessing the device ID
        if (deviceId && !deviceDetails[deviceId]) {
          fetchDeviceDetails(deviceId);
        }
      });
    }
  }, [deviceData, deviceDetails]);

  // Fetch telemetry data
  useEffect(() => {
    const fetchTelemetryData = async () => {
      try {
        const response = await axios.get('/gw/channels/1211469/messages', {
          headers: {
            'Authorization': `FlespiToken ${REACT_APP_FLESPI_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data && response.data.result) {
          setTelemetryData(response.data.result);
        } else {
          setTelemetryData([]);
        }
      } catch (error) {
        console.error('Error fetching telemetry data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTelemetryData();
  }, []);

  // Initialize map
  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      const initializedMap = L.map(mapRef.current).setView([53.4808, -2.2426], 6);
      const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      const attribution = '&copy; <a href="http://arexperts.co.uk/">AR Experts LTD</a>';
      L.tileLayer(tileUrl, { attribution }).addTo(initializedMap);

      mapInstance.current = initializedMap;
      console.log('Map initialized'); // Debug log for map initialization
    }
  }, []);

  useEffect(() => {
    if (mapInstance.current && telemetryData.length > 0 && deviceData.length > 0) {
      // Clear existing markers before adding new ones
      markersRef.current.forEach(marker => mapInstance.current.removeLayer(marker));
      markersRef.current = [];

      const updatedDeviceData = telemetryData.map(vehicle => {
        const imei = vehicle.ident;
        const deviceDetail = Object.values(deviceDetails).find(detail => detail.configuration.ident === imei);
        const deviceId = deviceDetail ? deviceDetail.id : undefined;

        if (!deviceId) {
          return null;
        }

        const longitude = vehicle['position.longitude'];
        const latitude = vehicle['position.latitude'];

        if (longitude === undefined || latitude === undefined) {
          return null;
        }

        const deviceName = deviceDetail ? deviceDetail.name : 'Unknown';
        return { longitude, latitude, deviceName, deviceId, imei };
      }).filter(vehicle => vehicle !== null);

      updatedDeviceData.forEach(vehicle => {
        const { longitude, latitude, deviceName, deviceId, imei } = vehicle;
        const popupContent =
          `<div class="custom-popup">
            <h4>${deviceName}</h4>
            <p>IMEI: ${imei}, Vehicle ID: ${deviceId}</p>
            <p class="phone-number"><a href="/dashboard">Monitor the vehicle</a></p>
          </div>`;

        const marker = L.marker([latitude, longitude], {
          icon: L.icon({
            iconUrl: deliveryVanIconUrl,
            iconSize: [30, 40],
            iconAnchor: [15, 40],
            popupAnchor: [0, -40]
          })
        })
          .addTo(mapInstance.current)
          .bindPopup(popupContent);

        markersRef.current.push(marker);
      });
    }
  }, [telemetryData, deviceDetails, deviceData.length]);

  const flyToDevice = (longitude, latitude) => {
    if (mapInstance.current) {
      if (longitude !== undefined && latitude !== undefined) {
        mapInstance.current.flyTo([latitude, longitude], 14, { duration: 3 });
      } else {
        console.error("Invalid location data for vehicle:", { longitude, latitude });
      }
      setSelectedDevice(longitude, latitude);
    }
  };

  const handleLogicSelection = (deviceDetail, logic) => {
    if (deviceDetail && deviceDetail.configuration && deviceDetail.configuration.ident) {
      const imei = deviceDetail.configuration.ident;
      switch (logic) {
        case 'logic1':
          navigate(`/logiconedashboard/${imei}`);
          break;
        case 'logic2':
          navigate(`/logictwodashboard/${imei}`);
          break;
        case 'logic3':
          navigate(`/logicthreedashboard/${imei}`);
          break;
        case 'logic4':
          navigate(`/logicfourdashboard/${imei}`);
          break;
        default:
          navigate(`/dashboard/${imei}`);
          break;
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading data: {error.message}</div>;
  }

  return (
    <div className="home">
      <nav className="navbar">
        <div className="container --flex-between">
          <div className="navbar-brand">
            <MdOutlineGpsFixed size={35} />
            <span>AR Experts LTD</span>
          </div>
          <ul className="navbar-links">
            <li><button className="btn-primary" onClick={logout}>Logout</button></li>
          </ul>
          <div className="navbar-toggle">
            <button className="btn-primary"><Link to="/dashboard">Dashboard</Link></button>
          </div>
        </div>
      </nav>
      <main className="main-content">
        <div className="store-list">
          <div className="heading">
            <h2>Assigned Devices</h2>
          </div>
          <ul className="list">
            {Array.isArray(deviceData) && deviceData.map((device, index) => {
              const deviceId = device[0];
              const deviceDetail = deviceDetails[deviceId];
              if (!deviceDetail) return null;
              const { name, configuration } = deviceDetail;
              const imei = configuration?.ident || 'Unavailable';
              const assignedLogics = device.assignedLogics || [];

              const telemetry = telemetryData.find(t => t.ident === imei);
              const longitude = telemetry ? telemetry['position.longitude'] : 'Unavailable';
              const latitude = telemetry ? telemetry['position.latitude'] : 'Unavailable';

              return (
                <li key={index}>
                  <div className="shop-item">
                    <Link to="#" className="link-button" onClick={() => flyToDevice(longitude, latitude)}>{name || 'Unknown'}</Link>
                    <p>Device ID: {deviceId}</p>
                    <p>IMEI: {imei}</p>
                    <p>Location: {longitude}, {latitude}</p>
                    <p><strong>Assigned Logics: </strong></p>
                    <select onChange={(e) => handleLogicSelection(deviceDetail, e.target.value)}>
                      <option value="">Select a logic</option>
                      {assignedLogics.map((logic, index) => (
                        <option key={index} value={logic}>{logic}</option>
                      ))}
                    </select>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <div id="map" ref={mapRef} className="map-container"></div>
      </main>
    </div>
  );
};

export default AssignedDevices;
