import React from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
//import { LineChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/Ionicons';

/* 

*/
const TransactionItem = ({ date, price, area, currency }) => (
  <View style={styles.transactionCard}>
    <Text style={styles.date}>{new Date(date).toDateString()}</Text>
    <View style={styles.row}>
      <Icon name="cash-outline" size={16} color="#2ecc71" />
      <Text style={styles.text}> {currency} {price.toLocaleString()}</Text>
    </View>
    <View style={styles.row}>
      <Icon name="resize-outline" size={16} color="#3498db" />
      <Text style={styles.text}> {area} sqft</Text>
    </View>
  </View>
);

const SimilarPropertyTransaction = ({data, currency}) => {
 
 /*  const chartData = {
    labels: transactions.map(t => t.date.slice(2, 7)),
    datasets: [{ data: transactions.map(t => t.price) }],
  };
 */
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Similar Property Transactions</Text>
      
      <FlatList
        data={data}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <TransactionItem date={item.date} price={item.price} area={item.sqft} 
          currency={currency}/>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 10 }}
      />

     {/*  <Text style={styles.graphTitle}>Price Trend</Text>
      <LineChart
        data={chartData}
        width={Dimensions.get('window').width - 32}
        height={220}
        yAxisSuffix=" AED"
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#f6f9fc',
          backgroundGradientTo: '#e6f0f8',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          labelColor: () => '#333',
        }}
        bezier
        style={{ borderRadius: 12 }}
      /> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 5,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  heading: {
    fontSize: 12,
    marginBottom: 0,
    color: '#333',
  },
  transactionCard: {
    backgroundColor: '#f7fafd',
    padding: 12,
    borderRadius: 10,
    marginRight: 10,
    width: 160,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    elevation: 1,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#555',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  text: {
    fontSize: 13,
    color: '#444',
  },
  graphTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
});

export default SimilarPropertyTransaction;
