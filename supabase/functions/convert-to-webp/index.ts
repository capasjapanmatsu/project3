import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import ImageScript from 'https://deno.land/x/imagescript@1.2.15/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConvertRequest {
  bucket: string;
  path: string;
  quality?: number; // WebP quality (0-100, default: 80)
  generateThumbnail?: boolean; // Generate thumbnail
  thumbnailSize?: number; // Thumbnail size (default: 300)
  keepOriginal?: boolean; // Keep original file (default: true)
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { bucket, path, quality = 80, generateThumbnail = true, thumbnailSize = 300, keepOriginal = true } = await req.json() as ConvertRequest;

    // Validate input
    if (!bucket || !path) {
      throw new Error('Missing required parameters: bucket and path');
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download original image from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(path);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Convert Blob to ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Load image using ImageScript
    let image: any;
    try {
      // Detect image format and decode
      const view = new DataView(arrayBuffer);
      const isPNG = view.getUint32(0) === 0x89504E47 && view.getUint32(4) === 0x0D0A1A0A;
      
      if (isPNG) {
        image = await ImageScript.Image.decode(uint8Array);
      } else {
        // Assume JPEG/JPG
        image = await ImageScript.Image.decode(uint8Array);
      }
    } catch (decodeError) {
      console.error('Image decode error:', decodeError);
      throw new Error(`Failed to decode image: ${decodeError.message}`);
    }

    // Convert to WebP
    const webpBuffer = await image.encodeWebP(quality);

    // Generate paths for WebP files
    const pathParts = path.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
    const directory = pathParts.slice(0, -1).join('/');
    
    const webpPath = directory ? `${directory}/${fileNameWithoutExt}.webp` : `${fileNameWithoutExt}.webp`;
    const thumbnailPath = directory ? `${directory}/${fileNameWithoutExt}_thumb.webp` : `${fileNameWithoutExt}_thumb.webp`;

    // Upload WebP to storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(webpPath, webpBuffer, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload WebP: ${uploadError.message}`);
    }

    // Generate and upload thumbnail if requested
    let thumbnailUrl = null;
    if (generateThumbnail) {
      try {
        // Calculate aspect ratio
        const aspectRatio = image.width / image.height;
        let thumbWidth = thumbnailSize;
        let thumbHeight = thumbnailSize;
        
        if (aspectRatio > 1) {
          thumbHeight = Math.round(thumbnailSize / aspectRatio);
        } else {
          thumbWidth = Math.round(thumbnailSize * aspectRatio);
        }

        // Resize image for thumbnail
        const thumbnail = image.clone().resize(thumbWidth, thumbHeight);
        const thumbnailBuffer = await thumbnail.encodeWebP(quality);

        // Upload thumbnail
        const { error: thumbUploadError } = await supabase.storage
          .from(bucket)
          .upload(thumbnailPath, thumbnailBuffer, {
            contentType: 'image/webp',
            upsert: true,
          });

        if (!thumbUploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(thumbnailPath);
          thumbnailUrl = publicUrl;
        }
      } catch (thumbError) {
        console.error('Thumbnail generation error:', thumbError);
        // Continue without thumbnail
      }
    }

    // Delete original if not keeping it
    if (!keepOriginal) {
      await supabase.storage
        .from(bucket)
        .remove([path]);
    }

    // Get public URLs
    const { data: { publicUrl: webpUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(webpPath);

    const { data: { publicUrl: originalUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return new Response(
      JSON.stringify({
        success: true,
        webpUrl,
        thumbnailUrl,
        originalUrl: keepOriginal ? originalUrl : null,
        webpPath,
        thumbnailPath: generateThumbnail ? thumbnailPath : null,
        originalPath: keepOriginal ? path : null,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in convert-to-webp function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred during image conversion',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
