import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    ScrollView,
    Button,
} from 'react-native';
import LocationInput from './LocationInput';
import PriceRangeSelector from './PriceRangeSelector';
import AreaSizeInput from './AreaSizeInput';
import { Navigation } from 'lucide-react';
import { useNavigation } from "@react-navigation/native";

const PropertyScreen = () => {
      const navigation = useNavigation();

    const [selectedMenu, setSelectedMenu] = useState('Rent');
    const [location, setLocation] = useState('');
    const [price, setPrice] = useState({ min: 0, max: 100 });
    const [area, setArea] = useState({ min: 0, max: 100 });

    const menus = ['Rent', 'Buy'];
    const propertyTypes = [
        'Residential', 'Commercial', 'Rooms', 'Monthly Rent', 'Daily Rent'
    ];
    const residentialCategories = [
        'All Residential', 'Apartment', 'Villa', 'Townhouse', 'Penthouse',
        'Hotel Apartment', 'Residential Building', 'Villa Compound', 'Residential Floor'
    ];
    const bedrooms = ['Studio', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const bathrooms = ['1', '2', '3', '4', '5', '6', '7', '8'];
    const [selectedPropertyType, setSelectedPropertyType] = useState('');
    const [selectedResidentialCategory, setSelectedResidentialCategory] = useState('');
    const [selectedBedrooms, setSelectedBedrooms] = useState('');
    const [selectedBathrooms, setSelectedBathrooms] = useState('');


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
                            backgroundColor: isSelected ? '#007AFF' : '#f0f0f0',
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


    return (
        <ScrollView style={{ padding: 16, backgroundColor: '#ffffff' }}>
            {/* Top Menu */}
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

            {/* Location Input */}
            <View style={{ marginTop: 10 }}>
                <LocationInput />
                {/*  <Text>Location</Text>
        <TextInput
          placeholder="Search location"
          value={location}
          onChangeText={setLocation}
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            padding: 10,
            marginTop: 5
          }}
        /> */}
            </View>

            {/* Helper Text */}
            <Text style={{ marginTop: 10 }}>
                Select the cities, neighborhood or building that you want to search properties in
            </Text>

            {/* Property Types */}
            <Text style={{ marginTop: 20, fontWeight: 'bold', marginBottom: 9 }}>Property Type</Text>
            {renderHorizontalList(propertyTypes, selectedPropertyType, setSelectedPropertyType)}


            {/* Residential Category */}
            <Text style={{ marginTop: 20, fontWeight: 'bold', marginBottom: 9 }}>Residential Category</Text>
            {renderHorizontalList(residentialCategories, selectedResidentialCategory, setSelectedResidentialCategory)}


            {/* Price Range */}
         {/*     <Text style={{ marginTop: 20, fontWeight: 'bold' }}>Price Range (AED)</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text>Min: {price.min} AED</Text>
                <Text>Max: {price.max} AED</Text>
            </View>  */}
             <PriceRangeSelector /> 

         {/*    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Button title="-" onPress={() => setPrice(p => ({ ...p, min: Math.max(p.min - 10, 0) }))} />
                <Button title="+" onPress={() => setPrice(p => ({ ...p, max: p.max + 10 }))} />
            </View> */}

            {/* Bedrooms */}
            <Text style={{ marginTop: 20, fontWeight: 'bold', marginBottom: 9 }}>Bedrooms</Text>
           {/*  {renderHorizontalList(bedrooms, null, () => { })} */}
            {renderHorizontalList(bedrooms, selectedBedrooms, setSelectedBedrooms)}

            {/* Bathrooms */}
            <Text style={{ marginTop: 20, fontWeight: 'bold', marginBottom: 9 }}>Bathrooms</Text>
            {renderHorizontalList(bathrooms, selectedBathrooms, setSelectedBathrooms)}

            {/* Area / Size */}
         {/*    <Text style={{ marginTop: 20, fontWeight: 'bold', marginBottom: 9 }}>Area / Size (sqm)</Text> */}
         {/*    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text>Min: {area.min}</Text>
                <Text>Max: {area.max}</Text>
            </View> */}
            <AreaSizeInput />
           {/*  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Button title="-" onPress={() => setArea(a => ({ ...a, min: Math.max(a.min - 10, 0) }))} />
                <Button title="+" onPress={() => setArea(a => ({ ...a, max: a.max + 10 }))} />
            </View> */}

            {/* Show Result Button */}
            <TouchableOpacity
                style={{
                    marginTop: 30,
                    backgroundColor: '#007AFF',
                    padding: 15,
                    borderRadius: 10,
                    alignItems: 'center'
                }} onPress={() => {
                    navigation.navigate("PropertyFind")
                }}
            >
                <Text style={{ color: '#fff', fontSize: 16 }}>Show Results</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

export default PropertyScreen;
