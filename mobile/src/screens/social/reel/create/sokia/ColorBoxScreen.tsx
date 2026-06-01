import React, { useState } from 'react'
import { FlatList, TouchableOpacity, StyleSheet, View } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'

type GradientColor = string[]

interface Props {
  onSelectbgColor: (colors: GradientColor) => void
}

const COLORS: GradientColor[] = [
  ['#000000', '#000000'],
  ['#FFFFFF', '#FFFFFF'],
  ['#ff9a9e', '#fad0c4'],
  ['#a18cd1', '#fbc2eb'],
  ['#fbc2eb', '#a6c1ee'],
  ['#fdcbf1', '#e6dee9'],
  ['#a1c4fd', '#c2e9fb'],
  ['#d4fc79', '#96e6a1'],
  ['#84fab0', '#8fd3f4'],
  ['#fccb90', '#d57eeb'],
  ['#e0c3fc', '#8ec5fc'],
  ['#f093fb', '#f5576c'],
]

const ColorBoxScreen: React.FC<Props> = ({ onSelectbgColor }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  return (
    <View style={styles.container}>
      <FlatList<GradientColor>
        data={COLORS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => {
              setSelectedIndex(index);
              onSelectbgColor(item);
            }}
            style={[styles.boxWrapper, selectedIndex === index && styles.selected]}
          >
            <LinearGradient colors={item} style={styles.colorBox} />
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

export default ColorBoxScreen

const styles = StyleSheet.create({
  container: { height: 70, justifyContent: 'center' },
  boxWrapper: { marginRight: 10, padding: 2, borderRadius: 25, borderWidth: 2, borderColor: 'transparent' },
  selected: { borderColor: '#fff' },
  colorBox: { width: 45, height: 45, borderRadius: 22.5 },
})



/* 

const FILTERS = [
    { id: '1', name: 'Normal', matrix: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0] },
    { id: '2', name: 'Fade', matrix: [1, 0, 0, 0, 0.1, 0, 1, 0, 0, 0.1, 0, 0, 1, 0, 0.1, 0, 0, 0, 0.8, 0] },
    { id: '3', name: 'Fade Warm', matrix: [1.1, 0, 0, 0, 0.1, 0, 1, 0, 0, 0.05, 0, 0, 0.9, 0, 0.05, 0, 0, 0, 1, 0] },
    { id: '4', name: 'Fade Cool', matrix: [0.9, 0, 0, 0, 0.05, 0, 1, 0, 0, 0.05, 0, 0, 1.2, 0, 0.1, 0, 0, 0, 1, 0] },
    { id: '5', name: 'Simple', matrix: [1.1, 0, 0, 0, 0, 0, 1.1, 0, 0, 0, 0, 0, 1.1, 0, 0, 0, 0, 0, 1, 0] },
    { id: '6', name: 'Simple Warm', matrix: [1.2, 0, 0, 0, 0, 0, 1.1, 0, 0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 1, 0] },
    { id: '7', name: 'Simple Cool', matrix: [0.9, 0, 0, 0, 0, 0, 1.1, 0, 0, 0, 0, 0, 1.3, 0, 0, 0, 0, 0, 1, 0] },
    { id: '8', name: 'Boost', matrix: [1.3, 0, 0, 0, -0.1, 0, 1.3, 0, 0, -0.1, 0, 0, 1.3, 0, -0.1, 0, 0, 0, 1, 0] },
    { id: '9', name: 'Boost Warm', matrix: [1.4, 0, 0, 0, -0.1, 0, 1.2, 0, 0, -0.1, 0, 0, 1, 0, -0.1, 0, 0, 0, 1, 0] },
    { id: '10', name: 'Boost Cool', matrix: [1, 0, 0, 0, -0.1, 0, 1.2, 0, 0, -0.1, 0, 0, 1.5, 0, -0.1, 0, 0, 0, 1, 0] },
    { id: '11', name: 'Graphite', matrix: [0.3, 0.3, 0.3, 0, 0, 0.3, 0.3, 0.3, 0, 0, 0.3, 0.3, 0.3, 0, 0, 0, 0, 0, 1, 0] },
    { id: '12', name: 'Hyper', matrix: [1.5, 0, 0, 0, -0.2, 0, 1.5, 0, 0, -0.2, 0, 0, 1.5, 0, -0.2, 0, 0, 0, 1, 0] },
    { id: '13', name: 'Rosy', matrix: [1.3, 0, 0, 0, 0.1, 0, 1.1, 0, 0, 0, 0, 0, 1.2, 0, 0.1, 0, 0, 0, 1, 0] },
    { id: '14', name: 'Emerald', matrix: [0.9, 0, 0, 0, 0, 0, 1.3, 0, 0, 0.1, 0, 0, 1.1, 0, 0, 0, 0, 0, 1, 0] },
    { id: '15', name: 'Midnight', matrix: [0.5, 0, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 1, 0] },
    { id: '16', name: 'Los Angeles', matrix: [1.2, 0, 0.1, 0, 0.05, 0, 1, 0, 0, 0.05, 0, 0, 0.9, 0, 0.05, 0, 0, 0, 1, 0] },
    { id: '17', name: 'Beauty', matrix: [1.1, 0, 0, 0, 0.1, 0, 1.1, 0, 0, 0.1, 0, 0, 1.0, 0, 0.05, 0, 0, 0, 1, 0] },
    { id: '18', name: 'Soft Glow', matrix: [1, 0, 0, 0, 0.05, 0, 1, 0, 0, 0.05, 0, 0, 1, 0, 0.05, 0, 0, 0, 1, 0] },
];

*/