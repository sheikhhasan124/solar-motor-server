const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require("express");
const app = express();
const cors = require("cors")
require("dotenv").config();
const jwt = require("jsonwebtoken")
const port = process.env.PORT || 5000;
const stripe = require('stripe')(`sk_test_51L2BQ1CJu1xjIM5SOMTE8C8SJdXiU5dhOGQbIeLtoGnPTuSkwryGRGGhcHUGYW8geZcaInEQbi68pMQEsKpmtBJX00edz9kz0F`)

// middle ware
app.use(cors());
app.use(express.json());


// verify jwt is a middleware that controls unexpected user ,,,it check the user is current user by jwt
function verifiJwt(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRETE, function (err, decoded) {
      if (err) {
        return res.status(403).send({ message: "forbidden access" });
      }
      req.decoded = decoded;
      next();
    });
  }
  


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.svxxg.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run(){
    try{
        await client.connect();

        const productCollections = client.db("solar_motor").collection("products");
        const reviewCollections = client.db("solar_motor").collection("review");
        const userCollections = client.db("solar_motor").collection("user");
        const orderCollections = client.db("solar_motor").collection("myOrder");
        const paymentCollections = client.db("solar_motor").collection("payment");
        const userInfCollections = client.db("solar_motor").collection("userInf");


         // verify admin middleware
    const verifyAdmin = async(req,res,next)=>{
      const requester = req.decoded.email;
      const requesterAccount = await userCollections.findOne({ email: requester,});
      if (requesterAccount.role === "admin") {
          next()
      }
      else{
        res.status(403).send({ message: "forbidden" });
      }
    }
       
        //  registrate user email save in db ...and make jwt
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
              { expiresIn: "1d" }
            );
            res.send({ result, token });
          });

                // for user page
        app.get("/user", async (req, res) => {
          const users = await userCollections.find().toArray();
          res.send(users);
        });
        app.get('/user/:email',async(req,res)=>{
          const email = req.params.email;
          const filter = {email:email}
          const result = await userCollections.findOne(filter)
           res.send(result)
        })
          // api for making a user admin and only admin can meke others admin
        app.put("/user/admin/:email", verifiJwt,verifyAdmin, async (req, res) => {
          const email = req.params.email;
          const filter = { email: email };
          const updateDoc = {
            $set: { role: "admin" },
          };
          const result = await userCollections.updateOne(filter, updateDoc);
          res.send(result);
      });
          // api for is login user admin or not
      app.get('/admin/:email',async(req,res)=>{
        const email = req.params.email;
        const user = await userCollections.findOne({email:email});
        const isAdmin = user.role === 'admin';
        res.send({admin:isAdmin})
      })  
        // all products get api
        app.get('/product', async(req,res)=>{
            const query = {}
            const products = await productCollections.find(query).toArray();
            res.send(products)
        })
        app.post('/product', async(req,res)=>{
          const product = req.body
          const result = await productCollections.insertOne(product)
          res.send(result)
        })
        // oen product get api
        app.get('/product/:id', async(req,res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)}
            const products = await productCollections.findOne(query);
            res.send(products)
        })
        // all review get api
        app.get('/review', async(req,res)=>{
            const query = {}
            const review = await reviewCollections.find(query).toArray();
            res.send(review)
        })
        app.post('/review',async(req,res)=>{
            const review = req.body;
            const result = await reviewCollections.insertOne(review)
             res.send({success:true, result})
        })
        app.post('/myOrder',async(req,res)=>{
            const order = req.body;
            const result = await orderCollections.insertOne(order)
             res.send({success:true, result})
        })
        app.get("/myorder",async(req,res)=>{
          const query = {}
          const result = await orderCollections.find(query).toArray()
          res.send(result)
        })
        // get my order by user email
        app.get("/myorder", verifiJwt, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
              const query = { email : email };
              const result = await orderCollections.find(query).toArray();
              res.send(result);
            //   console.log(email)
            } else {
              return res.status(403).send({ message: "forbidden access" });
            }
          });
           // one order
           app.get('/myorder/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const order =await orderCollections.findOne(query)
            res.send(order)
          })

           // update 
    app.patch('/myorder/:id', async(req,res)=>{
      const id = req.params.id;
      const payment = req.body;
      const filter = {_id:ObjectId(id)}
      const updateDoc = {
        $set : {
          paid: true,
          transectionId: payment.transectionId,
          status: payment.status
        }
      }
      const result = await paymentCollections.insertOne(payment)
      const updatedBooking = await orderCollections.updateOne(filter, updateDoc)
      res.send(updateDoc)
    })
    app.patch('/myordershift/:id', async(req,res)=>{
      const id = req.params.id;
      const payment = req.body;
      const filter = {_id:ObjectId(id)}
      const updateDoc = {
        $set : {
          status: payment.status
        }
      }
      
      const updatedBooking = await orderCollections.updateOne(filter, updateDoc)
      res.send(updatedBooking)
    })

           //api fro stripe 
           app.post('/create-payment-intent', async(req,res)=>{
            const service = req.body;
            const price = service.totalPrice;
            const amount = price*100;
            const paymentIntent = await stripe.paymentIntents.create({
              amount : amount,
              currency : 'usd',
              payment_method_types : ['card']
            });
            res.send({clientSecret: paymentIntent.client_secret})
          })
           //for delete
          app.delete('/myorder/:email',verifiJwt,async(req,res)=>{
              const email = req.params.email;
              const filter = {email:email}
              const result = await orderCollections.deleteOne(filter)
              res.send(result)
          })
          app.post('/userinf',async(req,res)=>{
            const inf = req.body
            const result = await userInfCollections.insertOne(inf)
            res.send({success:true, result})
          })
          app.get('/userinf/:email',async(req,res)=>{
             const email = req.params.email;
             const filter = {email:email}
             const result = await userInfCollections.findOne(filter)
             res.send(result)
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