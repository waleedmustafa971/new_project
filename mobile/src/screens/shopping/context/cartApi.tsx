import axios from "axios";
import { BASE_URL } from "../../../component/global";
import api from "../../../component/api";
// ✅ NEW: Size type (replaces `object`)
interface Size {
  price: number;
  size?: string;
  stock?: number;
}

// ✅ NEW: Strongly typed payload
export interface AddToCartPayload {
  productId: string;
  qty: number;
  productname: string;
  userId: string;
  price: number;
  sizes?: Size[];            // ✅ FIX: was `object`
  vendorId?: string;         // ✅ FIX: optional
}

export const addToCartApi = (data: AddToCartPayload) => {
  console.log('..frontend add cart .....', JSON.stringify(data))
  return api.post(`/api/cart/add`, data);
};  
export const increaseQtyApi = (cartItemId: string) =>
  api.post(`/api/cart/increase/${cartItemId}`);

export const decreaseQtyApi = (cartItemId: string) =>
  api.post(`/api/cart/decrease/${cartItemId}`);

export const deleteCartApi = (cartItemId: string) =>
  api.delete(`/api/cart/delete/${cartItemId}`);

export const updateCartApi = (data: { productId: string; type: "increase" | "decrease" }) =>
  api.post(`/apt/cart/update`, data);

export const removeFromCartApi = (productId: string) =>
  api.delete(`/api/cart/delete/${productId}`);

export const getCartListApi = (userId: string) =>
  api.get(`/api/cart/list?userId=${userId}`);
