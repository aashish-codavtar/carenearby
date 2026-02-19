import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Text } from 'react-native';
import { JobDetailScreen } from '../screens/psw/JobDetailScreen';
import { NearbyJobsScreen } from '../screens/psw/NearbyJobsScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { Colors } from '../utils/colors';
import { Booking } from '../api/client';

export type PSWStackParams = {
  PSWHome: undefined;
  JobDetail: { job: Booking };
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<PSWStackParams>();

function tabIcon(emoji: string, focused: boolean) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

function PSWTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.systemGreen,
        tabBarInactiveTintColor: Colors.systemGray,
        tabBarStyle: {
          borderTopColor: Colors.separator,
          backgroundColor: Colors.systemBackground,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tab.Screen
        name="NearbyJobs"
        component={NearbyJobsScreen}
        options={{
          tabBarLabel: 'Nearby Jobs',
          tabBarIcon: ({ focused }) => tabIcon('📍', focused),
        }}
      />
      <Tab.Screen
        name="PSWProfile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => tabIcon('👤', focused),
        }}
      />
    </Tab.Navigator>
  );
}

export function PSWNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: Colors.systemGreen,
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: Colors.systemBackground },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="PSWHome" component={PSWTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={{ title: 'Job Details' }}
      />
    </Stack.Navigator>
  );
}
