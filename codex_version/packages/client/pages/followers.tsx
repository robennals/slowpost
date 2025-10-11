import FollowersPanel from '../components/FollowersPanel';
import { sampleFollowers } from '../lib/data';

export default function FollowersPage() {
  return <FollowersPanel followers={sampleFollowers} />;
}
