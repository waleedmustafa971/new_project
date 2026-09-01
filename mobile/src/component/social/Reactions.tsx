import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Modal, Pressable, Easing,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FB } from '../../theme/social';
import api from '../api';

/*
  Facebook's reactions, finally connected.

  The backend has had the whole thing since the Engagement build: six reaction
  types on the post's `likes` array, `POST /apis/engagement/posts/:id/react`
  that adds, switches and withdraws, and a summary of counts plus the viewer's
  own reaction. Nothing in the app ever called it. The feed did a binary like
  through the legacy `/apis/reel/addlike`, so a product with love/haha/wow/sad/
  angry shipped with a thumb and nothing else.

  Two pieces make up the pattern:

    ReactionPicker  the row of six that springs out of a long press
    ActionBar       Like / Comment / Share, with the tap-and-hold affordance

  A tap is "like" (or withdraws whatever you had). A long press opens the
  picker. That is the whole Facebook interaction and it is what people expect
  the moment they see the button.
*/

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

type Meta = { key: ReactionType; emoji: string; label: string; color: string };

/*
  Emoji rather than bespoke artwork. The real thing is animated Lottie, which
  needs six licensed assets this project does not have; emoji render at any
  size, need no bundle space, and read correctly on both platforms.
*/
export const REACTIONS: Meta[] = [
  { key: 'like',  emoji: '👍', label: 'Like',   color: FB.primary },
  { key: 'love',  emoji: '❤️', label: 'Love',   color: '#F33E58' },
  { key: 'haha',  emoji: '😆', label: 'Haha',   color: '#F7B125' },
  { key: 'wow',   emoji: '😮', label: 'Wow',    color: '#F7B125' },
  { key: 'sad',   emoji: '😢', label: 'Sad',    color: '#F7B125' },
  { key: 'angry', emoji: '😡', label: 'Angry',  color: '#E9710F' },
];

export const reactionMeta = (key?: string | null): Meta | null =>
  REACTIONS.find((r) => r.key === key) || null;

export type ReactionCounts = Partial<Record<ReactionType, number>>;

/* ------------------------------------------------------------------ */
/* The pop-out picker                                                  */
/* ------------------------------------------------------------------ */

const PickerRow = ({
  onPick, onDismiss, anchorY,
}: { onPick: (r: ReactionType) => void; onDismiss: () => void; anchorY: number }) => {
  /*
    Each face scales up in sequence rather than the row appearing at once.
    Facebook's stagger is what makes it feel like a set of objects rather than
    a menu, and it is cheap: one Animated.Value per face, all native-driven.
  */
  const scales = useRef(REACTIONS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      28,
      scales.map((s) =>
        Animated.spring(s, {
          toValue: 1, useNativeDriver: true, friction: 5, tension: 140,
        })
      )
    ).start();
  }, [scales]);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      {/* Anywhere outside closes, which is the only way out of a popover that
          has no chrome of its own. */}
      <Pressable style={styles.pickerBackdrop} onPress={onDismiss}>
        <View
          style={[
            styles.pickerRow,
            // Sits above the finger. Clamped so a post near the top of the
            // screen does not push the row off it.
            { top: Math.max(anchorY - 74, 60) },
          ]}
        >
          {REACTIONS.map((r, i) => (
            <Animated.View key={r.key} style={{ transform: [{ scale: scales[i] }] }}>
              <TouchableOpacity
                accessibilityLabel={r.label}
                style={styles.pickerFace}
                onPress={() => onPick(r.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerEmoji}>{r.emoji}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* The summary line above the action bar                               */
/* ------------------------------------------------------------------ */

export const ReactionSummary = ({
  counts, total, myReaction, commentCount = 0, shareCount = 0, onPressReactions, onPressComments,
}: {
  counts: ReactionCounts;
  total: number;
  myReaction?: ReactionType | null;
  commentCount?: number;
  shareCount?: number;
  onPressReactions?: () => void;
  onPressComments?: () => void;
}) => {
  // The three most-used faces, biggest first — the overlapping cluster.
  const top = REACTIONS
    .map((r) => ({ ...r, n: counts?.[r.key] || 0 }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3);

  if (!total && !commentCount && !shareCount) return null;

  /* "You and 4 others" rather than a bare number: a post you reacted to should
     say so without you having to look at the button. */
  const others = myReaction ? total - 1 : total;
  const label = !total
    ? ''
    : myReaction
      ? others > 0 ? `You and ${others} other${others === 1 ? '' : 's'}` : 'You'
      : String(total);

  return (
    <View style={styles.summaryRow}>
      <TouchableOpacity
        style={styles.summaryLeft}
        onPress={onPressReactions}
        disabled={!total}
        activeOpacity={0.6}
      >
        {top.map((r, i) => (
          <View key={r.key} style={[styles.summaryFace, i > 0 && { marginLeft: -6 }]}>
            <Text style={styles.summaryEmoji}>{r.emoji}</Text>
          </View>
        ))}
        {!!label && <Text style={styles.summaryText}>{label}</Text>}
      </TouchableOpacity>

      <View style={styles.summaryRight}>
        {commentCount > 0 && (
          <TouchableOpacity onPress={onPressComments} activeOpacity={0.6}>
            <Text style={styles.summaryText}>
              {commentCount} comment{commentCount === 1 ? '' : 's'}
            </Text>
          </TouchableOpacity>
        )}
        {shareCount > 0 && (
          <Text style={[styles.summaryText, { marginLeft: 12 }]}>
            {shareCount} share{shareCount === 1 ? '' : 's'}
          </Text>
        )}
      </View>
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* Like / Comment / Share                                              */
/* ------------------------------------------------------------------ */

export const ActionBar = ({
  postId, userId, initialCounts, initialTotal, initialMine,
  onComment, onShare, onChanged,
}: {
  postId: string;
  userId?: string | null;
  initialCounts?: ReactionCounts;
  initialTotal?: number;
  initialMine?: ReactionType | null;
  onComment?: () => void;
  onShare?: () => void;
  onChanged?: (s: { counts: ReactionCounts; total: number; myReaction: ReactionType | null }) => void;
}) => {
  const [mine, setMine] = useState<ReactionType | null>(initialMine ?? null);
  const [counts, setCounts] = useState<ReactionCounts>(initialCounts || {});
  const [total, setTotal] = useState<number>(initialTotal || 0);
  const [picker, setPicker] = useState<number | null>(null);
  const scale = useRef(new Animated.Value(1)).current;

  // The card is re-created constantly as the feed re-renders; without this the
  // button snaps back to whatever the server said when the page was fetched.
  useEffect(() => { setMine(initialMine ?? null); }, [initialMine]);
  useEffect(() => { if (initialCounts) setCounts(initialCounts); }, [initialCounts]);
  useEffect(() => { if (typeof initialTotal === 'number') setTotal(initialTotal); }, [initialTotal]);

  const bump = useCallback(() => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.25, duration: 110, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
  }, [scale]);

  /*
    Optimistic, then reconciled.

    A reaction that waits for a round trip before it lights up feels broken on
    a phone, so the local state moves first and the server's own summary
    replaces it when it lands. A failure puts back exactly what was there
    before rather than guessing.
  */
  const send = useCallback(async (type: ReactionType) => {
    if (!userId || !postId) return;
    const before = { mine, counts, total };

    const removing = mine === type;
    const nextMine = removing ? null : type;
    const nextCounts: ReactionCounts = { ...counts };
    if (mine) nextCounts[mine] = Math.max((nextCounts[mine] || 1) - 1, 0);
    if (!removing) nextCounts[type] = (nextCounts[type] || 0) + 1;
    const nextTotal = total + (removing ? -1 : mine ? 0 : 1);

    setMine(nextMine);
    setCounts(nextCounts);
    setTotal(Math.max(nextTotal, 0));
    if (!removing) bump();
    onChanged?.({ counts: nextCounts, total: Math.max(nextTotal, 0), myReaction: nextMine });

    try {
      const { data } = await api.post(`/apis/engagement/posts/${postId}/react`, {
        userId, type,
      });
      const summary = data?.data || data;
      if (summary && typeof summary.total === 'number') {
        setCounts(summary.counts || {});
        setTotal(summary.total);
        setMine((summary.myReaction as ReactionType) ?? null);
        onChanged?.({
          counts: summary.counts || {},
          total: summary.total,
          myReaction: (summary.myReaction as ReactionType) ?? null,
        });
      }
    } catch (e) {
      setMine(before.mine);
      setCounts(before.counts);
      setTotal(before.total);
      onChanged?.({ counts: before.counts, total: before.total, myReaction: before.mine });
    }
  }, [userId, postId, mine, counts, total, bump, onChanged]);

  const active = reactionMeta(mine);

  return (
    <>
      <ReactionSummary counts={counts} total={total} myReaction={mine} onPressComments={onComment} />

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.action}
          onPress={() => send(mine || 'like')}
          onLongPress={(e) => setPicker(e.nativeEvent.pageY)}
          delayLongPress={220}
          activeOpacity={0.6}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            {active ? (
              <Text style={styles.actionEmoji}>{active.emoji}</Text>
            ) : (
              <Ionicons name="thumbs-up-outline" size={19} color={FB.textSecondary} />
            )}
          </Animated.View>
          <Text style={[styles.actionText, active && { color: active.color, fontWeight: '700' }]}>
            {active ? active.label : 'Like'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={onComment} activeOpacity={0.6}>
          <Ionicons name="chatbubble-outline" size={18} color={FB.textSecondary} />
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={onShare} activeOpacity={0.6}>
          <Ionicons name="arrow-redo-outline" size={19} color={FB.textSecondary} />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>

      {picker !== null && (
        <PickerRow
          anchorY={picker}
          onDismiss={() => setPicker(null)}
          onPick={(r) => { setPicker(null); send(r); }}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  pickerBackdrop: { flex: 1, backgroundColor: 'transparent' },
  pickerRow: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: FB.surface,
    borderRadius: FB.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 7,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  pickerFace: { paddingHorizontal: 5 },
  pickerEmoji: { fontSize: 34 },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: FB.card.padding,
    paddingTop: 10,
    paddingBottom: 8,
  },
  summaryLeft: { flexDirection: 'row', alignItems: 'center' },
  summaryRight: { flexDirection: 'row', alignItems: 'center' },
  summaryFace: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: FB.surface,
  },
  summaryEmoji: { fontSize: 15 },
  summaryText: { ...FB.font.meta, marginLeft: 6 },

  actionBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: FB.divider,
    marginHorizontal: FB.card.padding,
    paddingVertical: 2,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: FB.radius.sm,
  },
  actionEmoji: { fontSize: 19 },
  actionText: { ...FB.font.action },
});

export default ActionBar;
