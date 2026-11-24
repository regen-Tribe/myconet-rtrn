import UploadForm from '@/modules/m18-meetings/UploadForm'
import { MeetingsLocked, requireMeetingsAccess } from '@/modules/m18-meetings/lib/access'

export default async function UploadMeetingPage() {
  const access = await requireMeetingsAccess()
  if (access.locked) return <MeetingsLocked signedIn={access.signedIn} />
  const { user } = access
  return <UploadForm userId={user.id} />
}
