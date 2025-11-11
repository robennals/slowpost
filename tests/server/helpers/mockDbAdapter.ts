import type { DbAdapter } from '../../../src/server/db/types';

type CollectionMap = Map<string, any>;
type LinkCollectionMap = Map<string, Map<string, any>>;

export class MockDbAdapter implements DbAdapter {
  private documents = new Map<string, CollectionMap>();
  private links = new Map<string, LinkCollectionMap>();

  private ensureCollection(collection: string): CollectionMap {
    if (!this.documents.has(collection)) {
      this.documents.set(collection, new Map());
    }
    return this.documents.get(collection)!;
  }

  private ensureLinkCollection(collection: string): LinkCollectionMap {
    if (!this.links.has(collection)) {
      this.links.set(collection, new Map());
    }
    return this.links.get(collection)!;
  }

  async getDocument<T>(collection: string, key: string): Promise<T | null> {
    const col = this.documents.get(collection);
    const value = col?.get(key);
    return value ? this.clone(value) : null;
  }

  async addDocument<T>(collection: string, key: string, data: T): Promise<void> {
    const col = this.ensureCollection(collection);
    col.set(key, this.clone(data));
  }

  async updateDocument<T>(collection: string, key: string, update: Partial<T>): Promise<void> {
    const col = this.ensureCollection(collection);
    const existing = col.get(key);
    if (!existing) {
      throw new Error(`Document not found: ${collection}/${key}`);
    }
    col.set(key, this.clone({ ...existing, ...update }));
  }

  async getChildLinks<T>(collection: string, parentKey: string): Promise<T[]> {
    const col = this.links.get(collection);
    if (!col) return [];
    const children = col.get(parentKey);
    if (!children) return [];
    return Array.from(children.values()).map((value) => this.clone(value));
  }

  async getParentLinks<T>(collection: string, childKey: string): Promise<T[]> {
    const col = this.links.get(collection);
    if (!col) return [];
    const parents: T[] = [];
    for (const [, childMap] of col.entries()) {
      const value = childMap.get(childKey);
      if (value) {
        parents.push(this.clone(value));
      }
    }
    return parents;
  }

  async addLink<T>(collection: string, parentKey: string, childKey: string, data: T): Promise<void> {
    const col = this.ensureLinkCollection(collection);
    if (!col.has(parentKey)) {
      col.set(parentKey, new Map());
    }
    col.get(parentKey)!.set(childKey, this.clone(data));
  }

  async deleteLink(collection: string, parentKey: string, childKey: string): Promise<void> {
    const col = this.links.get(collection);
    col?.get(parentKey)?.delete(childKey);
  }

  async updateLink<T>(collection: string, parentKey: string, childKey: string, update: Partial<T>): Promise<void> {
    const col = this.links.get(collection);
    const childMap = col?.get(parentKey);
    const existing = childMap?.get(childKey);
    if (!existing) {
      throw new Error(`Link not found: ${collection}/${parentKey}/${childKey}`);
    }
    childMap!.set(childKey, this.clone({ ...existing, ...update }));
  }

  async getAllDocuments<T>(collection: string): Promise<Array<{ key: string; data: T }>> {
    const col = this.documents.get(collection);
    if (!col) return [];
    return Array.from(col.entries()).map(([key, value]) => ({ key, data: this.clone(value) }));
  }

  async getUserGroupsWithMembership(
    username: string,
    viewerUsername: string | null
  ): Promise<Array<{ group: any; membership: any; viewerMembership: any | null }>> {
    const memberships = await this.getParentLinks<any>('members', username);
    const result: Array<{ group: any; membership: any; viewerMembership: any | null }> = [];

    for (const membership of memberships) {
      const group = await this.getDocument<any>('groups', membership.groupName);
      if (!group) continue;

      let viewerMembership = null;
      if (viewerUsername) {
        const allMembers = await this.getChildLinks<any>('members', membership.groupName);
        viewerMembership = allMembers.find((m: any) => m.username === viewerUsername) || null;
      }

      result.push({ group, membership, viewerMembership });
    }

    return result;
  }

  async getGroupMembersWithProfiles(groupName: string): Promise<Array<{ membership: any; profile: any }>> {
    const memberships = await this.getChildLinks<any>('members', groupName);
    const result: Array<{ membership: any; profile: any }> = [];

    for (const membership of memberships) {
      const profile = await this.getDocument<any>('profiles', membership.username);
      if (profile) {
        result.push({ membership, profile });
      }
    }

    return result;
  }

  async getSubscriptionsWithProfiles(username: string): Promise<Array<{ subscription: any; profile: any }>> {
    const subscriptions = await this.getParentLinks<any>('subscriptions', username);
    const result: Array<{ subscription: any; profile: any }> = [];

    for (const subscription of subscriptions) {
      const profile = await this.getDocument<any>('profiles', subscription.subscribedToUsername);
      if (profile) {
        result.push({ subscription, profile });
      }
    }

    return result;
  }

  async getSubscribersWithProfiles(username: string): Promise<Array<{ subscription: any; profile: any }>> {
    const subscriptions = await this.getChildLinks<any>('subscriptions', username);
    const result: Array<{ subscription: any; profile: any }> = [];

    for (const subscription of subscriptions) {
      const profile = await this.getDocument<any>('profiles', subscription.subscriberUsername);
      if (profile) {
        result.push({ subscription, profile });
      }
    }

    return result;
  }

  async getUpdatesWithProfilesAndGroups(username: string): Promise<Array<{ update: any; profile: any; group: any | null }>> {
    const updates = await this.getChildLinks<any>('updates', username);
    const result: Array<{ update: any; profile: any; group: any | null }> = [];

    for (const update of updates) {
      const profile = await this.getDocument<any>('profiles', update.username);
      if (profile) {
        const group = update.groupName ? await this.getDocument<any>('groups', update.groupName) : null;
        result.push({ update, profile, group });
      }
    }

    return result;
  }

  reset() {
    this.documents.clear();
    this.links.clear();
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }
}
