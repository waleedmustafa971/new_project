/*
  Social Lab — end-to-end tester for the Social Media module backend.

  Every check here hits the real server through the same API client the
  production screens use, so a green run proves the phone can reach the
  backend and that auth, privacy, safety, verification and the feed all
  behave on-device.

  This is a developer screen. It is registered in StackNavigator as
  "SocialLab" and is not linked from any user-facing navigation.
*/

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, SafeAreaView, TextInput, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as base from '../../../component/global';
import {
  feedApi, privacyApi, safetyApi, verificationApi,
  errorMessage, getCurrentUserId,
} from '../../../api/social';

type Status = 'idle' | 'running' | 'pass' | 'fail' | 'skip';

interface Check {
  key: string;
  group: string;
  label: string;
  run: (ctx: Ctx) => Promise<string>;
}

interface Ctx {
  userId: string;
  /** Ids created during the run so the teardown can remove them. */
  created: string[];
}

const C = {
  bg: '#0f1218',
  card: '#181d26',
  line: '#262d3a',
  text: '#e8ecf3',
  dim: '#8b94a6',
  pass: '#39c07f',
  fail: '#f0616d',
  run: '#5b8cf0',
  skip: '#8b94a6',
  accent: '#6f74e8',
};

/* ------------------------------------------------------------------ */
/* the checks                                                          */
/* ------------------------------------------------------------------ */

const CHECKS: Check[] = [
  /* ---- connectivity ---- */
  {
    key: 'reach', group: 'Connection', label: 'Server is reachable',
    run: async () => {
      const res = await fetch(`${base.BASE_URL}/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return `${base.BASE_URL} responded ${res.status}`;
    },
  },
  {
    key: 'whoami', group: 'Connection', label: 'Signed-in user resolved',
    run: async (ctx) => {
      if (!ctx.userId) throw new Error('No userdata in AsyncStorage — sign in first');
      return `userId ${ctx.userId.slice(-8)}`;
    },
  },

  /* ---- privacy ---- */
  {
    key: 'privacy.get', group: 'Privacy', label: 'Read privacy settings',
    run: async () => {
      const r = await privacyApi.getSettings();
      if (!r.success) throw new Error(r.message);
      const areas = r.options?.areas?.length ?? 0;
      return `mode "${r.privacy}", ${areas} area controls, ${r.options.audiences.length} audiences`;
    },
  },
  {
    key: 'privacy.custom', group: 'Privacy', label: 'Switch to custom + granular control',
    run: async () => {
      const r = await privacyApi.updateSettings({
        privacy: 'custom',
        settings: { stories: 'closeFriends', messages: 'followers' },
      });
      if (!r.success) throw new Error(r.message);
      if (r.effective.stories !== 'closeFriends') throw new Error('stories setting did not stick');
      return `stories=${r.effective.stories}, messages=${r.effective.messages}`;
    },
  },
  {
    key: 'privacy.restore', group: 'Privacy', label: 'Restore public mode',
    run: async () => {
      const r = await privacyApi.updateSettings({ privacy: 'public' });
      if (!r.success) throw new Error(r.message);
      if (r.effective.posts !== 'everyone') throw new Error('public preset not applied');
      return 'back to public, custom choices retained';
    },
  },
  {
    key: 'privacy.requests', group: 'Privacy', label: 'Follow-request queue',
    run: async () => {
      const [inbox, sent] = await Promise.all([
        privacyApi.followRequests(), privacyApi.sentFollowRequests(),
      ]);
      return `${inbox.total} incoming, ${sent.total} sent`;
    },
  },
  {
    key: 'privacy.closefriends', group: 'Privacy', label: 'Close friends list',
    run: async () => {
      const r = await privacyApi.closeFriends();
      if (!r.success) throw new Error(r.message);
      return `${r.total} close friend(s)`;
    },
  },

  /* ---- verification ---- */
  {
    key: 'badge.status', group: 'Blue tick', label: 'Verification status',
    run: async () => {
      const r = await verificationApi.status();
      if (!r.success) throw new Error(r.message);
      return `verified=${r.verified}, status=${r.status}, canApply=${r.canApply}, ${r.categories.length} categories`;
    },
  },
  {
    key: 'badge.bulk', group: 'Blue tick', label: 'Bulk badge lookup',
    run: async (ctx) => {
      const r = await verificationApi.badges([ctx.userId]);
      if (!r.success) throw new Error(r.message);
      return `resolved ${Object.keys(r.badges).length} badge(s)`;
    },
  },

  /* ---- safety ---- */
  {
    key: 'safety.reasons', group: 'Safety', label: 'Report reason catalogue',
    run: async () => {
      const r = await safetyApi.reportReasons();
      if (!r.success) throw new Error(r.message);
      if (r.reasons.length < 5) throw new Error('reason list looks short');
      return `${r.reasons.length} reasons, ${r.targetTypes.length} target types`;
    },
  },
  {
    key: 'safety.blocked', group: 'Safety', label: 'Blocked list + ids',
    run: async () => {
      const [list, ids] = await Promise.all([safetyApi.blockedList(), safetyApi.blockedIds()]);
      return `${list.total} blocked, ${ids.total} hidden id(s)`;
    },
  },
  {
    key: 'safety.myreports', group: 'Safety', label: 'My reports',
    run: async () => {
      const r = await safetyApi.myReports({ limit: 5 });
      if (!r.success) throw new Error(r.message);
      return `${r.total} report(s) filed`;
    },
  },

  /* ---- feed ---- */
  {
    key: 'feed.home', group: 'Feed', label: 'Home feed',
    run: async () => {
      const r = await feedApi.homeFeed({ limit: 5 });
      if (!r.success) throw new Error((r as any).message);
      const stories = r.items.filter((i) => /^stor/i.test(i.posttype)).length;
      if (stories > 0) throw new Error('stories leaked into the timeline');
      return `${r.items.length} of ${r.total} item(s), no stories`;
    },
  },
  {
    key: 'feed.foryou', group: 'Feed', label: '"For You" ranking + reasons',
    run: async () => {
      const r = await feedApi.forYou({ limit: 5 });
      if (!r.success) throw new Error((r as any).message);
      if (r.items.length === 0) return `empty (strategy: ${r.strategy})`;
      const scored = r.items.every((i) => typeof i.score === 'number');
      if (!scored) throw new Error('items missing scores');
      const top = r.items[0];
      return `${r.items.length} ranked · top ${top.score} · ${(top.reasons ?? []).join(', ')}`;
    },
  },
  {
    key: 'feed.trending', group: 'Feed', label: 'Trending posts / tags / creators',
    run: async () => {
      const r = await feedApi.trending({ hours: 720, limit: 5 });
      if (!r.success) throw new Error((r as any).message);
      const tags = r.hashtags.map((h) => `#${h.tag}`).slice(0, 3).join(' ');
      return `${r.posts.length} posts, ${r.hashtags.length} tags (${tags}), ${r.creators.length} creators`;
    },
  },
  {
    key: 'feed.stories', group: 'Feed', label: 'Story rings + unseen counts',
    run: async () => {
      const r = await feedApi.stories();
      if (!r.success) throw new Error((r as any).message);
      const unseen = r.rings.reduce((s, x) => s + x.unseen, 0);
      return `${r.rings.length} ring(s), ${r.totalStories} stories, ${unseen} unseen`;
    },
  },
  {
    key: 'feed.hashtagsearch', group: 'Feed', label: 'Hashtag autocomplete',
    run: async () => {
      const r = await feedApi.searchHashtags('', 10);
      if (!r.success) throw new Error((r as any).message);
      return `${r.total} tag(s): ${r.rows.slice(0, 4).map((h) => '#' + h.tag).join(' ')}`;
    },
  },
  {
    key: 'feed.places', group: 'Feed', label: 'Check-in place search',
    run: async () => {
      const r = await feedApi.searchPlaces('', 10);
      if (!r.success) throw new Error((r as any).message);
      return `${r.total} place(s): ${r.rows.slice(0, 3).map((p: any) => p.name).join(', ') || 'none yet'}`;
    },
  },
  {
    key: 'feed.nearby', group: 'Feed', label: 'Nearby (geo) discovery',
    run: async () => {
      // Dubai marina-ish; works against the seeded check-ins
      const r = await feedApi.nearby(55.19, 25.14, { radiusKm: 50, limit: 5 });
      if (!r.success) throw new Error((r as any).message);
      return `${r.total} post(s) within ${r.radiusKm}km`;
    },
  },
  {
    key: 'feed.recusers', group: 'Feed', label: 'Recommended users + reasons',
    run: async () => {
      const r = await feedApi.recommendedUsers(5);
      if (!r.success) throw new Error((r as any).message);
      if (r.rows.length === 0) return 'no suggestions available';
      const first = r.rows[0];
      return `${r.total} suggestion(s) · ${first.name}: ${first.reasons.join(', ')}`;
    },
  },
  {
    key: 'feed.recposts', group: 'Feed', label: 'Recommended posts',
    run: async () => {
      const r = await feedApi.recommendedPosts(5);
      if (!r.success) throw new Error((r as any).message);
      return `${r.total} suggested post(s)`;
    },
  },
  {
    key: 'feed.tagged', group: 'Feed', label: 'Tagged-in feed',
    run: async (ctx) => {
      const r = await feedApi.taggedFeed(ctx.userId, { limit: 5 });
      if (!r.success) throw new Error((r as any).message);
      return `tagged in ${r.total} post(s)`;
    },
  },
  {
    key: 'feed.taggable', group: 'Feed', label: 'Taggable users picker',
    run: async () => {
      const r = await feedApi.taggableUsers('', 10);
      if (!r.success) throw new Error((r as any).message);
      return `${r.total} taggable`;
    },
  },
  {
    key: 'feed.search', group: 'Feed', label: 'Content search',
    run: async () => {
      const r = await feedApi.searchContent('a', { limit: 5 });
      if (!r.success) throw new Error((r as any).message);
      return `${r.total} match(es) for "a"`;
    },
  },

  /* ---- write path: creates real content, then deletes it ---- */
  {
    key: 'write.text', group: 'Create', label: 'Text / status post',
    run: async (ctx) => {
      const r = await feedApi.createPost({
        caption: 'Social Lab check #sociallab',
        posttype: 'Post',
        xbackgroundcolor: '#5b5bd6',
      });
      if (!r.success) throw new Error(r.message);
      ctx.created.push(r.item._id);
      if (!r.item.hashtags.includes('sociallab')) throw new Error('hashtag not extracted');
      return `created, hashtag "#${r.item.hashtags[0]}" extracted`;
    },
  },
  {
    key: 'write.carousel', group: 'Create', label: 'Carousel (3 items)',
    run: async (ctx) => {
      const r = await feedApi.createPost({
        caption: 'Social Lab carousel',
        posttype: 'Post',
        media: [
          { url: 'uploads/lab-1.jpg', type: 'image', order: 0 },
          { url: 'uploads/lab-2.jpg', type: 'image', order: 1 },
          { url: 'uploads/lab-3.mp4', type: 'video', order: 2, duration: 8 },
        ],
      });
      if (!r.success) throw new Error(r.message);
      ctx.created.push(r.item._id);
      if (!r.item.isCarousel || r.item.mediaCount !== 3) throw new Error('carousel not formed');
      return `3 items, isCarousel=${r.item.isCarousel}`;
    },
  },
  {
    key: 'write.checkin', group: 'Create', label: 'Post with check-in',
    run: async (ctx) => {
      const r = await feedApi.createPost({
        caption: 'Social Lab check-in',
        posttype: 'Post',
        media: [{ url: 'uploads/lab-4.jpg', type: 'image' }],
        place: { name: 'Social Lab HQ', city: 'Dubai', country: 'UAE', lng: 55.2708, lat: 25.2048 },
      });
      if (!r.success) throw new Error(r.message);
      ctx.created.push(r.item._id);
      if (r.item.place?.name !== 'Social Lab HQ') throw new Error('place not stored');
      return `checked in at ${r.item.place?.name}`;
    },
  },
  {
    key: 'write.poll', group: 'Create', label: 'Poll: create, vote, results',
    run: async (ctx) => {
      const created = await feedApi.createPost({
        caption: 'Social Lab poll',
        posttype: 'Post',
        poll: { question: 'Does the backend work?', options: [{ text: 'Yes' }, { text: 'Also yes' }] },
      });
      if (!created.success) throw new Error(created.message);
      ctx.created.push(created.item._id);

      const poll = created.item.poll;
      if (!poll) throw new Error('poll missing');
      if (poll.options[0].votes !== null) throw new Error('results leaked before voting');

      const voted = await feedApi.votePoll(created.item._id, poll.options[0].id);
      if (!voted.success) throw new Error(voted.message);
      if (voted.poll.totalVotes !== 1) throw new Error('vote not counted');
      if (voted.poll.options[0].votes !== 1) throw new Error('results not revealed after voting');

      return `voted; ${voted.poll.totalVotes} vote, ${voted.poll.options[0].percent}% on "${poll.options[0].text}"`;
    },
  },
  {
    key: 'write.story', group: 'Create', label: 'Story with 24h expiry + view',
    run: async (ctx) => {
      const r = await feedApi.createPost({
        caption: 'Social Lab story',
        posttype: 'Story',
        media: [{ url: 'uploads/lab-story.jpg', type: 'image' }],
      });
      if (!r.success) throw new Error(r.message);
      ctx.created.push(r.item._id);
      if (!r.item.expiresAt) throw new Error('story has no expiry');

      const hours = (new Date(r.item.expiresAt).getTime() - Date.now()) / 3600000;
      if (hours < 23 || hours > 24.1) throw new Error(`expiry looks wrong (${hours.toFixed(1)}h)`);

      const viewed = await feedApi.markViewed(r.item._id);
      if (!viewed.success) throw new Error('view not recorded');

      return `expires in ${hours.toFixed(1)}h, view recorded`;
    },
  },
  {
    key: 'write.edit', group: 'Create', label: 'Edit re-extracts hashtags',
    run: async (ctx) => {
      if (ctx.created.length === 0) throw new Error('nothing to edit');
      const id = ctx.created[0];
      const r = await feedApi.updatePost(id, { caption: 'Edited by Social Lab #edited' });
      if (!r.success) throw new Error(r.message);
      if (!r.item.hashtags.includes('edited')) throw new Error('hashtag not re-extracted');
      return `caption updated, "#edited" indexed`;
    },
  },
];

/* ------------------------------------------------------------------ */
/* screen                                                              */
/* ------------------------------------------------------------------ */

export default function SocialLab({ navigation }: any) {
  const [userId, setUserId] = useState('');
  const [results, setResults] = useState<Record<string, { status: Status; detail: string }>>({});
  const [running, setRunning] = useState(false);
  const [createdIds, setCreatedIds] = useState<string[]>([]);

  useEffect(() => {
    getCurrentUserId().then((id) => setUserId(id ?? ''));
  }, []);

  const groups = useMemo(() => {
    const out: Record<string, Check[]> = {};
    for (const c of CHECKS) (out[c.group] ??= []).push(c);
    return out;
  }, []);

  const summary = useMemo(() => {
    const vals = Object.values(results);
    return {
      pass: vals.filter((v) => v.status === 'pass').length,
      fail: vals.filter((v) => v.status === 'fail').length,
      total: CHECKS.length,
    };
  }, [results]);

  const runAll = useCallback(async () => {
    setRunning(true);
    setResults({});
    const ctx: Ctx = { userId, created: [] };

    for (const check of CHECKS) {
      setResults((r) => ({ ...r, [check.key]: { status: 'running', detail: '' } }));
      try {
        const detail = await check.run(ctx);
        setResults((r) => ({ ...r, [check.key]: { status: 'pass', detail } }));
      } catch (err: any) {
        setResults((r) => ({
          ...r,
          [check.key]: { status: 'fail', detail: errorMessage(err) },
        }));
      }
    }

    setCreatedIds(ctx.created);
    setRunning(false);
  }, [userId]);

  /* Content created by the run stays visible so it can be inspected in the
     admin panel. This pulls it back to Draft, which removes it from every
     feed without destroying it. */
  const [cleanupNote, setCleanupNote] = useState('');

  const cleanUp = useCallback(async () => {
    if (createdIds.length === 0) return;
    setRunning(true);
    let removed = 0;
    for (const id of createdIds) {
      try {
        await feedApi.updatePost(id, { status_draft_publish: 'Draft' });
        removed++;
      } catch { /* already gone — nothing to do */ }
    }
    setCreatedIds([]);
    setCleanupNote(`${removed} test post(s) moved to Draft`);
    setRunning(false);
  }, [createdIds]);

  const dot = (s: Status) => {
    const color =
      s === 'pass' ? C.pass : s === 'fail' ? C.fail : s === 'running' ? C.run : C.skip;
    return <View style={[styles.dot, { backgroundColor: color }]} />;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Social Lab</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{base.BASE_URL}</Text>
        </View>
        <View style={styles.scorebox}>
          <Text style={[styles.score, { color: summary.fail ? C.fail : C.pass }]}>
            {summary.pass}/{summary.total}
          </Text>
          {summary.fail > 0 && <Text style={styles.scoreFail}>{summary.fail} failed</Text>}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <Text style={styles.label}>Acting user id</Text>
          <TextInput
            style={styles.input}
            value={userId}
            onChangeText={setUserId}
            placeholder="paste a user _id to test as"
            placeholderTextColor={C.dim}
            autoCapitalize="none"
          />
          <Text style={styles.hint}>
            Filled from your signed-in account. Paste any user id to run the checks as them.
          </Text>
        </View>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, running && styles.btnDisabled]}
            onPress={runAll}
            disabled={running}
          >
            {running
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Run all {CHECKS.length} checks</Text>}
          </TouchableOpacity>
          {createdIds.length > 0 && (
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={cleanUp} disabled={running}>
              <Text style={[styles.btnText, { color: C.dim }]}>Clean up ({createdIds.length})</Text>
            </TouchableOpacity>
          )}
        </View>

        {Object.entries(groups).map(([group, checks]) => (
          <View key={group} style={styles.card}>
            <Text style={styles.group}>{group}</Text>
            {checks.map((check) => {
              const r = results[check.key];
              return (
                <View key={check.key} style={styles.check}>
                  {dot(r?.status ?? 'idle')}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.checkLabel}>{check.label}</Text>
                    {!!r?.detail && (
                      <Text
                        style={[
                          styles.checkDetail,
                          r.status === 'fail' && { color: C.fail },
                        ]}
                      >
                        {r.detail}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        {!!cleanupNote && <Text style={styles.cleanupNote}>{cleanupNote}</Text>}

        <Text style={styles.footer}>
          Checks run against the live server through the same API client the app screens use.
          Content created by the "Create" group stays visible in the admin panel until you
          press Clean up.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  back: { color: C.text, fontSize: 30, lineHeight: 32, width: 22 },
  title: { color: C.text, fontSize: 18, fontWeight: '700' },
  subtitle: { color: C.dim, fontSize: 11.5, marginTop: 1 },
  scorebox: { alignItems: 'flex-end' },
  score: { fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  scoreFail: { color: C.fail, fontSize: 10.5 },

  body: { padding: 14, paddingBottom: 60, gap: 14 },

  card: {
    backgroundColor: C.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: C.line, gap: 8,
  },
  label: { color: C.dim, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: {
    backgroundColor: C.bg, borderRadius: 8, borderWidth: 1, borderColor: C.line,
    color: C.text, paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 7,
    fontSize: 13,
  },
  hint: { color: C.dim, fontSize: 11.5, lineHeight: 16 },

  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: C.accent },
  btnGhost: { flex: 0, paddingHorizontal: 16, borderWidth: 1, borderColor: C.line },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  group: {
    color: C.dim, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2,
  },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  checkLabel: { color: C.text, fontSize: 13.5 },
  checkDetail: { color: C.dim, fontSize: 11.5, marginTop: 2, lineHeight: 16 },

  cleanupNote: { color: C.pass, fontSize: 12, paddingHorizontal: 4 },
  footer: { color: C.dim, fontSize: 11.5, lineHeight: 17, paddingHorizontal: 4 },
});
