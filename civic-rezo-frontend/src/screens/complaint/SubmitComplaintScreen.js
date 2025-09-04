import React, { useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from '../../../config/supabase';
import { supabase } from '../../../config/supabase';

const SubmitComplaintScreen = ({ navigation }) => {
  const [selectedLang, setSelectedLang] = useState('en');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    category: '',
  });
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [voiceError, setVoiceError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageValidation, setImageValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validatingImage, setValidatingImage] = useState(false);

  // Expo audio recording logic
  const startVoiceInput = async () => {
    setVoiceError(null);
    console.log('Selected language before recording:', selectedLang);
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow microphone access to record your complaint.');
        return;
      }
      setIsRecording(true);
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
    } catch (err) {
      setVoiceError(err.message);
      Alert.alert('Error', 'Audio recording failed.');
    }
  };

  const stopVoiceInput = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setIsRecording(false);
        setRecording(null);
        // Ask user for language (or use a dropdown/select in UI)
        // For demo, default to 'en'. Replace with your UI logic.
        const selectedLang = 'en'; // e.g. 'hi', 'te', etc.
        const formData = new FormData();
        formData.append('audio', {
          uri,
          type: 'audio/x-wav',
          name: 'voice.wav',
        });
        formData.append('lang', selectedLang);
  console.log('Selected language after recording:', selectedLang);
        const response = await fetch(`${API_BASE_URL}/transcribe/audio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        });
        const result = await response.json();
        console.log('Transcription response:', result);
        console.log('originalText:', result.originalText);
        console.log('translatedText:', result.translatedText);
        console.log('googleResponse:', result.googleResponse);
        if (result.success && (result.originalText || result.translatedText)) {
          setFormData(prev => ({ ...prev, description: result.originalText }));
          if (result.translatedText && result.translatedText !== result.originalText) {
            Alert.alert('English Translation', result.translatedText);
          }
        } else {
          Alert.alert('Transcription Error', result.message || 'Could not transcribe audio.');
        }
      }
    } catch (err) {
      setVoiceError(err.message);
      Alert.alert('Error', 'Speech-to-text failed.');
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0]);
        setImageValidation(null);
        await validateImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please allow access to your camera to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0]);
        setImageValidation(null);
        await validateImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const validateImage = async (imageAsset) => {
    if (!imageAsset) return;
    setValidatingImage(true);
    try {
      console.log('🔍 Starting image validation...');
      const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dsvc9y4rq/image/upload';
      const UPLOAD_PRESET = 'damage';
      const data = new FormData();
      data.append('file', {
        uri: imageAsset.uri,
        type: imageAsset.mimeType || 'image/jpeg',
        name: imageAsset.fileName || 'civic-image.jpg',
      });
      data.append('upload_preset', UPLOAD_PRESET);
      const cloudRes = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: data,
      });
      const cloudResult = await cloudRes.json();
      if (!cloudResult.secure_url) throw new Error('Cloudinary upload failed');
      const validateRes = await fetch(`${API_BASE_URL}/api/image-analysis/validate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: cloudResult.secure_url }),
      });
      const result = await validateRes.json();
      console.log('📋 Validation result:', result);

      // Ensure result has expected fields, provide defaults if missing
      const validationData = {
        confidence: result.confidence || 0,
        modelConfidence: result.modelConfidence || 0,
        openaiConfidence: result.openaiConfidence || 0,
        allowUpload: result.allowUpload || false,
        message: result.message || 'No validation message provided',
        raw: result.raw || null,
      };
      setImageValidation(validationData);

      // Delete invalid images from Cloudinary
      if (!validationData.allowUpload && cloudResult.public_id) {
        try {
          const deleteRes = await fetch(`${API_BASE_URL}/cloudinary/delete-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_id: cloudResult.public_id }),
          });
          const deleteResult = await deleteRes.json();
          console.log('🗑️ Cloudinary delete response:', deleteResult);
        } catch (deleteErr) {
          console.warn('⚠️ Failed to delete image from Cloudinary:', deleteErr);
        }
      }

      // Determine display confidence
      const displayConfidence = validationData.modelConfidence >= 0.7 ? validationData.modelConfidence : validationData.openaiConfidence;

      // Show alert based on validation result
      if (typeof displayConfidence === 'number' && !isNaN(displayConfidence)) {
        if (validationData.allowUpload) {
          Alert.alert(
            '✅ Valid Civic Issue Detected!',
            `${validationData.message}\nConfidence Score: ${(displayConfidence * 100).toFixed(1)}%`,
            [{ text: 'Continue', style: 'default' }],
          );
        } else {
          Alert.alert(
            '❌ Image Validation Failed',
            `${validationData.message}\nConfidence Score: ${(displayConfidence * 100).toFixed(1)}%`,
            [
              { text: 'Change Image', onPress: () => setSelectedImage(null) },
              { text: 'Submit Anyway', style: 'destructive' },
            ],
          );
        }
      } else {
        Alert.alert(
          '❌ Image Validation Failed',
          validationData.message || 'Validation failed due to invalid confidence score.',
          [
            { text: 'Try Again', onPress: () => setSelectedImage(null) },
            { text: 'Keep Anyway', style: 'destructive' },
          ],
        );
      }
    } catch (error) {
      console.error('❌ Image validation error:', error);
      Alert.alert(
        'Validation Error',
        'Failed to validate image. Please check your connection and try again.',
        [
          { text: 'Retry', onPress: () => validateImage(imageAsset) },
          { text: 'Skip Validation', style: 'destructive' },
        ],
      );
    } finally {
      setValidatingImage(false);
    }
  };

  const submitComplaint = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a complaint title');
      return;
    }

    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter a complaint description');
      return;
    }

    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image of the civic issue');
      return;
    }

    if (imageValidation && !imageValidation.allowUpload) {
      const displayConfidence = imageValidation.modelConfidence >= 0.7 ? imageValidation.modelConfidence : imageValidation.openaiConfidence;
      Alert.alert(
        'Image Validation Failed',
        `The selected image does not appear to show a valid civic issue.\nConfidence Score: ${(typeof displayConfidence === 'number' && !isNaN(displayConfidence) ? (displayConfidence * 100).toFixed(1) : 'N/A')}%`,
        [
          { text: 'Change Image', onPress: () => setSelectedImage(null) },
          { text: 'Submit Anyway', style: 'destructive', onPress: () => proceedWithSubmission() },
        ],
      );
      return;
    }

    await proceedWithSubmission();
  };

  const proceedWithSubmission = async () => {
    setLoading(true);
    
    try {
      console.log('📤 Submitting complaint with data:', {
        ...formData,
        imageValidation: imageValidation?.allowUpload ? 'PASSED' : 'FAILED',
        priorityScore: imageValidation?.data?.priorityScore !== undefined ? imageValidation.data.priorityScore : 0,
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const displayConfidence = imageValidation?.modelConfidence >= 0.7 ? imageValidation.modelConfidence : imageValidation?.openaiConfidence;
      Alert.alert(
        '✅ Complaint Submitted Successfully!',
        imageValidation?.allowUpload
          ? `Your complaint has been submitted with priority score: ${imageValidation?.data?.priorityScore !== undefined ? (imageValidation.data.priorityScore * 100).toFixed(1) : 'N/A'}%\nConfidence Score: ${(typeof displayConfidence === 'number' && !isNaN(displayConfidence) ? (displayConfidence * 100).toFixed(1) : 'N/A')}%`
          : 'Your complaint has been submitted for review.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      console.error('❌ Submission error:', error);
      Alert.alert('Error', 'Failed to submit complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderImageValidationStatus = () => {
    if (validatingImage) {
      return (
        <View style={styles.validationStatus}>
          <ActivityIndicator size="small" color="#2E7D32" />
          <Text style={styles.validationText}>🔍 Validating civic issue...</Text>
        </View>
      );
    }

    if (imageValidation) {
      const displayConfidence = imageValidation.modelConfidence >= 0.7 ? imageValidation.modelConfidence : imageValidation.openaiConfidence;
      if (imageValidation.allowUpload) {
        return (
          <View style={[styles.validationStatus, styles.validationSuccess]}>
            <Text style={styles.validationText}>
              ✅ Valid civic issue detected! Priority: {imageValidation?.data?.priorityScore !== undefined ? (imageValidation.data.priorityScore * 100).toFixed(1) : 'N/A'}%
              {'\n'}Confidence Score: {(typeof displayConfidence === 'number' && !isNaN(displayConfidence) ? (displayConfidence * 100).toFixed(1) : 'N/A')}%
            </Text>
          </View>
        );
      } else {
        return (
          <View style={[styles.validationStatus, styles.validationError]}>
            <Text style={styles.validationText}>
              ❌ {imageValidation.message || 'Validation failed'}
              {'\n'}Confidence Score: {(typeof displayConfidence === 'number' && !isNaN(displayConfidence) ? (displayConfidence * 100).toFixed(1) : 'N/A')}%
            </Text>
          </View>
        );
      }
    }

    return null;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Submit Civic Complaint</Text>
        <Text style={styles.subtitle}>Report civic issues in your area</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Complaint Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Brief title describing the issue"
          value={formData.title}
          onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
        />

        {/* Language Picker for Speech-to-Text */}
        <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Select Spoken Language:</Text>
        <Picker
          selectedValue={selectedLang}
          onValueChange={setSelectedLang}
          style={{ backgroundColor: '#f0f0f0', borderRadius: 8, marginBottom: 12 }}
        >
          <Picker.Item label="English" value="en-US" />
          <Picker.Item label="Hindi" value="hi-IN" />
          <Picker.Item label="Telugu" value="te-IN" />
          <Picker.Item label="Tamil" value="ta-IN" />
          <Picker.Item label="Kannada" value="kn-IN" />
          <Picker.Item label="Urdu" value="ur-IN" />
        </Picker>

        <Text style={styles.label}>Description *</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            style={[styles.input, styles.textArea, { flex: 1 }]}
            placeholder="Detailed description of the civic issue"
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity onPress={isRecording ? stopVoiceInput : startVoiceInput} style={{ marginLeft: 10 }}>
            <Ionicons name={isRecording ? 'mic' : 'mic-outline'} size={28} color={isRecording ? '#2E7D32' : '#666'} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="Location or address of the issue"
          value={formData.location}
          onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
        />

        <Text style={styles.label}>Issue Photo *</Text>
        <Text style={styles.photoHint}>
          📸 Upload a clear photo showing the civic issue. Our AI will verify it's a valid civic problem.
        </Text>

        <View style={styles.imageSection}>
          {selectedImage ? (
            <View style={styles.selectedImageContainer}>
              <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
              <TouchableOpacity 
                style={styles.changeImageButton}
                onPress={() => setSelectedImage(null)}
              >
                <Text style={styles.changeImageText}>Change Image</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePickerContainer}>
              <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                <Text style={styles.imageButtonText}>📷 Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <Text style={styles.imageButtonText}>🖼️ Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          {renderImageValidationStatus()}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={submitComplaint}
          disabled={loading || validatingImage}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Complaint</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2E7D32',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F5E8',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  photoHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  imageSection: {
    marginBottom: 20,
  },
  imagePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  imageButton: {
    backgroundColor: '#2E7D32',
    padding: 15,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedImageContainer: {
    alignItems: 'center',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  changeImageButton: {
    backgroundColor: '#666',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  changeImageText: {
    color: '#fff',
    fontSize: 14,
  },
  validationStatus: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  validationSuccess: {
    backgroundColor: '#E8F5E8',
    borderColor: '#2E7D32',
    borderWidth: 1,
  },
  validationError: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    borderWidth: 1,
  },
  validationText: {
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SubmitComplaintScreen;