const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const port = process.env.PORT || 5000;


// Middleware's
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://serenity-haven-4f5df.web.app'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.idotoa5.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Custom Middlewares
const gateman = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: 'NOt verified' })
    }
    req.user = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const roomsCollection = client.db("SerenityHavenDB").collection("rooms");
    const reviewsCollection = client.db("SerenityHavenDB").collection("reviews");
    const bookingsCollection = client.db("SerenityHavenDB").collection("bookings");


    // Jwt token api's
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production" ? true : false,
          sameSite: process.env.NODE_ENV === "production" ? 'none' : "strict"
        })
        .send({ Success: true });
    })

    app.post('/logout', async (req, res) => {
      const user = req.body;
      res.clearCookie('token', {
        maxAge: 0,
        secure: process.env.NODE_ENV === "production" ? true : false,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      }).send({ Success: true });
    })

    // Rooms data Api's
    app.get("/rooms", async (req, res) => {
      const sorting = req.query;
      const query = {}

      const options = {
          sort: {
            "price_per_night": sorting?.sort === "asc" ? 1 : -1
          } 
      }
      
      const cursor = roomsCollection.find( query, options );
      const result = await cursor.toArray();
      res.send(result);
    })
    app.get("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await roomsCollection.findOne(query);
      res.send(result);
    })

    app.patch('/rooms/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedData = req.body;
      let updateDoc = {};
      if (Array.isArray(updatedData)) {
        updateDoc = {
          $set: {
            reviews: updatedData
          }
        }
      }
      else {
        updateDoc = {
          $set: {
            quantity: updatedData.Quantity
          }
        }
      };
      console.log(updateDoc);
      const result = await roomsCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // booking's api's
    app.get('/bookings', gateman, async (req, res) => {
      if (req.query.email !== req.user.email) {
        return res.status(403).send({ message: "Forbidden" })
      }
      let queryObj = {};
      if (req.query) {
        queryObj.email = req.query.email;
      }
      const cursor = bookingsCollection.find(queryObj?.email && queryObj);
      const result = await cursor.toArray();
      res.send(result);
    })


    app.post('/bookings', async (req, res) => {
      const info = req.body;
      const result = await bookingsCollection.insertOne(info);
      res.send(result);
    })

    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedBooking = req.body;
      const updateDoc = {
        $set: {
          reservetionDate: updatedBooking.reservetionDate
        }
      };
      const result = await bookingsCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingsCollection.deleteOne(query);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send("Serenity Haven Server is Running");
})

app.listen(port, () => {
  console.log(`Serenity Server is runnig on port: ${port}`);
})
