import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

const ResumeModal = ({ visible, onClose, onSave, currentFileName } : any) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Resume</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.modalBody}>
            <Text style={styles.uploadText}>Upload your most recent resume.</Text>
            <View style={styles.fileRow}>
              <View style={styles.fileIconBox}>
                <Text style={styles.fileIconText}>📄</Text>
              </View>
              <Text style={styles.fileNameText} numberOfLines={1}>
                {currentFileName || "Resume.pdf"}
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => onSave(null)}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.saveBtn, !currentFileName && styles.disabledBtn]} 
                onPress={() => onSave(currentFileName)}
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ResumeModal

const styles = StyleSheet.create({
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '90%', backgroundColor: 'white', borderRadius: 8, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  fileRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f4ff', padding: 10, borderRadius: 5, marginTop: 15 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', padding: 15, borderTopWidth: 1, borderColor: '#eee' },
  deleteBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5, borderWidth: 1, borderColor: '#ccc', marginRight: 10 },
  saveBtn: { paddingHorizontal: 25, paddingVertical: 10, borderRadius: 5, backgroundColor: '#0066FF' },
  saveBtnText: { color: 'white', fontWeight: 'bold' },
  
  // Card Styles
  cardContainer: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 20 },
  resumePreviewBox: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, overflow: 'hidden', width: 220 },
  previewTop: { height: 60, backgroundColor: '#e8eaff', justifyContent: 'center', alignItems: 'center' },
  previewBottom: { padding: 10 },
  previewActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  viewBtn: { borderWidth: 1, borderColor: '#333', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4 },
  viewText: { fontSize: 12, fontWeight: '600' }
});