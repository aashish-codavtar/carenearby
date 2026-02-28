import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { Storage } from '../utils/storage';
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

function ProfileTabIcon({ focused, color }: { focused: boolean; color: string }) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    Storage.getPhotoUri().then(setPhotoUri);
  }, [focused]); // reload each time this tab gains focus

  return (
    <View style={tabStyles.iconWrap}>
      <View style={[tabStyles.iconBubble, focused && { backgroundColor: Colors.systemBlue + '15' }]}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={tabStyles.profileImg} />
        ) : (
          <Text style={[tabStyles.emoji, { opacity: focused ? 1 : 0.5 }]}>👤</Text>
        )}
      </View>
      <Text style={[tabStyles.label, { color: focused ? Colors.systemBlue : Colors.systemGray2 }]}>Profile</Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap:   { alignItems: 'center', gap: 2, paddingTop: 6 },
  iconBubble: { width: 44, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emoji:      { fontSize: 20 },
  label:      { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
  profileImg: { width: 24, height: 24, borderRadius: 12 },
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
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarIcon: ({ focused, color }) => <TabIcon emoji="🏠" label="Home" focused={focused} color={color} /> }}
      />
      <Tab.Screen
        name="NewBooking"
        component={CreateBookingScreen}
        options={{ tabBarIcon: ({ focused, color }) => <TabIcon emoji="➕" label="Book" focused={focused} color={color} /> }}
      />
      <Tab.Screen
        name="BookingsTab"
        component={BookingsScreen}
        options={{ tabBarIcon: ({ focused, color }) => <TabIcon emoji="📋" label="Bookings" focused={focused} color={color} /> }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused, color }) => <ProfileTabIcon focused={focused} color={color} /> }}
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
    </Stack.Navigator>
  );
}
