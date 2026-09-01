import React, { useCallback, useEffect, useState } from 'react';
import {
    View, Text, FlatList, Image, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSocket } from '../../context/SocketContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../component/api';
import * as base from '../../../component/global';
import { FB } from '../../../theme/social';

/*
  The notifications screen.

  This used to render a hardcoded array — John Doe, Jane Smith, Alex Johnson —
  so it showed the same five fake rows on every device and never touched the
  server. Meanwhile the backend has been recording real notifications the whole
  time, with grouping, read state and an unread count.

  It reads GET /apis/notification/ now. The server collapses groupable types
  before sending, so a row can stand for several people: `others` is how many
  beyond the named actor, which is what turns five likes into one line.
*/

/*
  The little coloured badge on the corner of the avatar.

  A notification list where every row is an anonymous circle makes you read
  each sentence to find out what happened. Facebook puts the verb on the
  avatar, so the list is scannable at a glance -- blue thumb, green speech
  bubble, red heart.
*/
const BADGE = {
    like: { icon: 'thumbs-up', bg: '#1877F2' },
    comment: { icon: 'chatbubble', bg: '#45BD62' },
    comment_like: { icon: 'thumbs-up', bg: '#1877F2' },
    reply: { icon: 'arrow-undo', bg: '#45BD62' },
    follow: { icon: 'person-add', bg: '#1877F2' },
    mention: { icon: 'at', bg: '#8B5CF6' },
    tag: { icon: 'pricetag', bg: '#8B5CF6' },
    share: { icon: 'arrow-redo', bg: '#1877F2' },
    story_view: { icon: 'eye', bg: '#F7B928' },
    subscription: { icon: 'star', bg: '#F7B928' },
    gift: { icon: 'gift', bg: '#F3425F' },
    login_alert: { icon: 'shield-checkmark', bg: '#65676B' },
};
const badgeFor = (type) => BADGE[type] || { icon: 'notifications', bg: '#65676B' };

/* Thumbnails come back as stored paths, like every other image in this app. */
const absolute = (path) => {
    if (!path) return undefined;
    return /^(https?:|file:|data:)/.test(path)
        ? path
        : `${base.BASE_URL}/${String(path).replace(/^\/+/, '')}`;
};

/* The wording for each type. Anything unknown falls back to a neutral phrase
   rather than rendering an empty sentence. */
const PHRASE = {
    like: 'liked your post.',
    comment: 'commented on your post.',
    comment_like: 'liked your comment.',
    reply: 'replied to your comment.',
    follow: 'started following you.',
    mention: 'mentioned you.',
    tag: 'tagged you.',
    share: 'shared your post.',
    story_view: 'viewed your story.',
    subscription: 'subscribed to you.',
    gift: 'sent you a gift.',
    login_alert: 'signed in on a new device.',
    live: 'went live.',
};

const describe = (n) => {
    const base = PHRASE[n.type] || 'sent you a notification.';
    if (n.type === 'comment' && n.preview) return `commented: "${n.preview}"`;
    return base;
};

/* "2 min ago" without pulling in a date library. */
const timeAgo = (iso) => {
    const then = new Date(iso).getTime();
    if (!then) return '';
    const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
    if (secs < 60) return 'just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(iso).toLocaleDateString();
};

/* Stored image paths are relative to the API host. */
const avatarFor = (actor) =>
    actor?.image
        ? { uri: `${base.PROFILE_IMAGE_URL}/${String(actor.image).replace(/^\/+/, '')}` }
        : require('../../../assets/user.png');

const NotificationPage = () => {
    const navigation = useNavigation();
    /* Arrivals pushed over the socket while this screen is open. Without them
       the list only changed when it was re-opened, which is what made every
       notification feel late. */
    const { liveNotifications, clearNotifications } = useSocket();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        try {
            setError(null);
            const raw = await AsyncStorage.getItem('userdata');
            if (!raw) {
                setItems([]);
                return;
            }
            const userId = JSON.parse(raw)?._id;
            const res = await api.get('/apis/notification/', {
                params: { userId, page: 1, limit: 30 },
            });
            setItems(res.data?.notifications || []);

            /*
              Opening the screen is what marks them read — the badge should clear
              because they were seen, not because a separate button was pressed.
              Failure here is ignored: the list is already on screen and a stale
              badge is a much smaller problem than an error over the top of it.
            */
            api.post('/apis/notification/read', { userId }).catch(() => {});
        } catch (e) {
            setError(e?.response?.data?.message || 'Could not load notifications');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Reload on focus rather than on mount, so coming back from a post shows
    // anything that arrived while it was open.
    useFocusEffect(useCallback(() => { load(); clearNotifications(); }, [load]));

    /*
      Merge live arrivals into the list as they land.

      Prepended rather than triggering a re-fetch: the payload the server emits
      is already the shape this list renders, and re-fetching on every arrival
      would hammer the endpoint when several land together. Deduped by id
      because the server upserts notifications — the same row can be sent again
      when it is updated rather than created.
    */
    useEffect(() => {
        if (!liveNotifications.length) return;
        setItems((prev) => {
            const seen = new Set(prev.map((i) => String(i._id)));
            const fresh = liveNotifications.filter((n) => !seen.has(String(n._id)));
            return fresh.length ? [...fresh, ...prev] : prev;
        });
    }, [liveNotifications]);

    const onRefresh = () => { setRefreshing(true); load(); };

    /*
      Open what the notification is about.

      Every row was inert -- no onPress anywhere on this screen -- so tapping a
      notification did nothing at all. A notification exists to take you
      somewhere; one that does not is just a receipt. A follow goes to the
      person, everything carrying a post goes to the post, and anything else
      falls back to the actor's profile.
    */
    const openNotification = (item) => {
        const actor = item.actor || {};
        const actorId = actor._id || actor.userid;

        if (item.type === 'follow' || item.type === 'subscription') {
            if (actorId) {
                navigation.navigate('UserProfile', {
                    userid: actorId, name: actor.name, image: actor.image,
                });
            }
            return;
        }
        if (item.post) {
            navigation.navigate('ShowReel', { reel: [{ _id: item.post }] });
            return;
        }
        if (actorId) {
            navigation.navigate('UserProfile', {
                userid: actorId, name: actor.name, image: actor.image,
            });
        }
    };

    const renderItem = ({ item }) => {
        const actor = item.actor || {};
        const others = item.others || 0;
        const badge = badgeFor(item.type);

        return (
            <TouchableOpacity
                style={[styles.notificationItem, !item.read && styles.unreadItem]}
                onPress={() => openNotification(item)}
                activeOpacity={0.6}
            >
                <View>
                    <Image source={avatarFor(actor)} style={styles.avatar} />
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        <Ionicons name={badge.icon} size={12} color="#fff" />
                    </View>
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.notificationText}>
                        <Text style={styles.username}>{actor.name || 'Someone'}</Text>
                        {others > 0 ? ` and ${others} other${others > 1 ? 's' : ''}` : ''}
                        {' '}
                        {describe(item)}
                    </Text>
                    {/* Unread time reads in the accent colour, which is how the
                        eye finds the new ones without hunting for dots. */}
                    <Text style={[styles.timeText, !item.read && styles.timeUnread]}>
                        {timeAgo(item.createdAt)}
                    </Text>
                </View>

                {/* A thumbnail of the post, when the notification is about one.
                    It was sent by the server all along and never drawn. */}
                {item.thumbnail ? (
                    <Image source={{ uri: absolute(item.thumbnail) }} style={styles.thumb} />
                ) : !item.read ? (
                    <View style={styles.unreadDot} />
                ) : null}
            </TouchableOpacity>
        );
    };

    const empty = () => (
        <View style={styles.empty}>
            <Ionicons name="notifications-outline" size={40} color="#c7c7c7" />
            <Text style={styles.emptyText}>
                {error || 'Nothing here yet'}
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={24} color={FB.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 30 }} />
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => String(item._id)}
                    renderItem={renderItem}
                    contentContainerStyle={
                        items.length ? { paddingVertical: 4 } : { flexGrow: 1, justifyContent: 'center' }
                    }
                    ListEmptyComponent={empty}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            )}
        </View>
    );
};

export default NotificationPage;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: FB.surface },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: FB.divider,
    },
    /* 12px bold is a caption, not a screen title. */
    headerTitle: { fontSize: 20, fontWeight: '700', color: FB.text },

    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    unreadItem: { backgroundColor: FB.primarySoft },
    avatar: {
        width: 56, height: 56, borderRadius: 28,
        marginRight: 12,
        backgroundColor: FB.fill,
    },
    badge: {
        position: 'absolute',
        bottom: -1, left: 34,
        width: 24, height: 24, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: FB.surface,
    },
    textContainer: { flex: 1 },
    /* 12px body text on a list you are meant to read. */
    notificationText: { fontSize: 15, lineHeight: 20, color: FB.text },
    username: { fontWeight: '700', color: FB.text },
    timeText: { color: FB.textSecondary, fontSize: 13, marginTop: 3 },
    timeUnread: { color: FB.primary, fontWeight: '600' },
    unreadDot: {
        width: 12, height: 12, borderRadius: 6,
        backgroundColor: FB.primary,
        marginLeft: 10,
    },
    thumb: {
        width: 52, height: 52, borderRadius: 6,
        marginLeft: 10,
        backgroundColor: FB.fill,
    },
    empty: { alignItems: 'center', justifyContent: 'center', padding: 30 },
    emptyText: { color: FB.textSecondary, fontSize: 15, marginTop: 12, textAlign: 'center' },
});
