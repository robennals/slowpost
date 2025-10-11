import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { HomeFollower } from '../lib/data';
import { Avatar, Card, HorizBox, PadBox, Text, TextArea, VertBox } from '../style';

type FollowerListProps = {
  followers: HomeFollower[];
};

export function FollowerList({ followers }: FollowerListProps) {
  const [showCloseFriends, setShowCloseFriends] = useState(false);
  const [closeFriendMap, setCloseFriendMap] = useState<Record<string, boolean>>(() =>
    followers.reduce<Record<string, boolean>>((accumulator, follower) => {
      accumulator[follower.username] = follower.isCloseFriend;
      return accumulator;
    }, {})
  );

  useEffect(() => {
    setCloseFriendMap(
      followers.reduce<Record<string, boolean>>((accumulator, follower) => {
        accumulator[follower.username] = follower.isCloseFriend;
        return accumulator;
      }, {})
    );
  }, [followers]);

  const followersWithStatus = useMemo(
    () =>
      followers.map((follower) => ({
        ...follower,
        isCloseFriend: closeFriendMap[follower.username] ?? follower.isCloseFriend
      })),
    [closeFriendMap, followers]
  );

  const visibleFollowers = useMemo(
    () =>
      showCloseFriends
        ? followersWithStatus.filter((follower) => follower.isCloseFriend)
        : followersWithStatus,
    [followersWithStatus, showCloseFriends]
  );

  const closeFriendEmails = useMemo(
    () =>
      followersWithStatus
        .filter((follower) => follower.isCloseFriend)
        .map((follower) => `${follower.name} <${follower.username}@slowpost.org>`)
        .join(', '),
    [followersWithStatus]
  );

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
              <VertBox as="li" key={follower.username} gap="sm">
                <HorizBox gap="md" align="start">
                  <Avatar src={follower.photoUrl} alt={follower.name} size={56} />
                  <VertBox gap="xs">
                    <Text as={Link} href={`/${follower.username}`} weight="semibold">
                      {follower.name}
                    </Text>
                    <Text as="p" size="sm">
                      {follower.blurb}
                    </Text>
                  </VertBox>
                </HorizBox>
                <HorizBox as="label" gap="xs" align="center">
                  <input
                    type="checkbox"
                    checked={follower.isCloseFriend}
                    onChange={(event) =>
                      setCloseFriendMap((current) => ({
                        ...current,
                        [follower.username]: event.target.checked
                      }))
                    }
                  />
                  <Text as="span" size="sm">
                    Close friend
                  </Text>
                </HorizBox>
              </VertBox>
            ))}
          </VertBox>
          <TextArea
            readOnly
            variant="code"
            value={closeFriendEmails}
          />
        </VertBox>
      </PadBox>
    </Card>
  );
}

export default FollowerList;
