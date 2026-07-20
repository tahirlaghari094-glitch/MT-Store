const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const app = express();

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

const PORT = process.env.PORT || 5000;
const ADMIN_EMAIL = 'lagharitahir08@gmail.com';
const LIVE_DOMAIN = 'https://mt-store-sandy.vercel.app';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});

const sendHtmlEmail = async (to, subject, htmlContent) => {
    if (!to) return;
    try {
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: to.toLowerCase(),
            subject: subject,
            html: htmlContent
        };
        await transporter.sendMail(mailOptions);
    } catch (error) { console.log(error); }
};

const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log("🔌 MongoDB Connected Successfully!"))
        .catch(err => console.error(err));
}

// Databases Schemas Architecture
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    username: String
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const ProductSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: String,
    price: Number,
    description: String,
    imageUrl: String,
    imageUrls: [String], 
    paymentDetails: String,
    address: String,
    contactNumber: String,
    sellerEmail: { type: String, lowercase: true },
    transactionId: String,
    status: { type: String, default: 'pending' }
});
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const ReviewSchema = new mongoose.Schema({
    productId: { type: String, required: true },
    comment: String,
    username: String,
    isPinned: { type: Boolean, default: false },
    date: { type: String, default: () => new Date().toLocaleDateString() }
});
const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);

const rootPath = process.cwd();
app.use(express.static(rootPath));

// ENDPOINTS PIPELINE APIS
app.post('/api/users/login', async (req, res) => {
    const { email } = req.body;
    try {
        let user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            user = new User({ email: email.toLowerCase(), username: email.split('@')[0] });
            await user.save();
        }
        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ error: "Server Error" }); }
});

app.get('/api/products/:productId/reviews', async (req, res) => {
    try {
        const productReviews = await Review.find({ productId: req.params.productId }).sort({ isPinned: -1, _id: -1 });
        res.json(productReviews);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/products/:productId/reviews', async (req, res) => {
    const { comment, username } = req.body;
    try {
        const newReview = new Review({ productId: req.params.productId, comment, username });
        await newReview.save();
        res.status(201).json({ success: true });
    } catch (error) { res.status(500).json({ error: "Server Error" }); }
});

app.post('/api/reviews/pin/:reviewId', async (req, res) => {
    try {
        const targetReview = await Review.findById(req.params.reviewId);
        if(!targetReview) return res.status(404).send("Review Not Found");
        targetReview.isPinned = !targetReview.isPinned;
        await targetReview.save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: "Execution error" }); }
});

app.get('/api/products', async (req, res) => {
    try { res.json(await Product.find({ status: 'approved' })); } catch (e) { res.status(500).json([]); }
});

app.get('/api/products/seller/:email', async (req, res) => {
    try { res.json(await Product.find({ sellerEmail: req.params.email.toLowerCase() })); } catch (e) { res.status(500).json([]); }
});

app.post('/api/products', async (req, res) => {
    const { title, price, description, imageUrls, paymentDetails, address, contactNumber, sellerEmail, transactionId } = req.body;
    try {
        const productId = Date.now().toString();
        const newProduct = new Product({
            id: productId, title, price: parseFloat(price), description,
            imageUrl: imageUrls[0] || '', imageUrls, paymentDetails, address, contactNumber, sellerEmail, transactionId
        });
        await newProduct.save();
        
        const approveUrl = `${LIVE_DOMAIN}/api/products/approve/${productId}`;
        await sendHtmlEmail(ADMIN_EMAIL, `🚨 Review Pending: ${title}`, `<a href="${approveUrl}">Approve Live</a>`);
        res.status(201).json({ success: true });
    } catch (error) { res.status(500).json({ error: "Server Error" }); }
});

app.get('/api/products/approve/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id });
        if (product) { product.status = 'approved'; await product.save(); }
        res.send("<h1>Approved Successfully!</h1>");
    } catch (e) { res.send("Error"); }
});

app.get(/^\/(?!api).*/, (req, res) => { res.sendFile(path.join(rootPath, 'index.html')); });

if (process.env.NODE_ENV !== 'production') { app.listen(PORT); }
module.exports = app;
