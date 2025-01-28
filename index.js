require('dotenv').config()
const express = require('express')
const app = express()

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const stripe= require('stripe')(process.env.PAYMENT)
const cors = require('cors');


const port = process.env.PORT || 4000
app.use(cors());
app.use(express.json())




const uri = `mongodb+srv://${process.env.BD_USER}:${process.env.BD_PASS}@cluster0.xpotf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
         const banner_collection = client.db('building').collection('banner')
         const apartment_collection = client.db('building').collection('apartment')
          const apartment_collection_post = client.db('building').collection('Apartmente_colection')
          const users_collection= client.db('building').collection('users')
          const agrement_collection = client.db('building').collection('agrement')
          const payment_collection = client.db('building').collection('payments')
        
        
        
    app.post('/jwt',async(req,res)=>{
            const user= req.body;
            const token = jwt.sign(user,process.env.JWT_SECURE,{expiresIn:'1h'})
            res.send({token})
          })
// middlewares
const verifytoken =(req,res,next)=>{

  if(!req.headers.authorization){
    return res.status(401).send({message: 'forbidden access'})
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token,process.env.JWT_SECURE,(err,decoded)=>{
  if(err){
    return res.status(401).send({message : 'unauthorized access'})
  }
  req.decoded= decoded;
  next()
  })
  
  
  }

  const verifyAdmin = async(req,res,next)=>{
    const email = req.decoded.email;
    const query = {email:email};
    const user= await users_collection.findOne(query);
    const isAdmin = user?.role === 'admin';
    if(!isAdmin){
      return res.status(403).send({message: 'forbidden access'})
    }
    next()
  }

    app.get('/banner',async (req, res) => {
      const banner= await banner_collection.find().toArray()
      res.send(banner)
    })


     app.get('/banner/:id',async (req,res)=>{
      const id = req.params.id;
      const query= {_id: new ObjectId(id)};
      const result = await banner_collection.findOne(query);
      res.send(result)
     })


     app.get('/apartment', async (req, res) => {

      const search = req.query?.debouncedSearch || ""; 
    
      
      
      const query = {};
    
      
      if (search) {
        const [min, max] = search.split('-').map(Number);
        if (min !== undefined && max !== undefined) {
            query.rent = { $gte: min, $lte: max }; 
        }
    }
    
    
      
    
      const apartments = await apartment_collection.find(query).toArray();
      res.send(apartments);
    });

    



      app.get('/apartment/:id',async (req,res)=>{
        const id = req.params.id;
        const query= {_id: new ObjectId(id)};
        const result = await apartment_collection.findOne(query);
        res.send(result)
       })

       app.post('/Apartmente_colection',async(req,res)=>{
        const cardsitem = req.body;
        const result =await apartment_collection_post.insertOne(cardsitem);
        res.send(result)
      })


      app.get('/Apartmente_colection',async (req, res) => {
        const banner= await apartment_collection_post.find().toArray()
        res.send(banner)
      })

    
    
  

      app.post('/agreement', async (req, res) => {
        const agreement = req.body;
        const { userEmail } = agreement;
      
       
        const existingAgreement = await agrement_collection.findOne({ userEmail });
      
        if (existingAgreement) {
          return res.status(400).send({ error: "User already has an agreement." });
        }     
       
        const result = await agrement_collection.insertOne(agreement);
        res.send(result);
      });
      
      app.get('/agrements',async (req, res) => {
        const result= await agrement_collection.find().toArray()
        res.send(result)
      })

      app.delete('/agrements/:id',verifyAdmin,verifytoken,async(req,res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result =await agrement_collection.deleteOne(query);
        res.send(result)
      })

  app.get('/agrement',async (req, res) => {
    const userEmail = req.query.email; 

  if (!userEmail) {
    return res.status(400).send({ error: 'User email is required' }); 
  }

    const agreements = await agrement_collection.find({ userEmail: userEmail }).toArray();
    res.send(agreements);
  })

  
    //  user and member
    app.post('/users', async (req, res) => {
      const user = req.body
      const query = { email: user.email }
      const exemail = await users_collection.findOne(query)
      if (exemail) {
          return res.send({ message: "User Already exists", insertone: null });
      }
      const result = await users_collection.insertOne(user)
   
      res.send(result);
  });

  app.get('/users',verifytoken,async (req, res) => {
    const banner= await users_collection.find().toArray()
    res.send(banner)
  })

  app.delete('/users/:id',verifyAdmin,verifytoken,async(req,res)=>{
    const id = req.params.id;
    const query = {_id: new ObjectId(id)};
    const result =await users_collection.deleteOne(query);
    res.send(result)
  })

  app.patch('/users/:id',verifyAdmin,verifytoken,async(req,res)=>{
    const id = req.params.id;
    const filter = {_id: new ObjectId(id)};
    const updateDoc = {
      $set: {
          role: 'admin',
      },
  };
    const result = await users_collection.updateOne(filter, updateDoc);
    res.send(result)
   })


   app.get('/users/admin/:email',verifytoken,async (req,res)=>{
    const email = req.params.email;
    
    const query= {email : email}
    const user= await users_collection.findOne(query)
    let admin = false;
    if(user){
      admin= user?.role === 'admin';
  
    }
    res.send({ admin })
   
    
  
   })








    // payment 


    app.post('/create-checkout-session', async (req, res) =>{
      const { rent } = req.body;
const amount = parseInt(rent * 100); 

const paymentIntent = await stripe.paymentIntents.create({
  amount: amount, 
  currency: 'usd',
  payment_method_types: ['card'],
});

     res.send(
      {clientSecret:paymentIntent.client_secret}
    )
     } )


app.post('/payments',async(req,res)=>{
  const payment = req.body
  const result= await payment_collection.insertOne(payment)
const query = {
  _id: {
    $in: payment.paymentid.map(id=>new ObjectId(id))
  }
}
const delet = await agrement_collection.deleteMany(query)
  res.send({result,delet})
})

app.get('/payments/:email',async(req,res)=>{
  const query= {email: req.params.email}
  if( req.params.email !== req.decoded.email){
    return res.status(403).send({message:'forbidden access'})
  }
  const result = await payment_collection.find(query).toArray();
  res.send(result)
})





    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
   
  }
}
run().catch(console.dir);




  
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })