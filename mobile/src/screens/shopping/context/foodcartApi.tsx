import axios from "axios";
import { BASE_URL } from "../../../component/global";
import api from "../../../component/api";
// ✅ NEW: Size type (replaces `object`)

// ✅ NEW: Strongly typed payload
export interface AddToCartPayload {
  productId: string;
  qty: number;
  productname: string;
  userId: string;
  price: number;   
  discount: number;   
  finalamount: number;   
  vendorId?: string;  
}

export const addToCartApi = (data: AddToCartPayload) => {
  console.log('..frontend add cart .....', JSON.stringify(data))
  /* 
..frontend add cart ..... 
{"productname":"Vegetarian Pizza Small",
"images":"/uploads/food/items/items_1766764120776.webp",
"qty":1,
"userId":"69a2aa0041a6300225b0e7ab",
"price":"24.00",
"vendorId":"694d1fca7039b234a68cf882",
"currency":"AED",
"date_and_time":"",
"discount":0,
"finalamount":"24.00",
"status":"not yet submit"}  
  
  */
  return api.post(`/api/cart/food-add`, data);
};  
export const increaseQtyApi = (cartItemId: string) =>
  api.post(`/api/cart/food-increase/${cartItemId}`);

export const decreaseQtyApi = (cartItemId: string) =>
  api.post(`/api/cart/food-decrease/${cartItemId}`);

export const deleteCartApi = (cartItemId: string) =>
  api.delete(`/api/cart/food-delete/${cartItemId}`);

export const updateCartApi = (data: { productId: string; type: "increase" | "decrease" }) =>
  api.post(`/apt/cart/food-update`, data);

export const removeFromCartApi = (productId: string) =>
  api.delete(`/api/cart/food-delete/${productId}`);

export const getCartListApi = (userId: string) =>
  api.get(`/api/cart/food-list?userId=${userId}`);
