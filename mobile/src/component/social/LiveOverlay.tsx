import React, { useCallback, useEffect, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Animated, Easing, Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TT } from '../../theme/social';
import * as base from '../global';

/*
  The TikTok live surface.

  A live room is video with controls floating on it -- never video in a box
  with a UI around it. What the room had was the second thing: a header strip,
  a chat panel occupying its own band, a footer bar, and a debug line printing
  Agora UIDs over the host's face. Everything sat in the layout flow, so the
  video was the background of a form rather than the screen itself.

  Three pieces make the pattern:

    LiveTopBar        host pill + live/viewer chips + close, all as overlays
    LiveRail          the right-hand column of round actions -- the single
                      most recognisable thing about a TikTok screen
    LiveCommentStream comments rising from the bottom-left, fading at the top

  Everything here is absolutely positioned and carries its own scrim, because
  white-on-video is unreadable the moment the camera points at a window.
*/

const { height: SCREEN_H } = Dimensions.get('window');

const absolute = (p?: string | null) =>
  !p ? undefined
    : /^(https?:|file:|data:)/.test(p) ? p
      : `${base.BASE_URL}/${String(p).replace(/^\/+/, '')}`;

const compact = (n?: number) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}K`;
  return String(v);
};

/* ------------------------------------------------------------------ */
/* Top bar                                                             */
/* ------------------------------------------------------------------ */

export const LiveTopBar = ({
  hostName, hostImage, isFollowing, viewerCount, onClose, onFollow, onOpenHost, isHost,
}: {
  hostName?: string;
  hostImage?: string | null;
  isFollowing?: boolean;
  viewerCount?: number;
  onClose?: () => void;
  onFollow?: () => void;
  onOpenHost?: () => void;
  isHost?: boolean;
}) => {
  const insets = useSafeAreaInsets();

  return (
    <>
      {/* A scrim rather than a bar. The controls need contrast; the video
          should still be visible behind them. */}
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'transparent']}
        style={[styles.topScrim, { height: insets.top + 96 }]}
        pointerEvents="none"
      />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        {/* The host pill: avatar, name, follow. One object, not three
            controls spread across a header. */}
        <TouchableOpacity style={styles.hostPill} onPress={onOpenHost} activeOpacity={0.8}>
          <Image
            source={hostImage ? { uri: absolute(hostImage) } : require('../../assets/user.png')}
            style={styles.hostAvatar}
          />
          <View style={styles.hostText}>
            <Text style={styles.hostName} numberOfLines={1}>{hostName || 'Live'}</Text>
            <Text style={styles.hostMeta}>{compact(viewerCount)} watching</Text>
          </View>

          {!isHost && !isFollowing && (
            <TouchableOpacity style={styles.followBtn} onPress={onFollow} activeOpacity={0.85}>
              <Ionicons name="add" size={15} color={TT.text} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        <View style={styles.topRight}>
          <View style={styles.liveChip}>
            <View style={styles.liveDot} />
            <Text style={styles.liveChipText}>LIVE</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color={TT.text} />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Right-hand action rail                                              */
/* ------------------------------------------------------------------ */

const RailButton = ({
  icon, label, color, onPress, filled,
}: {
  icon: string; label?: string; color?: string; onPress?: () => void; filled?: boolean;
}) => (
  <TouchableOpacity style={styles.railBtn} onPress={onPress} activeOpacity={0.7}>
    <Ionicons name={icon} size={TT.rail.icon} color={color || TT.text} style={styles.railIcon} />
    {!!label && <Text style={styles.railLabel}>{label}</Text>}
  </TouchableOpacity>
);

export const LiveRail = ({
  likeCount, liked, commentCount, shareCount, onLike, onComment, onGift, onShare,
}: {
  likeCount?: number;
  liked?: boolean;
  commentCount?: number;
  shareCount?: number;
  onLike?: () => void;
  onComment?: () => void;
  onGift?: () => void;
  onShare?: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(1)).current;

  const tapLike = useCallback(() => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.35, duration: 110, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    onLike?.();
  }, [scale, onLike]);

  return (
    <View style={[styles.rail, { bottom: insets.bottom + 96 }]}>
      <TouchableOpacity style={styles.railBtn} onPress={tapLike} activeOpacity={0.7}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={TT.rail.icon + 2}
            color={liked ? TT.accent : TT.text}
            style={styles.railIcon}
          />
        </Animated.View>
        <Text style={styles.railLabel}>{compact(likeCount)}</Text>
      </TouchableOpacity>

      <RailButton icon="chatbubble-ellipses" label={compact(commentCount)} onPress={onComment} />
      {/* Gifting is the money button, so it carries the one accent colour on
          the screen. */}
      <RailButton icon="gift" label="Gift" color={TT.accent} onPress={onGift} />
      <RailButton icon="arrow-redo" label={compact(shareCount)} onPress={onShare} />
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* Comment stream                                                      */
/* ------------------------------------------------------------------ */

type StreamMessage = {
  text?: string;
  system?: boolean;
  giftImageUrl?: string;
  sender?: { name?: string; image?: string };
};

export const LiveCommentStream = ({ messages = [] }: { messages?: StreamMessage[] }) => {
  const insets = useSafeAreaInsets();
  const ref = useRef<any>(null);

  useEffect(() => {
    // A live chat is only useful at its newest end.
    const t = setTimeout(() => ref.current?.scrollToEnd?.({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [messages]);

  /*
    Only the last dozen. A live chat that keeps every line eventually covers
    the whole screen with text and pins the scroll view under the rail; TikTok
    shows a short rolling window and lets the rest go.
  */
  const window = messages.slice(-12);

  return (
    <View
      style={[
        styles.stream,
        { bottom: insets.bottom + 64, maxHeight: Math.min(SCREEN_H * 0.34, 260) },
      ]}
      pointerEvents="box-none"
    >
      <Animated.ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }}
      >
        {window.map((m, i) => {
          if (m.system && m.giftImageUrl) {
            return (
              <View key={i} style={[styles.bubble, styles.giftBubble]}>
                <Image source={{ uri: base.BASE_URL + m.giftImageUrl }} style={styles.giftIcon} />
                <Text style={styles.giftText} numberOfLines={2}>{m.text}</Text>
              </View>
            );
          }
          if (m.system) {
            return (
              <View key={i} style={[styles.bubble, styles.systemBubble]}>
                <Text style={styles.systemText} numberOfLines={2}>{m.text}</Text>
              </View>
            );
          }
          return (
            <View key={i} style={styles.bubble}>
              <Text style={styles.msgText} numberOfLines={3}>
                <Text style={styles.msgName}>{m.sender?.name || 'Guest'}  </Text>
                {m.text}
              </Text>
            </View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TT.space.md,
  },
  hostPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TT.chip,
    borderRadius: TT.radius.pill,
    paddingLeft: 3,
    paddingRight: 4,
    paddingVertical: 3,
    maxWidth: '58%',
  },
  hostAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: TT.glass },
  hostText: { marginLeft: 7, marginRight: 8, flexShrink: 1 },
  hostName: { ...TT.font.name, fontSize: 13, ...TT.textShadow },
  hostMeta: { ...TT.font.meta, fontSize: 11 },
  followBtn: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: TT.accent,
    alignItems: 'center', justifyContent: 'center',
  },

  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: TT.accent,
    paddingHorizontal: 8,
    height: 22,
    borderRadius: TT.radius.sm,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveChipText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  iconBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: TT.chip,
  },

  rail: {
    position: 'absolute',
    right: TT.rail.right,
    alignItems: 'center',
    gap: TT.rail.gap,
  },
  railBtn: { alignItems: 'center' },
  /* The icons sit directly on video, so each carries its own drop shadow
     rather than a plate behind it -- that is what keeps the rail feeling like
     part of the video and not a toolbar. */
  railIcon: {
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  railLabel: { ...TT.font.railCount, marginTop: TT.rail.labelGap, ...TT.textShadow },

  stream: {
    position: 'absolute',
    left: TT.space.md,
    // Stops short of the rail so long comments cannot run underneath it.
    right: 78,
  },
  bubble: {
    alignSelf: 'flex-start',
    backgroundColor: TT.scrim,
    borderRadius: TT.radius.lg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
  },
  msgText: { ...TT.font.body },
  msgName: { color: TT.cyan, fontWeight: '700' },
  systemBubble: { backgroundColor: 'rgba(254,44,85,0.28)' },
  systemText: { ...TT.font.body, fontWeight: '600' },
  giftBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(254,44,85,0.35)' },
  giftIcon: { width: 26, height: 26, borderRadius: 6 },
  giftText: { ...TT.font.body, fontWeight: '600', flexShrink: 1 },
});

export default { LiveTopBar, LiveRail, LiveCommentStream };
