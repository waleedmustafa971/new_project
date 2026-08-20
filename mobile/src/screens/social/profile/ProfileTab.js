import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Feather'; // You can choose other icon sets
import EducationItem from './EducationItem';
import ExperienceItem from './ExperienceItem';
import * as base from '../../../component/global'
import ViewReels from './Tab/ViewReels';
import ViewPosts from './Tab/ViewPosts';
import ViewPhotos from './Tab/ViewPhotos';
import ViewFollowers from './Tab/ViewFollowers';
import VIewFollowing from './Tab/VIewFollowing';

const ProfileTab = ({ userid }) => {
    const [pagestatus, setPagestatus] = useState('Posts');
    console.log("..ProfileTab.userid...." + userid)

    // Tabs with labels and icon names
    /*
      Posts leads, and is the default.

      A profile that opens on "About" — an empty experience section — while the
      person's actual posts have no tab at all was the wrong way round. Posts is
      what a wall is for.
    */
    const tabs = [
        { name: 'Posts', icon: 'grid' },
        { name: 'About', icon: 'info' },
        { name: 'Reels', icon: 'film' },
        { name: 'Photos', icon: 'image' },
        { name: 'Followers', icon: 'users' },
        { name: 'Following', icon: 'user-check' },
    ];

    return (
        <>
        <View
            style={{
                flex: 1,
                flexDirection: 'row',
                justifyContent: 'center',
                padding: 8,
                flexWrap: 'wrap',
                width: '100%',
            }}
        >
            {tabs.map((tab) => (
                <TouchableOpacity
                    key={tab.name}
                    onPress={() => setPagestatus(tab.name)}
                    style={{
                        backgroundColor: pagestatus === tab.name ? '#3B82F6' : '#f2f2f2',
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        borderRadius: 20,
                        marginHorizontal: 5,
                        marginVertical: 5,
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}
                >
                    <Icon
                        name={tab.icon}
                        size={16}
                        color={pagestatus === tab.name ? 'white' : 'black'}
                        style={{ marginRight: 5 }}
                    />
                    <Text
                        style={{
                            color: pagestatus === tab.name ? 'white' : 'black',
                            fontWeight: pagestatus === tab.name ? 'bold' : 'normal',
                            fontSize: 14,
                        }}
                    >
                        {tab.name}
                    </Text>
                </TouchableOpacity>
            ))}
            {/* About Us */}
            {
                pagestatus == "About" ?
                    <>
                       
                       
                        <View style={{ padding: 10, width: '100%' }}>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>Experience</Text>

                           {/*  <ExperienceItem
                                logo={base.BASE_URL + '/uploads/education/inistiute.jpg'}
                                fromDate="Jan 2020"
                                toDate="Dec 2022"
                                description="Worked as a senior software engineer building scalable mobile applications and managing backend integrations."
                            />
                            <ExperienceItem
                                logo={base.BASE_URL + '/uploads/education/inistiute.jpg'}
                                fromDate="Jan 2020"
                                toDate="Dec 2022"
                                description="Worked as a senior software engineer building scalable mobile applications and managing backend integrations."
                            /> */}
                        </View>
                    </>
                    : null

            }
            {/* End about us */}
        </View>
        <View style={{ width: '100%' }}>
        {
                pagestatus == "Following" ?
                <>
                <VIewFollowing userid={userid}/>
                </> : null
        }
        </View>

         <View style={{ width: '100%' }}>
        {
                pagestatus == "Followers" ?
                <>
                <ViewFollowers userid={userid}/>
                </> : null
        }
        </View>
        <View style={{ width: '100%' }}>
          {
                pagestatus == "Photos" ?
                <>
                <ViewPhotos userid={userid}/>
                </> : null
            }
        </View>
        <View style={{ width: '100%' }}>
         {
            pagestatus == "Posts" ?
            <ViewPosts userid={userid} />
            : null
        }
        {
            pagestatus == "Reels" ?
            <>
            <ViewReels userid={userid}/>
            </> : null
        }
        </View>
        </>
    );
};

export default ProfileTab;
