// One-time setup: creates a public Supabase Storage bucket for offer images.
// Run: node --env-file=.env scripts/setup-offer-images-bucket.mjs
//
// NOTE: Creating a bucket usually needs more than the anon key allows.
// If this prints a permission error, don't worry — just create it by hand:
//   Supabase Dashboard -> Storage -> New bucket
//     Name: offer-images
//     Public bucket: ON
//   Then: click the bucket -> Policies -> New Policy -> "For full customization"
//     Allow INSERT and SELECT for anon + authenticated roles.
// (Storage page is separate from the SQL Editor, so it should still be visible.)

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const BUCKET = 'offer-images'

async function main() {
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets()
  if (listErr) {
    console.error('Could not list buckets:', listErr.message)
    console.log('\n-> Please create the bucket manually in the Supabase Dashboard (Storage tab). See instructions at top of this script.')
    return
  }

  const exists = buckets.some(b => b.name === BUCKET)
  if (exists) {
    console.log(`✓ Bucket "${BUCKET}" already exists.`)
  } else {
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
    })
    if (createErr) {
      console.error(`Could not create bucket "${BUCKET}":`, createErr.message)
      console.log('\n-> Please create it manually in the Supabase Dashboard (Storage tab). See instructions at top of this script.')
      return
    }
    console.log(`✓ Created public bucket "${BUCKET}"`)
  }

  // Quick upload test to confirm anon key can actually write to it
  const testContent = new Blob(['test'], { type: 'text/plain' })
  const testFile = new File([testContent], 'upload-test.txt', { type: 'text/plain' })
  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(`_test/${Date.now()}.txt`, testFile)
  if (uploadErr) {
    console.error('\n✗ Upload test FAILED:', uploadErr.message)
    console.log('-> The bucket exists but anon key cannot upload to it. In Supabase Dashboard -> Storage -> offer-images -> Policies, add a policy allowing INSERT for anon/public role.')
  } else {
    console.log('✓ Upload test succeeded — image uploads will work from the app.')
  }
}

main()
