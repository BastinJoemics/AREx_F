const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const Device = require("../models/deviceModel"); // Import Device model
const jwt = require("jsonwebtoken");  
const bcrypt = require('bcryptjs');
const Token = require("../models/tokenModel");
const crypto = require('crypto');
const { log } = require("console");
const sendEmail = require("../utils/sendEmail");

// Generate Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// Register User
const registerUser = asyncHandler( async (req, res) => {
    const {name, email, password} = req.body
  
    // Validation
    if(!name || !email || !password) {
        res.status(400)
        throw new Error("Please fill in all required fields")
        // const error = new Error("Please fill in all required fields");
        // return next(error);
    }
    if (password.length < 6) {
        res.status(400);
        throw new Error("Password must be up to 6 characters");
    }

    // Check is user email already exists
    const userExists = await User.findOne({email})
    if (userExists){
        res.status(400);
        throw new Error("Email has already been registered");
    }

    // Create new User
    const user = await User.create({
        name, 
        email,
        password,
        role: "admin", // Set role as admin
    })

    // Generate Token
    const token  = generateToken(user._id);

    // Send HTTP-only cookie
    res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 86400), // 1 day
        sameSite: "none",
        secure: true
    })

    if (user) {
        const {_id, name, email, photo, phone, bio} = user;
        res.status(201).json({
            _id, name, email, photo, phone, bio, token,
        })
    } else {
        res.status(400)
        throw new Error("Invalid user data")
    }
})


// Register User with Device
const registerUserWithDevices = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password, deviceIds, logics } = req.body;
  
    // Validation
    if (!firstName || !lastName || !email || !password || !deviceIds || deviceIds.length === 0 || !logics || logics.length === 0) {
      res.status(400);
      throw new Error("Please fill in all required fields, select at least one device, and assign at least one logic");
    }
    if (password.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters");
    }
  
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error("Email has already been registered");
    }
  
    // Create new user
    const user = await User.create({
      name: `${firstName} ${lastName}`,
      email,
      password,
      assignedDevices: deviceIds,
      logics, // Save the assigned logics
      role: "user"
    });
  
    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        assignedDevices: user.assignedDevices,
        logics: user.logics, // Include logics in the response
      });
    } else {
      res.status(400);
      throw new Error("Invalid user data");
    }
});

  




// Login User
const loginUser = asyncHandler(async (req, res) => {
    const {email, password} = req.body

    // Validate Request
    if(!email || !password) {
        res.status(400)
        throw new Error("Please add email and password");
    }

    // Check if user exists
    const user = await User.findOne({email})

    if (!user) {
        res.status(400)
        throw new Error("User not found, please signup")
    }

    // Check if password is correct
    const passwordIsCorrect = await bcrypt.compare(password, user.password)

    // Generate Token
    const token  = generateToken(user._id);

    // Send HTTP-only cookie
    if (passwordIsCorrect) {
        res.cookie("token", token, {
            path: "/",
            httpOnly: true,
            expires: new Date(Date.now() + 1000 * 86400), // 1 day
            sameSite: "none",
            secure: true
        })
    }
    
    if (user && passwordIsCorrect) {
        const {_id, name, email, role, assignedDevices, photo, phone, bio} = user;
        res.status(200).json({
            _id, name, email, role, assignedDevices, photo, phone, bio, token
        })
    } else {
        res.status(400)
        throw new Error("Invalid email or password")
    }
});

// Logout User
const logout = asyncHandler ( async (req, res) => {
    res.cookie("token", "", {
        path: "/",
        httpOnly: true,
        expires: new Date(0), 
        sameSite: "none",
        secure: true
    });
    return res.status(200).json({ message: "Successfully Logged out" });
});

// Get User Data
const getUser = asyncHandler ( async (req, res) => {
    const user = await User.findById(req.user._id)

    if (user) {
        const {_id, name, email, photo, phone, bio} = user;
        res.status(200).json({
            _id, name, email, photo, phone, bio
        })
    } else {
        res.status(400)
        throw new Error("User not found");
    }
});

// Get Login Status
const loginStatus = asyncHandler( async(req, res) => {
    const token = req.cookies.token;
    if(!token) {
        return res.json(false)
    }
    
    // Verify Token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if (verified) {
        return res.json(true)
    }
    return res.json(false)
});

// Update User
const updateUser = asyncHandler (async (req, res) => {
    const user = await User.findById(req.user._id)

    if (user) {
        const {name, email, photo, phone, bio} = user;
        user.email = email;
        user.name = req.body.name || name;
        user.phone = req.body.phone || phone;
        user.bio = req.body.bio || bio;
        user.photo = req.body.photo || photo;

        const updatedUser = await user.save()
        res.status(200).json({
            _id: updatedUser._id, 
            name: updatedUser.name, 
            email: updatedUser.email, 
            photo: updatedUser.photo, 
            phone: updatedUser.phone, 
            bio: updatedUser.bio,
        })
    } else {
        res.status(404);
        throw new Error("User not found");
    }

});

const changePassword = asyncHandler (async (req, res) => {
    const user = await User.findById(req.user._id)
    const {oldPassword, password} = req.body
    //Validate
    if(!user) {
        res.status(404);
        throw new Error("User no found, please signup");
    }

    //Validate
    if(!oldPassword || !password) {
        res.status(404);
        throw new Error("Please add old and new password");
    }

    // check if old password matches password in DB
    const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password)

    // save new password
    if (user && passwordIsCorrect) {
        user.password = password
        await user.save()
        res.status(200).send("Passoword change successful")
    } else {
        res.status(400);
        throw new Error("Old password is incorrect");     
    }
});

const forgotPassword = asyncHandler (async (req, res) => {
    const {email} = req.body
    const user = await User.findOne({email})

    if (!user) {
        res.status(404);
        throw new Error("User does not exists")
    }

    // Delete token if it exists in DB
    let token = await Token.findOne({userId: user._id})
    if (token) {
        await token.deleteOne();
    }

    // Create Reset Token
    let resetToken = crypto.randomBytes(32).toString("hex") + user._id;
    console.log(resetToken);

    // Hash Token Before Saving To DB
    const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex")

    // Save Token to DB
    await new Token({
        userId: user._id,
        token: hashedToken,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * (60 * 1000) // Thirty minutes
    }).save();

    // Construct Reset Url
    const resetUrl = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`

    // Reset Email
    const message = `
        <h2>Hello ${user.name}</h2>
        <p>Please use the url below to reset your password</p>
        <p>This reset link is valid for only 30 minutes</p>

        <a href=${resetUrl} clicktracking=off>${resetUrl}</a>

        <p>Regards...</p>
    `;
    const subject = "Password Reset Request";
    const send_to = user.email;
    const send_from = process.env.EMAIL_USER;

    try {
        await sendEmail(subject, message, send_to, send_from)
        res.status(200).json({success: true, message: "Reset Email Sent"})
    } catch (error) {
        res.status(500);
        throw new Error("Email not sent, please try again");
    }
});

// Reset Password
const resetPassword = asyncHandler (async (req, res) => {
    const {password} = req.body
    const {resetToken} = req.params

    // Hash token, then compare to Token in DB
    const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex")

    // Find token in DB
    const userToken = await Token.findOne({
        token: hashedToken,
        expiresAt: {$gt: Date.now()}
    })

    if (!userToken) {
        res.status(404);
        throw new Error("Invalid or Expired Token");     
    }

    // Find user
    const user = await User.findOne({_id: userToken.userId})
    user.password = password
    await user.save()
    res.status(200).json({
        message: "Password Reset Successful, Please Login"
    })
});

const getUserDevices = asyncHandler(async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log(`Fetching devices for user ID: ${userId}`); // Add logging
        const user = await User.findById(userId).populate("assignedDevices");
      
        if (!user) {
          console.error("User not found");
          res.status(404);
          throw new Error("User not found");
        }
      
        if (!Array.isArray(user.assignedDevices)) {
            console.error("Assigned devices is not an array:", user.assignedDevices);
            return res.status(500).json({ error: "Assigned devices is not an array" });
        }
        
        // Include assigned logics in the response
        const assignedDevicesWithLogics = user.assignedDevices.map(device => ({
            ...device.toObject(),
            assignedDevices: user.assignedDevices,
            assignedLogics: user.logics // Assuming logics is part of the user model and is an array of logics
        }));

        res.status(200).json(assignedDevicesWithLogics);
    } catch (error) {
        console.error("Error in getUserDevices:", error);
        res.status(500).json({ error: error.message });
    }
});




module.exports = {
    registerUser,
    registerUserWithDevices,
    loginUser,
    logout,
    getUser,
    loginStatus,
    updateUser,
    changePassword,
    forgotPassword,
    resetPassword,
    getUserDevices
};