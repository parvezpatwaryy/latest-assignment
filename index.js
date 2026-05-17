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

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    
    const database = client.db("assignmentNine");
    const ideasCollection = database.collection("ideas");
    const commentsCollection = database.collection("comments");

    // ==========================================
    // 💡 IDEAS API ROUTES
    // ==========================================

    // ১. নতুন আইডিয়া ডাটাবেজে যোগ করা
    app.post('/api/ideas', async (req, res) => {
      try {
        const ideaData = req.body;
        const result = await ideasCollection.insertOne(ideaData);
        res.status(201).send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });

    // ২. হোম পেজের জন্য টপ ৬টি ট্রেন্ডিং আইডিয়া নিয়ে আসা
    app.get('/api/trending-ideas', async (req, res) => {
      try {
        const result = await ideasCollection.find().limit(6).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });

    // ৩. সব আইডিয়া নিয়ে আসা (সার্চ এবং ক্যাটাগরি ফিল্টার সহ)
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

    // ৪. আইডিয়া ডিটেইলস দেখার জন্য নির্দিষ্ট একটি আইডিয়া নিয়ে আসা (params ব্যবহার করে)
    app.get('/api/ideas/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await ideasCollection.findOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });

    // ৫. নির্দিষ্ট ইউজারের নিজের সাবমিট করা সব আইডিয়া নিয়ে আসা (Query Email)
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

    // ৬. আইডিয়া আপডেট/এডিট করা (PUT)
    app.put('/api/ideas/:id', async (req, res) => {
      try {
        const id = req.params.id;
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

    // ৭. আইডিয়া ডিলিট করা
    app.delete('/api/ideas/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await ideasCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });

    // ==========================================
    // 💬 COMMENTS & INTERACTIONS API ROUTES
    // ==========================================

    // ৮. নতুন কমেন্ট বা ফিডব্যাক সেভ করা
    app.post('/api/comments', async (req, res) => {
      try {
        const comment = req.body;
        const result = await commentsCollection.insertOne(comment);
        res.status(201).send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });

    // ৯. আইডিয়া ডিটেইলস পেজের জন্য নির্দিষ্ট Idea ID-র সব কমেন্ট নিয়ে আসা (Query Parameter)
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

    // ১০. "My Interactions" পেজের জন্য নির্দিষ্ট ইউজারের করা সব কমেন্ট নিয়ে আসা (Query Email)
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

    // ১১. কমেন্ট আপডেট বা এডিট করা
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

    // ১২. কমেন্ট ডিলিট করা
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

    // ১৩. ইউজার যেসব আইডিয়াতে কমেন্ট করেছে সেই আইডিয়াগুলোর লিস্ট দেখা (ঐচ্ছিক/এডভান্সড)
    app.get('/api/my-interactions', async (req, res) => {
      try {
        const email = req.query.email;
        const userComments = await commentsCollection.find({ userEmail: email }).toArray();
        const ideaIds = [...new Set(userComments.map(c => c.ideaId))];
        const objectIds = ideaIds.map(id => new ObjectId(id));
        const commentedIdeas = await ideasCollection.find({ _id: { $in: objectIds } }).toArray();
        res.send(commentedIdeas);
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
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

// Root Endpoint
app.get('/', (req, res) => {
  res.send('IdeaVault Server is Running Smoothly!');
});

// Server Listener
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});