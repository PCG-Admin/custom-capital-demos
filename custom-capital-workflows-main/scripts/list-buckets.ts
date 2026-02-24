
import { createClient } from '@supabase/supabase-js'

const url = 'https://oxcliyxxsmedyinogblu.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94Y2xpeXh4c21lZHlpbm9nYmx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1NDQ5MCwiZXhwIjoyMDc5MDMwNDkwfQ.qsUYkbedDhdXHWypEV8f9qrpihNJLY2sjc9DlMObGTo'

async function listBuckets() {
    const supabase = createClient(url, key)
    const { data, error } = await supabase.storage.listBuckets()
    if (error) {
        console.error('Error listing buckets:', error)
    } else {
        console.log('Buckets:', JSON.stringify(data, null, 2))
    }
}

listBuckets()
