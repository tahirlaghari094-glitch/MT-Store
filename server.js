const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:2017/mt-store')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// Product Schema Updated
const productSchema = new mongoose.Schema({
  title: String,
  price: Number,
  image: String,
  category: String,
  description: String,
  sellerName: String,
  sellerEmail: String,
  sellerPhone: String,      // Naya Field
  shopAddress: String,      // Naya Field
  easypaisaReceipt: String, // Naya Field
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
const Product = mongoose.model('Product', productSchema);

// Order Schema
const orderSchema = new mongoose.Schema({
  items: Array,
  buyerDetails: Object,
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ADMIN_EMAIL, // Aapki Admin Email
    pass: process.env.EMAIL_PASSWORD // Gmail App Password
  }
});

// 1. Add New Product API
app.post('/api/products/add', async (req, res) => {
  try {
    const { title, price, image, category, description, sellerName, sellerEmail, sellerPhone, shopAddress, easypaisaReceipt } = req.body;
    
    const newProduct = new Product({
      title, price, image, category, description, sellerName, sellerEmail, sellerPhone, shopAddress, easypaisaReceipt, status: 'pending'
    });
    
    await newProduct.save();

    // Admin ko Approval ke liye Email bhejna (With Details and Approve Button)
    const approvalLink = `${req.protocol}://${req.get('host')}/api/products/approve/${newProduct._id}`;
    
    const mailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: `🚨 New Product Approval Required: ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; max-width: 600px;">
          <h2 style="color: #ff6a00;">New Product Pending Approval</h2>
          <hr>
          <h3>Product Details:</h3>
          <p><strong>Title:</strong> ${title}</p>
          <p><strong>Price:</strong> PKR ${price}</p>
          <p><strong>Category:</strong> ${category}</p>
          <p><strong>Description:</strong> ${description}</p>
          <p><strong>Easypaisa Receipt ID:</strong> ${easypaisaReceipt}</p>
          
          <h3>Seller Details:</h3>
          <p><strong>Name:</strong> ${sellerName}</p>
          <p><strong>Email:</strong> ${sellerEmail}</p>
          <p><strong>Phone:</strong> ${sellerPhone}</p>
          <p><strong>Shop Address:</strong> ${shopAddress}</p>
          <br>
          <a href="${approvalLink}" style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">APPROVE PRODUCT NOW</a>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(201).json({ success: true, message: 'Product submitted for approval and email sent to admin.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Direct Approval Button Link API
app.get('/api/products/approve/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    if (!product) return res.status(404).send('Product not found.');
    
    res.send(`
      <div style="text-align:center; font-family:Arial; padding:50px;">
        <h1 style="color:#28a745;">✓ Product Approved Successfully!</h1>
        <p>Product "${product.title}" is now live on MT Store.</p>
      </div>
    `);
  } catch (error) {
    res.status(500).send('Error approving product.');
  }
});

// 3. Order Checkout & Notification API
app.post('/api/orders/checkout', async (req, res) => {
  try {
    const { items, buyerDetails } = req.body;
    const newOrder = new Order({ items, buyerDetails });
    await newOrder.save();

    // Har product ke seller ko alag se aur admin ko email bhejna
    for (let item of items) {
      const productInfo = await Product.findById(item.id);
      const sellerEmail = productInfo ? productInfo.sellerEmail : process.env.ADMIN_EMAIL;

      const emailTemplate = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
          <h2 style="color: #ff6a00;">📦 New Order Received!</h2>
          <hr>
          <h3>Product Ordered:</h3>
          <p><strong>Product Name:</strong> ${item.title}</p>
          <p><strong>Price:</strong> PKR ${item.price}</p>
          <p><strong>Quantity:</strong> ${item.quantity || 1}</p>
          
          <h3>Buyer Delivery Details:</h3>
          <p><strong>Name:</strong> ${buyerDetails.name}</p>
          <p><strong>Phone:</strong> ${buyerDetails.phone}</p>
          <p><strong>Address:</strong> ${buyerDetails.address}</p>
          
          <h3>Seller Info:</h3>
          <p><strong>Shop/Seller:</strong> ${productInfo?.sellerName || 'N/A'}</p>
          <p><strong>Contact:</strong> ${productInfo?.sellerPhone || 'N/A'}</p>
        </div>
      `;

      // Seller ko email
      await transporter.sendMail({
        from: process.env.ADMIN_EMAIL,
        to: sellerEmail,
        subject: `🛒 Order Notification for ${item.title}`,
        html: emailTemplate
      });

      // Admin ko email (If seller is not admin)
      if (sellerEmail !== process.env.ADMIN_EMAIL) {
        await transporter.sendMail({
          from: process.env.ADMIN_EMAIL,
          to: process.env.ADMIN_EMAIL,
          subject: `🔔 Admin Alert: Order Placed for ${item.title}`,
          html: emailTemplate
        });
      }
    }

    res.status(200).json({ success: true, message: 'Order placed successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Baki APIs (Get Products, etc.) wese hi rahengi...
app.listen(process.env.PORT || 5000, () => console.log('Server running...'));
