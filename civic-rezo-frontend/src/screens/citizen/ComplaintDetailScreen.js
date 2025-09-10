import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Alert,
  Share,
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { makeApiCall, apiClient } from '../../../config/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

const ComplaintDetailScreen = ({ route, navigation }) => {
  const { complaintId } = route.params;
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingVote, setUpdatingVote] = useState(false);
  const insets = useSafeAreaInsets();

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [1.2, 1, 0.8],
    extrapolate: 'clamp',
  });
  
  const headerTranslate = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });
  
  const likeScale = useRef(new Animated.Value(1)).current;
  
  // Fetch complaint details
  useEffect(() => {
    fetchComplaintDetails();
  }, [complaintId]);
  
  // Listen to scroll event
  useEffect(() => {
    const showHeaderAnimation = Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    });
    
    const listener = scrollY.addListener(({ value }) => {
      if (value > 80 && headerOpacity._value === 0) {
        showHeaderAnimation.start();
      } else if (value <= 80 && headerOpacity._value === 1) {
        Animated.timing(headerOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    });
    
    return () => {
      scrollY.removeListener(listener);
      headerOpacity.setValue(0);
    };
  }, []);

  const fetchComplaintDetails = async () => {
    setLoading(true);
    try {
      const response = await makeApiCall(
        `${apiClient.baseUrl}/api/complaints/${complaintId}`,
        { method: 'GET' }
      );
      
      if (response.success && response.complaint) {
        // Calculate time ago
        const timeAgo = getTimeAgo(new Date(response.complaint.created_at));
        
        setComplaint({
          ...response.complaint,
          timeAgo,
          voteCount: response.complaint.vote_count || 0,
          userVoted: response.complaint.userVoted || false,
        });
      } else {
        console.error('❌ Error fetching complaint details:', response);
        Alert.alert(
          "Error",
          "Could not load complaint details. Please try again later.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('❌ Error fetching complaint details:', error);
      Alert.alert(
        "Error",
        "An error occurred while loading the complaint. Please try again.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (updatingVote) return;
    
    // Animate like button
    Animated.sequence([
      Animated.timing(likeScale, {
        toValue: 1.3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(likeScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Update UI optimistically
    setComplaint({
      ...complaint,
      userVoted: !complaint.userVoted,
      voteCount: complaint.voteCount + (complaint.userVoted ? -1 : 1),
    });
    
    // Make API call
    setUpdatingVote(true);
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
        setComplaint({
          ...complaint,
          userVoted: !complaint.userVoted,
          voteCount: complaint.voteCount + (complaint.userVoted ? 1 : -1),
        });
        
        Alert.alert(
          "Vote Failed",
          "There was a problem recording your vote. Please try again.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('❌ Error voting for complaint:', error);
      // Revert changes if API call errors
      setComplaint({
        ...complaint,
        userVoted: !complaint.userVoted,
        voteCount: complaint.voteCount + (complaint.userVoted ? 1 : -1),
      });
    } finally {
      setUpdatingVote(false);
    }
  };
  
  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Check out this civic issue: ${complaint.title} - Reported via CivicRezo App`,
        url: `https://civicrezo.org/complaints/${complaintId}`,
        title: 'Share Civic Issue',
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share this complaint');
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
        return <MaterialCommunityIcons name="road-variant" size={20} color="#ff9800" />;
      case 'pothole':
        return <FontAwesome5 name="dot-circle" size={18} color="#f44336" />;
      case 'water_issue':
        return <Ionicons name="water" size={20} color="#2196f3" />;
      case 'sewage_overflow':
        return <MaterialCommunityIcons name="water-pump" size={20} color="#795548" />;
      case 'garbage':
        return <MaterialCommunityIcons name="delete" size={20} color="#8bc34a" />;
      case 'streetlight':
        return <Ionicons name="flashlight" size={20} color="#ffc107" />;
      case 'electricity':
        return <Ionicons name="flash" size={20} color="#ffeb3b" />;
      case 'tree_issue':
        return <MaterialCommunityIcons name="tree" size={20} color="#4caf50" />;
      case 'flooding':
        return <MaterialCommunityIcons name="home-flood" size={20} color="#03a9f4" />;
      default:
        return <MaterialCommunityIcons name="alert-circle" size={20} color="#9e9e9e" />;
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
  
  const getStatusSteps = (status) => {
    const steps = [
      { name: 'Submitted', completed: true },
      { name: 'Verified', completed: ['in_progress', 'resolved'].includes(status) },
      { name: 'In Progress', completed: ['in_progress', 'resolved'].includes(status) },
      { name: 'Resolved', completed: status === 'resolved' }
    ];
    
    if (status === 'rejected') {
      return [
        { name: 'Submitted', completed: true },
        { name: 'Reviewed', completed: true },
        { name: 'Rejected', completed: true, isRejected: true }
      ];
    }
    
    return steps;
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading complaint details...</Text>
      </View>
    );
  }

  if (!complaint) {
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={60} color="#f44336" />
        <Text style={styles.errorTitle}>Complaint Not Found</Text>
        <Text style={styles.errorText}>The complaint you're looking for doesn't exist or has been removed.</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Animated header */}
      <Animated.View 
        style={[
          styles.animatedHeader, 
          { 
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslate }],
            paddingTop: insets.top,
          }
        ]}
      >
        <TouchableOpacity
          style={styles.backIcon}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{complaint.title}</Text>
        <TouchableOpacity style={styles.shareIcon} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Image section */}
        <Animated.View 
          style={[
            styles.imageContainer,
            { 
              transform: [{ scale: imageScale }],
              paddingTop: insets.top,
            }
          ]}
        >
          {complaint.image_urls && complaint.image_urls.length > 0 ? (
            <Image 
              source={{ uri: complaint.image_urls[0] }} 
              style={styles.complaintImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImageContainer}>
              <Ionicons name="image" size={80} color="#ddd" />
              <Text style={styles.noImageText}>No image available</Text>
            </View>
          )}
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.imageGradient}
          />
          
          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + 10 }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.imageBottomContent}>
            <View style={styles.categoryBadge}>
              {getCategoryIcon(complaint.category)}
              <Text style={styles.categoryText}>
                {complaint.category?.replace('_', ' ')}
              </Text>
            </View>
            
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share-social" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
        
        {/* Content section */}
        <View style={styles.contentContainer}>
          {/* Title and status */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{complaint.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(complaint.status) }]}>
              <Text style={styles.statusText}>
                {complaint.status?.charAt(0).toUpperCase() + complaint.status?.slice(1).replace('_', ' ')}
              </Text>
            </View>
          </View>
          
          {/* User and time */}
          <View style={styles.userContainer}>
            <View style={styles.userInfo}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {complaint.user?.full_name ? complaint.user.full_name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <View>
                <Text style={styles.userName}>
                  {complaint.user?.full_name || 'Anonymous User'}
                </Text>
                <Text style={styles.timeAgo}>{complaint.timeAgo}</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.voteButton}
              onPress={handleUpvote}
              disabled={updatingVote}
            >
              <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                <Ionicons 
                  name={complaint.userVoted ? "arrow-up-circle" : "arrow-up-circle-outline"} 
                  size={30} 
                  color={complaint.userVoted ? "#3498db" : "#777"} 
                />
              </Animated.View>
              <Text style={[styles.voteCount, complaint.userVoted && styles.userVotedText]}>
                {complaint.voteCount || 0}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{complaint.description}</Text>
          </View>
          
          {/* Location */}
          <View style={styles.locationContainer}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.locationAddress}>{complaint.location_address}</Text>
            
            {complaint.location_latitude && complaint.location_longitude && (
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: complaint.location_latitude,
                    longitude: complaint.location_longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: complaint.location_latitude,
                      longitude: complaint.location_longitude,
                    }}
                    title={complaint.title}
                  >
                    <View style={styles.customMarker}>
                      <View style={styles.markerBody}>
                        {getCategoryIcon(complaint.category)}
                      </View>
                      <View style={styles.markerArrow} />
                    </View>
                  </Marker>
                  
                  <Circle
                    center={{
                      latitude: complaint.location_latitude,
                      longitude: complaint.location_longitude,
                    }}
                    radius={150}
                    fillColor="rgba(52, 152, 219, 0.2)"
                    strokeColor="rgba(52, 152, 219, 0.5)"
                    strokeWidth={1}
                  />
                </MapView>
                
                <TouchableOpacity 
                  style={styles.viewOnMapButton}
                  onPress={() => navigation.navigate('ComplaintMap', { 
                    initialRegion: {
                      latitude: complaint.location_latitude,
                      longitude: complaint.location_longitude,
                      latitudeDelta: 0.02,
                      longitudeDelta: 0.02,
                    },
                    selectedComplaint: complaint
                  })}
                >
                  <Text style={styles.viewOnMapText}>View on Full Map</Text>
                  <Ionicons name="map-outline" size={16} color="#3498db" />
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          {/* Status Timeline */}
          <View style={styles.statusTimelineContainer}>
            <Text style={styles.sectionTitle}>Status Updates</Text>
            <View style={styles.timeline}>
              {getStatusSteps(complaint.status).map((step, index) => (
                <View key={index} style={styles.timelineItem}>
                  <View 
                    style={[
                      styles.timelineDot, 
                      step.completed && styles.completedDot,
                      step.isRejected && styles.rejectedDot
                    ]}
                  />
                  {index < getStatusSteps(complaint.status).length - 1 && (
                    <View 
                      style={[
                        styles.timelineLine,
                        getStatusSteps(complaint.status)[index + 1].completed && styles.completedLine,
                        step.isRejected && styles.rejectedLine
                      ]} 
                    />
                  )}
                  <Text 
                    style={[
                      styles.timelineText,
                      step.completed && styles.completedText,
                      step.isRejected && styles.rejectedText
                    ]}
                  >
                    {step.name}
                  </Text>
                </View>
              ))}
            </View>
            
            {/* Complaint updates */}
            {complaint.updates && complaint.updates.length > 0 ? (
              <View style={styles.updatesContainer}>
                {complaint.updates.map((update, index) => (
                  <View key={index} style={styles.updateItem}>
                    <View style={styles.updateHeader}>
                      <Text style={styles.updateTitle}>
                        Status changed to{' '}
                        <Text style={{ 
                          color: getStatusColor(update.new_status),
                          fontWeight: 'bold'
                        }}>
                          {update.new_status?.replace('_', ' ')}
                        </Text>
                      </Text>
                      <Text style={styles.updateTime}>{formatDate(update.created_at)}</Text>
                    </View>
                    {update.update_notes && (
                      <Text style={styles.updateNotes}>{update.update_notes}</Text>
                    )}
                  </View>
                ))}
              </View>
            ) : complaint.resolved_at ? (
              <View style={styles.updateItem}>
                <View style={styles.updateHeader}>
                  <Text style={styles.updateTitle}>
                    Status changed to{' '}
                    <Text style={{ 
                      color: getStatusColor('resolved'),
                      fontWeight: 'bold'
                    }}>
                      Resolved
                    </Text>
                  </Text>
                  <Text style={styles.updateTime}>{formatDate(complaint.resolved_at)}</Text>
                </View>
                {complaint.resolution_notes && (
                  <Text style={styles.updateNotes}>{complaint.resolution_notes}</Text>
                )}
              </View>
            ) : (
              <Text style={styles.noUpdatesText}>
                No status updates yet. We'll notify you when there's progress.
              </Text>
            )}
          </View>
          
          {/* Priority Information */}
          <View style={styles.priorityContainer}>
            <Text style={styles.sectionTitle}>Priority Information</Text>
            <View style={styles.priorityRow}>
              <View style={styles.priorityItem}>
                <Text style={styles.priorityLabel}>Priority Score</Text>
                <View style={[styles.priorityBadge, { 
                  backgroundColor: getPriorityColor(complaint.priority_score)
                }]}>
                  <Text style={styles.priorityScore}>
                    {complaint.priority_score?.toFixed(2) || 'N/A'}
                  </Text>
                </View>
              </View>
              <View style={styles.priorityItem}>
                <Text style={styles.priorityLabel}>Location Impact</Text>
                <View style={[styles.priorityBadge, { 
                  backgroundColor: getPriorityColor(complaint.location_sensitivity_score)
                }]}>
                  <Text style={styles.priorityScore}>
                    {complaint.location_sensitivity_score?.toFixed(2) || 'N/A'}
                  </Text>
                </View>
              </View>
              <View style={styles.priorityItem}>
                <Text style={styles.priorityLabel}>AI Confidence</Text>
                <View style={[styles.priorityBadge, { 
                  backgroundColor: getPriorityColor(complaint.ai_confidence_score)
                }]}>
                  <Text style={styles.priorityScore}>
                    {complaint.ai_confidence_score?.toFixed(2) || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Metadata */}
          <View style={styles.metadataContainer}>
            <Text style={styles.metadataText}>Complaint ID: {complaint.id}</Text>
            <Text style={styles.metadataText}>Submitted: {formatDate(complaint.created_at)}</Text>
            {complaint.resolved_at && (
              <Text style={styles.metadataText}>Resolved: {formatDate(complaint.resolved_at)}</Text>
            )}
          </View>
          
          {/* Similar Complaints */}
          {complaint.similarComplaints && complaint.similarComplaints.length > 0 && (
            <View style={styles.similarContainer}>
              <Text style={styles.sectionTitle}>Similar Complaints Nearby</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.similarList}
              >
                {complaint.similarComplaints.map((similar, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={styles.similarItem}
                    onPress={() => navigation.replace('ComplaintDetail', { complaintId: similar.id })}
                  >
                    {similar.image_urls && similar.image_urls.length > 0 ? (
                      <Image 
                        source={{ uri: similar.image_urls[0] }} 
                        style={styles.similarImage}
                      />
                    ) : (
                      <View style={styles.noSimilarImage}>
                        <Ionicons name="image" size={20} color="#ddd" />
                      </View>
                    )}
                    <Text style={styles.similarTitle} numberOfLines={1}>{similar.title}</Text>
                    <View style={styles.similarFooter}>
                      <View style={[styles.similarStatus, { 
                        backgroundColor: getStatusColor(similar.status)
                      }]}>
                        <Text style={styles.similarStatusText}>
                          {similar.status?.charAt(0).toUpperCase() + similar.status?.slice(1)}
                        </Text>
                      </View>
                      <Text style={styles.similarDistance}>{similar.distance}m</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          {/* Bottom space */}
          <View style={{ height: 80 }} />
        </View>
      </ScrollView>
    </View>
  );
};

const getPriorityColor = (score) => {
  if (!score) return '#9e9e9e';
  
  if (score >= 0.7) return '#f44336';
  if (score >= 0.5) return '#ff9800';
  if (score >= 0.3) return '#ffc107';
  return '#4caf50';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 90 : 60,
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  backIcon: {
    position: 'absolute',
    left: 16,
    bottom: 14,
  },
  shareIcon: {
    position: 'absolute',
    right: 16,
    bottom: 14,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    maxWidth: '70%',
  },
  imageContainer: {
    height: 300,
    width: '100%',
    position: 'relative',
  },
  complaintImage: {
    height: '100%',
    width: '100%',
  },
  noImageContainer: {
    height: '100%',
    width: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#999',
    marginTop: 10,
    fontSize: 16,
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageBottomContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  userContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  userName: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 15,
  },
  timeAgo: {
    color: '#777',
    fontSize: 12,
    marginTop: 2,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 20,
  },
  voteCount: {
    marginLeft: 6,
    fontWeight: 'bold',
    color: '#777',
    fontSize: 15,
  },
  userVotedText: {
    color: '#3498db',
  },
  descriptionContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  locationContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  locationAddress: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
  },
  mapContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  customMarker: {
    alignItems: 'center',
  },
  markerBody: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#3498db',
  },
  viewOnMapButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  viewOnMapText: {
    color: '#3498db',
    fontSize: 12,
    marginRight: 4,
    fontWeight: '500',
  },
  statusTimelineContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeline: {
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ddd',
    marginRight: 10,
  },
  completedDot: {
    backgroundColor: '#4caf50',
  },
  rejectedDot: {
    backgroundColor: '#f44336',
  },
  timelineLine: {
    position: 'absolute',
    top: 16,
    left: 8,
    width: 2,
    height: 30,
    backgroundColor: '#ddd',
  },
  completedLine: {
    backgroundColor: '#4caf50',
  },
  rejectedLine: {
    backgroundColor: '#f44336',
  },
  timelineText: {
    fontSize: 14,
    color: '#777',
  },
  completedText: {
    color: '#4caf50',
    fontWeight: '500',
  },
  rejectedText: {
    color: '#f44336',
    fontWeight: '500',
  },
  updatesContainer: {
    marginTop: 8,
  },
  updateItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  updateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  updateTitle: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  updateTime: {
    fontSize: 12,
    color: '#999',
  },
  updateNotes: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  noUpdatesText: {
    fontSize: 14,
    color: '#777',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  priorityContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  priorityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityItem: {
    alignItems: 'center',
    flex: 1,
  },
  priorityLabel: {
    fontSize: 12,
    color: '#777',
    marginBottom: 6,
  },
  priorityBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityScore: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  metadataContainer: {
    backgroundColor: '#f0f2f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  metadataText: {
    fontSize: 12,
    color: '#777',
    marginBottom: 2,
  },
  similarContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  similarList: {
    paddingVertical: 8,
  },
  similarItem: {
    width: 140,
    marginRight: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    overflow: 'hidden',
  },
  similarImage: {
    width: '100%',
    height: 80,
  },
  noSimilarImage: {
    width: '100%',
    height: 80,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  similarTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    padding: 8,
    paddingBottom: 4,
  },
  similarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  similarStatus: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  similarStatusText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: 'bold',
  },
  similarDistance: {
    fontSize: 10,
    color: '#777',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ComplaintDetailScreen;
