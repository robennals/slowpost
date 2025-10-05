import { useRouter } from 'next/router';
import { ProfileSummary } from '../components/ProfileSummary';
import { sampleProfile } from '../lib/data';

export default function ProfilePage() {
  const router = useRouter();
  const { username } = router.query;
  return <ProfileSummary profile={{ ...sampleProfile, username: String(username ?? sampleProfile.username) }} />;
}
