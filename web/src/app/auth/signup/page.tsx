import { redirect } from 'next/navigation'
import { DESIGN_REVIEW } from '@/core/lib/instance'
import AuthPage from '../login/page'

// Every "Create account" links here. With the design review it opens the Create account form itself (#65);
// without it, it still sends people to sign in, as before.
export default function SignupPage() {
  if (!DESIGN_REVIEW) redirect('/auth/login')
  return <AuthPage />
}
