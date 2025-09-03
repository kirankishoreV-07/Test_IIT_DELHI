import React, { useState } from 'react';
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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    category: '',
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageValidation, setImageValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validatingImage, setValidatingImage] = useState(false);

  const pickImage = async () => {
    try {
      // Request permissions
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
        setImageValidation(null); // Reset previous validation
        await validateImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      // Request permissions
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
        setImageValidation(null); // Reset previous validation
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
      // 1. Upload image to Cloudinary
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
      // 2. Send imageUrl to backend for validation
      const validateRes = await fetch(`${API_BASE_URL}/image-analysis/validate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: cloudResult.secure_url }),
      });
      const result = await validateRes.json();
      console.log('📋 Validation result:', result);
      // Use a confidence threshold for validation
      const threshold = 0.7;
      const allowUpload = result.confidence !== undefined && result.confidence >= threshold;
      setImageValidation({ ...result, allowUpload });
      // Automatically delete invalid images from Cloudinary via backend
      if (!allowUpload && cloudResult.public_id) {
        try {
          const deleteRes = await fetch(`${API_BASE_URL}/cloudinary/delete-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_id: cloudResult.public_id })
          });
          const deleteResult = await deleteRes.json();
          console.log('🗑️ Cloudinary delete response:', deleteResult);
        } catch (deleteErr) {
          console.warn('⚠️ Failed to delete image from Cloudinary:', deleteErr);
        }
      }
      if (result.confidence !== undefined) {
        if (allowUpload) {
          Alert.alert(
            '✅ Valid Civic Issue Detected!',
            `Confidence Score: ${(result.confidence * 100).toFixed(1)}%`,
            [{ text: 'Continue', style: 'default' }]
          );
        } else {
          Alert.alert(
            '❌ Image Validation Failed',
            `Confidence Score: ${(result.confidence * 100).toFixed(1)}%\nThe selected image does not appear to show a valid civic issue. Please select a different image.`,
            [
              { text: 'Change Image', onPress: () => setSelectedImage(null) },
              { text: 'Submit Anyway', style: 'destructive' }
            ]
          );
        }
      } else {
        Alert.alert(
          '❌ Image Validation Failed',
          result.message || 'Validation failed.',
          [
            { text: 'Try Again', onPress: () => setSelectedImage(null) },
            { text: 'Keep Anyway', style: 'destructive' }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Image validation error:', error);
      Alert.alert(
        'Validation Error',
        'Failed to validate image. Please check your connection and try again.',
        [
          { text: 'Retry', onPress: () => validateImage(imageAsset) },
          { text: 'Skip Validation', style: 'destructive' }
        ]
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
      Alert.alert(
        'Image Validation Failed',
        'The selected image does not appear to show a valid civic issue. Please select a different image.',
        [
          { text: 'Change Image', onPress: () => setSelectedImage(null) },
          { text: 'Submit Anyway', style: 'destructive', onPress: () => proceedWithSubmission() }
        ]
      );
      return;
    }

    await proceedWithSubmission();
  };

  const proceedWithSubmission = async () => {
    setLoading(true);
    
    try {
      // Here you would implement the actual complaint submission
      // For now, we'll just show a success message
      
      console.log('📤 Submitting complaint with data:', {
        ...formData,
        imageValidation: imageValidation?.allowUpload ? 'PASSED' : 'FAILED',
        priorityScore: imageValidation?.data?.priorityScore !== undefined ? imageValidation.data.priorityScore : 0
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      Alert.alert(
        '✅ Complaint Submitted Successfully!',
        imageValidation?.allowUpload 
          ? `Your complaint has been submitted with priority score: ${imageValidation?.data?.priorityScore !== undefined ? (imageValidation.data.priorityScore * 100).toFixed(1) : 'N/A'}%`
          : 'Your complaint has been submitted for review.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
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
      if (imageValidation.allowUpload) {
        return (
          <View style={[styles.validationStatus, styles.validationSuccess]}>
            <Text style={styles.validationText}>
              ✅ Valid civic issue detected! Priority: {imageValidation?.data?.priorityScore !== undefined ? (imageValidation.data.priorityScore * 100).toFixed(1) : 'N/A'}%
            </Text>
          </View>
        );
      } else {
        return (
          <View style={[styles.validationStatus, styles.validationError]}>
            <Text style={styles.validationText}>❌ {imageValidation.message}</Text>
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

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Detailed description of the civic issue"
          value={formData.description}
          onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
          multiline
          numberOfLines={4}
        />

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
