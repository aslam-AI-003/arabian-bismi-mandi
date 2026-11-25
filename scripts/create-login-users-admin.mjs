// Creates staff login accounts directly via the Supabase Admin API —
// bypasses the public self-signup endpoint entirely, so it does NOT send
// any confirmation email and does NOT hit the email rate limit.
//
// Requires the service_role key (NOT the anon key). Get it from:
//   Supabase Dashboard -> Project Settings -> API -> "service_role" secret
//
// Run it like this (key only lives in this one command, never saved to disk):
//   SUPABASE_SERVICE_ROLE_KEY="paste-the-key-here" node --env-file=.env scripts/create-login-users-admin.mjs

import { createClient } from '@supabase/supabase-js'

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Run like:')
  console.error('  SUPABASE_SERVICE_ROLE_KEY="paste-the-key-here" node --env-file=.env scripts/create-login-users-admin.mjs')
  process.exit(1)
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, serviceRoleKey)

const PASSWORD = 'mandhi@2026'
const PHONES = ['9894092449', '9025499668', '9600827837']
const phoneToAuthEmail = (phone) => `${phone.replace(/\D/g, '')}@staff.arabianbismimandi.app`

async function main() {
  for (const phone of PHONES) {
    const email = phoneToAuthEmail(phone)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true, // mark as confirmed immediately — no email sent
    })

    if (error) {
      if (/already.*registered|already.*exists/i.test(error.message)) {
        console.log(`✓ ${phone} — already has a login, skipping.`)
      } else {
        console.error(`✗ ${phone} — failed: ${error.message}`)
      }
      continue
    }

    console.log(`✓ ${phone} — login created and ready to use (user id: ${data.user.id})`)
  }

  console.log('\nDone. Staff can now log in with any of these numbers + the password you set:')
  PHONES.forEach(p => console.log(`  - ${p}`))
}

main()
