import { useRouter } from 'next/router';
import { GroupMembers } from '../../components/GroupMembers';
import { sampleGroup } from '../../lib/data';

export default function GroupPage() {
  const router = useRouter();
  const { groupKey } = router.query;
  return <GroupMembers group={{ ...sampleGroup, key: String(groupKey ?? sampleGroup.key) }} />;
}
