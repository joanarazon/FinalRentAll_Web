import { supabase } from "../../supabaseClient.js";
import { generateToken } from "../notification/firebase.js";

// Call this after login
const saveFcmToken = async (userId) => {
  try {
    const fcmToken = await generateToken(); // your existing FCM logic
    if (!fcmToken) {
      console.warn("No FCM token retrieved");
      return;
    }

    const { data, error } = await supabase
      .from("user_fcm_tokens")
      .upsert(
        {
          user_id: userId,
          fcm_token: fcmToken,
          updated_at: new Date().toISOString(),
        },
        { onConflict: ["user_id"] } // ensures unique by user_id
      );

    if (error) throw error;
    console.log("✅ FCM token saved:", fcmToken);
  } catch (err) {
    console.error("❌ Error saving FCM token:", err.message);
  }
};

export default saveFcmToken;