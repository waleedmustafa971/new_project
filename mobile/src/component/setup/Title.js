import { View, Text, StyleSheet } from 'react-native'
import React from 'react'
import * as base from "../global";
 
const Title = ({ data }) => {
  return (
    <View>
      <Text style={styles.titleText}>
        {data} 
        {base.Product_name}</Text>
    </View>
  )
}

export default Title

const styles = StyleSheet.create({
  titleText: {
    fontSize: 24,        // text-2xl
    color: '#000000',    // text-black
    fontWeight: 'bold',  // font-bold
    marginTop: 40,       // mt-10 = 10 * 4px = 40px
    marginBottom: 20,    // mb-10
    textAlign: 'center'
  },
});
