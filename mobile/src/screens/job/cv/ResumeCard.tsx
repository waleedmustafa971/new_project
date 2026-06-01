import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

const ResumeCard = ({ fileName, onEditPress }: any) => {
  return (
    <View style={styles.cardContainer}>
      {/* Small Header within the card to match your screenshot */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Resume</Text>
        <TouchableOpacity onPress={onEditPress} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={styles.editText}>✎ Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.resumePreviewBox}>
        {/* Top Graphic Area */}
        <View style={styles.previewTop}>
          <View style={styles.iconCircle}>
             <Text style={styles.previewIconText}>PDF</Text>
          </View>
        </View>

        {/* Bottom Info Area */}
        <View style={styles.previewBottom}>
          <Text style={styles.fileLabel}>Resume</Text>
          
          <View style={styles.previewActionRow}>
            <View style={styles.fileNameContainer}>
               <Text style={styles.fileIconMini}>📄</Text>
               <Text style={styles.fileNameSmall} numberOfLines={1}>
                 {fileName || "Not uploaded"}
               </Text>
            </View>
            
            <TouchableOpacity style={styles.viewBtn} activeOpacity={0.7}>
              <Text style={styles.viewText}>View</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

export default ResumeCard;

const styles = StyleSheet.create({
  cardContainer: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 20,
    // Modern Shadow
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  editText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 12
  },
  resumePreviewBox: { 
    borderWidth: 1, 
    borderColor: '#E1E4E8', 
    borderRadius: 12, 
    overflow: 'hidden', 
    width: '100%', // Changed to 100% for better responsiveness
    maxWidth: 280, 
    backgroundColor: '#F8FAFF',
  },
  previewTop: { 
    height: 80, 
    backgroundColor: '#E8EFFF', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0D7DE',
  },
  previewIconText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
  },
  previewBottom: { 
    padding: 12, 
  },
  fileLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 4,
  },
  previewActionRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  fileNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  fileIconMini: {
    fontSize: 14,
    marginRight: 6,
  },
  fileNameSmall: { 
    fontSize: 12, 
    color: '#666', 
    flex: 1 
  },
  viewBtn: { 
    backgroundColor: '#fff',
    borderWidth: 1.5, 
    borderColor: '#1A1C1E', 
    paddingHorizontal: 16, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  viewText: { 
    fontSize: 13, 
    fontWeight: '700',
    color: '#1A1C1E'
  },
});