import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { JobDetailScreen } from '../screens/psw/JobDetailScreen';
import { NearbyJobsScreen } from '../screens/psw/NearbyJobsScreen';
import { MyJobsScreen } from '../screens/psw/MyJobsScreen';
import { EarningsScreen } from '../screens/psw/EarningsScreen';
import { PSWDashboardScreen } from '../screens/psw/PSWDashboardScreen';
import { PSWOnboardingScreen } from '../screens/psw/PSWOnboardingScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { Colors } from '../utils/colors';
import { Booking } from '../api/client';

export type PSWStackParams = {
  PSWHome: undefined;
  PSWOnboarding: undefined;
  JobDetail: { job: Booking };
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<PSWStackParams>();

interface TabIconProps { label: string; emoji: string; focused: boolean; color: string }

function TabIcon({ emoji, focused, color, label }: TabIconProps) {
  return (
    <View style={tabStyles.iconWrap}>
      <View style={[tabStyles.iconBubble, focused && { backgroundColor: Colors.onlineGreen + '15' }]}>
        <Text style={[tabStyles.emoji, { opacity: focused ? 1 : 0.5 }]}>{emoji}</Text>
      </View>
      <Text style={[tabStyles.label, { color: focused ? Colors.onlineGreen : Colors.systemGray2 }]}>{label}</Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap:   { alignItems: 'center', gap: 2, paddingTop: 6 },
  iconBubble: { width: 44, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emoji:      { fontSize: 20 },
  label:      { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
});

function PSWTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.onlineGreen,
        tabBarInactiveTintColor: Colors.systemGray2,
        tabBarShowLabel: false,
        tabBarStyle: {
          borderTopColor: Colors.separator,
          borderTopWidth: 1,
          backgroundColor: Colors.systemBackground,
          height: Platform.OS === 'ios' ? 88 : 66,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          shadowColor: Colors.cardShadow,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 12,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={PSWDashboardScreen}
        options={{ tabBarIcon: ({ focused, color }) => <TabIcon emoji="🏠" label="Home" focused={focused} color={color} /> }}
      />
      <Tab.Screen
        name="NearbyJobs"
        component={NearbyJobsScreen}
        options={{ tabBarIcon: ({ focused, color }) => <TabIcon emoji="📍" label="Find Jobs" focused={focused} color={color} /> }}
      />
      <Tab.Screen
        name="MyJobs"
        component={MyJobsScreen}
        options={{ tabBarIcon: ({ focused, color }) => <TabIcon emoji="📋" label="My Jobs" focused={focused} color={color} /> }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{ tabBarIcon: ({ focused, color }) => <TabIcon emoji="💰" label="Earnings" focused={focused} color={color} /> }}
      />
      <Tab.Screen
        name="PSWProfile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused, color }) => <TabIcon emoji="👤" label="Profile" focused={focused} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

export function PSWNavigator() {
  const { user } = useAuth();
  // New PSW users who haven't completed credential onboarding start there
  const needsOnboarding = user?.role === 'PSW' && user?.onboardingComplete === false;

  return (
    <Stack.Navigator
      initialRouteName={needsOnboarding ? 'PSWOnboarding' : 'PSWHome'}
      screenOptions={{
        headerTintColor: Colors.onlineGreen,
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: Colors.systemBackground },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="PSWHome" component={PSWTabs} options={{ headerShown: false }} />
      <Stack.Screen name="PSWOnboarding" component={PSWOnboardingScreen} options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: 'Job Details' }} />
    </Stack.Navigator>
  );
}
