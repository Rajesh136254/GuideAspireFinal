const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const path = require("path");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
// backend/server.js

require('dotenv').config(); // This line loads the .env file

const app = express();
app.use(bodyParser.json());

// Enable CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(cors({ origin: "*", credentials: true }));

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
async function testDbConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to the MySQL database.');
    connection.release();
  } catch (err) {
    console.error('Database connection failed:', err.message);
  }
}
testDbConnection();

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "Uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });
app.use("/uploads", express.static(path.join(__dirname, "Uploads")));

// Route for the home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.htm"));
});

// Route for the signup page
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "Signup.htm"));
});

// Route for the life page
app.get("/life", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "life-skills.htm"));
});

// Signup Endpoint
app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Insert new user (hash password in production)
    await pool.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, password]);
    res.json({ message: 'Signup successful' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Route for the login page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "Login.htm"));
});

// Login Endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({ message: 'Login successful' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Forgot Password Route
app.post("/forgot-password", async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ message: "Email and new password are required." });
  }

  try {
    const checkQuery = "SELECT * FROM users WHERE email = ?";
    const [results] = await pool.query(checkQuery, [email]);
    if (results.length === 0) {
      return res.status(400).json({ message: "User does not exist." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updateQuery = "UPDATE users SET password = ? WHERE email = ?";
    await pool.query(updateQuery, [hashedPassword, email]);
    res.json({ message: "Password reset successful!" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Profile Endpoints
app.get("/api/profile/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const [user] = await pool.query(
      "SELECT id, name, email FROM users WHERE email = ?",
      [email]
    );

    if (!user.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const [profile] = await pool.query(
      "SELECT profile_picture FROM profiles WHERE email = ?",
      [email]
    );

    res.json({
      name: user[0].name,
      email: user[0].email,
      profilePicture: profile.length ? profile[0].profile_picture : null,
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Server error fetching profile" });
  }
});

app.post("/api/profile/picture", upload.single("profile_picture"), async (req, res) => {
  try {
    const { email } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const filePath = `/uploads/${req.file.filename}`;

    const [user] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (!user.length) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "User not found" });
    }

    const [oldProfile] = await pool.query(
      "SELECT profile_picture FROM profiles WHERE email = ?",
      [email]
    );

    await pool.query(
      "INSERT INTO profiles (user_id, email, profile_picture) VALUES (?, ?, ?) " +
      "ON DUPLICATE KEY UPDATE profile_picture = ?",
      [user[0].id, email, filePath, filePath]
    );

    if (oldProfile.length && oldProfile[0].profile_picture) {
      const oldPath = path.join(__dirname, oldProfile[0].profile_picture.replace("/uploads/", "Uploads/"));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    res.json({
      success: true,
      message: "Profile picture updated successfully",
      profilePicture: filePath,
    });
  } catch (err) {
    console.error("Profile picture update error:", err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Server error updating profile picture" });
  }
});

app.put("/api/profile", async (req, res) => {
  try {
    const { email, name, password } = req.body;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        "UPDATE users SET name = ?, password = ? WHERE email = ?",
        [name, hashedPassword, email]
      );
    } else {
      await pool.query(
        "UPDATE users SET name = ? WHERE email = ?",
        [name, email]
      );
    }

    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Server error updating profile" });
  }
});

// New endpoint to get section ID by name
app.get('/api/section/:name', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id FROM sections WHERE name = ?', [req.params.name]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching section:', err);
    res.status(500).json({ error: err.message });
  }
});

// New endpoint to get all learning path days for a skill
app.get('/api/learning_path/days/:skill_id', async (req, res) => {
  try {
    // Return link fields so the admin UI can populate inputs immediately
    const [rows] = await pool.query(
      'SELECT id, day_number, topic, material_link, exercise_link, project_link FROM learning_path_days WHERE skill_id = ? ORDER BY day_number',
      [req.params.skill_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching learning path days:', err.message);
    res.status(500).json({ error: 'Failed to fetch learning path days: ' + err.message });
  }
});

// Admin endpoint for creating category
app.post('/api/admin/category', async (req, res) => {
  const { name, section_id } = req.body;
  if (!name || !section_id) {
    return res.status(400).json({ error: 'Name and section_id required' });
  }
  try {
    const [result] = await pool.query('INSERT INTO categories (name, section_id) VALUES (?, ?)', [name, section_id]);
    res.json({ id: result.insertId, name });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Category already exists' });
    }
    console.error('Error creating category:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin endpoint for creating job
app.post('/api/admin/job', async (req, res) => {
  const { job_id: jobId, category_id, title, role, industries, description, days } = req.body;
  if (!jobId || !category_id || !title || !days) {
    return res.status(400).json({ error: 'Required fields missing' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO jobs (job_id, category_id, title, role, industries, description, days) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [jobId, category_id, title, role, industries, description, days]
    );
    res.json({ id: result.insertId, job_id: jobId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Job already exists' });
    }
    console.error('Error creating job:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin endpoint for creating skill
app.post('/api/admin/skill', async (req, res) => {
  const { job_id, name } = req.body;
  if (!job_id || !name) {
    return res.status(400).json({ error: 'job_id and name required' });
  }
  try {
    const [result] = await pool.query('INSERT INTO skills (job_id, name) VALUES (?, ?)', [job_id, name]);
    res.json({ id: result.insertId, name });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Skill already exists for this job' });
    }
    console.error('Error creating skill:', err);
    res.status(500).json({ error: err.message });
  }
});

// Career Progress Endpoints
app.post("/career-progress", async (req, res) => {
  const { email, category, jobId, dayNumber } = req.body;
  console.log("Received career progress data:", { email, category, jobId, dayNumber });

  if (!email || !category || !jobId || !dayNumber) {
    console.error("Invalid input:", { email, category, jobId, dayNumber });
    return res.status(400).json({ error: "Valid email, category, jobId, and dayNumber are required." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error("Invalid email format:", email);
    return res.status(400).json({ error: "Invalid email format." });
  }

  try {
    const checkUserQuery = "SELECT * FROM users WHERE email = ?";
    const [userResults] = await pool.query(checkUserQuery, [email]);
    if (userResults.length === 0) {
      console.error("User does not exist:", email);
      return res.status(400).json({ error: "User does not exist." });
    }

    const getProgressQuery = "SELECT completed_days FROM career_progress WHERE email = ? AND category = ? AND job_id = ?";
    const [progressResults] = await pool.query(getProgressQuery, [email, category, jobId]);

    let completedDays = [];
    if (progressResults.length > 0 && progressResults[0].completed_days) {
      try {
        completedDays = JSON.parse(progressResults[0].completed_days);
        if (!Array.isArray(completedDays)) {
          completedDays = [];
        }
      } catch (parseError) {
        console.error("Error parsing completed_days:", parseError);
        completedDays = [];
      }
    }

    if (!completedDays.includes(dayNumber)) {
      completedDays.push(dayNumber);
      completedDays.sort((a, b) => a - b);
    }

    const updateProgressQuery = `
      INSERT INTO career_progress (email, category, job_id, completed_days)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE completed_days = ?
    `;
    const completedDaysStr = JSON.stringify(completedDays);
    await pool.query(updateProgressQuery, [email, category, jobId, completedDaysStr, completedDaysStr]);

    console.log("Career progress saved:", { email, category, jobId, completedDays });
    res.status(200).json({ success: true, completedDays });
  } catch (err) {
    console.error("Error saving career progress:", err);
    res.status(500).json({ error: "Failed to save progress.", details: err.message });
  }
});

app.get("/career-progress/:email/:category/:jobId", async (req, res) => {
  const { email, category, jobId } = req.params;
  console.log("Fetching career progress for:", { email, category, jobId });

  if (!email || !category || !jobId) {
    console.error("Invalid input:", { email, category, jobId });
    return res.status(400).json({ error: "Valid email, category, and jobId are required." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error("Invalid email format:", email);
    return res.status(400).json({ error: "Invalid email format." });
  }

  try {
    const checkUserQuery = "SELECT * FROM users WHERE email = ?";
    const [userResults] = await pool.query(checkUserQuery, [email]);
    if (userResults.length === 0) {
      console.error("User does not exist:", email);
      return res.status(400).json({ error: "User does not exist." });
    }

    const getProgressQuery = "SELECT completed_days FROM career_progress WHERE email = ? AND category = ? AND job_id = ?";
    const [progressResults] = await pool.query(getProgressQuery, [email, category, jobId]);

    if (progressResults.length === 0 || !progressResults[0].completed_days) {
      console.log("No career progress found for:", { email, category, jobId });
      return res.json([]);
    }

    let completedDays;
    try {
      completedDays = JSON.parse(progressResults[0].completed_days);
      if (!Array.isArray(completedDays)) {
        completedDays = [];
      }
    } catch (parseError) {
      console.error("Error parsing completed_days:", parseError);
      completedDays = [];
    }

    console.log("Career progress retrieved:", { email, category, jobId, completedDays });
    res.json(completedDays);
  } catch (err) {
    console.error("Error fetching career progress:", err);
    res.status(500).json({ error: "Failed to retrieve progress." });
  }
});

// Summer Progress Endpoints
app.post("/summer-progress", async (req, res) => {
  const { email, category, jobId, dayNumber } = req.body;
  console.log("Received summer progress data:", { email, category, jobId, dayNumber });

  if (!email || !category || !jobId || !dayNumber) {
    console.error("Invalid input:", { email, category, jobId, dayNumber });
    return res.status(400).json({ error: "Valid email, category, jobId, and dayNumber are required." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error("Invalid email format:", email);
    return res.status(400).json({ error: "Invalid email format." });
  }

  try {
    const checkUserQuery = "SELECT * FROM users WHERE email = ?";
    const [userResults] = await pool.query(checkUserQuery, [email]);
    if (userResults.length === 0) {
      console.error("User does not exist:", email);
      return res.status(400).json({ error: "User does not exist." });
    }

    const getProgressQuery = "SELECT completed_days FROM summer_progress WHERE email = ? AND category = ? AND job_id = ?";
    const [progressResults] = await pool.query(getProgressQuery, [email, category, jobId]);

    let completedDays = [];
    if (progressResults.length > 0 && progressResults[0].completed_days) {
      try {
        completedDays = JSON.parse(progressResults[0].completed_days);
        if (!Array.isArray(completedDays)) {
          completedDays = [];
        }
      } catch (parseError) {
        console.error("Error parsing completed_days:", parseError);
        completedDays = [];
      }
    }

    if (!completedDays.includes(dayNumber)) {
      completedDays.push(dayNumber);
      completedDays.sort((a, b) => a - b);
    } else {
      completedDays = completedDays.filter(day => day !== dayNumber);
    }

    const updateProgressQuery = `
      INSERT INTO summer_progress (email, category, job_id, completed_days)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE completed_days = ?
    `;
    const completedDaysStr = JSON.stringify(completedDays);
    await pool.query(updateProgressQuery, [email, category, jobId, completedDaysStr, completedDaysStr]);

    console.log("Summer progress saved:", { email, category, jobId, completedDays });
    res.status(200).json({ success: true, completedDays });
  } catch (err) {
    console.error("Error saving summer progress:", err);
    res.status(500).json({ error: "Failed to save progress.", details: err.message });
  }
});

app.get("/summer-progress/:email/:category/:jobId", async (req, res) => {
  const { email, category, jobId } = req.params;
  console.log("Fetching summer progress for:", { email, category, jobId });

  if (!email || !category || !jobId) {
    console.error("Invalid input:", { email, category, jobId });
    return res.status(400).json({ error: "Valid email, category, and jobId are required." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error("Invalid email format:", email);
    return res.status(400).json({ error: "Invalid email format." });
  }

  try {
    const checkUserQuery = "SELECT * FROM users WHERE email = ?";
    const [userResults] = await pool.query(checkUserQuery, [email]);
    if (userResults.length === 0) {
      console.error("User does not exist:", email);
      return res.status(400).json({ error: "User does not exist." });
    }

    const getProgressQuery = "SELECT completed_days FROM summer_progress WHERE email = ? AND category = ? AND job_id = ?";
    const [progressResults] = await pool.query(getProgressQuery, [email, category, jobId]);

    if (progressResults.length === 0 || !progressResults[0].completed_days) {
      console.log("No summer progress for:", { email, category, jobId });
      return res.json([]);
    }

    let completedDays;
    try {
      completedDays = JSON.parse(progressResults[0].completed_days);
      if (!Array.isArray(completedDays)) {
        completedDays = [];
      }
    } catch (parseError) {
      console.error("Error parsing completed_days:", parseError);
      completedDays = [];
      return res.json([]);
    }

    console.log("Summer progress retrieved:", { email, category, jobId, completedDays });
    res.json(completedDays);
  } catch (err) {
    console.error("Error fetching summer progress:", err);
    res.status(500).json({ error: "Failed to retrieve progress." });
  }
});

// Summer Content and Video Endpoints
app.get('/api/summer/content/:category/:day_number', async (req, res) => {
  const { category, day_number } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT topic, resource_link, project_link FROM summer_content WHERE category = ? AND day_number = ?',
      [category, day_number]
    );
    if (rows.length === 0) {
      console.warn(`Summer content not found for category ${category}, day ${day_number}`);
      return res.json({
        topic: '',
        resource_link: '',
        project_link: ''
      });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching summer content:', err.message);
    res.status(500).json({ error: 'Failed to fetch content: ' + err.message });
  }
});
app.put('/api/admin/summer/content/:day_number', async (req, res) => {
  const { day_number } = req.params;
  const { category, topic, resource_link, project_link } = req.body;
  try {
    await pool.query(
      'INSERT INTO summer_content (category, day_number, topic, resource_link, project_link) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE topic = ?, resource_link = ?, project_link = ?',
      [category, day_number, topic, resource_link, project_link, topic, resource_link, project_link]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating summer content:', err.message);
    res.status(500).json({ error: 'Failed to update summer content: ' + err.message });
  }
});

app.get('/api/admin/summer/content/:day_number', async (req, res) => {
  const { day_number } = req.params;
  try {
    const [content] = await pool.query('SELECT topic, resource_link, project_link FROM summer_content WHERE category = ? AND day_number = ?', ['summer', day_number]);
    const [videos] = await pool.query('SELECT youtube_id, language FROM summer_videos WHERE category = ? AND day_number = ?', ['summer', day_number]);
    res.json({ day: content[0] || {}, videos });
  } catch (err) {
    console.error('Error fetching summer content:', err.message);
    res.status(500).json({ error: 'Failed to fetch summer content: ' + err.message });
  }
});
app.get('/api/admin/summer/content/summer', async (req, res) => {
  try {
    const [days] = await pool.query('SELECT day_number FROM summer_content WHERE category = ? ORDER BY day_number', ['summer']);
    res.json(days || []); // Always return an array
  } catch (err) {
    console.error('Error fetching summer days:', err.message);
    res.status(500).json({ error: 'Failed to fetch summer days: ' + err.message });
  }
});

app.get('/api/summer/video/:category/:day_number/:language', async (req, res) => {
  const { category, day_number, language } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT youtube_id FROM summer_videos WHERE category = ? AND day_number = ? AND language = ?',
      [category, day_number, language]
    );
    if (rows.length === 0) {
      console.log(`No video found for category ${category}, day ${day_number}, language ${language}`);
      return res.json({ youtube_id: '' });
    }
    res.json({ youtube_id: rows[0].youtube_id });
  } catch (err) {
    console.error('Error fetching summer video:', err.message);
    res.status(500).json({ error: 'Failed to fetch video: ' + err.message });
  }
});

// Routes for pages
app.get("/course-select", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "CourseSelect.htm"));
});

app.get("/class1-5", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "class1-5.htm"));
});

app.get("/class6-10", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "class6-10.htm"));
});

app.get("/summer", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "summer.htm"));
});

app.get("/class11-12", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "class11-12.htm"));
});

app.get("/grad", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "grad.htm"));
});

// Poll Feedback Endpoints
app.post("/submit-poll", async (req, res) => {
  const { voteType, reason } = req.body;
  const query = "INSERT INTO poll_feedback (vote_type, reason) VALUES (?, ?)";
  try {
    await pool.query(query, [voteType, reason]);
    res.json({ message: "Feedback submitted successfully!" });
  } catch (err) {
    console.error("Error submitting feedback:", err);
    res.status(500).json({ error: "Failed to submit feedback." });
  }
});

app.get("/poll-counts", async (req, res) => {
  const query = `
    SELECT 
      SUM(CASE WHEN vote_type = 'like' THEN 1 ELSE 0 END) AS likeCount,
      SUM(CASE WHEN vote_type = 'dislike' THEN 1 ELSE 0 END) AS dislikeCount
    FROM poll_feedback
  `;
  try {
    const [result] = await pool.query(query);
    res.json(result[0]);
  } catch (err) {
    console.error("Error fetching poll counts:", err);
    res.status(500).json({ error: "Failed to fetch poll counts." });
  }
});

// Progress Endpoints
app.post("/progress", async (req, res) => {
  const { email, classNumber, dayNumber } = req.body;

  // Input validation
  if (!email || !classNumber || !dayNumber) {
    console.error("Invalid input:", { email, classNumber, dayNumber });
    return res.status(400).json({ error: "Valid email, classNumber, and dayNumber are required." });
  }

  try {
    // Check if user exists
    const checkUserQuery = "SELECT * FROM users WHERE email = ?";
    const [userResults] = await pool.query(checkUserQuery, [email]);
    if (userResults.length === 0) {
      console.error("User does not exist:", email);
      return res.status(400).json({ error: "User does not exist." });
    }

    // Fetch existing progress
    const getProgressQuery = "SELECT completed_days FROM user_progress WHERE email = ? AND class_number = ?";
    const [progressResults] = await pool.query(getProgressQuery, [email, classNumber]);

    let completedDays = [];
    if (progressResults.length > 0 && progressResults[0].completed_days) {
      try {
        completedDays = JSON.parse(progressResults[0].completed_days);
        if (!Array.isArray(completedDays)) {
          completedDays = [];
        }
      } catch (parseError) {
        console.error("Error parsing completed_days:", parseError);
        completedDays = [];
      }
    }

    // Add new day if not already completed
    if (!completedDays.includes(dayNumber)) {
      completedDays.push(dayNumber);
      completedDays.sort((a, b) => a - b); // Sort numerically
    }

    // Update or insert progress
    const updateProgressQuery = `
      INSERT INTO user_progress (email, class_number, completed_days)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE completed_days = ?
    `;
    const completedDaysStr = JSON.stringify(completedDays);
    await pool.query(updateProgressQuery, [email, classNumber, completedDaysStr, completedDaysStr]);

    console.log("Progress saved:", { email, classNumber, dayNumber });
    res.status(200).json({ success: true, completedDays });
  } catch (err) {
    console.error("Error saving progress:", err);
    res.status(500).json({ error: "Failed to save progress.", details: err.message });
  }
});

app.get("/progress/:email/:classNumber", async (req, res) => {
  const { email, classNumber } = req.params;

  if (!email || !classNumber) {
    console.error("Invalid input:", { email, classNumber });
    return res.status(400).json({ error: "Valid email and classNumber are required." });
  }

  try {
    const checkUserQuery = "SELECT * FROM users WHERE email = ?";
    const [userResults] = await pool.query(checkUserQuery, [email]);
    if (userResults.length === 0) {
      console.error("User does not exist:", email);
      return res.status(400).json({ error: "User does not exist." });
    }

    const getProgressQuery = "SELECT completed_days FROM user_progress WHERE email = ? AND class_number = ?";
    const [progressResults] = await pool.query(getProgressQuery, [email, classNumber]);

    if (progressResults.length === 0 || !progressResults[0].completed_days) {
      console.log("No progress found for:", { email, classNumber });
      return res.json([]);
    }

    let completedDays;
    try {
      completedDays = JSON.parse(progressResults[0].completed_days);
      if (!Array.isArray(completedDays)) {
        completedDays = [];
      }
    } catch (parseError) {
      console.error("Error parsing completed_days:", parseError);
      completedDays = [];
    }

    console.log("Progress retrieved:", { email, classNumber, completedDays });
    res.json(completedDays);
  } catch (err) {
    console.error("Error fetching progress:", err);
    res.status(500).json({ error: "Failed to retrieve progress." });
  }
});

// Submit game result
app.post("/game-result", async (req, res) => {
  const { email, game, result } = req.body; // result: 'win' or 'loss'

  if (!email || !game || !['win', 'loss'].includes(result)) {
    return res.status(400).json({ message: "Email, game, and valid result are required." });
  }

  try {
    const [user] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (!user.length) {
      return res.status(404).json({ message: "User not found." });
    }

    const scoreChange = result === 'win' ? 10 : -5;
    const updateQuery = `
      INSERT INTO game_leaderboard (email, game, score)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        score = score + ?,
        last_updated = CURRENT_TIMESTAMP
    `;
    await pool.query(updateQuery, [email, game, scoreChange, scoreChange]);

    res.json({ message: "Game result submitted successfully!" });
  } catch (err) {
    console.error("Game result error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Fetch leaderboard for a game
app.get("/leaderboard/:game", async (req, res) => {
  const { game } = req.params;

  try {
    const query = `
      SELECT u.name, g.score
      FROM game_leaderboard g
      JOIN users u ON g.email = u.email
      WHERE g.game = ?
      ORDER BY g.score DESC
      LIMIT 10
    `;
    const [results] = await pool.query(query, [game]);
    res.json(results);
  } catch (err) {
    console.error("Leaderboard fetch error:", err);
    res.status(500).json({ message: "Failed to fetch leaderboard." });
  }
});

// Create a new competition (admin route, can be called monthly)
app.post("/competitions", async (req, res) => {
  const { game, month, start_date, end_date } = req.body;

  if (!game || !month || !start_date || !end_date) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const insertQuery = `
      INSERT INTO competitions (game, month, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    const status = new Date(start_date) <= new Date() && new Date(end_date) >= new Date() ? 'ongoing' : 'upcoming';
    await pool.query(insertQuery, [game, month, start_date, end_date, status]);
    res.json({ message: "Competition created successfully!" });
  } catch (err) {
    console.error("Competition creation error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Join a competition
app.post("/competitions/join", async (req, res) => {
  const { email, competition_id } = req.body;

  if (!email || !competition_id) {
    return res.status(400).json({ message: "Email and competition ID are required." });
  }

  try {
    const [user] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (!user.length) {
      return res.status(404).json({ message: "User not found." });
    }

    const [competition] = await pool.query("SELECT * FROM competitions WHERE id = ?", [competition_id]);
    if (!competition.length || competition[0].status !== 'ongoing') {
      return res.status(400).json({ message: "Competition not available." });
    }

    const insertQuery = `
      INSERT INTO competition_participants (competition_id, email)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE joined_at = CURRENT_TIMESTAMP
    `;
    await pool.query(insertQuery, [competition_id, email]);
    res.json({ message: "Joined competition successfully!" });
  } catch (err) {
    console.error("Join competition error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Submit competition game result
app.post("/competition-result", async (req, res) => {
  const { email, competition_id, result } = req.body; // result: 'win' or 'loss'

  if (!email || !competition_id || !['win', 'loss'].includes(result)) {
    return res.status(400).json({ message: "Email, competition ID, and valid result are required." });
  }

  try {
    const [participant] = await pool.query(
      "SELECT * FROM competition_participants WHERE competition_id = ? AND email = ?",
      [competition_id, email]
    );
    if (!participant.length) {
      return res.status(400).json({ message: "User not enrolled in this competition." });
    }

    const scoreChange = result === 'win' ? 10 : -5;
    const updateQuery = `
      UPDATE competition_participants
      SET score = score + ?
      WHERE competition_id = ? AND email = ?
    `;
    await pool.query(updateQuery, [scoreChange, competition_id, email]);
    res.json({ message: "Competition result submitted successfully!" });
  } catch (err) {
    console.error("Competition result error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Fetch competition leaderboard
app.get("/competition/:id/leaderboard", async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT u.name, c.score
      FROM competition_participants c
      JOIN users u ON c.email = u.email
      WHERE c.competition_id = ?
      ORDER BY c.score DESC
      LIMIT 10
    `;
    const [results] = await pool.query(query, [id]);
    res.json(results);
  } catch (err) {
    console.error("Competition leaderboard fetch error:", err);
    res.status(500).json({ message: "Failed to fetch competition leaderboard." });
  }
});

// Fetch ongoing and upcoming competitions
app.get("/competitions", async (req, res) => {
  try {
    const query = `
      SELECT id, game, month, start_date, end_date, status
      FROM competitions
      WHERE status IN ('ongoing', 'upcoming')
      ORDER BY start_date ASC
    `;
    const [results] = await pool.query(query);
    res.json(results);
  } catch (err) {
    console.error("Competitions fetch error:", err);
    res.status(500).json({ message: "Failed to fetch competitions." });
  }
});

// Admin Routes
app.get('/api/admin/sections', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sections');
    if (rows.length === 0) {
      console.warn('Sections table is empty');
      return res.status(404).json({ error: 'No sections found' });
    }
    console.log('Fetched sections:', rows);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching sections:', err);
    res.status(500).json({ error: `Failed to fetch sections: ${err.message}` });
  }
});

app.get('/api/admin/classes/:section_id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM classes WHERE section_id = ?', [req.params.section_id]);
    console.log(`Fetched classes for section ${req.params.section_id}:`, rows);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching classes:', err.message);
    res.status(500).json({ error: 'Failed to fetch classes: ' + err.message });
  }
});

app.get('/api/admin/days/:class_id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM days WHERE class_id = ? ORDER BY day_number', [req.params.class_id]);
    console.log(`Fetched days for class ${req.params.class_id}:`, rows);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching days:', err.message);
    res.status(500).json({ error: 'Failed to fetch days: ' + err.message });
  }
});

app.get('/api/admin/content/:day_id', async (req, res) => {
  try {
    const [day] = await pool.query('SELECT * FROM days WHERE id = ?', [req.params.day_id]);
    const [videos] = await pool.query('SELECT * FROM videos WHERE day_id = ?', [req.params.day_id]);
    console.log(`Fetched content for day ${req.params.day_id}:`, { day: day[0], videos });
    res.json({ day: day[0] || {}, videos });
  } catch (err) {
    console.error('Error fetching content:', err.message);
    res.status(500).json({ error: 'Failed to fetch content: ' + err.message });
  }
});

app.put('/api/admin/day/:day_id', async (req, res) => {
  const { topic, quiz_link, project_link } = req.body;
  try {
    await pool.query('UPDATE days SET topic = ?, quiz_link = ?, project_link = ? WHERE id = ?', [topic, quiz_link, project_link, req.params.day_id]);
    console.log(`Updated day ${req.params.day_id}:`, { topic, quiz_link, project_link });
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating day:', err.message);
    res.status(500).json({ error: 'Failed to update day: ' + err.message });
  }
});

app.post('/api/admin/video/:day_id/:language', async (req, res) => {
  const { day_id, language } = req.params;
  let { youtube_link } = req.body;

  // Extract video ID if full URL is provided
  if (youtube_link.includes('youtube.com/embed/')) {
    const urlParts = youtube_link.split('youtube.com/embed/');
    youtube_link = urlParts[1].split('?')[0]; // Get VIDEO_ID
  } else if (youtube_link.includes('youtu.be/') || youtube_link.includes('youtube.com/watch')) {
    const url = new URL(youtube_link.includes('youtu.be') ? youtube_link.replace('youtu.be/', 'youtube.com/watch?v=') : youtube_link);
    youtube_link = url.searchParams.get('v') || youtube_link; // Extract video ID or keep as is
  }

  try {
    const [existingVideos] = await pool.query(
      'SELECT * FROM videos WHERE day_id = ? AND language = ?',
      [day_id, language]
    );

    if (existingVideos.length > 0) {
      await pool.query(
        'UPDATE videos SET youtube_id = ? WHERE day_id = ? AND language = ?',
        [youtube_link, day_id, language]
      );
    } else {
      await pool.query(
        'INSERT INTO videos (day_id, language, youtube_id) VALUES (?, ?, ?)',
        [day_id, language, youtube_link]
      );
    }

    console.log(`Saved video for day ${day_id}, language ${language}: ${youtube_link}`);
    res.json({ message: 'Video saved successfully' });
  } catch (err) {
    console.error('Error saving video:', err.message);
    res.status(500).json({ error: 'Failed to save video: ' + err.message });
  }
});

app.post('/api/admin/day', async (req, res) => {
  const { class_id, day_number } = req.body;
  if (!class_id || !day_number) {
    return res.status(400).json({ error: 'class_id and day_number are required' });
  }
  try {
    // Check if day_number already exists for the class
    const [existing] = await pool.query('SELECT * FROM days WHERE class_id = ? AND day_number = ?', [class_id, day_number]);
    if (existing.length > 0) {
      return res.status(409).json({ error: `Day ${day_number} already exists for this class` });
    }
    const [result] = await pool.query('INSERT INTO days (class_id, day_number) VALUES (?, ?)', [class_id, day_number]);
    console.log(`Added new day ${day_number} for class ${class_id}`);
    res.json({ id: result.insertId, day_number });
  } catch (err) {
    console.error('Error adding day:', err.message);
    res.status(500).json({ error: 'Failed to add day: ' + err.message });
  }
});

// User Content Routes (for frontend integration)
app.get('/api/content/:class_number/:day_number', async (req, res) => {
  const { class_number, day_number } = req.params;
  let sectionName, className;

  // Map class_number to section and class name
  if (class_number >= 1 && class_number <= 5) {
    sectionName = 'class1-5';
    className = `Class ${class_number}`;
  } else if (class_number >= 6 && class_number <= 10) {
    sectionName = 'class6-10';
    className = `Class ${class_number}`;
  } else if (class_number == 11 || class_number == 12) {
    sectionName = 'class11-12';
    className = `Class ${class_number}`;
  } else if (class_number === 'grad') {
    sectionName = 'grad';
    className = 'Graduation';
  } else if (class_number === 'life') {
    sectionName = 'life';
    className = 'Life Beyond Academics';
  } else if (class_number === 'summer') {
    sectionName = 'summer';
    className = 'Summer Special';
  } else {
    return res.status(400).json({ error: 'Invalid class number' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT d.* FROM days d
       JOIN classes c ON d.class_id = c.id
       JOIN sections s ON c.section_id = s.id
       WHERE s.name = ? AND c.name = ? AND d.day_number = ?`,
      [sectionName, className, day_number]
    );
    if (rows.length === 0) {
      console.error(`Content not found: section='${sectionName}', class='${className}', day=${day_number}. Check DB names match exactly.`);
      return res.json({
        topic: `${className} - Day ${day_number}`,
        quiz_link: '',
        project_link: ''
      });
    }
    console.log(`Fetched content for class ${class_number}, day ${day_number}:`, rows[0]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching content:', err.message);
    res.status(500).json({ error: 'Failed to fetch content: ' + err.message });
  }
});

app.get('/api/video/:class_number/:day_number/:language', async (req, res) => {
  const { class_number, day_number, language } = req.params;
  let sectionName, className;

  // Map class_number to section and class name
  if (class_number >= 1 && class_number <= 5) {
    sectionName = 'class1-5';
    className = `Class ${class_number}`;
  } else if (class_number >= 6 && class_number <= 10) {
    sectionName = 'class6-10';
    className = `Class ${class_number}`;
  } else if (class_number == 11 || class_number == 12) {
    sectionName = 'class11-12';
    className = `Class ${class_number}`;
  } else if (class_number === 'grad') {
    sectionName = 'grad';
    className = 'Graduation';
  } else if (class_number === 'life') {
    sectionName = 'life';
    className = 'Life Beyond Academics';
  } else if (class_number === 'summer') {
    sectionName = 'summer';
    className = 'Summer Special';
  } else {
    return res.status(400).json({ error: 'Invalid class number' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT v.youtube_id FROM videos v
       JOIN days d ON v.day_id = d.id
       JOIN classes c ON d.class_id = c.id
       JOIN sections s ON c.section_id = s.id
       WHERE s.name = ? AND c.name = ? AND d.day_number = ? AND v.language = ?`,
      [sectionName, className, day_number, language]
    );
    if (rows.length === 0) {
      console.log(`No video found for class ${class_number}, day ${day_number}, language ${language}`);
      return res.json({ youtube_id: '' });
    }
    res.json({ youtube_id: rows[0].youtube_id });
  } catch (err) {
    console.error('Error fetching video:', err.message);
    res.status(500).json({ error: 'Failed to fetch video: ' + err.message });
  }
});


// New endpoint to save Summer Special videos
app.post('/api/admin/summer/video/:day_number/:language', async (req, res) => {
  const { day_number, language } = req.params;
  let { youtube_link } = req.body;

  // Extract YouTube video ID
  if (youtube_link.includes('youtube.com/embed/')) {
    youtube_link = youtube_link.split('youtube.com/embed/')[1].split('?')[0];
  } else if (youtube_link.includes('youtu.be/') || youtube_link.includes('youtube.com/watch')) {
    const url = new URL(youtube_link.includes('youtu.be') ? youtube_link.replace('youtu.be/', 'youtube.com/watch?v=') : youtube_link);
    youtube_link = url.searchParams.get('v') || youtube_link;
  }

  try {
    const [existingVideos] = await pool.query(
      'SELECT * FROM summer_videos WHERE category = ? AND day_number = ? AND language = ?',
      ['summer', day_number, language]
    );

    if (existingVideos.length > 0) {
      await pool.query(
        'UPDATE summer_videos SET youtube_id = ? WHERE category = ? AND day_number = ? AND language = ?',
        [youtube_link, 'summer', day_number, language]
      );
    } else {
      await pool.query(
        'INSERT INTO summer_videos (category, day_number, language, youtube_id) VALUES (?, ?, ?, ?)',
        ['summer', day_number, language, youtube_link]
      );
    }
    res.json({ message: 'Summer video saved successfully' });
  } catch (err) {
    console.error('Error saving summer video:', err.message);
    res.status(500).json({ error: 'Failed to save summer video: ' + err.message });
  }
});

app.post('/api/admin/summer/day', async (req, res) => {
  const { category, day_number } = req.body;
  if (!category || !day_number) {
    return res.status(400).json({ error: 'category and day_number are required' });
  }
  if (day_number > 25) {
    return res.status(400).json({ error: 'Maximum 25 days allowed for Summer Special' });
  }
  try {
    const [existing] = await pool.query('SELECT * FROM summer_content WHERE category = ? AND day_number = ?', [category, day_number]);
    if (existing.length > 0) {
      return res.status(409).json({ error: `Day ${day_number} already exists for category ${category}` });
    }
    const [result] = await pool.query('INSERT INTO summer_content (category, day_number) VALUES (?, ?)', [category, day_number]);
    console.log(`Added new summer day: category=${category}, day_number=${day_number}`);
    res.json({ id: result.insertId, day_number });
  } catch (err) {
    console.error('Error adding summer day:', err.message);
    res.status(500).json({ error: 'Failed to add summer day: ' + err.message });
  }
});



// New endpoints for categories, jobs, skills, and learning paths
app.get('/api/categories/:section_id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories WHERE section_id = ?', [req.params.section_id]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching categories:', err.message);
    res.status(500).json({ error: 'Failed to fetch categories: ' + err.message });
  }
});

app.get('/api/jobs/:category_id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM jobs WHERE category_id = ?', [req.params.category_id]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching jobs:', err.message);
    res.status(500).json({ error: 'Failed to fetch jobs: ' + err.message });
  }
});

app.get('/api/skills/:job_id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM skills WHERE job_id = ?', [req.params.job_id]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching skills:', err.message);
    res.status(500).json({ error: 'Failed to fetch skills: ' + err.message });
  }
});

app.get('/api/learning_path/:skill_id/:day_number', async (req, res) => {
  const { skill_id, day_number } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM learning_path_days WHERE skill_id = ? AND day_number = ?',
      [skill_id, day_number]
    );
    if (rows.length === 0) {
      return res.json({
        topic: `Day ${day_number}`,
        material_link: '',
        exercise_link: '',
        project_link: ''
      });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching learning path:', err.message);
    res.status(500).json({ error: 'Failed to fetch learning path: ' + err.message });
  }
});

app.get('/api/learning_path/video/:skill_id/:day_number/:language', async (req, res) => {
  const { skill_id, day_number, language } = req.params;
  try {
    const [day] = await pool.query(
      'SELECT id FROM learning_path_days WHERE skill_id = ? AND day_number = ?',
      [skill_id, day_number]
    );
    if (day.length === 0) {
      return res.json({ youtube_id: '' });
    }
    const [rows] = await pool.query(
      'SELECT youtube_id FROM learning_path_videos WHERE learning_path_day_id = ? AND language = ?',
      [day[0].id, language]
    );
    if (rows.length === 0) {
      return res.json({ youtube_id: '' });
    }
    res.json({ youtube_id: rows[0].youtube_id });
  } catch (err) {
    console.error('Error fetching video:', err.message);
    res.status(500).json({ error: 'Failed to fetch video: ' + err.message });
  }
});

app.post('/api/career-progress1', async (req, res) => {
  const { email, category_id, job_id, skill_id, day_number } = req.body;
  if (!email || !category_id || !job_id || !skill_id || !day_number) {
    return res.status(400).json({ error: 'Valid email, category_id, job_id, skill_id, and day_number are required.' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }
  try {
    const [userResults] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (userResults.length === 0) {
      return res.status(400).json({ error: 'User does not exist.' });
    }
    const [progressResults] = await pool.query(
      'SELECT completed_days FROM career_progress1 WHERE email = ? AND category_id = ? AND job_id = ? AND skill_id = ?',
      [email, category_id, job_id, skill_id]
    );
    let completedDays = [];
    if (progressResults.length > 0 && progressResults[0].completed_days) {
      completedDays = JSON.parse(progressResults[0].completed_days) || [];
    }
    if (!completedDays.includes(day_number)) {
      completedDays.push(day_number);
      completedDays.sort((a, b) => a - b);
    }
    const completedDaysStr = JSON.stringify(completedDays);
    await pool.query(
      'INSERT INTO career_progress1 (email, category_id, job_id, skill_id, completed_days) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE completed_days = ?',
      [email, category_id, job_id, skill_id, completedDaysStr, completedDaysStr]
    );
    res.status(200).json({ success: true, completedDays });
  } catch (err) {
    console.error('Error saving career progress:', err);
    res.status(500).json({ error: 'Failed to save progress.', details: err.message });
  }
});

app.get('/api/career-progress1/:email/:category_id/:job_id/:skill_id', async (req, res) => {
  const { email, category_id, job_id, skill_id } = req.params;
  if (!email || !category_id || !job_id || !skill_id) {
    return res.status(400).json({ error: 'Valid email, category_id, job_id, and skill_id are required.' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }
  try {
    const [userResults] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (userResults.length === 0) {
      return res.status(400).json({ error: 'User does not exist.' });
    }
    const [progressResults] = await pool.query(
      'SELECT completed_days FROM career_progress1 WHERE email = ? AND category_id = ? AND job_id = ? AND skill_id = ?',
      [email, category_id, job_id, skill_id]
    );
    if (progressResults.length === 0 || !progressResults[0].completed_days) {
      return res.json([]);
    }
    let completedDays = JSON.parse(progressResults[0].completed_days) || [];
    res.json(completedDays);
  } catch (err) {
    console.error('Error fetching career progress:', err);
    res.status(500).json({ error: 'Failed to retrieve progress.' });
  }
});

// Admin routes for managing content
// Updates to app.js (server-side)

// Remove day_number limit check in POST /api/admin/learning_path/day (for point 1)
app.post('/api/admin/learning_path/day', async (req, res) => {
  const { skill_id, day_number, topic, material_link, exercise_link, project_link } = req.body;
  if (!skill_id || !day_number) {
    return res.status(400).json({ error: 'skill_id and day_number are required' });
  }
  try {
    const [existing] = await pool.query('SELECT * FROM learning_path_days WHERE skill_id = ? AND day_number = ?', [skill_id, day_number]);
    if (existing.length > 0) {
      return res.status(409).json({ error: `Day ${day_number} already exists for this skill` });
    }
    // Preserve provided topic exactly when non-empty; otherwise default to 'Day X'
    const topicToStore = (typeof topic === 'string' && topic.trim() !== '') ? topic.trim() : `Day ${day_number}`;
    const [result] = await pool.query(
      'INSERT INTO learning_path_days (skill_id, day_number, topic, material_link, exercise_link, project_link) VALUES (?, ?, ?, ?, ?, ?)',
      [skill_id, day_number, topicToStore, material_link || '', exercise_link || '', project_link || '']
    );
    res.json({ id: result.insertId, skill_id, day_number, topic: topicToStore, material_link: material_link || '', exercise_link: exercise_link || '', project_link: project_link || '' });
  } catch (err) {
    console.error('Error adding learning path day:', err.message);
    res.status(500).json({ error: 'Failed to add day: ' + err.message });
  }
});

app.delete('/api/admin/learning_path/day/:day_id', async (req, res) => {
  const { day_id } = req.params;
  try {
    const [existing] = await pool.query('SELECT * FROM learning_path_days WHERE id = ?', [day_id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: `Day with ID ${day_id} not found` });
    }
    await pool.query('DELETE FROM learning_path_videos WHERE learning_path_day_id = ?', [day_id]);
    await pool.query('DELETE FROM learning_path_days WHERE id = ?', [day_id]);
    res.json({ success: true, message: 'Day deleted successfully' });
  } catch (err) {
    console.error('Error deleting learning path day:', err.message);
    res.status(500).json({ error: 'Failed to delete day: ' + err.message });
  }
});

app.post('/api/admin/learning_path/video/:learning_path_day_id/:language', async (req, res) => {
  const { learning_path_day_id, language } = req.params;
  let { youtube_link } = req.body;

  // Validate input
  if (!learning_path_day_id || !language) {
    console.error('Missing learning_path_day_id or language:', { learning_path_day_id, language });
    return res.status(400).json({ error: 'learning_path_day_id and language are required' });
  }
  if (!youtube_link) {
    console.error('Missing youtube_link for day_id:', learning_path_day_id, 'language:', language);
    return res.status(400).json({ error: 'YouTube link is required' });
  }

  // Extract YouTube video ID
  try {
    if (youtube_link.includes('youtube.com/embed/')) {
      youtube_link = youtube_link.split('youtube.com/embed/')[1].split('?')[0];
    } else if (youtube_link.includes('youtu.be/')) {
      youtube_link = youtube_link.split('youtu.be/')[1].split('?')[0];
    } else if (youtube_link.includes('youtube.com/watch')) {
      const url = new URL(youtube_link);
      youtube_link = url.searchParams.get('v') || youtube_link.split('watch?v=')[1].split('&')[0];
    } else {
      console.error('Invalid YouTube link format:', youtube_link);
      return res.status(400).json({ error: 'Invalid YouTube link format' });
    }
  } catch (err) {
    console.error('Error parsing YouTube link:', err.message, { youtube_link });
    return res.status(400).json({ error: 'Invalid YouTube link format' });
  }

  try {
    // Check if the learning path day exists
    const [existingDay] = await pool.query('SELECT * FROM learning_path_days WHERE id = ?', [learning_path_day_id]);
    if (existingDay.length === 0) {
      console.error('Learning path day not found for day_id:', learning_path_day_id);
      return res.status(404).json({ error: 'Learning path day not found' });
    }

    // Check for existing video
    const [existingVideos] = await pool.query(
      'SELECT * FROM learning_path_videos WHERE learning_path_day_id = ? AND language = ?',
      [learning_path_day_id, language]
    );

    if (existingVideos.length > 0) {
      await pool.query(
        'UPDATE learning_path_videos SET youtube_id = ? WHERE learning_path_day_id = ? AND language = ?',
        [youtube_link, learning_path_day_id, language]
      );
      console.log('Updated video for day_id:', learning_path_day_id, 'language:', language, 'youtube_id:', youtube_link);
      // Return the stored youtube id so frontend can confirm persistence
      return res.json({ success: true, youtube_id: youtube_link });
    } else {
      await pool.query(
        'INSERT INTO learning_path_videos (learning_path_day_id, language, youtube_id) VALUES (?, ?, ?)',
        [learning_path_day_id, language, youtube_link]
      );
      console.log('Inserted video for day_id:', learning_path_day_id, 'language:', language, 'youtube_id:', youtube_link);
      return res.json({ success: true, youtube_id: youtube_link });
    }

    res.json({ success: true, message: 'Video saved successfully' });
  } catch (err) {
    console.error('Error saving video:', err.message, { learning_path_day_id, language, youtube_link });
    res.status(500).json({ error: 'Failed to save video: ' + err.message });
  }
});


// Add to app.js under existing endpoints

// Fetch learning path day by ID
app.get('/api/learning_path/day/:day_id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM learning_path_days WHERE id = ?',
      [req.params.day_id]
    );
    if (rows.length === 0) {
      return res.json({
        topic: '',
        material_link: '',
        exercise_link: '',
        project_link: ''
      });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching learning path day:', err.message);
    res.status(500).json({ error: 'Failed to fetch day: ' + err.message });
  }
});

// Fetch videos for a learning path day
app.get('/api/learning_path/video/day/:day_id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT language, youtube_id FROM learning_path_videos WHERE learning_path_day_id = ?',
      [req.params.day_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching learning path videos:', err.message);
    res.status(500).json({ error: 'Failed to fetch videos: ' + err.message });
  }
});

app.post('/api/learning_path/complete/:day_id', async (req, res) => {
  const { day_id } = req.params;
  const { email, category_id, job_id, skill_id } = req.body;
  if (!email || !category_id || !job_id || !skill_id || !day_id) {
    return res.status(400).json({ error: 'Valid email, category_id, job_id, skill_id, and day_id are required.' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }
  try {
    const [userResults] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (userResults.length === 0) {
      return res.status(400).json({ error: 'User does not exist.' });
    }
    const [dayResults] = await pool.query('SELECT day_number FROM learning_path_days WHERE id = ?', [day_id]);
    if (dayResults.length === 0) {
      return res.status(404).json({ error: 'Day not found.' });
    }
    const day_number = dayResults[0].day_number;
    const [progressResults] = await pool.query(
      'SELECT completed_days FROM career_progress1 WHERE email = ? AND category_id = ? AND job_id = ? AND skill_id = ?',
      [email, category_id, job_id, skill_id]
    );
    let completedDays = [];
    if (progressResults.length > 0 && progressResults[0].completed_days) {
      completedDays = JSON.parse(progressResults[0].completed_days) || [];
    }
    if (!completedDays.includes(day_number)) {
      completedDays.push(day_number);
      completedDays.sort((a, b) => a - b);
    }
    const completedDaysStr = JSON.stringify(completedDays);
    await pool.query(
      'INSERT INTO career_progress1 (email, category_id, job_id, skill_id, completed_days) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE completed_days = ?',
      [email, category_id, job_id, skill_id, completedDaysStr, completedDaysStr]
    );
    res.status(200).json({ success: true, completedDays });
  } catch (err) {
    console.error('Error completing learning path day:', err.message);
    res.status(500).json({ error: 'Failed to complete day: ' + err.message });
  }
});

// Update existing endpoint to support updating learning path day
app.put('/api/admin/learning_path/day/:day_id', async (req, res) => {
  const { day_id } = req.params;
  const { topic, material_link, exercise_link, project_link } = req.body;

  // Validate input
  if (!day_id) {
    console.error('Missing day_id in request');
    return res.status(400).json({ error: 'day_id is required' });
  }
  if (!topic && topic !== '') {
    console.error('Missing topic in request for day_id:', day_id);
    return res.status(400).json({ error: 'Topic is required' });
  }

  try {
    // Check if the day exists
    const [existing] = await pool.query('SELECT * FROM learning_path_days WHERE id = ?', [day_id]);
    if (existing.length === 0) {
      console.error('Day not found for day_id:', day_id);
      return res.status(404).json({ error: 'Day not found' });
    }

    // Build dynamic update query
    // Build updates - allow empty string to clear a field when explicitly provided
    const updates = {};
    const params = [];
    if (topic !== undefined && topic !== null) {
      updates.topic = topic;
      params.push(topic);
    }
    if (material_link !== undefined) {
      updates.material_link = material_link;
      params.push(material_link);
    }
    if (exercise_link !== undefined) {
      updates.exercise_link = exercise_link;
      params.push(exercise_link);
    }
    if (project_link !== undefined) {
      updates.project_link = project_link;
      params.push(project_link);
    }

    if (Object.keys(updates).length === 0) {
      console.log('No fields to update for day_id:', day_id);
      return res.json({ success: true, message: 'No changes to save' });
    }

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    params.push(day_id);

    // Update the day
    const [result] = await pool.query(
      `UPDATE learning_path_days SET ${setClause} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      console.error('No rows updated for day_id:', day_id);
      return res.status(500).json({ error: 'Failed to update day: No rows affected' });
    }

    console.log('Updated learning path day:', { day_id, ...updates });
    res.json({ success: true, message: 'Day updated successfully' });
  } catch (err) {
    console.error('Error updating learning path day:', err.message, { day_id, topic, material_link, exercise_link, project_link });
    res.status(500).json({ error: 'Failed to update day: ' + err.message });
  }
});


// Add these endpoints to your existing backend

// Get videos for a specific day
app.get('/api/admin/videos/:day_id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT language, youtube_id FROM videos WHERE day_id = ?',
      [req.params.day_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching videos:', err.message);
    res.status(500).json({ error: 'Failed to fetch videos: ' + err.message });
  }
});

// Get all sections
app.get('/api/admin/sections', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sections');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching sections:', err.message);
    res.status(500).json({ error: 'Failed to fetch sections: ' + err.message });
  }
});

// Get all classes for a section
app.get('/api/admin/classes/:section_id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM classes WHERE section_id = ?', [req.params.section_id]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching classes:', err.message);
    res.status(500).json({ error: 'Failed to fetch classes: ' + err.message });
  }
});

// Get days for a class
app.get('/api/admin/days/:class_id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM days WHERE class_id = ? ORDER BY day_number', [req.params.class_id]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching days:', err.message);
    res.status(500).json({ error: 'Failed to fetch days: ' + err.message });
  }
});

// Get content for a day
app.get('/api/admin/content/:day_id', async (req, res) => {
  try {
    const [day] = await pool.query('SELECT * FROM days WHERE id = ?', [req.params.day_id]);
    const [videos] = await pool.query('SELECT * FROM videos WHERE day_id = ?', [req.params.day_id]);
    res.json({ day: day[0] || {}, videos });
  } catch (err) {
    console.error('Error fetching content:', err.message);
    res.status(500).json({ error: 'Failed to fetch content: ' + err.message });
  }
});

// Update day content
app.put('/api/admin/day/:day_id', async (req, res) => {
  const { topic, quiz_link, project_link } = req.body;
  try {
    await pool.query('UPDATE days SET topic = ?, quiz_link = ?, project_link = ? WHERE id = ?', [topic, quiz_link, project_link, req.params.day_id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating day:', err.message);
    res.status(500).json({ error: 'Failed to update day: ' + err.message });
  }
});

// Add/update video for a day
app.post('/api/admin/video/:day_id/:language', async (req, res) => {
  const { day_id, language } = req.params;
  let { youtube_link } = req.body;

  // Extract video ID if full URL is provided
  if (youtube_link.includes('youtube.com/embed/')) {
    const urlParts = youtube_link.split('youtube.com/embed/');
    youtube_link = urlParts[1].split('?')[0];
  } else if (youtube_link.includes('youtu.be/') || youtube_link.includes('youtube.com/watch')) {
    const url = new URL(youtube_link.includes('youtu.be') ? youtube_link.replace('youtu.be/', 'youtube.com/watch?v=') : youtube_link);
    youtube_link = url.searchParams.get('v') || youtube_link;
  }

  try {
    const [existingVideos] = await pool.query(
      'SELECT * FROM videos WHERE day_id = ? AND language = ?',
      [day_id, language]
    );

    if (existingVideos.length > 0) {
      await pool.query(
        'UPDATE videos SET youtube_id = ? WHERE day_id = ? AND language = ?',
        [youtube_link, day_id, language]
      );
    } else {
      await pool.query(
        'INSERT INTO videos (day_id, language, youtube_id) VALUES (?, ?, ?)',
        [day_id, language, youtube_link]
      );
    }

    res.json({ message: 'Video saved successfully' });
  } catch (err) {
    console.error('Error saving video:', err.message);
    res.status(500).json({ error: 'Failed to save video: ' + err.message });
  }
});

// Create new day
app.post('/api/admin/day', async (req, res) => {
  const { class_id, day_number } = req.body;
  if (!class_id || !day_number) {
    return res.status(400).json({ error: 'class_id and day_number are required' });
  }
  try {
    const [existing] = await pool.query('SELECT * FROM days WHERE class_id = ? AND day_number = ?', [class_id, day_number]);
    if (existing.length > 0) {
      return res.status(409).json({ error: `Day ${day_number} already exists for this class` });
    }
    const [result] = await pool.query('INSERT INTO days (class_id, day_number) VALUES (?, ?)', [class_id, day_number]);
    res.json({ id: result.insertId, day_number });
  } catch (err) {
    console.error('Error adding day:', err.message);
    res.status(500).json({ error: 'Failed to add day: ' + err.message });
  }
});



// --- Link Validation Feature ---
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Helper function to check URL status
const checkUrlStatus = (url) => {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      const options = {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 5000 // 5 second timeout
      };

      const req = protocol.request(url, options, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve({ status: 'working', code: res.statusCode });
        } else if (res.statusCode === 405) {
          // Method Not Allowed, try GET
          resolve({ status: 'retry_get' });
        } else {
          resolve({ status: 'broken', code: res.statusCode });
        }
      });

      req.on('error', (err) => {
        resolve({ status: 'broken', error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 'broken', error: 'timeout' });
      });

      req.end();
    } catch (error) {
      resolve({ status: 'broken', error: 'invalid_url' });
    }
  });
};

// Helper for GET request (fallback)
const checkUrlStatusGet = (url) => {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      const options = {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 5000
      };

      const req = protocol.request(url, options, (res) => {
        // We just need the headers, so we can destroy the request immediately
        res.resume(); // Consume response data to free up memory
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve({ status: 'working', code: res.statusCode });
        } else {
          resolve({ status: 'broken', code: res.statusCode });
        }
      });

      req.on('error', (err) => {
        resolve({ status: 'broken', error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 'broken', error: 'timeout' });
      });

      req.end();
    } catch (error) {
      resolve({ status: 'broken', error: 'invalid_url' });
    }
  });
};

// Helper function to validate YouTube videos using oEmbed API
const checkYouTubeVideo = (videoUrl) => {
  return new Promise((resolve) => {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
      
      const options = {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 8000
      };

      const req = https.request(oembedUrl, options, (res) => {
        let data = '';
        
        // Collect response data
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          // Check status code
          if (res.statusCode === 404 || res.statusCode >= 400) {
            resolve({ status: 'broken', code: res.statusCode });
            return;
          }

          // Check if response contains valid JSON (video exists)
          try {
            const jsonData = JSON.parse(data);
            // If we get valid JSON with title, video is available
            if (jsonData && jsonData.title) {
              resolve({ status: 'working', code: res.statusCode });
            } else {
              resolve({ status: 'broken', code: res.statusCode });
            }
          } catch (parseError) {
            // If JSON parsing fails, video might be unavailable
            // Check for common error messages
            if (data.includes('Not Found') || data.includes('Private video') || data.includes('unavailable')) {
              resolve({ status: 'broken', code: res.statusCode });
            } else {
              resolve({ status: 'broken', code: res.statusCode });
            }
          }
        });
      });

      req.on('error', (err) => {
        resolve({ status: 'broken', error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 'broken', error: 'timeout' });
      });

      req.end();
    } catch (error) {
      resolve({ status: 'broken', error: 'invalid_url' });
    }
  });
};

// Endpoint to validate links
app.post('/api/validate-link', async (req, res) => {
  const { url, type } = req.body;

  if (!url) {
    return res.json({ status: 'empty' });
  }

  try {
    if (type === 'youtube') {
      // Use specialized YouTube validation
      // url input might be just ID or full URL. Let's handle both.
      let videoUrl = url;
      if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
        videoUrl = `https://www.youtube.com/watch?v=${url}`;
      }

      const result = await checkYouTubeVideo(videoUrl);
      if (result.status === 'working') {
        return res.json({ status: 'working' });
      } else {
        return res.json({ status: 'broken' });
      }
    } else {
      // General link check for quiz and project links
      let result = await checkUrlStatus(url);
      if (result.status === 'retry_get') {
        result = await checkUrlStatusGet(url);
      }
      res.json(result);
    }
  } catch (error) {
    console.error('Link validation error:', error);
    res.json({ status: 'broken', error: error.message });
  }
});
// -----------------------------

const port = 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Please free the port or choose a different one.`);
  } else {
    console.error('Server error:', err.message);
  }
});