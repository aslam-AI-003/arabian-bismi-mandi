// Creates staff login accounts using the phone numbers already printed on
// your bills/receipts, with the password you chose.
//
// Run: node --env-file=.env scripts/create-login-users.mjs
//
// If a number is already registered, this safely skips it.
// If your Supabase project requires email confirmation before first login,
// this script will tell you — in that case go to Supabase Dashboard ->
// Authentication -> Users, find the user, and manually confirm it
// (or turn OFF "Confirm email" under Authentication -> Providers -> Email).

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

const PASSWORD = 'mandhi@2026'

// The phone numbers printed on your bills (from Settings / receipts)
const PHONES = ['9894092449', '9025499668', '9600827837']

const phoneToAuthEmail = (phone) => `${phone.replace(/\D/g, '')}@staff.arabianbismimandi.app`

async function main() {
  for (const phone of PHONES) {
    const email = phoneToAuthEmail(phone)
    const { data, error } = await supabase.auth.signUp({ email, password: PASSWORD })

    if (error) {
      if (/already registered/i.test(error.message)) {
        console.log(`✓ ${phone} — already has a login, skipping.`)
      } else {
        console.error(`✗ ${phone} — failed: ${error.message}`)
      }
      continue
    }

    if (data?.user && !data.session) {
      console.log(`⚠ ${phone} — account created but needs email confirmation before it can log in.`)
      console.log('   Go to Supabase Dashboard -> Authentication -> Users, find this user, and confirm it manually,')
      console.log('   or turn off "Confirm email" under Authentication -> Providers -> Email.')
    } else {
      console.log(`✓ ${phone} — login created and ready to use.`)
    }

    // Supabase signUp also starts a session for the account we just created;
    // sign it back out so it doesn't interfere with the next account/app state.
    await supabase.auth.signOut()
  }

  console.log('\nDone. Staff can now log in with any of these numbers + the password you set:')
  PHONES.forEach(p => console.log(`  - ${p}`))
}

main()
