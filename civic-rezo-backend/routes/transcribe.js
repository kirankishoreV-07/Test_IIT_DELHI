
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { SpeechClient } = require('@google-cloud/speech');
const router = express.Router();

const upload = multer({ dest: 'uploads/audio/' });
const speechClient = new SpeechClient();

// POST /transcribe/audio
router.post('/audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No audio file uploaded.' });
    }
    const lang = req.body.lang || 'en-US';
    const audioPath = req.file.path;
    const wavPath = audioPath + '.wav';
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
    await new Promise((resolve, reject) => {
      ffmpeg(audioPath)
        .audioChannels(1)
        .audioFrequency(16000)
        .format('wav')
        .on('end', resolve)
        .on('error', reject)
        .save(wavPath);
    });
    // Read audio file
    const file = fs.readFileSync(wavPath);
    const audioBytes = file.toString('base64');
    let originalText = '';
    let googleResponse = null;
    try {
      const [response] = await speechClient.recognize({
        audio: { content: audioBytes },
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: lang,
        },
      });
      googleResponse = response;
      if (response.results && response.results.length > 0) {
        originalText = response.results.map(r => r.alternatives[0].transcript).join(' ');
      }
    } catch (err) {
      googleResponse = err;
      console.error('Google STT error:', err);
      originalText = '';
    }
    fs.unlinkSync(audioPath);
    fs.unlinkSync(wavPath);
    // Translate to English using LibreTranslate
    let translatedText = '';
    if (originalText) {
      try {
        const ltRes = await axios.post('https://libretranslate.de/translate', {
          q: originalText,
          source: lang.split('-')[0],
          target: 'en',
          format: 'text'
        }, { headers: { 'accept': 'application/json' } });
        translatedText = ltRes.data.translatedText;
      } catch (err) {
        translatedText = '';
      }
    }
    if (!originalText) {
      return res.status(500).json({ success: false, message: 'Google STT transcription failed', error: googleResponse });
    }
    return res.json({ success: true, originalText, translatedText, lang, googleResponse });
  } catch (err) {
    console.error('Transcription error:', err);
    return res.status(500).json({ success: false, message: 'Transcription failed', error: err.stack || err.message || String(err) });
  }
});

module.exports = router;
