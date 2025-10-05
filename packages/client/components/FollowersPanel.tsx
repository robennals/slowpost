import Link from 'next/link';
import type { FollowersView } from '../lib/data';
import { Avatar, Button, Card, HorizBox, PadBox, Text, VertBox } from '../style';

type FollowersPanelProps = {
  followers: FollowersView;
};

export function FollowersPanel({ followers }: FollowersPanelProps) {
  return (
    <Card tone="panel" maxWidth={540} margin="lg">
      <PadBox vert="lg" horiz="lg">
        <VertBox gap="lg">
          <h1>Follower requests</h1>
          <VertBox as="ul" gap="lg" list>
            {followers.pendingFollowers.map((follower) => (
              <VertBox as="li" key={follower.username} gap="sm">
                <HorizBox gap="md" align="center">
                  <Avatar src={follower.photoUrl} alt={follower.name} size={52} tone="plain" />
                  <VertBox gap="xs">
                    <Text as={Link} href={`/${follower.username}`} weight="semibold">
                      {follower.name}
                    </Text>
                    <Text as="p" size="sm">
                      {follower.blurb}
                    </Text>
                  </VertBox>
                </HorizBox>
                <HorizBox gap="sm">
                  <Button tone="accent">Approve</Button>
                  <Button as={Link} tone="muted" href={`/${follower.username}`}>
                    View profile
                  </Button>
                </HorizBox>
              </VertBox>
            ))}
          </VertBox>
        </VertBox>
      </PadBox>
    </Card>
  );
}

export default FollowersPanel;
