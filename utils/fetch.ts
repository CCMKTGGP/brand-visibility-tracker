// Third-party imports
import axios from "axios";

/**
 * Fetches data from API endpoint using GET method
 * Automatically includes authorization token from localStorage
 *
 * @param url - API endpoint URL
 * @returns Promise<any> - API response data
 * @throws Error - When API call fails
 */
export async function fetchData(url: string) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";
  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    });

    const { data } = response;
    return data;
  } catch (err: any) {
    const { data } = err.response;
    throw new Error(data?.message || "Error in making API Call");
  }
}

/**
 * Sends data to API endpoint using POST method
 * Automatically includes authorization token from localStorage
 *
 * @param url - API endpoint URL
 * @param body - Request body data
 * @returns Promise<any> - API response data
 * @throws Error - When API call fails
 */
export async function postData(url: string, body: any) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";
  try {
    const response = await axios.post(url, body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    });

    const { data } = response;
    return data;
  } catch (err: any) {
    const { data } = err.response;
    throw new Error(data?.message || "Error in making API Call");
  }
}

/**
 * Updates data via API endpoint using PUT method
 * Automatically includes authorization token from localStorage
 *
 * @param url - API endpoint URL
 * @param body - Request body data
 * @returns Promise<any> - API response data
 * @throws Error - When API call fails
 */
export async function putData(url: string, body: any) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";
  try {
    const response = await axios.put(url, body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    });

    const { data } = response;
    return data;
  } catch (err: any) {
    const { data } = err.response;
    throw new Error(data?.message || "Error in making API Call");
  }
}

/**
 * Partially updates data via API endpoint using PATCH method
 * Automatically includes authorization token from localStorage
 *
 * @param url - API endpoint URL
 * @param body - Request body data
 * @returns Promise<any> - API response data
 * @throws Error - When API call fails
 */
export async function patchData(url: string, body: any) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";
  try {
    const response = await axios.patch(url, body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    });

    const { data } = response;
    return data;
  } catch (err: any) {
    const { data } = err.response;
    throw new Error(data?.message || "Error in making API Call");
  }
}

/**
 * Deletes data via API endpoint using DELETE method
 * Automatically includes authorization token from localStorage
 *
 * @param url - API endpoint URL
 * @param body - Optional request body data
 * @returns Promise<any> - API response data
 * @throws Error - When API call fails
 */
export async function deleteData(url: string, body?: any) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";
  try {
    const response = await axios.delete(url, {
      data: body,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    });

    const { data } = response;
    return data;
  } catch (err: any) {
    const { data } = err.response;
    throw new Error(data?.message || "Error in making API Call");
  }
}
