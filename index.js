const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// verify Jwt
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  //  bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.1yov7jc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const informationCollection = client
      .db("languageSchoolDB")
      .collection("informations");
    const cartCollection = client.db("languageSchoolDB").collection("carts");
    const usersCollection = client.db("languageSchoolDB").collection("users");
    const classCollection = client.db("languageSchoolDB").collection("classes");
    const courseCollection = client.db("languageSchoolDB").collection("courses");
    const paymentCollection = client
      .db("languageSchoolDB")
      .collection("payments");

    // jwt
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5h",
      });
      res.send({ token });
    });
    // veryfyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };
    // verifyInstructor
    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "instructor") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    // classes related api

    // app.post('/users',verifyJWT,verifyInstructor, async(req,res)=>{
    //   const courseItem=req.body;
    //   const result= await classCollection.insertOne(courseItem)
    //   res.send(result)
    // })

    // users related api
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // admin
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });
    // instructor
    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
         
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // instructor
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // classes related api
    // app.get("/classes", async (req, res) => {
    //   console.log(req.query.email);
    //   let query = {};
    //   if (req.query?.email) {
    //     query = { email: req.query.email };
    //   }
    //   const result = await classCollection
    //     .find(query)
    //     .sort({ createdAt: 1, price: -1 })
    //     .toArray();
    //   res.send(result);
    // });
    app.get("/classes", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });
    app.post("/classes", verifyJWT, verifyInstructor, async (req, res) => {
      const courseItem = req.body;
      const result = await classCollection.insertOne(courseItem);
      res.send(result);
    });
    // update
    app.patch("/classes/:id", verifyJWT, verifyInstructor, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateCourseData = req.body;
      const courseData = {
        $set: {
          // status:updateCourseData.status,
          image: updateCourseData.image,
          price: updateCourseData.price,
          available_seats: updateCourseData.available_seats,
          course_name: updateCourseData.course_name,
        },
      };
      const result = await classCollection.updateOne(
        filter,
        courseData,
        options
      );
      res.send(result);
    });
    app.patch("/classes/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "approved",
          
        },
      };

      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.patch("/classes/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "deny",
          
        },
      };

      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // informations related api
    app.get("/informations", async (req, res) => {
      const result = await informationCollection.find().toArray();
      res.send(result);
    });

    app.get("/carts", verifyJWT, async (req, res) => {
      const email = req.query.email;

      if (!email) {
        res.send([]);
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(401)
          .send({ error: true, message: "forbidden access" });
      }

      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    // class cart collection api
    app.get("/carts/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.findOne(query);
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });
    // student delete  class
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });
    // create payment intent
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;

      const amount = price * 100;
      console.log("price ,amount", price, amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    //payment related api
    //   app.get("/payments", async (req, res) => {
    //   const result = await paymentCollection.find().toArray();
    //   res.send(result);
    // });
    app.get("/payments", verifyJWT, async (req, res) => {
      const email = req.query.email;
      console.log("email", email);
      if (!email) {
        res.send([]);
      }

      const query = { email: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);

      const query = {
        // _id: { $in: payment.cartItems.map((id) => new ObjectId(id)) },
        _id: { $in: [payment.cartItems] },
      };
      const deleteResult = await cartCollection.deleteMany(query);

      res.send({ insertResult, deleteResult });
    });
  

    // app.get("/payments/:id",verifyJWT, async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const result = await paymentCollection.findOne(query);
    //   res.send(result);
    // });
    app.get("/stats",verifyJWT,verifyInstructor, async (req, res) => {
      const users = await usersCollection.estimatedDocumentCount();
      const Course = await classCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();
      // best way to get a field is to use group and sum oparator

      const payments = await paymentCollection.find().toArray();
      const revenue = payments.reduce((sum, payment) => sum + payment.price, 0);

      res.send({
        users,
        Course,
        orders,
        revenue,
      });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("School is Starting");
});

app.listen(port, () => {
  console.log(`Language Learning School is coming on port ${port}`);
});
