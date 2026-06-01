import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PropertyHighlights = ({data}) => {
  return (
    <View style={styles.container}>
      {/* Row 1 */}
      <View style={styles.row}>
       {/*  {
          data.subCategory ?
          <>
          <View style={styles.cell}>
          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>{data.subCategory}</Text>
        </View>
          </>
          : null
        } */}
        
        {
          data.propertyType ? 
          <>
        <View style={styles.cell}>
          <Text style={styles.label}>Purpose</Text>
          <Text style={styles.value}>{data.propertyType}</Text>
        </View>
          </>
          : null
        }
       
        <View style={styles.cell}>
          <Text style={styles.label}>Property Age</Text>
          <Text style={styles.value}>2 Years</Text>
        </View> 
      </View>

      {/* Row 2 */}
      <View style={styles.row}>
        {
          data?.isFurnished ?
          <>
        <View style={styles.cell}>
          <Text style={styles.label}>Furnishing</Text>
          <Text style={styles.value}>{data?.isFurnished}</Text>
        </View>
          </>
          : null
        }
         {
          data?.readyByDate ?
          <>
           <View style={styles.cell}>
          <Text style={styles.label}>Updated</Text>
          <Text style={styles.value}>{data.readyByDate}</Text>
        </View>
          </>
          : null
          }
       
      </View>
      {/* off-plan details */}
     {/*  <View style={styles.row}>
        <View style={styles.cell}>
          <Text style={styles.label}>Completion Status</Text>
          <Text style={styles.value}>Off-Plan</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.label}>Payment Plan</Text>
          <Text style={styles.value}>58/42</Text>
        </View>
      </View> */}

{/*       <View style={styles.row}>
        <View style={styles.cell}>
          <Text style={styles.label}>Handover</Text>
          <Text style={styles.value}>02 2027</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.label}>Developer</Text>
          <Text style={styles.value}>Deyaar</Text>
        </View>

        <View style={styles.cell}>
          <Text style={styles.label}>Project Name</Text>
          <Text style={styles.value}>Eleve by Deyaar</Text>
        </View>

      </View>
 */}

      {/* end off-plan details */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginTop: 10,
   // borderWidth: 1, borderColor: 'red'
  },
  row: {
    flexDirection: 'row',
    marginBottom: 7,
  },
  cell: {
    flex: 1,
    padding: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#f9f9f9',
  },
  label: {
    fontSize: 12,
    color: '#666',
  },
  value: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default PropertyHighlights;
