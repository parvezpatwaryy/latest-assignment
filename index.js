const express = require('express');
require('dotenv').config();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// DB Collections
const database = client.db("assignmentNine");
const ideasCollection = database.collection("dataall");
const commentsCollection = database.collection("comments");

// DB Connect Function
async function connectDB() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
    console.log("Connected to MongoDB!");
  }
}

// --- API Routes ---

app.get('/', (req, res) => {
  res.send('IdeaVault Server is Running Smoothly!');
});

app.post('/api/ideas', async (req, res) => {
  await connectDB();
  const ideaData = req.body;
  const result = await ideasCollection.insertOne(ideaData);
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
  const id = req.params.id;
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

// ✅ এটা সবচেয়ে জরুরি - Vercel এর জন্য
module.exports = app;