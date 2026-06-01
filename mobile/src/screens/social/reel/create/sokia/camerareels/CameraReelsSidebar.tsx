import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

const SidebarItem = ({ icon, label, onPress, active }: any) => (
  <TouchableOpacity onPress={onPress} style={styles.sidebarBtn}>
    <Text style={styles.sidebarLabel}>{label}</Text>
    <View style={[styles.iconCircle, active && { backgroundColor: '#FF0050' }]}>
      <Feather name={icon} size={17} color="white" />
    </View>
  </TouchableOpacity>
);

// We define the component as CameraReelsSidebar and wrap it in memo for performance
const CameraReelsSidebar = ({ onToggleEffects, showLiveEffects, showMusic, 
  onFilter, currentMode, showText }: any) => {
  return (
    <View style={styles.rightSidebar}>
      {
        currentMode == "PHOTO" ?
          <>
            <Text style={{ color: 'green' }}>{currentMode}</Text>
          </> 
          : 
          <>
         
          <SidebarItem icon="music" label="Audio" onPress={showMusic} />
          <SidebarItem
          icon="aperture"
          label="Effects"
          onPress={onToggleEffects}
          active={showLiveEffects}
          />         
          </>
      }
      
      {
        currentMode == "VIDEO" ?
          <>
          </> :
          <>
          {
            currentMode == "PHOTO" ?
            <></>
            :
            <>
            <SidebarItem icon="clock" label="Green Screen" />
            <SidebarItem icon="filter" label="Filter" onPress={onFilter} />
            <SidebarItem icon="clock" label="Timer" />
            </>

          }
           
          </>
      }
    </View>
  );
};

export default memo(CameraReelsSidebar);

const styles = StyleSheet.create({
  rightSidebar: {
    position: 'absolute',
    right: 10,
    top: '10%',
    alignItems: 'flex-end',
    zIndex: 10, // Ensures sidebar stays above the camera feed
  },
  sidebarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  sidebarLabel: {
    color: 'white',
    marginRight: 10,
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center'
  },
});