import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');
interface Props {
  visible: boolean;
  data: any;
  onClose: () => void;
}
const AdInsightsModal: React.FC<Props> = ({ visible, onClose, data }) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Ad Insights</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Product Header */}
            <View style={styles.productSection}>
              <View style={styles.productImagePlaceholder}>
                <Icon name="laptop" size={40} color="#ccc" />
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{data?.shortTitle}</Text>
                <Text style={styles.productPrice}>{data?.price}</Text>
                <View style={styles.liveBadge}>
                  <Text style={styles.liveText}>{data?.status}</Text>
                </View>
              </View>
            </View>

            {/* Pricing Insights Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pricing Insights</Text>
              <Text style={styles.cardSub}>Compare your asking price</Text>
              
              <View style={styles.priceScaleContainer}>
                <View style={styles.fairPriceCallout}>
                   <Text style={styles.fairPriceText}>Fair Price AED 1500</Text>
                </View>
                <View style={styles.scaleBar}>
                   <View style={[styles.activeRange, { left: '20%', width: '60%' }]} />
                   <View style={[styles.pointer, { left: '40%' }]} />
                </View>
                <View style={styles.scaleLabels}>
                  <Text style={styles.scaleLabel}>AED 1000</Text>
                  <Text style={styles.scaleLabel}>AED 2850</Text>
                </View>
              </View>
            </View>

            {/* Ad Completion Card */}
           {/*  <View style={styles.card}>
               <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>Ad Completion</Text>
                  <Text style={styles.completionPercent}>59%</Text>
               </View>
               <View style={styles.fullProgressBar}>
                  <View style={[styles.progressFill, { width: '59%' }]} />
               </View>
               
               
               <View style={styles.tipRow}>
                  <Icon name="alert-circle-outline" size={16} color="red" />
                  <Text style={styles.tipText}>Add at least 3 images</Text>
               </View>
            </View> */}

            {/* Performance Stats */}
            <View style={styles.statsGrid}>
               <StatBox label="Impressions" value="89" icon="eye-outline" />
               <StatBox label="Ad Views" value={data?.viewsCount} icon="cursor-default-click-outline" />
            </View>
             <View style={styles.statsGrid}>
               <StatBox label="Phone Calls" value="6" icon="cursor-default-click-outline" />
               <StatBox label="Whatsapps" value="6" icon="cursor-default-click-outline" />
            </View>
          </ScrollView>

          {/* Bottom Action */}
        {/*   <TouchableOpacity style={styles.boostButton}>
             <Icon name="lightning-bolt" size={20} color="#fff" />
             <Text style={styles.boostText}>Boost This Listing</Text>
          </TouchableOpacity> */}
        </View>
      </View>
    </Modal>
  );
};

const StatBox = ({ label, value, icon } : any) => (
  <View style={styles.statBox}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    <Icon name={icon} size={20} color="#ccc" style={styles.statIcon} />
  </View>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 15 },
  container: { backgroundColor: '#fff', borderRadius: 12, padding: 20, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  
  productSection: { flexDirection: 'row', marginBottom: 20 },
  productImagePlaceholder: { width: 80, height: 80, backgroundColor: '#f5f5f5', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  productInfo: { marginLeft: 15, flex: 1 },
  productName: { fontSize: 16, fontWeight: '600', color: '#333' },
  productPrice: { fontSize: 18, fontWeight: 'bold', marginVertical: 4 },
  liveBadge: { backgroundColor: '#28a745', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start' },
  liveText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 15, marginBottom: 15 },
  cardTitle: { fontSize: 15, fontWeight: 'bold' },
  cardSub: { fontSize: 12, color: '#777', marginBottom: 10 },
  
  priceScaleContainer: { marginTop: 20, alignItems: 'center' },
  scaleBar: { height: 6, backgroundColor: '#eee', width: '100%', borderRadius: 3, position: 'relative' },
  activeRange: { position: 'absolute', height: 6, backgroundColor: '#3b82f6', borderRadius: 3 },
  pointer: { position: 'absolute', top: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', borderWidth: 3, borderColor: '#3b82f6' },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  scaleLabel: { fontSize: 11, color: '#999' },
  fairPriceCallout: { backgroundColor: '#eef2ff', padding: 5, borderRadius: 4, marginBottom: 10 },
  fairPriceText: { color: '#3b82f6', fontSize: 12, fontWeight: '600' },

  fullProgressBar: { height: 8, backgroundColor: '#eee', borderRadius: 4, marginVertical: 10 },
  progressFill: { height: 8, backgroundColor: '#3b82f6', borderRadius: 4 },
  tipRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  tipText: { marginLeft: 8, fontSize: 12, color: '#555' },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 8
   },
  statBox: { width: '48%', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 15 },
  statValue: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#777' },
  statIcon: { position: 'absolute', right: 10, top: 10 },

  boostButton: { backgroundColor: 'red', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 8, marginTop: 10 },
  boostText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 }
});

export default AdInsightsModal;