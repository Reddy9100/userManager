const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require("cors")
const app = express();
const PORT = process.env.PORT || 5000;
const jwt = require("jsonwebtoken")
// Middleware
app.use(bodyParser.json());
app.use(cors())
// MongoDB Atlas connection URI with the correct credentials and database name
const MONGODB_URI = 'mongodb+srv://reddysai:reddy12345@cluster0.ekusftb.mongodb.net/admins_data';

// Connect to MongoDB Atlas
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    // Start the server after successfully connecting to the database
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB Atlas:', error);
  });

// Define Admin Schema
const adminSchema = new mongoose.Schema({
  name:{
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
});

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/.+\@.+\..+/, 'Please fill a valid email address'],
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Other'],
  },
  address: {
    type: String,
    required: true,
  },
  pincode: {
    type: String,
    required: true,
  },
});


// Register Admin model with Mongoose
const Admin = mongoose.model('Admin', adminSchema);
const User = mongoose.model("user" , UserSchema)
// Route to verify admin or create if not exists

app.post('/create-admin', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if admin with the email already exists
    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      // Admin already exists, return a response indicating that admin already exists
      res.status(400).json({ message: 'Admin already exists' });
    } else {
      // Admin doesn't exist, create new admin
      const hashedPassword = await bcrypt.hash(password, 10); // Hash password with bcrypt
      const newAdmin = new Admin({ name, email, password: hashedPassword });
      await newAdmin.save();
      res.status(201).json({ message: 'Admin created successfully', admin: newAdmin });
    }
  } catch (error) {
    // Error handling
    console.error('Error verifying/creating admin:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user with the email exists
    const user = await Admin.findOne({ email });

    if (!user) {
      // User does not exist, return a response indicating invalid credentials
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // User exists, compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Password is incorrect, return a response indicating invalid credentials
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Password is correct, login successful
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ email: user.email }, 'YOUR_SECRET_KEY', { expiresIn: '1h' });
    res.status(200).json({ message: 'Login successful' , token });
    
  } catch (error) {
    // Error handling
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


app.post('/create-user', async (req, res) => {
  const { name, email, phoneNumber, gender, address, pincode } = req.body;

  try {
    // Create a new user instance
    const newUser = new User({
      name,
      email,
      phoneNumber,
      gender,
      address,
      pincode,
    });

    // Save the user to the database
    await newUser.save();

    // Respond with the created user
    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (error) {
    // Handle any errors that occur
    if (error.name === 'ValidationError') {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
    } else if (error.code === 11000) {
      res.status(400).json({ message: 'Email already exists' });
    } else {
      res.status(500).json({ message: 'Internal server error', error });
    }
  }
});


app.get("/users",async(req,res)=>{
  const users = await User.find({})
  res.status(200).json({message: "users Fetched" , users : users})
})

app.delete("/users/:email" , async(req, res) => {
  const { email } = req.params;
  try {
      const user = await User.findOneAndDelete({ email: email });
      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json({ message: "User deleted", user: user });
  } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Internal Server Error" });
  }
});


app.put("/users/:email", async (req, res) => {
  const { email } = req.params;
  const { name, phoneNumber, gender, address, pincode } = req.body;
  try {
    const user = await User.findOneAndUpdate(
      { email: email },
      { name, phoneNumber, gender, address, pincode },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User updated", user: user });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
