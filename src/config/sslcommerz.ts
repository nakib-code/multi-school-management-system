import SSLCommerzPayment from "sslcommerz-lts";
import env from "./env.js";

const storeId = env.sslcz_store_id;
const storePassword = env.sslcz_store_password;
const isLive = env.sslcz_is_live;

export const sslcommerz = new SSLCommerzPayment(storeId, storePassword, isLive);
console.log("SSLCommerz config:", {
	storeId: storeId ? "SET" : "MISSING",
	storePassword: storePassword ? "SET" : "MISSING",
	isLive,
});
