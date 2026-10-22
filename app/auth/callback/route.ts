import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Fetch authenticated user to verify profile status
      const {
        data: { user },
      } = await supabase.auth.getUser()

      let redirectPath = '/complete-profile'

      if (user) {
        // Query the profiles table using the Supabase server client
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, registration_no')
          .eq('id', user.id)
          .single()

        // Smart routing:
        // If the profile is incomplete (missing first_name or registration_no), redirect to /complete-profile
        // If the profile is complete, redirect to /dashboard
        const isComplete = Boolean(
          profile &&
          profile.first_name &&
          profile.first_name !== 'Student' &&
          profile.registration_no &&
          profile.registration_no.trim() !== ''
        )

        redirectPath = isComplete ? '/dashboard' : '/complete-profile'
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectPath}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`)
      } else {
        return NextResponse.redirect(`${origin}${redirectPath}`)
      }
    }
  }

  // Return the user to an error page if code exchange fails
  return NextResponse.redirect(`${origin}/auth?error=OAuth%20authentication%20failed`)
}
