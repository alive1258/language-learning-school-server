const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require('jsonwebtoken');
require("dotenv").config();
const port = process.env.PORT || 5000;



app.use(cors());
app.use(express.json());


// verify Jwt
const verifyJWT=(req,res,next)=>{
  const authorization=req.headers.authorization;
  if(!authorization){
    return res
    .status(401)
    .send({error:true, message:'unauthorized access'})
  }
// token bearer
const token =authorization.split(" ")[1]

jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
if(err){
  return res
.status(401)
.send({error:true, message:'unauthorized access'})

}
req.decoded=decoded;
next()
})


}

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
    await client.connect();

    const informationCollection = client
      .db("languageSchoolDB")
      .collection("informations");
    const cartCollection = client.db("languageSchoolDB").collection("carts");
    const usersCollection = client.db("languageSchoolDB").collection("users");

    // jwt 
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });


    // users related api
    app.get("/users", async (req, res) => {
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

    // informations related api
    app.get("/informations", async (req, res) => {
      const result = await informationCollection.find().toArray();
      res.send(result);
    });

    // class cart collection api
    app.get("/carts", async (req, res) => {
      const email = req.query.email;

      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
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
// const email = 'coderliton@gmail.com';
// const courseItemId = req.body.courseItemId;

// const query ={email:email,courseItemId:courseItemId};
// const scan = await cartCollection.find(query).toArray()

// console.log('scan: '+scan.length)
