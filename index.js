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
        const query = { $or: [{ userEmail: email }, { email: email }] };
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

    // ৭. আইডিয়া ডিলিট করার API
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

    // 💬 ৮. নতুন কমেন্ট পোস্ট করার API
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

    // 💬 ৯. আইডিয়া ডিটেইলস পেজের জন্য সব কমেন্ট লোড করার API
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

    // 💬 ১০. নির্দিষ্ট ইমেইলের সব কমেন্ট ডিরেক্ট খুঁজে বের করার API
    app.get('/api/my-comments', async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) {
          return res.status(400).send({ message: "Email query parameter is required" });
        }
        // ফ্রন্টএন্ড থেকে আসা 'email' এবং 'userEmail' দুই নামেই যেন ডাটা খুঁজে পায় তার চমৎকার ফিক্স
        const query = { $or: [{ email: email }, { userEmail: email }] };
        const result = await commentsCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });

    // ⚙️ ১১. কমেন্ট এডিট করার API
    app.put('/api/comments/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const { text } = req.body;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = { $set: { commentText: text, timestamp: new Date() } };
        const result = await commentsCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });

    // 🗑️ ১২. কমেন্ট ডিলিট করার API (Remove Interaction বাটনের জন্য)
    app.delete('/api/comments/:id', async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ success: false, message: "Invalid ID format" });
        }
        const query = { _id: new ObjectId(id) };
        const result = await commentsCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });

    // 📊 ১৩. My Interactions পেজে ইউজারের করা কমেন্টের কমপ্লিট ডাটা পাঠানোর API [FIXED]
    app.get('/api/my-interactions', async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) {
          return res.status(400).send({ success: false, message: "Email is required" });
        }

        // ডাটাবেজ থেকে এই ইউজারের করা সব কমেন্ট খুঁজে বের করা (উভয় ফিল্ড নেম সাপোর্ট করবে)
        const query = { $or: [{ email: email }, { userEmail: email }] };
        const userComments = await commentsCollection.find(query).toArray();

        // ফ্রন্টএন্ড টেবিলে দেখানোর জন্য কমেন্টের পুরো অবজেক্টটাই সরাসরি রিটার্ন করা হলো
        res.send(userComments);
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });

    // 📈 ১৪. ড্যাশবোর্ডের জন্য আইডিয়া কাউন্ট করার API
    app.get("/api/ideas/count", async (req, res) => {
      try {
        const email = req.query.email;
        const query = { $or: [{ userEmail: email }, { email: email }] };
        const count = await ideasCollection.countDocuments(query);
        res.send({ count });
      } catch (error) {
        res.status(500).send({ message: "Error counting ideas" });
      }
    });

    // 📈 ১৫. ড্যাশবোর্ডের জন্য কমেন্ট কাউন্ট করার API
    app.get("/api/comments/count", async (req, res) => {
      try {
        const email = req.query.email;
        const query = { $or: [{ userEmail: email }, { email: email }] };
        const count = await commentsCollection.countDocuments(query);
        res.send({ count });
      } catch (error) {
        res.status(500).send({ message: "Error counting comments" });
      }
    });


    app.get('/api/trending-ideas', async (req, res) => {
      try {
        // ideasCollection বা আপনার dataall কালেকশন থেকে limit(6) করে ডেটা আনা হচ্ছে
        const result = await ideasCollection.find().limit(6).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching trending ideas:", error);
        res.status(500).send({ success: false, message: "Internal server error" });
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