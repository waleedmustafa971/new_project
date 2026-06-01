import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    ScrollView,
    Button, StyleSheet
} from 'react-native';
import LocationInput from '../LocationInput';
import PriceRangeSelector from '../PriceRangeSelector';
import AreaSizeInput from '../AreaSizeInput';
import { Navigation } from 'lucide-react';
import { useNavigation, useRoute } from "@react-navigation/native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../../../component/api';
import Colors from '../../../constants/colors';

const MoreFilter = () => {
    const navigation = useNavigation();
    const route = useRoute()
    const { type } = route.params;
    const [selectedMenu, setSelectedMenu] = useState("Property for Rent");
    const [location, setLocation] = useState('');
    const [loading, setLoading] = useState(false);
    const [realestateAgencies, setRealestateAgencies] = useState('')
    const [price, setPrice] = useState({ min: 0, max: 100 });
    const [area, setArea] = useState({ min: 0, max: 100 });
    const [categories, setCategories] = useState([]);
    const [selectedSubcategory, setSelectedSubcategory] = useState(null);
    const menus = ['Property for Rent', 'Property for Sale', 'Off-plan Properties'];
    const [priceRange, setPriceRange] = useState({
        min: 0,
        max: 10000,
    });
    const [areaSize, setAreaSize] = useState({
        min: 0,
        max: 10000,
    });

    const bedrooms = ['Studio', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const bathrooms = ['1', '2', '3', '4', '5', '6', '7', '8'];
    const furnishingtype = ['All', 'Furnished', 'Unfurnished'];
    const rentispaid = ['Monthly', 'Quarterly', 'Yearly'];
    const saletype = ['All', 'Initial Sale', 'Resale', 'Direct from Developer'];
    const projectcomplection = ['Under 25%', '25 to 50%', '51 to 75%', 'Above 75%'];
    const prehandoverpayment = ['Under 25%', '25 to 50%', '51 to 75%', 'Above 75%'];
    const handover = ['2025', '2026', '2027', '2028', '2029', '2030 and above'];
    const projectstatus = ['Under Construction', 'Completed'];
    const amenitiestype = [
        'Maids Room',
        'Study',
        'Central A/C Heating',
        'Balcony',
        'Private Garden',
        'Private Pool',
        'Private Gym',
        'Private Jacuzzl',
        'Share Pool',
        'Share Spa',
        'Share Gym',
        'Security',
        'Concierge Service',
        'Maid Service',
        'Covered Parking',
        'Built in Wardrobes',
        'Walk in Closet',
        'Built in Kitchen Appliances',
        'View of Water',
        'View of Landmark',
        'Pets Allowed',
        'Double Giazed Windows',
        'Day Care Center',
        'Electricity Backup',
        'First Aid Medical Center',
        'Service Elevators',
        'Prayer Room',
        'Laundry Room',
        'Roadband Internet',
        'Satelite/Cable TV',
        'Business Center',
        'Intercom',
        'ATM Facility',
        'Kids Play Area',
        'Reception Waiting Room',
        'Maintenance Staff',
        'CCTV Security',
        'Cafeteria or Canteen',
        'Shared Kitchen',
        'Facilities for Disabled',
        'Storage Areas',
        'Cleaning Services',
        'Barbeque Area',
        'Lobby in Building',
        'Waste Disposal'
    ];
    const [selectedPropertyType, setSelectedPropertyType] = useState('');
    const [selectedResidentialCategory, setSelectedResidentialCategory] = useState('');
    const [selectedBedrooms, setSelectedBedrooms] = useState('');
    const [selectedBathrooms, setSelectedBathrooms] = useState('');
    const [selectedfurnishingtype, setSelectedfurnishingtype] = useState('');
    const [selectedrentispaid, setSelectedrentispaid] = useState('')
    const [selectedamenitiestype, setSelectedamenitiestype] = useState('')
    const [selectedsaletype, setSelectedsaletype] = useState('')
    const [selectedprojectcompletion, setSelectedprojectcompletion] = useState('')
    const [selectedprojectstatus, setSelectedprojectstatus] = useState('')
    const [subCategories, setSubCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);

    useEffect(() => {
        fetchCategory(type)
    }, [])

    const fetchCategory = async (property) => {
        setLoading(true);
        try {
            const res = await api.get("/apis/categories/list?type=Property"); // fetch all categories
            const selecttype = property; // this is your selected type from state
            // Filter categories based on selecttype
            const filteredCategories = res.data.filter(
                (category) => category.selecttype === selecttype
            );
            console.log("Filtered categories:", property, filteredCategories);
            setCategories(filteredCategories);
        } catch (e) {
            console.error("Fetch error:", e);
        } finally {
            setLoading(false);
        }
    };

    const renderHorizontalList = (data, selected, setSelected) => (
        <FlatList
            horizontal
            data={data}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
                const isSelected = selected === item;
                return (
                    <TouchableOpacity
                        onPress={() => setSelected(item)}
                        style={{
                            paddingVertical: 10,
                            paddingHorizontal: 15,
                            marginRight: 8,
                            backgroundColor: isSelected ? Colors.black : '#f0f0f0',
                            borderRadius: 20,
                        }}
                    >
                        <Text style={{ color: isSelected ? '#fff' : '#000' }}>{item}</Text>
                    </TouchableOpacity>
                );
            }}
            showsHorizontalScrollIndicator={false}
        />
    );

    const handleRealstateAgencies = (text) => {
        setRealestateAgencies(text)
    }
    const getSubcategories = (item) => {
        console.log('...sub categorires', JSON.stringify(item?.subcategories))
        setSubCategories(item?.subcategories)
    };

    const buildFilters = () => {
        return {
           // menuType: selectedMenu,
            type: selectedMenu,
            location,
            categoryId: selectedCategory,
            subCategoryId: selectedSubcategory,

            priceRange: {
                min: priceRange.min,
                max: priceRange.max,
            },

            areaSize: {
                min: areaSize.min,
                max: areaSize.max,
            },

            bedrooms: selectedBedrooms,
            bathrooms: selectedBathrooms,

            furnishingType: selectedfurnishingtype,
            rentPaid: selectedrentispaid,

            saleType: selectedsaletype,
            projectCompletion: selectedprojectcompletion,
            projectStatus: selectedprojectstatus,

            amenities: selectedamenitiestype,
            realEstateAgency: realestateAgencies,
        };
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={{ padding: 16, backgroundColor: '#ffffff', marginBottom: 120 }}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: 50,
                    paddingHorizontal: 5, marginBottom: 10,
                    justifyContent: 'space-between',
                }}>

                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40 }}>
                        <Icon name="close" size={24} color="#000" />
                    </TouchableOpacity>


                    <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Filter</Text>
                    </View>


                    <View style={{ width: 40 }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                    {menus.map(menu => (
                        <TouchableOpacity key={menu} onPress={() => setSelectedMenu(menu)}>
                            <Text style={{
                                fontSize: 16,
                                fontWeight: selectedMenu === menu ? 'bold' : 'normal',
                                borderBottomWidth: selectedMenu === menu ? 2 : 0,
                                paddingBottom: 4
                            }}>{menu}</Text>
                        </TouchableOpacity>
                    ))}
                </View>


                <View style={{ marginTop: 10 }}>
                    <LocationInput />
                </View>

                <Text style={{ marginTop: 7, fontWeight: 'bold', marginBottom: 5 }}>Property Type</Text>
                {/*  {renderHorizontalList(categories, selectedPropertyType, setSelectedPropertyType)} */}
                <View style={{ height: 60 }}>
                    <FlatList
                        data={categories}
                        horizontal
                        keyExtractor={(item) => item.name}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => {
                                    setSelectedCategory(item._id);
                                    setSelectedSubcategory('');
                                    getSubcategories(item)
                                }}
                                style={[
                                    styles.cityButton,
                                    selectedCategory === item._id && styles.selectedButton,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.cityText,
                                        selectedCategory === item._id && styles.selectedText,
                                    ]}
                                >
                                    {item.name}
                                </Text>
                            </TouchableOpacity>
                        )}
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: 5 }}
                    />
                </View>
                {/*  <Text style={{ marginTop: 20, fontWeight: 'bold', marginBottom: 9 }}>Residential Category</Text> */}
                {/* {renderHorizontalList(residentialCategories, selectedResidentialCategory, setSelectedResidentialCategory)} */}

                {selectedCategory ? (
                    <>
                        <View style={{ height: 60 }}>
                            <View style={styles.section}>
                                <Text style={styles.label}>Sub Category
                                </Text>
                                <FlatList
                                    data={subCategories}
                                    horizontal
                                    keyExtractor={(item) => item.name}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            onPress={() => setSelectedSubcategory(item._id)}
                                            style={[
                                                styles.cityButton,
                                                selectedSubcategory === item._id && styles.selectedButton,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.cityText,
                                                    selectedSubcategory === item._id && styles.selectedText,
                                                ]}
                                            >
                                                {item.name}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingVertical: 10 }}
                                />
                            </View>
                        </View>
                    </>) : null}
                <View>
                    <PriceRangeSelector
                        value={priceRange}
                        onChange={setPriceRange}
                    />

                    {/* Example usage */}
                    <Text style={{ marginTop: 20 }}>
                        Selected: {priceRange.min} - {priceRange.max} AED
                    </Text>
                </View>


                <Text style={{ marginTop: 20, fontWeight: 'bold', marginBottom: 9 }}>Bedrooms</Text>

                {renderHorizontalList(bedrooms, selectedBedrooms, setSelectedBedrooms)}


                <Text style={{ marginTop: 20, fontWeight: 'bold', marginBottom: 9 }}>Bathrooms</Text>
                {renderHorizontalList(bathrooms, selectedBathrooms, setSelectedBathrooms)}
                <View>
                    <AreaSizeInput
                        value={areaSize}
                        onChange={setAreaSize}
                    />

                    {/* Debug / Preview */}
                    <Text style={{ marginTop: 20 }}>
                        Selected Area: {areaSize.min} - {areaSize.max} sqm
                    </Text>
                </View>
                {
                    selectedMenu === "Off-Plan" ?
                        <>

                            <Text style={{ marginTop: 20, fontWeight: 'bold', marginBottom: 9 }}>Sale Type</Text>
                            {renderHorizontalList(saletype, selectedsaletype, setSelectedsaletype)}


                            <Text style={{ marginTop: 20, fontWeight: 'bold', marginBottom: 9 }}>Project Completion</Text>
                            {renderHorizontalList(projectcomplection, selectedprojectcompletion, setSelectedprojectcompletion)}


                            <Text style={{ marginTop: 20, fontWeight: 'bold', marginBottom: 9 }}>Pre-handover Payment</Text>
                            {renderHorizontalList(prehandoverpayment, selectedfurnishingtype, setSelectedfurnishingtype)}


                            <Text style={{ marginTop: 20, fontWeight: 'bold', marginBottom: 9 }}>Handover</Text>
                            {renderHorizontalList(handover, selectedfurnishingtype, setSelectedfurnishingtype)}


                            <Text style={{ marginTop: 20, fontWeight: 'bold', marginBottom: 9 }}>Project Status</Text>
                            {renderHorizontalList(projectstatus, selectedprojectstatus, setSelectedprojectstatus)}
                        </>
                        :
                        <>

                        </>
                }


                <Text style={{ marginTop: 20, fontWeight: 'bold', marginBottom: 9 }}>Furnishing Type</Text>
                {renderHorizontalList(furnishingtype, selectedfurnishingtype, setSelectedfurnishingtype)}


                <Text style={{ marginTop: 20, fontWeight: 'bold', marginBottom: 9 }}>Amenities</Text>
                {renderHorizontalList(amenitiestype, selectedamenitiestype, setSelectedamenitiestype)}


                <View style={{ marginTop: 10, marginBottom: 0 }}>
                    <Text style={{
                        fontWeight: 'bold', marginBottom: 7
                    }}>Real Estate Agencies</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            placeholder=""
                            value={realestateAgencies}
                            onChangeText={handleRealstateAgencies}
                            style={styles.textInput}
                        />
                    </View>
                </View>

                <Text style={{ marginTop: 20, fontWeight: 'bold', marginBottom: 9 }}>Rent is Paid</Text>
                {renderHorizontalList(rentispaid, selectedrentispaid, setSelectedrentispaid)}

                <View style={{ marginBottom: 50 }}> </View>
            </ScrollView>
            <TouchableOpacity
                style={{
                    backgroundColor: '#000',
                    padding: 15,
                    position: 'absolute',
                    bottom: 40,
                    left: 20,
                    right: 20,
                    borderRadius: 10,
                    alignItems: 'center'
                }}
                onPress={() => {
                    const filters = buildFilters();
                    console.log('...posting form filter..', filters)
                    navigation.navigate("PropertyforRent", {
                        filters,
                    });
                }}>
                <Text style={{ color: '#fff', fontSize: 16 }}>Show Results</Text>
            </TouchableOpacity>
        </View>
    );
};

export default MoreFilter;
const styles = StyleSheet.create({
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingVertical: 5,
        backgroundColor: '#fff',
    },
    cityButton: {
        padding: 12,
        backgroundColor: '#eee',
        borderRadius: 8,
        marginRight: 10,
        height: 40, marginBottom: 10
    },

    textInput: {
        flex: 1,
        paddingVertical: 8,
        paddingRight: 10,
        fontSize: 16,
    },
    selectedButton: {
        backgroundColor: Colors.black,
    },
    cityText: {
        fontSize: 13,
        color: '#333',
    },
    selectedText: {
        color: Colors.white,
        fontWeight: 'bold',
    },
})
