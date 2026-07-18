const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Uploads folder ko static banana taake images/videos frontend par access ho sakein
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Storage configuration for Images and Videos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Make sure to create an 'uploads' folder in your backend root
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// File type validation (Images and Videos only)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images and videos are allowed!'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// Fake Database array (Aap ise MongoDB/SQL se replace kar sakte hain)
let reviews = [
    {
        id: 1,
        comment: "Bohat achi watch hai, quality solid hai!",
        media: []
    }
];

// 1. API to Get All Reviews
app.get('/api/reviews', (req, res) => {
    res.json({ success: true, reviews: reviews });
});

// 2. API to Add New Review with Images/Videos (Max 5 files)
app.post('/api/reviews', upload.array('media', 5), (req, res) => {
    try {
        const { comment } = req.body;
        
        // Map uploaded files to their public URLs
        const mediaUrls = req.files ? req.files.map(file => `http://localhost:5000/uploads/${file.filename}`) : [];

        if (!comment && mediaUrls.length === 0) {
            return res.status(400).json({ success: false, message: "Comment or media is required" });
        }

        const newReview = {
            id: reviews.length + 1,
            comment: comment || "",
            media: mediaUrls
        };

        reviews.unshift(newReview); // Naya comment sabse upar show karne ke liye

        res.status(201).json({ success: true, message: "Review added successfully!", review: newReview });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
