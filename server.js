const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// ==========================================
// RATE LIMITING CONFIGURATION
// ==========================================

// General API rate limit: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100,                  // limit each IP to 100 requests per windowMs
    standardHeaders: true,     // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,      // Disable the `X-RateLimit-*` headers
    message: {
        error: 'Too many requests',
        retryAfter: '15 minutes'
    },
    // Skip successful health checks from counting
    skip: (req) => req.path === '/api/health' && req.method === 'GET'
});

// Strict limit for file uploads: 10 uploads per 15 minutes
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        error: 'Upload limit exceeded',
        details: 'Maximum 10 uploads per 15 minutes. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Very strict limit for PDF generation: 5 per 10 minutes
const generateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,  // 10 minutes
    max: 5,
    message: {
        error: 'Generation limit exceeded',
        details: 'Maximum 5 print sheets per 10 minutes. Please wait before generating more.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply general limiter to all routes
app.use(generalLimiter);

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname));

// ==========================================
// FILE UPLOAD CONFIGURATION
// ==========================================

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { 
        fileSize: 50 * 1024 * 1024,  // 50MB per file
        files: 3                       // max 3 files per upload
    },
    fileFilter: (req, file, cb) => {
        // Only accept images
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG, and WEBP files are allowed'), false);
        }
    }
});

// ==========================================
// CONFIGURATION
// ==========================================

const CONFIG = {
    passport: {
        width: 413,
        height: 531,
        label: 'Passport (35×45mm)'
    },
    visa: {
        width: 591,
        height: 591,
        label: 'Visa (50×50mm)'
    },
    aadhaar: {
        width: 413,
        height: 531,
        label: 'Aadhaar (35×45mm)'
    }
};

const A4 = {
    width: 2480,
    height: 3508,
    margin: 80,
    spacing: 20,
    border: 2
};

// ==========================================
// GRID CALCULATOR
// ==========================================

function calculateGrid(numPhotos, photoWidth, photoHeight) {
    const totalWidth = photoWidth + (A4.border * 2);
    const totalHeight = photoHeight + (A4.border * 2);
    
    const availWidth = A4.width - (A4.margin * 2);
    const availHeight = A4.height - (A4.margin * 2);
    
    const maxCols = Math.floor((availWidth + A4.spacing) / (totalWidth + A4.spacing));
    const maxRows = Math.floor((availHeight + A4.spacing) / (totalHeight + A4.spacing));
    
    let bestCols = maxCols;
    let bestRows = Math.ceil(numPhotos / bestCols);
    
    while (bestRows > maxRows && bestCols > 1) {
        bestCols--;
        bestRows = Math.ceil(numPhotos / bestCols);
    }
    
    bestCols = Math.min(bestCols, maxCols);
    bestRows = Math.min(bestRows, maxRows);
    
    return {
        cols: bestCols,
        rows: bestRows,
        totalFit: bestCols * bestRows,
        actualPhotos: Math.min(numPhotos, bestCols * bestRows),
        photosPerPage: bestCols * bestRows
    };
}

// ==========================================
// PROCESS SINGLE PHOTO
// ==========================================

async function processPhoto(buffer, photoWidth, photoHeight) {
    return await sharp(buffer)
        .resize(photoWidth, photoHeight, {
            fit: 'cover',
            position: 'center'
        })
        .extend({
            top: A4.border,
            bottom: A4.border,
            left: A4.border,
            right: A4.border,
            background: { r: 0, g: 0, b: 0, alpha: 1 }
        })
        .png()
        .toBuffer();
}

// ==========================================
// API: HEALTH CHECK (exempt from rate limit)
// ==========================================

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        rateLimit: {
            uploads: '10 per 15min',
            generations: '5 per 10min'
        }
    });
});

// ==========================================
// API: GENERATE PRINT SHEET
// ==========================================

app.post('/api/generate', 
    uploadLimiter,           // strict upload rate limit
    upload.array('images'),  // multer upload
    generateLimiter,         // strict generation rate limit
    async (req, res) => {
    
    try {
        console.log('  Generating print sheet...');
        
        // Validate file count
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No images uploaded' });
        }
        
        if (req.files.length > 3) {
            return res.status(400).json({ error: 'Maximum 3 photos allowed' });
        }
        
        const { 
            photoType = 'passport',
            width: customWidth,
            height: customHeight,
            spacing: customSpacing,
            border: customBorder
        } = req.body;
        
        let photoWidth, photoHeight;
        if (customWidth && customHeight) {
            photoWidth = parseInt(customWidth);
            photoHeight = parseInt(customHeight);
        } else {
            const config = CONFIG[photoType] || CONFIG.passport;
            photoWidth = config.width;
            photoHeight = config.height;
        }
        
        if (customSpacing) A4.spacing = parseInt(customSpacing);
        if (customBorder) A4.border = parseInt(customBorder);
        
        let copies = req.body.copies;
        if (typeof copies === 'string') {
            copies = JSON.parse(copies);
        }
        if (!Array.isArray(copies)) {
            copies = req.files.map(() => 6);
        }
        
        console.log(`   Photo size: ${photoWidth}×${photoHeight}px`);
        console.log(`   Files: ${req.files.length}`);
        console.log(`   Copies: ${copies}`);
        
        const processedPhotos = [];
        
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const copyCount = parseInt(copies[i]) || 6;
            
            console.log(`   Processing: ${file.originalname} (${copyCount} copies)`);
            
            const processed = await processPhoto(file.buffer, photoWidth, photoHeight);
            
            for (let c = 0; c < copyCount; c++) {
                processedPhotos.push(processed);
            }
        }
        
        console.log(`   Total photos to place: ${processedPhotos.length}`);
        
        const doc = new PDFDocument({
            size: [A4.width, A4.height],
            margin: 0
        });
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=pass-py-print-sheet.pdf'
        });
        
        doc.pipe(res);
        
        let remainingPhotos = [...processedPhotos];
        let pageNum = 0;
        
        while (remainingPhotos.length > 0) {
            const grid = calculateGrid(remainingPhotos.length, photoWidth, photoHeight);
            
            console.log(`   Page ${pageNum + 1}: ${grid.cols}×${grid.rows} grid, ${grid.actualPhotos} photos`);
            
            const totalWidth = photoWidth + (A4.border * 2);
            const totalHeight = photoHeight + (A4.border * 2);
            
            for (let i = 0; i < grid.actualPhotos; i++) {
                const row = Math.floor(i / grid.cols);
                const col = i % grid.cols;
                
                doc.image(remainingPhotos[i],
                    A4.margin + col * (totalWidth + A4.spacing),
                    A4.margin + row * (totalHeight + A4.spacing),
                    {
                        width: totalWidth,
                        height: totalHeight
                    }
                );
            }
            
            remainingPhotos = remainingPhotos.slice(grid.actualPhotos);
            
            if (remainingPhotos.length > 0) {
                doc.addPage();
                pageNum++;
            }
        }
        
        doc.end();
        
        console.log(`    PDF generated (${pageNum + 1} pages)`);
        
    } catch (error) {
        console.error(' Generation failed:', error);
        res.status(500).json({ 
            error: 'Failed to generate print sheet',
            details: error.message 
        });
    }
});

// ==========================================
// ERROR HANDLING
// ==========================================

// Multer error handler
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ 
                error: 'File too large',
                details: 'Maximum file size is 50MB'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
                error: 'Too many files',
                details: 'Maximum 3 files per upload'
            });
        }
    }
    
    if (err.message === 'Only JPG, PNG, and WEBP files are allowed') {
        return res.status(415).json({ 
            error: 'Invalid file type',
            details: err.message
        });
    }
    
    next(err);
});

// General error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('   Pass-Py Server');
    console.log(`   Local: http://localhost:${PORT}`);
    console.log(`   Rate limits:`);
    console.log(`      - General: 100 req / 15min`);
    console.log(`      - Uploads: 10 / 15min`);
    console.log(`      - Generate: 5 / 10min`);
    console.log(`   Ready to process photos!\n`);
});