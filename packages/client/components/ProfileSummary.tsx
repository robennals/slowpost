import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Profile } from '../lib/data';
import { Avatar, Button, Card, HorizBox, Pad, PadBox, Text, TileGrid, VertBox } from '../style';
import { ProfilePhotoUploader } from './ProfilePhotoUploader';

export type ProfileSummaryProps = {
  profile: Profile;
};

export function ProfileSummary({ profile }: ProfileSummaryProps) {
  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl);

  useEffect(() => {
    setPhotoUrl(profile.photoUrl);
  }, [profile.photoUrl]);

  return (
    <Card tone="gradient" maxWidth={720} margin="lg">
      <PadBox vert="xl" horiz="xl">
        <VertBox gap="xl">
          <HorizBox gap="lg" align="center">
            {profile.isSelf ? (
              <ProfilePhotoUploader
                username={profile.username}
                name={profile.name}
                initialPhotoUrl={photoUrl}
                onPhotoUpdated={setPhotoUrl}
              />
            ) : (
              <Avatar src={photoUrl} alt={profile.name} size={96} tone="bold" />
            )}
            <VertBox gap="sm">
              <h1>
                <Link href={`/${profile.username}`}>{profile.name}</Link>
              </h1>
              <Text as="p" tone="muted" size="sm">
                @{profile.username}
              </Text>
              <Text as="p">{profile.blurb}</Text>
            </VertBox>
          </HorizBox>
          <TileGrid gap="lg" min={220}>
            <VertBox gap="sm">
              <h2>Public groups</h2>
              <VertBox as="ul" gap="xs" list>
                {profile.publicGroups.map((group) => (
                  <Text as="li" size="sm" key={group.key}>
                    <Link href={`/g/${group.key}`}>{group.name}</Link>
                  </Text>
                ))}
              </VertBox>
            </VertBox>
            <VertBox gap="sm">
              <h2>Private groups you share</h2>
              {profile.sharedPrivateGroups.length > 0 ? (
                <VertBox as="ul" gap="xs" list>
                  {profile.sharedPrivateGroups.map((group) => (
                    <Text as="li" size="sm" key={group.key}>
                      <Link href={`/g/${group.key}`}>{group.name}</Link>
                    </Text>
                  ))}
                </VertBox>
              ) : (
                <Text as="p" size="sm" tone="muted">
                  No shared private groups yet.
                </Text>
              )}
            </VertBox>
          </TileGrid>
          <Pad pad="sm" />
          <HorizBox justify="end">
            <Button shape="pill">
              {profile.isSelf ? 'Edit profile' : profile.isFollowing ? 'Following' : 'Follow'}
            </Button>
          </HorizBox>
        </VertBox>
      </PadBox>
    </Card>
  );
}

export default ProfileSummary;
