import { View, Text, StyleSheet } from 'react-native';
import React from 'react';

type MoreInformationProps = {
  data?: {
    RERAtitledeednumber?: string;
    propertyReference?: string;
    developer?: string;
  };
};

const MoreInformation: React.FC<MoreInformationProps> = ({ data }) => {
  return (
    <View
      style={{
        borderWidth: 0,
        borderColor: '#f2f2f2',
        marginTop: 7,
        marginBottom: 5,
      }}
    >
      <Text style={{ fontWeight: 'bold', marginBottom: 4,
        fontSize: 12
       }}>More Info</Text>
      <View>
        <Text style={styles.fontsizes}>Permit Number : {data?.RERAtitledeednumber || "N/A"}</Text>
        <Text style={styles.fontsizes}>DED : {data?.RERAtitledeednumber || "N/A"}</Text>
        <Text style={styles.fontsizes}>RERA : 423423432</Text>
        <Text style={styles.fontsizes}>Ref ID : {data?.propertyReference || "N/A"}</Text>
        <Text style={styles.fontsizes}>Developer : {data?.developer || "N/A"}</Text>
      </View>
    </View>
  );
};

export default MoreInformation;


const styles = StyleSheet.create({
  fontsizes: {
   fontSize: 11
  },
});
