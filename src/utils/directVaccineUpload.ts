import { supabase } from './supabase';

export const directVaccineUpload = async (
  filePath: string,
  file: File,
  bucket: string = 'vaccine-certs'
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    console.log('ワクチン証明書アップロード開始:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      instanceof_File: file instanceof File
    });

    // ファイル検証
    if (!file || !(file instanceof File)) {
      throw new Error('無効なファイルです');
    }

    // MIME type検証と正規化
    let contentType = file.type;
    if (!contentType || contentType === 'application/octet-stream') {
      // ファイル拡張子からMIME typeを推測
      const ext = file.name.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
        case 'png':
          contentType = 'image/png';
          break;
        case 'gif':
          contentType = 'image/gif';
          break;
        case 'webp':
          contentType = 'image/webp';
          break;
        default:
          throw new Error(`サポートされていないファイル形式: ${ext}`);
      }
    }

    // 許可されたMIME typeかチェック
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      throw new Error(`サポートされていないMIMEタイプ: ${contentType}`);
    }


    // v2 の正しい認証トークン取得方法
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('認証情報確認:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      sessionError,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    });
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      throw new Error('認証エラーが発生しました');
    }
    
    if (!session?.access_token) {
      console.error('❌ No access token found');
      throw new Error('認証されていません。ログインしてください。');
    }
    
    const token = session.access_token;

    // Supabase Storage APIのURL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;


    // v2 の正しいfetchアップロード（PUTメソッド使用）
    const response = await fetch(uploadUrl, {
      method: 'PUT',  // Storage API は PUT が正しい
      headers: {
        'Authorization': `Bearer ${token}`,      // ← v2のトークンを使用
        'Content-Type': contentType,
        'Cache-Control': '3600',
        'x-upsert': 'true'
      },
      body: file
    });


    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload failed:', errorText);
      
      // Cloudflareエラーの場合、より適切なエラーメッセージを提供
      if (response.status === 520) {
        console.error('🌐 Cloudflare Error 520 detected - temporary server issue');
        throw new Error('一時的なサーバーエラーが発生しました。しばらく待ってから再度お試しください。');
      } else if (response.status >= 500) {
        console.error('🔧 Server error detected:', response.status);
        throw new Error(`サーバーエラーが発生しました (${response.status})。しばらく待ってから再度お試しください。`);
      } else {
        throw new Error(`アップロードに失敗しました: ${response.status} ${response.statusText}`);
      }
    }

    const responseData = await response.json();

    // 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);


    return {
      success: true,
      url: publicUrl
    };

  } catch (error) {
    console.error('❌ Direct vaccine upload error:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}; 
