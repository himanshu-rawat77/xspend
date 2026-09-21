import React from 'react';
import { TouchableOpacity, Image, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { User } from 'lucide-react-native';
import { useStockStore } from '../store/useStockStore';

interface ProfileAvatarButtonProps {
  onPress?: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const ProfileAvatarButton: React.FC<ProfileAvatarButtonProps> = ({
  onPress,
  size = 36,
  style,
}) => {
  const { preferences } = useStockStore();
  const avatarUrl = preferences?.avatarUrl;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.fallbackCircle,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <User size={size * 0.45} color="#111827" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  fallbackCircle: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
