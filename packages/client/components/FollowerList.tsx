import { useState } from 'react';
import type { HomeFollower } from '../lib/data';
import { Avatar, Card, HorizBox, PadBox, Text, TextArea, VertBox } from '../style';

type FollowerListProps = {
  followers: HomeFollower[];
};

export function FollowerList({ followers }: FollowerListProps) {
  const [showCloseFriends, setShowCloseFriends] = useState(false);
  const visibleFollowers = showCloseFriends
    ? followers.filter((follower) => follower.isCloseFriend)
    : followers;

  return (
    <Card tone="raised" maxWidth={600} margin="lg">
      <PadBox vert="lg" horiz="lg">
        <VertBox gap="lg">
          <HorizBox as="header" gap="md" spread center>
            <h2>Followers</h2>
            <HorizBox as="label" gap="sm" center>
              <input
                type="checkbox"
                checked={showCloseFriends}
                onChange={(event) => setShowCloseFriends(event.target.checked)}
              />
              <Text as="span" size="sm">
                Close friends only
              </Text>
            </HorizBox>
          </HorizBox>
          <VertBox as="ul" gap="md" list>
            {visibleFollowers.map((follower) => (
              <HorizBox as="li" key={follower.username} gap="md" align="start">
                <Avatar src={follower.photoUrl} alt={follower.name} size={56} />
                <VertBox gap="xs">
                  <Text as="strong" weight="semibold">
                    {follower.name}
                  </Text>
                  <Text as="p" size="sm">
                    {follower.blurb}
                  </Text>
                </VertBox>
              </HorizBox>
            ))}
          </VertBox>
          <TextArea
            readOnly
            variant="code"
            value={followers
              .filter((follower) => follower.isCloseFriend)
              .map((follower) => `${follower.name} <${follower.username}@slowpost.org>`)
              .join(', ')}
          />
        </VertBox>
      </PadBox>
    </Card>
  );
}

export default FollowerList;
