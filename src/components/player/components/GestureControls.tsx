import React, { useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import {
    PanGestureHandler,
    LongPressGestureHandler,
    TapGestureHandler,
    State
} from 'react-native-gesture-handler';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { styles as localStyles } from '../utils/playerStyles';

interface GestureControlsProps {
    screenDimensions: { width: number, height: number };
    gestureControls: any;
    onLongPressActivated: () => void;
    onLongPressEnd: () => void;
    onLongPressStateChange: (event: any) => void;
    toggleControls: () => void;
    showControls: boolean;
    hideControls: () => void;
    volume: number;
    brightness?: number;
    controlsTimeout: React.MutableRefObject<NodeJS.Timeout | null>;
    resizeMode?: string;
    currentTime?: number;
    duration?: number;
    seekToTime?: (seconds: number) => void;
    formatTime?: (seconds: number) => string;
    togglePlayback?: () => void;
    paused?: boolean;
}

export const GestureControls: React.FC<GestureControlsProps> = ({
    screenDimensions,
    gestureControls,
    onLongPressActivated,
    onLongPressEnd,
    onLongPressStateChange,
    toggleControls,
    showControls,
    hideControls,
    volume,
    brightness = 0.5,
    controlsTimeout,
    resizeMode = 'contain',
    currentTime,
    duration,
    seekToTime,
    formatTime,
    togglePlayback,
    paused,
}) => {

    // Center-click play/pause animation
    const centerAnimOpacity = React.useRef(new Animated.Value(0)).current;
    const centerAnimScale = React.useRef(new Animated.Value(0.8)).current;
    const [centerAnimIcon, setCenterAnimIcon] = useState<'pause' | 'play'>('pause');

    const playCenterAnimation = (icon: 'pause' | 'play') => {
        setCenterAnimIcon(icon);
        centerAnimOpacity.setValue(1);
        centerAnimScale.setValue(0.8);
        Animated.parallel([
            Animated.timing(centerAnimOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
            Animated.timing(centerAnimScale, { toValue: 1.1, duration: 500, useNativeDriver: true }),
        ]).start();
    };

    // Horizontal seek state
    const [isHorizontalSeeking, setIsHorizontalSeeking] = useState(false);
    const [seekPreviewTime, setSeekPreviewTime] = useState(0);
    const [seekStartTime, setSeekStartTime] = useState(0);
    const horizontalSeekPanRef = React.useRef(null);

    const gestureAreaStyle = {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
    };

    return (
        <>
            {/* Horizontal seek gesture — outermost, fails on vertical movement */}
            <PanGestureHandler
                ref={horizontalSeekPanRef}
                onGestureEvent={(event: any) => {
                    const { translationX, state } = event.nativeEvent;
                    if (state === State.ACTIVE) {
                        if (!isHorizontalSeeking && currentTime !== undefined) {
                            setIsHorizontalSeeking(true);
                            setSeekStartTime(currentTime);
                        }
                        if (duration && duration > 0) {
                            const sensitivityFactor = duration > 3600 ? 120 : duration > 1800 ? 90 : 60;
                            const seekDelta = (translationX / screenDimensions.width) * sensitivityFactor;
                            const newTime = Math.max(0, Math.min(duration, seekStartTime + seekDelta));
                            setSeekPreviewTime(newTime);
                        }
                    }
                }}
                onHandlerStateChange={(event: any) => {
                    const { state } = event.nativeEvent;
                    if (state === State.END || state === State.CANCELLED) {
                        if (isHorizontalSeeking && seekToTime) {
                            seekToTime(seekPreviewTime);
                        }
                        setIsHorizontalSeeking(false);
                    }
                }}
                activeOffsetX={[-30, 30]}
                failOffsetY={[-20, 20]}
                maxPointers={1}
            >
                {/* Long press for speed boost */}
                <LongPressGestureHandler
                    onActivated={onLongPressActivated}
                    onEnded={onLongPressEnd}
                    onHandlerStateChange={onLongPressStateChange}
                    minDurationMs={500}
                    maxDist={100000}
                >
                    <View style={gestureAreaStyle}>
                        {/* Full-screen tap — center click for play/pause */}
                        <TapGestureHandler
                            onActivated={() => {
                                if (togglePlayback) {
                                    togglePlayback();
                                    playCenterAnimation(paused ? 'play' : 'pause');
                                }
                            }}
                        >
                            <View style={StyleSheet.absoluteFill} />
                        </TapGestureHandler>
                    </View>
                </LongPressGestureHandler>
            </PanGestureHandler>

            {/* Resize mode overlay */}
            {gestureControls.showResizeModeOverlay && (
                <View style={localStyles.gestureIndicatorContainer}>
                    <Animated.View
                        style={[localStyles.gestureIndicatorPill, { opacity: gestureControls.resizeModeOverlayOpacity }]}
                    >
                        <View style={localStyles.iconWrapper}>
                            <MaterialIcons name="aspect-ratio" size={18} color="rgba(255,255,255,0.9)" />
                        </View>
                        <Text style={localStyles.gestureText}>
                            {resizeMode.charAt(0).toUpperCase() + resizeMode.slice(1)}
                        </Text>
                    </Animated.View>
                </View>
            )}

            {/* Horizontal seek preview overlay */}
            {isHorizontalSeeking && formatTime && (
                <View style={localStyles.gestureIndicatorContainer}>
                    <View style={localStyles.gestureIndicatorPill}>
                        <View style={[localStyles.iconWrapper, { backgroundColor: 'rgba(59,59,59)' }]}>
                            <MaterialIcons
                                name={seekPreviewTime > (currentTime || 0) ? "fast-forward" : "fast-rewind"}
                                size={18}
                                color="rgba(255,255,255,0.9)"
                            />
                        </View>
                        <Text style={localStyles.gestureText}>{formatTime(seekPreviewTime)}</Text>
                        <Text style={{
                            color: seekPreviewTime > (currentTime || 0) ? '#4CAF50' : '#FF5722',
                            fontSize: 12, fontWeight: '600', marginLeft: 4,
                        }}>
                            {seekPreviewTime > (currentTime || 0) ? '+' : ''}
                            {Math.round(seekPreviewTime - (currentTime || 0))}s
                        </Text>
                    </View>
                </View>
            )}

            {/* Center play/pause animation */}
            <Animated.View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    marginTop: -50,
                    marginLeft: -50,
                    width: 100,
                    height: 100,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: centerAnimOpacity,
                    transform: [{ scale: centerAnimScale }],
                }}
            >
                <Ionicons name={centerAnimIcon} size={70} color="#FFFFFF" />
            </Animated.View>
        </>
    );
};
