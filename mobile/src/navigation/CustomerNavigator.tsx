import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { BookingDetailScreen } from '../screens/customer/BookingDetailScreen';
import { BookingsScreen } from '../screens/customer/BookingsScreen';
import { CreateBookingScreen } from '../screens/customer/CreateBookingScreen';
import { HomeScreen } from '../screens/customer/HomeScreen';
import { HelpScreen } from '../screens/shared/HelpScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { Colors } from '../utils/colors';
import { Booking } from '../api/client';

export type CustomerStackParams = {
  Home: undefined;
  BookingDetail: { booking: Booking };
  Help: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<CustomerStackParams>();

interface TabIconProps { label: string; emoji: string; focused: boolean; color: string }

function TabIcon({ emoji, focused, color, label }: TabIconProps) {
  return (
    <View style={tabStyles.iconWrap}>
      <View style={[tabStyles.iconBubble, focused && { backgroundColor: Colors.systemBlue + '15' }]}>
        <Text style={[tabStyles.emoji, { opacity: focused ? 1 : 0.5 }]}>{emoji}</Text>
      </View>
      <Text style={[tabStyles.label, { color: focused ? Colors.systemBlue : Colors.systemGray2 }]}>{label}</Text>
    </View>
  );
}


const tabStyles = StyleSheet.create({
  iconWrap:   { alignItems: 'center', gap: 2, paddingTop: 6 },
  iconBubble: { width: 44, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emoji:      { fontSize: 20 },
  label:      { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
});

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.systemBlue,
        tabBarInactiveTintColor: Colors.systemGray2,
        tabBarShowLabel: false,
        tabBarStyle: {
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          backgroundColor: Colors.systemBackground,
          height: Platform.OS === 'ios' ? 92 : 72,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.10,
          shadowRadius: 20,
          elevation: 16,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarIcon: ({ focused, color }) => <TabIcon emoji="🏠" label="Home" focused={focused} color={color} /> }}
      />
      <Tab.Screen
        name="NewBooking"
        component={CreateBookingScreen}
        options={{
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: Colors.systemBlue,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: -24,
              shadowColor: Colors.systemBlue,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.45,
              shadowRadius: 14,
              elevation: 10,
              borderWidth: 3,
              borderColor: '#fff',
            }}>
              <Text style={{ fontSize: 26, color: '#fff', lineHeight: 30 }}>+</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="BookingsTab"
        component={BookingsScreen}
        options={{ tabBarIcon: ({ focused, color }) => <TabIcon emoji="📋" label="Bookings" focused={focused} color={color} /> }}
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
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Help" component={HelpScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
