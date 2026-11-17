import UploadForm from '@/modules/m18-meetings/UploadForm'
import { requireMeetingsAccess } from '@/modules/m18-meetings/lib/access'

export default async function UploadMeetingPage() {
  const { user } = await requireMeetingsAccess()
  return <UploadForm userId={user.id} />
}
