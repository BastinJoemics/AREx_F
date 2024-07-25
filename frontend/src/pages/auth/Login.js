import React, { useState } from "react";
import styles from "./Login.module.scss"; // Correctly import the CSS module
import { BiLogIn } from "react-icons/bi";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { loginUser, validateEmail } from "../../services/authService";
import { SET_LOGIN, SET_NAME, SET_USER } from "../../redux/features/auth/authSlice";
import Loader from "../../components/loader/Loader";

const initialState = {
  email: "",
  password: "",
};

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(initialState);
  const { email, password } = formData;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const login = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      return toast.error("All fields are required");
    }

    if (!validateEmail(email)) {
      return toast.error("Please enter a valid email");
    }

    const userData = {
      email,
      password,
    };
    setIsLoading(true);
    try {
      const data = await loginUser(userData);
      console.log("User Data:", data); // Log the user data to ensure correct role is received
      await dispatch(SET_LOGIN(true));
      await dispatch(SET_NAME(data.name));
      await dispatch(SET_USER(data));
      if (data.role === 'admin') {
        navigate("/devices");
      } else {
        navigate("/assigned-devices");
      }
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authBody}>
      {isLoading && <Loader />}
      <div className={styles.container}>
        <div className={styles.leftSide}></div>
        <div className={styles.rightSide}>
          <div className={styles.formContainer}>
            <div className={styles.form}>
              <div className={styles.icon}>
                <BiLogIn size={35} color="#999" />
              </div>
              <h2>Welcome to AR Experts LTD</h2>
              <p>Login to manage your fleet</p>
              <form onSubmit={login}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  required
                  name="email"
                  value={email}
                  onChange={handleInputChange}
                />
                <input
                  type="password"
                  placeholder="Password"
                  required
                  name="password"
                  value={password}
                  onChange={handleInputChange}
                />
                <button type="submit" className={styles.btn}>
                  Login
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
