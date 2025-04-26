import axios from "axios";
import crypto from "crypto";

const accessKey = process.env.RAPYD_ACCESS_KEY;
const secretKey = process.env.RAPYD_SECRET_KEY;
const baseUrl = "https://sandboxapi.rapyd.net"; // Use 'sandboxapi' for testing. Change to 'api' for production.

function generateSignature(httpMethod, urlPath, salt, timestamp, body) {
  let bodyString = body && Object.keys(body).length ? JSON.stringify(body) : "";
  const toSign = `${httpMethod.toLowerCase()}${urlPath}${salt}${timestamp}${accessKey}${secretKey}${bodyString}`;
  const hash = crypto
    .createHmac("sha256", secretKey)
    .update(toSign)
    .digest("hex");
  const signature = Buffer.from(hash).toString("base64");
  return signature;
}

export async function rapydRequest(method, path, body = {}) {
  const salt = crypto.randomBytes(8).toString("hex");
  const timestamp = Math.floor(new Date().getTime() / 1000) - 10; // Rapyd requires +/- 10s

  const signature = generateSignature(method, path, salt, timestamp, body);

  const headers = {
    "Content-Type": "application/json",
    access_key: accessKey,
    salt: salt,
    timestamp: timestamp,
    signature: signature,
  };

  try {
    const response = await axios({
      method,
      url: `${baseUrl}${path}`,
      headers,
      data: body,
    });

    return response.data;
  } catch (error) {
    console.error("Rapyd API Error:", error?.response?.data || error.message);
    throw new Error(
      error?.response?.data?.status?.error_description ||
        "Rapyd API request failed"
    );
  }
}
