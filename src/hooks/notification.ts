const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
import { supabase } from "../../supabaseClient";

export async function sendFCMNotificationFromWeb(
  toUserId: string,
  title: string,
  message: string,
  data: any = {}
) {
  try {
    // ✅ First, get the FCM token from Supabase
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_fcm_tokens')
      .select('fcm_token')
      .eq('user_id', toUserId)
      .single();

    if (tokenError || !tokenData?.fcm_token) {
      console.warn('No FCM token found for user:', toUserId);
      return false;
    }

    const fcmToken = tokenData.fcm_token;
    console.log('🔔 Sending FCM to token:', fcmToken.substring(0, 20) + '...');

    // ✅ Send notification with correct field names
    const response = await fetch(`${API_BASE_URL}/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: fcmToken,  // ← Changed from toUserId to token
        title: title,
        body: message,     // ← Changed from message to body
        data: data
      })
    });

    const result = await response.json();
    console.log('✅ FCM Notification sent:', result);
    return result.success;
  } catch (error) {
    console.error('❌ Error sending FCM notification:', error);
    return false;
  }
}