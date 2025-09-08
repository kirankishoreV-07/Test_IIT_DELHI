const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

// Configure storage for audio files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads/')) {
  fs.mkdirSync('uploads/');
}

// Endpoint to transcribe audio
router.post('/audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No audio file uploaded' });
    }

    // Get language preference from request (default to 'hi' for Hindi)
    const language = req.body.language || 'hi';
    console.log(`Transcribing audio in language: ${language}`);
    
    // Path to the uploaded audio file
    const audioFilePath = req.file.path;
    
    // Create form data for Sarvam API
    const formData = new FormData();
    formData.append('audio_file', fs.createReadStream(audioFilePath));
    formData.append('language', language);
    
    // Make request to Sarvam AI API
    const response = await axios.post(
      'https://api.sarvam.ai/v1/speech/recognize',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${process.env.SARVAM_API_KEY}`
        }
      }
    );
    
    // Clean up the uploaded file
    fs.unlinkSync(audioFilePath);
    
    // Return transcription result
    return res.json({
      success: true,
      transcription: response.data.text || '',
      language: language
    });
    
  } catch (error) {
    console.error('Sarvam AI transcription error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Transcription failed',
      error: error.response?.data || error.message
    });
  }
});

module.exports = router;
