import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Modal,
  Platform,
  TextInput,
  Keyboard,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import EnvironmentalTheme from '../../theme/EnvironmentalTheme';
import { API_BASE_URL, apiClient, makeApiCall } from '../../../config/supabase';

// Using API_BASE_URL from config instead of hardcoded URL
// This ensures consistent API access across different environments

// Note: EnvironmentalTheme is now imported directly at the top of the file

const ComplaintMapScreen = ({ navigation, route }) => {
  // Safe theme access functions
  const getThemeColor = (path, defaultColor) => {
    try {
      // Parse dot notation path like 'primary.main'
      const parts = path.split('.');
      let value = EnvironmentalTheme;
      for (const part of parts) {
        if (!value || typeof value !== 'object') return defaultColor;
        value = value[part];
      }
      return value || defaultColor;
    } catch (e) {
      return defaultColor;
    }
  };
  
  const getGradient = (name, defaultGradient) => {
    try {
      return EnvironmentalTheme?.gradients?.[name] || defaultGradient;
    } catch (e) {
      return defaultGradient;
    }
  };
  
  const getThemeValue = (path, defaultValue) => {
    try {
      // Parse dot notation path like 'shadows.medium'
      const parts = path.split('.');
      let value = EnvironmentalTheme;
      for (const part of parts) {
        if (!value || typeof value !== 'object') return defaultValue;
        value = value[part];
      }
      return value || defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };

  // Safely access route props with fallbacks
  const routeParams = route?.params || {};
  
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [statistics, setStatistics] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchMarker, setSearchMarker] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const searchQueryRef = React.useRef('');
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [region, setRegion] = useState({
    latitude: 11.0168,
    longitude: 76.9558,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [mapRef, setMapRef] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isFetching, setIsFetching] = useState(false);
  // Use ref to track fetching state across renders
  const isFetchingRef = React.useRef(false);

  // Fetch complaint data from API or local storage
  useEffect(() => {
    // Initial data fetch - using a small delay to avoid race conditions
    const initialFetch = setTimeout(() => {
      fetchComplaintData();
    }, 300);
    
    // Fetch user location
    fetchUserLocation();

    // Check if there's a new complaint from navigation params
    if (routeParams.newComplaint) {
      handleNewComplaint(routeParams.newComplaint);
    }

    // Clean up the initial fetch timer
    return () => clearTimeout(initialFetch);
  }, []); // Only run on initial mount

  // Handle auto-refresh in a separate effect to avoid refetching when other dependencies change
  useEffect(() => {
    let refreshInterval;
    
    if (autoRefresh) {
      // Use a ref to check the fetching state to avoid stale closure issues
      refreshInterval = setInterval(() => {
        if (!isFetchingRef.current) {
          console.log('Auto-refresh triggered, fetching data...');
          fetchComplaintData();
        } else {
          console.log('Auto-refresh skipped, fetch already in progress');
        }
      }, 300000); // Refresh every 5 minutes
      
      console.log('Auto-refresh enabled, interval set to 5 minutes');
    } else {
      console.log('Auto-refresh disabled');
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        console.log('Auto-refresh interval cleared');
      }
    };
  }, [autoRefresh]); // Remove isFetching dependency to avoid recreating the interval
  
  // Clear search marker when component unmounts or when map is significantly moved
  useEffect(() => {
    return () => {
      setSearchMarker(null);
    };
  }, []);
  
  // Add keyboard listener to handle dismissal properly
  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        // No action needed, just making sure keyboard events are properly handled
      }
    );
    
    return () => {
      keyboardDidHideListener.remove();
    };
  }, []);
  
  // Add listener for map movements to improve search marker interaction
  useEffect(() => {
    let timeoutId;
    
    // When region changes significantly, consider removing the search marker
    // This makes the UX better by only showing search results when relevant
    const handleRegionChangeComplete = (newRegion) => {
      // Skip if no search marker or if change is minor
      if (!searchMarker) return;
      
      // Calculate distance between current region and search marker
      const distance = calculateDistance(
        newRegion.latitude,
        newRegion.longitude,
        searchMarker.latitude,
        searchMarker.longitude
      );
      
      // If moved significantly (more than ~5km), clear the search marker after a delay
      if (distance > 5) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setSearchMarker(null);
        }, 2000);
      }
    };
    
    // Update the handler when region or search marker changes
    if (mapRef && searchMarker) {
      // We can't directly add listener to mapRef, but we can use region changes
      // to track when user moves away from search result
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [region, searchMarker]);

  // Handle a new complaint from navigation params
  const handleNewComplaint = (newComplaint) => {
    if (newComplaint) {
      // Add the new complaint to the existing list
      setComplaints(prevComplaints => {
        // Only add if not already present
        const exists = prevComplaints.some(c => c.id === newComplaint.id);
        if (!exists) {
          const updatedComplaints = [...prevComplaints, newComplaint];
          // Update statistics
          updateStatistics(updatedComplaints);
          // Animate to the new complaint location
          if (mapRef && newComplaint.latitude && newComplaint.longitude) {
            mapRef.animateToRegion({
              latitude: parseFloat(newComplaint.latitude),
              longitude: parseFloat(newComplaint.longitude),
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
          }
          return updatedComplaints;
        }
        return prevComplaints;
      });
    }
  };

  // Fetch user's current location
  const fetchUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);

      // Update map region to user's location
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      console.error("Error getting location:", error);
      setErrorMsg('Could not fetch location');
    }
  };

  // Go to user's current location
  const goToUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature');
        return;
      }

      setLoading(true);
      const location = await Location.getCurrentPositionAsync({});
      setLoading(false);

      if (mapRef) {
        mapRef.animateToRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Could not get your current location');
      console.error(error);
    }
  };

  // Fetch complaints data from backend with debouncing to prevent rapid calls
  const fetchComplaintData = async (retryCount = 0) => {
    const maxRetries = 3;
    
    // Use ref to track fetching state - more reliable than state across renders
  if (isFetchingRef.current) {
    console.log('API call already in progress (ref), skipping...');
    return;
  }
  
  // Set both state and ref
  isFetchingRef.current = true;
  setIsFetching(true);
  setLoading(true);
  
  console.log('Starting API fetch for complaints data...');
    
    try {
      // Using the correct API endpoint from apiClient
      const response = await makeApiCall(apiClient.complaints.all);
      
      // Check if the response is successful and has data
      if (response && response.success && Array.isArray(response.data)) {
        // Map database fields to frontend expected format
        const formattedComplaints = response.data.map(complaint => ({
          id: complaint.id,
          title: complaint.title,
          description: complaint.description,
          latitude: parseFloat(complaint.location_latitude),
          longitude: parseFloat(complaint.location_longitude),
          status: complaint.status,
          created_at: complaint.created_at,
          priority: complaint.priority_score,
          location: complaint.location_address,
          category: complaint.category
        }));
        
        // Use real data from database
        setComplaints(formattedComplaints);
        updateStatistics(formattedComplaints);
        console.log('Successfully fetched real data from database');
      } else {
        console.error('Invalid data format or empty response:', response);
        // Show error to user
        Alert.alert(
          'Data Fetch Error',
          'Unable to retrieve complaint data. Please try again later.',
          [{ text: 'OK' }]
        );
        // Initialize with empty data
        setComplaints([]);
        updateStatistics([]);
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
      
      // Retry logic for network errors
      if (retryCount < maxRetries && error.message.includes('Network request failed')) {
        console.log(`Retrying API call (${retryCount + 1}/${maxRetries})...`);
        setTimeout(() => fetchComplaintData(retryCount + 1), 2000 * (retryCount + 1)); // Exponential backoff
        return;
      }
      
      // Show error to user
      Alert.alert(
        'Connection Error',
        'Could not connect to the server. Please check your network connection and try again.',
        [{ text: 'OK' }]
      );
      // Initialize with empty data
      setComplaints([]);
      updateStatistics([]);
    } finally {
      // Ensure state updates happen in correct order with a small delay
      setTimeout(() => {
        setLoading(false);
        setLastUpdated(new Date());
        // Update both state and ref
        setIsFetching(false);
        isFetchingRef.current = false;
        console.log('Fetch complete, ready for next API call');
      }, 300); // Slightly longer delay to ensure everything settles
    }
  };

  // Update complaint statistics
  const updateStatistics = (data) => {
    const stats = {
      total: data.length,
      pending: data.filter(c => c.status === 'pending').length,
      active: data.filter(c => c.status === 'in_progress').length,
      resolved: data.filter(c => c.status === 'completed').length
    };
    setStatistics(stats);
  };

  // Filter complaints based on status
  const getFilteredComplaints = () => {
    if (filterStatus === 'all') return complaints;
    return complaints.filter(complaint => complaint.status === filterStatus);
  };

  // Search for a location with direct reverse geocoding for more reliable results
  const searchLocation = async () => {
    // Use the ref value to ensure we have the most up-to-date search query
    const currentQuery = searchQueryRef.current || searchQuery;
    
    if (!currentQuery.trim()) {
      Alert.alert('Empty Search', 'Please enter a location to search');
      return;
    }
    
    // Prevent multiple search attempts at once
    if (isSearching) return;
    
    setIsSearching(true);
    console.log('Searching for location:', currentQuery);
    
    try {
      // Using Nominatim OpenStreetMap service which doesn't require an API key
      const encodedQuery = encodeURIComponent(currentQuery);
      const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1`;
      
      console.log('Sending geocode request to:', url);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CivicRezoCitizenApp' // Be respectful to the free API
        }
      });
      
      if (!response.ok) {
        throw new Error(`Network error: ${response.status} ${response.statusText}`);
      }
      
      const results = await response.json();
      console.log('Geocode results:', results);
      
      if (results && results.length > 0) {
        const firstResult = results[0];
        
        // OpenStreetMap returns lat/lon as strings
        const latitude = parseFloat(firstResult.lat);
        const longitude = parseFloat(firstResult.lon);
        
        if (isNaN(latitude) || isNaN(longitude)) {
          throw new Error('Invalid coordinates in search result');
        }
        
        console.log('Found location:', { latitude, longitude, display_name: firstResult.display_name });
        
        // Update region with animation
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.02, // Closer zoom level
          longitudeDelta: 0.02,
        };
        
        // Set region state
        setRegion(newRegion);
        
        // Close the search modal
        setShowSearchModal(false);
        
        // Animate to the location
        if (mapRef && mapRef.animateToRegion) {
          console.log('Animating map to new region');
          // Use a direct call without setTimeout to avoid potential issues
          mapRef.animateToRegion(newRegion, 1000);
        } else {
          console.warn('Map reference is not available for animation');
        }
        
        // Add a temporary marker for the searched location
        const searchedLocation = {
          id: 'search-result',
          latitude,
          longitude,
          title: firstResult.display_name || 'Searched Location',
          description: searchQuery,
          isSearchResult: true
        };
        
        // Set the search marker to display it on the map
        setSearchMarker(searchedLocation);
        
        // Save to recent searches (limit to 5)
        // Use the current query from ref to ensure consistency
        const currentQuery = searchQueryRef.current || searchQuery;
        
        const newSearch = { 
          query: currentQuery, 
          timestamp: new Date(),
          displayName: firstResult.display_name 
        };
        
        setRecentSearches(prev => {
          // Filter out any existing identical searches
          const filteredSearches = prev.filter(item => item.query.toLowerCase() !== currentQuery.toLowerCase());
          // Add new search to beginning and limit to 5
          return [newSearch, ...filteredSearches].slice(0, 5);
        });
        
        // Clear search query after successful search
        setSearchQuery('');
        
      } else {
        console.log('No location found for query:', searchQuery);
        Alert.alert(
          'Location Not Found', 
          'We couldn\'t find that location. Please try a more specific address or landmark.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Search error details:', error);
      Alert.alert(
        'Search Error', 
        `Could not search for this location: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Get color based on status
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FF4444';
      case 'in_progress': return '#FF8800';
      case 'completed': return '#00AA44';
      default: return getThemeColor('primary.main', '#2E7D32');
    }
  };

  // Format date string
  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return dateStr || 'Unknown date';
    }
  };

  // Format time for last updated display
  const formatTimeAgo = (date) => {
    try {
      const now = new Date();
      const diff = Math.floor((now - date) / 1000); // Seconds
      
      if (diff < 60) return 'just now';
      if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
      return formatDate(date);
    } catch (e) {
      return 'Unknown';
    }
  };

  // Search Modal Component
  const SearchModal = () => (
    <Modal
      visible={showSearchModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowSearchModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.searchModalContent}>
          <View style={styles.searchModalHeader}>
            <Text style={styles.searchModalTitle}>Search Location</Text>
            <TouchableOpacity onPress={() => setShowSearchModal(false)}>
              <Ionicons name="close" size={24} color={getThemeColor('neutral.gray700', '#616161')} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={getThemeColor('neutral.gray500', '#9E9E9E')} />
            <TextInput
              style={styles.searchInput}
              placeholder="Enter city, address or landmark"
              value={searchQuery}
              onChangeText={(text) => {
                searchQueryRef.current = text;
                setSearchQuery(text);
                console.log('Search query updated:', text);
              }}
              autoFocus={true}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (!isSearching && searchQuery.trim()) {
                  Keyboard.dismiss();
                  searchLocation();
                }
              }}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
              multiline={false}
              blurOnSubmit={false}
              enablesReturnKeyAutomatically={true}
              maxLength={100}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                searchQueryRef.current = '';
              }}>
                <Ionicons name="close-circle" size={20} color={getThemeColor('neutral.gray500', '#9E9E9E')} />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity 
            style={[
              styles.searchButton, 
              (!(searchQueryRef.current || searchQuery).trim() || isSearching) && styles.disabledSearchButton
            ]}
            onPress={() => {
              if (!isSearching && (searchQueryRef.current || searchQuery).trim()) {
                Keyboard.dismiss();
                searchLocation();
              }
            }}
            disabled={!(searchQueryRef.current || searchQuery).trim() || isSearching}
          >
            {isSearching ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="search" size={18} color="white" />
                <Text style={styles.searchButtonText}>Search Location</Text>
              </>
            )}
          </TouchableOpacity>
          
          {/* Recent searches section */}
          {recentSearches.length > 0 && (
            <View style={styles.recentSearchesContainer}>
              <Text style={styles.recentSearchesTitle}>Recent Searches</Text>
              
              {recentSearches.map((search, index) => (
                <TouchableOpacity 
                  key={`${search.query}-${index}`}
                  style={styles.recentSearchItem}
                  onPress={() => {
                    setSearchQuery(search.query);
                    searchQueryRef.current = search.query;
                    Keyboard.dismiss();
                    setTimeout(() => searchLocation(), 100); // Small delay to ensure query is set
                  }}
                >
                  <Ionicons name="time-outline" size={16} color={getThemeColor('neutral.gray500', '#9E9E9E')} />
                  <Text style={styles.recentSearchText}>{search.query}</Text>
                  <Ionicons name="chevron-forward" size={16} color={getThemeColor('neutral.gray400', '#BDBDBD')} />
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity 
                style={styles.clearSearchesButton}
                onPress={() => setRecentSearches([])}
              >
                <Text style={styles.clearSearchesText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  // Filters Modal Component
  const FiltersModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Complaints</Text>
            <TouchableOpacity 
              onPress={() => setShowFilters(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={getThemeColor('neutral.gray700', '#616161')} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterOptions}>
            {[
              { key: 'all', label: 'All Complaints', icon: 'apps' },
              { key: 'pending', label: 'Pending', icon: 'time', color: '#FF4444' },
              { key: 'in_progress', label: 'In Progress', icon: 'sync', color: '#FF8800' },
              { key: 'completed', label: 'Completed', icon: 'checkmark-circle', color: '#00AA44' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterOption,
                  filterStatus === option.key && styles.filterOptionActive
                ]}
                onPress={() => {
                  setFilterStatus(option.key);
                  setShowFilters(false);
                }}
              >
                <Ionicons 
                  name={option.icon} 
                  size={24} 
                  color={option.color || getThemeColor('primary.main', '#2E7D32')} 
                />
                <Text style={styles.filterLabel}>{option.label}</Text>
                {filterStatus === option.key && (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={18} 
                    color={getThemeColor('primary.main', '#2E7D32')} 
                    style={styles.checkIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  // Calculate distance between two coordinates in kilometers
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  };
  
  // Helper function for distance calculation
  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={getThemeColor('primary.main', '#2E7D32')} />
      
      {/* Header */}
      <LinearGradient
        colors={EnvironmentalTheme?.gradients?.forest || ['#1B5E20', '#2E7D32', '#60AD5E']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Ionicons name="map" size={24} color="white" />
            <Text style={styles.headerTitle}>Complaint Map</Text>
          </View>

          <TouchableOpacity 
            onPress={() => setShowFilters(true)}
            style={styles.filterButton}
          >
            <Ionicons name="filter" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Search Bar */}
        <TouchableOpacity 
          style={styles.searchBar}
          onPress={() => {
            // Don't clear the previous search when opening modal
            setShowSearchModal(true);
          }}
        >
          <Ionicons name="search" size={20} color={getThemeColor('neutral.gray500', '#9E9E9E')} />
          <Text style={styles.searchPlaceholder}>Tap to search for city, landmark or address...</Text>
          <Ionicons name="locate" size={20} color={getThemeColor('primary.main', '#2E7D32')} />
        </TouchableOpacity>

        {/* Statistics Bar */}
        {statistics && (
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <View style={[styles.statIndicator, { backgroundColor: '#FF4444' }]} />
              <Text style={styles.statText}>{statistics.pending} Pending</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIndicator, { backgroundColor: '#FF8800' }]} />
              <Text style={styles.statText}>{statistics.active} Active</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIndicator, { backgroundColor: '#00AA44' }]} />
              <Text style={styles.statText}>{statistics.resolved} Resolved</Text>
            </View>
          </View>
        )}
      </LinearGradient>
      
      {/* Search Modal */}
      <SearchModal />

      {/* Map */}
      <MapView
        ref={(ref) => setMapRef(ref)}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        loadingEnabled={true}
        zoomEnabled={true}
        zoomControlEnabled={true}
      >
        {/* Render complaint markers */}
        {getFilteredComplaints().length > 0 ? (
          getFilteredComplaints().map((complaint) => (
            <Marker
              key={complaint.id}
              coordinate={{
                latitude: parseFloat(complaint.latitude || 0),
                longitude: parseFloat(complaint.longitude || 0)
              }}
              pinColor={getStatusColor(complaint.status)}
              onPress={() => setSelectedComplaint(complaint)}
            >
              <Callout tooltip>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>{complaint.title}</Text>
                  <Text style={styles.calloutDescription}>{complaint.description}</Text>
                  <View style={styles.calloutDetails}>
                    <View style={[styles.calloutStatus, { backgroundColor: getStatusColor(complaint.status) }]}>
                      <Text style={styles.calloutStatusText}>
                        {complaint.status === 'in_progress' ? 'In Progress' : 
                         (complaint.status === 'completed' ? 'Completed' : 'Pending')}
                      </Text>
                    </View>
                    <Text style={styles.calloutDate}>{formatDate(complaint.created_at)}</Text>
                  </View>
                </View>
              </Callout>
            </Marker>
          ))
        ) : (
          // Show no data message when map is empty
          loading ? null : (
            <Marker
              coordinate={{
                latitude: region.latitude,
                longitude: region.longitude
              }}
              pinColor="#888888"
            >
              <Callout tooltip>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>No Complaints</Text>
                  <Text style={styles.calloutDescription}>There are no complaints in this area. You can be the first to report an issue.</Text>
                </View>
              </Callout>
            </Marker>
          )
        )}
        
        {/* Render search result marker if available */}
        {searchMarker && (
          <Marker
            key="search-marker"
            coordinate={{
              latitude: searchMarker.latitude,
              longitude: searchMarker.longitude
            }}
            pinColor="#3498db"  // Different color for search result
          >
            <Callout tooltip>
              <View style={[styles.calloutContainer, styles.searchCalloutContainer]}>
                <Text style={styles.calloutTitle}>
                  <Ionicons name="location" size={14} color="#3498db" /> Searched Location
                </Text>
                <Text style={styles.calloutDescription}>
                  {searchMarker.title || searchMarker.description || 'Location found from your search'}
                </Text>
                <TouchableOpacity 
                  style={styles.searchDirectionsButton}
                  onPress={() => {
                    // Clear search marker
                    setSearchMarker(null);
                    
                    // Alert for demo purposes - in real app would open maps
                    Alert.alert(
                      'Get Directions',
                      'Would open maps app with directions to this location.',
                      [{ text: 'OK' }]
                    );
                  }}
                >
                  <Text style={styles.searchDirectionsText}>Get Directions</Text>
                </TouchableOpacity>
              </View>
            </Callout>
          </Marker>
        )}
      </MapView>

      {/* Filter Modal */}
      <FiltersModal />

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={getThemeColor('primary.main', '#2E7D32')} />
          <Text style={styles.loadingText}>Loading complaints...</Text>
        </View>
      )}
      
      {/* No Data Message */}
      {!loading && getFilteredComplaints().length === 0 && (
        <View style={styles.emptyStateContainer}>
          <Ionicons 
            name="alert-circle-outline" 
            size={64} 
            color={EnvironmentalTheme.neutral.gray500 || '#9E9E9E'} 
          />
          <Text style={styles.emptyStateTitle}>No Complaints Found</Text>
          <Text style={styles.emptyStateText}>There are no complaints to display for the current filter settings.</Text>
          <TouchableOpacity 
            style={[
              styles.emptyStateButton, 
              isFetching && styles.disabledButton
            ]}
            onPress={() => !isFetchingRef.current && fetchComplaintData()}
            disabled={isFetching || isFetchingRef.current}
          >
            <Text style={styles.emptyStateButtonText}>
              {isFetching || isFetchingRef.current ? 'Loading...' : 'Refresh Data'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Refresh Button */}
      <TouchableOpacity
        style={[
          styles.refreshButton,
          (isFetching || isFetchingRef.current) && styles.disabledButton
        ]}
        onPress={() => !isFetchingRef.current && fetchComplaintData()}
        disabled={isFetching || isFetchingRef.current}
      >
        <LinearGradient
          colors={
            (isFetching || isFetchingRef.current)
              ? ['#A5D6A7', '#C8E6C9']  // Lighter colors when disabled
              : [getThemeColor('primary.main', '#2E7D32'), getThemeColor('primary.light', '#60AD5E')]
          }
          style={styles.refreshGradient}
        >
          {(isFetching || isFetchingRef.current) ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="refresh" size={20} color="white" />
          )}
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Auto-Refresh Toggle */}
      <TouchableOpacity
        style={[
          styles.autoRefreshButton,
          autoRefresh && styles.autoRefreshButtonActive
        ]}
        onPress={() => setAutoRefresh(!autoRefresh)}
      >
        <LinearGradient
          colors={
            autoRefresh 
              ? [getThemeColor('status.success', '#4CAF50'), getThemeColor('status.success', '#388E3C')]
              : [getThemeColor('neutral.gray400', '#BDBDBD'), getThemeColor('neutral.gray600', '#757575')]
          }
          style={styles.refreshGradient}
        >
          <View style={styles.autoRefreshContent}>
            <Ionicons 
              name={autoRefresh ? "sync-circle" : "sync"} 
              size={18} 
              color="white" 
            />
            <Text style={styles.autoRefreshText}>
              {autoRefresh ? 'Auto' : 'Live'}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
      
      {/* My Location Button */}
      <TouchableOpacity
        style={styles.myLocationButton}
        onPress={goToUserLocation}
      >
        <LinearGradient
          colors={[getThemeColor('secondary.light', '#58A5F0'), getThemeColor('secondary.main', '#0277BD')]}
          style={styles.myLocationGradient}
        >
          <Ionicons name="locate" size={24} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Last Updated */}
      <View style={styles.lastUpdatedContainer}>
        <Ionicons name="time-outline" size={14} color={getThemeColor('neutral.gray600', '#757575')} />
        <Text style={styles.lastUpdatedText}>Updated {formatTimeAgo(lastUpdated)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.7,
  },
  disabledSearchButton: {
    opacity: 0.6,
    backgroundColor: '#A5D6A7', // Lighter green
  },
  recentSearchesContainer: {
    marginTop: 8,
  },
  recentSearchesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#424242',
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  recentSearchText: {
    flex: 1,
    marginLeft: 12,
    color: '#616161',
    fontSize: 14,
  },
  clearSearchesButton: {
    alignSelf: 'flex-end',
    marginTop: 12,
    padding: 8,
  },
  clearSearchesText: {
    color: '#F44336',
    fontSize: 14,
  },
  header: {
    paddingTop: StatusBar.currentHeight || 50,
    paddingBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  backButton: {
    padding: 4,
  },
  filterButton: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 24,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 8,
    color: '#9E9E9E',
    fontSize: 14,
  },
  map: {
    flex: 1,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  statText: {
    fontSize: 12,
    color: '#616161',
  },
  calloutContainer: {
    width: 200,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
    color: '#333333',
  },
  calloutDescription: {
    fontSize: 12,
    marginBottom: 8,
    color: '#666666',
  },
  calloutDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calloutStatus: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  calloutStatusText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  calloutDate: {
    fontSize: 10,
    color: '#999999',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  loadingText: {
    marginTop: 10,
    color: '#2E7D32',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  filterOptions: {
    marginTop: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  filterOptionActive: {
    backgroundColor: '#E8F5E9',
  },
  filterLabel: {
    marginLeft: 8,
    color: '#000000',
    fontSize: 16,
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  searchModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  searchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333333',
  },
  searchButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 16,
  },
  searchButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  refreshButton: {
    position: 'absolute',
    bottom: 160,
    right: 16,
  },
  autoRefreshButton: {
    position: 'absolute',
    bottom: 104,
    right: 16,
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 48,
    right: 16,
  },
  refreshGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  myLocationGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  autoRefreshButtonActive: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  autoRefreshContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoRefreshText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 12,
  },
  lastUpdatedContainer: {
    position: 'absolute',
    bottom: 30,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  lastUpdatedText: {
    color: '#757575',
    marginLeft: 4,
    fontSize: 11,
  },
  emptyStateContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: EnvironmentalTheme.primary.main || '#2E7D32',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: EnvironmentalTheme.neutral.gray700 || '#616161',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: EnvironmentalTheme.primary.main || '#2E7D32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  searchCalloutContainer: {
    backgroundColor: '#FFFFFF',
    borderLeftColor: '#3498db',
    borderLeftWidth: 4,
  },
  searchDirectionsButton: {
    backgroundColor: '#3498db',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
    alignItems: 'center',
  },
  searchDirectionsText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default ComplaintMapScreen;
