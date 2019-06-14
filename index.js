const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

mongoose.connect("mongodb://jagadeesh:pass123@ds337377.mlab.com:37377/jagadeesh-express-app",
{ useNewUrlParser : true },function(error){
    if(error){
        console.log(error);
    }else{
        console.log("connected to database")
    }
})

app.use(bodyParser.json());
app.listen(3000, () => console.log('Server started at port : 3000'));

const Product = mongoose.model('Product', {
    title: {type : String},
    description: { type : String },
    imageUrl: {type : String},
    stock:{type : Number},
    variant:{ type : String},
    brand:{ type : String},
    category:{ type : String},
    price:{ type : Number},
    isAvailable:{type : Boolean}
});

app.get('/products', async (req, res) => {
    console.log(req);
    try{
        const products = await Product.find();
        res.json(products);
    }catch(err){
        res.json({ message : err });
    }
});

app.put('/products/:id', async (req,res) => {
// console.log(req);
try{
    const updatedProduct = await Product.update(
        {_id : req.params.id},
        {$set: {
            title: req.body.title,
            description: req.body.description,
            imageUrl: req.body.imageUrl,
            stock:req.body.stock,
            variant:req.body.variant,
            brand:req.body.brand,
            category:req.body.category,
            price:req.body.price,
            isAvailable:req.body.isAvailable 
        }}
    );
    res.json({"message":"Successfully updatedProduct"});
}catch(err){
    console.error("Error\n\n",err);
    res.json({message:err});
}
})

app.get('/products/:productId', async (req, res) => {
    try{
        const product = await Product.findById(req.params.productId);
        res.json(product);
    }catch(err){
        res.json({ message : err });
    }
});

app.post('/products', async (req,res) => {
    const product = new Product({
        title: req.body.title,
        description: req.body.description,
        imageUrl: req.body.imageUrl,
        stock:req.body.stock,
        variant:req.body.variant,
        brand:req.body.brand,
        category:req.body.category,
        price:req.body.price,
        isAvailable:req.body.isAvailable        
    });
    try{
        const savedProduct = await product.save();
        res.json(savedProduct);
    } catch(err){
        res.json({message : err});
    }
});

app.delete('/products/:productId', async (req,res) =>{
    console.log(req)
    try{
        const removedProduct = await Product.remove({_id: req.params.productId});
        res.json(removedProduct);
    }catch(err){
        res.json({message : err});
    }
});
