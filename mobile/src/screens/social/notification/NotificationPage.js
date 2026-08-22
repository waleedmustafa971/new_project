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

    const renderItem = ({ item }) => {
        const actor = item.actor || {};
        const others = item.others || 0;

        return (
            <View style={[styles.notificationItem, !item.read && styles.unreadItem]}>
                <Image source={avatarFor(actor)} style={styles.avatar} />
                <View style={styles.textContainer}>
                    <Text style={styles.notificationText}>
                        <Text style={styles.username}>{actor.name || 'Someone'}</Text>
                        {others > 0 ? ` and ${others} other${others > 1 ? 's' : ''}` : ''}
                        {' '}
                        {describe(item)}
                    </Text>
                    <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
            </View>
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
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={20} color="black" />
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
                        items.length ? { padding: 15 } : { flexGrow: 1, justifyContent: 'center' }
                    }
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: { fontSize: 12, fontWeight: 'bold', marginLeft: 15 },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    unreadItem: { backgroundColor: '#f5f9ff' },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    textContainer: { flex: 1 },
    notificationText: { fontSize: 12, color: '#333' },
    username: { fontWeight: 'bold', color: '#000' },
    timeText: { color: '#999', fontSize: 12, marginTop: 5 },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#1d7fe0',
        marginLeft: 8,
    },
    separator: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 5 },
    empty: { alignItems: 'center', justifyContent: 'center', padding: 30 },
    emptyText: { color: '#999', fontSize: 13, marginTop: 10, textAlign: 'center' },
});
