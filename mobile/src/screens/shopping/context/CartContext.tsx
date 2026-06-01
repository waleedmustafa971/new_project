// src/context/CartContext.tsx

import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  addToCartApi,
  updateCartApi,
  removeFromCartApi,
  getCartListApi
} from "./cartApi";

interface Size {
  price: number;
  size?: string;
  stock?: number;
}

interface ProductType {
  _id: string;
  productname: string;
  price?: number;
  sizes?: Size[];                    // ✅ FIX: typed sizes
  images?: string[];
  vendorId?: string;                 // ✅ FIX: optional vendorId
  modulename?: string;
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

  fetchCart: () => Promise<void>;
  addToCart: (product: ProductType) => Promise<void>;
  increaseQty: (productId: string) => Promise<void>;
  decreaseQty: (productId: string) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

// ---------- CONTEXT ----------
const CartContext = createContext<CartContextType>(null!);

// ---------- PROVIDER ----------
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
  console.log(product);

  try {
    const finalPrice =
      product?.sizes?.[0]?.price ?? product?.price ?? 0;

    const response = await addToCartApi({
      productId: product._id,
      productname: product.productname,
      qty: 1,
      userId: userid,
      price: finalPrice,
      vendorId: product.vendorId,
      sizes: product.sizes ?? [],
    });

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

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount: cart.reduce((t, i) => t + i.qty, 0), // can you check is this working in footer.js
        fetchCart,
        addToCart,
        increaseQty,
        decreaseQty,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
