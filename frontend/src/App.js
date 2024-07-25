import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Forgot from "./pages/auth/Forgot";
import Reset from "./pages/auth/Reset";
import Dashboard from "./pages/dashboard/Dashboard";
import Sidebar from "./components/sidebar/Sidebar";
import Layout from "./components/layout/Layout";
import axios from "axios";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useDispatch } from "react-redux";
import { getLoginStatus } from "./services/authService";
import { SET_LOGIN } from "./redux/features/auth/authSlice";
import Contact from "./pages/contact/Contact";
import History from "./pages/history/History";
import GeofenceManager from "./pages/Geofence/GeofenceManager";
import Program from "./pages/program/Program";
import Certification from "./pages/Certification/Certification";
import LogicOneDashboard from "./pages/LogicOneDashboard/LogiconeDashboard";
import LogicTwoDashboard from "./pages/LogicTwoDashboard/LogictwoDashboard";
import LogicThreeDashboard from "./pages/LogicThreeDashboard/LogicThreeDashboard";
import AssignedDevices from "./pages/Users/AssignedDevices";

axios.defaults.withCredentials = true;

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    async function loginStatus() {
      const status = await getLoginStatus();
      dispatch(SET_LOGIN(status));
    }
    loginStatus();
  }, [dispatch]);

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/devices" element={<Home />} />
        <Route path="/assigned-devices" element={<AssignedDevices />} />
        {/* <Route path="/login" element={<Login />} /> */}
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/resetpassword/:resetToken" element={<Reset />} />

        <Route
          path="/dashboard/:imei"
          element={
            <Sidebar>
              <Layout>
                <Dashboard />
              </Layout>
            </Sidebar>
          }
        />
        <Route
          path="/logiconedashboard/:deviceId"
          element={
            <Sidebar>
              <Layout>
                <LogicOneDashboard />
              </Layout>
            </Sidebar>
          }
        />
        <Route
          path="/logictwodashboard/:deviceId"
          element={
            <Sidebar>
              <Layout>
                <LogicTwoDashboard />
              </Layout>
            </Sidebar>
          }
        />
        <Route
          path="/logicthreedashboard/:deviceId"
          element={
            <Sidebar>
              <Layout>
                <LogicThreeDashboard />
              </Layout>
            </Sidebar>
          }
        />
        <Route
          path="/data-and-history"
          element={
            <Sidebar>
              <Layout>
                <History />
              </Layout>
            </Sidebar>
          }
        />
        <Route
          path="/geofences/:deviceId"
          element={
            <Sidebar>
              <Layout>
                <GeofenceManager />
              </Layout>
            </Sidebar>
          }
        />
        <Route
          path="/program"
          element={
            <Sidebar>
              <Layout>
                <Program />
              </Layout>
            </Sidebar>
          }
        />
        <Route
          path="/certification"
          element={
            <Sidebar>
              <Layout>
                <Certification />
              </Layout>
            </Sidebar>
          }
        />
        <Route
          path="/contact-us"
          element={
            <Sidebar>
              <Layout>
                <Contact />
              </Layout>
            </Sidebar>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;