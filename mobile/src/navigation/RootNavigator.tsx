import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../utils/colors';
import { AdminNavigator } from './AdminNavigator';
import { AuthNavigator } from './AuthNavigator';
import { CustomerNavigator } from './CustomerNavigator';
import { PSWNavigator } from './PSWNavigator';

export function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.systemBackground }}>
        <ActivityIndicator size="large" color={Colors.systemBlue} />
      </View>
    );
  }

  if (!user) return <AuthNavigator />;

  switch (user.role) {
    case 'CUSTOMER':
      return <CustomerNavigator />;
    case 'PSW':
      return <PSWNavigator />;
    case 'ADMIN':
      return <AdminNavigator />;
    default:
      return <AuthNavigator />;
  }
}
