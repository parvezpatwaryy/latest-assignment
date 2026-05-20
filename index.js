const express = require('express');
require('dotenv').config();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const database = client.db("assignmentNine");
const ideasCollection = database.collection("dataall");
const commentsCollection = database.collection("comments");
const usersCollection = database.collection("users"); // ইউজার ডাটাবেস কালেকশন

async function connectDB() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
    console.log("Connected to MongoDB!");
  }
}

// Basic Route
app.get('/', (req, res) => {
  res.send('IdeaVault Server is Running Smoothly!');
});

// --- Social Login Route (আপনার সমস্যার সমাধান) ---
app.post('/api/auth/sign-in/social', async (req, res) => {
  try {
    await connectDB();
    const userData = req.body;
    
    // ইউজার আছে কি না চেক করুন
    const existingUser = await usersCollection.findOne({ email: userData.email });
    if (existingUser) {
      return res.status(200).send({ message: "User already exists", user: existingUser });
    }

    // নতুন ইউজার সেভ করুন
    const result = await usersCollection.insertOne({ ...userData, createdAt: new Date() });
    res.status(201).send({ success: true, insertedId: result.insertedId });
  } catch (error) {
    res.status(500).send({ message: "Server Error", error: error.message });
  }
});

// --- অন্যান্য রুটস ---
app.post('/api/ideas', async (req, res) => {
  await connectDB();
  const result = await ideasCollection.insertOne(req.body);
  res.status(201).send({ success: true, insertedId: result.insertedId });
});

app.get('/api/trending-ideas', async (req, res) => {
  await connectDB();
  const result = await ideasCollection.find().limit(6).toArray();
  res.send(result);
});

app.get('/api/ideas', async (req, res) => {
  await connectDB();
  const { search, category } = req.query;
  let query = {};
  if (search) query.title = { $regex: search, $options: 'i' };
  if (category && category !== 'All') query.category = category;
  const result = await ideasCollection.find(query).toArray();
  res.send(result);
});

app.get('/api/ideas/:id', async (req, res) => {
  await connectDB();
  const { id } = req.params;
  if (!ObjectId.isValid(id)) return res.status(400).send({ message: "Invalid ID" });
  const result = await ideasCollection.findOne({ _id: new ObjectId(id) });
  res.send(result);
});

app.post('/api/comments', async (req, res) => {
  await connectDB();
  const comment = { ...req.body, timestamp: new Date() };
  const result = await commentsCollection.insertOne(comment);
  res.status(201).send({ success: true, insertedId: result.insertedId });
});

// সার্ভার চালু করা (যদি লোকাল হয়)
if (require.main === module) {
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

module.exports = app;