import React, { useCallback, useState } from "react";
import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import api from "../../../component/api";
import * as base from "../../../component/global";

/*
  Follow requests and blocked accounts.

  Both are the other half of controls that already exist: turning an account
  private queues incoming follows, and reporting someone offers to block them —
  and neither had anywhere to go afterwards. A private account you cannot let
  anyone into, and a block you cannot undo, are worse than not offering either.

  One screen serves both because they are the same thing on screen: a list of
  people with one or two actions each. `mode` picks the endpoints and the words;
  everything else is shared.
*/

type Mode = "requests" | "blocked";

const COPY = {
  requests: {
    title: "Follow requests",
    empty: "No pending requests",
    hint: "When someone asks to follow you, they'll appear here.",
    icon: "person-add-outline",
  },
  blocked: {
    title: "Blocked accounts",
    empty: "You haven't blocked anyone",
    hint: "Blocked accounts can't find your profile or message you.",
    icon: "ban-outline",
  },
} as const;

const avatarFor = (image?: string) => {
  if (!image) return require("../../../assets/user.png");
  const p = String(image);
  const uri = /^(https?:|file:|data:)/.test(p)
    ? p
    : `${base.BASE_URL}/${p.replace(/^\/+/, "")}`;
  return { uri };
};

const PeopleListScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mode: Mode = route.params?.mode === "blocked" ? "blocked" : "requests";
  const copy = COPY[mode];

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("userdata");
      const id = raw ? JSON.parse(raw)?._id : null;
      setUserId(id);
      if (!id) return;

      const path =
        mode === "requests"
          ? "/apis/privacy/follow-requests"
          : "/apis/safety/blocked";
      const res = await api.get(path, { params: { userId: id } });
      setRows(res.data?.rows || []);
    } catch {
      Toast.show({ type: "error", text1: `Could not load ${copy.title.toLowerCase()}` });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode, copy.title]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  /* The row leaves the list straight away. These are all confirmations of
     something the person just chose, so waiting on the network before showing
     it happened reads as the tap not registering. */
  const act = async (person: any, action: "accept" | "reject" | "unblock") => {
    if (busy) return;
    const id = String(person._id);
    setBusy(id);
    const before = rows;
    setRows((prev) => prev.filter((r) => String(r._id) !== id));

    try {
      if (action === "unblock") {
        await api.post("/apis/safety/unblock", { userId, targetId: id });
        Toast.show({ type: "success", text1: `Unblocked ${person.name || ""}`.trim() });
      } else {
        await api.post("/apis/privacy/follow-requests/respond", {
          userId,
          requesterId: id,
          action,
        });
        Toast.show({
          type: "success",
          text1: action === "accept" ? "Request accepted" : "Request declined",
        });
      }
    } catch (e: any) {
      setRows(before);
      Toast.show({
        type: "error",
        text1: e?.response?.data?.message || "That didn't work",
      });
    } finally {
      setBusy(null);
    }
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.row}>
      <Image source={avatarFor(item.image)} style={styles.avatar} />
      <View style={styles.who}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{item.name || "Unknown"}</Text>
          {item.verifiedBadge ? (
            <Ionicons name="checkmark-circle" size={14} color="#2563EB" />
          ) : null}
        </View>
        {item.bio ? (
          <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>
        ) : null}
      </View>

      {mode === "requests" ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => act(item, "accept")}
            disabled={!!busy}
          >
            <Text style={styles.primaryBtnText}>Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => act(item, "reject")}
            disabled={!!busy}
          >
            <Text style={styles.ghostBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => act(item, "unblock")}
          disabled={!!busy}
        >
          <Text style={styles.ghostBtnText}>Unblock</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{copy.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderItem}
          contentContainerStyle={rows.length ? undefined : { flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name={copy.icon} size={46} color="#C7CBD1" />
              <Text style={styles.emptyTitle}>{copy.empty}</Text>
              <Text style={styles.emptyHint}>{copy.hint}</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default PeopleListScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F2",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyTitle: { marginTop: 14, fontSize: 15, fontWeight: "600", color: "#3C4048" },
  emptyHint: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#8A8F98",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#E9EBEE" },
  who: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { fontSize: 14.5, fontWeight: "600", color: "#111827", flexShrink: 1 },
  bio: { fontSize: 12.5, color: "#8A8F98", marginTop: 2 },
  actions: { flexDirection: "row", gap: 8 },
  primaryBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  ghostBtn: {
    backgroundColor: "#F1F3F5",
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostBtnText: { color: "#374151", fontSize: 13, fontWeight: "600" },
});
