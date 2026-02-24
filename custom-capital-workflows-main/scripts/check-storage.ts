
import { createClient } from '@supabase/supabase-js'

const url = 'https://oxcliyxxsmedyinogblu.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94Y2xpeXh4c21lZHlpbm9nYmx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1NDQ5MCwiZXhwIjoyMDc5MDMwNDkwfQ.qsUYkbedDhdXHWypEV8f9qrpihNJLY2sjc9DlMObGTo'

async function checkStorage() {
    const supabase = createClient(url, key)

    const bucketName = 'Credit Applications'
    console.log(`Checking bucket: ${bucketName}...`)

    const { data: bucket, error: bucketError } = await supabase.storage.getBucket(bucketName)

    if (bucketError) {
        console.log(`Bucket '${bucketName}' check failed:`, bucketError.message)
        // Try to create it
        const { data: newBucket, error: createError } = await supabase.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 52428800, // 50MB
            allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
        })

        if (createError) {
            console.error(`Failed to create bucket '${bucketName}':`, createError.message)
        } else {
            console.log(`Created bucket '${bucketName}'.`)
        }
    } else {
        console.log(`Bucket '${bucketName}' exists.`)
        console.log('Bucket details:', bucket)
    }

    // Generate SQL for policies
    console.log('\n===== SQL TO FIX RLS =====')
    console.log(`
-- 1. Enable RLS on storage.objects (if not already)
alter table storage.objects enable row level security;

-- 2. Allow authenticated uploads to 'Credit Applications'
create policy "Allow authenticated uploads ${Date.now()}"
on storage.objects for insert
to authenticated
with check ( bucket_id = '${bucketName}' );

-- 3. Allow authenticated view of 'Credit Applications'
create policy "Allow authenticated view ${Date.now()}"
on storage.objects for select
to authenticated
using ( bucket_id = '${bucketName}' );

-- 4. Allow authenticated updates (optional but good for overwrites)
create policy "Allow authenticated updates ${Date.now()}"
on storage.objects for update
to authenticated
using ( bucket_id = '${bucketName}' );
`)
}

checkStorage().catch(console.error)
