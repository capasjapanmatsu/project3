import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting vaccine certificate cleanup...')

    // 承認または却下された一時保管の証明書を取得
    const { data: expiredCerts, error: fetchError } = await supabaseClient
      .from('vaccine_certifications')
      .select('id, rabies_vaccine_image, combo_vaccine_image')
      .eq('temp_storage', true)
      .in('status', ['approved', 'rejected'])
      .lt('updated_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // 1時間前

    if (fetchError) {
      console.error('Error fetching expired certificates:', fetchError)
      throw fetchError
    }

    console.log(`Found ${expiredCerts?.length || 0} expired certificates to cleanup`)

    if (expiredCerts && expiredCerts.length > 0) {
      // ストレージから画像ファイルを削除
      for (const cert of expiredCerts) {
        try {
          // 狂犬病ワクチン画像を削除
          if (cert.rabies_vaccine_image) {
            const rabiesPath = cert.rabies_vaccine_image.split('/').pop()
            if (rabiesPath && rabiesPath.startsWith('temp/')) {
              const { error: deleteRabiesError } = await supabaseClient.storage
                .from('vaccine-certs')
                .remove([rabiesPath])
              
              if (deleteRabiesError) {
                console.error('Error deleting rabies image:', deleteRabiesError)
              } else {
                console.log('Deleted rabies image:', rabiesPath)
              }
            }
          }

          // 混合ワクチン画像を削除
          if (cert.combo_vaccine_image) {
            const comboPath = cert.combo_vaccine_image.split('/').pop()
            if (comboPath && comboPath.startsWith('temp/')) {
              const { error: deleteComboError } = await supabaseClient.storage
                .from('vaccine-certs')
                .remove([comboPath])
              
              if (deleteComboError) {
                console.error('Error deleting combo image:', deleteComboError)
              } else {
                console.log('Deleted combo image:', comboPath)
              }
            }
          }
        } catch (storageError) {
          console.error('Error deleting storage files for cert:', cert.id, storageError)
        }
      }

      // データベースから証明書レコードを削除
      const certIds = expiredCerts.map(cert => cert.id)
      const { error: deleteError } = await supabaseClient
        .from('vaccine_certifications')
        .delete()
        .in('id', certIds)

      if (deleteError) {
        console.error('Error deleting certificate records:', deleteError)
        throw deleteError
      }

      console.log(`Successfully deleted ${certIds.length} certificate records`)
    }

    // 古い一時保管ファイル（30日以上前）も削除
    const { data: oldTempFiles, error: oldFilesError } = await supabaseClient.storage
      .from('vaccine-certs')
      .list('temp', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' }
      })

    if (!oldFilesError && oldTempFiles) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const filesToDelete = oldTempFiles
        .filter(file => new Date(file.created_at) < thirtyDaysAgo)
        .map(file => `temp/${file.name}`)

      if (filesToDelete.length > 0) {
        const { error: deleteOldFilesError } = await supabaseClient.storage
          .from('vaccine-certs')
          .remove(filesToDelete)

        if (deleteOldFilesError) {
          console.error('Error deleting old temp files:', deleteOldFilesError)
        } else {
          console.log(`Deleted ${filesToDelete.length} old temporary files`)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleanup completed. Processed ${expiredCerts?.length || 0} certificates.`,
        deleted_certificates: expiredCerts?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Cleanup function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
}) 