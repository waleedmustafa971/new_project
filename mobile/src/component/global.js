import React, { Component } from 'react'

/* ------------------------------------------------------------------
   Server selection

   Flip USE_LOCAL_SERVER to switch the whole app between the local
   backend and production. Every URL below follows it, so there is only
   one thing to change.

   LOCAL_SERVER must be this machine's LAN IP, not localhost — the phone
   or emulator resolves "localhost" to itself, not to your computer.
   Android emulator can also use http://10.0.2.2:5000.

   Cleartext HTTP is already allowed (android:usesCleartextTraffic="true"
   in AndroidManifest.xml), so the http:// address works as-is.
   ------------------------------------------------------------------ */

export const USE_LOCAL_SERVER = false;

const LOCAL_SERVER = "http://192.168.200.222:5000";
const LIVE_SERVER  = "https://api.maxsocialapp.com";

const SERVER = USE_LOCAL_SERVER ? LOCAL_SERVER : LIVE_SERVER;

export const BASE_URL = SERVER;
export const MUSIC_URL = SERVER;
export const SOCKET_URL = SERVER;
export const PROFILE_IMAGE_URL = SERVER;

export const FRONT_URL = "https://maxcoreproperty.com";
export const SHARE_URL = "https://maxcoreproperty.com";

export const Product_name = "max";
export const currency = "AED";
export const productpath = "/uploads/products/optimized/";
export const AGORA_APP_ID = "YOUR_AGORA_APP_ID_HERE";
export const SDK_APP_ID = "pzZxif9sqOwwNcOUBptixR13lgdJ4zv7LVmO0qkxSecZo-afJit024lqnulZ2zKj";
//export const googlemapapi = "AIzaSyBsNAlVjO6R0k452YN98gF36UsQsz4_wDg"; //AIzaSyClc2tZ-J9P7DNBtCBHb7QpeJc6LbywmTk
export const googlemapapi = "AIzaSyDqPxP1K-dMVfx-gef1Gm9KiaG7JMyV3so"; //AIzaSyClc2tZ-J9P7DNBtCBHb7QpeJc6LbywmTk
export const sendEmail = "maxcore@gmail.com";
export const vendorprofilesharelink = "/product/";
export const mapbox = "YOUR_MAPBOX_TOKEN_HERE";
