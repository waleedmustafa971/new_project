import { View, Text, ScrollView,
  StyleSheet,
  TouchableOpacity
 } from 'react-native'
import React, {useState} from 'react'
import Feather from "react-native-vector-icons/Feather";

import ShippingAddress from '../cart/ShippingAddressBox'
import ContactInfo from './ContactInfo'
import PaymentItemsSection from './PaymentItemsSection'
import PaymentMethodSection from './PaymentMethodSection'
import PaymentBottomBar from './PaymentBottomBar'
import PaymentHeader from './PaymentHeader';

interface Props {
    route: {
        params: {
            cartItems: object;
            total: number;
            selectedaddress: string;
        };
    };
}

const PaymentScreen: React.FC<Props> = ({ route }) => {
      const { cartItems, total, selectedaddress } = route.params;
  const [totalAmount, setTotalAmount] = useState(0);
  const [totaldiscount, setTotaldiscount] = useState(0);
 // const [selectedAddress, setSelectedAddress] = useState(selectedaddress);
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [voucherlist,setVoucherlist] = useState<any>([])

  const handleback = () => {

  }

  return (
   <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
         {/* payment header */}
         <PaymentHeader />
        {/*  <View style={{ height: 100, flex: 1,  marginBottom: 5}}>
          <ShippingAddress onAddressLoaded={setSelectedAddress}/> 
        </View>  */}
         <ContactInfo
        onContactChange={(data : any) => {
          setMobile(data.mobile);
          setEmail(data.email);
        }}
      />
        <PaymentItemsSection items={cartItems} 
         total={cartItems.reduce((sum, item) => sum + item.price * item.qty, 0)}
        onTotalChange={(amount) => setTotalAmount(amount)}
        onTotalDiscount= {(totaldiscount) => setTotaldiscount(totaldiscount)}
         onChangeVoucher={(voucher) => setVoucherlist(voucher)} // ✅ pass the voucher object
        />
        {/* <PaymentItemsSection /> */}
      {/*   <PaymentMethodSection /> */}
      </ScrollView>
      <PaymentBottomBar total={totalAmount.toFixed(2)} email={email} mobile={mobile} selectedAddress={selectedaddress} 
      voucherlist={voucherlist}/>
    </View>
  )
}

export default PaymentScreen


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  title: {
    fontWeight: "700",
    fontSize: 14,
    marginHorizontal: 20,
    marginTop: 5,
    marginBottom: -4,
  },
});
