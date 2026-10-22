'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Atom, User, BookOpen, Hash, Calendar, Layers, CheckCircle2, ArrowRight, Loader2, AlertCircle } from 'lucide-react'

const DOMAIN_OPTIONS = [
  'Tech / Coding',
  'Video Editing',
  'Event Management',
  'Tech Fest Management',
  'Post Design & Graphics',
  'Research & Innovation'
]

const BRANCH_OPTIONS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering'
]

export default function CompleteProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  // State variables for profile completion (including registrationNo & domain)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [registrationNo, setRegistrationNo] = useState('')
  const [domain, setDomain] = useState(DOMAIN_OPTIONS[0])
  const [branch, setBranch] = useState(BRANCH_OPTIONS[0])
  const [session, setSession] = useState('2025-2029')
  const [pastProjectRepo, setPastProjectRepo] = useState('')

  // UI status state
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  // Load existing profile or metadata on mount
  useEffect(() => {
    async function loadUserProfile() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          router.push('/auth')
          return
        }

        setUserId(user.id)
        setUserEmail(user.email || '')

        // Fetch profile record if already created
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profile) {
          if (profile.first_name && profile.first_name !== 'Student') {
            setFirstName(profile.first_name)
          } else if (user.user_metadata?.full_name) {
            setFirstName(user.user_metadata.full_name.split(' ')[0] || '')
          }

          if (profile.last_name && profile.last_name !== 'Member') {
            setLastName(profile.last_name)
          } else if (user.user_metadata?.full_name) {
            const parts = user.user_metadata.full_name.split(' ')
            setLastName(parts.slice(1).join(' ') || '')
          }

          if (profile.registration_no) setRegistrationNo(profile.registration_no)
          if (profile.domain) setDomain(profile.domain)
          if (profile.branch) setBranch(profile.branch)
          if (profile.session) setSession(profile.session)
          if (profile.past_project_repo) setPastProjectRepo(profile.past_project_repo)
        }
      } catch (err: any) {
        console.error('Error loading initial profile:', err)
      } finally {
        setInitialLoading(false)
      }
    }

    loadUserProfile()
  }, [router, supabase])

  // Profile submission handler with explicit registration_no and domain update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!registrationNo.trim()) {
      setErrorMessage('Please enter your University Registration Number.')
      return
    }

    if (!firstName.trim()) {
      setErrorMessage('Please provide your first name.')
      return
    }

    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User session not found. Please log in again.')
      }

      // Explicitly update profiles table including registration_no and domain
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim() || 'Student',
          registration_no: registrationNo.trim(),
          domain: domain.trim(),
          branch: branch.trim(),
          session: session.trim(),
          past_project_repo: pastProjectRepo.trim() || null,
          role: 'pending', // Marks user in waiting/pending status for club verification
        })
        .eq('id', user.id)

      // Ensure membership application record exists for the Admin Dashboard
      try {
        await supabase.from('membership_applications').upsert([
          {
            user_id: user.id,
            selected_post_id: '11111111-1111-4111-a111-111111111111',
            past_project_repo: pastProjectRepo.trim() || null,
            status: 'pending',
          },
        ])
      } catch (e) {}

      // On successful update, redirect user to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Profile update error:', err)
      setErrorMessage(err.message || 'Failed to save profile. Please try again.')
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030712] text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-xs font-mono text-slate-400">Loading your profile data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#030712] relative overflow-hidden text-slate-100">
      {/* Background radial glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl p-8 sm:p-10 rounded-3xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-xl shadow-2xl relative z-10 space-y-8">
        {/* Header & Verification Notice (Waiting Interface) */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-[2px] mx-auto shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-[#030712] rounded-[14px] flex items-center justify-center">
              <Atom className="w-7 h-7 text-cyan-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
              Complete Your Member Profile
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Please finalize your club credentials and domain preference. Your details will be registered for SIC coordinator verification.
            </p>
          </div>

          {userEmail && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>{userEmail}</span>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Profile Completion Form */}
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">
                First Name *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">
                Last Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Sharma"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Registration Number (Bug 1 Fix: Explicitly bound to registrationNo state) */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">
                Registration No. *
              </label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={registrationNo}
                  onChange={(e) => setRegistrationNo(e.target.value)}
                  placeholder="e.g. 2301105492"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">University Roll / Registration ID</p>
            </div>

            {/* Domain Preference (Bug 1 Fix: Explicitly bound to domain state) */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">
                Preferred Domain *
              </label>
              <div className="relative">
                <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono transition-colors cursor-pointer appearance-none"
                >
                  {DOMAIN_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-slate-900 text-slate-100">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">Select your primary club team</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Branch */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">
                Branch / Department
              </label>
              <div className="relative">
                <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono transition-colors cursor-pointer appearance-none"
                >
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b} value={b} className="bg-slate-900 text-slate-100">
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Session */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">
                Academic Session
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  placeholder="2025-2029"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Past Project / GitHub link (Optional) */}
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">
              Portfolio / GitHub / Project Link (Optional)
            </label>
            <input
              type="url"
              value={pastProjectRepo}
              onChange={(e) => setPastProjectRepo(e.target.value)}
              placeholder="https://github.com/username/project"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 text-black font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Saving Profile & Directing to Dashboard...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Profile & Proceed to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
