import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  thickness?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 48,
  color = '#FFFFFF',
  thickness,
}) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const strokeWidth = thickness ?? Math.max(3, size * 0.08);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate: spin }] }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: 'transparent',
          borderTopColor: color,
          borderRightColor: color,
        }}
      />
    </Animated.View>
  );
};

export default LoadingSpinner;
