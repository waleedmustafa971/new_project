import React, { useState } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    Text,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

type City = {
  id: string;
  name: string;
};

type Props = {
    onClose: () => void;
    cities: City[];
};

type RootStackParamList = {
  HomeSocial: undefined;
  HomeWhatsapp: undefined;
  HomeScreen: undefined;
  TestSound: undefined;
  FilterClassified: undefined;
  SeeAllProduct: { 
    category: string; 
    subcategories: any[]; 
    age: string | null; 
    condition: string | null; 
    usage: string | null; 
    minPrice: string; 
    maxPrice: string; 
    title: string; 
    city: string; 
  }
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FilterModalDashboard: React.FC<Props> = ({ onClose, cities }) => {
    const [city, setCity] = useState('');
    const [title, setTitle] = useState('');
    const [priceFrom, setPriceFrom] = useState('0');
    const [priceTo, setPriceTo] = useState('20000');

    const AGE_OPTIONS = [
        "Brand New",
        "1–2 Months",
        "1–6 Months",
        "6–12 Months",
        "1–2 Years",
        "2–5 Years",
        "5–10 Years",
        "10+ Years",
    ];
    const USAGE_OPTIONS = [
        "Never Used",
        "Used Once",
        "Light Usage",
        "Normal Usage",
        "Heavy Usage"
    ];
    const CONDITIONS_OPTIONS = [
        "Flawless", "Excellent", "Good", "Average", "Poor"
    ];

    const [selectedAge, setSelectedAge] = useState<string | null>(null);
    const [selectedUsage, setSelectedUsage] = useState<string | null>(null);
    const [selectedCondition, setSelectedCondition] = useState<string | null>(null);

    const navigation = useNavigation<NavigationProp>();

    return (
        <KeyboardAvoidingView
            style={styles.overlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <SafeAreaView style={styles.container}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Filter</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Icon name="close" size={24} />
                    </TouchableOpacity>
                </View>

                {/* City Search */}
                <View style={styles.section}>
                    <Text style={styles.label}>City</Text>
                    <View style={styles.inputBox}>
                        <Icon name="map-marker-outline" size={20} color="#777" />
                        <TextInput
                            placeholder="Search city"
                            value={city}
                            onChangeText={setCity}
                            style={styles.input}
                            placeholderTextColor="#000"
                        />
                    </View>
                </View>

                {/* Title Search */}
                <View style={styles.section}>
                    <Text style={styles.label}>Keyword Search by title</Text>
                    <View style={styles.inputBox}>
                        <Icon name="magnify" size={20} color="#777" />
                        <TextInput
                            placeholder="Search Title"
                            value={title}
                            onChangeText={setTitle}
                            style={styles.input}
                            placeholderTextColor="#000"
                        />
                    </View>
                </View>

                {/* Price Filter */}
                <View style={styles.section}>
                    <Text style={styles.label}>Price Range</Text>
                    <View style={styles.priceRow}>
                        <TextInput
                            placeholder="From"
                            keyboardType="numeric"
                            value={priceFrom}
                            onChangeText={setPriceFrom}
                            style={styles.priceInput}
                            placeholderTextColor="#000"
                        />
                        <Text style={styles.toText}>—</Text>
                        <TextInput
                            placeholder="To"
                            keyboardType="numeric"
                            value={priceTo}
                            onChangeText={setPriceTo}
                            style={styles.priceInput}
                            placeholderTextColor="#000"
                        />
                    </View>
                </View>

                {/* Age */}
                <View style={styles.section}>
                    <Text style={styles.label}>Age</Text>
                    <View style={styles.optionsContainer}>
                        {AGE_OPTIONS.map((item) => {
                            const isSelected = selectedAge === item;
                            return (
                                <TouchableOpacity
                                    key={item}
                                    onPress={() => setSelectedAge(item)}
                                    style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                                >
                                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{item}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Usage */}
                <View style={styles.section}>
                    <Text style={styles.label}>Usage</Text>
                    <View style={styles.optionsContainer}>
                        {USAGE_OPTIONS.map((item) => {
                            const isSelected = selectedUsage === item;
                            return (
                                <TouchableOpacity
                                    key={item}
                                    onPress={() => setSelectedUsage(item)}
                                    style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                                >
                                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{item}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Condition */}
                <View style={styles.section}>
                    <Text style={styles.label}>Condition</Text>
                    <View style={styles.optionsContainer}>
                        {CONDITIONS_OPTIONS.map((item) => {
                            const isSelected = selectedCondition === item;
                            return (
                                <TouchableOpacity
                                    key={item}
                                    onPress={() => setSelectedCondition(item)}
                                    style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                                >
                                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{item}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Apply Button */}
                <TouchableOpacity
                    style={styles.applyBtn}
                    onPress={() => {
                        navigation.navigate("SeeAllProduct", {
                            category: "",
                            subcategories: [],
                            age: selectedAge,
                            condition: selectedCondition,
                            usage: selectedUsage,
                            minPrice: priceFrom,
                            maxPrice: priceTo,
                            title,
                            city
                        });
                        onClose();
                    }}
                >
                    <Text style={styles.applyText}>Apply Filters</Text>
                </TouchableOpacity>

            </SafeAreaView>
        </KeyboardAvoidingView>
    );
};

export default FilterModalDashboard;

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#fff' },
    container: { flex: 1, padding: 16, borderTopWidth: 2, borderTopColor: '#f2f2f2' },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderColor: '#eee' },
    headerTitle: { fontSize: 16, fontWeight: '600' },

    section: { marginTop: 20 },
    label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },

    inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f4f4', borderRadius: 10, paddingHorizontal: 12 },
    input: { flex: 1, height: 45, marginLeft: 8, fontSize: 14, color: '#000' },

    priceRow: { flexDirection: 'row', alignItems: 'center' },
    priceInput: { flex: 1, height: 45, backgroundColor: '#f4f4f4', borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
    toText: { marginHorizontal: 10, fontSize: 14, color: '#777' },

    optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
    optionItem: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f2f2f2', borderWidth: 1, borderColor: '#e0e0e0', marginRight: 8, marginBottom: 8 },
    optionItemSelected: { backgroundColor: '#000', borderColor: '#000' },
    optionText: { fontSize: 13, color: '#333' },
    optionTextSelected: { color: '#fff', fontWeight: '600' },

    applyBtn: { marginTop: 'auto', backgroundColor: '#000', height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    applyText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
