import React from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Feather from 'react-native-vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';
import { styles } from '../utils/playerStyles'; // Updated styles
import { getTrackDisplayName } from '../utils/playerUtils';
import { useTheme } from '../../../contexts/ThemeContext';
import { useSettings } from '../../../hooks/useSettings';

import { introService } from '../../../services/introService';
import { toastService } from '../../../services/toastService';
import { fullscreenManager } from '../../../utils/fullscreenManager';
import PlayerAspectRatioIcon from '../../../../assets/player-icons/ic_player_aspect_ratio.svg';
import PlayerAudioFilledIcon from '../../../../assets/player-icons/ic_player_audio_filled.svg';
import PlayerAudioOutlineIcon from '../../../../assets/player-icons/ic_player_audio_outline.svg';
import PlayerEpisodesIcon from '../../../../assets/player-icons/ic_player_episodes.svg';
import PlayerPauseIcon from '../../../../assets/player-icons/ic_player_pause.svg';
import PlayerPlayIcon from '../../../../assets/player-icons/ic_player_play.svg';
import PlayerSourceIcon from '../../../../assets/player-icons/ic_player_source.svg';
import PlayerSubtitlesIcon from '../../../../assets/player-icons/ic_player_subtitles.svg';

interface PlayerControlsProps {
  showControls: boolean;
  fadeAnim: Animated.Value;
  paused: boolean;
  title: string;
  episodeTitle?: string;
  season?: number;
  episode?: number;
  quality?: string;
  year?: number;
  streamProvider?: string;
  streamName?: string;
  currentTime: number;
  duration: number;
  zoomScale: number;
  currentResizeMode?: string;
  ksAudioTracks: Array<{ id: number, name: string, language?: string }>;
  selectedAudioTrack: number | null;
  availableStreams?: { [providerId: string]: { streams: any[]; addonName: string } };
  togglePlayback: () => void;
  skip: (seconds: number) => void;
  handleClose: () => void;
  cycleAspectRatio: () => void;
  cyclePlaybackSpeed: () => void;
  currentPlaybackSpeed: number;
  setShowAudioModal: (show: boolean) => void;
  setShowSubtitleModal: (show: boolean) => void;
  setShowSpeedModal: (show: boolean) => void;
  setShowSubmitIntroModal: (show: boolean) => void;
  isSubtitleModalOpen?: boolean;
  setShowSourcesModal?: (show: boolean) => void;
  setShowEpisodesModal?: (show: boolean) => void;
  // Slider-specific props
  onSliderValueChange: (value: number) => void;
  onSlidingStart: () => void;
  onSlidingComplete: (value: number) => void;
  buffered: number;
  formatTime: (seconds: number) => string;
  playerBackend?: string;
  // AirPlay props
  isAirPlayActive?: boolean;
  allowsAirPlay?: boolean;
  onAirPlayPress?: () => void;
  // MPV Switch (Android only)
  onSwitchToMPV?: () => void;
  useExoPlayer?: boolean;
  canEnterPictureInPicture?: boolean;
  onEnterPictureInPicture?: () => void;
  isBuffering?: boolean;
  imdbId?: string;
  // Mac Catalyst volume control
  volume?: number;
  onVolumeChange?: (value: number) => void;
  onMuteToggle?: () => void;
  mousePosition?: { x: number; y: number };
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  showControls,
  fadeAnim,
  paused,
  title,
  episodeTitle,
  season,
  episode,
  quality,
  year,
  streamProvider,
  streamName,
  currentTime,
  duration,
  zoomScale,
  currentResizeMode,
  ksAudioTracks,
  selectedAudioTrack,
  availableStreams,
  togglePlayback,
  skip,
  handleClose,
  cycleAspectRatio,
  cyclePlaybackSpeed,
  currentPlaybackSpeed,
  setShowAudioModal,
  setShowSubtitleModal,
  setShowSpeedModal,
  setShowSubmitIntroModal,
  isSubtitleModalOpen,
  setShowSourcesModal,
  setShowEpisodesModal,
  onSliderValueChange,
  onSlidingStart,
  onSlidingComplete,
  buffered,
  formatTime,
  playerBackend,
  isAirPlayActive,
  allowsAirPlay,
  onAirPlayPress,
  onSwitchToMPV,
  useExoPlayer,
  canEnterPictureInPicture,
  onEnterPictureInPicture,
  isBuffering = false,
  imdbId,
  volume = 1,
  onVolumeChange,
  onMuteToggle,
  mousePosition,
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = React.useState(false);
  const volumeAreaRef = React.useRef<View>(null);
  const volumeBoundsRef = React.useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Track whether mouse is over the volume button + slider area
  React.useEffect(() => {
    if (!mousePosition || !showControls) return;
    const b = volumeBoundsRef.current;
    if (b.w === 0) return;
    // Expand hit area: wider than button, extends up to cover full popup
    const padding = 12;
    const inArea =
      mousePosition.x >= b.x - padding &&
      mousePosition.x <= b.x + b.w + padding &&
      mousePosition.y >= b.y - 160 &&
      mousePosition.y <= b.y + b.h;
    setShowVolumeSlider(inArea);
  }, [mousePosition, showControls]);

  const measureVolumeArea = React.useCallback(() => {
    volumeAreaRef.current?.measureInWindow((x, y, w, h) => {
      volumeBoundsRef.current = { x, y, w, h };
    });
  }, []);
  const { currentTheme } = useTheme();
  const { settings } = useSettings();
  const { t } = useTranslation();

  // --- Intro Submission Logic ---
  const handleIntroPress = () => {
    setShowSubmitIntroModal(true);
  };


  /* Responsive Spacing */
  const screenWidth = Dimensions.get('window').width;
  const buttonSpacing = screenWidth * 0.10; // Reduced from 15% to 10%

  const playButtonSize = screenWidth * 0.08; // 8% of screen width (reduced from 12%)
  const playIconSizeCalculated = playButtonSize * 0.6; // 60% of button size
  const seekButtonSize = screenWidth * 0.07; // 7% of screen width (reduced from 11%)
  const seekIconSize = seekButtonSize * 0.75; // 75% of button size
  const seekNumberSize = seekButtonSize * 0.25; // 25% of button size
  const arcBorderWidth = seekButtonSize * 0.05; // 5% of button size

  /* Animations - State & Refs */
  const [showBackwardSign, setShowBackwardSign] = React.useState(false);
  const [showForwardSign, setShowForwardSign] = React.useState(false);
  const [previewTime, setPreviewTime] = React.useState(currentTime);
  const isSlidingRef = React.useRef(false);
  React.useEffect(() => {
    if (!isSlidingRef.current) {
      setPreviewTime(currentTime);
    }
  }, [currentTime]);

  /* Separate Animations for Each Button */
  const backwardPressAnim = React.useRef(new Animated.Value(0)).current;
  const backwardSlideAnim = React.useRef(new Animated.Value(0)).current;
  const backwardScaleAnim = React.useRef(new Animated.Value(1)).current;
  const backwardArcOpacity = React.useRef(new Animated.Value(0)).current;
  const backwardArcRotation = React.useRef(new Animated.Value(0)).current;

  const forwardPressAnim = React.useRef(new Animated.Value(0)).current;
  const forwardSlideAnim = React.useRef(new Animated.Value(0)).current;
  const forwardScaleAnim = React.useRef(new Animated.Value(1)).current;
  const forwardArcOpacity = React.useRef(new Animated.Value(0)).current;
  const forwardArcRotation = React.useRef(new Animated.Value(0)).current;

  const playPressAnim = React.useRef(new Animated.Value(0)).current;
  const playIconScale = React.useRef(new Animated.Value(1)).current;
  const playIconOpacity = React.useRef(new Animated.Value(1)).current;

  /* Handle Seek with Animation */
  const handleSeekWithAnimation = (seconds: number) => {
    const isForward = seconds > 0;

    if (isForward) {
      setShowForwardSign(true);
    } else {
      setShowBackwardSign(true);
    }

    const pressAnim = isForward ? forwardPressAnim : backwardPressAnim;
    const slideAnim = isForward ? forwardSlideAnim : backwardSlideAnim;
    const scaleAnim = isForward ? forwardScaleAnim : backwardScaleAnim;
    const arcOpacity = isForward ? forwardArcOpacity : backwardArcOpacity;
    const arcRotation = isForward ? forwardArcRotation : backwardArcRotation;

    Animated.parallel([
      // Button press effect (circle flash)
      Animated.sequence([
        Animated.timing(pressAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(pressAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      // Number slide out
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: isForward ? (seekButtonSize * 0.75) : -(seekButtonSize * 0.75),
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]),
      // Button scale pulse
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      // Arc sweep animation
      Animated.parallel([
        Animated.timing(arcOpacity, {
          toValue: 1,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(arcRotation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      if (isForward) {
        setShowForwardSign(false);
      } else {
        setShowBackwardSign(false);
      }
      arcOpacity.setValue(0);
      arcRotation.setValue(0);
    });

    skip(seconds);
  };

  /* Handle Play/Pause with Animation */
  const handlePlayPauseWithAnimation = () => {
    Animated.sequence([
      Animated.timing(playPressAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(playPressAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.timing(playIconScale, {
        toValue: 0.85,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(playIconScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    togglePlayback();
  };




  const deviceWidth = Dimensions.get('window').width;
  const BREAKPOINTS = { phone: 0, tablet: 768, largeTablet: 1024, tv: 1440 } as const;
  const getDeviceType = (w: number) => {
    if (w >= BREAKPOINTS.tv) return 'tv';
    if (w >= BREAKPOINTS.largeTablet) return 'largeTablet';
    if (w >= BREAKPOINTS.tablet) return 'tablet';
    return 'phone';
  };
  const deviceType = getDeviceType(deviceWidth);
  const isTablet = deviceType === 'tablet';
  const isLargeTablet = deviceType === 'largeTablet';
  const isTV = deviceType === 'tv';

  const closeIconSize = isTV ? 24 : isLargeTablet ? 22 : isTablet ? 20 : 20;
  const skipIconSize = isTV ? 24 : isLargeTablet ? 22 : isTablet ? 20 : 20;
  const playIconSize = isTV ? 48 : isLargeTablet ? 40 : isTablet ? 36 : 32;
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: fadeAnim, zIndex: 20 }]}
      pointerEvents={showControls ? 'box-none' : 'none'}
    >
      {/* Volume slider popup — rendered at top level to avoid clipping */}
      {showVolumeSlider && volumeBoundsRef.current.w > 0 && (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: volumeBoundsRef.current.x + (volumeBoundsRef.current.w / 2) - 22,
            top: volumeBoundsRef.current.y - 150,
            width: 44,
            height: 150,
            zIndex: 100,
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <View style={{
            backgroundColor: 'rgba(0,0,0,0.85)',
            borderRadius: 12,
            paddingVertical: 20,
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 140,
          }}>
            <Slider
              style={{ width: 100, height: 44, transform: [{ rotate: '-90deg' }] }}
              minimumValue={0}
              maximumValue={1}
              value={volume}
              onValueChange={onVolumeChange}
              minimumTrackTintColor="#FFFFFF"
              maximumTrackTintColor="rgba(255,255,255,0.3)"
              tapToSeek={true}
            />
          </View>
        </View>
      )}

      {/* Controls Overlay */}
      <View style={styles.controlsContainer}>
        {/* Top Gradient & Header */}
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          style={styles.topGradient}
        >
          <View style={styles.header}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>{title}</Text>
              {season && episode && (
                <Text style={styles.episodeInfo}>
                  S{season}E{episode} {episodeTitle && `• ${episodeTitle}`}
                </Text>
              )}
              <View style={styles.metadataRow}>
                {year && <Text style={styles.metadataText}>{year}</Text>}
                {streamName && <Text style={styles.providerText}>{t('player_ui.via', { name: streamName })}</Text>}
              </View>
              {playerBackend && (
                <View style={styles.metadataRow}>
                  <Text style={[styles.providerText, { fontSize: 11, opacity: 0.9 }]}>{playerBackend}</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {onAirPlayPress && playerBackend === 'KSAVPlayer' && (
                <TouchableOpacity style={{ padding: 8 }} onPress={onAirPlayPress} accessibilityRole="button">
                  <Feather name="airplay" size={closeIconSize} color={isAirPlayActive ? currentTheme.colors.primary : "white"} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeButton} onPress={handleClose} accessibilityRole="button">
                <Ionicons name="close" size={closeIconSize} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Bottom Gradient — two-row macOS layout */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.bottomGradient}
          pointerEvents="box-none"
        >
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }} pointerEvents="box-none">
            {/* Row 1: Play/Pause + Seek bar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <TouchableOpacity
                onPress={togglePlayback}
                activeOpacity={0.7}
                accessibilityRole="button"
                style={{ width: 36, alignItems: 'center' }}
              >
                {paused ? (
                  <Ionicons name="play" size={30} color="white" />
                ) : (
                  <Ionicons name="pause" size={30} color="white" />
                )}
              </TouchableOpacity>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, minWidth: 40 }}>{formatTime(previewTime)}</Text>
              <View style={{ flex: 1 }}>
                <Slider
                  style={{ width: '100%', height: 30 }}
                  minimumValue={0}
                  maximumValue={duration || 1}
                  value={previewTime}
                  onValueChange={(v) => setPreviewTime(v)}
                  onSlidingStart={() => {
                    isSlidingRef.current = true;
                    onSlidingStart();
                  }}
                  onSlidingComplete={(v) => {
                    isSlidingRef.current = false;
                    setPreviewTime(v);
                    onSlidingComplete(v);
                  }}
                  minimumTrackTintColor={currentTheme.colors.primary}
                  maximumTrackTintColor={currentTheme.colors.mediumEmphasis}
                  tapToSeek={true}
                />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, minWidth: 40 }}>{formatTime(duration)}</Text>
            </View>

            {/* Row 2: Utility buttons (centered) */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
              <TouchableOpacity style={styles.iconButton} onPress={cycleAspectRatio} accessibilityRole="button">
                <PlayerAspectRatioIcon width={22} height={22} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconButton} onPress={() => setShowSubtitleModal(!isSubtitleModalOpen)} accessibilityRole="button">
                <PlayerSubtitlesIcon width={22} height={22} />
              </TouchableOpacity>

              {setShowSourcesModal && (
                <TouchableOpacity style={styles.iconButton} onPress={() => setShowSourcesModal(true)} accessibilityRole="button">
                  <PlayerSourceIcon width={22} height={22} />
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.iconButton} onPress={() => setShowSpeedModal(true)} accessibilityRole="button">
                <Ionicons name="speedometer-outline" size={22} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowAudioModal(true)}
                disabled={ksAudioTracks.length < 1}
                accessibilityRole="button"
              >
                {ksAudioTracks.length < 1 ? (
                  <PlayerAudioOutlineIcon width={22} height={22} opacity={0.55} />
                ) : (
                  <PlayerAudioFilledIcon width={22} height={22} />
                )}
              </TouchableOpacity>

              {season !== undefined && episode !== undefined && settings.introSubmitEnabled && settings.introDbApiKey && (
                <TouchableOpacity style={styles.iconButton} onPress={handleIntroPress} accessibilityRole="button">
                  <Ionicons name="flag-outline" size={22} color="white" />
                </TouchableOpacity>
              )}

              {setShowEpisodesModal && (
                <TouchableOpacity style={styles.iconButton} onPress={() => setShowEpisodesModal(true)} accessibilityRole="button">
                  <PlayerEpisodesIcon width={22} height={22} />
                </TouchableOpacity>
              )}

              {/* Volume button — hover to show slider, click to mute */}
              <View
                ref={volumeAreaRef}
                onLayout={measureVolumeArea}
                style={{ position: 'relative', alignItems: 'center' }}
              >
                <TouchableOpacity style={styles.iconButton} onPress={onMuteToggle} accessibilityRole="button">
                  <Ionicons
                    name={volume === 0 ? 'volume-mute' : volume < 0.5 ? 'volume-low' : 'volume-high'}
                    size={22}
                    color="white"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.iconButton} onPress={() => fullscreenManager.toggleFullscreen()} accessibilityRole="button">
                <Feather name="maximize" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
};

export default PlayerControls;
