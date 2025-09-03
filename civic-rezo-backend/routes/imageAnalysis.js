const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ImageAnalysisService = require('../services/imageAnalysisService');
const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads/images';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `civic-image-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        console.log('🔍 File filter check:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        });
        
        const allowedExtensions = /\.(jpeg|jpg|png|webp)$/i;
        const allowedMimes = /^image\/(jpeg|jpg|png|webp)$/i;
        
        const hasValidExtension = allowedExtensions.test(file.originalname);
        const hasValidMime = allowedMimes.test(file.mimetype);
        
        // Special handling for WebP files that might be detected as octet-stream
        const isWebpFile = file.originalname.toLowerCase().endsWith('.webp');
        const isWebpOctetStream = file.mimetype === 'application/octet-stream' && isWebpFile;

        console.log('🔍 Validation results:', {
            hasValidExtension: hasValidExtension,
            hasValidMime: hasValidMime,
            isWebpFile: isWebpFile,
            isWebpOctetStream: isWebpOctetStream,
            extension: file.originalname.toLowerCase(),
            detectedMime: file.mimetype
        });

        if (hasValidMime && hasValidExtension) {
            console.log('✅ File accepted (standard image type)');
            return cb(null, true);
        } else if (isWebpOctetStream) {
            console.log('✅ File accepted (WebP with octet-stream mime)');
            return cb(null, true);
        } else {
            console.log('❌ File rejected');
            cb(new Error(`Only image files (JPEG, PNG, WebP) are allowed. Got: ${file.mimetype}`));
        }
    }
});

// Route to validate and analyze civic issue image
router.post('/validate', upload.single('image'), async (req, res) => {
    try {
        console.log('📸 Image validation request received');
        
        // Create service instance (temporarily moved here to see initialization logs)
        const imageAnalysisService = new ImageAnalysisService();
        
        console.log('📋 Request details:', {
            hasFile: !!req.file,
            originalName: req.file?.originalname,
            size: req.file?.size,
            mimetype: req.file?.mimetype
        });
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided',
                allowUpload: false,
                stage: 'file_missing'
            });
        }

        const imagePath = req.file.path;
        console.log('📁 Processing image:', imagePath);

        // Perform comprehensive image analysis
        const analysisResult = await imageAnalysisService.validateAndAnalyzeImage(imagePath);
        
        console.log('🔍 Analysis result details:', {
            success: analysisResult.success,
            stage: analysisResult.stage,
            allowUpload: analysisResult.allowUpload,
            hasError: !!analysisResult.error
        });

        // Always clean up uploaded file after analysis
        try {
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log('🗑️ Temporary file cleaned up');
            }
        } catch (cleanupError) {
            console.warn('⚠️ Failed to cleanup temporary file:', cleanupError.message);
        }

        console.log('✅ Image validation completed');
        console.log('🎯 Decision:', analysisResult.allowUpload ? 'ALLOWED' : 'REJECTED');
        
        if (analysisResult.allowUpload) {
            console.log('🏆 Priority Score:', analysisResult.priorityScore);
            console.log('⚡ Urgency Level:', analysisResult.urgencyLevel);
        }

        // Structure response based on success/failure
        const response = {
            success: analysisResult.success !== false,
            allowUpload: analysisResult.allowUpload,
            message: analysisResult.reason || analysisResult.error || 'Image analysis completed',
            stage: analysisResult.stage
        };

        // Add analysis data if upload is allowed
        if (analysisResult.allowUpload) {
            response.data = {
                priorityScore: analysisResult.priorityScore,
                urgencyLevel: analysisResult.urgencyLevel,
                detectedIssues: analysisResult.detectedIssues,
                confidence: analysisResult.analysis?.confidence,
                analysis: analysisResult.analysis
            };
        } else {
            // Add helpful information for rejected uploads
            response.suggestion = analysisResult.suggestion;
            response.errorDetails = analysisResult.error;
            if (analysisResult.analysis) {
                response.debugInfo = {
                    detections: analysisResult.analysis.predictions?.length || 0,
                    confidence: analysisResult.analysis.confidence || 0,
                    reason: analysisResult.analysis.reason
                };
            }
        }

        res.status(analysisResult.allowUpload ? 200 : 400).json(response);

    } catch (error) {
        console.error('❌ Image validation route error:', error);
        console.error('❌ Error stack:', error.stack);
        
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.warn('⚠️ Failed to cleanup file after error:', cleanupError.message);
            }
        }

        res.status(500).json({
            success: false,
            allowUpload: false,
            message: 'Image validation failed',
            error: error.message,
            stage: 'server_error',
            errorDetails: {
                name: error.name,
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        });
    }
});

// Route to get supported civic issue categories
router.get('/categories', (req, res) => {
    try {
        const categories = {
            infrastructure: [
                { name: 'Pothole', description: 'Road damage and safety hazards' },
                { name: 'Damaged Road', description: 'General road infrastructure issues' }
            ],
            sanitation: [
                { name: 'Sewage Overflow', description: 'Sewage blockage and overflow issues' },
                { name: 'Garbage Dump', description: 'Improper waste disposal' },
                { name: 'Unclean Toilet', description: 'Public toilet cleanliness issues' }
            ],
            utilities: [
                { name: 'Broken Streetlight', description: 'Street lighting failures' },
                { name: 'Water Leakage', description: 'Water supply infrastructure damage' }
            ],
            environment: [
                { name: 'Illegal Dumping', description: 'Environmental violations and illegal waste disposal' }
            ]
        };

        res.json({
            success: true,
            data: categories,
            message: 'Supported civic issue categories retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve categories',
            error: error.message
        });
    }
});

// Route to test Roboflow connection
router.get('/test-connection', async (req, res) => {
    try {
        console.log('🔧 Testing Roboflow connection...');
        
        const config = {
            apiKey: process.env.ROBOFLOW_API_KEY ? 'Present' : 'Missing',
            projectId: process.env.ROBOFLOW_PROJECT_ID,
            modelVersion: process.env.ROBOFLOW_MODEL_VERSION
        };

        // Create a simple test (you can upload a test image to fully test)
        const testResult = {
            configurationStatus: 'OK',
            config: config,
            message: 'Roboflow service is configured. Upload an image to test full functionality.'
        };

        res.json({
            success: true,
            data: testResult
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Roboflow connection test failed',
            error: error.message
        });
    }
});

module.exports = router;
