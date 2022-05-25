const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require("express");
const app = express();
const cors = require("cors")
require("dotenv").config();
const jwt = require("jsonwebtoken")
const port = process.env.PORT || 5000;

// middle ware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.svxxg.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run(){
    try{
        await client.connect();

        const productCollections = client.db("solar_motor").collection("products");
        const reviewCollections = client.db("solar_motor").collection("review");
        const userCollections = client.db("solar_motor").collection("user");

         //registrate user email save in db ...and make jwt
         app.put("/user/:email", async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
              $set: user,
            };
            const result = await userCollections.updateOne(filter, updateDoc, options);
            const token = jwt.sign(
              { email: email },
              process.env.ACCESS_TOKEN_SECRETE,
              { expiresIn: "1h" }
            );
            res.send({ result, token });
          });

        // all products get api
        app.get('/product', async(req,res)=>{
            const query = {}
            const products = await productCollections.find(query).toArray();
            res.send(products)
        })
        // oen product get api
        app.get('/product/:id', async(req,res)=>{
            const id = req.params.id
            const query = {_id:ObjectId(id)}
            const products = await productCollections.findOne(query);
            res.send(products)
        })
        // all review get api
        app.get('/review', async(req,res)=>{
            const query = {}
            const review = await reviewCollections.find(query).toArray();
            res.send(review)
        })

    }finally{
        // await client.close();
    }
}run().catch(console.dir);







app.get('/',(req,res)=>{
    res.send('wellcome to home')
})
app.get('/hello',(req,res)=>{
    res.send('wellcome to hello')
})
app.listen(port,()=>{
    console.log(`server is running at ${port}`)
})