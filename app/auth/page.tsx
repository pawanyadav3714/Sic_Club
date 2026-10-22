'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Atom, Mail, Lock, ArrowRight, Loader2, Chrome, AlertCircle } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const supabase = createClient()

  // State
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle Google OAuth authentication
  const handleGoogleAuth = async () => {
    setError(null)
    setGoogleLoading(true)
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      })
      if (oauthError) throw oauthError
    } catch (err: any) {
      console.error('Google Auth Error:', err)
      setError(err?.message || 'Failed to authenticate with Google.')
      setGoogleLoading(false)
    }
  }

  // 🎯 Bug 3: Smart Routing on Email/Pass Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (loginError) {
        throw loginError
      }

      if (!data.user) {
        throw new Error('User record not found after sign in.')
      }

      // Fetch user's record from profiles table to check completion status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, registration_no')
        .eq('id', data.user.id)
        .single()

      // Smart routing logic:
      // If profile is incomplete (missing first_name or registration_no) -> /complete-profile
      // If profile data exists and is complete -> /dashboard
      const isIncomplete =
        profileError ||
        !profile ||
        !profile.first_name ||
        profile.first_name === 'Student' ||
        !profile.registration_no ||
        profile.registration_no.trim() === ''

      if (isIncomplete) {
        router.push('/complete-profile')
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // 🎯 Bug 2: Intercept Duplicate Sign-up Error & 🎯 Bug 3: Route New User to Complete Profile
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: '',
            registration_no: '',
          },
        },
      })

      // Intercept duplicate sign-up error
      if (signUpError) {
        const errorMsg = (signUpError.message || '').toLowerCase()
        const isStatus422 = (signUpError as any).status === 422

        if (
          isStatus422 ||
          errorMsg.includes('already registered') ||
          errorMsg.includes('already exist') ||
          errorMsg.includes('user already registered')
        ) {
          // Explicitly set the required friendly error message
          setError('Email already exist. Please login.')
          setLoading(false)
          return
        }

        throw signUpError
      }

      // Supabase email identity check (anti-enumeration check for existing users)
      if (data?.user && data.user.identities && data.user.identities.length === 0) {
        setError('Email already exist. Please login.')
        setLoading(false)
        return
      }

      // On successful sign up of a new user: redirect to profile completion form
      router.push('/complete-profile')
    } catch (err: any) {
      console.error('Sign up error:', err)
      const errorMsg = (err?.message || '').toLowerCase()
      if (
        err?.status === 422 ||
        errorMsg.includes('already registered') ||
        errorMsg.includes('already exist')
      ) {
        setError('Email already exist. Please login.')
      } else {
        setError(err.message || 'Failed to create account. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-[#030712] relative overflow-hidden text-slate-100">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-xl shadow-2xl relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-[2px] mx-auto shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-[#030712] rounded-[14px] flex items-center justify-center">
              <Atom className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-100">
            {isSignUp ? 'Create SIC Account' : 'Welcome to SIC Portal'}
          </h2>
          <p className="text-xs text-slate-400">
            {isSignUp
              ? 'Register with email or Google to join Science & Innovation Club'
              : 'Sign in to access announcements, projects, and club chat'}
          </p>
        </div>

        {/* 🎯 Google Authentication: Single Clean "Continue with Google" Div */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleGoogleAuth}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleGoogleAuth()
            }
          }}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 active:scale-[0.98] border border-slate-700 text-xs font-semibold text-slate-200 transition-all shadow-md cursor-pointer select-none"
        >
          {googleLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Redirecting to Google...</span>
            </>
          ) : (
            <>
              <Chrome className="w-4 h-4 text-cyan-400" />
              <span>Continue with Google</span>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
            or continue with email
          </span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Error Notification Banner (e.g. "Email already exist. Please login.") */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="flex-1 font-semibold">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError(null)
                }}
                placeholder="student@university.edu"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError(null)
                }}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{isSignUp ? 'Sign Up' : 'Log In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle between Login and Sign Up */}
        <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800/60">
          {isSignUp ? (
            <>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false)
                  setError(null)
                }}
                className="text-cyan-400 font-semibold hover:underline ml-1 cursor-pointer"
              >
                Log In
              </button>
            </>
          ) : (
            <>
              New to SIC?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true)
                  setError(null)
                }}
                className="text-cyan-400 font-semibold hover:underline ml-1 cursor-pointer"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
