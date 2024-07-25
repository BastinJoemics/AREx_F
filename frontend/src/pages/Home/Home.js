import React, { useEffect, useRef, useState } from "react";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MdOutlineGpsFixed } from "react-icons/md";
import { Link } from "react-router-dom";
import emailjs from 'emailjs-com';
import deliveryVanIconUrl from "../../assets/delivery_van_icon.png"; // Ensure the path is correct
import "./Home.scss";
import { useDispatch, useSelector } from 'react-redux';
import { getVehicleTelemetryData } from "../../redux/features/product/productService";
import axios from 'axios';
import { logoutUser } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import { SET_LOGIN } from "../../redux/features/auth/authSlice";
import { selectTelemetryData } from '../../redux/selectors';

const REACT_APP_FLESPI_TOKEN = process.env.REACT_APP_FLESPI_TOKEN;

const Home = () => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const telemetryData = useSelector(selectTelemetryData);
  const loading = useSelector((state) => state.vehicle.loading);
  const error = useSelector((state) => state.vehicle.error);

  const [vehicleData, setVehicleData] = useState([]);
  const [deviceDetails, setDeviceDetails] = useState({});
  const [selectedLogic, setSelectedLogic] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [showAddDeviceForm, setShowAddDeviceForm] = useState(false);
  const [createUserFormData, setCreateUserFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    deviceIds: []
  });
  const [addDeviceFormData, setAddDeviceFormData] = useState({
    CompanyName: "",
    vehicleNumberPlate: "",
    imeiNumber: ""
  });

  const logout = async () => {
    await logoutUser();
    await dispatch(SET_LOGIN(false));
    navigate("/");
  };

  const toggleCreateUserForm = () => {
    setShowCreateUserForm(!showCreateUserForm);
  };

  const toggleAddDeviceForm = () => {
    setShowAddDeviceForm(!showAddDeviceForm);
  };

  const closeCreateUserForm = () => {
    setShowCreateUserForm(false);
  };

  const closeAddDeviceForm = () => {
    setShowAddDeviceForm(false);
  };

  const handleCreateUserInputChange = (e) => {
    const { name, value } = e.target;
    setCreateUserFormData({ ...createUserFormData, [name]: value });
  };

  const handleAddDeviceInputChange = (e) => {
    const { name, value } = e.target;
    setAddDeviceFormData({ ...addDeviceFormData, [name]: value });
  };

  const handleCreateUserCheckboxChange = (e) => {
    const { value, checked } = e.target;
    setCreateUserFormData((prevFormData) => {
      if (checked) {
        return { ...prevFormData, deviceIds: [...prevFormData.deviceIds, value] };
      } else {
        return { ...prevFormData, deviceIds: prevFormData.deviceIds.filter((id) => id !== value) };
      }
    });
  };

  const handleCreateUserFormSubmit = async (e) => {
    e.preventDefault();
    if (createUserFormData.password !== createUserFormData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    try {
      await axios.post('http://localhost:5700/api/users/registerWithDevice', createUserFormData);
      alert("User created successfully!");
      setShowCreateUserForm(false);
      setCreateUserFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        deviceIds: []
      });
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Failed to create user.");
    }
  };

  const handleAddDeviceFormSubmit = async (e) => {
    e.preventDefault(); // Prevent the default form submission

    // Data to be sent in the email
    const templateParams = {
      to_email: "telematics@arexperts.co.uk",
      CompanyName: addDeviceFormData.CompanyName,
      vehicleNumberPlate: addDeviceFormData.vehicleNumberPlate,
      imeiNumber: addDeviceFormData.imeiNumber
    };

    // Sending email using EmailJS service
    emailjs.send('service_uac4877', 'template_bun4byx', templateParams, 'AFY397KRKcaNc1_-s')
      .then((response) => {
        // Handle successful response
        console.log('SUCCESS!', response.status, response.text);
        alert("Device addition request sent successfully!");

        // Reset form visibility and data
        setShowAddDeviceForm(false);
        setAddDeviceFormData({
          CompanyName: "",
          vehicleNumberPlate: "",
          imeiNumber: ""
        });
      }, (error) => {
        // Handle error response
        console.error('FAILED...', error);
        alert("Failed to send device addition request.");
      });
  };

  // Fetch telemetry data
  useEffect(() => {
    const fetchVehicleData = async () => {
      await dispatch(getVehicleTelemetryData());
    };

    fetchVehicleData();
  }, [dispatch]);

  // Fetch device details once
  useEffect(() => {
    const fetchDeviceDetails = async (deviceId) => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/flespi/gw/devices/${deviceId}`, {
          headers: {
            'Authorization': `FlespiToken ${REACT_APP_FLESPI_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        console.log(`API response for device ${deviceId}:`, response.data); // Log the entire response

        if (response.data && response.data.result && response.data.result.length > 0) {
          const deviceData = response.data.result[0];
          console.log(`Fetched data for device ${deviceId}:`, deviceData); // Debug log
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

    const deviceIds = [5812973, 5819862]; // Add all your device IDs here as an array
    deviceIds.forEach(deviceId => {
      if (!deviceDetails[deviceId]) {
        fetchDeviceDetails(deviceId);
      }
    });
  }, [deviceDetails]);

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
    if (mapInstance.current && telemetryData.length > 0) {
      // Clear existing markers before adding new ones
      markersRef.current.forEach(marker => mapInstance.current.removeLayer(marker));
      markersRef.current = [];

      console.log('Telemetry Data:', telemetryData); // Debug log for telemetry data

      const updatedVehicleData = telemetryData.map(vehicle => {
        console.log('Vehicle telemetry data:', vehicle); // Detailed log for each vehicle telemetry data

        // Inspect the structure of each vehicle telemetry data
        // We need to identify the correct key that holds the device ID
        console.log('Possible keys in vehicle telemetry data:', Object.keys(vehicle)); // Log all keys in telemetry data

        // Assuming 'ident' is the key that uniquely identifies the device
        const imei = vehicle.ident;
        const deviceDetail = Object.values(deviceDetails).find(detail => detail.configuration.ident === imei);
        const deviceId = deviceDetail ? deviceDetail.id : undefined;

        console.log('Vehicle ID:', deviceId); // Debug log for each vehicle ID

        const longitude = vehicle['position.longitude'];
        const latitude = vehicle['position.latitude'];
        const deviceName = deviceDetail ? deviceDetail.name : 'Unknown';

        return { longitude, latitude, deviceName, deviceId, imei };
      });

      // Debug log for updatedVehicleData
      console.log('Updated Vehicle Data:', updatedVehicleData);

      // Avoid setting state if the data has not changed
      if (JSON.stringify(vehicleData) !== JSON.stringify(updatedVehicleData)) {
        setVehicleData(updatedVehicleData);
      }

      updatedVehicleData.forEach(vehicle => {
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
  }, [telemetryData, deviceDetails, vehicleData]);

  const flyToVehicle = (vehicle) => {
    if (mapInstance.current) {
      const { longitude, latitude } = vehicle;
      mapInstance.current.flyTo([latitude, longitude], 14, { duration: 3 });
    }
    setSelectedVehicle(vehicle);
  };

  const handleLogicSelection = (event) => {
    const logic = event.target.value;
    setSelectedLogic(logic);
    if (selectedVehicle) {
      const { imei } = selectedVehicle;
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
        default:
          navigate(`/dashboard/${imei}`);
          break;
      }
    }
  };

  return (
    <div className="home">
      <nav className="navbar">
        <div className="container --flex-between">
          <div className="navbar-brand">
            <MdOutlineGpsFixed size={35} />
            <span>AR Experts LTD</span>
          </div>
          <ul className="navbar-links">
            <li><button className="btn-primary" onClick={logout} >Logout</button></li>
          </ul>
          <div className="navbar-toggle">
            <button className="btn-primary"><Link to="/dashboard">Dashboard</Link></button>
          </div>
        </div>
      </nav>
      <main className="main-content">
        <div className="store-list">
          <div className="heading">
            <h2>List of Devices</h2>
          </div>
          <button className="btn-primary-custom" onClick={toggleCreateUserForm}>Create User</button>
          <button className="btn-primary-custom addDev" onClick={toggleAddDeviceForm}>Add Device</button>
          <div className={`form-popup ${showCreateUserForm ? 'activee' : ''}`}>
            <form onSubmit={handleCreateUserFormSubmit}>
              <input type="text" name="firstName" placeholder="First Name" value={createUserFormData.firstName} onChange={handleCreateUserInputChange} required />
              <input type="text" name="lastName" placeholder="Last Name" value={createUserFormData.lastName} onChange={handleCreateUserInputChange} required />
              <input type="email" name="email" placeholder="Email" value={createUserFormData.email} onChange={handleCreateUserInputChange} required />
              <input type="password" name="password" placeholder="Password" value={createUserFormData.password} onChange={handleCreateUserInputChange} required />
              <input type="password" name="confirmPassword" placeholder="Confirm Password" value={createUserFormData.confirmPassword} onChange={handleCreateUserInputChange} required />
              <div className="checkbox-group">
                {Object.values(deviceDetails).map(device => (
                  <label key={device.id}>
                    <input
                      type="checkbox"
                      name="deviceIds"
                      value={device.id}
                      onChange={handleCreateUserCheckboxChange}
                    />
                    {device.name}
                  </label>
                ))}
              </div>
              <button type="submit" className="btn-primary">Create User</button>
              <button type="button" className="close-btn" onClick={closeCreateUserForm}>Close</button>
            </form>
          </div>
          <div className={`form-popup ${showAddDeviceForm ? 'activee' : ''}`}>
            <form onSubmit={handleAddDeviceFormSubmit}>
              <input type="text" name="CompanyName" placeholder="Company Name" value={addDeviceFormData.CompanyName} onChange={handleAddDeviceInputChange} required />
              <input type="text" name="vehicleNumberPlate" placeholder="Vehicle Number Plate" value={addDeviceFormData.vehicleNumberPlate} onChange={handleAddDeviceInputChange} required />
              <input type="text" name="imeiNumber" placeholder="IMEI Number" value={addDeviceFormData.imeiNumber} onChange={handleAddDeviceInputChange} required />
              <button type="submit" className="btn-primary">Add Device</button>
              <button type="button" className="close-btn" onClick={closeAddDeviceForm}>Close</button>
            </form>
          </div>
          {showCreateUserForm && <div className="overlay active" onClick={closeCreateUserForm}></div>}
          {showAddDeviceForm && <div className="overlay active" onClick={closeAddDeviceForm}></div>}
          {loading && <p>Loading...</p>}
          {error && <p>Error loading data: {error}</p>}
          {!loading && !error && (
            <ul className="list">
              {vehicleData.map((vehicle, index) => (
                <li key={index} onClick={() => flyToVehicle(vehicle)}>
                  <div className="shop-item">
                    <button className="link-button">{vehicle.deviceName}</button>
                    <div className="vehicle-info">
                      <span><strong>IMEI:</strong> {vehicle.imei}</span>
                      <span><strong>Vehicle ID:</strong> {vehicle.deviceId}</span>
                    </div>
                    {selectedVehicle === vehicle && (
                      <div className="logic-selection">
                        <select onChange={handleLogicSelection} value={selectedLogic || ''}>
                          <option value="" disabled>Select Logic</option>
                          <option value="logic1">Logic 1</option>
                          <option value="logic2">Logic 2</option>
                          <option value="logic3">Logic 3</option>
                          <option value="logic4">Logic 4</option>
                        </select>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div id="map" ref={mapRef} className="map-container"></div>
      </main>
    </div>
  );
};

export default Home;
