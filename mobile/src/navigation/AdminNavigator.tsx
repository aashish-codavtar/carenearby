import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Text } from 'react-native';
import { BookingsListScreen } from '../screens/admin/BookingsListScreen';
import { PSWListScreen } from '../screens/admin/PSWListScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { Colors } from '../utils/colors';

const Tab = createBottomTabNavigator();

function tabIcon(emoji: string, focused: boolean) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.systemPurple,
        tabBarInactiveTintColor: Colors.systemGray,
        tabBarStyle: {
          borderTopColor: Colors.separator,
          backgroundColor: Colors.systemBackground,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tab.Screen
        name="PSWList"
        component={PSWListScreen}
        options={{
          tabBarLabel: 'Workers',
          tabBarIcon: ({ focused }) => tabIcon('🧑‍⚕️', focused),
        }}
      />
      <Tab.Screen
        name="AllBookings"
        component={BookingsListScreen}
        options={{
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ focused }) => tabIcon('📋', focused),
        }}
      />
      <Tab.Screen
        name="AdminProfile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => tabIcon('👤', focused),
        }}
      />
    </Tab.Navigator>
  );
}
