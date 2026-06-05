import { BaseApiClient } from '../BaseApiClient';
import {
  ProfileResponseSchema,
  ProfileResponse,
  FollowResponseSchema,
  FollowResponse,
} from '../models/profile.model';

export class ProfileApiClient {
  constructor(private api: BaseApiClient) {}

  public async getProfile(username: string): Promise<ProfileResponse> {
    return this.api.get<ProfileResponse>(`/profiles/${username}`, ProfileResponseSchema);
  }

  public async followUser(username: string): Promise<FollowResponse> {
    return this.api.post<FollowResponse>(`/profiles/${username}/follow`, FollowResponseSchema);
  }

  public async unfollowUser(username: string): Promise<FollowResponse> {
    return this.api.delete<FollowResponse>(`/profiles/${username}/follow`, FollowResponseSchema);
  }
}
