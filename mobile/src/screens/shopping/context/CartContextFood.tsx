// src/context/CartContext.tsx

import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  addToCartApi,
  updateCartApi,
  removeFromCartApi,
  getCartListApi
} from "./foodcartApi";

interface Size {
  price: number;
  size?: string;
  stock?: number;
}

interface ProductType {
  productId: string;
  productname: string;
  price?: number;
  sizes?: Size[];
  images?: string;
  vendorId?: string;
  modulename?: string;

  // ✅ Added missing fields
  currency?: string;
  date_and_time?: string;
  discount?: number;
  finalamount?: number;
  status?: string;
}
interface CartItem {
  product: ProductType;
  productname: string;
  qty: number;
  price: number;
  sizes?: Size[];
  vendorId?: string;                 // ✅ FIX: optional vendorId
}

interface AddToCartPayload {
  productId: string;
  productname: string;
  qty: number;
  userId: string;
  price: number;
  sizes?: Size[];                    // ✅ FIX: no `object`
  vendorId?: string;                 // ✅ FIX: OPTIONAL
}

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;   // ✅ add this
  fetchCart: () => Promise<void>;
  addToCart: (product: ProductType) => Promise<void>;
  increaseQty: (productId: string) => Promise<void>;
  decreaseQty: (productId: string) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

// ---------- CONTEXT ----------
const CartContextFood = createContext<CartContextType>(null!);

// ---------- PROVIDER ----------
export const CartProviderFood: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [userid, setUserid] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      await checkUser();      // wait for userid
      await fetchCart();      // now fetch cart correctly
    };
    init();
  }, []);


  const checkUser = async () => {
    const jsonValue = await AsyncStorage.getItem('userdata');
    if (jsonValue != null) {
      const userData = JSON.parse(jsonValue);
      setUserid(userData._id);
    } else {
      console.log('No user data found');
    }
  };


  const saveLocalCart = async (data: CartItem[]) =>
    await AsyncStorage.setItem("CART_LOCAL", JSON.stringify(data));

  const loadLocalCart = async () => {
    const saved = await AsyncStorage.getItem("CART_LOCAL");
    return saved ? JSON.parse(saved) : [];
  };

  const fetchCart = async () => {
    try {
      const response = await getCartListApi(userid);
      const serverCart = response?.data?.data || [];
      setCart(serverCart);
      await saveLocalCart(serverCart);
    } catch (err) {
      console.log("❌ fetchCart Error:", err);
      //  const offlineCart = await loadLocalCart();
      //  setCart(offlineCart);
    }
  };

  // ---------- 2️⃣ ADD TO CART (API FIRST) ----------

  const addToCart = async (product: ProductType) => {
    try {
      const finalPrice = Number(product?.price ?? 0);
      const payload = {
        productId: product.productId,  // ✅ NOW WORKS
        productname: product.productname,
        images: product?.images ?? '',
        qty: 1,
        userId: userid,
        price: finalPrice,
        vendorId: product?.vendorId ?? '',
        currency: product?.currency ?? 'AED',
        date_and_time: new Date().toISOString(),
        discount: Number(product?.discount ?? 0),
        finalamount: Number(product?.finalamount ?? finalPrice),
        status: product?.status ?? 'not yet submit'
      };
      console.log('✅ FINAL PAYLOAD:', payload);
      const response = await addToCartApi(payload);
      if (response?.data) {
        await fetchCart();
      }
    } catch (err) {
      console.log("❌ addToCart Error:", err);
    }
  };

  // ---------- 3️⃣ INCREASE QTY ----------
  const increaseQty = async (productId: string) => {
    try {
      await updateCartApi({ productId, type: "increase" });
      await fetchCart();
    } catch (err) {
      console.log("❌ increaseQty Error:", err);
    }
  };

  // ---------- 4️⃣ DECREASE QTY ----------
  const decreaseQty = async (productId: string) => {
    try {
      await updateCartApi({ productId, type: "decrease" });
      await fetchCart();
    } catch (err) {
      console.log("❌ decreaseQty Error:", err);
    }
  };

  // ---------- 5️⃣ REMOVE ITEM ----------
  const removeItem = async (productId: string) => {
    try {
      await removeFromCartApi(productId);
      await fetchCart();
    } catch (err) {
      console.log("❌ removeItem Error:", err);
    }
  };

  // ---------- 6️⃣ CLEAR CART ----------
  const clearCart = async () => {
    setCart([]);
    await AsyncStorage.removeItem("CART_LOCAL");
  };
  const cartTotal = cart.reduce(
    (total, item) => total + (item.price * item.qty),
    0
  );
  return (
    <CartContextFood.Provider
      value={{
        cart,
        cartCount: cart.reduce((t, i) => t + i.qty, 0), // can you check is this working in footer.js
        cartTotal,   // ✅ added here
        fetchCart,
        addToCart,
        increaseQty,
        decreaseQty,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContextFood.Provider>
  );
};

export const useCart = () => useContext(CartContextFood);
