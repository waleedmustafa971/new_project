import React, { useEffect, useState } from 'react';
import {
    View,
    Text, StyleSheet, TouchableOpacity, FlatList,
    TextInput,
    ActivityIndicator,
    Dimensions,
    Modal,
    ScrollView, Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import api from '../../component/api';
const { height } = Dimensions.get('window');
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import GooglePay from './GooglePay'; // this also added in classified

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const FONT_SIZE = isTablet ? 14 : 12;

type Promo = {
    _id: string;
    promo_code: string;
    message: string;
    discount: number;
};
// 🧭 STEP 1: Define your navigation param list
type RootStackParamList = {
    CardPayment: {
        id: string,
        type: string
    };
    SuccessScreen: { id : string}
};

// 🧭 STEP 2: Define navigation and route prop types
type CardpaymentNavigationProp = NativeStackNavigationProp<
    RootStackParamList,
    'CardPayment'
>;

type ClassifiedDetailsRouteProp = RouteProp<
    RootStackParamList,
    'CardPayment'
>;
const PaymentScreenClassified: React.FC = () => {
    // const navigation = useNavigation();
    const navigation = useNavigation<CardpaymentNavigationProp>();

    const route = useRoute<any>();

    const { id, type, userid } = route.params;
    console.log(JSON.stringify(route.params))
    const [packages, setPackages] = useState<any[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [selectedPackage, setSelectedPackage] = useState<any>(null);

    const [discountCode, setDiscountCode] = useState('');
    const [discountApplied, setDiscountApplied] = useState(false);
    const [paymentModal, setPaymentModal] = useState(false);
    const [googlepaymodal, setGooglepaymodal] = useState(false);
    const [discountOfferPrice, setDiscountOfferPrice] = useState(0);
    const paymentMethods = [
        { id: 'googlepay', label: 'Google Pay', icon: 'logo-google' },
        //  { id: 'visa', label: 'Visa', icon: 'card-outline' },
    ];
    const [offers, setOffers] = useState<Promo[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
    const [paymentDone, setPaymentDone] = useState(false);

    const [formData, setFormData] = useState({
        shortTitle: '',
        price: 0,
        currency: '',
    });
   

    const subtotal = selectedPackage?.price - selectedPackage?.discount || 0;
     console.log('....selected vvalue.....', subtotal);
    const discount = discountApplied ? subtotal * 0.2 : 0;
    const subtotalAfterDiscount = subtotal - discount;
    const vat = subtotalAfterDiscount * 0.05;
    const total = subtotalAfterDiscount + vat - discountOfferPrice;

    useEffect(() => {
        fetchPackages();
        fetchProperty();
    }, [selectedPackage]);

    const fetchPackages = async () => {
        try {
            const res = await api.get('apis/package/list');
            setPackages(res.data?.data || []);
        } catch {
            setPackages([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchProperty = async () => {
        if (!id) return;
        try {
            const res = await api.get(`/apis/property/property-details?id=${id}`);
            const property = res.data?.properties?.[0];
            if (property) {
                setFormData({
                    shortTitle: property.shortTitle,
                    price: property.price,
                    currency: property.currency,
                });
            }
        } catch { }
    };

    const applyDiscount = () => {
        setDiscountApplied(discountCode.toLowerCase() === 'save20');
    };

    const processPayment = async () => {
        if (!selectedPackage) return Alert.alert('Please select a package');
        if (!userid) return Alert.alert('User id not found ');
        if (total === 0) {
            /// Redirect to success message
        }
        else {
            try {
                await api.post(
                    `/apis/property/update-payment-package/${id}/package`,
                    {
                        userid: userid,
                        packageid: selected,
                        details: selectedPackage,
                    }
                );
                setPaymentModal(true)
                // navigation.navigate('CardPayment', { id: id, type });
            } catch (e) {
                console.log(e);
            }
        }
    };

    const fetchOffers = async () => {
        setModalOpen(true);
        try {
            const res = await api.get('apis/promo/list');
            console.log(' ...data... ', JSON.stringify(res.data?.data))
            setOffers(res.data?.data || []);
        } catch {
            setOffers([]);
        }
    };

    const selectOffer = (item: Promo) => {
        setDiscountCode(item.promo_code);
        setDiscountOfferPrice(item.discount);
        setModalOpen(false);
    };

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    const handlePaymentStatus = (value: boolean) => {
        setPaymentDone(value);

        console.log('Payment status changed:', value);

        if (value) {
         //   Alert.alert("Payment Receive Successfully ")
            setPaymentModal(false)
            setGooglepaymodal(false)
            navigation.navigate("SuccessScreen", {
                id: id
            })
        }
        else {
              Alert.alert("Failed to Receive Amount ")
        }
    };


    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-left" size={20} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Payment Details</Text>
                    <Text style={styles.subtitle}>{type}</Text>
                </View>
            </View>

            {/* Packages */}
            <Text style={styles.sectionTitle}>Select a Package</Text>
            {packages.map(pkg => (
                <TouchableOpacity
                    key={pkg._id}
                    style={[
                        styles.card,
                        selected === pkg._id && styles.cardSelected,
                    ]}
                    onPress={() => {
                        setSelected(pkg._id);
                        setSelectedPackage(pkg);
                    }}
                    /* i want when when it will select from here it will calculate price and discount and will get total */
                >
                    <Text style={styles.cardTitle}>{pkg.name}</Text>
                    <Text style={styles.text}>{pkg.description}</Text>
                 <View style={styles.priceWrapper}>
  {/* Discounted Price */}
  {pkg.discount > 0 && (
    <Text style={styles.finalPrice}>
      {pkg.currency} {pkg.price - pkg.discount}
    </Text>
  )}

  {/* Original Price */}
  <Text
    style={[
      styles.originalPrice,
      pkg.discount > 0 && styles.originalPriceDiscounted,
    ]}
  >
    {pkg.currency} {pkg.price}
  </Text>

  {/* Discount Badge */}
  {pkg.discount > 0 && (
    <View style={styles.discountBadge}>
      <Text style={styles.discountText}>
        -{pkg.discount}
      </Text>
    </View>
  )}
</View>

                </TouchableOpacity>
            ))}

            {/* Summary */}
            <View style={styles.summary}>
              {/*   <Text style={styles.bold}>{formData.shortTitle}</Text>

 */}
                <View style={styles.line} />

                <Text>Subtotal: {selectedPackage?.price - selectedPackage?.discount}</Text>

                <Text style={styles.total}>Total: {selectedPackage?.price - selectedPackage?.discount}</Text>

                <TouchableOpacity style={styles.payBtn} onPress={processPayment}>
                    <Text style={styles.payText}>Payment {total.toFixed(2)} </Text>
                </TouchableOpacity>
            </View>

            {/* Offer Modal */}
            <Modal visible={modalOpen} transparent animationType="slide">
                <View style={styles.modal}>
                    <View style={styles.modalContent}>
                        <Text style={styles.bold}>Select Offer</Text>
                        {offers.map(item => (
                            <TouchableOpacity
                                key={item._id}
                                style={styles.card}
                                onPress={() => selectOffer(item)}
                            >
                                <Text style={styles.cardTitle}>{item.promo_code}</Text>
                                <Text>{item.message}</Text>
                                <Text>{item.discount}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity onPress={() => setModalOpen(false)}>
                            <Text style={styles.link}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            {paymentModal && (
                <Modal
                    visible={paymentModal}
                    animationType="slide"
                    transparent
                    statusBarTranslucent
                >
                    <View style={styles.overlay}>
                        <View style={styles.bottomSheet}>

                            {/* Drag Indicator */}
                            <View style={styles.dragIndicator} />

                            {/* Header */}
                            <View style={styles.headerselectpaymentmethod}>
                                <Text style={styles.headerTitlepaymentmethod}>Select Payment Method</Text>
                                <TouchableOpacity
                                    style={styles.closeBtnpaymentmethod}
                                    onPress={() => setPaymentModal(false)}
                                >
                                    <Icon name="x" size={18} color="#000" />
                                </TouchableOpacity>
                            </View>

                            {/* Payment Methods */}
                            {paymentMethods.map(method => (
                                <TouchableOpacity
                                    key={method.id}
                                    activeOpacity={0.8}
                                    style={[
                                        styles.methodItem,
                                        selectedMethod === method.id && styles.selectedMethod,
                                    ]}
                                    onPress={() => {
                                        setSelectedMethod(method.id);
                                        setPaymentModal(false);
                                        setGooglepaymodal(true);
                                    }}
                                >
                                    <View style={styles.methodLeft}>
                                        {/*  <Icon
                                            name={method.icon}
                                            size={18}
                                            color={selectedMethod === method.id ? '#fff' : '#111'}
                                        /> */}
                                        <Text
                                            style={[
                                                styles.methodLabel,
                                                selectedMethod === method.id && { color: '#fff' },
                                            ]}
                                        >
                                            {method.label}
                                        </Text>
                                    </View>

                                    <Icon
                                        name="chevron-right"
                                        size={18}
                                        color={selectedMethod === method.id ? '#fff' : '#999'}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </Modal>
            )}

            {googlepaymodal && selectedMethod === 'googlepay' && (
                <Modal
                    visible={googlepaymodal}
                    animationType="slide"
                    transparent
                >
                    <View style={styles.overlay}>
                        <View style={styles.bottomSheet}>
                            {/* Header */}
                            <View style={styles.sheetHeader}>
                                <Text style={styles.sheetTitle}>Google Pay</Text>
                                <TouchableOpacity onPress={() => setGooglepaymodal(false)}>
                                    <Icon name="x" size={20} color="#000" />
                                </TouchableOpacity>
                            </View>

                            {/* Content */}
                            <GooglePay
                                priceAED={total} id={id}
                                packageid={selectedPackage._id}
                                onChangevalue={handlePaymentStatus}
                            />
                        </View>
                    </View>
                </Modal>
            )}


        </ScrollView>
    );
}
export default PaymentScreenClassified;

const styles = StyleSheet.create({
    container: { padding: 16, backgroundColor: '#fff' },
    loader: { flex: 1, justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    title: { fontSize: FONT_SIZE + 4, fontWeight: '700' },
    subtitle: { fontSize: FONT_SIZE },
    methodLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111',
    },

    sectionTitle: { marginVertical: 10, fontWeight: '700' },
    dragIndicator: {
        width: 40,
        height: 5,
        backgroundColor: '#ccc',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 10,
    },
    headerTitlepaymentmethod: {
        fontSize: 16,
        fontWeight: '700',
    },
    closeBtnpaymentmethod: {
        position: 'absolute',
        right: 0,
        padding: 6,
    },
    headerselectpaymentmethod: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    card: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
    },
    cardSelected: {
        borderColor: '#2563eb',
        backgroundColor: '#e0e7ff',
    },
    cardTitle: { fontWeight: '700', fontSize: FONT_SIZE + 1 },
    text: { fontSize: FONT_SIZE },
    bold: { fontWeight: '700', fontSize: FONT_SIZE },
    summary: { marginTop: 20 },
    row: { flexDirection: 'row', gap: 10, marginVertical: 10 },
    input: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        fontSize: FONT_SIZE,
    },
    btn: {
        backgroundColor: '#000',
        paddingHorizontal: 14,
        justifyContent: 'center',
        borderRadius: 8,
    },
    btnText: { color: '#fff' },
    link: { color: '#2563eb', marginVertical: 6 },
    line: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
    total: { fontWeight: '700', fontSize: FONT_SIZE + 2, marginVertical: 10 },
    payBtn: {
        backgroundColor: '#000',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    payText: { color: '#fff', fontWeight: '700' },
    modal: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', height: '100%',
        width: '100%'
    },
    modalContent: {
        backgroundColor: '#fff',
        margin: 20,
        borderRadius: 12,
        padding: 16,
    },

    methodItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 12,
        backgroundColor: '#fff',
    },
    selectedMethod: {
        backgroundColor: '#000',
        borderColor: '#000',
    },

    methodLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },


    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },

    bottomSheet: {
        height: height * 0.3, // 🔥 50% screen
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 16,
    },

    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },

    sheetTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
priceWrapper: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},

finalPrice: {
  fontSize: 20,
  fontWeight: '700',
  color: '#000',
},

originalPrice: {
  fontSize: 16,
  color: '#666',
},

originalPriceDiscounted: {
  color: '#d32f2f',
  textDecorationLine: 'line-through',
},

discountBadge: {
  backgroundColor: '#d32f2f',
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 6,
},

discountText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '600',
},

});
