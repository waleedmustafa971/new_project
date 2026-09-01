import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FB } from '../../theme/social';
import * as base from '../global';

/*
  "What's on your mind?"

  The single most recognisable row in the Facebook app, and the timeline had no
  equivalent at all: the only way to write a post was the "+" in the footer, or
  a row buried in the profile's settings list. Posting is the thing the product
  exists for and it was two taps behind a menu.

  Three shortcuts under the prompt, in Facebook's order and colours -- Live,
  Photo, Feeling. They are separate entry points rather than one composer with
  a mode, because that is what they open here.
*/

const SHORTCUTS = [
  { key: 'live', icon: 'videocam', color: '#F3425F', label: 'Live' },
  { key: 'photo', icon: 'images', color: '#45BD62', label: 'Photo' },
  { key: 'feeling', icon: 'happy', color: '#F7B928', label: 'Feeling' },
] as const;

const avatarUri = (image?: string | null) => {
  if (!image) return null;
  if (/^(https?:|file:|data:)/.test(image)) return image;
  return `${base.BASE_URL}/${String(image).replace(/^\/+/, '')}`;
};

const Composer = ({
  avatar, onCompose, onLive, onPhoto, onFeeling,
}: {
  avatar?: string | null;
  onCompose?: () => void;
  onLive?: () => void;
  onPhoto?: () => void;
  onFeeling?: () => void;
}) => {
  const uri = avatarUri(avatar);
  const press = { live: onLive, photo: onPhoto, feeling: onFeeling } as const;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TouchableOpacity onPress={onCompose} activeOpacity={0.7}>
          <Image
            source={uri ? { uri } : require('../../assets/user.png')}
            style={styles.avatar}
          />
        </TouchableOpacity>

        {/* A pill, not a text input. Tapping opens the real composer -- an
            inline field here would need its own keyboard handling and would
            still hand off for photos, audience and tagging. */}
        <TouchableOpacity style={styles.prompt} onPress={onCompose} activeOpacity={0.7}>
          <Text style={styles.promptText}>What's on your mind?</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.shortcuts}>
        {SHORTCUTS.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={styles.shortcut}
            onPress={press[s.key]}
            activeOpacity={0.6}
          >
            <Ionicons name={s.icon} size={20} color={s.color} />
            <Text style={styles.shortcutText}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default Composer;

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: FB.surface,
    paddingTop: FB.space.md,
    marginBottom: FB.card.gap,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FB.card.padding,
    paddingBottom: FB.space.md,
  },
  avatar: {
    width: FB.avatar.md,
    height: FB.avatar.md,
    borderRadius: FB.avatar.md / 2,
    backgroundColor: FB.fill,
  },
  prompt: {
    flex: 1,
    marginLeft: 10,
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: FB.radius.pill,
    borderWidth: 1,
    borderColor: FB.divider,
  },
  promptText: { fontSize: 15, color: FB.textSecondary },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: FB.divider,
    marginHorizontal: FB.card.padding,
  },
  shortcuts: { flexDirection: 'row', paddingVertical: 4 },
  shortcut: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
  },
  shortcutText: { ...FB.font.action },
});
