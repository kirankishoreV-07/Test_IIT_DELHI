import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { makeApiCall, apiClient } from '../../../config/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LocationService from '../../services/LocationService';

const { width } = Dimensions.get('window');
const CARD_HEIGHT = 380;

const ComplaintFeedScreen = ({ navigation }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const insets = useSafeAreaInsets();

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const likeAnimations = useRef({});

  // Get current location on component mount
  useEffect(() => {
    fetchUserLocation();
  }, []);

  // Fetch complaints when location is available
  useEffect(() => {
    if (userLocation) {
      fetchNearbyComplaints();
    }
  }, [userLocation]);

  const fetchUserLocation = async () => {
    setLocationLoading(true);
    try {
      // Use the LocationService singleton instance directly
      const locationData = await LocationService.getExactLocation();

      if (locationData) {
        console.log('📍 User location:', locationData);
        setUserLocation({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        });
      } else {
        Alert.alert(
          "Location Error",
          "We couldn't determine your current location. Please check your device settings and try again.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('❌ Error getting location:', error);
      Alert.alert(
        "Location Error",
        "We need your location to show nearby complaints. Please enable location services.",
        [
          { text: "Cancel" },
          { 
            text: "Settings", 
            onPress: async () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }
          }
        ]
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const fetchNearbyComplaints = async () => {
    if (!userLocation) return;
    
    setLoading(true);
    try {
      // Call the backend API to get complaints within 5km
      const response = await makeApiCall(
        `${apiClient.baseUrl}/api/complaints?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&radius=5000`,
        { method: 'GET' }
      );
      
      if (response.success && response.complaints) {
        // Create animation refs for each complaint
        const complaintsWithDetails = response.complaints.map(complaint => {
          // Initialize like animation if it doesn't exist
          if (!likeAnimations.current[complaint.id]) {
            likeAnimations.current[complaint.id] = new Animated.Value(complaint.userVoted ? 1 : 0);
          }
          
          // Calculate time ago
          const timeAgo = getTimeAgo(new Date(complaint.created_at));
          
          return {
            ...complaint,
            timeAgo,
            voteCount: complaint.vote_count || 0,
            userVoted: complaint.userVoted || false,
          };
        });
        
        setComplaints(complaintsWithDetails);
      } else {
        console.error('❌ Error fetching complaints:', response);
        setComplaints([]);
      }
    } catch (error) {
      console.error('❌ Error fetching nearby complaints:', error);
      Alert.alert(
        "Couldn't Load Complaints",
        "There was a problem loading complaints. Please try again later.",
        [{ text: "OK" }]
      );
      setComplaints([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserLocation();
    if (userLocation) {
      await fetchNearbyComplaints();
    } else {
      setRefreshing(false);
    }
  };

  const handleUpvote = async (complaintId, index) => {
    // Find the complaint in the state
    const complaint = complaints.find(c => c.id === complaintId);
    if (!complaint) return;
    
    // Animate the like button immediately for better UX
    Animated.sequence([
      Animated.timing(likeAnimations.current[complaintId], {
        toValue: complaint.userVoted ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(100),
      Animated.spring(likeAnimations.current[complaintId], {
        toValue: complaint.userVoted ? 0 : 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();

    // Update UI optimistically
    const updatedComplaints = [...complaints];
    const complaintIndex = updatedComplaints.findIndex(c => c.id === complaintId);
    
    if (complaintIndex > -1) {
      const voteChange = complaint.userVoted ? -1 : 1;
      updatedComplaints[complaintIndex] = {
        ...updatedComplaints[complaintIndex],
        voteCount: (updatedComplaints[complaintIndex].voteCount || 0) + voteChange,
        userVoted: !updatedComplaints[complaintIndex].userVoted
      };
      setComplaints(updatedComplaints);
    }

    // Make API call to update vote
    try {
      const response = await makeApiCall(
        `${apiClient.baseUrl}/api/complaints/vote`,
        {
          method: 'POST',
          body: JSON.stringify({
            complaintId,
            action: complaint.userVoted ? 'downvote' : 'upvote'
          })
        }
      );
      
      if (!response.success) {
        // Revert changes if API call fails
        console.error('❌ Vote API call failed:', response);
        const revertedComplaints = [...complaints];
        revertedComplaints[complaintIndex] = complaint;
        setComplaints(revertedComplaints);
        
        Alert.alert(
          "Vote Failed",
          "There was a problem recording your vote. Please try again.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('❌ Error voting for complaint:', error);
      // Revert changes if API call errors
      const revertedComplaints = [...complaints];
      revertedComplaints[complaintIndex] = complaint;
      setComplaints(revertedComplaints);
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `${diffInWeeks}w ago`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths}mo ago`;
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'road_damage':
        return <MaterialCommunityIcons name="road-variant" size={18} color="#ff9800" />;
      case 'pothole':
        return <FontAwesome5 name="dot-circle" size={16} color="#f44336" />;
      case 'water_issue':
        return <Ionicons name="water" size={18} color="#2196f3" />;
      case 'sewage_overflow':
        return <MaterialCommunityIcons name="water-pump" size={18} color="#795548" />;
      case 'garbage':
        return <MaterialCommunityIcons name="delete" size={18} color="#8bc34a" />;
      case 'streetlight':
        return <Ionicons name="flashlight" size={18} color="#ffc107" />;
      case 'electricity':
        return <Ionicons name="flash" size={18} color="#ffeb3b" />;
      case 'tree_issue':
        return <MaterialCommunityIcons name="tree" size={18} color="#4caf50" />;
      case 'flooding':
        return <MaterialCommunityIcons name="home-flood" size={18} color="#03a9f4" />;
      default:
        return <MaterialCommunityIcons name="alert-circle" size={18} color="#9e9e9e" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f57c00';
      case 'in_progress':
        return '#2196f3';
      case 'resolved':
        return '#4caf50';
      case 'rejected':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const renderComplaintCard = ({ item, index }) => {
    // Calculate animations based on scroll position
    const inputRange = [
      -1, 
      0,
      CARD_HEIGHT * index,
      CARD_HEIGHT * (index + 0.5),
      CARD_HEIGHT * (index + 1),
    ];
    
    const scale = scrollY.interpolate({
      inputRange,
      outputRange: [1, 1, 1, 0.98, 0.95],
    });
    
    const opacity = scrollY.interpolate({
      inputRange,
      outputRange: [1, 1, 1, 0.85, 0.7],
    });

    // Like button animation
    const likeScale = likeAnimations.current[item.id].interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [1, 1.3, 1],
    });

    return (
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale }],
            opacity,
          }
        ]}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {item.user?.full_name ? item.user.full_name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <View>
              <Text style={styles.userName}>
                {item.user?.full_name || 'Anonymous User'}
              </Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={12} color="#777" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.location_address?.substring(0, 30) || 'Unknown location'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeAgo}>{item.timeAgo}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>
                {item.status?.charAt(0).toUpperCase() + item.status?.slice(1).replace('_', ' ')}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Card Image */}
        <View style={styles.imageContainer}>
          {item.image_urls && item.image_urls.length > 0 ? (
            <Image 
              source={{ uri: item.image_urls[0] }} 
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImageContainer}>
              <Ionicons name="image" size={50} color="#ddd" />
              <Text style={styles.noImageText}>No image available</Text>
            </View>
          )}
          
          <View style={styles.categoryBadge}>
            {getCategoryIcon(item.category)}
            <Text style={styles.categoryText}>
              {item.category?.replace('_', ' ')}
            </Text>
          </View>
        </View>
        
        {/* Card Content */}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
        
        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={styles.voteButton} 
            onPress={() => handleUpvote(item.id, index)}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <Ionicons 
                name={item.userVoted ? "arrow-up-circle" : "arrow-up-circle-outline"} 
                size={26} 
                color={item.userVoted ? "#3498db" : "#777"} 
              />
            </Animated.View>
            <Text style={[styles.voteCount, item.userVoted && styles.userVotedText]}>
              {item.voteCount || 0}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.detailsButton}
            onPress={() => navigation.navigate('ComplaintDetail', { complaintId: item.id })}
          >
            <Text style={styles.detailsText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color="#3498db" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  if (locationLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nearby Issues</Text>
        {userLocation && (
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={fetchUserLocation}
          >
            <Ionicons name="locate" size={16} color="#fff" />
            <Text style={styles.locationButtonText}>Within 5km</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading nearby complaints...</Text>
        </View>
      ) : complaints.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>No Complaints Nearby</Text>
          <Text style={styles.emptyText}>
            There are no reported issues within 5km of your location.
          </Text>
          <TouchableOpacity 
            style={styles.reportButton}
            onPress={() => navigation.navigate('SubmitComplaint')}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.reportButtonText}>Report an Issue</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.FlatList
          data={complaints}
          renderItem={renderComplaintCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3498db']}
              tintColor="#3498db"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80, // Extra padding for bottom nav
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userName: {
    fontWeight: '600',
    color: '#333',
    fontSize: 14,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    color: '#777',
    marginLeft: 2,
    maxWidth: 150,
  },
  timeContainer: {
    alignItems: 'flex-end',
  },
  timeAgo: {
    fontSize: 11,
    color: '#999',
    marginBottom: 3,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  imageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#aaa',
    marginTop: 8,
    fontSize: 14,
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  cardContent: {
    padding: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voteCount: {
    marginLeft: 5,
    fontSize: 14,
    color: '#777',
    fontWeight: '500',
  },
  userVotedText: {
    color: '#3498db',
    fontWeight: 'bold',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ComplaintFeedScreen;
