const express = require('express');
require('dotenv').config();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 8000;
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

async function run() {
  try {
    await client.connect();

    const database = client.db("assignmentNine");
    const ideasCollection = database.collection("dataall");
    const commentsCollection = database.collection("comments");
    app.post('/api/ideas', async (req, res) => {
      try {
        const ideaData = req.body;
        const result = await ideasCollection.insertOne(ideaData);
        res.status(201).send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });
    app.get('/api/trending-ideas', async (req, res) => {
      try {
        const result = await ideasCollection.find().limit(6).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });
    app.get('/api/ideas', async (req, res) => {
      try {
        const { search, category } = req.query;
        let query = {};
        if (search) {
          query.title = { $regex: search, $options: 'i' };
        }
        if (category && category !== 'All') {
          query.category = category;
        }

        const result = await ideasCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });
    app.get('/api/ideas/:id', async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ success: false, message: "Invalid Object ID format" });
        }
        const query = { _id: new ObjectId(id) };
        const result = await ideasCollection.findOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });
    app.get('/api/my-ideas', async (req, res) => {
      try {
        const email = req.query.email;
        const query = { userEmail: email };
        const result = await ideasCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });
    app.put('/api/ideas/:id', async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ success: false, message: "Invalid ID format" });
        }
        const updatedData = req.body;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            title: updatedData.title,
            shortDescription: updatedData.shortDescription,
            detailedDescription: updatedData.detailedDescription,
            category: updatedData.category,
            tags: updatedData.tags,
            imageUrl: updatedData.imageUrl,
            budget: updatedData.budget,
            targetAudience: updatedData.targetAudience,
            problemStatement: updatedData.problemStatement,
            proposedSolution: updatedData.proposedSolution,
          }
        };
        const result = await ideasCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });
    app.delete('/api/ideas/:id', async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ success: false, message: "Invalid ID format" });
        }
        const query = { _id: new ObjectId(id) };
        const result = await ideasCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });
    app.post('/api/comments', async (req, res) => {
      try {
        const comment = req.body;
        comment.timestamp = new Date();
        const result = await commentsCollection.insertOne(comment);
        res.status(201).send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });
    app.get('/api/comments', async (req, res) => {
      try {
        const ideaId = req.query.ideaId;
        const query = { ideaId: ideaId };
        const result = await commentsCollection.find(query).sort({ timestamp: -1 }).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });
    app.get('/api/my-comments', async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) {
          return res.status(400).send({ message: "Email query parameter is required" });
        }
        const query = { userEmail: email };
        const result = await commentsCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });
    app.put('/api/comments/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const { text } = req.body;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = { $set: { text: text, timestamp: new Date() } };
        const result = await commentsCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });
    app.delete('/api/comments/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await commentsCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });
    app.get('/api/my-interactions', async (req, res) => {
      try {
        const email = req.query.email;
        const userComments = await commentsCollection.find({ userEmail: email }).toArray();

        const ideaIds = [...new Set(userComments.map(c => c.ideaId).filter(id => id))];

        if (ideaIds.length === 0) {
          return res.send([]);
        }

        const objectIds = ideaIds.map(id => new ObjectId(id));
        const commentedIdeas = await ideasCollection.find({ _id: { $in: objectIds } }).toArray();
        res.send(commentedIdeas);
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });
    app.get("/api/ideas/count", async (req, res) => {
      try {
        const email = req.query.email;
        const count = await ideasCollection.countDocuments({ userEmail: email });
        res.send({ count });
      } catch (error) {
        res.status(500).send({ message: "Error counting ideas" });
      }
    });
    app.get("/api/comments/count", async (req, res) => {
      try {
        const email = req.query.email;
        const count = await commentsCollection.countDocuments({ userEmail: email });
        res.send({ count });
      } catch (error) {
        res.status(500).send({ message: "Error counting comments" });
      }
    });
    
    // MongoDB Ping Command
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

  } catch (error) {
    console.error("Database connection error:", error);
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('IdeaVault Server is Running Smoothly!');
});


app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});