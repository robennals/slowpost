import type { Group } from '../lib/data';
import { Button, Card, HorizBox, PadBox, Text, VertBox } from '../style';

type GroupMembersProps = {
  group: Group;
};

export function GroupMembers({ group }: GroupMembersProps) {
  return (
    <Card tone="warm" maxWidth={640} margin="lg">
      <PadBox vert="xl" horiz="xl">
        <VertBox gap="lg">
          <VertBox gap="sm">
            <h1>{group.name}</h1>
            <Text as="p" tone="copper" weight="semibold" size="sm">
              {group.isPrivate ? 'Private group • invitation only' : 'Public group'}
            </Text>
            <Text as="p">{group.description}</Text>
          </VertBox>
          <VertBox as="ul" gap="sm" list>
            {group.members.map((member) => (
              <Text as="li" size="sm" key={member}>
                {member}
              </Text>
            ))}
          </VertBox>
          <HorizBox justify="end">
            <Button tone="warm">Request to join</Button>
          </HorizBox>
        </VertBox>
      </PadBox>
    </Card>
  );
}

export default GroupMembers;
