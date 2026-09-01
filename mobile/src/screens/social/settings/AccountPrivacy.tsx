import React, { useCallback, useState } from "react";
import { FB } from "../../../theme/social";
import {
  View, Text, ScrollView, Switch, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import api from "../../../component/api";

/*
  Account privacy.

  The only privacy screen in the app was a WhatsApp-shaped list of nineteen rows
  with no handlers, no state and no requests — it belonged to the messenger and
  did nothing anywhere. Meanwhile the social backend has carried a full privacy
  model for a while: a public/private/custom mode, eleven separately addressable
  areas, follow requests that queue while an account is private, and close
  friends. None of it was reachable.

  This screen is the front for GET/POST /apis/privacy/settings. The private
  toggle flips `privacy`; touching any single area moves the account to "custom"
  automatically, because that is what a per-area choice means — the server keeps
  the custom map either way, so switching back to public and returning later
  finds the same answers.
*/

const AUDIENCE_LABEL: Record<string, string> = {
  everyone: "Everyone",
  followers: "Followers",
  closeFriends: "Close friends",
  nobody: "No one",
};

/* Plain-language names; the API's keys are not what anyone would call these. */
const AREA_LABEL: Record<string, string> = {
  posts: "Your posts",
  stories: "Your stories",
  reels: "Your reels",
  followersList: "Your followers list",
  profilePhoto: "Profile photo",
  bio: "Bio",
  onlineStatus: "Online status",
  messages: "Who can message you",
  comments: "Who can comment",
  tagging: "Who can tag you",
  mentions: "Who can mention you",
};

const AccountPrivacy = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [privacy, setPrivacy] = useState<"public" | "private" | "custom">("public");
  const [effective, setEffective] = useState<Record<string, any>>({});
  const [areas, setAreas] = useState<string[]>([]);
  const [audiences, setAudiences] = useState<string[]>([]);
  const [pending, setPending] = useState(0);
  const [closeFriends, setCloseFriends] = useState(0);
  const [picker, setPicker] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("userdata");
      const id = raw ? JSON.parse(raw)?._id : null;
      setUserId(id);
      if (!id) return;

      const res = await api.get("/apis/privacy/settings", { params: { userId: id } });
      const d = res.data || {};
      setPrivacy(d.privacy || "public");
      setEffective(d.effective || {});
      setAreas(d.options?.areas || []);
      setAudiences(d.options?.audiences || []);
      setPending(d.pendingFollowRequests || 0);
      setCloseFriends(d.closeFriendsCount || 0);
    } catch {
      Toast.show({ type: "error", text1: "Could not load your privacy settings" });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  /* Optimistic, then reconciled with whatever the server says is in force —
     flipping to private changes eleven derived values at once, and guessing
     them on the client would drift from the server's own rules. */
  const save = async (body: any, optimistic: () => void, revert: () => void) => {
    optimistic();
    setSaving(true);
    try {
      const res = await api.post("/apis/privacy/settings", { userId, ...body });
      const d = res.data || {};
      if (d.privacy) setPrivacy(d.privacy);
      if (d.effective) setEffective(d.effective);
    } catch (e: any) {
      revert();
      Toast.show({
        type: "error",
        text1: e?.response?.data?.message || "Could not save that",
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePrivate = (next: boolean) => {
    const before = privacy;
    save(
      { privacy: next ? "private" : "public" },
      () => setPrivacy(next ? "private" : "public"),
      () => setPrivacy(before)
    );
  };

  const setArea = (area: string, audience: string) => {
    const before = effective[area];
    setPicker(null);
    save(
      { settings: { [area]: audience } },
      () => setEffective((p) => ({ ...p, [area]: audience })),
      () => setEffective((p) => ({ ...p, [area]: before }))
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const isPrivate = privacy === "private";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account privacy</Text>
        <View style={{ width: 24 }}>
          {saving ? <ActivityIndicator size="small" color="#2563EB" /> : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* The headline control */}
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.switchTitle}>Private account</Text>
              <Text style={styles.switchHint}>
                {isPrivate
                  ? "Only your followers can see what you post. New followers have to ask first."
                  : "Anyone can see your posts, stories and reels, and follow you without asking."}
              </Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={togglePrivate}
              trackColor={{ true: "#2563EB", false: "#D1D5DB" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Things a private account creates, so they are not hidden away */}
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate("PeopleList", { mode: "requests" })}
        >
          <Ionicons name="person-add-outline" size={20} color="#374151" />
          <Text style={styles.linkText}>Follow requests</Text>
          {pending > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pending}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color="#C7CBD1" />
        </TouchableOpacity>

        {/* Close friends has a working API but no screen yet, so it is not
            linked — a row that navigates nowhere is worse than no row. */}

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate("PeopleList", { mode: "blocked" })}
        >
          <Ionicons name="ban-outline" size={20} color="#374151" />
          <Text style={styles.linkText}>Blocked accounts</Text>
          <Ionicons name="chevron-forward" size={18} color="#C7CBD1" />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>WHO CAN SEE AND DO WHAT</Text>
        <Text style={styles.sectionHint}>
          Changing any of these switches your account to custom, so these choices
          are what apply rather than the private preset.
        </Text>

        {areas.map((area) => (
          <TouchableOpacity
            key={area}
            style={styles.linkRow}
            onPress={() => setPicker(area)}
          >
            <Text style={[styles.linkText, { marginLeft: 0 }]}>
              {AREA_LABEL[area] || area}
            </Text>
            <Text style={styles.linkMeta}>
              {AUDIENCE_LABEL[effective[area]] || effective[area] || "—"}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#C7CBD1" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Audience picker */}
      <Modal
        visible={!!picker}
        transparent
        animationType="fade"
        onRequestClose={() => setPicker(null)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setPicker(null)}
        />
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>
            {picker ? AREA_LABEL[picker] || picker : ""}
          </Text>
          {audiences.map((a) => {
            const active = picker ? effective[picker] === a : false;
            return (
              <TouchableOpacity
                key={a}
                style={styles.pickerRow}
                onPress={() => picker && setArea(picker, a)}
              >
                <Text style={[styles.pickerText, active && styles.pickerTextActive]}>
                  {AUDIENCE_LABEL[a] || a}
                </Text>
                {active && <Ionicons name="checkmark" size={20} color="#2563EB" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </View>
  );
};

export default AccountPrivacy;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FB.page },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: FB.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: FB.surface,
    borderBottomWidth: 1,
    borderBottomColor: FB.hairline,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: FB.text },
  card: {
    backgroundColor: FB.surface,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: FB.hairline,
  },
  switchRow: { flexDirection: "row", alignItems: "center" },
  switchTitle: { fontSize: 15, fontWeight: "600", color: FB.text },
  switchHint: { fontSize: 12.5, color: FB.textSecondary, marginTop: 5, lineHeight: 18 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: FB.surface,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: FB.hairline,
  },
  linkText: { flex: 1, fontSize: 14.5, color: FB.text },
  linkMeta: { fontSize: 13.5, color: FB.textTertiary },
  badge: {
    backgroundColor: FB.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: FB.textTertiary,
    marginTop: 26,
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  sectionHint: {
    fontSize: 12,
    color: "#9AA0A6",
    lineHeight: 17,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  pickerSheet: {
    backgroundColor: FB.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 30,
  },
  pickerTitle: { fontSize: 16, fontWeight: "700", color: FB.text, marginBottom: 8 },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: FB.hairline,
  },
  pickerText: { fontSize: 15, color: FB.text },
  pickerTextActive: { fontWeight: "600", color: FB.text },
});
