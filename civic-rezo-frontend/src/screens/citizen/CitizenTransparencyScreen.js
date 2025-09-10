import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Image
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { makeApiCall, apiClient } from '../../../config/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const CitizenTransparencyScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchTransparencyData();
  }, []);

  const fetchTransparencyData = async () => {
    setLoading(true);
    
    // This would typically be an API call to get transparency data
    // For now, we'll use mock data
    setTimeout(() => {
      setStatsData({
        totalComplaints: 243,
        resolvedComplaints: 156,
        pendingComplaints: 87,
        resolutionRate: 64.2,
        categoryStats: [
          { name: 'Road Damage', count: 78, percentage: 32.1 },
          { name: 'Water Issues', count: 56, percentage: 23.0 },
          { name: 'Garbage', count: 43, percentage: 17.7 },
          { name: 'Streetlights', count: 37, percentage: 15.2 },
          { name: 'Others', count: 29, percentage: 12.0 },
        ],
        monthlyData: [
          { month: 'Jan', count: 18 },
          { month: 'Feb', count: 22 },
          { month: 'Mar', count: 17 },
          { month: 'Apr', count: 25 },
          { month: 'May', count: 30 },
          { month: 'Jun', count: 28 },
          { month: 'Jul', count: 35 },
          { month: 'Aug', count: 40 },
          { month: 'Sep', count: 28 },
        ],
        impactStats: {
          peopleImpacted: 12500,
          areasImproved: 32,
          avgResolutionTime: '4.2 days'
        }
      });
      
      setLoading(false);
    }, 1500);
  };

  const renderHeader = () => (
    <LinearGradient
      colors={['#3498db', '#2980b9']}
      style={[styles.header, { paddingTop: insets.top + 10 }]}
    >
      <Text style={styles.headerTitle}>Transparency Dashboard</Text>
      <Text style={styles.headerSubtitle}>Real-time civic issue statistics</Text>
    </LinearGradient>
  );

  const renderOverviewCards = () => (
    <View style={styles.overviewContainer}>
      <View style={styles.overviewCard}>
        <View style={styles.overviewIconContainer}>
          <Ionicons name="clipboard" size={24} color="#3498db" />
        </View>
        <Text style={styles.overviewValue}>{statsData.totalComplaints}</Text>
        <Text style={styles.overviewLabel}>Total Reports</Text>
      </View>
      
      <View style={styles.overviewCard}>
        <View style={[styles.overviewIconContainer, { backgroundColor: '#e3f5ff' }]}>
          <Ionicons name="checkmark-circle" size={24} color="#27ae60" />
        </View>
        <Text style={styles.overviewValue}>{statsData.resolvedComplaints}</Text>
        <Text style={styles.overviewLabel}>Resolved</Text>
      </View>
      
      <View style={styles.overviewCard}>
        <View style={[styles.overviewIconContainer, { backgroundColor: '#fff5e3' }]}>
          <Ionicons name="time" size={24} color="#f39c12" />
        </View>
        <Text style={styles.overviewValue}>{statsData.pendingComplaints}</Text>
        <Text style={styles.overviewLabel}>Pending</Text>
      </View>
    </View>
  );

  const renderResolutionRate = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Resolution Rate</Text>
      <View style={styles.resolutionContainer}>
        <View style={styles.progressCircle}>
          <View style={styles.progressInnerCircle}>
            <Text style={styles.progressValue}>{statsData.resolutionRate}%</Text>
          </View>
        </View>
        <View style={styles.resolutionText}>
          <Text style={styles.resolutionTitle}>Good Progress!</Text>
          <Text style={styles.resolutionDescription}>
            The city's resolution rate is above average. Keep reporting issues to help improve it further.
          </Text>
        </View>
      </View>
    </View>
  );

  const renderCategoryBreakdown = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Category Breakdown</Text>
      <View style={styles.categoriesContainer}>
        {statsData.categoryStats.map((category, index) => (
          <View key={index} style={styles.categoryItem}>
            <View style={styles.categoryBar}>
              <View 
                style={[
                  styles.categoryFill, 
                  { width: `${category.percentage}%` }
                ]}
              />
            </View>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryCount}>{category.count} issues</Text>
            </View>
            <Text style={styles.categoryPercentage}>{category.percentage}%</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderImpactStats = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Community Impact</Text>
      <View style={styles.impactContainer}>
        <View style={styles.impactItem}>
          <MaterialCommunityIcons name="account-group" size={28} color="#3498db" />
          <Text style={styles.impactValue}>{statsData.impactStats.peopleImpacted.toLocaleString()}</Text>
          <Text style={styles.impactLabel}>People Impacted</Text>
        </View>
        
        <View style={styles.impactItem}>
          <MaterialCommunityIcons name="map-marker-radius" size={28} color="#27ae60" />
          <Text style={styles.impactValue}>{statsData.impactStats.areasImproved}</Text>
          <Text style={styles.impactLabel}>Areas Improved</Text>
        </View>
        
        <View style={styles.impactItem}>
          <Ionicons name="timer-outline" size={28} color="#f39c12" />
          <Text style={styles.impactValue}>{statsData.impactStats.avgResolutionTime}</Text>
          <Text style={styles.impactLabel}>Avg. Resolution</Text>
        </View>
      </View>
    </View>
  );

  const renderMonthlyCounts = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Monthly Reports</Text>
      <View style={styles.chartContainer}>
        {statsData.monthlyData.map((item, index) => (
          <View key={index} style={styles.chartColumn}>
            <View style={styles.chartBarContainer}>
              <View 
                style={[
                  styles.chartBar, 
                  { 
                    height: (item.count / Math.max(...statsData.monthlyData.map(d => d.count))) * 100,
                    backgroundColor: index === statsData.monthlyData.length - 1 ? '#3498db' : '#a0d2f7'
                  }
                ]}
              />
            </View>
            <Text style={styles.chartLabel}>{item.month}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading transparency data...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {renderOverviewCards()}
          {renderResolutionRate()}
          {renderCategoryBreakdown()}
          {renderMonthlyCounts()}
          {renderImpactStats()}
          
          <View style={{ height: 100 }} />
        </ScrollView>
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
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  overviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  overviewIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8f5fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#777',
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  resolutionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressInnerCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  resolutionText: {
    flex: 1,
    marginLeft: 16,
  },
  resolutionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  resolutionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  categoriesContainer: {
    marginTop: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: 4,
  },
  categoryInfo: {
    width: 100,
    marginLeft: 12,
  },
  categoryName: {
    fontSize: 14,
    color: '#333',
  },
  categoryCount: {
    fontSize: 12,
    color: '#777',
  },
  categoryPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3498db',
    width: 45,
    textAlign: 'right',
  },
  chartContainer: {
    height: 150,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarContainer: {
    height: 120,
    width: 24,
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: 24,
    backgroundColor: '#3498db',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  chartLabel: {
    fontSize: 12,
    color: '#777',
    marginTop: 6,
  },
  impactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  impactItem: {
    flex: 1,
    alignItems: 'center',
  },
  impactValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  impactLabel: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
  },
});

export default CitizenTransparencyScreen;
