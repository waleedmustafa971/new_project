import React, { useState } from 'react';
import {
    View,TextInput,TouchableOpacity,
    Text,StyleSheet,SafeAreaView,
    KeyboardAvoidingView,Platform,Dimensions} from 'react-native';
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
  MotorsSubcategory: { 
    category: string; 
    regional_specs?: string | null;
    makemodel: string;
    transmissiontypes: string | null; 
    fueltype: string | null; 
    subcategories: any[]; 
    age: string | null; 
    condition: string | null; 
    usage: string | null; 
    minPrice: string; 
    maxPrice: string; 
    yearFrom: string; 
    yearTo: string; 
    title: string; 
    city: string; 
  }
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FilterModalDashboard: React.FC<Props> = ({ onClose, cities }) => {
    const [city, setCity] = useState('');
    const [title, setTitle] = useState('');
    const [makeandmodel, setMakeandmodel] = useState('');
    const [priceFrom, setPriceFrom] = useState('0');
    const [priceTo, setPriceTo] = useState('20000');
    const [yearFrom, setYearFrom] = useState('2015');
    const [yearTo, setYearTo] = useState('2026');

    const regionalspecs_options = [
        "GCC","American","Canadian","European",
        "Japanese","Korean","Chinese","Other"
    ];
    /* Transmission Type */
    const transmission_options = [
        "Manual",
        "Automatic"
    ];
    const fueltype_options = [
        "Fuel Type", "Diesel", "Hybrid", "Electric", "Poor"
    ];

    const [selectedAge, setSelectedAge] = useState<string | null>(null);
    const [selectedTransmission, setSelectedTransmission] = useState<string | null>(null);
    const [selectedFueltype, setSelectedFueltype] = useState<string | null>(null);

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
                            placeholder=""
                            value={city}
                            onChangeText={setCity}
                            style={styles.input}
                            placeholderTextColor="#000"
                        />
                    </View>
                </View>

                {/* Title Search */}
                <View style={styles.section}>
                    <Text style={styles.label}>Make and Model</Text>
                    <View style={styles.inputBox}>
                        <Icon name="magnify" size={20} color="#777" />
                        <TextInput
                            placeholder=""
                            value={makeandmodel}
                            onChangeText={setMakeandmodel}
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

                <View style={styles.section}>
                    <Text style={styles.label}>Year</Text>
                    <View style={styles.priceRow}>
                        <TextInput
                            placeholder="From"
                            keyboardType="numeric"
                            value={yearFrom}
                            onChangeText={setYearFrom}
                            style={styles.priceInput}
                            placeholderTextColor="#000"
                        />
                        <Text style={styles.toText}>—</Text>
                        <TextInput
                            placeholder="To"
                            keyboardType="numeric"
                            value={yearTo}
                            onChangeText={setYearTo}
                            style={styles.priceInput}
                            placeholderTextColor="#000"
                        />
                    </View>
                </View>

                {/* Age */}
                <View style={styles.section}>
                    <Text style={styles.label}>Regional Specs</Text>
                    <View style={styles.optionsContainer}>
                        {regionalspecs_options.map((item) => {
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
                    <Text style={styles.label}>Transmission Type</Text>
                    <View style={styles.optionsContainer}>
                        {transmission_options.map((item) => {
                            const isSelected = selectedTransmission === item;
                            return (
                                <TouchableOpacity
                                    key={item}
                                    onPress={() => setSelectedTransmission(item)}
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
                    <Text style={styles.label}>Fuel Type</Text>
                    <View style={styles.optionsContainer}>
                        {fueltype_options.map((item) => {
                            const isSelected = selectedFueltype === item;
                            return (
                                <TouchableOpacity
                                    key={item}
                                    onPress={() => setSelectedFueltype(item)}
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
                        navigation.navigate("MotorsSubcategory", {
                            category: null,
                            subcategories: [],
                            makemodel: makeandmodel,
                            regional_specs: selectedAge, //Regional Specs
                            fueltype: selectedFueltype,
                            transmissiontypes: selectedTransmission,
                            minPrice: priceFrom,
                            maxPrice: priceTo,
                            yearFrom: yearFrom,
                            yearTo: yearTo,
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
