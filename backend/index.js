const express =  require("express")
const jwt = require("jsonwebtoken")
const multer = require("multer")
const path = require("path")
const cors = require("cors")
const pg = require("pg")
const { error } = require("console")

const port = 4000
const app = express()

app.use(express.json())
app.use(cors())

//Database Connect
const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "E-commerce",
    password: "Your Password",
    port: 5432,
  });
  
db.connect();

// API Creation

app.get("/" , (req,res) => {
    res.send("Express App is running")
})

//Image Storage Engine
const storage = multer.diskStorage({
    destination:"./upload/images",
    filename:(req,file,cb) => {
        return cb(null,`${file.filename}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({storage:storage})

// Creating Upload Endpoint for images
app.use("/images",express.static("upload/images"))

app.post("/upload",upload.single("product"),(req,res) => {
    res.json({
        success:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`
    })
})

app.post("/addproduct",async(req,res) => {
    try {
        const id = req.body.id
        const name = req.body.name
        const image = req.body.image
        const category = req.body.category
        const new_price = req.body.new_price
        const old_price = req.body.old_price
        await db.query("insert into website(name,image,category,new_price,old_price) values ($1,$2,$3,$4,$5);",[name,image,category,new_price,old_price]);
        console.log("Inserted")
        res.json({
            success:true,
            name:req.body.name,
        })
      } catch(err) {
        console.log(err);
      }
})

//Creating API For Deleting Products
app.post("/removeproduct",async(req,res) => {
    try{
        await db.query("delete from website where id = $1;",[req.body.id])
        console.log("Removed")
        res.json({
            success:true,
            name:req.body.name
        })
    } catch(err){
        console.log(err)
    }
})

//Creating API For Getting All Products
app.get("/allproducts",async(req,res) => {
    try{
        const result = await db.query("select * from website;")
        console.log("All Products Fetched")
        res.send(result.rows)
    } catch(err){
        console.log(err)
    }
})

//Creating Endpoint For Registering the user
app.post("/signup",async (req,res) => {
    try{
        let check = await db.query("select * from users where email=$1;",[req.body.email])
        if(check.rows[0]){
            return res.status(400).json({success:false,error:"existing user found with the same email id"})
        }
        let cart = {};
        for (let i = 0; i < 300+1; i++) {
            cart[i] = 0; 
        }
        const user = await db.query("insert into users(name,email,password,cartdata) values($1,$2,$3,$4) returning *;",[req.body.username,req.body.email,req.body.password,cart])
        const data = {
            user:{
                id:user.rows.id
            }
        }

        const token = jwt.sign(data,"secret_ecom")
        await db.query("update users set id=$1 where email=$2;",[token,req.body.email])
        await db.query("update users set truncated_id=$1 where email=$2;",[token.slice(20,80),req.body.email])
        res.json({success:true,token})
        

    } catch(err){
        console.log(err)
    }
})

//Creating Endpoint for User Login
app.post("/login",async(req,res) => {
    try{
        let user = await db.query("select * from users where email=$1",[req.body.email])
        if(user.rows[0]){
            const passCompare = req.body.password === user.rows[0].password
            if(passCompare){
                const data ={
                    user:{
                        id:user.rows[0].id
                    }
                }
                const token = jwt.sign(data,"secret_ecom")
                await db.query("update users set truncated_id=$1 where email=$2;",[token.slice(20,80),req.body.email])
                res.json({success:true,token})
            }else{
                res.json({success:false,error:"Wrong Password"})
            }
        }else{
            res.json({success:false,error:"Email Id is not registered, please signup"})
        }
    
    } catch(err){
        console.log(err)
    }
    
})

//Creating Endpoint For NewCollection Data
app.get("/newcollections",async(req,res) => {
    try {
        let products = await db.query("select * from website")
    let newcollection = products.rows.slice(1).slice(-8)
    console.log("NewCollection Fetched")
    res.send(newcollection)
    } catch(err){
        console.log(err)
    }
})

//Creating Endpoint For Popular in Women Section
app.get("/popularinwomen",async(req,res) => {
    try{
        let products = await db.query("select * from website where category='women'")
        let popular_in_women = products.rows.slice(0,4)
        console.log("Popular in Women Fetched")
        res.send(popular_in_women) 
    } catch(err){
        console.log(err)
    }
})

//Creating Middleware To Fetch User
const fetchUser = async(req,res,next) => {
    const token = req.header("auth-token")
    if(!token){
        res.status(401).send({error:"Please Login using valid Email Id"})
    }else {
        try{
            const data = jwt.verify(token,"secret_ecom")
            req.user = data.user
            next()
        }catch(err){
            res.status(401).send({error:"Please Login using valid Email Id"})
        }
    }
}

//Creating Endpoint for adding products in cartdata
app.post("/addtocart",fetchUser,async(req,res)=>{
    try{
        console.log(req.user.id.slice(20,80))
        //let userData = await db.query("select * from users where truncated_id=$1;",[req.user.id.slice(20,80)])
        //console.log(userData)
        //await db.query("update users set cartdata[$1] = cartdata[$1] + 1 where id=$2;",[req.body.itemId,req.user.id])
        //res.send("Added")
    }catch(err){
        console.log(err)
    }
    

})

app.listen(port,(error) => {
    if(!error){
        console.log("Server Running on Port"+port)
    } else{
        console.log("Error : "+error)
    }
})

