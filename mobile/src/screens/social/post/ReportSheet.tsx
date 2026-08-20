import React, { useEffect, useState } from "react";
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Switch,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../component/api";

/*
  Reporting, from anywhere.

  The post overflow menu listed "Report", "Hide Post" and "Unfollow" as three
  plain <Text> elements — not even wrapped in a touchable — so the app appeared
  to offer moderation and did nothing at all. The server side has been complete
  for a while: reasons come from GET /apis/safety/report-reasons and a report
  goes to POST /apis/safety/report, which files it into the admin moderation
  queue.

  It is a sheet rather than a screen so it can be raised over a post, a profile
  or a comment without any of them needing to navigate away, and `targetType`
  covers all of those.
*/

type Props = {
  visible: boolean;
  onClose: () => void;
  targetType: "post" | "reel" | "story" | "comment" | "user";
  targetId: string;
  targetName?: string;
};

type Reason = { id: string; label: string };

const ReportSheet = ({ visible, onClose, targetType, targetId, targetName }: Props) => {
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [loading, setLoading] = useState(true);
  const [chosen, setChosen] = useState<string | null>(null);
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    // Reset per opening, so a second report does not inherit the first choice.
    setChosen(null); setDone(false); setError(null); setAlsoBlock(false);

    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/apis/safety/report-reasons");
        setReasons(res.data?.reasons || []);
      } catch {
        // A fixed fallback beats an empty sheet if the list cannot be fetched.
        setReasons([
          { id: "spam", label: "Spam or misleading" },
          { id: "harassment", label: "Bullying or harassment" },
          { id: "hate", label: "Hate speech or symbols" },
          { id: "violence", label: "Violence or dangerous acts" },
          { id: "other", label: "Something else" },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const submit = async () => {
    if (!chosen || sending) return;
    try {
      setSending(true);
      setError(null);
      const raw = await AsyncStorage.getItem("userdata");
      const userId = raw ? JSON.parse(raw)?._id : null;

      await api.post("/apis/safety/report", {
        userId,
        targetType,
        targetId,
        reason: chosen,
        block: alsoBlock,
      });
      setDone(true);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not send that report. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />

        {done ? (
          /* A confirmation that says what happens next, rather than a bare
             "Submitted" that leaves people wondering if anything will. */
          <View style={styles.doneBox}>
            <Ionicons name="checkmark-circle" size={52} color="#16A34A" />
            <Text style={styles.doneTitle}>Thanks for letting us know</Text>
            <Text style={styles.doneHint}>
              Our moderators will review this. We won't tell
              {targetName ? ` ${targetName}` : " them"} who reported it.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Report</Text>
            <Text style={styles.subtitle}>
              Why are you reporting this{targetType === "user" ? " account" : ""}?
            </Text>

            {loading ? (
              <ActivityIndicator style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {reasons.map((r) => {
                  const active = chosen === r.id;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={styles.row}
                      onPress={() => setChosen(r.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.rowText, active && styles.rowTextActive]}>
                        {r.label}
                      </Text>
                      <Ionicons
                        name={active ? "radio-button-on" : "radio-button-off"}
                        size={20}
                        color={active ? "#2563EB" : "#C7CBD1"}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {targetType === "user" && (
              <View style={styles.blockRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.blockTitle}>Also block this account</Text>
                  <Text style={styles.blockHint}>
                    They won't be able to find or message you.
                  </Text>
                </View>
                <Switch value={alsoBlock} onValueChange={setAlsoBlock} />
              </View>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryBtn, !chosen && styles.primaryBtnDisabled]}
              onPress={submit}
              disabled={!chosen || sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Submit report</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
};

export default ReportSheet;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DEE1E5",
    marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6B7280", marginTop: 4, marginBottom: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  rowText: { fontSize: 15, color: "#1F2937", flex: 1, paddingRight: 12 },
  rowTextActive: { fontWeight: "600", color: "#111827" },
  blockRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },
  blockTitle: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  blockHint: { fontSize: 12, color: "#8A8F98", marginTop: 2 },
  error: { color: "#B42318", fontSize: 13, marginTop: 12 },
  primaryBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  primaryBtnDisabled: { backgroundColor: "#C7D2FE" },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  cancelBtn: { height: 44, alignItems: "center", justifyContent: "center", marginTop: 4 },
  cancelText: { color: "#6B7280", fontSize: 15 },
  doneBox: { alignItems: "center", paddingVertical: 24 },
  doneTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginTop: 14 },
  doneHint: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
    paddingHorizontal: 10,
  },
});
