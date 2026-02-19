import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Text } from 'react-native';
import { BookingDetailScreen } from '../screens/customer/BookingDetailScreen';
import { BookingsScreen } from '../screens/customer/BookingsScreen';
import { CreateBookingScreen } from '../screens/customer/CreateBookingScreen';
import { HomeScreen } from '../screens/customer/HomeScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { Colors } from '../utils/colors';
import { Booking } from '../api/client';

export type CustomerStackParams = {
  Home: undefined;
  CreateBooking: undefined;
  Bookings: undefined;
  BookingDetail: { booking: Booking };
  Profile: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<CustomerStackParams>();

function tabIcon(emoji: string, focused: boolean) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.systemBlue,
        tabBarInactiveTintColor: Colors.systemGray,
        tabBarStyle: {
          borderTopColor: Colors.separator,
          backgroundColor: Colors.systemBackground,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => tabIcon('🏠', focused),
        }}
      />
      <Tab.Screen
        name="NewBooking"
        component={CreateBookingScreen}
        options={{
          tabBarLabel: 'Book',
          tabBarIcon: ({ focused }) => tabIcon('➕', focused),
        }}
      />
      <Tab.Screen
        name="BookingsTab"
        component={BookingsScreen}
        options={{
          tabBarLabel: 'My Bookings',
          tabBarIcon: ({ focused }) => tabIcon('📋', focused),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => tabIcon('👤', focused),
        }}
      />
    </Tab.Navigator>
  );
}

export function CustomerNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: Colors.systemBlue,
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: Colors.systemBackground },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="BookingDetail"
        component={BookingDetailScreen}
        options={{ title: 'Booking Details', headerLargeTitle: false }}
      />
    </Stack.Navigator>
  );
}
